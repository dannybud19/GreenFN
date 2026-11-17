"""Tune the shrinkage priors for 3P%, 2P% and FT% (Phase 2, step 4).

For each candidate prior k, shrink each player's season-t percentage toward that
season's league average, then measure how well it predicts the same player's raw
percentage in season t+1. The best k is the one with the highest correlation.

Rules (notes/phase2_eval_plan.md): training players only; hold-outs never used.
Writes reports/shrinkage_tuning.md. Does not change the dataset: update SHRINK in
src/build_dataset.py by hand with the chosen values, then rebuild.
"""

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SEASONS = ROOT / "data" / "processed" / "player_seasons.parquet"
SPLITS = ROOT / "data" / "processed" / "splits.parquet"
REPORT = ROOT / "reports" / "shrinkage_tuning.md"

CANDIDATES = [5, 10, 25, 50, 100, 200, 400, 800]
CURRENT = {"3P%": 100, "2P%": 100, "FT%": 50}

# stat -> (makes, attempts, minimum attempts in t+1 for the pair to count)
STATS = {
    "3P%": ("x3p", "x3pa", 100),
    "2P%": ("x2p", "x2pa", 200),
    "FT%": ("ft", "fta", 100),
}


def league_pct(seasons: pd.DataFrame, makes: str, attempts: str) -> pd.Series:
    """League average per season from season totals (same as build_dataset.py)."""
    totals = seasons.groupby("season")[[makes, attempts]].sum()
    return totals[makes] / totals[attempts]


def season_pairs(seasons: pd.DataFrame) -> pd.DataFrame:
    """Join each player-season t to the same player's season t+1."""
    nxt = seasons.copy()
    nxt["season"] = nxt["season"] - 1  # so season t+1 lines up with t
    return seasons.merge(nxt, on=["player_id", "season"], suffixes=("", "_next"))


def score(pairs: pd.DataFrame, league: pd.Series, makes: str, attempts: str, k: int) -> float:
    lg = pairs["season"].map(league)
    shrunk_t = (pairs[makes] + k * lg) / (pairs[attempts] + k)
    raw_next = pairs[f"{makes}_next"] / pairs[f"{attempts}_next"]
    return shrunk_t.corr(raw_next)


def main() -> None:
    cols = ["player_id", "season", "qualified"] + [c for m, a, _ in STATS.values() for c in (m, a)]
    seasons = pd.read_parquet(SEASONS, columns=cols)
    splits = pd.read_parquet(SPLITS, columns=["player_id", "split"])
    train_ids = set(splits.loc[splits["split"] == "train", "player_id"])

    pairs = season_pairs(seasons[seasons["player_id"].isin(train_ids)])
    pairs = pairs[pairs["qualified"]]  # season t must be a model input

    rows, chosen = [], {}
    for stat, (makes, attempts, min_next) in STATS.items():
        league = league_pct(seasons, makes, attempts)  # league average uses every player
        p = pairs[pairs[f"{attempts}_next"] >= min_next]
        corrs = {k: score(p, league, makes, attempts, k) for k in CANDIDATES}
        best = max(corrs, key=corrs.get)
        chosen[stat] = best
        rows.append({"stat": stat, "pairs": len(p), **{f"k={k}": round(c, 4) for k, c in corrs.items()},
                     "best_k": best, "current_k": CURRENT[stat]})

    table = pd.DataFrame(rows)
    print(table.to_string(index=False))
    print("\nChosen priors:", chosen)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Shrinkage prior tuning",
        "",
        "Correlation between a player's shrunk percentage in season t and his raw percentage in season t+1.",
        "Training players only; season t qualified; season t+1 needs at least 100 3PA, 200 2PA or 100 FTA. Higher is better.",
        "",
        "| Stat | Pairs | " + " | ".join(f"k={k}" for k in CANDIDATES) + " | Best k | Previous k |",
        "|---|---|" + "---|" * len(CANDIDATES) + "---|---|",
    ]
    for r in rows:
        cells = " | ".join(f"{r[f'k={k}']:.4f}" for k in CANDIDATES)
        lines.append(f"| {r['stat']} | {r['pairs']:,} | {cells} | {r['best_k']} | {r['current_k']} |")
    edge = [s for s, k in chosen.items() if k in (CANDIDATES[0], CANDIDATES[-1])]
    if edge:
        lines += ["", f"Note: best k is at the edge of the grid for {', '.join(edge)}; consider widening the grid."]
    REPORT.write_text("\n".join(lines) + "\n")
    print(f"Wrote {REPORT}")


if __name__ == "__main__":
    main()
