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

**Body features (inputs for body mode only):** height (`ht_in_in`) and weight (`wt`) from `Player Career Info.csv` (100% of 1980+ players found; under 0.1% null). These are listed measurements: one value per player for the whole career, so weight changes over time are not captured. They stay out of the style embedding so style comps describe how a player plays, not his size. Body similarity uses height and weight z-scored within each season, and the UI blends style and body similarity with a slider (default: style only).

**Context (stored, not modelled):** `age`, `pos`, `g`, `mp`, `n_teams`. Minutes (`mp`) is also the sample weight in training and pooling. Position is used only as a label for the cluster check in Phase 2.

**Dropped:**
- Derived or redundant columns: `trb*` (= orb + drb), `fg*` and `fg_percent` (covered by eFG/TS), `e_fg_percent` (overlaps TS), `pts_per_100_poss` (= usage × efficiency), the per-100 rebound/assist/steal/block counts (the % versions adjust for pace and context), and `per` (an opaque blend).
- `gs`: not tracked in 1980–81.
- Draft position: a forecasting signal, not a style one.
- Draft combine (wingspan, reach, vertical, sprint): only covers players who attended, roughly 2000 onward, and many stars skipped it. Listed height and weight cover every player instead. (Decided 2026-10-23. The 2023 nba_api combine file in `data/raw/nba_api/` is no longer used.)

**Deferred:**
- *Pre-1980 seasons (v2):* add 1946-47 to 1978-79 later by masking the stats that weren't recorded yet (blocks and steals before 1973-74, turnovers before the late 1970s, threes before 1979-80) and training with random feature masking. Decided 2026-10-23: get an accurate 1980+ model first.
- *Shot zones and play-by-play* (`Player Shooting.csv`, `Player Play By Play.csv`): these start in 1997, so using them would cut 17 seasons. They become an optional "1997+ extended" feature set.

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
4. **Box-score correlation** (from NBA2Vec): the top PCA dimensions of the embedding correlate significantly with box-score stats (rebounds, assists, threes), Bonferroni-corrected.
5. **Nearest-neighbour sanity:** the sanity-check players below pass their tests.
6. **Don't judge clusters in 2D:** UMAP/t-SNE distances are for display only (NBA2Vec notes t-SNE loses global structure). Comps are always computed in the full embedding space.

## Sanity-check players

Twenty well-known players spread across eras and archetypes. Expected comps are rough guesses for judging results, not ground truth. **Hold out the five marked † and don't look at them while tuning**, or the model just learns to match these expectations.

| # | Player | In data | Archetype | Tests | Expected top comps |
|---|---|---|---|---|---|
| 1 | Kareem Abdul-Jabbar | 1980–89 | Ageing centre | Only the end of a career is in the data | Duncan, Robinson, Hakeem |
| 2 | Magic Johnson | 1980–96 | 6'9" point guard | Size vs role | LeBron, Luka, Kidd |
| 3 | Larry Bird | 1980–92 | Shooting, passing forward | Early 3PT era | Dirk, Pierce, LeBron |
| 4 | Isiah Thomas | 1982–94 | Small scoring point guard | Small guard | Iverson, Kyrie, Tim Hardaway |
| 5 | Charles Barkley | 1985–2000 | 6'6" rebounding forward | Style vs body disagree | Style: Zion, Giannis. Body: wings |
| 6 | Michael Jordan | 1985–2003 | Scoring wing | Known pair with Kobe | Kobe, Wade, McGrady |
| 7 | Hakeem Olajuwon † | 1985–2002 | Two-way centre | Steals and blocks together | Robinson, Embiid, Ewing |
| 8 | John Stockton | 1985–2003 | Pure point guard | Low spread | Chris Paul, Nash, Kidd |
| 9 | Dennis Rodman | 1987–2000 | Rebounder, rarely scores | Outlier | Ben Wallace, Drummond |
| 10 | Shaquille O'Neal | 1993–2011 | Post centre, poor FT | Known pair (also in NBA2Vec) | Dwight Howard, Moses Malone |
| 11 | Allen Iverson † | 1997–2010 | Small high-usage scorer | Small size, big role | Westbrook, Kyrie, Isiah Thomas |
| 12 | Steve Nash | 1997–2014 | Shooting point guard | Known pair (NBA2Vec) | Chris Paul, Stockton |
| 13 | Kobe Bryant | 1997–2016 | Scoring wing | Known pair with Jordan | Jordan, Wade, DeRozan |
| 14 | Dirk Nowitzki † | 1999–2019 | Stretch big | Big who shoots | Towns, Bird, Durant |
| 15 | LeBron James | 2004–2026 | Do-everything forward | Long career, changing role | Magic, Bird |
| 16 | Derrick Rose † | 2009–2024 | Peak then injuries | Peak vs centre gap | Westbrook, Iverson |
| 17 | Stephen Curry | 2010–2026 | Volume 3PT shooter | No true past match | Lillard, Nash, Ray Allen |
| 18 | Draymond Green | 2013–2026 | Low-scoring hub defender | Value without points | Rodman-lite, Ben Simmons |
| 19 | Giannis Antetokounmpo † | 2014–2026 | Athletic non-shooter | Outlier | Shaq-lite, Zion |
| 20 | Nikola Jokić | 2016–2026 | Passing centre | Unicorn | Sabonis, Marc Gasol |

Years are season end years, matching `season`.

| Test | Players | Pass if |
|---|---|---|
| Known pairs | Jordan–Kobe, Shaq–Howard, Nash–Paul | Each is in the other's top 5 |
| Era translation | Curry, Magic, Bird | Comps come from more than one decade |
| Outliers and unicorns | Rodman, Jokić, Giannis, Curry | Top similarity is lower than for typical players |
| Career shape | Stockton, Rose, LeBron, Kareem | Stockton has low spread; Rose has a large peak-vs-centre gap |
| Style vs body | Magic, Barkley, Isiah, Iverson | Style mode matches by role; body mode matches by size |
