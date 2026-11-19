# GreenFN: Nothing-style rules

How Nothing frames information, written down so every GreenFN screen follows the same rules. Draft 1, 19 Nov 2026.

## 1. Fonts

| Role | Font | Why |
|---|---|---|
| Headings, player names, big numbers | **Doto** (Google Fonts, open licence), weight 900 | Danny's choice for headings. Dot-matrix, like Nothing's NDot |
| Everything else (labels, body, tables) | **Geist Mono** (open licence) | Listed as one of the fonts on Nothing's own website |

Nothing's own fonts are not on sale: NType 82 was designed by Colophon **for Nothing's exclusive use**, and NDot 55/57 are Nothing's in-house dot-matrix faces. The copies online come from phone firmware dumps, not from a licence. GreenFN is public, so it can't ship them. Doto plus Geist Mono is the closest legal match. If Nothing ever licenses NType 82, swap it in for body text and nothing else changes.

## 2. How Nothing frames information

| Pattern | Rule for GreenFN |
|---|---|
| Micro-labels | UPPERCASE Geist Mono, 10 to 11 px, letter-spacing 0.09em, grey. One label per block, top left. Optional step number in black first: `01  SEARCH A PLAYER` |
| One big number | Each block has at most one hero figure in Doto (seasons, a year, a percentage), with its label above it, never beside it |
| Data as dots | Quantities are rows of circles, filled = amount, empty = the rest (like Nothing's battery and Glyph widgets). No bars, no gradients |
| Black, white, one red | Ink #111, greys, white surfaces. Red #D71921 only for "the thing you selected" |
| Quiet structure | Hairline borders (#E3E3DE), rounded corners, no shadows, dotted or graph-paper grid behind |
| Short words | Labels are 1 to 4 words. Sentences only where they explain, max two lines |
| Pills | Tags and switches are pills with a 1px border; the active one is filled black |

## 3. GreenFN-specific rules

- The map stays the main block on the left. Colour switch (Decade, Position, Region) and the KEY live inside it.
- KEY: the word "KEY", "1 dot = 1 player season", the swatches. Nothing else.
- Zoom: `−  1.0×  +`. No caption.
- Selected player: his seasons as red dots and one name tag. No connecting lines.
- Hovered comp: his seasons as dark grey dots. No lines.
- Lists scroll inside their block (sticky header, fade at the bottom). Never "+4 more".
- Rows expand on click and collapse on a second click; only one open at a time.
- Why-similar: one plain sentence, then dot rows for the top 3 shared stats and the biggest difference.
- About: the GreenFN wordmark (Doto) in its own small block at the top right; click opens a one-sentence description and the GitHub link.
