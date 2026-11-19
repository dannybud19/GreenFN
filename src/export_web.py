"""Phase 7: turn exports/ into the small static files the web app reads (notes/phase7_plan.md, section 3).

    python export_web.py

Reads exports/ (from precompute.py) and writes web/public/data/:

    players.json            search index: id, name, first and last season, seasons, decade, position,
                            spread percentile, region
    player/<id>.json        one file per player: top 10 comps with scores, why-similar breakdowns for the
                            top 5, his season map points, his region, and points, rebounds and assists per
                            game for each of his seasons (career playback; loaded only on his page)
    map.json                every season's map point, grouped by player: [season, x, y, teams, region]
                            (teams is the season's team codes joined by "/", e.g. "MIL/BOS" for a trade)
    teams.json              every team code with its name and its players with the most qualified seasons
    regions.json            the 9 map regions (k-means on the 2D map; a reading aid, not a model output)
    legends.json            10 hand-picked players to try, each with his closest career comp
    profiles.json           centre, peak and spread per player plus the score scales (the lambda slider)
    parity.json             the Python top 10 at lambda 0 for every player, for the TypeScript parity test
    meta.json               feature labels, model provenance, data attribution

Only derived outputs are written, plus one approved exception (Phase 7d, Danny, 19 Nov 2026): points, rebounds
and assists per game for each qualified season, from Basketball Reference via the Kaggle dataset (CC0), for career
playback. No other raw stat tables. Run after precompute.py; re-run whenever it changes.
"""

import json
import shutil
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment
from sklearn.cluster import KMeans

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


# Basketball Reference team codes (historic ones included) -> (full name, short name used in copy).
TEAMS = {
    "ATL": ("Atlanta Hawks", "Hawks"), "BOS": ("Boston Celtics", "Celtics"), "BRK": ("Brooklyn Nets", "Nets"),
    "CHA": ("Charlotte Bobcats", "Bobcats"), "CHH": ("Charlotte Hornets (1989 to 2002)", "Hornets"),
    "CHI": ("Chicago Bulls", "Bulls"), "CHO": ("Charlotte Hornets", "Hornets"),
    "CLE": ("Cleveland Cavaliers", "Cavaliers"), "DAL": ("Dallas Mavericks", "Mavericks"),
    "DEN": ("Denver Nuggets", "Nuggets"), "DET": ("Detroit Pistons", "Pistons"),
    "GSW": ("Golden State Warriors", "Warriors"), "HOU": ("Houston Rockets", "Rockets"),
    "IND": ("Indiana Pacers", "Pacers"), "KCK": ("Kansas City Kings", "Kings"),
    "LAC": ("Los Angeles Clippers", "Clippers"), "LAL": ("Los Angeles Lakers", "Lakers"),
    "MEM": ("Memphis Grizzlies", "Grizzlies"), "MIA": ("Miami Heat", "Heat"), "MIL": ("Milwaukee Bucks", "Bucks"),
    "MIN": ("Minnesota Timberwolves", "Timberwolves"), "NJN": ("New Jersey Nets", "Nets"),
    "NOH": ("New Orleans Hornets", "Hornets"), "NOK": ("New Orleans/Oklahoma City Hornets", "Hornets"),
    "NOP": ("New Orleans Pelicans", "Pelicans"), "NYK": ("New York Knicks", "Knicks"),
    "OKC": ("Oklahoma City Thunder", "Thunder"), "ORL": ("Orlando Magic", "Magic"),
    "PHI": ("Philadelphia 76ers", "76ers"), "PHO": ("Phoenix Suns", "Suns"),
    "POR": ("Portland Trail Blazers", "Trail Blazers"), "SAC": ("Sacramento Kings", "Kings"),
    "SAS": ("San Antonio Spurs", "Spurs"), "SDC": ("San Diego Clippers", "Clippers"),
    "SEA": ("Seattle SuperSonics", "SuperSonics"), "TOR": ("Toronto Raptors", "Raptors"),
    "UTA": ("Utah Jazz", "Jazz"), "VAN": ("Vancouver Grizzlies", "Grizzlies"),
    "WAS": ("Washington Wizards", "Wizards"), "WSB": ("Washington Bullets", "Bullets"),
}

