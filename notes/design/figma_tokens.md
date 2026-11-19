# Design tokens for the Phase 7b dashboard

Source: the Figma MCP could not open file `rudsn3TASAFVvBxYq40VFK` from the connected account ("Figma could not access the requested file", debug ids `da836453-6917-4cbe-a6c4-b35007f8abc0` and `91f9566a-3638-412b-a33b-080f201e250d`, 19 Nov 2026). Per the runbook fallback, every value below was measured from the reference renders in `notes/design/ref-*.png` (exported from the same frames at 2x, 2880 x 1800 = 1440 x 900 CSS px). Colours are exact pixel samples; sizes are measured and rounded to the nearest whole or even pixel.

## Colours

| Token | Light | Dark | Use |
|---|---|---|---|
| `page` | #FFFFFF | #000000 | Page background behind the containers |
| `surface` | #FFFFFF | #0B0B0B | Containers, cards, KEY, inputs |
| `surface-2` | #F4F4F1 | #161614 | Zoom buttons, hover tint |
| `border` | #E3E3DE | #232320 | Hairlines: containers, rows, inputs, tabs |
| `grid` | #EFEFEB | #151513 | Map grid lines |
| `ink` | #111111 | #F2F2F0 | Main text, active pill fill, filled dots, focused input border |
| `ink-inv` | #FFFFFF | #000000 | Text on an `ink` fill (active pill, name tag) |
| `muted` | #7A7A76 | #8C8C88 | Labels, secondary text, inactive pills |
| `faint` | #B4B4AE | #55554F | Placeholder, row numbers, empty dots |
| `axis` | #A5A5A0 | #4A4A45 | Grid letters and numbers |
| `red` | #D71921 | #FF2D2D | Selected player only |
| `comparing` | #555555 | #BDBDB8 | Hovered or open comp's dots |
| `dot-empty` | #E3E3DE | #2E2E2D | Empty dots in meters |

Decade colours (same as Phase 7, both themes): 1980s #7B6CF6, 1990s #2FA4E7, 2000s #22C1A4, 2010s #9AD34A, 2020s #F5B942. Position colours stay Phase 7's: PG #E4572E, SG #F5B942, SF #3FB97A, PF #2FA4E7, C #9B6CF6.

Map dots: light theme draws dots at about 55% alpha on white (pastel look); dark at about 70%. When a team or player is selected, the rest dim (light about 30%, dark about 35%).

## Type

| Role | Font | Size / weight / tracking |
|---|---|---|
| Wordmark GREENFN | Doto 900 | 24 px, uppercase |
| Hero heading (FIND YOUR PLAYER, player name) | Doto 900 | 30 px, line-height 33 px |
| Team code in A1 (CHI) | Doto 900 | 32 px |
| Row numbers (01 to 10) | Doto 900 | 16 px, `faint` |
| Micro-labels (YOUR PLAYER, KEY) | Geist Mono 500 | 11 px, uppercase, 0.09em, `muted`; step number in `ink` 600 |
| Body | Geist Mono 400 | 12.5 px, line-height 20 px |
| Row names | Geist Mono 600 | 13 px |
| Row sub (years) | Geist Mono 400 | 11.5 px, `muted` |
| Pills, tabs, inputs | Geist Mono 400/500 | 12.5 px (input 13.5 px) |
| Grid letters and numbers | Geist Mono 400 | 10 px, `axis` |

## Layout at 1440 x 900

| Item | Value |
|---|---|
| Outer padding | 40 px all sides |
| Gap between blocks | 24 px |
| Map container | 904 x 820, padding 20 px, radius 20, 1 px `border` |
| Right column | 432 wide |
| GREENFN block | 432 x 58, padding 0 20 |
| Right panel | fills the rest (820 - 58 - 24 = 738 high), radius 20 |
| Control row (map) | labels at y 28 inside the container; controls 40 high, 8 px under the label |
| Search box | 358 x 40, radius 10, 1.5 px `ink` border (focused look is the default in the frames) |
| Team dropdown | 170 x 40, radius 10, 1 px `border` |
| Colour switch | 218 x 30 pill track, 1 px `border`, active pill filled `ink` |
| Grid | 8 columns A to H x 6 rows 1 to 6, area about 824 x 593, letters 10 px above, numbers 11 px left |
| KEY box | auto width, 58 high, radius 12, padding 8 x 16, bottom left |
| Zoom box | 123 x 40, radius 12, bottom right; buttons 28 x 28 `surface-2`, radius 8 |
| Theme toggle | 62 x 30 pill with 26 px knob; (i) button 30 px circle |
| Tabs | 3 x 125 x 32, gap 7, radius 8, active tab 1.5 px `ink` border |
| List rows (start card) | 57 high, hairline between, number column 40 px |
| Comp rows | 42 high, region tag pill 1 px `border`, 11 px `muted` |
| Dot meter (lists) | 12 dots, 6 px, gap 3 |
| Why rows | 16 dots, 8 px, gap 3; 4 rows visible (39 px each) in an inner scroll |
| Name tag on map | `ink` pill, `ink-inv` text, 11 px uppercase 600, 1 px leader line to the first season |

## Radii

Containers 20 · inner boxes (KEY, zoom, why card) 12 · inputs and tabs 10 / 8 · pills 999.

## No shadows, no gradients

Type sizes re-measured from glyph advance widths in the renders (Doto and Geist Mono advance 0.6 em) after the first build; first estimates were about 15% large.
