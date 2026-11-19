# Phase 7d run log

Status: finished

| Checkpoint | Commit | Notes |
|---|---|---|
| 0 Plan and lab | 7b8f06e | |
| 1 Data | dd9b838 | 14,672 of 14,672 seasons matched |
| 2 Grid | fe54fb8 | At 1x major step 50 (minor 10, fully visible); at 8x major 5, minor 1 |
| 3 Bounded pan and zoom | 0c126ef | The clamp was already on main (728266d, the 7c follow-up fix); this checkpoint adapts `scripts/check-pan.mjs` to the number grid. 13 of 13 pass; zoom checks 17 of 17 |
| 4 Career playback | 9ea733a | `scripts/check-playback.mjs` 21 of 21 |
| 5 Verified | this commit | Tests, parity, build, browser checks, Lighthouse, screenshots |

## Issues and fixes

- The worktree's dev server once served stale CSS (new `--up` tokens missing, so badges rendered in ink); a restart fixed it. Production builds are unaffected.

- `data/` and `exports/` are git-ignored, so the worktree links to the main checkout's copies (symlinks, excluded locally in `.git/info/exclude`, never committed). `precompute.py` was not run: 7d needs only `export_web.py`.
- `nothing-style.md` does not mention the old no-raw-stats rule, so it needed no change; the data credit (meta.json, shown in the About card) now names the CC0 licence and the per-game averages.

- Branch base: phase-7c-polish is merged (PR #10), so `phase-7d-graph` was created from `main` (728266d) in the worktree `../GreenFN-7d`.

## Key numbers
- Per-game rows matched: 14,672 of 14,672 app seasons (NBA rows; traded seasons use the 2TM to 5TM combined row). Known values exact: Jordan 1987 37.1 / 5.2 / 4.6, Jordan 1992 30.1 / 6.4 / 6.1, Stockton 1985 5.6 / 1.3 / 5.1
- Badge colours and contrast (on the bar's solid surface, small text needs 4.5:1; none needed adjusting): light up #0E7A4A 5.38:1, down #D71921 5.18:1, same #6E6E6A 5.12:1; dark up #3DDC84 11.03:1, down #FF2D2D 5.31:1, same #8C8C88 5.83:1
- Tests (count) and parity: 46 pass (12 files; new: per-game known values and coverage, grid step and lines, pan clamp, badge rule, disabled arrows, career fit); parity top-1 100.00% (2,467), top-10 set 99.88% (2,464), exact 99.64% (unchanged)
- Build: passes, 2,471 static pages; ESLint and TypeScript clean. Browser checks on the production build: playback 21 of 21, pan 13 of 13, zoom 17 of 17, KEY layout 18 of 18, container sizes identical in 10 states (including playback running and paused on the last season) in both themes
- Lighthouse accessibility: 100 on `/` and on `/player/jordami01` (performance 100, best practices 100). First run flagged the grid numbers in the old axis grey (2.47:1); they now use the label grey, as in the lab
- Screenshots (1440x900, light and dark, `notes/design/built/`): grid-1x, grid-4x, grid-8x, playback-mid (Jordan 1992: PTS down 1.4, REB up 0.4, AST up 0.6), playback-first (‹ disabled), playback-last (› disabled)

## Differences from the Graph Lab

- Grid numbers sit in the map's gutters (above and left of the plot, as the app's labels already did), not drawn on the canvas at the data box's edge as in the lab.
- The bar has a solid surface background, not the lab's 90% translucent blur, so badge contrast never depends on the dots behind it.
- The Play button lives in the player card ("▶ Play career", per the plan), not in a header with a player picker; any selected player can be played.
- Zoom buttons keep the app's 2x step (the lab used 1.6x).
- The lab's on-map hint ("Drag to move...") is not shown (nothing-style: no captions on the map).
- Played seasons are SVG circles over the canvas (as the app's selected dots already were); the lab drew them on the canvas.
- The team code scales with the zoom inside its 0 to 10 cell (the lab had no team code).
- The map shape comes from the app's own data, so it differs slightly from the lab's sandbox copy.
- Load animation and magnetic hover: not built (rejected).