# Hand-picked "legends to try" (never a ranking). Players missing from players.json are skipped.
LEGENDS = ["jordami01", "jamesle01", "bryanko01", "curryst01", "onealsh01", "duncati01", "johnsma02",
           "birdla01", "jokicni01", "garneke01"]

# Draft region names (phase7b_plan.md section 4.1) with the stats each name claims, and a plain description.
# A name is kept only if its claimed stats are among its cluster's top 3 mean within-season z-scores
# ("All-round forwards" instead needs every |mean z| under 0.5); otherwise the region gets a neutral name.
REGION_NAMES = [
    ("Floor generals", [["ast_percent"], ["stl_percent"]], "assists, steals"),
    ("Scoring bigs", [["drb_percent", "orb_percent"], ["usg_percent"], ["blk_percent"]], "rebounds, usage, blocks"),
    ("Shooting guards", [["x3p_ar"], ["x3p_percent_shrunk"], ["ft_percent_shrunk"]], "3PT rate, 3PT%, FT%"),
    ("Rim protectors", [["blk_percent"], ["orb_percent"]], "blocks, offensive boards"),
    ("Shooting point guards", [["x3p_ar"], ["ast_percent"]], "threes and assists"),
    ("Primary scorers", [["usg_percent"], ["fga_per_100_poss"]], "usage, shot volume"),
    ("Energy bigs", [["orb_percent"], ["pf_per_100_poss"]], "offensive boards, fouls"),
    ("Stretch wings", [["x3p_ar"]], "lots of threes"),
    ("All-round forwards", None, "close to league average"),
]

# Fixed names for clusters that matched no draft name (Danny, 19 Nov 2026). Keyed by the cluster's top 3 mean
# within-season z-scores (as a set), not by cluster index, so the name can only land on the cluster it was chosen
# for. The cluster with assists, usage and shot volume on top (mostly PGs) had no draft name and was "Region 7".
REGION_OVERRIDES = {
    frozenset({"ast_percent", "usg_percent", "fga_per_100_poss"}): ("Ball-dominant guards", "Assists, usage, shot volume"),
}

STAT_WORDS = {
    "fga_per_100_poss": "shot volume", "x3p_ar": "3PT rate", "f_tr": "free-throw rate", "ts_percent": "true shooting",
    "x3p_percent_shrunk": "3PT%", "x2p_percent_shrunk": "2PT%", "ft_percent_shrunk": "FT%", "usg_percent": "usage",
    "ast_percent": "assists", "tov_percent": "turnovers", "orb_percent": "offensive boards",
    "drb_percent": "defensive boards", "stl_percent": "steals", "blk_percent": "blocks", "pf_per_100_poss": "fouls",
}


def primary_positions(df: pd.DataFrame) -> dict:
    """Each player's most common primary position (first part of pos) over his qualified seasons."""
    pos = df["pos"].astype(str).str.split("-").str[0]
    return pos.groupby(df["player_id"]).agg(lambda s: s.value_counts().index[0]).to_dict()


def season_teams(df: pd.DataFrame) -> pd.Series:
    """Team codes per season joined by '/': the team, or for a 2TM/3TM season the teams he played for."""
    multi = df["team"].astype(str).str.fullmatch(r"\dTM")
    return df["teams"].astype(str).where(multi, df["team"].astype(str))


def per_game(root: Path) -> dict:
    """(player_id, season) -> (pts, reb, ast) per game, NBA only. A traded player's season uses the combined row
    (team TOT or 2TM, 3TM...), otherwise the only row. Rounded to one decimal."""
    pg = pd.read_csv(root / "data" / "raw" / "Player Per Game.csv")
    pg = pg[pg["lg"] == "NBA"]
    combined = pg["team"].astype(str).str.fullmatch(r"TOT|\d+TM")
    multi = pg.duplicated(["player_id", "season"], keep=False)
    pg = pg[~multi | combined]
    if pg.duplicated(["player_id", "season"]).any():
        raise ValueError("per-game data still has more than one row for a player season")
    return {(r.player_id, int(r.season)): (round(float(r.pts_per_game), 1), round(float(r.trb_per_game), 1), round(float(r.ast_per_game), 1))
            for r in pg.itertuples()}


