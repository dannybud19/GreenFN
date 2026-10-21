# GreenFN

GreenFN is an NBA player-modelling project. It builds per-season player representations from Basketball-Reference box score data (the Kaggle `sumitrodatta/nba-aba-baa-stats` dataset), adds draft combine data from `nba_api`, learns embeddings and archetypes with scikit-learn, PyTorch and UMAP, and serves them through an API and a web front end. **Status:** Phase 0 is complete: the repo, environment and raw data are in place, and `notes/phase0_feature_note.md` sets the scope (NBA, 1980–2026), features and checks. Phase 1 (feature pipeline) is next.

## Setup

```bash
uv sync                                  # Python 3.12 + pinned deps from uv.lock
uv run kaggle auth login                 # one-time Kaggle login (or set KAGGLE_API_TOKEN)
uv run python src/download_data.py       # -> data/raw/*.csv
uv run python src/inspect_raw.py         # -> notes/raw_data_inventory.md
uv run python src/nba_api_smoke.py       # test call to stats.nba.com
```

## Layout

`data/raw`, `data/processed` (git-ignored) · `src/` pipeline code · `notebooks/` exploration · `notes/` decisions and data notes · `models/` (git-ignored) · `api/` · `web/`
