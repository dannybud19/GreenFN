"""Build data/processed/splits.parquet: one row per player with its set (train/val/test).

Rules follow notes/phase2_eval_plan.md, section 2:
- split by player, never by season
- balanced by debut decade (first season in the parquet)
- hold-outs from config/holdout.json forced into test
- fixed seed
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SEASONS = ROOT / "data" / "processed" / "player_seasons.parquet"
HOLDOUT = ROOT / "config" / "holdout.json"
OUT = ROOT / "data" / "processed" / "splits.parquet"

SEED = 2026
SHARES = {"train": 0.70, "val": 0.15, "test": 0.15}


def load_holdouts() -> list[str]:
    players = json.loads(HOLDOUT.read_text())["players"]
    return [p["player_id"] for p in players]


def player_table(seasons: pd.DataFrame) -> pd.DataFrame:
    """One row per player: name, debut season, debut decade, qualified-season count."""
    g = seasons.groupby("player_id")
    players = pd.DataFrame({
        "player": g["player"].first(),
        "debut_season": g["season"].min(),
        "n_qualified": g["qualified"].sum().astype(int),
    }).reset_index()
    players["debut_decade"] = (players["debut_season"] // 10) * 10
    return players


def assign(players: pd.DataFrame, holdouts: list[str], seed: int) -> pd.Series:
    """Shuffle within each debut decade and cut 70/15/15. Hold-outs go to test."""
    rng = np.random.default_rng(seed)
    split = pd.Series(index=players.index, dtype="object")
    is_holdout = players["player_id"].isin(holdouts)
    split[is_holdout] = "test"

    for _, group in players[~is_holdout].groupby("debut_decade"):
        idx = group.sort_values("player_id").index.to_numpy()  # stable order before shuffling
        idx = rng.permutation(idx)
        n_train = round(len(idx) * SHARES["train"])
        n_val = round(len(idx) * SHARES["val"])
        split[idx[:n_train]] = "train"
        split[idx[n_train:n_train + n_val]] = "val"
        split[idx[n_train + n_val:]] = "test"
    return split


def check(players: pd.DataFrame, seasons: pd.DataFrame, holdouts: list[str]) -> None:
    if players["player_id"].duplicated().any():
        raise ValueError("a player_id appears more than once in the split table")
    if not set(seasons["player_id"]) <= set(players["player_id"]):
        raise ValueError("some players in the parquet have no split")
    if players["split"].isna().any():
        raise ValueError("some players were not assigned a split")
    missing = set(holdouts) - set(players["player_id"])
    if missing:
        raise ValueError(f"hold-out player_ids not found in the parquet: {sorted(missing)}")
    wrong = players[players["player_id"].isin(holdouts) & (players["split"] != "test")]
    if len(wrong):
        raise ValueError(f"hold-outs outside test: {wrong['player_id'].tolist()}")
    shares = players["split"].value_counts(normalize=True)
    for name, target in SHARES.items():
        if abs(shares.get(name, 0) - target) > 0.02:
            raise ValueError(f"{name} share {shares.get(name, 0):.3f} is far from {target}")


def main() -> None:
    seasons = pd.read_parquet(SEASONS, columns=["player_id", "player", "season", "qualified"])
    holdouts = load_holdouts()
    players = player_table(seasons)
    players["split"] = assign(players, holdouts, SEED)
    check(players, seasons, holdouts)

    out = players[["player_id", "player", "debut_season", "debut_decade", "n_qualified", "split"]]
    out.to_parquet(OUT, index=False)

    q = seasons[seasons["qualified"]].merge(out[["player_id", "split"]], on="player_id")
    summary = pd.DataFrame({
        "players": out["split"].value_counts(),
        "qualified_seasons": q["split"].value_counts(),
    }).reindex(["train", "val", "test"])
    print(f"Wrote {OUT} (seed {SEED})")
    print(summary.to_string())
    print("\nPlayers per debut decade:")
    print(pd.crosstab(out["debut_decade"], out["split"])[["train", "val", "test"]].to_string())


if __name__ == "__main__":
    main()
