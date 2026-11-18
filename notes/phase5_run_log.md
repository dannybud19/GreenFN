# Phase 5 run log

Status: finished

Run started 18 Nov 2026, 01:08 (local time); last checkpoint commit at about 01:10, so roughly 2 to 3 minutes of wall time by the clock. The search took 26 seconds and the report 2 seconds.

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|
| 0 Plan, runbook, run log | 4d90281 | n/a | Runbook, plan and both code files read in full before running anything. The three Phase 4 weight files exist |
| 1 Code | e19f4a7 | a few s | `import career, evaluate_career` printed `imports OK` |
| 2 Search | ecac783 | 26 s | 66 rows (22 methods x 3 seeds, 22 per seed). Each seed: 300 validation players, 462 halves. Seed 2026: career score at lambda 0 0.974 to 0.976 split-half hit@10, best season 0.924, hit@10 falls as lambda rises, all in the runbook's expected range |
| 3 Report | 9596b8c | 2 s | 3 PASS and 1 PENDING gate lines. `score_sanity.py --report` raised for the same 27 names as the JSON and left the report unchanged |
| 4 Notebook | ea40515 | 4 s | `notebooks/05_career.ipynb`, 0 error outputs, numbers asserted equal to the report, nothing changed under `reports/` |
| 5 Wrap up | (this commit) | n/a | Draft PR opened, not merged |

## Issues and fixes
- No crashes, no data-check failures, no change to any "never touch" file, no fix to any code file.
- Nothing deviated from `notes/phase5_plan.md`, so its change log was left alone.
- Wording mismatch in the generated report (not changed here): the sanity comps section says "Seasons in brackets are each comp's career span", but `evaluate_career.py` prints each comp's first qualified season after the name, with no brackets. The notebook says "first qualified season" instead.

## Key numbers
- Chosen method: career score, centre weight 0.25, peak weight 0.75, lambda 0 (highest mean split-half hit@10).
- Split-half hit@10 and MRR (chosen / centre only / best season): hit@10 0.981 / 0.974 / 0.916; MRR 0.900 / 0.909 / 0.695. Wasserstein: 0.975 / 0.896.
- Cross-era share (chosen / best season): 0.748 / 0.720.
- Career shape (Stockton percentile): 0% (spread 0.0173, the lowest of any pool player with 4+ seasons). LeBron 13%, Rodman 29%, Curry 30%, Kareem 48%.
- Lambda effect (spread gap at each lambda 0 / 0.25 / 0.5 / 1.0): 0.0284 / 0.0144 / 0.0098 / 0.0063; overlap with the lambda 0 top 10: 100% / 65% / 49% / 35%; mean split-half hit@10 for the chosen weights: 0.981 / 0.896 / 0.787 / 0.629.
- Gate lines: PASS beats best season on split-half hit@10; PASS spread gap of comps falls at every step up in lambda; PASS Stockton below the median spread; PENDING sanity comps (no sanity player failing).
- Other findings: known pairs at player level: Jordan/Kobe pass (best season: partial), Shaq/Howard pass, Nash/Paul fail under both.
- Unmarked comp names: 27 (Kareem 2, Magic 1, Bird 1, Isiah 2, Barkley 2, Jordan 1, Stockton 2, Rodman 2, Shaq 2, Nash 2, Kobe 1, LeBron 1, Curry 2, Draymond 4, Jokic 2).
