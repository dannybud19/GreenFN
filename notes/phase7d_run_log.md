# Phase 7d run log

Status: running

| Checkpoint | Commit | Notes |
|---|---|---|
| 0 Plan and lab | 7b8f06e | |
| 1 Data | this commit | 14,672 of 14,672 seasons matched |

## Issues and fixes

- `data/` and `exports/` are git-ignored, so the worktree links to the main checkout's copies (symlinks, excluded locally in `.git/info/exclude`, never committed). `precompute.py` was not run: 7d needs only `export_web.py`.
- `nothing-style.md` does not mention the old no-raw-stats rule, so it needed no change; the data credit (meta.json, shown in the About card) now names the CC0 licence and the per-game averages.

- Branch base: phase-7c-polish is merged (PR #10), so `phase-7d-graph` was created from `main` (728266d) in the worktree `../GreenFN-7d`.

## Key numbers
- Per-game rows matched: 14,672 of 14,672 app seasons (NBA rows; traded seasons use the 2TM to 5TM combined row). Known values exact: Jordan 1987 37.1 / 5.2 / 4.6, Jordan 1992 30.1 / 6.4 / 6.1, Stockton 1985 5.6 / 1.3 / 5.1
- Badge colours and contrast:
- Tests (count) and parity:
- Build:
- Lighthouse accessibility:
- Screenshots:

## Differences from the Graph Lab
