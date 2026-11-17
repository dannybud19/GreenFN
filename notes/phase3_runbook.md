# Phase 3 runbook (for Claude Code)

This file tells Claude Code how to finish Phase 3 in one long, unattended run. Read all of it before starting. It assumes the repo is `~/Desktop/GreenFN`, the branch is `phase-3`, and the venv is activated with `source .venv/bin/activate`.

The rules for judging the encoder are fixed in `notes/phase3_plan.md` (committed 5795218) and `notes/phase2_eval_plan.md`. This runbook only says how to execute them. If anything here conflicts with those two files, the plan files win.

## 0. Ground rules

| Rule | Detail |
|---|---|
| Commit at every checkpoint | Each checkpoint below ends with a commit and a push to `origin/phase-3`, so any step can be rolled back with `git revert` or `git reset`. Commit only the files the checkpoint names |
| Commit identity | Author is already set in the repo config (Gede Danny Putra Budiada, `50692960+dannybud19@users.noreply.github.com`). Check with `git config user.email` before the first commit |
| No attribution lines | Commit messages are one subject line, plus a short body when useful. No co-author or session lines |
| Never touch | The test split, the 5 hold-outs, `reports/phase2_baselines.md`, `config/sanity_marks.json`, `notes/phase3_plan.md` sections 1 to 7 |
| Never change the judging | No new metrics, no change to the search space, seeds, selection rule or gate. If something must change, stop and explain instead |
| Don't merge | Phase 3 stays on `phase-3`. Merging waits until Danny has marked the new sanity comps |
| No em dashes | In any file or commit message written during this run |
| Long commands | The search takes 30 to 120 minutes per checkpoint. Run it in the background (or in chunks) and poll; don't let a foreground timeout kill it. The search is resumable: rerunning the same command skips runs already in the CSV |
| Log everything | Keep `notes/phase3_run_log.md` up to date as you go (see section 9) |

### When to stop and wait for Danny

Stop, write the reason at the top of the run log, commit the log, and report back if:

- any data check raises (in `encoder_data.py`, `build_dataset.py`, `splits.py`)
- `git status` ever shows a change to `reports/phase2_baselines.md` or `config/sanity_marks.json`
- Stage A's validation loss is not below "predicting 0" in the smoke run
- a run crashes twice in a row with the same error after one minimal fix attempt
- B2's numbers in the Phase 3 report don't match Phase 2 (hit@10 0.778, non-adjacent 0.668, next-season RMSE 0.608, persistence 0.610)

Anything else (slow runs, a gate line failing, odd-looking comps) is a finding: log it and carry on.

## 1. What already exists

| File | State | What it is |
|---|---|---|
| `notes/phase3_plan.md` | Committed (5795218) | The rules |
| `src/encoder_data.py` | Committed (0afe5d9) | Training tensors, feature masking, same-player pair sampler |
| `src/encoder.py` | Saved, **not committed** | `SeasonEncoder` model, Stage A `pretrain`, Stage B `train_contrastive`, `NeuralEncoder` wrapper with the Phase 2 interface |
| `src/evaluate_encoder.py` | Saved, **not committed** | `search` (trains the 18 settings x 3 seeds, resumable CSV) and `report` (picks a setting, scores it vs B2, writes the report) |

Both new files were written and tested by Claude (chat) on a copy of the data. Read both fully before running them.

## 2. Checkpoint 0: commit this runbook

Create `notes/phase3_run_log.md` (section 9) with status `running`.

**Commit:** `notes/phase3_runbook.md` and `notes/phase3_run_log.md`, message `Phase 3: runbook and run log`. Push.

## 2b. Checkpoint 1: smoke run of the encoder

```
cd src && python encoder.py
```

Takes 1 to 3 minutes. Expected, roughly (small differences from PyTorch versions are fine):

| Line | Expected |
|---|---|
| Stage A | validation masked MSE about 0.59, clearly below predicting 0 (about 1.02) |
| Stage B | stops after about 60 to 100 epochs; best non-adjacent hit@10 about 0.73 |
| Validation | hit@10 about 0.84, non-adjacent about 0.73, next-season RMSE about 0.62 (persistence 0.610) |

Confirm `models/encoder_smoke_d16_t0.1_pre_s2026.pt` exists and `git status` shows nothing under `models/`.

**Commit:** `src/encoder.py`, message `Phase 3: encoder, masked pretraining and contrastive training`. Push.

## 3. Checkpoint 2: test the search pipeline

```
cd src && python evaluate_encoder.py search --quick
```

