# GreenFN

GreenFN is an NBA player-modelling project. It builds per-season player representations from Basketball-Reference box score data (the Kaggle `sumitrodatta/nba-aba-baa-stats` dataset), with listed height and weight for an optional body-similarity mode, learns embeddings and archetypes with scikit-learn, PyTorch and UMAP, and serves them through an API and a web front end. **Status:** Phase 0 is complete: the repo, environment and raw data are in place, and `notes/phase0_feature_note.md` sets the scope (NBA, 1980–2026), features and checks. Phase 1 (data) is complete: `src/build_dataset.py` builds and tests the player-season table, and `notes/data_card.md` describes it. Phase 2 (baseline) is next.

## Setup

```bash
uv sync                                  # Python 3.12 + pinned deps from uv.lock
uv run kaggle auth login                 # one-time Kaggle login (or set KAGGLE_API_TOKEN)
uv run python src/download_data.py       # -> data/raw/*.csv
uv run python src/inspect_raw.py         # -> notes/raw_data_inventory.md
uv run python src/build_dataset.py       # -> data/processed/player_seasons.parquet
```

## Layout

`data/raw`, `data/processed` (git-ignored) · `src/` pipeline code · `notebooks/` exploration · `notes/` decisions and data notes · `models/` (git-ignored) · `api/` · `web/`

## Run the app

The app (`web/`) is a Next.js site that reads precomputed files, so it needs no Python server. Regenerate its data, then start it:

```bash
source .venv/bin/activate
python src/precompute.py                 # -> exports/ (git-ignored), about a minute
python src/export_web.py                 # -> web/public/data/ (committed)
cd web && npm install && npm run dev     # http://localhost:3000
```

Other checks: `npm test` (Vitest, including the parity test against the Python top 10), `npm run build` (static build, one page per player) and `npm start` to serve that build.

**Deploy on Vercel:** import the GitHub repo and set the root directory to `web`. Confirm first that the Kaggle dataset's licence allows publishing derived outputs (comps, scores, breakdowns and map points; no raw stat tables are published).

