# Phase 7b run log

Status: finished

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|
| 0 Plan and design files | 45c60c6 | about 4 min | Figma MCP had no access to the file; tokens measured from the reference renders |
| 1 Data | f139d59 | about 4 min | precompute.py rewrote `reports/phase6_explain.md`; restored with `git checkout` |
| 2 Foundation | 9745576 | about 4 min | motion 14.14.0 pinned; old /map and /about removed and redirected |
| 3 Map panel | 513443f | about 5 min | Playwright 1.65.1 added as a dev dependency for screenshots |
| 4 Right column | 3f68fb3 | about 4 min | Type sizes re-measured and corrected |
| 5 Responsive, accessibility, tests | ea72c19 | about 2 min | Phone controls stacked; 6 lint errors fixed |
| 6 Verify | 74bbbbb | about 7 min | Breakpoint ordering bug found in the production build and fixed |
| 7 Wrap up | this commit | | |

## Issues and fixes

- **Figma MCP: no access.** `create_session` and `get_screenshot` both returned "Figma could not access the requested file" for `rudsn3TASAFVvBxYq40VFK` (debug ids `da836453-6917-4cbe-a6c4-b35007f8abc0`, `91f9566a-3638-412b-a33b-080f201e250d`). The connected Figma account has no access to the file. Following the runbook fallback, colours were sampled from `notes/design/ref-*.png` (2x renders of the same frames) and sizes measured from them into `notes/design/figma_tokens.md`. No `get_design_context` call was made.
- **Branch base.** PR #8 (phase-7) is not merged, so `phase-7b-redesign` was branched from `phase-7`.
- **Multi-team seasons.** Basketball Reference codes a traded season as `2TM` to `5TM`, with the real teams in the `teams` column (for example `MIL/BOS`). `map.json` stores the slash list, and a traded season counts for every team in it. There are 40 real team codes, not the 44 in the mock-up's "All 44 teams" (which counted the xTM codes).
- **precompute.py rewrites `reports/phase6_explain.md`.** Restored with `git checkout -- reports/phase6_explain.md` as the runbook says. No other "never touch" file changed.
- **Type sizes.** The first token pass overestimated the Doto and body sizes by about 15%. They were re-measured from glyph advance widths (wordmark 24, hero 30, team code 32, body 12.5).
- **Breakpoint bug (production only).** `min-[1200px]:` sorted before `md:` (48rem), so 1440 px showed the tablet layout. A `--breakpoint-xl: 75rem` (1200 px) sorts correctly.
- **Custom CSS beat utilities.** `.label` was unlayered, so `text-ink` on "START HERE" was ignored. Moved into `@layer components`.
- **Contrast.** Lighthouse flagged the light `muted` grey `#7A7A76` at 4.3:1. It was darkened to `#6E6E6A` to pass WCAG AA. The faint Doto row numbers (`#B4B4AE`, 2.1:1) are kept as designed: the rank is also given by list order.
- **Lint.** Six React hooks errors (setState in effects, refs read during render) fixed without changing behaviour. `npx eslint src scripts` is clean.
- **Why-similar sentence.** The frames say "Both used a lot of their team's possessions, took a lot of shots...". A positive attribution means the two careers are alike on a stat, not that both are high, so the 15 phrases name the stat instead ("Both match closely on how much of the offence ran through them, how often they shot and how often they got steals.").
- **Attribution.** The old footer is gone (one page). The data attribution from `meta.json` now sits in the About card, with the note that the map and regions are a reading aid.

