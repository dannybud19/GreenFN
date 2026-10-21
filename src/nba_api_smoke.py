"""One test call to stats.nba.com via nba_api: draft combine anthropometrics for one season."""

import sys
from pathlib import Path

from nba_api.stats.endpoints import draftcombineplayeranthro

SEASON = "2023-24"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "raw" / "nba_api"

# Use nba_api's built-in request headers: hand-rolled browser headers (Host, Origin,
# Connection, ...) made stats.nba.com hang until timeout when tested on 2026-10-22.


def main() -> int:
    try:
        resp = draftcombineplayeranthro.DraftCombinePlayerAnthro(
            season_year=SEASON, timeout=30
        )
    except Exception as e:  # requests raises ReadTimeout / ConnectionError subclasses
        print(f"nba_api call failed: {type(e).__name__}: {e}")
        print(
            "stats.nba.com is probably blocking this request (common on cloud/VPN/office "
            "networks). Try a home network."
        )
        return 1

    df = resp.get_data_frames()[0]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"draft_combine_anthro_{SEASON}.parquet"
    df.to_parquet(out, index=False)
    print(f"OK: {df.shape[0]} rows x {df.shape[1]} cols -> {out}")
    print(df.head().to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())
