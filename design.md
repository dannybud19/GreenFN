# GreenFN design

Status: draft 1 (19 Nov 2026). Low fidelity first, then iterate in Figma, then code.

Figma: https://www.figma.com/design/rudsn3TASAFVvBxYq40VFK/Untitled (page "GreenFN wireframes": frames 01 to 05, this file as a board underneath, local components at the bottom).

## 1. Idea

GreenFN becomes **one screen**: a dashboard where the map of every NBA season is the background and everything else floats on top of it. You search a player, his career lights up on the map, his comps appear beside it, and you can see why they are similar without leaving the screen.

| Principle | What it means here |
|---|---|
| One page | No separate search, map or about pages. About is a "?" button that opens a small panel |
| Map first | The map fills the screen. Panels float over it and can collapse |
| Explorable | Hover, click and drag always do something. Every state change animates |
| Honest | Every number comes from `reports/`. The map note stays visible: comps come from the full model, not map distance |
| Calm | Blue and white, lots of space, one accent. Colour carries data only on the map |

## 2. Visual direction (Meta-inspired)

Inspired by Meta's product look: white surfaces, a bright blue for action, deep navy text, soft grey structure, rounded corners and generous spacing. Not a copy of Meta's brand: no logo, wordmark or proprietary font.

### Colour tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #FFFFFF | #0B1220 | Page and map background |
| `surface` | #FFFFFF | #111A2B | Floating panels |
| `surface-2` | #F1F4F7 | #18233A | Inputs, chips, hover rows |
| `border` | #DEE3E9 | #26334D | Panel and input borders |
| `text` | #1C2B33 | #E8EEF5 | Main text |
| `text-2` | #5D6C7B | #9AA8B8 | Secondary text, captions |
| `blue` | #0866FF | #4C8DFF | Primary action, selected player, focus ring |
| `blue-strong` | #0057E0 | #78A9FF | Pressed state, links |
| `blue-soft` | #E7F0FF | #15284A | Selected row, highlight wash |
| `positive` | #0866FF | #4C8DFF | Why-similar bars that make them alike |
| `negative` | #A4B1BE | #5A6B80 | Why-similar bars that make them different |

Map colours (data only), decade scale from light to deep blue so it stays on palette:

| Decade | 1980s | 1990s | 2000s | 2010s | 2020s |
|---|---|---|---|---|---|
| Colour | #C9DCFF | #93B8FF | #5C93FF | #2A6CF0 | #0B3FB0 |

Position uses five distinct hues (must pass a colour-blind check before code), with shape as a second signal: PG circle, SG diamond, SF square, PF triangle, C hexagon.

### Type

| Role | Font | Size / weight |
|---|---|---|
| Display (player name) | Inter | 28 / Semi Bold |
| Panel title | Inter | 16 / Semi Bold |
| Body | Inter | 14 / Regular |
| Caption, axis labels | Inter | 12 / Medium |
| Numbers (scores, years) | Inter with tabular figures | same as context |

### Shape and depth

| Token | Value |
|---|---|
| Radius | 8 inputs and chips, 16 panels, 999 pills |
| Spacing scale | 4, 8, 12, 16, 24, 32 |
| Panel shadow | 0 8 24 rgba(28, 43, 51, 0.12) |
| Panel background | `surface` at 92% with a 16px background blur, so the map shows faintly through |

## 3. Layout (desktop 1440 x 900)

```
+--------------------------------------------------------------------------------+
| [GreenFN] [ Search a player ...       ]                 [Decade|Position] [?]  |
|                                                                                |
| +------------------+                                   +---------------------+ |
| | PLAYER CARD      |                                   | CAREER COMPS        | |
| | name, years, pos |           MAP CANVAS              | lambda slider       | |
| | career shape     |      selected career = blue       | 1 Wade    ===  2.79 | |
| +------------------+      hovered comp = dashed        | 2 ...               | |
| | WHY SIMILAR      |                                   | ... 10 rows         | |
| | 15 diverging     |                                   |                     | |
| | bars             |                                   |                     | |
| +------------------+                                   +---------------------+ |
|            map note   [legend: decades]   [+ - reset]                          |
+--------------------------------------------------------------------------------+
```
| Zone | Content | Behaviour |
|---|---|---|
| Top bar (floating, 64 high) | Wordmark "GreenFN", search, colour toggle, "?" | Always visible |
| Search | Type-ahead: name, years, position. Arrow keys and Enter. Shows 6 suggestions plus 3 example players when empty | Selecting flies the map to the career |
| Player card (left, 360 wide) | Name, years, seasons, position, career shape in words ("steadier than 99% of players") | Appears after a search; collapses to a pill |
| Comps panel (right, 380 wide) | Top 10 with rank, name, years, score bar, position. Lambda slider with label and one-line explanation, "back to default" | Hover a comp: his career draws on the map and links to the selected player. Click: opens why-similar |
| Why similar (left, under the player card) | 15 diverging bars, sorted, caption about integrated gradients. For ranks 6 to 10: "Breakdowns are precomputed for the default top 5" | Bars grow in from zero |
| Legend (bottom, left of centre) | Decade or position key, matching the toggle | Click a key to isolate that group |
| Map controls (bottom right) | Zoom in, zoom out, reset view | Scroll and pinch also zoom |
| Map note (bottom centre) | "The map is a 2D picture for intuition. Comps are computed in the full 32-dimension model." | Always visible, small |
| About ("?") | Popover: what GreenFN is, how it works, headline numbers, limits, data credit, GitHub link | Esc closes |

