"""Phase 5 search and report (notes/phase5_plan.md, sections 4 to 7).

    python evaluate_career.py search
        For each seed's Phase 4 model (season centring alpha 0.5 on the lambda = 0 encoder), builds career
        profiles and scores every method in the fixed search space on validation players:
        split-half identity retrieval, cross-era share of comps, and the lambda effect.
        Writes reports/phase5_search.csv. Nothing is trained, so it simply recomputes on each run.

    python evaluate_career.py report
        Picks the method by the plan's rule and writes reports/phase5_career.md (results, career shape,
        lambda effect, known pairs, sanity comps) and reports/phase5_unmarked_comps.json.

Needs the Phase 4 weights in models/phase4/ (adversary_lambda0.0_s2026/2027/2028.pt).
The test split and the hold-outs are never used as queries; hold-outs are never candidates.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from career import (BestSeasonMatch, CareerScore, Wasserstein, build_profiles, scales, split_half_retrieval,
                    split_halves, top_k)
from era_adversary import SeasonCentred
from evaluate import KNOWN_PAIRS, PAIR_PARTNERS, SANITY
from evaluate_era import load_adv, splits

ROOT = Path(__file__).resolve().parents[1]
SEARCH_CSV = ROOT / "reports" / "phase5_search.csv"
REPORT = ROOT / "reports" / "phase5_career.md"
UNMARKED = ROOT / "reports" / "phase5_unmarked_comps.json"
MARKS = ROOT / "config" / "sanity_marks.json"

SEEDS = [2026, 2027, 2028]
WEIGHTS = [(1.0, 0.0), (0.75, 0.25), (0.5, 0.5), (0.25, 0.75), (0.0, 1.0)]   # (alpha centre, beta peak)
LAMBDAS = [0.0, 0.25, 0.5, 1.0]
CENTRING_ALPHA = 0.5                                                          # Phase 4's chosen setting
SHAPE_PLAYERS = {"stockjo01": "John Stockton", "jamesle01": "LeBron James", "abdulka01": "Kareem Abdul-Jabbar",
                 "rodmade01": "Dennis Rodman", "curryst01": "Stephen Curry"}


def base_model(seed: int, train: pd.DataFrame) -> SeasonCentred:
    return SeasonCentred(load_adv(0.0, seed), CENTRING_ALPHA).fit(train)


def methods(sc: dict) -> list:
    out = [CareerScore(a, b, lam, sc) for a, b in WEIGHTS for lam in LAMBDAS]
    return out + [Wasserstein(), BestSeasonMatch()]


def method_key(m) -> dict:
    if isinstance(m, CareerScore):
        return {"method": "career", "alpha": m.alpha, "beta": m.beta, "lambda": m.lam}
    return {"method": "wasserstein" if isinstance(m, Wasserstein) else "best_season", "alpha": np.nan,
            "beta": np.nan, "lambda": np.nan}


def cross_era_and_spread_gap(method, profs: list, k: int = 10) -> tuple[float, float]:
    """Over validation players: share of top-k comps from another decade, and mean |spread difference|."""
    tops = top_k(method, profs, profs, k)
    share = np.mean([np.mean([profs[j].decade != p.decade for j in t]) for p, t in zip(profs, tops)])
    gap = np.mean([np.mean([abs(profs[j].spread - p.spread) for j in t]) for p, t in zip(profs, tops)])
    return float(share), float(gap)


def seed_data(seed: int, df, train, val, pool):
    model = base_model(seed, train)
    train_profs = build_profiles(model, train, min_seasons=2)
    spread_sd = scales(train_profs)
    val_profs = build_profiles(model, val, min_seasons=2)
    halves = build_profiles(model, split_halves(val), min_seasons=1)
    pool_profs = build_profiles(model, pool, min_seasons=2)
    return model, spread_sd, val_profs, halves, pool_profs


# ---------- search ----------

def search() -> None:
    df, train, val, _, pool = splits()
    rows = []
    for seed in SEEDS:
        _, spread_sd, val_profs, halves, _ = seed_data(seed, df, train, val, pool)
        print(f"seed {seed}: {len(val_profs)} validation players, {len(halves)} halves, scales {spread_sd}")
        for m in methods(spread_sd):
            sh = split_half_retrieval(m, halves)
            share, gap = cross_era_and_spread_gap(m, val_profs)
            rows.append({**method_key(m), "seed": seed, "name": m.name, "split_half_hit10": sh["hit10"],
                         "split_half_mrr": sh["mrr"], "cross_era": share, "spread_gap": gap})
            print(f"  {m.name}: split-half hit@10 {sh['hit10']:.3f}, MRR {sh['mrr']:.3f}, cross-era {share:.3f}")
    pd.DataFrame(rows).to_csv(SEARCH_CSV, index=False)
    print(f"Wrote {SEARCH_CSV} ({len(rows)} rows)")


# ---------- report ----------

def choose(agg: pd.DataFrame) -> pd.Series:
    """Plan rule: among career-score settings and Wasserstein (not the best-season reference), the highest
    mean split-half hit@10; ties go to the higher mean split-half MRR."""
    cand = agg[agg["method"] != "best_season"]
    return cand.sort_values(["split_half_hit10", "split_half_mrr"], ascending=False).iloc[0]


def build_method(row: pd.Series, spread_sd: float):
    if row["method"] == "career":
        return CareerScore(float(row["alpha"]), float(row["beta"]), float(row["lambda"]), spread_sd)
    return Wasserstein() if row["method"] == "wasserstein" else BestSeasonMatch()


def report() -> None:
    df, train, val, _, pool = splits()
    res = pd.read_csv(SEARCH_CSV)
    expected = (len(WEIGHTS) * len(LAMBDAS) + 2) * len(SEEDS)
    if len(res) != expected:
        raise ValueError(f"search CSV has {len(res)} rows (expected {expected}); run the search first")
    keys = ["method", "alpha", "beta", "lambda", "name"]
    agg = res.groupby(keys, dropna=False).agg(
        split_half_hit10=("split_half_hit10", "mean"), hit_sd=("split_half_hit10", "std"),
        split_half_mrr=("split_half_mrr", "mean"), mrr_sd=("split_half_mrr", "std"),
        cross_era=("cross_era", "mean"), spread_gap=("spread_gap", "mean")).reset_index()
    best = choose(agg)
    ref = agg[agg["method"] == "best_season"].iloc[0]
    centre_only = agg[(agg["method"] == "career") & (agg["alpha"] == 1.0) & (agg["lambda"] == 0.0)].iloc[0]
    print(f"Chosen: {best['name']}")

    # seed 2026 for comps, shape and the lambda effect
    model, spread_sd, val_profs, _, pool_profs = seed_data(2026, df, train, val, pool)
    chosen, reference = build_method(best, spread_sd), BestSeasonMatch()
    by_id = {p.player_id: i for i, p in enumerate(pool_profs)}
    names = {**SANITY, **PAIR_PARTNERS}
    missing = [n for pid, n in names.items() if pid not in by_id]
    if missing:
        raise ValueError(f"sanity players missing from the pool: {missing}")
    queries = [pool_profs[by_id[pid]] for pid in names]
    comps = {}
    for label, m in [("chosen", chosen), ("reference", reference)]:
        tops = top_k(m, queries, pool_profs, 10)
        comps[label] = {pid: [pool_profs[j] for j in t] for pid, t in zip(names, tops)}

    pairs = []
    for label, key in [(chosen.name, "chosen"), (reference.name, "reference")]:
        for a, b in KNOWN_PAIRS:
            ta = {p.player_id for p in comps[key][a][:5]}
            tb = {p.player_id for p in comps[key][b][:5]}
            pairs.append((label, f"{names[a]} / {names[b]}", ["fail", "partial", "pass"][(b in ta) + (a in tb)]))

    long_career = [p for p in pool_profs if len(p.emb) >= 4]
    spreads = np.array([p.spread for p in long_career])
    shape = [(n, pool_profs[by_id[pid]].spread, float((spreads < pool_profs[by_id[pid]].spread).mean()),
              len(pool_profs[by_id[pid]].emb)) for pid, n in SHAPE_PLAYERS.items()]

    lam_rows, stockton = [], {}
    base_tops = None
    for lam in LAMBDAS:
        m = CareerScore(chosen.alpha, chosen.beta, lam, spread_sd) if isinstance(chosen, CareerScore) else None
        if m is None:
            break
        tops = top_k(m, val_profs, val_profs, 10)
        gap = np.mean([np.mean([abs(val_profs[j].spread - p.spread) for j in t]) for p, t in zip(val_profs, tops)])
        if base_tops is None:
            base_tops = tops
        overlap = np.mean([len(set(a) & set(b)) / 10 for a, b in zip(tops, base_tops)])
        lam_rows.append((lam, float(gap), float(overlap)))
        st = top_k(m, [pool_profs[by_id["stockjo01"]]], pool_profs, 5)[0]
        stockton[lam] = [f"{pool_profs[j].player} ({pool_profs[j].spread:.3f})" for j in st]

    marks = json.loads(MARKS.read_text())
    aliases = marks.get("aliases", {})
    unmarked = {}
    for pid, pname in SANITY.items():
        have = {n for v in marks["players"][pname].values() for n in v}
        new = sorted({aliases.get(p.player, p.player) for key in ("chosen", "reference") for p in comps[key][pid][:5]}
                     - have)
        if new:
            unmarked[pname] = new
    UNMARKED.write_text(json.dumps(unmarked, ensure_ascii=False, indent=2) + "\n")

    write_report(agg, best, ref, centre_only, chosen, reference, comps, pairs, shape, lam_rows, stockton, unmarked)
    print(f"Wrote {REPORT} and {UNMARKED} ({sum(map(len, unmarked.values()))} names need marks)")


def write_report(agg, best, ref, centre_only, chosen, reference, comps, pairs, shape, lam_rows, stockton, unmarked):
    f = lambda r, k, sd: f"{r[k]:.3f} ± {r[sd]:.3f}"
    lines = [
        "# Phase 5 results: career profiles", "",
        "Validation split, seed 2026 to 2028 base models (Phase 4: season centring alpha 0.5). Rules: "
        "`notes/phase5_plan.md` and earlier plans. Validation also chose the method, so these numbers are "
        "optimistic; test gives the unbiased numbers once, at the end of v1.", "",
        f"**Chosen: {best['name']}** (highest mean split-half hit@10).", "",
        "## Results (validation, mean ± spread over 3 seeds)", "",
        "| Method | Split-half hit@10 | Split-half MRR | Cross-era share of comps | Mean spread gap of comps |",
        "|---|---|---|---|---|",
    ]
    for label, r in [(f"Chosen: {best['name']}", best), ("Centre only (alpha 1, lambda 0)", centre_only),
                     ("Best season match (Phases 2 to 4 reference)", ref)]:
        lines.append(f"| {label} | {f(r, 'split_half_hit10', 'hit_sd')} | {f(r, 'split_half_mrr', 'mrr_sd')} | "
                     f"{r['cross_era']:.3f} | {r['spread_gap']:.4f} |")
    lines += ["", "Split-half: each validation player with 4+ qualified seasons is split into two pseudo-players "
              "(alternating seasons); a hit means one half finds the other in its top 10.", "",
              "## Career shape (seed 2026; spread percentile among pool players with 4+ seasons, lower = more consistent)", "",
              "| Player | Seasons in data | Spread | Percentile |", "|---|---|---|---|"]
    lines += [f"| {n} | {k} | {s:.4f} | {pct:.0%} |" for n, s, pct, k in shape]
    lines += ["", "## Lambda effect (consistency slider; chosen weights, validation players, seed 2026)", "",
              "| lambda | Mean spread gap of top 10 | Overlap with lambda 0 top 10 | Stockton's top 5 (spread) |",
              "|---|---|---|---|"]
    lines += [f"| {lam} | {gap:.4f} | {ov:.0%} | {', '.join(stockton[lam])} |" for lam, gap, ov in lam_rows]
    if not lam_rows:
        lines += ["| n/a | the chosen method has no lambda | | |"]
    stockton_pct = next(pct for n, _, pct, _ in shape if n == "John Stockton")
    gaps = [g for _, g, _ in lam_rows]
    gate = [
        ("Chosen method beats the best-season reference on split-half hit@10", best["split_half_hit10"] > ref["split_half_hit10"]),
        ("Lambda effect is explainable: mean spread gap of comps falls as lambda rises",
         bool(gaps) and all(a > b for a, b in zip(gaps, gaps[1:]))),
        ("Career shape: Stockton's spread is below the median (low spread)", stockton_pct < 0.5),
    ]
    lines += ["", "## Gate (phase5_plan.md section 7)", ""]
    lines += [f"- {'PASS' if ok else 'FAIL'}: {lab}" for lab, ok in gate]
    lines += ["- PENDING: sanity comps marked and scored, no sanity player failing (see `reports/phase5_unmarked_comps.json`)", "",
              "If a line fails, it is recorded as a finding; the metric is not changed.", "",
              "## Search (validation, mean ± spread over 3 seeds)", "",
              "| Method | Split-half hit@10 | Split-half MRR | Cross-era share | Spread gap |", "|---|---|---|---|---|"]
    for _, r in agg.sort_values(["split_half_hit10"], ascending=False).iterrows():
        lines.append(f"| {r['name']} | {f(r, 'split_half_hit10', 'hit_sd')} | {f(r, 'split_half_mrr', 'mrr_sd')} | "
                     f"{r['cross_era']:.3f} | {r['spread_gap']:.4f} |")
    lines += ["", "## Known-pair test (player level, each in the other's top 5)", "", "| Model | Pair | Result |",
              "|---|---|---|"]
    lines += [f"| {m} | {p} | {r} |" for m, p, r in pairs]
    lines += ["", "## Sanity comps (top 5 comp players, whole careers; seed 2026)", "",
              "Judgement column is filled by `src/score_sanity.py --report reports/phase5_career.md` once every name "
              "is marked in `config/sanity_marks.json`. Seasons in brackets are each comp's career span.", ""]
    for pid, pname in SANITY.items():
        lines += [f"### {pname}", "", "| Model | Top 5 | Judgement |", "|---|---|---|"]
        for label, key in [(chosen.name, "chosen"), (reference.name, "reference")]:
            top = comps[key][pid][:5]
            lines.append(f"| {label} | {', '.join(f'{p.player} {p.seasons.min()}' for p in top)} | |")
        lines.append("")
    if unmarked:
        lines += [f"{sum(map(len, unmarked.values()))} comp names still need a mark: `reports/phase5_unmarked_comps.json`.", ""]
    REPORT.write_text("\n".join(lines) + "\n")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("search")
    sub.add_parser("report")
    args = p.parse_args()
    search() if args.cmd == "search" else report()


if __name__ == "__main__":
    main()
