# Phase 6 results: explanations, map and precompute

Final model: Phase 5's chosen pipeline, seed 2026 (encoder, season centring alpha 0.5, career score centre 0.25 / peak 0.75 / lambda 0.0). Hold-outs excluded. 

## Coverage

| Item | Count | Of |
|---|---|---|
| Players with 10 comps | 2,467 | 2,467 |
| Players with a why-similar breakdown for their top 5 | 2,467 | 2,467 |
| Seasons with map coordinates | 14,672 | 14,672 |

## Why similar: integrated gradients checks

Explanations computed: 12,335 pairs (2,467 players x top 5).

| Check | Result |
|---|---|
| Completeness error (attributions vs score change), mean | 0.106% |
| Completeness error, max | 2.329% |
| Pairs with completeness error under 1% | 12,331 of 12,335 (99.97%) |
| Deletion test: mean score drop, top-3 credited features set to average | 0.754 |
| Deletion test: mean score drop, 3 random features | 0.224 |
| Pairs where the top 3 matter more than random | 100.0% (of 300) |

## Example breakdowns (top 3 features making them alike; the feature pulling them apart most)

| Player | Comp | Comp's rank | Most alike on | Least alike on |
|---|---|---|---|---|
| Michael Jordan | Kobe Bryant | 1 | usg_percent (+0.69), fga_per_100_poss (+0.38), stl_percent (+0.33) | tov_percent (-0.07) |
| Shaquille O'Neal | Dwight Howard | 2 | orb_percent (+0.41), drb_percent (+0.36), blk_percent (+0.35) | fga_per_100_poss (-0.04) |
| Dennis Rodman | Reggie Evans | 6 | orb_percent (+1.26), drb_percent (+1.01), fga_per_100_poss (+0.32) | f_tr (-0.04) |
| John Stockton | Chris Paul | 1 | ast_percent (+0.93), stl_percent (+0.86), blk_percent (+0.27) | x3p_percent_shrunk (-0.10) |
| Steve Nash | Mark Price | 2 | ast_percent (+0.61), ft_percent_shrunk (+0.41), pf_per_100_poss (+0.32) | x3p_percent_shrunk (-0.08) |

## Map

UMAP on every season's embedding (n_neighbors 15, min_dist 0.1, metric cosine, random_state 2026). Trustworthiness (10 neighbours, 3,000-season sample): **0.928** (1.0 = every 2D neighbourhood is a real neighbourhood). The map is for display only: comps are always computed in the full embedding (feature note, check 6).

## Gate (phase6_plan.md section 6)

- PASS: Every player has 10 comps
- PASS: Every player has a why-similar breakdown for his top 5
- PASS: Every season has map coordinates
- PASS: Completeness error under 1% on average
- PASS: Deletion test: top-3 features matter more than random, on average and in at least 70% of pairs
- PASS: Two runs give identical export checksums

If a line fails, it is recorded as a finding; the metric is not changed.

## Exports (`exports/`, git-ignored; regenerate with `python src/precompute.py`)

| File | Bytes | SHA-256 (first 16) |
|---|---|---|
| players.json | 434,962 | 7b9f8618ff7887ea |
| comps.json | 1,415,328 | 365efcce02d3d37e |
| why.json | 4,884,715 | 93f59c43bea04cd8 |
| seasons_umap.csv | 424,978 | 72cbb13c27a4c756 |
| profiles.npz | 1,237,952 | 6a4b008c0c43b9ba |

Run time: 0.5 minutes.

