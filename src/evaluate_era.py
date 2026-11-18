"""Phase 4 search and report (notes/phase4_plan.md, sections 4 to 7).

Two era-removal methods on top of Phase 3's chosen encoder (embedding 32, temperature 0.05, pretraining):

    adversary  retrain with an era head behind a gradient reversal layer, lambda in LAMBDAS
               (lambda = 0 is the Phase 3 model retrained: the control and the base for centring)
    centring   take the lambda = 0 model and subtract alpha x each season's average embedding, alpha in ALPHAS
               (no retraining)

    python evaluate_era.py search [--quick]
        Trains every lambda x seed, then scores centring on each seed's lambda = 0 model. One CSV row per
        candidate in reports/phase4_search.csv (resumable). Weights go to models/phase4/ (git-ignored).

    python evaluate_era.py report
        Picks the winner by the plan's rule, scores it and the control on every metric next to B2, and writes
        reports/phase4_era.md and reports/phase4_unmarked_comps.json.

The test split and the hold-outs are never used. Earlier reports are never touched.
"""

import argparse
import itertools
import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import balanced_accuracy_score
from sklearn.model_selection import GroupKFold, cross_val_predict

from baselines import B2Cosine, load
from encoder import SeasonEncoder
from era_adversary import EraAdversarialEncoder, SeasonCentred
from evaluate import (KNOWN_PAIRS, PAIR_PARTNERS, SANITY, box_score, comp_players, era_and_position,
                      next_season, probe, retrieval)
from evaluate_encoder import stability

ROOT = Path(__file__).resolve().parents[1]
SEARCH_CSV = ROOT / "reports" / "phase4_search.csv"
REPORT = ROOT / "reports" / "phase4_era.md"
UNMARKED = ROOT / "reports" / "phase4_unmarked_comps.json"
MARKS = ROOT / "config" / "sanity_marks.json"
MODELS = ROOT / "models" / "phase4"

LAMBDAS = [0.0, 0.3, 1.0, 3.0]
ALPHAS = [0.25, 0.5, 0.75, 1.0]
SEEDS = [2026, 2027, 2028]
ERA_TARGET = 0.25            # winner's mean era probe must be at or below this (chance 0.20)
RETRIEVAL_TOLERANCE = 0.012  # gate: non-adjacent hit@10 may drop at most this much below the control mean
PHASE3_NONADJ = 0.746        # Phase 3 chosen setting, mean over seeds (reports/phase3_encoder.md)
ERA_TRANSLATION_PLAYERS = {"curryst01": "Stephen Curry", "johnsma02": "Magic Johnson", "birdla01": "Larry Bird"}


def adv_name(lam: float, seed: int) -> str:
    return f"adversary_lambda{lam}_s{seed}"


def centre_name(alpha: float, seed: int) -> str:
    return f"centring_alpha{alpha}_s{seed}"


def splits():
    df = load(ROOT)
    holdouts = {p["player_id"] for p in json.loads((ROOT / "config" / "holdout.json").read_text())["players"]}
    train = df[df["split"] == "train"].reset_index(drop=True)
    val = df[df["split"] == "val"].reset_index(drop=True)
    trval = df[df["split"].isin(["train", "val"])].reset_index(drop=True)
    pool = df[~df["player_id"].isin(holdouts)]
    return df, train, val, trval, pool