def regions(seasons: pd.DataFrame) -> tuple[np.ndarray, list[dict], list[str]]:
    """K-means (9) on the map coordinates; name each cluster by matching the draft names to its z-scores."""
    km = KMeans(9, random_state=0, n_init=10).fit(seasons[["x", "y"]].values)
    labels = km.labels_
    z = seasons.groupby("season")[STYLE].transform(lambda c: (c - c.mean()) / c.std())
    pos = seasons["pos"].astype(str).str.split("-").str[0]
    stats = []
    for r in range(9):
        mean_z = z[labels == r].mean().sort_values(ascending=False)
        stats.append({"top": list(mean_z.index[:3]), "z": mean_z, "pos": pos[labels == r].value_counts().index[0]})

    def score(name_i: int, r: int) -> float:
        claims = REGION_NAMES[name_i][1]
        if claims is None:
            return 3.0 if stats[r]["z"].abs().max() < 0.5 else 0.0
        top = stats[r]["top"]
        ranks = [min((top.index(s) for s in group if s in top), default=None) for group in claims]
        return sum(3 - k for k in ranks if k is not None) / len(claims) if None not in ranks else 0.0

    match = np.array([[score(n, r) for r in range(9)] for n in range(9)])
    name_idx, cluster_idx = linear_sum_assignment(-match)
    assigned = dict(zip(cluster_idx, name_idx))
    out, checks = [], []
    for r in range(9):
        n = assigned[r]
        name, _, desc = REGION_NAMES[n]
        kept = match[n, r] > 0
        override = REGION_OVERRIDES.get(frozenset(stats[r]["top"])) if not kept else None
        if override:
            name, desc = override
        elif not kept:
            name, desc = f"Region {r + 1}", ", ".join(STAT_WORDS[s] for s in stats[r]["top"])
        cx, cy = km.cluster_centers_[r]
        out.append({"name": name, "desc": desc, "x": round(float(cx), 3), "y": round(float(cy), 3)})
        top3 = ", ".join(f"{s} {stats[r]['z'][s]:+.2f}" for s in stats[r]["top"])
        checks.append(f"Region {r + 1}: {top3}; top position {stats[r]['pos']}; "
                      + (f"name '{name}' kept" if kept else f"draft '{REGION_NAMES[n][0]}' did not match, "
                         + (f"fixed name '{name}'" if override else "neutral name")))
    return labels, out, checks


