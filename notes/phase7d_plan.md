# Phase 7d plan: map grid and career playback

Written 19 Nov 2026, before any code. Builds on Phase 7b (dashboard) and 7c (polish). The reference is Danny's approved **Graph Lab** prototype, copied to `notes/design/graph-lab/index.html`. Copy its behaviour, not its code style: the app uses React, TypeScript and Motion. The lab ran on a sandbox copy of the map data, so its map shape can differ slightly from the app's. Always use the app's own data.

If a rule changes, record it in the change log with the reason.

## 1. What changes

| Area | Now | After 7d |
|---|---|---|
| Grid labels | Letters A to H across, numbers 1 to 6 down | **Numbers only, 0 to 100 on both axes, origin at the top-left corner**: across goes 0 to 100 left to right, down goes 0 to 100 top to bottom. 0 to 100 spans the data's bounding box |
| Grid density | Fixed 8 x 6 cells | **Adaptive**: major lines at a "nice" step (1, 2 or 5 times a power of ten) chosen so they sit about 90 px apart on screen; minor lines at a fifth of that, fading in as they get far enough apart (fully visible at about 24 px). Labels only on major lines, with decimals when the step is below 1. Labels on the top and left edges follow the visible range |
| Pan and zoom | 7c behaviour | At **1x the map does not move at all**. Zoomed in (up to 8x), panning is clamped so the 1x frame always covers the container: `tx` between `W*(1-k)` and 0, `ty` between `H*(1-k)` and 0. Apply after every drag, wheel, pinch, button zoom and resize |
| Team code | Centred in cell A1 | Centred in the top-left major cell at 1x (0 to 10 by 0 to 10), moving and scaling with the grid. Letters only, never a logo |
| Career playback | None | New (section 2) |
| Load animation and magnetic hover | Tried in the lab | **Rejected by Danny. Don't build them** |

## 2. Career playback

| Part | Behaviour |
|---|---|
| Start | A **"▶ Play career"** button in the player card (next to the stats row). Pressing it zooms the map to fit the player's seasons (600 ms ease, at most 4x) and plays them in order, one season every 900 ms (250 ms under reduced motion) |
| On the map | His seasons appear one at a time as red dots, each with a short pulse when it arrives (no pulse under reduced motion). Seasons not yet played are hidden; the rest of the map dims. No connecting lines |
| The bar | **One slim line, centred at the top of the map container**: `‹  PLAYER NAME  YEAR  07/14 │ PTS 30.1 ▼ 1.4   REB 6.4 ▲ 0.4   AST 6.1 ▲ 0.6  ›`. Year and values in Doto, everything else Geist Mono. It never takes more than one line on desktop; on phones it scrolls sideways inside itself |
| Values | Points, rebounds and assists **per game** for that season. Each value counts from last season's value to the new one (450 ms, Motion `animate`) |
| Change badges | Next to each value: **green ▲** if it went up, **red ▼** if it went down, **grey =** if it stayed the same to one decimal. The badge pops in (scale and fade, slight overshoot) and the value flashes the same colour for 700 ms, then settles. The first season shows no badges |
| Arrows | ‹ and › step one season back or forward and pause playback. **‹ is disabled (greyed, not clickable, skipped by keyboard) on the first season, › on the last** |
| Controls | Play / Pause / Replay on the same button; switching player restarts; Esc or Clear stops playback and restores the normal view |
| Accessibility | Each stat has an `aria-label` like "PTS 30.1, down 1.4 from last season"; a polite live region announces the year. Colours meet contrast (section 4) |

## 3. Data

