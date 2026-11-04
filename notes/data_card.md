# Data card: player_seasons.parquet

`data/processed/player_seasons.parquet` has one row per NBA player-season, 1980–2026 (`season` is the year a season ends, so 1980 means 1979-80). Built by `uv run python src/build_dataset.py` from the Kaggle download of 2026-10-22; the build asserts the 8 Phase 1 checks in `phase0_feature_note.md` before writing. Rebuild it after any re-download: the row counts below are asserted and will fail on new data.

## Counts

| | Rows | Players |
|---|---:|---:|
| All player-seasons | 20,550 | 3,819 |
| Qualified | 14,749 | 2,472 |

Qualified players per season run from 228 (1980) to 379 (2026), median 322. The count grows with league expansion and with roster sizes.

| Decade | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1980s | 228 | 241 | 248 | 251 | 239 | 248 | 247 | 248 | 248 | 263 |
| 1990s | 282 | 286 | 287 | 290 | 286 | 303 | 322 | 312 | 311 | 315 |
| 2000s | 312 | 318 | 317 | 313 | 325 | 336 | 323 | 328 | 324 | 329 |
| 2010s | 331 | 338 | 352 | 344 | 337 | 366 | 350 | 355 | 353 | 361 |
| 2020s | 355 | 371 | 375 | 367 | 360 | 375 | 379 | | | |

## Features

**Style features (model inputs).** Every one is complete for qualified rows from 1980 on. "First season" is the first NBA season the stat appears in the raw data, which matters for the pre-1980 v2.

| Group | Raw column | z column | Source | First season |
|---|---|---|---|---:|
| Shot volume and mix | `fga_per_100_poss` | `z_fga_per_100_poss` | Per 100 Poss | 1974 |
| | `x3p_ar` | `z_x3p_ar` | Advanced | 1980 |
| | `f_tr` | `z_f_tr` | Advanced | 1950 |
| Shooting efficiency | `ts_percent` | `z_ts_percent` | Advanced | 1950 |
| | `x3p_percent_shrunk` | `z_x3p_percent_shrunk` | Player Totals | 1980 |
| | `x2p_percent_shrunk` | `z_x2p_percent_shrunk` | Player Totals | 1980 |
| | `ft_percent_shrunk` | `z_ft_percent_shrunk` | Player Totals | 1950 |
| Creation and ball security | `usg_percent` | `z_usg_percent` | Advanced | 1978 |
| | `ast_percent` | `z_ast_percent` | Advanced | 1965 |
| | `tov_percent` | `z_tov_percent` | Advanced | 1978 |
| Rebounding | `orb_percent` | `z_orb_percent` | Advanced | 1974 |
| | `drb_percent` | `z_drb_percent` | Advanced | 1974 |
| Defense events | `stl_percent` | `z_stl_percent` | Advanced | 1974 |
| | `blk_percent` | `z_blk_percent` | Advanced | 1974 |
| | `pf_per_100_poss` | `z_pf_per_100_poss` | Per 100 Poss | 1974 |

**Body features (body mode only):** `ht_in_in` and `wt` from Player Career Info, with `z_ht_in_in` and `z_wt`.

**Impact (labels and evaluation, not inputs):** `bpm`, `obpm`, `dbpm`, `ws_48`, `vorp`, `o_rtg`, `d_rtg`.

**Context:** `season`, `player`, `player_id`, `team` (the `xTM` label for traded players), `n_teams`, `teams`, `age`, `pos`, `g`, `mp`, `qualified`.

**Kept for reference:** the unshrunk `x3p_percent`, `x2p_percent` and `ft_percent`, and the season totals used for shrinkage: `x3p`, `x3pa`, `x2p`, `x2pa`, `ft`, `fta`.

## Known quirks

- **Shortened seasons.** Qualified means `mp >= 500 × games / 82`. That's 305 minutes in 1999 (50 games), 402 in 2012 (66), and 439 in 2020 and 2021 (72).
- **Traded players.** Each player-season keeps the `xTM` aggregate row. `n_teams` and `teams` (e.g. `IND/PHI`) come from the per-team rows, which are then dropped. 2,318 player-seasons are multi-team, and 1,506 of those are qualified. By team count: 2 teams 2,163, 3 teams 148, 4 teams 6, 5 teams 1. Three or more teams usually means a mix of trades, waivers and short contracts, not only trades.
- **Shrinkage priors.** `shrunk = (made + k × league%) / (attempts + k)`, with k = 100 for 3P%, 100 for 2P% and 50 for FT%. These are the starting values from the feature note, still to be tuned. League% is the season's total makes over total attempts, not an average of player percentages. Players with 0 attempts get the league average, which is how the 2,858 empty 3P% rows are filled (0.280 in 1980, 0.360 in 2026).
- **z-scores.** Minutes-weighted within each season. Each season's average and spread come from qualified rows only, then every row is scored against them. Unqualified rows can have extreme z values and shouldn't be compared with qualified ones.
- **Remaining nulls are all in unqualified rows.**
  - Three player-seasons have 0 minutes and every stat empty: Alex Scales 2006, JamesOn Curry 2010 and Damion James 2013.
  - Some percentages are empty because their attempts are 0: `x3p_ar`/`f_tr` (72), `ts_percent` (64), `tov_percent` (54) and `o_rtg` (40).
  - Hayden Gray (2026, 25 minutes) has no `pos`, height or weight.
- **Height and weight** are listed career values, one per player, so weight changes across a career aren't captured.
- **`gs` is not stored.** It was only recorded for some teams in 1980–81.

## Sanity players

Z-scores for qualified seasons, checked against what's expected for each player. None of the five hold-out players (†) in the feature note were looked at.

| Player | Feature | What the data shows | Result |
|---|---|---|---|
| Dennis Rodman | `z_orb_percent` | 2.5 to 3.9 every season from 1987 to 1998 | Pass: extreme |
| John Stockton | `z_ast_percent` | 3.0 to 4.1 every season from 1987 to 2003 (2.2 and 2.8 in his first two years) | Pass: stays high |
| Shaquille O'Neal | `z_ft_percent_shrunk` | −1.9 to −3.8 in all 19 seasons | Pass |
| Nikola Jokić | `z_ast_percent` | Climbs from 0.3 (2016) to 3.8 (2026) | Pass |
| Stephen Curry | `x3p_ar` / `z_x3p_ar` | Raw rate climbs from 0.33 (2010) to 0.62 (2025). z climbs from 0.6 to 1.4 by 2016, then holds around 1.0 | Pass, see below |

Curry's raw three-point rate keeps climbing, but his z-score levels off after 2016 because the whole league started shooting more threes. Season standardization is meant to show exactly this: by the 2020s his shot mix is still well above average, but less of an outlier than it was in 2016.
