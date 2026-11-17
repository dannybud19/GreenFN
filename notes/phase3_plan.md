# Phase 3 plan: neural season encoder

Written before any training run. Everything in `notes/phase2_eval_plan.md` still applies; this file adds the Phase 3 rules. If a rule changes, record it in the change log with the reason.

## 1. Decisions

| Decision | Choice |
|---|---|
| Inputs | The same 15 style z-scores as the Phase 2 baselines, qualified seasons only. No level features (minutes, impact) in Phase 3, so the comparison with B2 is fair |
| Training data | Training players only. Validation chooses settings. Test and the 5 hold-outs are never used |
| Who writes what | Danny writes `src/encoder_data.py` and `src/encoder.py` (data, model, both training stages). `src/evaluate_encoder.py` reuses the Phase 2 functions |
| Sanity comps | New comp names are marked on the same comp-check page, with the same rules: own opinion first, researched consensus second, never the stats |

## 2. Model

| Part | Shape | Used for |
|---|---|---|
| Encoder | 15 -> 128 -> 128 -> d, ReLU and LayerNorm between layers | The embedding used for comps |
| Reconstruction head | d -> 64 -> 15 | Stage A only |
| Projection head | d -> 64 -> 32 | Stage B only |

Comps use the d-dimensional embedding, L2-normalised, compared with cosine similarity.

## 3. Training

**Stage A, masked-feature pretraining**
- Mask 25% of features per row; replace each masked value with the same feature from a random training row.
- Loss: mean squared error on masked features only. Adam, learning rate 1e-3, batch 256, 50 epochs.
- Check: validation loss must beat predicting 0 (the season mean) for every masked feature.
- Players with one qualified season are used here only.

**Stage B, contrastive training**
- InfoNCE loss. Each batch has 256 different players with 2 seasons each; every other season in the batch is a negative.
- Positive pairs prefer seasons 2 or more years apart; adjacent seasons only when a player has no other choice.
- Augmentation: mask 15% of features on each view.
- Adam, learning rate 1e-3, up to 100 epochs, early stopping (patience 10) on validation non-adjacent hit@10.

## 4. Search space (fixed in advance)

| Setting | Values |
|---|---|
| Embedding size d | 8, 16, 32 |
| Temperature | 0.05, 0.1, 0.2 |
| Stage A pretraining | yes, no |
| Seeds | 2026, 2027, 2028 |

18 settings x 3 seeds. The chosen setting has the highest mean validation non-adjacent hit@10 across seeds; ties go to the lower next-season RMSE. Because validation also chooses the setting, its numbers are optimistic; the unbiased numbers come from the test split once, at the end of v1.

## 5. Metrics

All Phase 2 metrics on validation (retrieval, non-adjacent retrieval, next-season RMSE vs persistence, era and position probes, box-score correlation, known pairs, sanity comps), plus:

| Check | How | Pass if |
|---|---|---|
| Stability | Mean cosine distance between consecutive qualified seasons of the same player, vs random pairs of different players (validation). Also reported for B2 | Consecutive pairs are closer than random pairs |
| Pretraining | Stage A validation MSE on masked features vs predicting 0 | Lower than predicting 0 |

Results are reported as mean and spread over the 3 seeds.

## 6. Bar to beat (B2 cosine, validation)

| Metric | B2 | Persistence |
|---|---|---|
| Non-adjacent hit@10 | 0.668 | |
| Next-season RMSE | 0.608 | 0.610 |
| Position probe | 0.661 | |
| Sanity mean (out of 5) | 1.70 | |

## 7. Gate

- This plan is committed before any training run.
- The chosen setting, averaged over 3 seeds, beats B2 on non-adjacent hit@10 and next-season RMSE, and beats persistence.
- The stability check passes.
- The position probe stays well above chance (20%).
- New sanity comps are marked and scored; the mean is reported next to B2's 1.70 (reported, not required to beat).
- Results go in `reports/phase3_encoder.md`. The Phase 2 report is never overwritten. Weights go in `models/` (git-ignored).
- If the encoder doesn't beat B2, record it as a finding. Don't change the metric.

## Change log

| Date | Change | Reason |
|---|---|---|
| | | |
