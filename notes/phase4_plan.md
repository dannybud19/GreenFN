# Phase 4 plan: era removal

Written before the Phase 4 search. Everything in `notes/phase2_eval_plan.md` and `notes/phase3_plan.md` still applies; this file adds the Phase 4 rules. If a rule changes, record it in the change log with the reason.

## 1. The problem

The Phase 3 encoder (embedding 32, temperature 0.05, pretraining) recognises players well (validation non-adjacent hit@10 0.746) but its embedding gives away the decade: the Phase 2 era probe reads 0.323 against chance 0.20, while B2's raw z-scores read 0.190. Phase 4 removes that era signal so comps can cross eras, without losing the Phase 3 retrieval.

## 2. Exploratory runs (17 Nov 2026, validation, seed 2026, before this plan)

The roadmap's method is a gradient reversal adversary (Ganin and Lempitsky). Single-seed trial runs showed it doesn't remove the signal: the encoder beats the era head it trains against (head accuracy stays near chance), but a fresh probe still finds the decade, and pushing harder costs retrieval first.

| Trial | Era probe | Non-adjacent hit@10 |
|---|---|---|
| No adversary (control) | 0.324 | 0.737 |
| Adversary, lambda 1, hidden-layer head | 0.304 | 0.724 |
| Adversary, lambda 3, hidden-layer head | 0.326 | 0.711 |
| Adversary, lambda 1, linear head, 10x head learning rate | 0.306 | 0.735 |
| Adversary, lambda 3, linear head, 10x head learning rate | 0.332 | 0.719 |
| Adversary, lambda 10, linear head, 10x head learning rate | 0.292 | 0.622 |
| Season centring, alpha 0.5 (no retraining) | 0.238 | 0.735 |
| Season centring, alpha 0.75 | 0.196 | 0.727 |
| Season centring, alpha 1.0 | 0.172 | 0.723 |

This matches a known weakness of adversarial removal: it hides information from one moving opponent rather than removing it. So Phase 4 tests two methods side by side, with settings fixed below before the real search. The adversary stays in, with its default head (one hidden layer, normal learning rate), so the roadmap's method is measured properly over 3 seeds.

## 3. Methods

| Method | How | Strength knob |
|---|---|---|
| Adversary | Retrain Phase 3's setting with an era head (embedding -> 64 -> 5 decades) behind a gradient reversal layer. The head learns to predict the decade; the reversed gradient trains the encoder to make it fail. Lambda ramps from 0 to its maximum over training (Ganin's schedule) | lambda |
| Season centring | Take the lambda = 0 model. Compute each season's average unit-length embedding over **training** players. For every season, subtract alpha x its season's average, then renormalise. No retraining | alpha |

Lambda = 0 is the Phase 3 model retrained with the same code and seeds: it's the **control**, and the base for centring. It must reproduce Phase 3.

Decade labels match the Phase 2 era probe: `min(season // 10 * 10, 2020)`, so 2020 to 2026 are the 2020s.

## 4. Search space (fixed)

| Setting | Values |
|---|---|
| Adversary lambda | 0 (control), 0.3, 1.0, 3.0 |
| Centring alpha | 0.25, 0.5, 0.75, 1.0 (applied to each seed's lambda = 0 model) |
| Seeds | 2026, 2027, 2028 |
| Everything else | Phase 3's chosen setting and training rules, unchanged |

12 training runs plus 12 centring evaluations, all in `reports/phase4_search.csv`.

**Selection rule.** Candidates are every adversary lambda > 0 and every centring alpha. Among candidates whose mean era probe (Phase 2 metric) is at or below 0.25, pick the highest mean validation non-adjacent hit@10. If none reaches 0.25, pick the lowest mean era probe and record it as a finding.

## 5. Metrics

All Phase 2 and Phase 3 metrics on validation, plus:

| Measure | How | Why |
|---|---|---|
| Era probe, validation only (linear) | The Phase 2 probe, fitted and scored on validation players only | The adversary trains on training players; this checks the effect holds on players it never saw |
| Era probe, validation only (nonlinear) | Gradient-boosted trees (`HistGradientBoostingClassifier`), 5-fold grouped by player | A linear probe at chance doesn't mean the era is gone; this shows what's left. Reported, not gated. Note: trial runs suggest even B2's raw z-scores score well above chance here |
| Cross-era share | Average share of a season's top-10 neighbours (other validation players) from a different decade | Direct measure of comps crossing eras |
| Era translation test | Number of decades among the top 10 comps for Curry, Magic and Bird (feature note) | The feature note's own test: comps should come from more than one decade |

Results are mean and spread over 3 seeds. Sanity comps and known pairs use the seed 2026 models.

## 6. Bar

| Metric | Control target | Source |
|---|---|---|
| Era probe (Phase 2 metric) | 0.323 to beat; 0.25 to pass | Phase 3 report |
| Non-adjacent hit@10 | 0.746 | Phase 3 report |
| B2 for reference | era 0.190, non-adjacent 0.668, next-season RMSE 0.608 | Phase 2 report |

## 7. Gate

- This plan is committed before the Phase 4 search.
- The chosen candidate's mean era probe (Phase 2 metric) is at or below 0.25.
- Its mean non-adjacent hit@10 is at or above the control mean minus 0.012 (about two seed spreads).
- The position probe stays well above chance (> 0.40).
- The stability check passes for all 3 seeds.
- The control reproduces Phase 3: mean non-adjacent hit@10 within 0.005 of 0.746.
- New sanity comps are marked and scored; reported next to the control and B2 (reported, not required to beat). As in Phase 3, Danny has delegated marking to Claude: researched consensus, playing style where no comparison exists, never the stats.
- Results go in `reports/phase4_era.md`. Earlier reports are never overwritten. Weights go in `models/phase4/` (git-ignored).
- If a line fails, record it as a finding. Don't change the metric.

## Change log

| Date | Change | Reason |
|---|---|---|
| | | |
