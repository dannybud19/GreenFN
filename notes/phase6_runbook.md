# Phase 6 runbook (for Claude Code)

This file tells Claude Code how to run Phase 6 in one unattended pass. Read all of it, plus `notes/phase6_plan.md`, before starting. Repo `~/Desktop/GreenFN`, branch `phase-6`, venv activated with `source .venv/bin/activate`.

The rules are fixed in `notes/phase6_plan.md` and the earlier plans. If anything here conflicts with them, the plan files win.

## 0. Ground rules

| Rule | Detail |
|---|---|
| Commit at every checkpoint | Each checkpoint ends with a commit and a push to `origin/phase-6`. Commit only the files the checkpoint names |
| Commit identity | Already set in the repo config. Check `git config user.email` first |
| Commit messages | One subject line, plus a short body when useful. No co-author or session lines |
| Never touch | The test split's role, the 5 hold-outs, every earlier report, `config/sanity_marks.json`, `notes/phase6_plan.md` sections 1 to 6, and every Phase 2 to 5 file in `src/` |
| Never change the judging | No new checks, no change to thresholds, model or settings. If something must change, stop and explain |
| Exports stay out of git | `exports/` is git-ignored (checkpoint 1 adds it). Never commit export files |
| Don't merge | Phase 6 stays on `phase-6` until Danny has seen the report |
| No em dashes | In any file or commit message written during this run |
| Log everything | Keep `notes/phase6_run_log.md` up to date (section 7) |

### When to stop and wait for Danny

Stop, write the reason at the top of the run log, commit it and report back if:

- `models/phase4/adversary_lambda0.0_s2026.pt` is missing
- `precompute.py` raises "chosen setting doesn't match"
- `git status` ever shows a change to a "Never touch" file, or an export file staged
- a command crashes twice with the same error after one minimal fix attempt

Everything else (a gate line failing, a low trustworthiness) is a finding: log it and carry on.

## 1. What already exists

| File | State | What it is |
|---|---|---|
| `notes/phase6_plan.md` | Saved, **not committed** | The rules |
| `notes/phase6_runbook.md` | Saved, **not committed** | This file |
| `src/explain.py` | Saved, **not committed** | The career score rebuilt in PyTorch, integrated gradients for a pair, the deletion test |
| `src/precompute.py` | Saved, **not committed** | Profiles, comps, why-similar for every player, deletion test, UMAP, exports, manifest, report |

Both were written and tested by Claude (chat) with a 40-player quick run. Read them fully before running.

## 2. Checkpoint 0: commit the plan

Create `notes/phase6_run_log.md` (section 7), status `running`.

**Commit:** `notes/phase6_plan.md`, `notes/phase6_runbook.md`, `notes/phase6_run_log.md`, message `Phase 6: plan written before the run, runbook, run log`. Push.

## 3. Checkpoint 1: code, git-ignore, quick run

1. Add a line `exports/` to `.gitignore`.
2. `cd src && python precompute.py --quick` (about a minute; UMAP is most of it). Expected: about 2,470 players and 14,670 seasons; completeness error around 0.1%; deletion drop for the top 3 well above random; trustworthiness around 0.9. Warnings from UMAP about `random_state` and `n_jobs` are normal.
3. Confirm `git status` shows no file under `exports/`. Delete the quick run's `reports/phase6_explain.md` (it says QUICK RUN) so it isn't committed by mistake.

**Commit:** `.gitignore`, `src/explain.py`, `src/precompute.py`, message `Phase 6: integrated gradients and precompute script`. Push.

## 4. Checkpoint 2: full run and reproducibility

1. `cd src && python precompute.py` (a few minutes; run in the background and poll). Copy `exports/manifest.json` to a temporary file outside the repo.
2. Run `python precompute.py` again, then compare the `files` SHA-256 values of both manifests. They must match for all five files. Log the result either way (a mismatch is a gate FAIL, recorded as a finding).
3. Check the report: the coverage table shows every player and every season, and the gate lists 5 PASS/FAIL lines. Add a sixth line by hand at the end of the gate section: `- PASS: Two runs give identical export checksums` or `- FAIL: ...` with the mismatching files. That's the only manual edit.

**Commit:** `reports/phase6_explain.md`, message `Phase 6: explanations, map and exports report`. Push.

## 5. Checkpoint 3: notebook `notebooks/06_explain.ipynb`

Read-only, in the style of the earlier notebooks. It reads `exports/` and must not write anything.

| Section | Content |
|---|---|
| Intro (markdown) | What Phase 6 produces and why explanations need checking, in 3 or 4 sentences |
| 1. Why similar | Horizontal bar charts of the 15-feature breakdown for Jordan/Kobe, Rodman/Reggie Evans and Stockton/Chris Paul (from `why.json`, or recomputed with `explain.explain_pair` if a pair isn't in a top 5) |
| 2. Checks | Completeness errors (histogram) and the deletion test (top-3 vs random drops, scatter with the diagonal), recomputed on 50 pairs |
| 3. The map | Scatter of `seasons_umap.csv` coloured by decade, then by primary position (join on the parquet), with Jordan's, LeBron's and Stockton's careers drawn as trajectory lines. Markdown: the map is for intuition only |
| 4. What the app gets | Sizes and row counts of every export file, read from `manifest.json` |
| 5. Findings (markdown) | Only facts shown above |

Execute in place: `jupyter nbconvert --to notebook --execute --inplace notebooks/06_explain.ipynb`. Zero error outputs. Confirm nothing under `reports/` changed and nothing under `exports/` is staged.

**Commit:** `notebooks/06_explain.ipynb`, message `Phase 6: explanations and map notebook`. Push.

## 6. Checkpoint 4: wrap up

1. Change-log row in `notes/phase6_plan.md` only if something deviated.
2. Finish the run log.
3. **Commit:** the run log (and plan change log if edited), message `Phase 6: run log`. Push.
4. Open a **draft** pull request from `phase-6` into `main`, titled `Phase 6: explainability and precompute`, body summarising the gate lines and the export sizes. Don't merge.
5. Final message to Danny: PR link, gate lines, completeness and deletion numbers, trustworthiness, the five example breakdowns, export sizes, reproducibility result, total run time, anything that needed a fix.

## 7. Run log (`notes/phase6_run_log.md`)

```
# Phase 6 run log

Status: running | stopped (reason) | finished

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|

## Issues and fixes

## Key numbers
- Players / seasons covered:
- Completeness error (mean / max):
- Deletion test (top-3 drop / random drop / share of pairs):
- Trustworthiness:
- Reproducibility (checksums match?):
- Export sizes:
- Gate lines:
```

## 8. After this run (Danny and Claude)

1. Claude reviews the report and the example breakdowns; Danny merges.
2. Phase 7 (API and UI) starts on a new branch, reading `exports/`.
