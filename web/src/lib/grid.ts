// The map grid: numbers only, 0 to 100 on both axes across the dots' bounding box, origin at the top-left corner
// (across: 0 to 100 left to right; down: 0 to 100 top to bottom). Major lines sit at a "nice" step (1, 2 or 5
// times a power of ten) about 90 px apart on screen; minor lines at a fifth of that fade in as they spread out.
import type { Box, Transform } from "./map";

export const MAJOR_PX = 90;

/** Smallest of 1, 2, 5 or 10 times a power of ten whose spacing on screen is at least `minPx`. */
export function niceStep(pxPerUnit: number, minPx = MAJOR_PX): number {
  const raw = minPx / pxPerUnit;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw - 1e-12) return m * p;
  return 10 * p;
}

/** Minor lines fade in with their spacing: invisible under 6 px, fully visible from about 24 px. */
export const minorAlpha = (minorPx: number) => Math.max(0, Math.min(1, (minorPx - 6) / 18));

export type GridLine = { v: number; px: number; major: boolean };
export type Grid = { major: number; minor: number; decimals: number; minorAlpha: number; xs: GridLine[]; ys: GridLine[]; span: { x0: number; x1: number; y0: number; y1: number } };

/** Lines and labels in view for transform t over the base bounding box, in a w x h plot. */
export function computeGrid(t: Transform, box: Box, w: number, h: number): Grid {
  const bw = box.maxX - box.minX || 1;
  const bh = box.maxY - box.minY || 1;
  const pxX = (bw / 100) * t.k;
  const pxY = (bh / 100) * t.k;
  const major = niceStep(Math.min(pxX, pxY));
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
    minorAlpha: minorAlpha(minor * Math.min(pxX, pxY)),
    xs: lines(unitX(0), unitX(w), gx),
    ys: lines(unitY(0), unitY(h), gy),
    span: { x0: gx(0), x1: gx(100), y0: gy(0), y1: gy(100) },
  };
}
