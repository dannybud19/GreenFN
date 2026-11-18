"""Phase 7: turn exports/ into the small static files the web app reads (notes/phase7_plan.md, section 3).

    python export_web.py

Reads exports/ (from precompute.py) and writes web/public/data/:

    players.json            search index: id, name, first and last season, seasons, decade, position,
                            spread percentile
    player/<id>.json        one file per player: top 10 comps with scores, why-similar breakdowns for the
                            top 5, and his season map points (loaded only on his page)
    map.json                every season's map point, grouped by player (the map page)
    profiles.json           centre, peak and spread per player plus the score scales (the lambda slider)
    parity.json             the Python top 10 at lambda 0 for every player, for the TypeScript parity test
    meta.json               feature labels, model provenance, data attribution

Only derived outputs are written: no raw stat tables. Run after precompute.py; re-run whenever it changes.
"""

import json
import shutil
from pathlib import Path

import numpy as np
import pandas as pd

from baselines import STYLE, load

ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"
OUT = ROOT / "web" / "public" / "data"

FEATURE_LABELS = {
    "fga_per_100_poss": "Shot volume", "x3p_ar": "Three-point rate", "f_tr": "Free-throw rate",
    "ts_percent": "True shooting", "x3p_percent_shrunk": "Three-point %", "x2p_percent_shrunk": "Two-point %",
    "ft_percent_shrunk": "Free-throw %", "usg_percent": "Usage", "ast_percent": "Assists",
    "tov_percent": "Turnovers", "orb_percent": "Offensive rebounding", "drb_percent": "Defensive rebounding",
    "stl_percent": "Steals", "blk_percent": "Blocks", "pf_per_100_poss": "Fouls",
}


def primary_positions(root: Path) -> dict:
    """Each player's most common primary position (first part of pos) over his qualified seasons."""
    df = load(root)
    pos = df["pos"].astype(str).str.split("-").str[0]
    return pos.groupby(df["player_id"]).agg(lambda s: s.value_counts().index[0]).to_dict()


def main() -> None:
    manifest = json.loads((EXPORTS / "manifest.json").read_text())
    if manifest.get("quick"):
        raise ValueError("exports/ came from a --quick run; run python precompute.py without --quick first")
    players = json.loads((EXPORTS / "players.json").read_text())
    comps = json.loads((EXPORTS / "comps.json").read_text())
    why = json.loads((EXPORTS / "why.json").read_text())
    umap = pd.read_csv(EXPORTS / "seasons_umap.csv")
    prof = np.load(EXPORTS / "profiles.npz")
    positions = primary_positions(ROOT)

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "player").mkdir(parents=True)

    index = [{"id": p["player_id"], "name": p["player"], "first": p["first_season"], "last": p["last_season"],
              "seasons": p["n_seasons"], "decade": p["decade"], "pos": positions.get(p["player_id"], ""),
              "spreadPct": p["spread_percentile"]} for p in players]
    (OUT / "players.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))

    points = {pid: g[["season", "x", "y"]].values.round(3).tolist() for pid, g in umap.groupby("player_id")}
    for p in players:
        pid = p["player_id"]
        page = {
            "id": pid,
            "comps": [[c["player_id"], c["score"]] for c in comps[pid]],
            "why": {cid: [round(v[f], 4) for f in STYLE] for cid, v in why.get(pid, {}).items()},
            "map": [[int(s), x, y] for s, x, y in points[pid]],
        }
        (OUT / "player" / f"{pid}.json").write_text(json.dumps(page, separators=(",", ":")))

    (OUT / "map.json").write_text(json.dumps({pid: [[int(s), x, y] for s, x, y in pts] for pid, pts in points.items()},
                                             separators=(",", ":")))
    (OUT / "profiles.json").write_text(json.dumps({
        "ids": prof["player_id"].tolist(),
        "centre": prof["centre"].round(5).tolist(), "peak": prof["peak"].round(5).tolist(),
        "spread": prof["spread"].round(6).tolist(),
        "scales": dict(zip(["centre", "peak", "spread"], prof["scales"].tolist())),
        "weights": {"alpha": manifest["model"]["career_score"]["alpha"], "beta": manifest["model"]["career_score"]["beta"]},
    }, separators=(",", ":")))
    (OUT / "parity.json").write_text(json.dumps({pid: [c["player_id"] for c in comps[pid]] for pid in comps},
                                                separators=(",", ":")))
    (OUT / "meta.json").write_text(json.dumps({
        "features": STYLE, "labels": [FEATURE_LABELS[f] for f in STYLE],
        "model": manifest["model"], "counts": manifest["counts"], "exportsCreated": manifest["created"],
        "attribution": "Statistics from Basketball Reference via the Kaggle dataset sumitrodatta/nba-aba-baa-stats. "
                       "Comps, breakdowns and map are GreenFN's own model outputs.",
    }, indent=2))

    sizes = {p.name: p.stat().st_size for p in OUT.iterdir() if p.is_file()}
    per_player = sum(f.stat().st_size for f in (OUT / "player").iterdir())
    print(f"Wrote {OUT}: {len(players)} player files ({per_player / 1e6:.1f} MB total), "
          + ", ".join(f"{k} {v / 1e6:.2f} MB" for k, v in sorted(sizes.items())))


if __name__ == "__main__":
    main()
