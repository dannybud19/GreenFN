"""Phase 2 evaluation harness (notes/phase2_eval_plan.md).

Scores any model with the baselines.py interface (fit / embed / similarity) on:
  3.1 same-player retrieval (hit@10, MRR)
  3.2 non-adjacent retrieval (hit@10)
  3.3 next-season error (RMSE vs persistence)
  3.4 era leakage (balanced accuracy, chance 20%)
  4   NBA2Vec checks (position probe, box-score correlation)
  5   sanity report (comps for the 15 non-held-out players, known-pair test)

Usage: python src/evaluate.py   -> scores B0 to B4 on the validation split and writes
reports/phase2_baselines.md. The test split is never touched here.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from baselines import ALL, B0Random, Z, load

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "phase2_baselines.md"
K = 10

# 15 non-held-out sanity players (feature note) plus the partners for the known-pair test.
SANITY = {
    "abdulka01": "Kareem Abdul-Jabbar", "johnsma02": "Magic Johnson", "birdla01": "Larry Bird",
    "thomais01": "Isiah Thomas", "barklch01": "Charles Barkley", "jordami01": "Michael Jordan",
    "stockjo01": "John Stockton", "rodmade01": "Dennis Rodman", "onealsh01": "Shaquille O'Neal",
    "nashst01": "Steve Nash", "bryanko01": "Kobe Bryant", "jamesle01": "LeBron James",
    "curryst01": "Stephen Curry", "greendr01": "Draymond Green", "jokicni01": "Nikola Jokić",
}
PAIR_PARTNERS = {"howardw01": "Dwight Howard", "paulch01": "Chris Paul"}
KNOWN_PAIRS = [("jordami01", "bryanko01"), ("onealsh01", "howardw01"), ("nashst01", "paulch01")]


# ---------- 3.1 and 3.2 retrieval ----------

def retrieval(model, df: pd.DataFrame, non_adjacent: bool = False) -> dict:
    """Queries and candidates are the qualified seasons of one split."""
    emb = model.embed(df)
    pid = df["player_id"].to_numpy()
    season = df["season"].to_numpy()
    hits, rr = [], []
    for start in range(0, len(df), 512):
        rows = np.arange(start, min(start + 512, len(df)))
        sims = model.similarity(emb[rows], emb)
        for r, i in enumerate(rows):
            s = sims[r].copy()
            s[i] = -np.inf  # never match itself
            same = pid == pid[i]
            same[i] = False
            if non_adjacent:
                near = same & (np.abs(season - season[i]) <= 1)
                s[near] = -np.inf  # remove t-1 and t+1 from the candidates
                same &= ~near
            if not same.any():
                continue  # not a valid query for this metric
            best_same = s[same].max()
            rank = 1 + int((s > best_same).sum())
            hits.append(rank <= K)
            rr.append(1.0 / rank)
    return {"queries": len(hits), "hit10": float(np.mean(hits)), "mrr": float(np.mean(rr))}


# ---------- 3.3 next-season error ----------

def next_season(model, df: pd.DataFrame) -> dict:
    z = df[Z].to_numpy(dtype=float)
    key = pd.Series(np.arange(len(df)), index=pd.MultiIndex.from_frame(df[["player_id", "season"]]))
    nxt = key.reindex(pd.MultiIndex.from_arrays([df["player_id"], df["season"] + 1])).to_numpy()
    has_next = ~np.isnan(nxt)
    nxt_idx = np.where(has_next, nxt, 0).astype(int)
    change = np.where(has_next[:, None], z[nxt_idx] - z, np.nan)

    emb = model.embed(df)
    pid, age = df["player_id"].to_numpy(), df["age"].to_numpy()
    queries = np.where(has_next)[0]
    err_model, err_persist = [], []
    for start in range(0, len(queries), 512):
        rows = queries[start:start + 512]
        sims = model.similarity(emb[rows], emb)
        for r, i in enumerate(rows):
            ok = has_next & (pid != pid[i]) & (np.abs(age - age[i]) <= 1)
            if not ok.any():
                continue
            s = np.where(ok, sims[r], -np.inf)
            top = np.argsort(-s)[:K]
            top = top[np.isfinite(s[top])]
            w = s[top] - s[top].min()
            w = w / w.sum() if w.sum() > 0 else np.full(len(top), 1 / len(top))
            pred = z[i] + (w[:, None] * change[top]).sum(0)
            actual = z[nxt_idx[i]]
            err_model.append(np.sqrt(np.mean((pred - actual) ** 2)))
            err_persist.append(np.sqrt(np.mean((z[i] - actual) ** 2)))
    m, p = float(np.mean(err_model)), float(np.mean(err_persist))
    return {"queries": len(err_model), "rmse": m, "persistence": p, "vs_persistence": (m - p) / p}


# ---------- 3.4 and 4: probes ----------

def probe(X: np.ndarray, y: np.ndarray, groups: np.ndarray) -> float:
    clf = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))
    pred = cross_val_predict(clf, X, y, groups=groups, cv=GroupKFold(n_splits=5))
    return float(balanced_accuracy_score(y, pred))


def era_and_position(model, trval: pd.DataFrame) -> dict:
    X = model.embed(trval)
    groups = trval["player_id"].to_numpy()
    decade = np.minimum((trval["season"] // 10) * 10, 2020).to_numpy()
    pos = trval["pos"].astype(str).str.split("-").str[0]
    keep = pos.isin(["PG", "SG", "SF", "PF", "C"]).to_numpy()
    return {
        "era": probe(X, decade, groups),
        "position": probe(X[keep], pos[keep].to_numpy(), groups[keep]),
    }


def box_score(model, trval: pd.DataFrame) -> list[dict]:
    pcs = PCA(n_components=2).fit_transform(model.embed(trval))
    targets = {
        "rebound % (orb + drb)": (trval["orb_percent"] + trval["drb_percent"]).to_numpy(),
        "ast_percent": trval["ast_percent"].to_numpy(),
        "x3p_ar": trval["x3p_ar"].to_numpy(),
    }
    out = []
    for c in range(2):
        for name, y in targets.items():
            r, p = pearsonr(pcs[:, c], y)
            out.append({"pc": c + 1, "stat": name, "r": r, "p_bonf": min(1.0, p * 6)})
    return out


# ---------- 5: sanity ----------

def comp_players(model, query: pd.DataFrame, pool: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """Each comp player's best match against any of the query player's seasons."""
    others = pool[pool["player_id"] != query["player_id"].iloc[0]]
    sims = model.similarity(model.embed(query), model.embed(others)).max(axis=0)
    best = (pd.DataFrame({"player_id": others["player_id"].to_numpy(), "player": others["player"].to_numpy(),
                          "season": others["season"].to_numpy(), "sim": sims})
            .sort_values("sim", ascending=False).drop_duplicates("player_id"))
    return best.head(n).reset_index(drop=True)


# ---------- main ----------

def main() -> None:
    df = load(ROOT)
    holdouts = {p["player_id"] for p in json.loads((ROOT / "config" / "holdout.json").read_text())["players"]}
    for pid, name in {**SANITY, **PAIR_PARTNERS}.items():
        found = df.loc[df["player_id"] == pid, "player"]
        if found.empty or name.split()[-1] not in found.iloc[0]:
            raise ValueError(f"sanity player {name} ({pid}) not found as expected")

    train = df[df["split"] == "train"].reset_index(drop=True)
    val = df[df["split"] == "val"].reset_index(drop=True)
    trval = df[df["split"].isin(["train", "val"])].reset_index(drop=True)
    pool = df[~df["player_id"].isin(holdouts)]  # sanity pool: everything except hold-outs

    results, boxes, comps = [], {}, {}
    for cls in ALL:
        model = cls().fit(train)
        print(f"Scoring {model.name} ...")
        r = {"model": model.name}
        r.update({f"ret_{k}": v for k, v in retrieval(model, val).items()})
        r.update({f"na_{k}": v for k, v in retrieval(model, val, non_adjacent=True).items()})
        r.update({f"ns_{k}": v for k, v in next_season(model, val).items()})
        if isinstance(model, B0Random):
            r.update({"era": np.nan, "position": np.nan})  # random scores have no representation
        else:
            r.update(era_and_position(model, trval))
            boxes[model.name] = box_score(model, trval)
        results.append(r)
        comps[model.name] = {pid: comp_players(model, df[df["player_id"] == pid], pool)
                             for pid in {**SANITY, **PAIR_PARTNERS}}

    res = pd.DataFrame(results)
    print(res.to_string(index=False))
    write_report(res, boxes, comps)
    print(f"Wrote {REPORT}")


def write_report(res: pd.DataFrame, boxes: dict, comps: dict) -> None:
    f = lambda x, d=3: "n/a" if pd.isna(x) else f"{x:.{d}f}"
    b0 = res.iloc[0]
    lines = [
        "# Phase 2 baseline results",
        "",
        "Validation split, qualified seasons. Rules: notes/phase2_eval_plan.md. Produced by `python src/evaluate.py`.",
        "",
        f"Queries: retrieval {int(b0['ret_queries']):,}, non-adjacent {int(b0['na_queries']):,}, "
        f"next-season {int(b0['ns_queries']):,}. Era and position probes use train + validation, 5-fold grouped by player.",
        "",
        "| Model | Hit@10 | MRR | Non-adjacent Hit@10 | Next-season RMSE | vs persistence | Era bal. acc. | Position bal. acc. |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for _, r in res.iterrows():
        lines.append(f"| {r['model']} | {f(r['ret_hit10'])} | {f(r['ret_mrr'])} | {f(r['na_hit10'])} | "
                     f"{f(r['ns_rmse'])} | {r['ns_vs_persistence']:+.1%} | {f(r['era'])} | {f(r['position'])} |")
    lines += [
        "",
        f"Persistence RMSE (predict t+1 = t): {f(b0['ns_persistence'])}. Negative 'vs persistence' = better than persistence.",
        "Era chance = 0.200 (5 decades). Position chance = 0.200 (5 positions). B1, B2 and B3 share the same representation "
        "(the 15 z-scores), so their probe scores are identical; they differ only in how similarity is measured.",
        "",
        "Caveat: B3w's retrieval scores are inflated. Its vector for season t blends seasons t, t-1 and t-2, so two "
        "seasons of the same player share raw data (even two years apart). Compare B3w on next-season error and the "
        "sanity comps, not on retrieval.",
        "",
        "## Gate",
        "",
    ]
    others = res.iloc[1:]
    beat_b0 = others[others["ret_hit10"] > b0["ret_hit10"]]["model"].tolist()
    beat_p = others[others["ns_rmse"] < others["ns_persistence"]]["model"].tolist()
    lines += [
        f"- Beat B0 on retrieval: {len(beat_b0)} of {len(others)} ({', '.join(beat_b0) or 'none'})",
        f"- Beat persistence on next-season error: {', '.join(beat_p) or 'none (record as a finding)'}",
        "",
        "## Box-score correlation (top 2 PCA components, Bonferroni-corrected p over 6 tests)",
        "",
        "Close to automatic for these baselines (built from the same stats); a real test from Phase 3.",
        "",
        "| Model | PC | Stat | r | p (Bonferroni) |",
        "|---|---|---|---|---|",
    ]
    for name, rows in boxes.items():
        for b in rows:
            lines.append(f"| {name} | {b['pc']} | {b['stat']} | {b['r']:+.3f} | {b['p_bonf']:.2g} |")

    lines += ["", "## Known-pair test (each in the other's top 5)", "",
              "| Model | " + " | ".join(f"{SANITY.get(a, a)} / {PAIR_PARTNERS.get(b, SANITY.get(b, b))}" for a, b in KNOWN_PAIRS) + " |",
              "|---|" + "---|" * len(KNOWN_PAIRS)]
    for name, c in comps.items():
        cells = []
        for a, b in KNOWN_PAIRS:
            ab = b in c[a]["player_id"].head(5).tolist()
            ba = a in c[b]["player_id"].head(5).tolist()
            cells.append("pass" if ab and ba else "partial" if ab or ba else "fail")
        lines.append(f"| {name} | " + " | ".join(cells) + " |")

    lines += ["", "## Sanity comps (top 5 comp players, best season match)", "",
              "Judge each against its pass test in the feature note: pass, partial or fail, with a one-line reason. "
              "Hold-outs are excluded from the pool.", ""]
    for pid, name in SANITY.items():
        lines += [f"### {name}", "", "| Model | Top 5 | Judgement |", "|---|---|---|"]
        for model_name, c in comps.items():
            top = ", ".join(f"{r.player} {r.season}" for r in c[pid].head(5).itertuples())
            lines.append(f"| {model_name} | {top} | |")
        lines.append("")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