def decades_of(df: pd.DataFrame) -> np.ndarray:
    return np.minimum((df["season"] // 10) * 10, 2020).to_numpy()


# ---------- extra era measures (phase4_plan.md section 5) ----------

def era_probe_val(model, val: pd.DataFrame, nonlinear: bool = False) -> float:
    """Era probe on validation players only (never trained on), 5-fold grouped by player.
    Linear = the Phase 2 probe; nonlinear = gradient-boosted trees, which can find curved boundaries."""
    X, y, g = model.embed(val), decades_of(val), val["player_id"].to_numpy()
    if not nonlinear:
        return probe(X, y, g)
    clf = HistGradientBoostingClassifier(max_iter=200, random_state=2026)
    pred = cross_val_predict(clf, X, y, groups=g, cv=GroupKFold(n_splits=5))
    return float(balanced_accuracy_score(y, pred))


def cross_era_share(model, val: pd.DataFrame, k: int = 10) -> float:
    """Average share of a season's top-k neighbours (other validation players) from a different decade.
    Higher means comps mix eras more, which is the point of era translation."""
    emb, dec, pid = model.embed(val), decades_of(val), val["player_id"].to_numpy()
    shares = []
    for start in range(0, len(val), 512):
        rows = np.arange(start, min(start + 512, len(val)))
        sims = model.similarity(emb[rows], emb)
        for r, i in enumerate(rows):
            s = np.where(pid != pid[i], sims[r], -np.inf)
            top = np.argsort(-s)[:k]
            shares.append(np.mean(dec[top] != dec[i]))
    return float(np.mean(shares))


def comp_decades(model, df: pd.DataFrame, pool: pd.DataFrame, pid: str, n: int = 10) -> int:
    """Feature-note era translation test: how many decades a player's top-n comps come from."""
    c = comp_players(model, df[df["player_id"] == pid], pool, n=n)
    return int(len(set(np.minimum((c["season"] // 10) * 10, 2020))))


def quick_scores(model, val, trval) -> dict:
    ret, na, ns = retrieval(model, val), retrieval(model, val, non_adjacent=True), next_season(model, val)
    pr = era_and_position(model, trval)
    return {"hit10": ret["hit10"], "nonadj_hit10": na["hit10"], "next_rmse": ns["rmse"], "era": pr["era"],
            "position": pr["position"], "era_val": era_probe_val(model, val), "cross_era": cross_era_share(model, val)}


# ---------- loading ----------

def load_adv(lam: float, seed: int) -> EraAdversarialEncoder:
    ckpt = torch.load(MODELS / f"{adv_name(lam, seed)}.pt", weights_only=False)
    enc = EraAdversarialEncoder(lam_max=lam, seed=seed)
    enc.model = SeasonEncoder(ckpt["dim"])
    enc.model.load_state_dict(ckpt["state"])
    enc.history = ckpt["history"]
    return enc


def load_candidate(method: str, param: float, seed: int, train: pd.DataFrame):
    if method == "adversary":
        return load_adv(param, seed)
    return SeasonCentred(load_adv(0.0, seed), param).fit(train)


# ---------- search ----------

def append(row: dict) -> None:
    pd.DataFrame([row]).to_csv(SEARCH_CSV, mode="a", header=not SEARCH_CSV.exists(), index=False)


def search(quick: bool) -> None:
    _, train, val, trval, _ = splits()
    done = set(pd.read_csv(SEARCH_CSV)["run"]) if SEARCH_CSV.exists() else set()

    grid = [(1.0, 2026)] if quick else list(itertools.product(LAMBDAS, SEEDS))
    todo = [g for g in grid if quick or adv_name(*g) not in done]
    print(f"Adversary: {len(grid)} runs, {len(grid) - len(todo)} already done, {len(todo)} to go")
    for n, (lam, seed) in enumerate(todo, start=1):
        enc = EraAdversarialEncoder(lam_max=lam, seed=seed)
        if quick:
            import era_adversary
            original = era_adversary.train_contrastive_adv
            era_adversary.train_contrastive_adv = lambda *a, **k: original(*a, **{**k, "epochs": 3})
            enc.fit(val=val)
            era_adversary.train_contrastive_adv = original
        else:
            enc.fit(val=val)
        con = enc.history["contrastive"]
        best = max(con, key=lambda h: h["val_nonadj_hit10"])
        row = {"run": adv_name(lam, seed), "method": "adversary", "param": lam, "seed": seed, "epochs": len(con),
               "best_epoch": best["epoch"], "era_head_acc_best": best["era_head_acc"], **quick_scores(enc, val, trval)}
        print(f"[{n}/{len(todo)}] {row['run']}: non-adj {row['nonadj_hit10']:.3f}, era {row['era']:.3f}, "
              f"{len(con)} epochs")
        if quick:
            cen = SeasonCentred(enc, 0.5).fit(train)
            print(f"Quick centring check: era {quick_scores(cen, val, trval)['era']:.3f}. Quick run OK (not saved).")
            return
        enc.save(MODELS / f"{row['run']}.pt")
        append(row)

    done = set(pd.read_csv(SEARCH_CSV)["run"]) if SEARCH_CSV.exists() else set()
    todo = [(a, s) for a, s in itertools.product(ALPHAS, SEEDS) if centre_name(a, s) not in done]
    print(f"Centring: {len(ALPHAS) * len(SEEDS)} candidates, {len(todo)} to go")
    for alpha, seed in todo:
        model = SeasonCentred(load_adv(0.0, seed), alpha).fit(train)
        row = {"run": centre_name(alpha, seed), "method": "centring", "param": alpha, "seed": seed,
               "epochs": np.nan, "best_epoch": np.nan, "era_head_acc_best": np.nan, **quick_scores(model, val, trval)}
        print(f"{row['run']}: non-adj {row['nonadj_hit10']:.3f}, era {row['era']:.3f}")
        append(row)


# ---------- report ----------

def choose(agg: pd.DataFrame) -> tuple[str, float, str]:
    """Plan rule: among candidates (every adversary lambda > 0 and every centring alpha) whose mean era probe
    is at or below ERA_TARGET, the highest mean non-adjacent hit@10. If none reaches the target, the
    lowest mean era probe (recorded as a finding)."""
    cand = agg[~((agg["method"] == "adversary") & (agg["param"] == 0))]
    ok = cand[cand["era"] <= ERA_TARGET]
    if len(ok):
        r = ok.sort_values("nonadj", ascending=False).iloc[0]
        return r["method"], float(r["param"]), "met the era target with the best retrieval"
    r = cand.sort_values("era").iloc[0]
    return r["method"], float(r["param"]), "no candidate met the era target; lowest era probe chosen"


def full_scores(model, df, val, trval, pool) -> dict:
    out = quick_scores(model, val, trval)
    out["persistence"] = next_season(model, val)["persistence"]
    out["era_val_nonlinear"] = era_probe_val(model, val, nonlinear=True)
    st = stability(model, val)
    out.update({"stab_ratio": st["ratio"], "stab_pass": st["pass"]})
    for pid, name in ERA_TRANSLATION_PLAYERS.items():
        out[f"decades_{name}"] = comp_decades(model, df, pool, pid)
    return out


def report() -> None:
    df, train, val, trval, pool = splits()
    res = pd.read_csv(SEARCH_CSV)
    expected = (len(LAMBDAS) + len(ALPHAS)) * len(SEEDS)
    if len(res) != expected or res["run"].duplicated().any():
        raise ValueError(f"search CSV has {len(res)} rows (expected {expected} unique); finish the search first")

    agg = res.groupby(["method", "param"]).agg(
        nonadj=("nonadj_hit10", "mean"), nonadj_sd=("nonadj_hit10", "std"), era=("era", "mean"),
        era_sd=("era", "std"), era_val=("era_val", "mean"), cross_era=("cross_era", "mean"),
        next_rmse=("next_rmse", "mean"), position=("position", "mean"), epochs=("epochs", "mean")).reset_index()
    method, param, why = choose(agg)
    print(f"Chosen: {method} {param} ({why})")

    chosen = [load_candidate(method, param, s, train) for s in SEEDS]
    control = [load_adv(0.0, s) for s in SEEDS]
    sc_ch = pd.DataFrame([full_scores(m, df, val, trval, pool) for m in chosen], index=SEEDS)
    sc_ctl = pd.DataFrame([full_scores(m, df, val, trval, pool) for m in control], index=SEEDS)
    b2 = B2Cosine().fit(train)
    sc_b2 = full_scores(b2, df, val, trval, pool)
    boxes = box_score(chosen[0], trval)

    names = {**SANITY, **PAIR_PARTNERS}
    models = {"chosen": chosen[0], "control": control[0], "b2": b2}
    comps = {pid: {k: comp_players(m, df[df["player_id"] == pid], pool, n=5) for k, m in models.items()}
             for pid in names}
    pairs = []
    for label, key in [(chosen[0].name, "chosen"), (control[0].name, "control"), ("B2 cosine", "b2")]:
        for a, b in KNOWN_PAIRS:
            hits = (b in set(comps[a][key]["player_id"])) + (a in set(comps[b][key]["player_id"]))
            pairs.append((label, f"{names[a]} / {names[b]}", ["fail", "partial", "pass"][hits]))

    marks = json.loads(MARKS.read_text())
    aliases = marks.get("aliases", {})
    unmarked = {}
    for pid, pname in SANITY.items():
        have = {n for v in marks["players"][pname].values() for n in v}
        new = {aliases.get(n, n) for key in ("chosen", "control") for n in comps[pid][key]["player"]}
        new = sorted(n for n in new if n not in have)
        if new:
            unmarked[pname] = new
    UNMARKED.write_text(json.dumps(unmarked, ensure_ascii=False, indent=2) + "\n")

    write_report(agg, method, param, why, sc_ch, sc_ctl, sc_b2, boxes, comps, pairs, unmarked,
                 chosen[0].name, control[0].name)
    print(f"Wrote {REPORT} and {UNMARKED} ({sum(map(len, unmarked.values()))} names need marks)")


def write_report(agg, method, param, why, ch, ctl, b2, boxes, comps, pairs, unmarked, ch_name, ctl_name) -> None:
    mc, sc, m0, s0 = ch.mean(numeric_only=True), ch.std(numeric_only=True), ctl.mean(numeric_only=True), ctl.std(numeric_only=True)
    fm = lambda m, s, k: f"{m[k]:.3f} ± {s[k]:.3f}"
    threshold = m0["nonadj_hit10"] - RETRIEVAL_TOLERANCE
    label = f"{method} {'lambda' if method == 'adversary' else 'alpha'} {param}"
    lines = [
        "# Phase 4 results: era removal", "",
        "Validation split. Rules: `notes/phase2_eval_plan.md`, `notes/phase3_plan.md` and `notes/phase4_plan.md`. "
        "Validation also chose the method, its strength and the early-stopping epoch, so these numbers are "
        "optimistic; the unbiased numbers come from the test split once, at the end of v1.", "",
        "Base: Phase 3's chosen encoder (embedding 32, temperature 0.05, pretraining). Two methods: the gradient "
        "reversal adversary (retrained, strength lambda) and season centring (no retraining, strength alpha). "
        f"The control is lambda = 0, the Phase 3 model retrained. **Chosen: {label}** ({why}).", "",
        "## Results (mean ± spread over seeds 2026, 2027, 2028)", "",
        f"| Metric | Chosen ({label}) | Control (Phase 3 retrained) | B2 cosine |", "|---|---|---|---|",
    ]
    rows = [("Era probe, train + val, linear (Phase 2 metric; chance 0.20)", "era"),
            ("Era probe, validation only, linear", "era_val"),
            ("Era probe, validation only, nonlinear (boosted trees)", "era_val_nonlinear"),
            ("Non-adjacent hit@10", "nonadj_hit10"), ("Hit@10", "hit10"), ("Next-season RMSE", "next_rmse"),
            ("Position probe (chance 0.20)", "position"), ("Cross-era share of top-10 comps", "cross_era"),
            ("Stability ratio (lower is tighter)", "stab_ratio")]
    for lab, k in rows:
        lines.append(f"| {lab} | {fm(mc, sc, k)} | {fm(m0, s0, k)} | {b2[k]:.3f} |")
    lines += ["", f"Persistence next-season RMSE: {b2['persistence']:.3f}.", "",
              "## Era translation test (feature note): decades among the top 10 comps (seed 2026)", "",
              f"| Player | Chosen | Control | B2 cosine |", "|---|---|---|---|"]
    for name in ERA_TRANSLATION_PLAYERS.values():
        k = f"decades_{name}"
        lines.append(f"| {name} | {int(ch.loc[2026, k])} | {int(ctl.loc[2026, k])} | {int(b2[k])} |")
    gate = [
        (f"Era probe (Phase 2 metric) at or below {ERA_TARGET}", mc["era"] <= ERA_TARGET),
        (f"Non-adjacent hit@10 at or above {threshold:.3f} (control mean minus {RETRIEVAL_TOLERANCE})",
         mc["nonadj_hit10"] >= threshold),
        ("Position probe well above chance (> 0.40)", mc["position"] > 0.40),
        ("Stability check passes (all seeds)", bool(ch["stab_pass"].all())),
        (f"Control reproduces Phase 3 (mean non-adjacent hit@10 within 0.005 of {PHASE3_NONADJ})",
         abs(m0["nonadj_hit10"] - PHASE3_NONADJ) <= 0.005),
    ]
    lines += ["", "## Gate (phase4_plan.md section 7)", ""]
    lines += [f"- {'PASS' if ok else 'FAIL'}: {lab}" for lab, ok in gate]
    lines += ["- PENDING: sanity comps marked and scored (see `reports/phase4_unmarked_comps.json`)", "",
              "If a line fails, it is recorded as a finding; the metric is not changed.", "",
              "## Search (validation, mean ± spread over 3 seeds)", "",
              "| Method | Strength | Era probe | Era probe (val only) | Non-adjacent hit@10 | Cross-era share | "
              "Next-season RMSE | Position | Mean epochs |", "|---|---|---|---|---|---|---|---|---|"]
    for _, r in agg.iterrows():
        strength = f"lambda {r['param']}" if r["method"] == "adversary" else f"alpha {r['param']}"
        epochs = "" if np.isnan(r["epochs"]) else f"{r['epochs']:.0f}"
        lines.append(f"| {r['method']} | {strength} | {r['era']:.3f} ± {r['era_sd']:.3f} | {r['era_val']:.3f} | "
                     f"{r['nonadj']:.3f} ± {r['nonadj_sd']:.3f} | {r['cross_era']:.3f} | {r['next_rmse']:.3f} | "
                     f"{r['position']:.3f} | {epochs} |")
    lines += ["", "## Box-score correlation (chosen, seed 2026; top 2 PCA components; Bonferroni over 6 tests)", "",
              "| PC | Stat | r | p (corrected) |", "|---|---|---|---|"]
    lines += [f"| {b['pc']} | {b['stat']} | {b['r']:+.3f} | {b['p_bonf']:.2g} |" for b in boxes]
    lines += ["", "## Known-pair test (each in the other's top 5)", "", "| Model | Pair | Result |", "|---|---|---|"]
    lines += [f"| {m} | {p} | {r} |" for m, p, r in pairs]
    lines += ["", "## Sanity comps (top 5 comp players, best season match; seed 2026 models)", "",
              "Judgement column is filled by `src/score_sanity.py --report reports/phase4_era.md` once every name "
              "is marked in `config/sanity_marks.json`.", ""]
    for pid, pname in SANITY.items():
        lines += [f"### {pname}", "", "| Model | Top 5 | Judgement |", "|---|---|---|"]
        for lab, key in [(ch_name, "chosen"), (ctl_name, "control"), ("B2 cosine", "b2")]:
            c = comps[pid][key]
            lines.append(f"| {lab} | {', '.join(f'{p} {s}' for p, s in zip(c['player'], c['season']))} | |")
        lines.append("")
    if unmarked:
        lines += [f"{sum(map(len, unmarked.values()))} comp names still need a mark: `reports/phase4_unmarked_comps.json`.", ""]
    REPORT.write_text("\n".join(lines) + "\n")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("--quick", action="store_true", help="one 3-epoch adversary run plus a centring check; saves nothing")
    sub.add_parser("report")
    args = p.parse_args()
    search(args.quick) if args.cmd == "search" else report()


if __name__ == "__main__":
    main()
