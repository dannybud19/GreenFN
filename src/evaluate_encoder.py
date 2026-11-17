"""Phase 3 search and report (notes/phase3_plan.md, sections 4 to 7).

Two commands:

    python evaluate_encoder.py search [--dims 8 16 32] [--quick]
        Trains every setting in the fixed search space (embedding size x temperature x pretraining
        x seed) on training players and scores each run on validation. Results are appended to
        reports/phase3_search.csv one row per run, so the search can stop and resume: runs already
        in the CSV are skipped. Weights go to models/phase3/ (git-ignored).

    python evaluate_encoder.py report
        Averages the search over seeds, picks the setting with the best mean validation
        non-adjacent hit@10 (ties: lower next-season RMSE), retrains nothing, loads that setting's
        3 seed models, and scores them on every Phase 2 metric plus the stability check, next to
        B2 cosine. Writes reports/phase3_encoder.md and reports/phase3_unmarked_comps.json
        (comp names that still need a human mark in config/sanity_marks.json).

The test split and the hold-outs are never used. The Phase 2 report is never touched.
"""

import argparse
import itertools
import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from baselines import B2Cosine, load
from encoder import NeuralEncoder, SeasonEncoder
from evaluate import (KNOWN_PAIRS, PAIR_PARTNERS, SANITY, box_score, comp_players, era_and_position,
                      next_season, retrieval)

ROOT = Path(__file__).resolve().parents[1]
SEARCH_CSV = ROOT / "reports" / "phase3_search.csv"
REPORT = ROOT / "reports" / "phase3_encoder.md"
UNMARKED = ROOT / "reports" / "phase3_unmarked_comps.json"
MARKS = ROOT / "config" / "sanity_marks.json"
MODELS = ROOT / "models" / "phase3"

DIMS = [8, 16, 32]
TEMPERATURES = [0.05, 0.1, 0.2]
PRETRAINING = [True, False]
SEEDS = [2026, 2027, 2028]
SETTING = ["dim", "temperature", "pretraining"]


def run_name(dim: int, temperature: float, pretraining: bool, seed: int) -> str:
    return f"d{dim}_t{temperature}_{'pre' if pretraining else 'nopre'}_s{seed}"


def splits() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    df = load(ROOT)
    holdouts = {p["player_id"] for p in json.loads((ROOT / "config" / "holdout.json").read_text())["players"]}
    train = df[df["split"] == "train"].reset_index(drop=True)
    val = df[df["split"] == "val"].reset_index(drop=True)
    trval = df[df["split"].isin(["train", "val"])].reset_index(drop=True)
    pool = df[~df["player_id"].isin(holdouts)]
    return df, train, val, trval, pool


# ---------- stability check (phase3_plan.md section 5) ----------

def stability(model, val: pd.DataFrame, n_random: int = 20000, seed: int = 2026) -> dict:
    """Mean cosine distance (1 - similarity) for consecutive seasons of the same player vs random
    pairs of different players. Works for any model whose similarity is cosine (B2 and the encoder)."""
    emb = model.embed(val)
    key = pd.Series(np.arange(len(val)), index=pd.MultiIndex.from_frame(val[["player_id", "season"]]))
    nxt = key.reindex(pd.MultiIndex.from_arrays([val["player_id"], val["season"] + 1])).to_numpy()
    i = np.flatnonzero(~np.isnan(nxt))
    j = nxt[i].astype(int)
    consecutive = 1 - np.sum(emb[i] * emb[j], axis=1) / (
        np.linalg.norm(emb[i], axis=1) * np.linalg.norm(emb[j], axis=1))
    rng = np.random.default_rng(seed)
    a, b = rng.integers(0, len(val), n_random), rng.integers(0, len(val), n_random)
    keep = val["player_id"].to_numpy()[a] != val["player_id"].to_numpy()[b]
    a, b = a[keep], b[keep]
    rand = 1 - np.sum(emb[a] * emb[b], axis=1) / (np.linalg.norm(emb[a], axis=1) * np.linalg.norm(emb[b], axis=1))
    return {"consecutive": float(consecutive.mean()), "random": float(rand.mean()),
            "ratio": float(consecutive.mean() / rand.mean()), "pass": bool(consecutive.mean() < rand.mean())}