## Key numbers
- Motion version / Next.js version: motion 14.14.0, Next.js 16.4.6, React 19.3.0, Playwright 1.65.1 (dev only)
- Region check (k-means 9, random_state 0, n_init 10, on the map coordinates; top 3 mean within-season z-scores):
  - Region 1: x3p_ar +1.07, x3p_percent_shrunk +0.83, ft_percent_shrunk +0.79; top position SG; **Shooting guards** kept
  - Region 2: blk_percent +1.71, orb_percent +1.53, drb_percent +1.22; C; **Rim protectors** kept
  - Region 3: orb_percent +1.01, pf_per_100_poss +0.93, drb_percent +0.88; PF; **Energy bigs** kept
  - Region 4: ast_percent +1.30, tov_percent +0.93, stl_percent +0.85; PG; **Floor generals** kept
  - Region 5: x3p_ar +1.21, x3p_percent_shrunk +0.42, ft_percent_shrunk +0.17; SF; **Stretch wings** kept
  - Region 6: drb_percent +0.99, usg_percent +0.81, blk_percent +0.78; PF; **Scoring bigs** kept
  - Region 7: ast_percent +1.54, usg_percent +1.30, fga_per_100_poss +1.17; PG; draft "Shooting point guards" did not match (no threes in the top 3), so the neutral name **Region 7** is used. Michael Jordan, Kobe Bryant and most of Jordan's comps sit here
  - Region 8: orb_percent +0.17, drb_percent +0.16, x2p_percent_shrunk +0.15; SF; **All-round forwards** kept (every mean z under 0.5)
  - Region 9: fga_per_100_poss +0.83, usg_percent +0.77, ft_percent_shrunk +0.37; SG; **Primary scorers** kept
- Legends skipped: none (10 of 10 found). Closest matches: Jordan to Kobe Bryant, LeBron to Dwyane Wade, Kobe to Donovan Mitchell, Curry to Mark Price, Shaq to Tim Duncan, Duncan to Pau Gasol, Magic to Tyrese Haliburton, Bird to Stephen Curry, Jokić to Kevin Garnett, Garnett to Karl Malone
- Teams covered / codes named: 40 codes in the data, 40 named (historic included: KCK, SDC, WSB, NJN, SEA, VAN, CHH, CHA, NOH, NOK)
- Data size committed: `web/public/data/` 4.93 MB (4,925,008 bytes, 2,475 files); map.json 0.44 MB, teams.json 0.02 MB, regions.json and legends.json under 1 KB
- Tests (count) and parity (top-1 / top-10 set): 31 pass (17 from Phase 7 plus 14 new); parity top-1 100.00% (2,467 of 2,467), top-10 set 99.88% (2,464), exact order 99.64%
- Build: pages generated: 2,471 (2,467 player pages, /, /_not-found and build internals); `npm run build` passes; ESLint and TypeScript clean
- Lighthouse accessibility: 97 on `/` (only the faint row numbers flagged), 100 on `/player/jordami01`; performance 100, best practices 100 on both
- Screenshots taken: 20 in `notes/design/built/` (start, legends, team CHI, player Jordan, Kobe comp open with inner scroll, About open, phone and phone start, in light and dark; player and comp under reduced motion in both themes)
- Local checks (next start): `/` 200; `/player/jordami01` 200 and contains "Kobe Bryant"; `/player/doesnotexist` 404; `/map` and `/about` 308 to `/`. In the browser: lambda 1 reorders Jordan's comps and "Back to default" restores them; theme toggle sets `data-theme` and persists after reload; keyboard reaches every control (`/`, arrows, Enter picks a player; Enter opens a comp)

## Still different from the Figma frames
- The Figma file itself could not be read; comparisons are against the reference renders only.
- Real data, not the mock-up's: Jordan's closest match is Kobe Bryant (the frame shows Dwyane Wade), team lists count traded seasons (Hinrich 11, Deng 10), and Jordan's comps are tagged "Region 7" rather than "Primary scorers".
- The player panel header says "Clear ×" where the frames show "SCROLL ↓", so a selection can be cleared without the keyboard.
- The why sentence wording (see above), and the "· differs" suffix comes from the About reference render.
- The team dropdown uses the native select list when open (the closed state matches the frames).
- The A1 team code and the hover tooltip on map dots are additions the frames don't show.
