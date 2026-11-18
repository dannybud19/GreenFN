# Phase 5 plan: career profiles

Written before the Phase 5 search. Everything in `notes/phase2_eval_plan.md`, `notes/phase3_plan.md` and `notes/phase4_plan.md` still applies; this file adds the Phase 5 rules. If a rule changes, record it in the change log with the reason.

## 1. The problem

Phases 2 to 4 compared seasons. A player's comps were the players whose single best-matching season was closest to one of his. That rewards one-off matches (a role player who once had a season shaped like Jordan's) and ignores the shape of a career. The project's unit was always meant to be the player, graded on his seasons, with consistency mattering "to an extent". Phase 5 builds player-level profiles and compares whole careers.

## 2. Exploratory run (18 Nov 2026, validation, seed 2026, before this plan)

One run of the full pipeline on seed 2026 showed:

- Career profiles recognise a player far better than best-season matching: split-half hit@10 about 0.97 against 0.93, MRR about 0.91 against 0.68.
- The first version of the consistency term (lambda times the spread gap in spread standard deviations) swamped the similarity term even at lambda 0.1, because cosine similarities between close careers differ only in the second decimal. Every term is now divided by its standard deviation over training-player pairs, so the three terms share one scale. The lambda grid below was set after this change.
- Even on one scale, lambda lowers split-half retrieval: the two halves of one career don't have identical spreads. So lambda is a **preference slider** ("show me careers shaped like his"), not an accuracy knob. The selection rule will very likely pick lambda 0; the lambda effect is reported and gated on being explainable, as the roadmap asks.

## 3. Method

**Season embeddings.** Phase 4's chosen model for each seed: the Phase 3 encoder (lambda 0 control, `models/phase4/adversary_lambda0.0_s<seed>.pt`) with season centring at alpha 0.5. Nothing is trained in Phase 5.

**Profile per player** (qualified seasons only):

| Part | Definition |
|---|---|
| Centre | Minutes-weighted average of his season embeddings, unit length |
| Peak | Average of his top 3 seasons by BPM (fewer if his career is shorter), unit length. BPM only picks which seasons count as the peak; it never enters a similarity |
| Spread | Minutes-weighted mean cosine distance of his seasons from his centre. Low = consistent |
| Decade | Decade of his median season (2020s capped as in the era probe) |

**Methods compared:**

| Method | Similarity | Knobs |
|---|---|---|
| Career score | alpha x cos(centres) / sd + beta x cos(peaks) / sd - lambda x abs(spread gap) / sd, each sd taken over all training-player pairs | alpha, beta, lambda |
| Wasserstein | Minus the entropic optimal-transport cost (Sinkhorn, eps 0.05, 200 iterations) between the two careers' minutes-weighted season sets, cost = cosine distance | none |
| Best season match | Max cosine over all season pairs (the Phases 2 to 4 method) | Reference only, not a candidate |

## 4. Search space (fixed)

| Setting | Values |
|---|---|
| (alpha, beta) | (1, 0), (0.75, 0.25), (0.5, 0.5), (0.25, 0.75), (0, 1) |
| lambda | 0, 0.25, 0.5, 1.0 |
| Wasserstein | one setting (eps 0.05) |
| Seeds | 2026, 2027, 2028 (the Phase 4 base models) |

20 career-score settings + Wasserstein + the best-season reference, per seed.

**Selection rule.** Among career-score settings and Wasserstein, the highest mean split-half hit@10 over seeds; ties go to the higher mean split-half MRR.

## 5. Metrics

| Measure | How | Why |
|---|---|---|
| Split-half identity retrieval | Each validation player with 4+ qualified seasons becomes two pseudo-players (alternating seasons). A hit means one half finds the other in its top 10 among all halves. Hit@10 and MRR | The career-level version of same-player retrieval: a good profile describes a player, not one season |
| Cross-era share | Over validation players (2+ seasons), share of top-10 career comps from another decade | Do career comps cross eras more than season comps did |
| Spread gap of comps | Mean absolute spread difference between a player and his top 10 | Measures what lambda does |
| Career shape | Spread percentile (among pool players with 4+ seasons) for Stockton, LeBron, Kareem, Rodman, Curry | Feature note test: Stockton should have low spread |
| Lambda effect | For the chosen weights: spread gap of comps, overlap with the lambda 0 top 10, and Stockton's top 5 at each lambda | Roadmap gate: moving lambda changes results in a way you can explain |
| Known pairs | Player level: each player in the other's top 5 | Same pairs as before |
| Sanity comps | Top 5 career comps for the 15 sanity players, chosen method and the best-season reference, scored with `score_sanity.py` | Same human check as every phase |

Candidates are all non-hold-out players with 2+ qualified seasons, from every split (as in earlier sanity pools). Comps, shape and the lambda effect use the seed 2026 model; retrieval and cross-era share are averaged over 3 seeds.

## 6. Bar

| Metric | Reference |
|---|---|
| Split-half hit@10 | Best season match, same models |
| Sanity comps | Phase 4: 8 pass, 7 partial, 0 fail, mean 1.87 |

## 7. Gate

- This plan is committed before the Phase 5 search.
- The chosen method beats best-season matching on mean split-half hit@10.
- Lambda effect is explainable: for the chosen weights, the mean spread gap of comps falls at every step up in lambda.
- Career shape: Stockton's spread is below the median of players with 4+ seasons.
- Player-level sanity comps: no sanity player fails; the mean is reported next to Phase 4's 1.87. As before, Danny has delegated marking new names to Claude (researched consensus, playing style where no comparison exists, never the stats).
- Results go in `reports/phase5_career.md`. Earlier reports are never overwritten.
- If a line fails, record it as a finding. Don't change the metric.

## Change log

| Date | Change | Reason |
|---|---|---|
| 18 Nov 2026 | The 27 new sanity comp names were marked by Claude from researched consensus, not by Danny | Danny delegated them, as in Phases 3 and 4; recorded in notes/sanity_judgements.md |
| 18 Nov 2026 | Danny reviewed the delegated marks on the comp-check page and overrode one: Tyson Chandler for Rodman is fair, not partial. Phase 4's chosen model and Phase 5's best-season column move from mean 1.87 to 1.90; no verdict changes; the Phase 4 report was re-scored on this branch | Danny's own opinion is final; sections 6 and 7 above keep their original 1.87 as written before the search |
| 18 Nov 2026 | Report wording: the year after each comp is his first qualified season (the text wrongly said career span) | Fixed in evaluate_career.py and the report; numbers unchanged |
