# Phase 7b plan: dashboard redesign

Written 19 Nov 2026, before any redesign code. Phase 7's app stays the base: same data pipeline, same model outputs, same parity test. This phase replaces the four-page UI with one Nothing-style dashboard and adds personalisation and motion. If a rule changes, record it in the change log with the reason.

## 1. Sources of truth

| What | Where | Wins on |
|---|---|---|
| Visual design | Figma file `rudsn3TASAFVvBxYq40VFK` (GreenFN), frames **06 Team selected, dark** (node `27:250`) and **06 Team selected, light** (node `27:5699`) | Layout, spacing, colours, type sizes |
| Design rules | `nothing-style.md` (repo root) | Fonts, labels, dots-not-bars, what text is allowed |
| Product rules | `design.md` (repo root) | What each zone does, interactions, accessibility |
| Reference renders | `notes/design/*.png` | States the Figma file doesn't have yet (start screen, player selected, comp open, About open) |
| Numbers | `reports/` | Any number shown in copy |

`design.md` is draft 1 and predates the Nothing direction (it still describes Meta-style blue and floating panels). Where it disagrees with this plan, `nothing-style.md` or the Figma frames, ignore it; it's useful only for accessibility and the phone layout idea.

The Figma map dots are an approximation drawn for the mock-up. The app always draws the **real** 14,672 seasons from `map.json`.

## 2. Decisions (Danny, 19 Nov 2026)

| Decision | Choice |
|---|---|
| Structure | **One page.** No `/map` or `/about` pages; `/player/[id]` stays as a deep link that opens the dashboard with that player selected |
| Layout | Bento: map container left (904 wide at 1440), right column 432 wide: GREENFN block, then one scrolling panel. 40 px outer padding, 24 px gaps |
| Style | Nothing OS: black, white, greys, one red (`#D71921` light, `#FF2D2D` dark) for the selected player. No gradients, no shadows |
| Fonts | **Doto** (headings, names, big numbers, team code) and **Geist Mono** (everything else), both via `next/font/google`. Nothing's own NDot/NType 82 are not licensed for use, never ship them |
| Themes | Light and dark, toggle (sun/moon) in the GREENFN block. Follows the system on first visit, then remembers the choice. No flash on load |
| Motion | **Motion** (motion.dev), React API from `motion/react`. Lots of micro-interactions (section 6), all off or reduced to fades under `prefers-reduced-motion` |
| Map | Canvas for the 14,672 dots (already works). An SVG layer on top for the selected and comparing player's dots, so Motion can animate them |
| Personalisation | Start card: Legends, Your team, Search. A team dropdown in the map container. Selecting a team lights up its seasons and shows its code (for example `CHI`) centred in grid cell A1. **Letters only, never a logo** (team logos are trademarks) |
| Comps | One scrolling right panel (player card, then all 10 comps). One comp open at a time; the open card shows all 15 why-similar stats as dot rows in its own scroll area, 4 visible at once |
| Why-similar graphic | Rows of 16 dots, filled in proportion to the value; dots for stats that pull the careers apart are grey. One plain sentence above the rows |
| Lambda slider | Kept, as a compact row in the player card ("Career shape weight"), same maths and parity test as Phase 7 |
| About | (i) in the GREENFN block opens a small card: one sentence plus the GitHub link |

## 3. What the screen shows

| State | Map container | Right panel |
|---|---|---|
| **Start** (nobody selected) | All dots at full strength, grid A to H / 1 to 6, KEY, zoom | START HERE / FIND YOUR PLAYER, one sentence, tabs **Legends / Your team / Search**. Legends: the 10 hand-picked players with their real closest match |
| **Team selected** | Team's seasons drawn as ink dots, the rest dimmed; team code centred in A1; KEY adds "Team season" | "Your team" tab: players with the most qualified seasons for that team, each with a dot meter and the count |
| **Player selected** | His seasons as red dots with a single name tag, no connecting lines; hovered or open comp as grey dots | Scrollable: player card (Doto name, seasons / from / to / position, consistency dot meter, lambda row), then all 10 comps with region tags; one opens to the why-similar card |
| **About open** | unchanged | Small card under the GREENFN block |