One 3-epoch run that saves nothing. It must print `Quick run OK (not saved).` and must not create `reports/phase3_search.csv`.

**Commit:** `src/evaluate_encoder.py`, message `Phase 3: search and report script`. Push.

## 4. Checkpoints 3 to 5: the search

Three chunks, one per embedding size, so each chunk is its own rollback point. Each chunk is 18 runs (3 temperatures x pretraining yes/no x 3 seeds).

```
cd src && python evaluate_encoder.py search --dims 8
cd src && python evaluate_encoder.py search --dims 16
cd src && python evaluate_encoder.py search --dims 32
```

- Each run prints one line: `[n/18] d8_t0.05_pre_s2026: non-adj ..., next RMSE ..., N epochs`.
- Each finished run is appended to `reports/phase3_search.csv` and its weights saved to `models/phase3/` (git-ignored).
- If a chunk is interrupted, run the same command again; finished runs are skipped.
- Runs without pretraining skip Stage A, so they are faster.
- Record each chunk's wall-clock time in the run log.

After each chunk, check the CSV has 18, 36, then 54 rows with no duplicate `run` values.

**Commits (one per chunk):** `reports/phase3_search.csv`, messages:
- `Phase 3: search, embedding size 8 (18 runs)`
- `Phase 3: search, embedding size 16 (36 runs total)`
- `Phase 3: search, embedding size 32 (54 runs total)`

Push after each.

## 5. Checkpoint 6: the report

```
cd src && python evaluate_encoder.py report
```

It refuses to run unless the CSV has exactly 54 unique runs. It writes:

| File | Contents |
|---|---|
| `reports/phase3_encoder.md` | Chosen setting; results table (mean ± spread over seeds) next to B2; stability check; gate lines; full search table; box-score correlation; known pairs; sanity comp tables (encoder seed 2026 and B2) with an empty Judgement column |
| `reports/phase3_unmarked_comps.json` | For each sanity player, encoder comp names not yet in `config/sanity_marks.json` |

Checks:
- B2's row matches Phase 2 exactly (hit@10 0.778, non-adjacent 0.668, next-season RMSE 0.608, persistence 0.610). If not, stop.
- The gate section lists 5 PASS/FAIL lines and one PENDING line (sanity). A FAIL is a finding, not a reason to stop.

**Commit:** `reports/phase3_encoder.md` and `reports/phase3_unmarked_comps.json`, message `Phase 3: results report (sanity marks pending)`. Push.

## 6. Checkpoint 7: let `score_sanity.py` score any report

`src/score_sanity.py` only reads `reports/phase2_baselines.md`, and its original row pattern only matched model names starting with `B` (check the current version; it was edited in commit 2af761a). Make two minimal changes:

1. Add an optional `--report PATH` argument (argparse). Default: `reports/phase2_baselines.md`, so running it with no argument behaves exactly as before.
2. Match any model row except the header row (`Model`) and rows whose model name starts with `B0`, so `Encoder d=... ` rows are scored too.

Don't change the scoring rule, the summary section logic, or anything else.

Checks:
- `python score_sanity.py` (no argument) leaves `reports/phase2_baselines.md` byte-identical: `git diff --exit-code reports/phase2_baselines.md` must pass.
- `python score_sanity.py --report ../reports/phase3_encoder.md` is **expected to fail** right now with the "comps with no mark" error, because the new names aren't marked yet. That's correct. Don't add marks. Confirm the error lists the same names as `reports/phase3_unmarked_comps.json`, and that the Phase 3 report wasn't modified by the failed run.

**Commit:** `src/score_sanity.py`, message `Phase 3: score_sanity takes a report path`. Push.

## 7. Checkpoint 8: notebook `notebooks/03_encoder.ipynb`

Write a read-only walkthrough in the style of `notebooks/02_baselines.ipynb`. It must not train anything or write any file under `reports/` or `models/`. It loads saved results and the chosen setting's saved weights.

