# Phase 0 feature note

Settles the data scope, feature set and checks for Phases 1–2. Numbers come from the Kaggle download of 2026-10-22; `raw_data_inventory.md` has the full column profile.

## Scope

- **Seasons 1980–2026, NBA only.** `season` is the year a season ends, so this covers 1979-80 (the first season with the 3-point line) through 2025-26. It is the first span where every per-100 and advanced column is filled in. This also drops ABA and BAA.
- **Unit = one row per player-season.** For traded players, keep the `2TM`/`3TM`/… aggregate row (always listed first) and drop the per-team rows. Keep `n_teams` and the team list as context.
- **Size:** 20,550 player-seasons and 3,819 players. Per-100 and advanced join 1:1 on `(season, player_id, team)`: 25,349 / 25,349 rows match.
- **Qualified = minutes ≥ 500, scaled to schedule length** (`500 × games / 82`; games = 50 in 1999, 66 in 2012, 72 in 2020 and 2021, 82 otherwise). That gives 14,749 player-seasons, 2,472 players and about 314 per season (range 228–379). Rows under the threshold stay in `data/processed` with `qualified = False`; they're kept for display but never fed to a model.

## Features

**Style features (model inputs).** Season-standardized: z-scored within each season, weighted by minutes, so a 1985 big man and a 2025 big man are compared against their own league rather than across eras. Raw values are stored next to them.

| Group | Columns |
|---|---|
| Shot volume and mix | `fga_per_100_poss`, `x3p_ar`, `f_tr` |
| Shooting efficiency | `ts_percent`, `x3p_percent`\*, `x2p_percent`\*, `ft_percent`\* |
| Creation and ball security | `usg_percent`, `ast_percent`, `tov_percent` |
| Rebounding | `orb_percent`, `drb_percent` |
| Defense events | `stl_percent`, `blk_percent`, `pf_per_100_poss` |

\* Shrink toward the league average for that season, using attempt totals from `Player Totals.csv`. Starting prior weights are 100 attempts for 3P%, 50 for FT% and 100 for 2P%; tune them in Phase 1. Shrinkage also fills the 15.5% of rows where 3P% is empty because the player took no threes.

**Impact features (labels and evaluation, not inputs):** `bpm`, `obpm`, `dbpm`, `ws_48`, `vorp`, `o_rtg`, `d_rtg`. Keeping them out of the inputs means archetypes describe *how* a player plays rather than *how good* he is. They're used to colour plots, and the models are checked against them.

**Context (stored, not modelled):** `age`, `pos`, `g`, `mp`, `n_teams`, plus height and weight from `Player Career Info.csv` (100% of 1980+ players found; under 0.1% null).

**Dropped:**
- Derived or redundant columns: `trb*` (= orb + drb), `fg*` and `fg_percent` (covered by eFG/TS), `e_fg_percent` (overlaps TS), `pts_per_100_poss` (= usage × efficiency), the per-100 rebound/assist/steal/block counts (the % versions adjust for pace and context), and `per` (an opaque blend).
- `gs`: not tracked in 1980–81.

**Deferred:**
- *Shot zones and play-by-play* (`Player Shooting.csv`, `Player Play By Play.csv`): these start in 1997, so using them would cut 17 seasons. They become an optional "1997+ extended" feature set.
- *Draft combine (Phase 2):* nba_api has no Basketball-Reference ID, so join on normalized name (ASCII, lowercase, no punctuation or Jr./II) plus draft year. nba_api's `season_year="2023-24"` is the **2023** combine: 56 of 58 picks from the 2023 draft match by name, against only 7 of 58 from 2024.

## Phase 1 checks (assert in the pipeline)

1. `season` is in 1980–2026 and `lg == "NBA"`.
2. `(season, player_id)` is unique after the multi-team collapse.
3. Per-100 and advanced join on 100% of rows, and every `player_id` is in `Player Career Info.csv`.
4. Each `xTM` row's `g` and `mp` equal the sum of that player's per-team rows.
5. No nulls in style or impact columns for qualified rows (after shrinkage). Known exceptions in unqualified rows: 5 rows with 0 minutes, and empty `o_rtg`/`tov_percent`/`ts_percent` for players under 25 minutes.
6. Ranges for qualified rows: `ts_percent` in [0.30, 0.85], `usg_percent` in [3, 45], `bpm` in [−15, 20]. Unfiltered rows reach `usg` = 100 and `bpm` = 242, which is why the minutes cutoff matters.
7. Consistency: `orb + drb ≈ trb` and `x2pa + x3pa ≈ fga` per 100 possessions, within 0.2.
8. Qualified count per season is in [200, 400], and the totals match this snapshot (20,550 player-seasons and 14,749 qualified). A change means the Kaggle data was updated, for example when the 2027 season is added.

## Phase 2 checks (models)

1. **Era leak:** a classifier predicting decade from the embedding should score close to chance. If it doesn't, the season standardization isn't working.
2. **Sanity:** position can be predicted from the embedding well above chance.
3. **Stability:** the same player's consecutive seasons sit closer together than random pairs of players.
4. **Combine join:** at least 90% of each draft class matches a combine row by name. Unmatched names go into a manual fix-up file.