# ---------- search ----------

def search(dims: list[int], quick: bool) -> None:
    _, _, val, _, _ = splits()
    done = set(pd.read_csv(SEARCH_CSV)["run"]) if SEARCH_CSV.exists() else set()
    grid = list(itertools.product(dims, TEMPERATURES, PRETRAINING, SEEDS))
    if quick:  # one short run to prove the pipeline works; results are not written to the CSV
        grid = [(dims[0], 0.1, True, 2026)]
    todo = [g for g in grid if quick or run_name(*g) not in done]
    print(f"{len(grid)} runs in this search, {len(grid) - len(todo)} already done, {len(todo)} to go")
    for n, (dim, t, pre, seed) in enumerate(todo, start=1):
        name = run_name(dim, t, pre, seed)
        enc = NeuralEncoder(dim=dim, temperature=t, pretraining=pre, seed=seed)
        if quick:
            import encoder
            original = encoder.train_contrastive
            encoder.train_contrastive = lambda *a, **k: original(*a, **{**k, "epochs": 3})
            enc.fit(val=val)
            encoder.train_contrastive = original
        else:
            enc.fit(val=val)
        con = enc.history["contrastive"]
        pre_hist = enc.history.get("pretrain")
        ret, na, ns = retrieval(enc, val), retrieval(enc, val, non_adjacent=True), next_season(enc, val)
        row = {"run": name, "dim": dim, "temperature": t, "pretraining": pre, "seed": seed,
               "epochs": len(con), "best_epoch": max(con, key=lambda h: h["val_nonadj_hit10"])["epoch"],
               "pretrain_val_mse": pre_hist[-1]["val"] if pre_hist else np.nan,
               "predict0_mse": pre_hist[-1]["predict_0"] if pre_hist else np.nan,
               "hit10": ret["hit10"], "mrr": ret["mrr"], "nonadj_hit10": na["hit10"],
               "next_rmse": ns["rmse"], "persistence": ns["persistence"]}
        print(f"[{n}/{len(todo)}] {name}: non-adj {na['hit10']:.3f}, next RMSE {ns['rmse']:.3f}, "
              f"{len(con)} epochs")
        if quick:
            print("Quick run OK (not saved).")
            return
        enc.save(MODELS / f"{name}.pt")
        pd.DataFrame([row]).to_csv(SEARCH_CSV, mode="a", header=not SEARCH_CSV.exists(), index=False)


# ---------- report ----------

def load_encoder(dim: int, temperature: float, pretraining: bool, seed: int) -> NeuralEncoder:
    ckpt = torch.load(MODELS / f"{run_name(dim, temperature, pretraining, seed)}.pt", weights_only=False)
    enc = NeuralEncoder(dim=dim, temperature=temperature, pretraining=pretraining, seed=seed)
    enc.model = SeasonEncoder(dim)
    enc.model.load_state_dict(ckpt["state"])
    enc.history = ckpt["history"]
    return enc


def full_scores(model, val: pd.DataFrame, trval: pd.DataFrame) -> dict:
    ret, na, ns = retrieval(model, val), retrieval(model, val, non_adjacent=True), next_season(model, val)
    probes = era_and_position(model, trval)
    st = stability(model, val)
    return {"hit10": ret["hit10"], "mrr": ret["mrr"], "nonadj_hit10": na["hit10"], "next_rmse": ns["rmse"],
            "persistence": ns["persistence"], "era": probes["era"], "position": probes["position"],
            "stab_consecutive": st["consecutive"], "stab_random": st["random"], "stab_ratio": st["ratio"],
            "stab_pass": st["pass"]}


