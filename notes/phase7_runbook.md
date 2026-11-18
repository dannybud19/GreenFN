# Phase 7 runbook (for Claude Code)

This file tells Claude Code how to build the GreenFN app in one unattended pass. Read all of it, plus `notes/phase7_plan.md`, before starting. Repo `~/Desktop/GreenFN`, branch `phase-7`, Python venv activated with `source .venv/bin/activate` for the Python steps.

The plan file wins over this runbook if they disagree.

## 0. Ground rules

| Rule | Detail |
|---|---|
| Commit at every checkpoint | Each checkpoint ends with a commit and a push to `origin/phase-7`. Commit only what the checkpoint names |
| Commit identity | Already set in the repo config. Check `git config user.email` first |
| Commit messages | One subject line, plus a short body when useful. No co-author or session lines |
| Never touch | Anything in `src/` except the new `src/export_web.py`, every report, `config/`, `notes/` other than the Phase 7 files, `data/`, `models/`, `exports/` (git-ignored) |
| No model changes | The app shows Phase 6's outputs. If a number looks wrong, log it; don't change the model |
| Numbers in copy | Any number in the app's text must come from `reports/` exactly (section 6 lists them). Never round differently or invent one |
| No raw stats published | `web/public/data/` holds only what `export_web.py` writes |
| Don't deploy | Deploying is Danny's step (licence check and Vercel login). Build and verify locally only |
| Don't merge | Leave the PR as a draft |
| No em dashes | In app copy, files and commit messages |
| Log everything | Keep `notes/phase7_run_log.md` up to date (section 8) |

### When to stop and wait for Danny

- `node -v` is missing or below 20
- `export_web.py` raises, or the parity test fails its thresholds
- `git status` shows a change to a "Never touch" file
- `npm run build` fails twice with the same error after one minimal fix attempt

Everything else is logged and the run carries on.

## 1. What already exists

| File | State | What it is |
|---|---|---|
| `notes/phase7_plan.md` | Saved, not committed | Decisions, pages, data, slider maths, gate |
| `notes/phase7_runbook.md` | Saved, not committed | This file |
| `src/export_web.py` | Saved, not committed | Writes `web/public/data/` from `exports/`. Tested by Claude on a full set of exports |
| `web/` | Placeholder folder from Phase 0 | Becomes the Next.js app |

Measured by Claude on the real exports: slider parity at lambda 0 is 100% for the top comp, 99.96% for the top-10 set, 99.72% for exact order.

## 2. Checkpoint 0: commit the plan

Create `notes/phase7_run_log.md` (section 8), status `running`. Check `node -v` (20 or later) and `npm -v`.

**Commit:** `notes/phase7_plan.md`, `notes/phase7_runbook.md`, `notes/phase7_run_log.md`. Message `Phase 7: plan written before any app code, runbook, run log`. Push.

## 3. Checkpoint 1: app data

1. `cd src && python precompute.py` (about a minute; refreshes `exports/`), then `python export_web.py`.
2. Check: 2,467 files in `web/public/data/player/`; `players.json`, `map.json`, `profiles.json`, `parity.json`, `meta.json` exist; none of them contains raw stat column names such as `ts_percent` as data fields except `meta.json`'s feature list (grep and log).

**Commit:** `src/export_web.py` and `web/public/data/`. Message `Phase 7: app data from the Phase 6 exports`. Push.

## 4. Checkpoint 2: scaffold

`create-next-app` refuses a folder that already has files, so scaffold beside it and move in:

