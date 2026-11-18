# Phase 5 runbook (for Claude Code)

This file tells Claude Code how to run Phase 5 in one unattended pass. Read all of it, plus `notes/phase5_plan.md`, before starting. Repo `~/Desktop/GreenFN`, branch `phase-5`, venv activated with `source .venv/bin/activate`.

The judging rules are fixed in `notes/phase5_plan.md` and the earlier plans. This runbook only says how to execute them. If anything here conflicts with the plan files, the plan files win.

## 0. Ground rules

| Rule | Detail |
|---|---|
| Commit at every checkpoint | Each checkpoint ends with a commit and a push to `origin/phase-5`. Commit only the files the checkpoint names |
| Commit identity | Already set in the repo config. Check `git config user.email` before the first commit |
| Commit messages | One subject line, plus a short body when useful. No co-author or session lines |
| Never touch | The test split, the 5 hold-outs, every earlier report (`reports/phase2_baselines.md`, `phase3_encoder.md`, `phase4_era.md`), `config/sanity_marks.json`, `notes/phase5_plan.md` sections 1 to 7, and every Phase 2 to 4 file in `src/` |
| Never change the judging | No new metrics, no change to the search space, seeds, selection rule or gate. If something must change, stop and explain |
| Don't merge | Phase 5 stays on `phase-5` until the new sanity comps are marked |
| No em dashes | In any file or commit message written during this run |
| Nothing trains | Phase 5 only reads the Phase 4 weights. The search takes about a minute per seed |
| Log everything | Keep `notes/phase5_run_log.md` up to date (section 7) |

### When to stop and wait for Danny

Stop, write the reason at the top of the run log, commit it and report back if:

- `models/phase4/adversary_lambda0.0_s2026.pt`, `_s2027.pt` or `_s2028.pt` is missing (they come from the Phase 4 run and are git-ignored)
- any data check raises
- `git status` ever shows a change to a file in the "Never touch" row
- a command crashes twice with the same error after one minimal fix attempt

Everything else (a gate line failing, odd comps) is a finding: log it and carry on.

## 1. What already exists

| File | State | What it is |
|---|---|---|
| `notes/phase5_plan.md` | Saved, **not committed** | The rules, including the exploratory run that set the lambda scale |
| `notes/phase5_runbook.md` | Saved, **not committed** | This file |
| `src/career.py` | Saved, **not committed** | Profiles (centre, peak, spread), the career score, Wasserstein (Sinkhorn), best-season reference, split-half retrieval |
| `src/evaluate_career.py` | Saved, **not committed** | `search` (all methods x 3 seeds, writes the CSV) and `report` |

Both code files were written and tested by Claude (chat) on a copy of the data with the seed 2026 base model. Read them fully before running.

## 2. Checkpoint 0: commit the plan before the search

Create `notes/phase5_run_log.md` (section 7) with status `running`. Check the three Phase 4 weight files exist.

**Commit:** `notes/phase5_plan.md`, `notes/phase5_runbook.md`, `notes/phase5_run_log.md`, message `Phase 5: plan written before the search, runbook, run log`. Push.

## 3. Checkpoint 1: code

```
cd src && python -c "import career, evaluate_career; print('imports OK')"
```

**Commit:** `src/career.py` and `src/evaluate_career.py`, message `Phase 5: career profiles and evaluation script`. Push.

## 4. Checkpoint 2: the search

```
cd src && python evaluate_career.py search
```

- Prints one block per seed: the number of validation players (about 300) and halves (about 460), then one line per method.
- Writes `reports/phase5_search.csv` with 66 rows (22 methods x 3 seeds).
- Expected for seed 2026, roughly: career score at lambda 0 around 0.97 to 0.98 split-half hit@10; best season match around 0.93; split-half hit@10 falls as lambda rises.

**Commit:** `reports/phase5_search.csv`, message `Phase 5: search (22 methods x 3 seeds)`. Push.

## 5. Checkpoint 3: the report

```
cd src && python evaluate_career.py report
```

Writes `reports/phase5_career.md` (chosen method, results vs centre-only and best-season, career shape, lambda effect with Stockton's comps, gate, full search table, known pairs, sanity comp tables) and `reports/phase5_unmarked_comps.json`.

Checks:
- The gate lists 3 PASS/FAIL lines and one PENDING line.
- Sanity scoring should fail as expected: `python score_sanity.py --report ../reports/phase5_career.md` raises "comps with no mark" for the same names as the JSON, and leaves the report unchanged. Don't add marks.

**Commit:** `reports/phase5_career.md` and `reports/phase5_unmarked_comps.json`, message `Phase 5: results report (sanity marks pending)`. Push.

## 6. Checkpoint 4: notebook `notebooks/05_career.ipynb`

A read-only walkthrough in the style of `notebooks/04_era.ipynb`. It must not write under `reports/` or `models/`. It rebuilds profiles from the saved Phase 4 weights using `career` and `evaluate_career` functions.

| Section | Content |
|---|---|
| Intro (markdown) | Seasons vs careers in 3 or 4 sentences; what centre, peak and spread mean |
| 1. Profiles | For Stockton, LeBron and Rodman: each season's cosine distance from his centre plotted over his career, with the spread as a line. Shows what "consistent" looks like |
| 2. Spread distribution | Histogram of spread for pool players with 4+ seasons, with the five shape players marked |
| 3. The search | Read `reports/phase5_search.csv`: heatmap of mean split-half hit@10 by (alpha, beta) x lambda, plus Wasserstein and best-season as reference lines |
| 4. The lambda slider | For the chosen weights: spread gap and overlap vs lambda (two small line charts), and Stockton's top 5 at each lambda as a table |
| 5. Career comps vs season comps | For Jordan, Barkley, Nash and Jokic: chosen top 5 next to best-season top 5 |
| 6. Findings (markdown) | Only facts shown above |

Execute in place: `jupyter nbconvert --to notebook --execute --inplace notebooks/05_career.ipynb`. Zero error outputs. Confirm nothing under `reports/` changed.

**Commit:** `notebooks/05_career.ipynb`, message `Phase 5: career profiles walkthrough notebook`. Push.

## 7. Checkpoint 5: wrap up

1. If anything deviated from `notes/phase5_plan.md`, add a change-log row. Change log only.
2. Finish `notes/phase5_run_log.md`:

```
# Phase 5 run log

Status: running | stopped (reason) | finished

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|

## Issues and fixes

## Key numbers
- Chosen method:
- Split-half hit@10 and MRR (chosen / centre only / best season):
- Cross-era share (chosen / best season):
- Career shape (Stockton percentile):
- Lambda effect (spread gap at each lambda):
- Gate lines:
- Unmarked comp names:
```

3. **Commit:** the run log (and the plan change log if edited), message `Phase 5: run log`. Push.
4. Open a **draft** pull request from `phase-5` into `main`, titled `Phase 5: career profiles (sanity marks pending)`, body summarising the gate lines. Don't merge.
5. Final message to Danny: PR link, chosen method, gate lines, key numbers above, number of unmarked names, total run time, anything that needed a fix.

## 8. After this run (Danny and Claude, not Claude Code)

1. Claude marks the unmarked names from researched consensus (delegated) and adds them to `config/sanity_marks.json` and the comp-check page.
2. `python score_sanity.py --report ../reports/phase5_career.md` fills the Judgement column; Findings are added; the no-fail gate line is checked.
3. Draft PR marked ready and merged; the Phase 5 doc is ticked.
4. Phase 6 (explainability and precompute) starts on a new branch.
