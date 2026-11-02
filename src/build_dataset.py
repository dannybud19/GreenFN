"""Build data/processed/player_seasons.parquet: one row per NBA player-season, 1980–2026.

Scope, features and checks follow notes/phase0_feature_note.md.
"""

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed" / "player_seasons.parquet"

FIRST_SEASON, LAST_SEASON = 1980, 2026
KEYS = ["season", "player_id", "team"]

# Qualified = mp >= 500 scaled to schedule length; seasons not listed had 82 games.
MIN_MINUTES = 500
SEASON_GAMES = {1999: 50, 2012: 66, 2020: 72, 2021: 72}

# Shrunk percentage -> (makes, attempts, prior weight in attempts)
SHRINK = {
    "x3p_percent": ("x3p", "x3pa", 100),
    "x2p_percent": ("x2p", "x2pa", 100),
    "ft_percent": ("ft", "fta", 50),
}

CONTEXT = ["season", "player", "player_id", "team", "n_teams", "teams", "age", "pos", "g", "mp"]
STYLE = [
    "fga_per_100_poss", "x3p_ar", "f_tr",
    "ts_percent", "x3p_percent_shrunk", "x2p_percent_shrunk", "ft_percent_shrunk",
    "usg_percent", "ast_percent", "tov_percent",
    "orb_percent", "drb_percent",
    "stl_percent", "blk_percent", "pf_per_100_poss",
]
IMPACT = ["bpm", "obpm", "dbpm", "ws_48", "vorp", "o_rtg", "d_rtg"]
BODY = ["ht_in_in", "wt"]
COUNTS = ["x3p", "x3pa", "x2p", "x2pa", "ft", "fta"]

# Totals that pin down the 2026-10-22 snapshot (check 8); a re-download changes them.
EXPECTED_ROWS, EXPECTED_QUALIFIED = 20_550, 14_749


def load(name: str) -> pd.DataFrame:
    df = pd.read_csv(RAW_DIR / name)
    return df[(df["lg"] == "NBA") & df["season"].between(FIRST_SEASON, LAST_SEASON)]


def is_multi_team(df: pd.DataFrame) -> pd.Series:
    return df["team"].str.fullmatch(r"\dTM")


def collapse(df: pd.DataFrame) -> pd.DataFrame:
    """One row per (season, player_id): the xTM row for traded players, else the only row."""
    several = df.duplicated(["season", "player_id"], keep=False)
    return pd.concat([df[is_multi_team(df)], df[~several]]).sort_index()


def team_info(df: pd.DataFrame) -> pd.DataFrame:
    """n_teams and the per-team list ('IND/PHI') for each player-season."""
    by_player = df[~is_multi_team(df)].groupby(["season", "player_id"], sort=False)["team"]
    return pd.DataFrame({"n_teams": by_player.size(), "teams": by_player.agg("/".join)}).reset_index()


def shrink(df: pd.DataFrame) -> pd.DataFrame:
    """Shrink 3P%, 2P% and FT% toward the season's league average, weighted by attempts."""
    for col, (makes, attempts, prior) in SHRINK.items():
        season = df.groupby("season")[[makes, attempts]].transform("sum")
        league = season[makes] / season[attempts]
        df[f"{col}_shrunk"] = (df[makes] + prior * league) / (df[attempts] + prior)
    return df


