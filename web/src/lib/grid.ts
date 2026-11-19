// The map grid: numbers only, 0 to 100 on both axes across the dots' bounding box, origin at the top-left corner
// (across: 0 to 100 left to right; down: 0 to 100 top to bottom). Major lines sit at a "nice" step (1, 2 or 5
// times a power of ten) about 90 px apart on screen; minor lines at a fifth of that fade in as they spread out.
// The numbers are laid out here too, from the same transform as the lines, so they can never drift from them.
import type { Box, Transform } from "./map";

export const MAJOR_PX = 90;

/** Smallest of 1, 2, 5 or 10 times a power of ten whose spacing on screen is at least `minPx`. */
export function niceStep(pxPerUnit: number, minPx = MAJOR_PX): number {
  const raw = minPx / pxPerUnit;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw - 1e-12) return m * p;
  return 10 * p;
}

/**
 * The major step: the nice step whose actual spacing on screen, along the wider axis, is closest to 90 px (in
 * ratio terms). At 1x on the app's map that is 10 (about 72 px across), so both axes read 0, 10, 20 ... 100.
 */
export function majorStep(pxX: number, pxY: number, target = MAJOR_PX): number {
  const px = Math.max(pxX, pxY);
  const up = niceStep(px, target);
  const p = Math.pow(10, Math.floor(Math.log10(up)));
  const m = Math.round(up / p);
  const down = m === 1 ? 0.5 * p : m === 2 ? p : 2 * p; // the next nice step below
  const dist = (s: number) => Math.abs(Math.log((s * px) / target));
  return dist(down) < dist(up) ? down : up;
}

/** Minor lines fade in with their spacing: invisible under 6 px, fully visible from about 24 px. */
export const minorAlpha = (minorPx: number) => Math.max(0, Math.min(1, (minorPx - 6) / 18));

export type GridLine = { v: number; px: number; major: boolean };
export type Grid = {
  major: number;
  minor: number;
  decimals: number;
  /** Minor-line opacity per axis (vertical lines, horizontal lines), from each axis's own spacing. */
  minorAlphaX: number;
  minorAlphaY: number;
  xs: GridLine[];
  ys: GridLine[];
  span: { x0: number; x1: number; y0: number; y1: number };
};

/** Lines in view for transform t over the base bounding box, in a w x h plot. */
export function computeGrid(t: Transform, box: Box, w: number, h: number): Grid {
  const bw = box.maxX - box.minX || 1;
  const bh = box.maxY - box.minY || 1;
  const pxX = (bw / 100) * t.k;
  const pxY = (bh / 100) * t.k;
  const major = majorStep(pxX, pxY);
  const minor = major / 5;
  const gx = (v: number) => (box.minX + (v / 100) * bw) * t.k + t.x;
  const gy = (v: number) => (box.minY + (v / 100) * bh) * t.k + t.y;
  const unitX = (px: number) => (((px - t.x) / t.k - box.minX) / bw) * 100;
  const unitY = (px: number) => (((px - t.y) / t.k - box.minY) / bh) * 100;
  const lines = (from: number, to: number, at: (v: number) => number): GridLine[] => {
    const a = Math.max(0, from);
    const b = Math.min(100, to);
    const out: GridLine[] = [];
    for (let n = Math.ceil(a / minor - 1e-9); n * minor <= b + 1e-9; n++) {
      const v = Math.round(n * minor * 1e6) / 1e6 + 0; // + 0 turns -0 into 0
      out.push({ v, px: at(v), major: n % 5 === 0 });
    }
    return out;
  };
  return {
    major,
    minor,
    decimals: major < 0.1 ? 2 : major < 1 ? 1 : 0,
    minorAlphaX: minorAlpha(minor * pxX),
    minorAlphaY: minorAlpha(minor * pxY),
    xs: lines(unitX(0), unitX(w), gx),
    ys: lines(unitY(0), unitY(h), gy),
    span: { x0: gx(0), x1: gx(100), y0: gy(0), y1: gy(100) },
  };
}

// Number layout (10 px Geist Mono: 6 px per character; the text box measures 13 px tall, so 14 with a margin).
export const LABEL = { charW: 6, h: 14, gapTop: 6, gapLeft: 8, tick: 4 };

export type Label = { v: number; text: string; x: number; y: number; tick: [number, number, number, number] };

/**
 * Numbers for every major line in view. Across numbers sit 6 px above the grid's top edge, down numbers 8 px left
 * of its left edge, each centred on its own line with a 4 px tick from the edge towards the number. When the edge
 * is off screen they stick to the visible top / left of the map area with the same gaps. If two numbers would
 * collide, every other one is skipped. A row of numbers is shown only while its lines are in view (zoomed in and
 * panned past the frame, the grid can be entirely off screen). Positions: across = (centre x, bottom y);
 * down = (right x, centre y).
 */
export function layoutLabels(g: Grid, w: number, h: number): { across: Label[]; down: Label[]; top: number; left: number } {
  const text = (v: number) => v.toFixed(g.decimals);
  const majorsX = g.xs.filter((l) => l.major);
  const majorsY = g.ys.filter((l) => l.major);
  const widest = Math.max(1, ...majorsY.map((l) => text(l.v).length)) * LABEL.charW;
  const top = Math.max(g.span.y0, LABEL.gapTop + LABEL.h); // the grid's top edge, or the visible top
  const left = Math.max(g.span.x0, LABEL.gapLeft + widest + 2); // the grid's left edge, or the visible left

  const stride = (gaps: number[], need: number) => {
    const min = Math.min(Infinity, ...gaps);
    let s = 1;
    while (min * s < need && s < 8) s *= 2;
    return s;
  };
  // Vertical lines run from the grid's top to its bottom: the across row needs them in view below the numbers.
  const acrossInView = g.span.y1 >= top && top <= h;
  const downInView = g.span.x1 >= left && left <= w;
  const xsIn = acrossInView ? majorsX.filter((l) => l.px >= left - 0.5 && l.px <= w) : [];
  const ysIn = downInView ? majorsY.filter((l) => l.px >= top - 0.5 && l.px <= h) : [];
  const sx = stride(xsIn.slice(1).map((l, i) => l.px - xsIn[i].px), Math.max(...xsIn.map((l) => text(l.v).length), 1) * LABEL.charW + 6);
  const sy = stride(ysIn.slice(1).map((l, i) => l.px - ysIn[i].px), LABEL.h + 2);
  const keep = (l: GridLine, s: number) => Math.round(l.v / g.major) % s === 0;

  return {
    top,
    left,
    across: xsIn.filter((l) => keep(l, sx)).map((l) => ({ v: l.v, text: text(l.v), x: l.px, y: top - LABEL.gapTop, tick: [l.px, top - LABEL.tick, l.px, top] })),
    down: ysIn.filter((l) => keep(l, sy)).map((l) => ({ v: l.v, text: text(l.v), x: left - LABEL.gapLeft, y: l.px, tick: [left - LABEL.tick, l.px, left, l.px] })),
  };
}
