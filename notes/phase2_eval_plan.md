# Phase 2 evaluation plan

Written before any baseline or model is scored. Every model in Phases 2 to 8 is judged by these rules. If a rule changes later, the change is recorded at the bottom with the reason, and earlier results are re-run under the new rule.

## 1. Data used

- Input: `data/processed/player_seasons.parquet` (built by `src/build_dataset.py`).
- Representation for baselines: the 15 style z-scores (`z_fga_per_100_poss`, `z_x3p_ar`, `z_f_tr`, `z_ts_percent`, `z_x3p_percent_shrunk`, `z_x2p_percent_shrunk`, `z_ft_percent_shrunk`, `z_usg_percent`, `z_ast_percent`, `z_tov_percent`, `z_orb_percent`, `z_drb_percent`, `z_stl_percent`, `z_blk_percent`, `z_pf_per_100_poss`).
- Only **qualified** player-seasons are used as queries, candidates or training rows. Unqualified rows exist for display only.
- Body features (`z_ht_in_in`, `z_wt`) and impact columns are not inputs. Impact columns are labels for checks only.

## 2. Split

| Set | Share of players | Use |
|---|---|---|
| Train | 70% | Fit models (Phase 3 on); tune baseline weights and shrinkage priors |
| Validation | 15% | Compare baselines and choose settings |
| Test | 15% | Final numbers, reported once at the end of v1 |
| Hold-outs (5) | Forced into test | Sanity only, never looked at during tuning |

Rules:

- **Split by player, never by season.** All of a player's seasons sit in the same set.
- **Balanced by debut decade.** Debut = the player's first season in the parquet (so players who started before 1980 count as 1980s). Within each decade, players are shuffled and cut 70/15/15.
- **Seed: 2026.** Implemented in `src/splits.py`, saved to `data/processed/splits.parquet`. The file is regenerated only if the parquet changes.
- Hold-outs are read from `config/holdout.json` and placed in test before the shuffle.

## 3. Metrics

All retrieval runs **within one split at a time** (validation queries only search validation seasons). Queries and candidates are qualified seasons only. A query never matches itself.

### 3.1 Same-player retrieval

- Queries: every qualified season of a player with 2 or more qualified seasons in that split.
- Rank all other qualified seasons in the split by the model's similarity.
- **Hit@10:** 1 if any other season of the same player is in the top 10, else 0. Report the mean.
- **MRR:** 1 / rank of the first season of the same player. Report the mean.
- Reference: B0 (random ranking).

### 3.2 Non-adjacent retrieval

- Same as 3.1, but the query player's seasons within 1 year of the query (season t-1 and t+1) are removed from the candidates.
- Queries: only seasons where the player still has at least one other qualified season outside that window.
- This is the harder test: it checks identity, not "last year looks like this year".

### 3.3 Next-season error

- Queries: qualified season t of a player who also has a qualified season t+1.
- Neighbours: top 10 most similar qualified seasons from **other players** in the same split, aged within 1 year of the query, who also have a qualified season the year after.
- Prediction: query(t) + similarity-weighted average of each neighbour's change (neighbour(t+1) minus neighbour(t)) across the 15 style z-scores. Weights = similarity scores shifted to be non-negative; if all weights are 0, use a plain average.
- Error: RMSE between prediction and the real t+1, averaged over the 15 z-scores, then over queries.
- Reference: **persistence** (predict t+1 = t). A model that can't beat persistence isn't getting value from its comps.

### 3.4 Era leakage

- Label: decade of the season (1980s, 1990s, 2000s, 2010s, 2020s; season 1980 = 1979-80 counts as 1980s; 2020s covers 2020 to 2026).
- Probe: multinomial logistic regression (scikit-learn, default regularisation, standardised inputs) predicting decade from the representation.
- 5-fold cross-validation **grouped by player** (`GroupKFold`), on train + validation qualified seasons.
- Report **balanced accuracy**. Chance = 20%.
- Lower is better for a similarity model. Phase 2 measures the raw z-scores as the starting point; Phase 4 aims to bring this close to 20%.

## 4. NBA2Vec checks

| Check | How | Pass if |
|---|---|---|
| Position probe | Logistic regression predicting primary position (first part of `pos`, so `PG-SG` becomes `PG`), 5-fold grouped by player, balanced accuracy | Well above chance (20%) |
| Box-score correlation | Pearson correlation of the top 2 PCA components of the representation with the raw (unstandardised) rebound rate (`orb_percent + drb_percent`), `ast_percent` and `x3p_ar` | p < 0.05 after Bonferroni correction (6 tests) |

The box-score check is close to automatic for the Phase 2 baselines, because they are built from these same stats. It becomes a real test from Phase 3, when the representation is a learned embedding. It's computed in Phase 2 so the harness is ready.

## 5. Sanity report

- The 15 non-held-out players from the feature note's sanity list.
- For each: the player's top 10 comps (player-level: each comp player counted once, best-matching season shown), using the season or seasons named in the feature note.
- Judge each against its pass test in the feature note: **pass**, **partial** or **fail**, with a one-line reason.
- Hold-outs are not included until final evaluation.

## 6. Baselines scored in Phase 2

B0 random, B1 Euclidean, B2 cosine, B3 CARMELO-style, B3w (B3 on a 3-season 3/2/1 window), B4 PCA. Definitions and CARMELO weights: see the Phase 2 plan.

## 7. What gets reported

`reports/phase2_baselines.md`, on the **validation** split:

| Model | Hit@10 | MRR | Non-adjacent Hit@10 | Next-season RMSE | vs persistence | Era balanced acc. | Position balanced acc. |
|---|---|---|---|---|---|---|---|

Plus the box-score correlation table and the sanity report.

## 8. Rules

- Validation is for choosing settings. **Test is used once**, at the end of v1, for the final numbers.
- Hold-outs are never printed, plotted or inspected during tuning.
- Shrinkage priors and baseline weights are tuned on **train** only.
- Gate: every baseline beats B0 on retrieval and at least one beats persistence on next-season error. If none beats persistence, record it as a finding; don't change the metric.

## Change log

| Date | Change | Reason |
|---|---|---|
| 17 Nov 2026 | Sanity verdicts scored from human marks: fair = 1, partial = 0.5, wrong = 0, summed over the top 5; pass >= 2, partial > 0, fail = 0. Marks in config/sanity_marks.json, applied by src/score_sanity.py (re-run after evaluate.py). | Section 5 said pass/partial/fail without a rule. Comps are judged by opinion and external consensus, never by the stats, to avoid circularity. |