def season_z(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Minutes-weighted z-scores within each season, with qualified rows as the reference."""
    z = pd.DataFrame(index=df.index)
    for _, rows in df.groupby("season"):
        ref = rows[rows["qualified"]]
        for col in cols:
            r = ref[[col, "mp"]].dropna()
            mean = np.average(r[col], weights=r["mp"])
            std = np.sqrt(np.average((r[col] - mean) ** 2, weights=r["mp"]))
            z.loc[rows.index, f"z_{col}"] = (rows[col] - mean) / std
    return z


def check(df: pd.DataFrame, per100_raw: pd.DataFrame) -> None:
    """Phase 1 checks from the feature note."""
    # 1. Scope
    assert df["season"].between(FIRST_SEASON, LAST_SEASON).all() and (df["lg"] == "NBA").all()
    # 2. One row per player-season
    assert not df.duplicated(["season", "player_id"]).any()
    # 3. Joins (row counts are asserted in main) and every player has career info
    assert df["ht_in_in"].notna().mean() > 0.999, "height missing for too many players"
    # 4. xTM g and mp equal the sum of the per-team rows
    team_sums = per100_raw[~is_multi_team(per100_raw)].groupby(["season", "player_id"])[["g", "mp"]].sum()
    multi = per100_raw[is_multi_team(per100_raw)].set_index(["season", "player_id"])[["g", "mp"]]
    assert (multi == team_sums.loc[multi.index]).all().all(), "xTM totals don't match per-team rows"
    # 5. No nulls in style or impact columns for qualified rows
    q = df[df["qualified"]]
    nulls = q[STYLE + IMPACT].isna().sum()
    assert not nulls.any(), f"nulls in qualified rows: {nulls[nulls > 0].to_dict()}"
    # 6. Ranges for qualified rows
    for col, (lo, hi) in {"ts_percent": (0.30, 0.85), "usg_percent": (3, 45), "bpm": (-15, 20)}.items():
        assert q[col].between(lo, hi).all(), f"{col} outside [{lo}, {hi}] for a qualified row"
    # 7. Per-100 consistency, within rounding
    p = df.dropna(subset=["trb_per_100_poss", "fga_per_100_poss"])
    assert ((p["orb_per_100_poss"] + p["drb_per_100_poss"] - p["trb_per_100_poss"]).abs() <= 0.2).all()
    assert ((p["x2pa_per_100_poss"] + p["x3pa_per_100_poss"] - p["fga_per_100_poss"]).abs() <= 0.2).all()
    # 8. Qualified count per season, and totals match the snapshot
    per_season = df.groupby("season")["qualified"].sum()
    assert per_season.between(200, 400).all(), f"qualified per season out of range: {per_season.agg(['min', 'max']).to_dict()}"
    assert (len(df), int(df["qualified"].sum())) == (EXPECTED_ROWS, EXPECTED_QUALIFIED), (
        f"got {len(df):,} rows / {int(df['qualified'].sum()):,} qualified; the Kaggle data may have been updated"
    )


def main() -> None:
    per100_raw = load("Per 100 Poss.csv")
    per100 = collapse(per100_raw)
    advanced = collapse(load("Advanced.csv"))
    totals = collapse(load("Player Totals.csv"))
    career = pd.read_csv(RAW_DIR / "Player Career Info.csv")

    # Context columns come from per-100; the other tables add only what per-100 lacks.
    adv_cols = [c for c in advanced.columns if c not in per100.columns]
    df = (
        per100.merge(advanced[KEYS + adv_cols], on=KEYS, validate="1:1")
        .merge(totals[KEYS + COUNTS], on=KEYS, validate="1:1")
        .merge(team_info(per100_raw), on=["season", "player_id"], how="left", validate="1:1")
        .merge(career[["player_id"] + BODY], on="player_id", how="left", validate="m:1")
    )
    assert len(df) == len(per100) == len(advanced) == len(totals), "per-100, advanced and totals don't join 1:1"
    assert df["player_id"].isin(career["player_id"]).all(), "player_id missing from Player Career Info"
    df["n_teams"] = df["n_teams"].fillna(1).astype(int)
    df["teams"] = df["teams"].fillna(df["team"])

    games = df["season"].map(SEASON_GAMES).fillna(82)
    df["qualified"] = df["mp"] >= MIN_MINUTES * games / 82

    df = shrink(df)
    df = pd.concat([df, season_z(df, STYLE + BODY)], axis=1)

    check(df, per100_raw)

    raw_pct = list(SHRINK)
    z_cols = [f"z_{c}" for c in STYLE + BODY]
    out = df[CONTEXT + ["qualified"] + STYLE + raw_pct + COUNTS + IMPACT + BODY + z_cols].reset_index(drop=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.to_parquet(OUT, index=False)
    q = out[out["qualified"]]
    print(f"Wrote {OUT}")
    print(f"  {len(out):,} player-seasons x {out.shape[1]} columns, {out['player_id'].nunique():,} players")
    print(f"  {len(q):,} qualified ({q['player_id'].nunique():,} players), all checks passed")


if __name__ == "__main__":
    main()