Empty state (nobody selected): map only, search centred and larger, legend, note, and "Try: Michael Jordan, Stephen Curry, Tim Duncan".

### Tablet and phone

| Width | Change |
|---|---|
| 768 to 1199 | Player card merges into the top of the comps panel; panel becomes a right drawer |
| Under 768 | Map full screen; search and colour toggle on top; bottom sheet (three snap heights) with the player header and tabs: Comps, Why similar, Career |

## 4. The map

| Topic | Decision |
|---|---|
| Points | 14,672 seasons. Drawn with WebGL (one draw call), not one SVG per point: 14,672 SVG nodes would stutter on most laptops |
| Where SVG is used | The selected player's career and the hovered comp's career (a few dozen nodes): SVG dots and a smooth line, so they stay sharp at any zoom and can be animated per node with motion.dev |
| Shaders | Point sprites with a soft glow; a density layer so crowded areas read as a glow instead of a blob; a gentle pulse on the selected career's first and last season |
| Zoom | Semantic zoom: far out shows density, mid shows points, close shows season labels on the selected career |
| Interaction | Drag to pan, scroll to zoom, hover a point for a tooltip (player, season, team-free), click a point to select that player |
| 3D | See section 6 |

## 5. Micro-interactions (motion.dev)

| Trigger | Response |
|---|---|
| Search focus | Bar widens slightly, suggestions fade up 8px |
| Pick a player | Map eases to fit his career (600 ms), career line draws from first to last season, panels slide in from their sides |
| Hover a comp row | Row tints `blue-soft`; his career fades in on the map with a thin connector between the two careers' peak seasons |
| Click a comp | Why-similar bars grow from the zero line, staggered by 20 ms |
| Move lambda slider | List reorders with layout animation (rows glide to new ranks); score bars resize |
| Toggle decade / position | Point colours cross-fade (300 ms); legend swaps |
| Click a legend key | Other groups dim to 15% |
| Hover a map point | Point grows 1.6x, tooltip follows with a slight lag |
| Open "?" | Popover scales from the button |
| Reduced motion | All of the above become instant fades |

## 6. Can the data be 3D?

Yes, technically: the map is a picture of the model's 32-dimension space, and UMAP can produce 3 coordinates instead of 2 just as easily (Phase 6 used 2). It would need a re-run of the map step and a new trustworthiness number.

| Option | Good | Bad |
|---|---|---|
| Keep 2D (recommended for v1) | Easy to read, works on phones, no points hidden behind others, already measured (trustworthiness 0.928) | Less of a wow moment |
| Add a 3D mode later | Rotating the cloud is fun and explorable | Points hide each other, harder on phones, still "for intuition only", needs a new export and check |

Recommendation: ship 2D with depth effects (glow, parallax on panels, slight tilt on hover) and keep a 3D toggle as a later experiment.

## 7. Accessibility

- Keyboard: search, comps list, slider, legend and "?" all reachable and visible on focus (blue 2px ring).
- Colour is never the only signal: position also uses shape; why-similar bars carry a sign and value.
- Screen readers get the comps list and why-similar values as tables.
- Contrast: all text pairs meet WCAG AA in both themes.

## 8. Not decided yet

- Wordmark style and favicon.
- Whether the player card shows a few headline stats.
- 3D mode (section 6).
- Exact position hues.

## Change log

| Date | Change |
|---|---|
| 19 Nov 2026 | Draft 1 |
| 19 Nov 2026 | Matched to the wireframes: why-similar moved to the left column under the player card; phone sheet uses tabs |