```
cd ~/Desktop/GreenFN
npx create-next-app@latest web-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

Move everything from `web-scaffold/` into `web/` except anything that would overwrite `web/public/data/`, then delete `web-scaffold/`. Remove the starter page content. Add `vitest` as a dev dependency with an `npm test` script. Make sure `web/.gitignore` ignores `node_modules` and `.next`.

Check `cd web && npm run build` passes on the empty app.

**Commit:** the scaffold (not `node_modules`, not `.next`). Message `Phase 7: Next.js scaffold`. Push.

## 5. Checkpoint 3: data layer, scoring and tests

In `web/src/lib/`:

| File | Content |
|---|---|
| `data.ts` | Types and loaders. Server side (build time): read `public/data/*.json` with `fs` for static generation. Client side: `fetch('/data/...')` |
| `score.ts` | `careerScores(profiles, i, lambda)` returning scores for every player against player i (himself excluded), exactly the formula in plan section 4; `topK(scores, k)` |
| `format.ts` | Small helpers: years ("1985 to 2003"), spread percentile in words ("steadier than 99% of players with 4+ seasons" when known), feature labels from `meta.json` |

Tests (`web/src/lib/*.test.ts`, Vitest):
- `score.test.ts`: a tiny hand-made profile set with a known answer; lambda 0 ignores spread; raising lambda reduces the spread gap of the top comps.
- `parity.test.ts`: for every player, the TypeScript top 10 at lambda 0 vs `parity.json`. Pass if the top comp matches for **every** player and the top-10 set matches for **at least 99%**. Print both rates; log them.

**Commit:** `web/src/lib/`. Message `Phase 7: data layer, slider scoring and parity test`. Push.

## 6. Checkpoint 4: pages

Build the four pages in plan section 2. Visual direction: clean and sporty, light and dark themes, a single accent colour, readable on a phone. No chart libraries: SVG for bars, canvas for the map.

**Player page details**
- Statically generate all players with `generateStaticParams` from `players.json`.
- Comps list: rank, name (link to his page), years, a score bar (scaled within the list), and position.
- Slider: label "Career shape weight (lambda)", 0 to 1 in steps of 0.05, default 0, with a one-line explanation: "Higher values favour careers with a similar consistency, not just a similar style." Moving it loads `profiles.json` once and recomputes the top 10 with `score.ts`. Show a "back to default" button.
- Why similar: selecting a comp that has a breakdown (top 5 at lambda 0) shows a horizontal diverging bar chart of the 15 stats using `meta.json` labels, sorted by value, with a caption: "Positive bars: stats that make them more alike than an average player would be. Computed with integrated gradients." For other comps: "Breakdowns are precomputed for the default top 5."
- Mini map: the player's seasons from his own file as a line with dots (labelled first and last season), his top 5 comps' trajectories faint behind (from `map.json`, loaded on demand).

**Map page**: canvas scatter of `map.json` (all seasons), colour toggle decade / position with a legend, player search that draws his trajectory and zooms to it, and the note: "The map is a 2D picture for intuition. Comps are computed in the full 32-dimension model, not from distances on this map."

**About page**: use only these numbers, as written:

| Claim | Number | Source |
|---|---|---|
| Players / seasons covered | 2,467 players, 14,672 seasons (1980 to 2026) | `reports/phase6_explain.md` |
| Career profiles vs best-season matching, split-half hit@10 | 0.981 vs 0.916 | `reports/phase5_career.md` |
| Sanity comps (pass / partial / fail) | 11 / 4 / 0 for career comps, vs 6 / 8 / 1 for the best Phase 2 baseline | Phase 5 and Phase 2 reports |
| Era probe after season centring (chance 0.20) | 0.227, down from 0.323 | `reports/phase4_era.md` |
| Explanation checks | completeness error 0.106% on average; deletion test: top 3 stats matter more than random in 300 of 300 pairs | `reports/phase6_explain.md` |

Limits to state: Nash and Chris Paul is the one known pair no method finds; era is removed for a linear reader, not entirely; Kareem's data starts in 1980; one model seed; sanity marks are human judgements (Danny's, plus researched consensus he delegated). Link: `https://github.com/dannybud19/GreenFN`.

**Footer on every page**: the attribution from `meta.json`.

**Commit:** the pages and components. Message `Phase 7: search, player, map and about pages`. Push.

## 7. Checkpoint 5: verify

1. `cd web && npm test` (all pass, parity rates logged) and `npm run build` (no type or lint errors; about 2,470 static player pages).
2. `npm start`, then with `curl`: `/` returns 200; `/player/jordami01` returns 200 and contains "Kobe Bryant"; `/map` and `/about` return 200; a missing player id returns 404. Stop the server.
3. Add a short "Run the app" section to the repo `README.md`: `python src/precompute.py`, `python src/export_web.py`, `cd web && npm install && npm run dev`; and how to deploy on Vercel (import the repo, root directory `web`).

**Commit:** `README.md` and any fixes from verification. Message `Phase 7: verified locally, README run instructions`. Push.

## 8. Checkpoint 6: wrap up

Run log (`notes/phase7_run_log.md`):

```
# Phase 7 run log

Status: running | stopped (reason) | finished

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|

## Issues and fixes

## Key numbers
- Node / Next.js versions:
- Parity (top-1 / top-10 set / exact order):
- Build: pages generated, build time, bundle notes:
- Data size committed:
- Local checks (each URL and result):
```

**Commit:** the run log (and a plan change-log row if anything deviated). Message `Phase 7: run log`. Push.

Open a **draft** pull request `phase-7` into `main`, titled `Phase 7: GreenFN app (local build verified, deploy pending)`, summarising what's built and the checks. Don't merge, don't deploy.

Final message to Danny: PR link, versions, parity rates, build result, local checks, data size, anything that needed a fix, and his two deploy steps (confirm the licence; import the repo into Vercel with root directory `web`).
