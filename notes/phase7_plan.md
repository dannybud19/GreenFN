# Phase 7 plan: the app

Written before any app code. Earlier plans still apply. If a rule changes, record it in the change log with the reason.

## 1. Decisions (Danny, 18 Nov 2026)

| Decision | Choice | Why |
|---|---|---|
| Architecture | **Next.js only**, on Vercel. No separate Python server | The model's outputs are small precomputed files (Phase 6). Pages and API routes read them; the lambda slider runs in TypeScript. One app, one deploy, free tier |
| Hosting | **Public**, on its own Vercel URL (for example `greenfn.vercel.app`) | Linkable from the CV and portfolio; can move to a custom domain later |
| FastAPI | Not in v1 | Only needed if the app later runs the model live (for example comps for a user's own stats). Recorded as a possible v2 |

This replaces the roadmap's "FastAPI endpoints" line for v1.

## 2. What the app shows

| Page | Content |
|---|---|
| `/` Search | Type-ahead over every player (name, years, position). A few example players as links |
| `/player/[id]` | Header: name, years, seasons, position, career shape (spread percentile in words, e.g. "steadier than 99% of players"). Top 10 career comps with a score bar and each comp's years. **Lambda slider** (0 to 1): recomputes the comps live; at 0 it matches the precomputed list. **Why similar**: click a comp to see a bar chart of the 15 stats (positive = alike, negative = different), for the top 5 at lambda 0; other comps say the breakdown is only precomputed for the default top 5. **Mini map**: the player's career as a line through his seasons, his comps' careers faint behind it |
| `/map` | Every season on the 2D map (canvas, about 14,700 points), coloured by decade or position (toggle). Search a player to draw his career trajectory. A note that the map is for intuition only and comps are computed in the full model |
| `/about` | What GreenFN is, how it works (seasons, encoder, era centring, career profiles), the headline results from the reports (with numbers exactly as in `reports/`), honest limits (Nash and Paul, era only removed for a linear reader, Kareem only from 1980, one seed), data attribution, link to the GitHub repo |

Every page carries the data attribution in the footer.

## 3. Data for the app

`src/export_web.py` turns `exports/` into `web/public/data/`:

| File | Size (about) | Used by |
|---|---|---|
| `players.json` | 0.25 MB | Search, names everywhere |
| `player/<id>.json` (one per player) | 2 to 4 KB each | The player page: comps, why-similar, his map points |
| `map.json` | 0.4 MB | The map page |
| `profiles.json` | 1.2 MB | The lambda slider (loaded only when the slider moves) |
| `parity.json` | 0.2 MB | Tests only |
| `meta.json` | small | Feature labels, model provenance, attribution |

Only derived outputs are published: names, seasons, positions, comps, scores, breakdowns and map points. **No raw stat tables.** `web/public/data/` is committed (Vercel builds from GitHub); `exports/` stays git-ignored.

**Before the first public deploy, Danny confirms the Kaggle dataset's licence allows publishing derived outputs.** If it doesn't, the app stays private.

## 4. The slider maths (TypeScript)

score(A, B) = alpha x cos(centre_A, centre_B) / s_centre + beta x cos(peak_A, peak_B) / s_peak - lambda x abs(spread_A - spread_B) / s_spread

with alpha 0.25 and beta 0.75 (from `profiles.json`), the scales from `profiles.json`, and the player himself excluded. This is the Phase 5 formula exactly; `src/career.py` `CareerScore` is the reference.

**Parity test:** at lambda 0, the TypeScript top 10 must match `parity.json` (the Python top 10). Rounding the profiles to 5 decimals can swap two near-tied comps, so the test requires an identical top-1 for every player and an identical top-10 set for at least 99% of players. The measured rate on the real exports is recorded in the run log.

## 5. Engineering

| Item | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript, a pinned version that `create-next-app` installs today |
| Styling | Tailwind CSS |
| Charts | Hand-built SVG for the bars and score bars; `<canvas>` for the map (no chart library) |
| Rendering | Player pages statically generated at build time from `web/public/data/` (about 2,470 pages) |
| Tests | Vitest: the scoring function, the parity test, and data loading. `next build` must pass with no type errors |
| Accessibility | Keyboard-usable search and slider, labelled controls, colour not the only signal on the map |
| Location | `web/` (the placeholder folder from Phase 0) |

## 6. Gate

- This plan is committed before any app code.
- `export_web.py` writes every file; no raw stat tables in `web/public/data/`.
- Parity test passes (top-1 identical for every player; top-10 set identical for at least 99%).
- `npm test` and `npm run build` pass with no errors.
- All four pages work locally: search finds Jordan, his page shows Kobe in his comps, the slider changes the list, the why-similar bars appear for a top-5 comp, the map draws.
- Danny confirms the licence, then imports the repo into Vercel (root directory `web/`) and the public URL works.
- If a line fails, record it as a finding.

## Change log

| Date | Change | Reason |
|---|---|---|
| | | |
