# Phase 4 runbook (for Claude Code)

This file tells Claude Code how to run Phase 4 in one unattended pass. Read all of it, plus `notes/phase4_plan.md`, before starting. Repo `~/Desktop/GreenFN`, branch `phase-4`, venv activated with `source .venv/bin/activate`.

The judging rules are fixed in `notes/phase4_plan.md`, `notes/phase3_plan.md` and `notes/phase2_eval_plan.md`. This runbook only says how to execute them. If anything here conflicts with those files, the plan files win.

## 0. Ground rules

| Rule | Detail |
|---|---|
| Commit at every checkpoint | Each checkpoint ends with a commit and a push to `origin/phase-4`. Commit only the files the checkpoint names |
| Commit identity | Already set in the repo config (Gede Danny Putra Budiada, noreply email). Check `git config user.email` before the first commit |
| Commit messages | One subject line, plus a short body when useful. No co-author or session lines |
| Never touch | The test split, the 5 hold-outs, `reports/phase2_baselines.md`, `reports/phase3_encoder.md`, `config/sanity_marks.json`, `notes/phase4_plan.md` sections 1 to 7, and any Phase 3 file in `src/` |
| Never change the judging | No new metrics, no change to the search space, seeds, selection rule or gate. If something must change, stop and explain |
| Don't merge | Phase 4 stays on `phase-4` until the new sanity comps are marked |
| No em dashes | In any file or commit message written during this run |
| Long commands | Expect minutes, not hours (Phase 3's 54 runs took about 8 minutes). Still run the search in the background and poll; it's resumable, so rerunning skips finished work |
| Log everything | Keep `notes/phase4_run_log.md` up to date (section 8) |

### When to stop and wait for Danny

Stop, write the reason at the top of the run log, commit the log and report back if:

- any data check raises
- `git status` ever shows a change to a file in the "Never touch" row
- a run crashes twice with the same error after one minimal fix attempt
- B2's numbers in the Phase 4 report don't match Phase 2 (era 0.190, non-adjacent 0.668, next-season RMSE 0.608, persistence 0.610)

Everything else (a gate line failing, the control not quite reproducing Phase 3, odd comps) is a finding: log it and carry on.

## 1. What already exists

| File | State | What it is |
|---|---|---|
| `notes/phase4_plan.md` | Saved, **not committed** | The rules, including the exploratory runs that led to two methods |
| `notes/phase4_runbook.md` | Saved, **not committed** | This file |
| `src/era_adversary.py` | Saved, **not committed** | Gradient reversal layer, era head, adversarial Stage B, `EraAdversarialEncoder` (lambda = 0 reproduces Phase 3), `SeasonCentred` (the centring method) |
| `src/evaluate_era.py` | Saved, **not committed** | `search` (12 adversary runs, then 12 centring evaluations; resumable CSV) and `report` |

Both code files were written and tested by Claude (chat) on a copy of the data. Read them fully before running.

## 2. Checkpoint 0: commit the plan before any search

Create `notes/phase4_run_log.md` (section 8) with status `running`.

**Commit:** `notes/phase4_plan.md`, `notes/phase4_runbook.md`, `notes/phase4_run_log.md`, message `Phase 4: plan written before the search, runbook, run log`. Push.

## 3. Checkpoint 1: smoke run

```
cd src && python era_adversary.py
```

Trains the lambda = 0 control (seed 2026) and applies centring at alpha 0.5. A few minutes at most. Expected, roughly:

| Line | Expected |
|---|---|
| Control | era probe about 0.32; non-adjacent hit@10 about 0.72 to 0.75 |
| Centred (alpha 0.5) | era probe about 0.24; non-adjacent within about 0.01 of the control |

If the centred era probe isn't clearly below the control's, stop: that's a code problem, not a finding.

**Commit:** `src/era_adversary.py`, message `Phase 4: era adversary and season centring`. Push.

## 4. Checkpoint 2: test the search pipeline

```
cd src && python evaluate_era.py search --quick
```

Must print a 3-epoch adversary line, then `Quick centring check: era ...` and `Quick run OK (not saved).`, and must not create `reports/phase4_search.csv`.

**Commit:** `src/evaluate_era.py`, message `Phase 4: search and report script`. Push.

## 5. Checkpoint 3: the search

```
cd src && python evaluate_era.py search
```

- First 12 adversary runs (lambda 0, 0.3, 1.0, 3.0 x seeds 2026, 2027, 2028), one line each, weights to `models/phase4/`.
- Then 12 centring evaluations on each seed's lambda = 0 model (no training).
- If interrupted, run it again; finished rows are skipped.
- Check the CSV ends with 24 rows and no duplicate `run` values.
- Quick check: the lambda = 0 rows should match the Phase 3 search rows for `d32_t0.05_pre_s2026/2027/2028` in `reports/phase3_search.csv` (same code and seeds on the same machine). Log the comparison either way.

**Commit:** `reports/phase4_search.csv`, message `Phase 4: search (12 adversary runs, 12 centring candidates)`. Push.

## 6. Checkpoint 4: the report

```
cd src && python evaluate_era.py report
```

Writes `reports/phase4_era.md` (chosen candidate, results vs control and B2, era translation test, gate, search table, box-score correlation, known pairs, sanity comp tables) and `reports/phase4_unmarked_comps.json`.

Checks:
- B2's column matches Phase 2 (era 0.190, non-adjacent 0.668, next-season RMSE 0.608, persistence 0.610). If not, stop.
- The gate lists 5 PASS/FAIL lines and one PENDING line.
- Then confirm sanity scoring fails as expected: `python score_sanity.py --report ../reports/phase4_era.md` should raise "comps with no mark" listing the same names as the JSON, and leave the report unchanged. Don't add marks.

**Commit:** `reports/phase4_era.md` and `reports/phase4_unmarked_comps.json`, message `Phase 4: results report (sanity marks pending)`. Push.

## 7. Checkpoint 5: notebook `notebooks/04_era.ipynb`

A read-only walkthrough in the style of `notebooks/03_encoder.ipynb`. It must not train anything or write under `reports/` or `models/`. It loads `reports/phase4_search.csv` and saved weights (`evaluate_era.load_adv`, `evaluate_era.load_candidate`).

| Section | Content |
|---|---|
| Intro (markdown) | The era problem from Phase 3 in 3 or 4 sentences; the two methods; why the adversary was expected to struggle (plan section 2) |
| 1. Adversary training | From one adversary checkpoint's `history["contrastive"]` (lambda 1.0, seed 2026): lambda, era head accuracy and validation non-adjacent hit@10 per epoch, chance line at 0.20 |
| 2. The trade-off | Scatter of mean era probe (x) vs mean non-adjacent hit@10 (y) for every candidate, adversary and centring in different markers, with the control, the 0.25 era target and the retrieval threshold drawn as lines. This is the key picture |
| 3. Probes side by side | Bar chart for chosen vs control vs B2: linear era probe (train + val), linear era probe (val only), nonlinear era probe (val only), position probe; chance line |
| 4. What centring does | 2D PCA of validation embeddings coloured by decade, control vs chosen, side by side. Markdown note: 2D pictures are for intuition only |
| 5. Comps across eras | For Curry, Magic and Bird: top 10 comps with seasons under control vs chosen, and the decade counts |
| 6. Findings (markdown) | Only facts shown above |

Execute in place: `jupyter nbconvert --to notebook --execute --inplace notebooks/04_era.ipynb`. Zero error outputs. Confirm nothing under `reports/` changed.

**Commit:** `notebooks/04_era.ipynb`, message `Phase 4: era removal walkthrough notebook`. Push.

## 8. Checkpoint 6: wrap up

1. If anything deviated from `notes/phase4_plan.md`, add a change-log row (date, change, reason). Change log only.
2. Finish `notes/phase4_run_log.md`:

```
# Phase 4 run log

Status: running | stopped (reason) | finished

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|

## Issues and fixes

## Key numbers
- Chosen candidate:
- Era probe (chosen / control / B2):
- Non-adjacent hit@10 (chosen / control):
- Nonlinear era probe, val only (chosen / control / B2):
- Control vs Phase 3 reproduction:
- Gate lines:
- Unmarked comp names:
```

3. **Commit:** the run log (and the plan change log if edited), message `Phase 4: run log`. Push.
4. Open a **draft** pull request from `phase-4` into `main`, titled `Phase 4: era removal (sanity marks pending)`, body summarising the gate lines and saying sanity marking is still to do. Don't merge.
5. Final message to Danny: PR link, chosen candidate, gate lines, the key numbers above, number of unmarked comp names, total run time, and anything that needed a fix.

## 9. Reference

| Piece | File | Notes |
|---|---|---|
| Base encoder | `encoder.py` (Phase 3, unchanged) | Embedding 32, temperature 0.05, pretraining |
| Adversary | `era_adversary.py` `train_contrastive_adv` | Era head on both views' embeddings; total loss = InfoNCE + era cross-entropy, with the encoder's share reversed and scaled by lambda (ramped from 0); early stopping on validation non-adjacent hit@10 as in Phase 3 |
| Centring | `era_adversary.py` `SeasonCentred` | Season means of unit-length embeddings over training players; subtract alpha x mean, renormalise |
| Search | `evaluate_era.py search` | 12 runs + 12 evaluations; resumable |
| Selection | `evaluate_era.py choose` | Among candidates with mean era probe <= 0.25, the best mean non-adjacent hit@10 |

Expected (from the exploratory runs, so a hint, not a target): adversary candidates barely move the era probe; centring at alpha 0.5 or 0.75 reaches the target with a small retrieval cost, so centring will most likely be chosen.

## 10. After this run (Danny and Claude, not Claude Code)

1. Claude marks the names in `reports/phase4_unmarked_comps.json` from researched consensus (Danny delegated), adds them to `config/sanity_marks.json` and the comp-check page.
2. `python score_sanity.py --report ../reports/phase4_era.md` fills the Judgement column; a Findings section is added.
3. Draft PR marked ready and merged; the Phase 4 doc is ticked.
4. Phase 5 (career profiles) starts on a new branch.