def report() -> None:
    df, train, val, trval, pool = splits()
    res = pd.read_csv(SEARCH_CSV)
    expected = len(DIMS) * len(TEMPERATURES) * len(PRETRAINING) * len(SEEDS)
    if len(res) != expected or res["run"].duplicated().any():
        raise ValueError(f"search CSV has {len(res)} rows (expected {expected} unique runs); finish the search first")

    # ablation table and selection (selection uses validation only)
    agg = res.groupby(SETTING).agg(
        nonadj=("nonadj_hit10", "mean"), nonadj_sd=("nonadj_hit10", "std"),
        next_rmse=("next_rmse", "mean"), next_rmse_sd=("next_rmse", "std"),
        hit10=("hit10", "mean"), epochs=("epochs", "mean")).reset_index()
    agg = agg.sort_values(["nonadj", "next_rmse"], ascending=[False, True]).reset_index(drop=True)
    best = agg.iloc[0]
    setting = (int(best["dim"]), float(best["temperature"]), bool(best["pretraining"]))
    print("Chosen setting:", setting)

    # full scores for the chosen setting's 3 seeds, and B2
    encs = [load_encoder(*setting, s) for s in SEEDS]
    seed_scores = pd.DataFrame([full_scores(e, val, trval) for e in encs], index=SEEDS)
    b2 = B2Cosine().fit(train)
    b2_scores = full_scores(b2, val, trval)
    boxes = box_score(encs[0], trval)

    # comps (seed 2026 model) and known pairs
    names = {**SANITY, **PAIR_PARTNERS}
    comps = {pid: {"enc": comp_players(encs[0], df[df["player_id"] == pid], pool, n=5),
                   "b2": comp_players(b2, df[df["player_id"] == pid], pool, n=5)} for pid in names}
    pairs = []
    for label, key in [(encs[0].name, "enc"), ("B2 cosine", "b2")]:
        for a, b in KNOWN_PAIRS:
            hits = (b in set(comps[a][key]["player_id"])) + (a in set(comps[b][key]["player_id"]))
            pairs.append((label, f"{names[a]} / {names[b]}", ["fail", "partial", "pass"][hits]))

    # names needing a human mark
    marks = json.loads(MARKS.read_text())
    aliases = marks.get("aliases", {})
    unmarked = {}
    for pid, pname in SANITY.items():
        have = {n for v in marks["players"][pname].values() for n in v}
        new = [aliases.get(n, n) for n in comps[pid]["enc"]["player"] if aliases.get(n, n) not in have]
        if new:
            unmarked[pname] = new
    UNMARKED.write_text(json.dumps(unmarked, ensure_ascii=False, indent=2) + "\n")

    write_report(agg, setting, seed_scores, b2_scores, boxes, comps, pairs, unmarked, encs[0].name)
    print(f"Wrote {REPORT} and {UNMARKED} ({sum(map(len, unmarked.values()))} names need marks)")


