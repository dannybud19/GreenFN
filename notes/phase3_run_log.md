# Phase 3 run log

Status: finished

Run started 17 Nov 2026, 21:02 (local time); last checkpoint commit about 21:10, so roughly 8 minutes of wall time in total. The runbook's 30 to 120 minute estimate per search chunk was far too high: each chunk took under 2 minutes.

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|
| 0 Runbook and run log | 4ed9383 | n/a | Runbook, plan and both new modules read in full before running anything |
| 1 Smoke run | e891d1e | 7 s | Stage A val MSE 0.585 vs predict-0 1.022; Stage B 53 epochs, best non-adj 0.718; val hit@10 0.819, non-adj 0.718, next RMSE 0.625 (persistence 0.610). Slightly below the runbook hints (about 0.84, 0.73), within tolerance |
| 2 Search pipeline test | 52c06dd | a few s | `search --quick` printed `Quick run OK (not saved).`; no `phase3_search.csv` created |
| 3 Search, size 8 | b2a6533 | 82 s | 18 rows, 18 unique. Best single run non-adj 0.664, below B2's 0.668 |
| 4 Search, size 16 | eb0da33 | about 1.5 min (not timed) | 36 rows, 36 unique |
| 5 Search, size 32 | a28719c | 84 s | 54 rows, 54 unique |
| 6 Report | 1adab68 | 4 s | B2 row matches Phase 2 exactly (0.778, 0.668, 0.608, persistence 0.610). 5 PASS/FAIL gate lines and 1 PENDING |
| 7 score_sanity.py | 93fa4cc | n/a | `--report` argument and looser row match. No-argument run leaves `reports/phase2_baselines.md` byte-identical. Run on the Phase 3 report fails with 27 unmarked names, identical to `reports/phase3_unmarked_comps.json`; report not modified |
| 8 Notebook | 74f1294 | about 1 min | `notebooks/03_encoder.ipynb`, 0 error outputs, numbers asserted equal to the report, nothing changed under `reports/` |
| 9 Wrap up | (this commit) | n/a | Draft PR opened, not merged |

## Issues and fixes
- No crashes, no data-check failures, no change to the protected files (`reports/phase2_baselines.md`, `config/sanity_marks.json`, `notes/phase3_plan.md` sections 1 to 7).
- No fix to `encoder.py`, `encoder_data.py` or `evaluate_encoder.py` was needed, so the plan's change log was left alone.
- `score_sanity.py` needed the two changes from checkpoint 7 only.
- Stage A check: `notes/phase3_plan.md` section 3 says validation loss must beat predicting 0 "for every masked feature". `encoder.py` checks the pooled masked MSE (0.585 vs 1.022 in the smoke run; 0.581 to 0.593 vs 1.022 across the search), not each feature separately. Not changed here (the runbook forbids changing the judging); flagged for Danny to decide whether a per-feature check is wanted.
- The progress output of a background `search` is buffered (nothing prints until the process ends); it did not matter because each chunk was short.

## Key numbers
- Chosen setting: embedding size 32, temperature 0.05, pretraining yes (mean validation non-adjacent hit@10 0.746 over seeds 2026 to 2028).
- Encoder vs B2 (non-adjacent hit@10, next-season RMSE): 0.746 vs 0.668; 0.620 vs 0.608 (persistence 0.610, so +1.7% worse than persistence). Hit@10 0.857 vs 0.778.
- Gate lines: PASS beats B2 on non-adjacent hit@10; FAIL beats B2 on next-season RMSE; FAIL beats persistence on next-season RMSE; PASS stability (ratio 0.165 vs B2 0.243); PASS position probe (0.656 > 0.40); PENDING sanity comps.
- Also seen: era probe 0.323 for the encoder vs 0.190 for B2 (chance 0.20); none of the 54 runs got next-season RMSE below 0.608 (best 0.617); 36 of 54 runs beat B2 on non-adjacent hit@10.
- Unmarked comp names: 27 (Kareem 3, Bird 2, Isiah 3, Barkley 3, Jordan 2, Stockton 2, Rodman 2, Nash 2, Kobe 1, LeBron 1, Curry 2, Draymond 3, Jokic 1).