KEY text is exactly: `KEY · 1 dot = 1 player season` plus the swatches (decades, or positions, or regions, depending on the switch), and Selected / Comparing / Team season when relevant. Zoom is exactly `− 1.0× +`. No other captions on the map.

## 4. Data (the "back end")

There is no server. The Python pipeline is the back end: `src/precompute.py` writes `exports/`, `src/export_web.py` turns them into static JSON in `web/public/data/`, and Next.js reads them at build time (static pages) and in the browser (`fetch('/data/...')`).

New outputs from `export_web.py` (extend it; don't change the model or `precompute.py`):

| File / field | Content | Source |
|---|---|---|
| `map.json` seasons gain `team` and `region` | Team code per season; region index per season | `data/processed/player_seasons.parquet` (`team` column, qualified seasons only); region from section 4.1 |
| `teams.json` | `[{code, name, seasons, players, top: [[playerId, seasons, first, last], ...10]}]` sorted by name | Count of qualified seasons per team; `name` from a hand-written code-to-name table covering **every** code in the data (historic ones too, for example `NJN`, `SEA`, `VAN`, `KCK`) |
| `regions.json` | `[{name, desc, x, y}]` for 9 regions | Section 4.1 |
| `legends.json` | The 10 players below with their top comp id | `exports/comps.json` |
| `player/<id>.json` | Add `region` (most common region of his seasons). `why` already holds all 15 values for the top 5 comps | as now |

Legends (hand-picked, label them "legends to try", never "top 10"): Michael Jordan, LeBron James, Kobe Bryant, Stephen Curry, Shaquille O'Neal, Tim Duncan, Magic Johnson, Larry Bird, Nikola Jokić, Kevin Garnett. Skip any player not in `players.json` (hold-outs are excluded) and say so in the run log.

### 4.1 Regions

K-means with 9 clusters on the 2D map coordinates, `random_state=0`, `n_init=10`. Each region's name comes from its strongest mean within-season z-scores and its most common position. Draft names from the 19 Nov exploration (re-check them against the computed stats; if a cluster's stats don't match its name, log it and use a neutral name such as "Region 4"):

Floor generals (assists, steals) · Scoring bigs (rebounds, usage, blocks) · Shooting guards (3PT rate, 3PT%, FT%) · Rim protectors (blocks, offensive boards) · Shooting point guards (threes and assists) · Primary scorers (usage, shot volume) · Energy bigs (offensive boards, fouls) · Stretch wings (lots of threes) · All-round forwards (close to league average).

Regions are a reading aid on the 2D picture, not a model output. The About card and `design.md` say so.

## 5. Components

`web/src/components/` (replace the Phase 7 page components; keep `lib/score.ts`, `lib/data.ts`, `lib/format.ts` and their tests):

| Component | Notes |
|---|---|
| `Dashboard` | The one page. Holds state: theme, colour mode, selected player, open comp, team, tab, lambda |
| `MapPanel` | Canvas dots + grid + SVG highlight layer + overlays (search, team dropdown, colour switch, KEY, zoom, A1 team code) |
| `SearchBox` | Type-ahead over `players.json`, keyboard (`/` to focus, arrows, Enter, Esc) |
| `TeamSelect` | Dropdown of `teams.json`, "All teams" first |
| `ColourSwitch` | Decade / Position / Region pill switch |
| `Key`, `ZoomControl` | Exact text from section 3 |
| `BrandBlock` | GREENFN (Doto), theme toggle, (i) |
| `AboutCard` | One sentence + GitHub link |
| `StartCard` | Tabs; Legends list; Your team list; Search tab focuses the search box |
| `PlayerCard` | Doto name, four stats, consistency meter, lambda row |
| `CompList`, `CompRow`, `WhyCard` | Accordion; inner scroll of 15 `DotRow`s |
| `DotMeter`, `DotRow` | The Nothing dot graphic, reused everywhere |

## 6. Motion (motion.dev)

Install the `motion` package and pin the version npm installs (record it in the run log). Use `motion/react` (`motion`, `AnimatePresence`, `LayoutGroup`, `MotionConfig`, `useReducedMotion`) and `animate` for canvas values. Wrap the app in `<MotionConfig reducedMotion="user">`.

| Trigger | Animation |
|---|---|
| Page load | Containers fade and rise 8 px, staggered 60 ms; map dots fade in |
| Theme toggle | Toggle knob slides with a spring; colours cross-fade 250 ms (CSS variables), canvas redraw fades |
| Hover any button, pill or row | Slight background tint, 120 ms; press scales to 0.97 |
| Search focus / typing | Box border thickens; suggestion list drops in, rows stagger 25 ms; arrow-key highlight slides between rows (`layoutId`) |
| Pick a player | Map highlight dots pop in from scale 0 with a stagger by season (first to last); name tag slides in; right panel content swaps with a short slide; dot meters fill left to right |
| Hover a comp row | His dots appear on the map in grey (fade + scale) |
| Open / close a comp | Height animates open and closed (`AnimatePresence`, `layout`); chevron rotates; why rows fill dot by dot, staggered 15 ms; only one open at a time |
| Move lambda | Comp rows reorder with `layout` animation (they glide to their new ranks) |
| Colour switch | Active pill slides (`layoutId`); dot colours cross-fade over 300 ms (canvas, `animate` from 0 to 1) |
| Pick a team | Team code in A1 types in letter by letter (Doto); team dots brighten while others dim |
| Tabs | Active tab outline slides (`layoutId`); list content cross-fades |
| Zoom | Canvas eases to the new scale (300 ms); value counts up |
| About | Card scales from the (i) button |
| Reduced motion | All of the above become instant or plain fades |

Performance: never animate 14,672 DOM nodes. The canvas redraws per frame only during a transition; the SVG layer holds at most about 40 nodes (one player plus one comp).

## 7. Engineering

| Item | Choice |
|---|---|
| Branch | `phase-7b-redesign`, from `main` if PR #8 is merged, otherwise from `phase-7` |
| Theme | `data-theme` on `<html>`, CSS variables for every colour (values in the Figma frames and `nothing-style.md`), a tiny inline script in `<head>` that sets the theme before paint |
| Fonts | `next/font/google`: `Doto` (weight 900) and `Geist_Mono` (400, 500, 600) |
| Accessibility | Keyboard for everything; visible focus ring; colour never the only signal (KEY text, shapes); dot meters have `aria-label`s with the number; the why rows also exist as an `sr-only` table |
| Responsive | At 768 to 1199 the right column narrows; under 768 the map is full width and the right panel becomes a bottom sheet |
| Tests | Keep all 17 Phase 7 tests. Add: `teams.json` covers every team code in `map.json` and every code has a name; legends exist in `players.json`; region names are 9 and unique; theme toggle sets `data-theme`; `DotMeter` fills the right count |
| Copy | No em dashes. Numbers only from `reports/` |

## 8. Gate

- This plan committed before any redesign code.
- `npm test` and `npm run build` pass with no errors; static player pages still generate.
- Parity test still passes (top-1 for every player, top-10 set for at least 99%).
- Every state in section 3 works locally in both themes, checked with Playwright screenshots saved to `notes/design/built/` and compared by eye with the Figma frames and reference renders.
- Reduced motion verified (Playwright `reducedMotion: 'reduce'`).
- Lighthouse accessibility score 90 or higher on the dashboard.
- If a line fails, record it as a finding.

## Change log

| Date | Change | Reason |
|---|---|---|
| | | |
