# Phase 4 run log

Status: finished

Run started 17 Nov 2026, 23:20 (local time); last checkpoint commit about 23:32, so roughly 12 minutes of wall time in total. The search itself took 93 seconds.

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|
| 0 Plan, runbook, run log | 044b342 | n/a | Runbook, plan and both code files read in full before running anything |
| 1 Smoke run | 62488c1 | 10 s | Control (lambda 0, seed 2026): era probe 0.328, non-adjacent 0.743, next RMSE 0.622. Centred alpha 0.5: era 0.231, non-adjacent 0.738. Centred era clearly below control |
| 2 Search pipeline test | b96842b | a few s | `search --quick` printed the 3-epoch adversary line, `Quick centring check: era 0.222` and `Quick run OK (not saved).`; no `phase4_search.csv` created |
| 3 Search | 0931cae | 93 s | 24 rows, 24 unique. Control rows match the Phase 3 search rows for `d32_t0.05_pre_s2026/2027/2028` exactly (non-adjacent and next-season RMSE equal to 6 decimals, same epochs 78, 86, 67) |
| 4 Report | d9bb1ae | 163 s | B2 column matches Phase 2 (era 0.190, non-adjacent 0.668, RMSE 0.608, persistence 0.610). 5 PASS and 1 PENDING gate lines. `score_sanity.py --report` raised for the same 5 names as the JSON and left the report unchanged |
| 5 Notebook | 3682aa0 | about 3 min | `notebooks/04_era.ipynb`, 0 error outputs, probe numbers asserted equal to the report, nothing changed under `reports/` |
| 6 Wrap up | (this commit) | n/a | Draft PR opened, not merged |

## Issues and fixes
- No crashes, no data-check failures, no change to any "never touch" file, no fix to any code file.
- Nothing deviated from `notes/phase4_plan.md`, so its change log was left alone.
- The search ran in the background and the log was only read once it finished, because it took under 2 minutes.

## Key numbers
- Chosen candidate: season centring, alpha 0.5 (met the era target with the best retrieval). No adversary setting reached 0.25.
- Era probe (chosen / control / B2): 0.227 / 0.323 / 0.190 (train + val, linear). Validation only, linear: 0.231 / 0.281 / 0.176.
- Non-adjacent hit@10 (chosen / control): 0.745 / 0.746 (B2 0.668).
- Nonlinear era probe, val only (chosen / control / B2): 0.319 / 0.324 / 0.430.
- Control vs Phase 3 reproduction: exact on all three seeds (mean non-adjacent 0.746).
- Gate lines: PASS era probe at or below 0.25; PASS non-adjacent hit@10 at or above 0.734; PASS position probe (0.657); PASS stability (all seeds); PASS control reproduces Phase 3; PENDING sanity comps.
- Other findings: best adversary mean era probe 0.292 (lambda 1.0, non-adjacent 0.728); lambda 3.0 reads 0.317. Cross-era share of top-10 comps 0.723 chosen vs 0.725 control vs 0.744 B2. Era translation test: Curry 3 decades (control 4), Magic 5 (5), Bird 3 (4). Jordan/Kobe known pair drops from pass (control) to partial (chosen).
- Unmarked comp names: 5 (Magic Johnson: Tyrese Haliburton; Dennis Rodman: Tyson Chandler; Shaquille O'Neal: Stanley Roberts; Kobe Bryant: Bernard King; Nikola Jokic: Karl Malone).
