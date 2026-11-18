# Phase 6 run log

Status: finished

Run started 18 Nov 2026, 01:31 (local time); last checkpoint commit at about 01:35, so roughly 3 to 4 minutes of wall time by the clock. One full precompute run takes about 35 seconds.

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|
| 0 Plan, runbook, run log | 47816fb | n/a | Runbook, plan and both code files read in full before running anything. `models/phase4/adversary_lambda0.0_s2026.pt` exists |
| 1 Code, git-ignore, quick run | adcc0d2 | 19 s | `exports/` added to `.gitignore`. Quick run: 2,467 players, 14,672 seasons, completeness error 0.113% mean, deletion drop 0.750 vs random 0.225, trustworthiness 0.925. Quick report deleted before the commit; no file under `exports/` tracked |
| 2 Full run and reproducibility | 4e06bb0 | 35 s per run | Run 1 and run 2 give identical SHA-256 for all five export files. Report: coverage complete, 5 PASS gate lines, plus the sixth line added by hand (`PASS: Two runs give identical export checksums`) |
| 3 Notebook | 0e29840 | 4 s | `notebooks/06_explain.ipynb`, 0 error outputs, export sizes asserted equal to the report, nothing changed under `reports/`, nothing under `exports/` tracked |
| 4 Wrap up | (this commit) | n/a | Draft PR opened, not merged |

## Issues and fixes
- No crashes, no "chosen setting doesn't match" error, no change to any "never touch" file, no export file staged, no fix to any code file.
- Nothing deviated from `notes/phase6_plan.md`, so its change log was left alone.
- Wording quirk in the generated report (not changed): "Pairs with completeness error under 1%" reads 100.0%, but the maximum completeness error is 2.329%, so at least one of the 12,335 pairs is above 1%. The percentage is rounded; the gate (mean under 1%) is unaffected.
- The `created` timestamp in `manifest.json` differs between runs by design; reproducibility was checked on the `files` SHA-256 values only, as the runbook says.

## Key numbers
- Players / seasons covered: 2,467 / 14,672 (every player has 10 comps and a top-5 breakdown; every season has map coordinates).
- Completeness error (mean / max): 0.106% / 2.329% over 12,335 pairs.
- Deletion test (top-3 drop / random drop / share of pairs): 0.754 / 0.224 / 100.0% of 300 pairs.
- Trustworthiness: 0.928 (10 neighbours, 3,000-season sample; reported, not gated).
- Reproducibility (checksums match?): yes, all five files.
- Export sizes: players.json 434,962 bytes; comps.json 1,415,328; why.json 4,884,715; seasons_umap.csv 424,978; profiles.npz 1,237,952 (about 8.4 MB in total).
- Gate lines: PASS 10 comps per player; PASS top-5 breakdown per player; PASS map coordinates for every season; PASS mean completeness error under 1%; PASS deletion test; PASS identical export checksums across two runs.
- Example breakdowns (most alike on): Jordan/Kobe usg_percent, fga_per_100_poss, stl_percent; Shaq/Howard orb_percent, drb_percent, blk_percent; Rodman/Reggie Evans (his rank 6 comp) orb_percent, drb_percent, fga_per_100_poss; Stockton/Chris Paul ast_percent, stl_percent, blk_percent; Nash/Mark Price ast_percent, ft_percent_shrunk, pf_per_100_poss.