Extend `src/export_web.py` (don't change the model or `precompute.py`):

- Read `data/raw/Player Per Game.csv`, keep `lg == "NBA"`, one row per player and season: the combined row when a player was traded (team code `TOT` or matching `^\d+TM$`), otherwise the only row.
- For every **qualified season already in the app**, add points, rebounds and assists per game, rounded to one decimal, to `player/<id>.json` as `seasons: [[season, pts, reb, ast], ...]` in season order.
- Every app season must match. If any season has no per-game row, stop and report it.
- **Rule change:** the app previously published no raw box-score stats. Danny approved publishing these three per-game averages (the Kaggle dataset is CC0). Record this in the change log, in the About card's data credit, and in `nothing-style.md` if it mentions the old rule.

Known values for tests (from the dataset): Michael Jordan 1987 = 37.1 PTS, 5.2 REB, 4.6 AST; Jordan 1992 = 30.1 PTS, 6.4 REB, 6.1 AST; John Stockton 1985 = 5.6 PTS, 1.3 REB, 5.1 AST.

## 4. Visual tokens (add to the theme)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--up` | #3DDC84 | #0E7A4A | Up badges and flashes |
| `--down` | the existing red | the existing red | Down badges and flashes |
| `--same` | the existing mute grey | the existing mute grey | "=" badges |

Check every badge colour against its background at 4.5:1 (the badges are small text). If one fails, darken it in light mode or lighten it in dark mode until it passes, and log the final values.

## 5. Checkpoints

Work in a git worktree: `git worktree add ../GreenFN-7d -b phase-7d-graph main` (after 7c is merged; otherwise branch from `phase-7c-polish` and say so). Commit and push at each checkpoint. Commit messages: one subject line, no co-author or session lines, no em dashes.

| # | Work | Commit message |
|---|---|---|
| 0 | Commit this plan and `notes/design/graph-lab/index.html`; create `notes/phase7d_run_log.md` | `Phase 7d: plan and graph lab reference` |
| 1 | Data (section 3) and its tests | `Phase 7d: per-game points, rebounds and assists per season` |
| 2 | Grid: numbers only, top-left origin, adaptive major and minor lines, labels following the view; team code in the top-left major cell | `Phase 7d: adaptive 0 to 100 grid` |
| 3 | Pan and zoom bounds (section 1) with a Playwright test: drag at 1x leaves the transform unchanged; at 4x, drags far in all four directions keep the frame covering the container | `Phase 7d: bounded pan and zoom` |
| 4 | Career playback (section 2) | `Phase 7d: career playback` |
| 5 | Tests, checks, screenshots, PR | `Phase 7d: verified` |

## 6. Gate

- `npm test` passes: all existing tests, plus new ones for the per-game data (the known values above), the badge rule (up, down, same, first season), the grid step choice, the pan clamp and the disabled arrows.
- Parity unchanged: top-1 100%, top-10 set at least 99%.
- `npm run build` passes; Lighthouse accessibility on `/` stays at 100.
- The 7c container-size check still passes with playback running (the bar must not resize anything).
- Screenshots at 1440x900 in both themes into `notes/design/built/`: grid at 1x; grid at 4x and 8x (finer lines visible); playback mid-career for Jordan with a mix of up and down badges; the first season (‹ disabled) and the last (› disabled).
- Draft PR `phase-7d-graph` into `main` with the screenshots. When every check passes and the Vercel preview builds, merge it, wait for the production deploy, and check https://greenfn-seven.vercel.app anonymously (`/` 200, `/player/jordami01` 200 with Kobe Bryant).
- If a line fails, record it as a finding.

## Change log

| Date | Change | Reason |
|---|---|---|
| 19 Nov 2026 | Box-score per-game averages (PTS, REB, AST) published for qualified seasons | Danny approved for career playback; dataset is CC0 |
| 19 Nov 2026 | Grid numbers use the label grey (`--muted`) instead of the axis grey | The axis grey was 2.47:1 on white; Lighthouse flagged it. The lab used the label grey too |
| 19 Nov 2026 | Pan clamp built ahead of checkpoint 3 | Already on main from the 7c follow-up fix (728266d); checkpoint 3 adapted its test to the number grid |
