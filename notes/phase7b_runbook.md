# Phase 7b runbook (for Claude Code)

How to build the redesigned GreenFN dashboard in one unattended pass. Read all of it, plus `notes/phase7b_plan.md`, `design.md` and `nothing-style.md`, before starting. Repo `~/Desktop/GreenFN`. Python steps run in the venv (`source .venv/bin/activate`). The plan wins if the two disagree.

## 0. Ground rules

| Rule | Detail |
|---|---|
| Commit at every checkpoint | Commit and push to `origin/phase-7b-redesign`. Commit only what the checkpoint names |
| Commit identity | Already set in the repo config. Check `git config user.email` first |
| Commit messages | One subject line, plus a short body when useful. **No co-author or session lines** |
| Never touch | The model, `src/precompute.py`, every file in `reports/`, `config/`, `data/`, `models/`, earlier `notes/phase*` files. `exports/` stays git-ignored |
| No model changes | The app shows Phase 6 outputs. Regions are a display aid computed in `export_web.py` |
| Numbers in copy | Only from `reports/`, exactly as written |
| No logos | Team codes in text only |
| No em dashes | In code, copy, files and commit messages |
| Don't merge, don't deploy | Draft PR only. Pushing a branch makes a Vercel preview; that's fine |
| Log everything | `notes/phase7b_run_log.md` (section 8) |

### Figma MCP

Use the Figma MCP for the two frames: file `rudsn3TASAFVvBxYq40VFK`, nodes `27:250` (dark) and `27:5699` (light). Call `get_screenshot` once per frame and `get_design_context` once per frame at the start, save what you need (colours, sizes, spacing) into `notes/design/figma_tokens.md`, and work from that file afterwards. The account is on a student plan, so keep Figma calls to what's needed. If the MCP isn't available, use the reference renders in `notes/design/` and log it.

### When to stop and wait for Danny

- The parity test fails its thresholds
- `export_web.py` raises, or a team code has no name and you can't confirm the team from the data
- `git status` shows a change to a "Never touch" file
- `npm run build` fails twice with the same error after one minimal fix attempt

Everything else is logged and the run carries on.

## 1. Checkpoint 0: plan and design files

1. `git fetch`. If `phase-7` is merged into `main`, branch `phase-7b-redesign` from `main`; otherwise from `phase-7`.
2. Create `notes/phase7b_run_log.md`, status `running`.
3. Figma: screenshots and design context for both frames, write `notes/design/figma_tokens.md` (colour table for both themes, font sizes, radii, spacing, component sizes).

**Commit:** `notes/phase7b_plan.md`, `notes/phase7b_runbook.md`, `notes/phase7b_run_log.md`, `design.md`, `nothing-style.md`, `notes/design/`. Message `Phase 7b: redesign plan, runbook, design references`. Push.

## 2. Checkpoint 1: data

Extend `src/export_web.py` (plan section 4): `team` and `region` per season in `map.json`, `teams.json`, `regions.json`, `legends.json`, `region` in each player file. Regions per plan section 4.1; print each region's top 3 z-score stats and top position, check them against the draft names, write the check to the run log.

Run `python src/precompute.py` then `python src/export_web.py`. Then `git status`: if `reports/phase6_explain.md` changed, restore it with `git checkout -- reports/phase6_explain.md` (precompute rewrites it; it must not change).

Checks: every team code in `map.json` has a name in `teams.json`; 9 unique region names; all legends found (log any skipped); total data size (log it).

**Commit:** `src/export_web.py`, `web/public/data/`. Message `Phase 7b: team, region and legends data`. Push.

## 3. Checkpoint 2: foundation

In `web/`:
1. `npm install motion` (record the version). Fonts via `next/font/google` (`Doto` 900, `Geist_Mono` 400/500/600).
2. Theme system: CSS variables for both themes from `figma_tokens.md`, `data-theme` on `<html>`, no-flash inline script, toggle stored in `localStorage` (wrapped in try/catch).
3. `<MotionConfig reducedMotion="user">` at the root.
4. Shared pieces: `DotMeter`, `DotRow`, label style, card style.
5. Remove the old `/map` and `/about` routes (redirect both to `/`). Keep `/player/[id]`, now rendering the dashboard with that player selected.

`npm test` and `npm run build` must pass.

**Commit:** message `Phase 7b: theme, fonts, motion and dot components`. Push.

## 4. Checkpoint 3: map panel

`MapPanel` per plan sections 3 and 5: canvas dots (decade, position or region colours; the original Phase 7 decade and position colours), grid A to H / 1 to 6, SVG highlight layer, search, team dropdown, colour switch, KEY, zoom, team code centred in A1 (centre on the glyphs, both axes). Animations from plan section 6 that belong to the map.

**Commit:** message `Phase 7b: map panel`. Push.

## 5. Checkpoint 4: right column

`BrandBlock`, `AboutCard`, `StartCard` (Legends / Your team / Search), `PlayerCard` (with lambda row using `lib/score.ts`), `CompList` / `CompRow` / `WhyCard` with the inner 15-row scroll (4 visible). Animations from plan section 6.

Copy, exactly:
- Start: `START HERE` / `FIND YOUR PLAYER` / "Type your favourite player, pick your team, or start with a legend. We'll show the careers that played most like theirs."
- About: "A machine-learning model that finds NBA players whose careers look alike, from the style of every season they played since 1980." plus `github.com/dannybud19/GreenFN`
- Why card label `WHY THEY MATCH`; the sentence is built from the top 3 positive stats ("Both ...") with plain words for each stat (write the 15 phrases in `lib/format.ts`).
- For comps ranked 6 to 10: "Breakdowns are precomputed for the default top 5."

**Commit:** message `Phase 7b: start card, player card, comps and why-similar`. Push.

## 6. Checkpoint 5: responsive, accessibility, tests

Tablet and phone layouts (plan section 7). Keyboard pass. New tests (plan section 7). `npm test` (all pass, log counts and parity rates), `npm run build`.

**Commit:** message `Phase 7b: responsive layout, accessibility and tests`. Push.

## 7. Checkpoint 6: verify

1. `npm start`, then Playwright at 1440x900, both themes: start; Legends list; team Chicago Bulls selected; Michael Jordan selected; Kobe's comp open with the inner scroll; About open; phone 390x844. Save PNGs to `notes/design/built/`.
2. Reduced-motion pass (`reducedMotion: 'reduce'`): no transforms, page works.
3. Lighthouse accessibility on `/` (log the score).
4. Compare the screenshots with the Figma frames and reference renders; fix differences you can, log the rest.

**Commit:** `notes/design/built/` and fixes. Message `Phase 7b: verified locally`. Push.

## 8. Checkpoint 7: wrap up

Run log:

```
# Phase 7b run log

Status: running | stopped (reason) | finished

| Checkpoint | Commit | Wall time | Notes |
|---|---|---|---|

## Issues and fixes

## Key numbers
- Motion version / Next.js version:
- Region check (each region: top stats, top position, name kept or changed):
- Legends skipped:
- Teams covered / codes named:
- Data size committed:
- Tests (count) and parity (top-1 / top-10 set):
- Build: pages generated:
- Lighthouse accessibility:
- Screenshots taken:
```

**Commit:** the run log (and a plan change-log row if anything deviated). Message `Phase 7b: run log`. Push.

Open a **draft** pull request `phase-7b-redesign` into `main`, titled `Phase 7b: dashboard redesign`, summarising what's built and the checks, with the 1440 screenshots embedded. Don't merge.

Final message to Danny: PR link and preview URL, versions, test and parity results, Lighthouse score, region check, anything that needed a fix, and what still differs from Figma.