def write_report(agg, setting, seed_scores, b2, boxes, comps, pairs, unmarked, enc_name) -> None:
    m, sd = seed_scores.mean(numeric_only=True), seed_scores.std(numeric_only=True)
    f = lambda k, d=3: f"{m[k]:.{d}f} ± {sd[k]:.{d}f}"
    dim, t, pre = setting
    lines = [
        "# Phase 3 results: neural season encoder", "",
        "Validation split. Rules: `notes/phase2_eval_plan.md` and `notes/phase3_plan.md`. "
        "Validation also chose the setting and the early-stopping epoch, so encoder numbers here are optimistic; "
        "the unbiased numbers come from the test split once, at the end of v1.", "",
        f"Chosen setting: embedding size {dim}, temperature {t}, pretraining {'yes' if pre else 'no'} "
        "(best mean validation non-adjacent hit@10 over 3 seeds).", "",
        "## Results (mean ± spread over seeds 2026, 2027, 2028)", "",
        "| Metric | Encoder | B2 cosine | Better |", "|---|---|---|---|",
    ]
    rows = [("Hit@10", "hit10", True), ("MRR", "mrr", True), ("Non-adjacent hit@10", "nonadj_hit10", True),
            ("Next-season RMSE", "next_rmse", False), ("Era balanced acc. (chance 0.20)", "era", None),
            ("Position balanced acc. (chance 0.20)", "position", True)]
    for label, k, higher in rows:
        better = "" if higher is None else ("encoder" if (m[k] > b2[k]) == higher else "B2")
        lines.append(f"| {label} | {f(k)} | {b2[k]:.3f} | {better} |")
    lines += ["", f"Persistence next-season RMSE: {b2['persistence']:.3f}. "
              f"Encoder vs persistence: {(m['next_rmse'] - b2['persistence']) / b2['persistence']:+.1%}.", "",
              "## Stability check (validation)", "",
              "Mean cosine distance between consecutive seasons of the same player vs random pairs of different players. "
              "Pass if consecutive pairs are closer.", "",
              "| Model | Consecutive | Random | Ratio | Pass |", "|---|---|---|---|---|",
              f"| Encoder | {f('stab_consecutive')} | {f('stab_random')} | {f('stab_ratio')} | "
              f"{'yes' if seed_scores['stab_pass'].all() else 'no'} (all seeds) |",
              f"| B2 cosine | {b2['stab_consecutive']:.3f} | {b2['stab_random']:.3f} | {b2['stab_ratio']:.3f} | "
              f"{'yes' if b2['stab_pass'] else 'no'} |", "",
              "## Gate (phase3_plan.md section 7)", ""]
    gate = [
        ("Beats B2 on non-adjacent hit@10", m["nonadj_hit10"] > b2["nonadj_hit10"]),
        ("Beats B2 on next-season RMSE", m["next_rmse"] < b2["next_rmse"]),
        ("Beats persistence on next-season RMSE", m["next_rmse"] < b2["persistence"]),
        ("Stability check passes (all seeds)", bool(seed_scores["stab_pass"].all())),
        ("Position probe well above chance (> 0.40)", m["position"] > 0.40),
    ]
    lines += [f"- {'PASS' if ok else 'FAIL'}: {label}" for label, ok in gate]
    lines += ["- PENDING: sanity comps marked and scored (see `reports/phase3_unmarked_comps.json`)", "",
              "If a line fails, it is recorded as a finding; the metric is not changed.", "",
              "## Search (validation, mean ± spread over 3 seeds)", "",
              "| Embedding size | Temperature | Pretraining | Non-adjacent hit@10 | Next-season RMSE | Hit@10 | Mean epochs |",
              "|---|---|---|---|---|---|---|"]
    for _, r in agg.iterrows():
        lines.append(f"| {int(r['dim'])} | {r['temperature']} | {'yes' if r['pretraining'] else 'no'} | "
                     f"{r['nonadj']:.3f} ± {r['nonadj_sd']:.3f} | {r['next_rmse']:.3f} ± {r['next_rmse_sd']:.3f} | "
                     f"{r['hit10']:.3f} | {r['epochs']:.0f} |")
    lines += ["", "## Box-score correlation (seed 2026 model, top 2 PCA components, Bonferroni over 6 tests)", "",
              "| PC | Stat | r | p (corrected) |", "|---|---|---|---|"]
    lines += [f"| {b['pc']} | {b['stat']} | {b['r']:+.3f} | {b['p_bonf']:.2g} |" for b in boxes]
    lines += ["", "## Known-pair test (each in the other's top 5)", "", "| Model | Pair | Result |", "|---|---|---|"]
    lines += [f"| {mdl} | {pair} | {res} |" for mdl, pair, res in pairs]
    lines += ["", "## Sanity comps (top 5 comp players, best season match; encoder = seed 2026 model)", "",
              "Judgement column is filled by `src/score_sanity.py --report reports/phase3_encoder.md` once every name "
              "is marked in `config/sanity_marks.json`.", ""]
    for pid, pname in SANITY.items():
        lines += [f"### {pname}", "", "| Model | Top 5 | Judgement |", "|---|---|---|"]
        for label, key in [(enc_name, "enc"), ("B2 cosine", "b2")]:
            c = comps[pid][key]
            lines.append(f"| {label} | {', '.join(f'{p} {s}' for p, s in zip(c['player'], c['season']))} | |")
        lines.append("")
    if unmarked:
        lines += [f"{sum(map(len, unmarked.values()))} encoder comp names still need a mark: "
                  "`reports/phase3_unmarked_comps.json`.", ""]
    REPORT.write_text("\n".join(lines) + "\n")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("--dims", type=int, nargs="+", default=DIMS, choices=DIMS)
    s.add_argument("--quick", action="store_true", help="one 3-epoch run to test the pipeline; saves nothing")
    sub.add_parser("report")
    args = p.parse_args()
    if args.cmd == "search":
        search(args.dims, args.quick)
    else:
        report()


if __name__ == "__main__":
    main()