def main() -> None:
    manifest = json.loads((EXPORTS / "manifest.json").read_text())
    if manifest.get("quick"):
        raise ValueError("exports/ came from a --quick run; run python precompute.py without --quick first")
    players = json.loads((EXPORTS / "players.json").read_text())
    comps = json.loads((EXPORTS / "comps.json").read_text())
    why = json.loads((EXPORTS / "why.json").read_text())
    umap = pd.read_csv(EXPORTS / "seasons_umap.csv")
    prof = np.load(EXPORTS / "profiles.npz")
    df = load(ROOT)
    positions = primary_positions(df)

    seasons = umap.merge(df, on=["player_id", "season"], how="left", validate="1:1")
    if seasons["team"].isna().any():
        raise ValueError(f"{seasons['team'].isna().sum()} map seasons have no row in the season table")
    seasons["teams"] = season_teams(seasons)
    seasons["region"], region_list, region_checks = regions(seasons)
    codes = sorted({c for t in seasons["teams"] for c in t.split("/")})
    missing = [c for c in codes if c not in TEAMS]
    if missing:
        raise ValueError(f"team codes with no name: {missing}")
    games = per_game(ROOT)
    missing = [(p, int(s)) for p, s in seasons[["player_id", "season"]].itertuples(index=False) if (p, int(s)) not in games]
    if missing:
        raise ValueError(f"{len(missing)} app seasons have no per-game row, e.g. {missing[:10]}")
    player_region = seasons.groupby("player_id")["region"].agg(lambda s: int(s.value_counts().index[0])).to_dict()

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "player").mkdir(parents=True)

    index = [{"id": p["player_id"], "name": p["player"], "first": p["first_season"], "last": p["last_season"],
              "seasons": p["n_seasons"], "decade": p["decade"], "pos": positions.get(p["player_id"], ""),
              "spreadPct": p["spread_percentile"], "region": player_region[p["player_id"]]} for p in players]
    (OUT / "players.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))

    points = {pid: [[int(r.season), round(r.x, 3), round(r.y, 3), r.teams, int(r.region)] for r in g.itertuples()]
              for pid, g in seasons.groupby("player_id")}
    for p in players:
        pid = p["player_id"]
        page = {
            "id": pid,
            "region": player_region[pid],
            "comps": [[c["player_id"], c["score"]] for c in comps[pid]],
            "why": {cid: [round(v[f], 4) for f in STYLE] for cid, v in why.get(pid, {}).items()},
            "map": [pt[:3] for pt in points[pid]],
            "seasons": [[pt[0], *games[(pid, pt[0])]] for pt in sorted(points[pid])],
        }
        (OUT / "player" / f"{pid}.json").write_text(json.dumps(page, separators=(",", ":")))

    (OUT / "map.json").write_text(json.dumps(points, separators=(",", ":")))

    # Teams: a traded season counts for every team he played for that season.
    rows = seasons.assign(code=seasons["teams"].str.split("/")).explode("code")
    teams = []
    for code, g in rows.groupby("code"):
        per = g.groupby("player_id")["season"].agg(n="count", lo="min", hi="max").reset_index()
        per = per.sort_values(["n", "lo", "player_id"], ascending=[False, True, True]).head(10)
        teams.append({"code": code, "name": TEAMS[code][0], "short": TEAMS[code][1], "first": int(g["season"].min()),
                      "last": int(g["season"].max()), "seasons": len(g), "players": int(g["player_id"].nunique()),
                      "top": [[r.player_id, int(r.n), int(r.lo), int(r.hi)] for r in per.itertuples()]})
    teams.sort(key=lambda t: (t["name"], t["code"]))
    (OUT / "teams.json").write_text(json.dumps(teams, separators=(",", ":")))
    (OUT / "regions.json").write_text(json.dumps(region_list, separators=(",", ":")))

    known = {p["player_id"] for p in players}
    skipped = [pid for pid in LEGENDS if pid not in known]
    legends = [{"id": pid, "match": comps[pid][0]["player_id"]} for pid in LEGENDS if pid in known]
    (OUT / "legends.json").write_text(json.dumps(legends, separators=(",", ":")))
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
        "attribution": "Statistics from Basketball Reference via the Kaggle dataset sumitrodatta/nba-aba-baa-stats (CC0). "
                       "Points, rebounds and assists per game are shown as published there; comps, breakdowns and "
                       "map are GreenFN's own model outputs.",
    }, indent=2))

    sizes = {p.name: p.stat().st_size for p in OUT.iterdir() if p.is_file()}
    per_player = sum(f.stat().st_size for f in (OUT / "player").iterdir())
    print(f"Wrote {OUT}: {len(players)} player files ({per_player / 1e6:.1f} MB total), "
          + ", ".join(f"{k} {v / 1e6:.2f} MB" for k, v in sorted(sizes.items())))
    print(f"Per game: {len(seasons)} of {len(seasons)} seasons matched (points, rebounds, assists).")
    print(f"Teams: {len(teams)} codes, all named. Legends: {len(legends)} written, skipped {skipped or 'none'}.")
    print("Region check:")
    for line in region_checks:
        print("  " + line)


if __name__ == "__main__":
    main()
