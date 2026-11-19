# Phase 7 run log

Status: finished (local build verified; deploy pending Danny)

Run started 18 Nov 2026, 01:47 (local time); last checkpoint commit at about 01:57, so roughly 10 minutes of wall time by the clock. Most of that was `npm install` for the scaffold (about 2 minutes) and writing the pages.

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|
| 0 Plan, runbook, run log | 4174005 | n/a | Runbook, plan and `export_web.py` read in full first. Node v26.10.0, npm 11.19.1 |
| 1 App data | b938441 | 36 s | `precompute.py` then `export_web.py`: 2,467 player files, `players.json`, `map.json`, `profiles.json`, `parity.json`, `meta.json`. Only `meta.json` contains stat column names (its feature list). 4,730,105 bytes committed (4.7 MB) |
| 2 Scaffold | 657204b | 109 s | create-next-app 16.4.6; empty app built. Vitest installed |
| 3 Data layer, scoring, tests | 654b0f5 | 1 s per test run | `score.ts`, `data.ts`, `data.server.ts`, `format.ts`; 14 tests passing, parity measured below |
| 4 Pages | 63ee1d9 | 4 s build | Search, player, map and about pages; 2,473 static pages |
| 5 Verify | f2fd60c | n/a | 17 tests, lint, clean build, `curl` checks on a local server, README section |
| 6 Wrap up | (this commit) | n/a | Draft PR opened, not merged, not deployed |

## Issues and fixes
- **`precompute.py` rewrites `reports/phase6_explain.md`** (a "never touch" file) and drops its hand-added sixth gate line. Running the runbook's checkpoint 1 command showed that change in `git status`. I restored the file with `git checkout` before any commit, confirmed `git diff reports/` was empty, and nothing under `reports/` is changed on this branch. Treated as a side effect of the runbook's own command, not a stop reason; flagging it so the runbook can say to restore the report.
- **`web/public/data/` was git-ignored** by the root `data/` rule, so the first commit attempt staged only `export_web.py`. Fixed with an exception (`!web/public/data/`) in `.gitignore`; the root `data/` is still ignored. Committed as part of checkpoint 1.
- **Vitest install failed** (`ERESOLVE`): vitest 5.1.0 does not accept `@types/node` ^20, which the scaffold pins. Raised `@types/node` to ^24 (type-only package). No `--force`.
- **create-next-app turned on `cacheComponents` and `partialPrefetching`** in `next.config.ts`. I turned both off so player pages are ordinary static generation, as the plan describes (recorded in the plan's change log).
- **Port 3000 was already in use** by another Node process that I did not start (pid 60321), so my first `npm start` failed and the first `curl` results hit that other app. I did not touch it, ran GreenFN on port 3100 instead, and the results below are from port 3100. I stopped only my own server.
- **No real browser check.** The Claude in Chrome extension was not connected, so the slider, the why-similar chart and the map canvas were not driven in a browser. Covered instead by: the slider scoring tests on the real data (every player at lambda 0.5 and 1 returns 10 known comps, mean spread gap falls with lambda, Jordan's list changes), the server-rendered HTML of Jordan's page (comps in order, why-similar chart for Kobe Bryant, mini map, slider), lint, types and the build. Canvas drawing, hover and click behaviour are untested and need a quick look by Danny.
- The scaffold added an `AGENTS.md` (a note saying to read the bundled Next.js docs). I read the relevant docs (cacheComponents, generateStaticParams) before writing pages and committed the file with the scaffold.
- `npm install` reports 14 high-severity audit findings in the scaffold's dependency tree; not investigated or changed.
- The README's old "Status" paragraph still says Phase 2 is next. Left alone; only the "Run the app" section was added.

## Key numbers
- Node / Next.js versions: Node v26.10.0, npm 11.19.1, Next.js 16.4.6 (Turbopack), React 19.3.0, Vitest 5.1.0, TypeScript ^5.
- Parity (top-1 / top-10 set / exact order): 100.00% (2,467 of 2,467) / 99.88% (2,464) / 99.64% (2,458). Thresholds: every player for top-1, at least 99% for the set. The runbook's own earlier measurement was 100% / 99.96% / 99.72%; this run is slightly lower, presumably near-ties swapped by the 5-decimal rounding.
- Slider on real data: mean spread gap of the top 10 at lambda 0 / 0.25 / 0.5 / 1: 0.0331 / 0.0076 / 0.0045 / 0.0028 (falls at every step).
- Build: 2,473 static pages (2,467 player pages plus `/`, `/about`, `/map`, `/_not-found`), about 4 seconds, no type or lint errors; `.next` is 215 MB locally and not committed.
- Data size committed: `web/public/data/` 4,730,105 bytes across 2,472 files (player files 2.4 MB, profiles.json 1.39 MB, parity.json 0.33 MB, map.json 0.31 MB, players.json 0.30 MB).
- Tests: 5 files, 17 tests, all passing (scoring, parity, data loading, format, slider on real data).
- Local checks (port 3100): `/` 200; `/player/jordami01` 200 and contains Kobe Bryant, the slider label and its helper sentence, "Why similar" and "Back to default"; `/map` 200; `/about` 200 and contains every listed number exactly (2,467 players, 14,672 seasons (1980 to 2026); 0.981 vs 0.916; 11 / 4 / 0 vs 6 / 8 / 1; 0.227, down from 0.323; 0.106%; 300 of 300) and the GitHub link; `/player/doesnotexist` 404. The attribution footer is on all four pages.
- Gate: no raw stat tables in `web/public/data/` (PASS); parity (PASS); `npm test` and `npm run build` (PASS); four pages work locally (PASS by `curl` and server-rendered HTML, browser interactions not verified); licence confirmation and Vercel import are Danny's steps (PENDING).