| Section | Content |
|---|---|
| Intro (markdown) | What Phase 3 builds, in 4 or 5 sentences; the bar to beat (B2); the note that validation numbers are optimistic |
| 1. Training curves | From the chosen setting's checkpoint `history` (`torch.load(..., weights_only=False)`): Stage A train/val masked MSE with the predict-0 line (if pretraining was chosen), Stage B loss and validation non-adjacent hit@10 per epoch, best epoch marked |
| 2. The search | Read `reports/phase3_search.csv`. Heatmaps or grouped bars of mean non-adjacent hit@10 and mean next-season RMSE by embedding size x temperature, one panel per pretraining yes/no; B2 and persistence as reference lines |
| 3. Encoder vs B2 | Load the 3 seed models with `evaluate_encoder.load_encoder` and B2; recompute retrieval, non-adjacent, next-season, stability (`evaluate_encoder.stability`). Table plus a bar chart. Must match `reports/phase3_encoder.md` |
| 4. What the embedding looks like | 2D PCA of the seed 2026 embedding for validation seasons, coloured by primary position; a second panel coloured by decade. Note in markdown that 2D pictures are for intuition only (feature note, check 6) |
| 5. Comps side by side | For 4 players (Jordan, Nash, Rodman, Jokic): encoder top 5 vs B2 top 5 |
| 6. Findings (markdown) | Only facts shown in the notebook above |

Execute it in place: `jupyter nbconvert --to notebook --execute --inplace notebooks/03_encoder.ipynb`. Zero error outputs. Confirm `git status` shows no change under `reports/`.

**Commit:** `notebooks/03_encoder.ipynb`, message `Phase 3: encoder walkthrough notebook`. Push.

## 8. Checkpoint 9: wrap up

1. If anything in this run deviated from `notes/phase3_plan.md` (for example, a fix to `encoder.py`), add a row to its change log with the date, the change and the reason. Only the change log; nothing else in that file.
2. Finish `notes/phase3_run_log.md` (section 9).
3. **Commit:** the run log and the plan change log if edited, message `Phase 3: run log`. Push.
4. Open a **draft** pull request from `phase-3` into `main` titled `Phase 3: neural season encoder (sanity marks pending)`, with a body that summarises the gate lines from the report and says sanity marking is still to do. Don't merge it.
5. Final message to Danny: the PR link, the chosen setting, the gate lines, the number of unmarked comp names, total run time, and anything that needed a fix.

## 9. The run log (`notes/phase3_run_log.md`)

Create it at the start and update it at every checkpoint.

```
# Phase 3 run log

Status: running | stopped (reason) | finished

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|
| 1 Smoke run | <hash> | <time> | <key numbers> |
| ... | | | |

## Issues and fixes
- <what happened, what you changed, why>

## Key numbers
- Chosen setting:
- Encoder vs B2 (non-adjacent hit@10, next-season RMSE):
- Gate lines:
- Unmarked comp names:
```

## 10. Reference: what the code does

| Piece | File | Notes |
|---|---|---|
| Training data | `encoder_data.py` | Training players only (10,257 seasons, 1,729 players; 1,418 with 2+ seasons, so 5 contrastive batches per epoch at 256 players) |
| Model | `encoder.py` `SeasonEncoder` | 15 -> 128 -> 128 -> d with LayerNorm and ReLU; reconstruction head d -> 64 -> 15; projection head d -> 64 -> 32 |
| Stage A | `encoder.py` `pretrain` | 25% of features swapped for values from other rows; MSE on hidden features only; 50 epochs, Adam 1e-3, batch 256 |
| Stage B | `encoder.py` `train_contrastive` | InfoNCE over 512 views per batch; 15% masking per view; up to 100 epochs; stops after 10 epochs without a better validation non-adjacent hit@10; keeps the best weights |
| Interface | `encoder.py` `NeuralEncoder` | `fit(val=...)`, `embed` (L2-normalised), `similarity` (cosine). Scored by the unchanged Phase 2 functions |
| Search | `evaluate_encoder.py search` | 3 sizes x 3 temperatures x 2 pretraining x 3 seeds = 54 runs; resumable |
| Report | `evaluate_encoder.py report` | Selection on mean validation non-adjacent hit@10 (ties: lower next-season RMSE); seed 2026 model for comps |

Expected behaviour seen in testing (one setting, one seed, so treat as a hint, not a target): the encoder beat B2 on non-adjacent retrieval (about 0.73 vs 0.668) but was worse on next-season error (about 0.625 vs 0.608, also worse than persistence). If the full search shows the same, that's a valid Phase 3 finding.

## 11. After this run (Danny and Claude, not Claude Code)

1. Danny marks the names in `reports/phase3_unmarked_comps.json` on the comp-check page (Claude adds them with suggestions).
2. The marks go into `config/sanity_marks.json`, then `python score_sanity.py --report ../reports/phase3_encoder.md` fills the Judgement column.
3. Findings section added to the Phase 3 report; draft PR marked ready and merged.
4. Phase 4 (era translation) starts on a new branch.
