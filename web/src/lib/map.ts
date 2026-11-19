// Map colours, point arrays and projection. Shared by the map panel and its tests.
import type { MapData, PlayerRow, Region } from "./data";

export type ColourMode = "decade" | "position" | "region";

export const DECADES = ["1980s", "1990s", "2000s", "2010s", "2020s"];
// The Phase 7 decade and position colours (figma_tokens.md).
export const DECADE_COLOURS = ["#7b6cf6", "#2fa4e7", "#22c1a4", "#9ad34a", "#f5b942"];
export const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
export const POSITION_COLOURS = ["#e4572e", "#f5b942", "#3fb97a", "#2fa4e7", "#9b6cf6"];
export const REGION_COLOURS = ["#2fa4e7", "#9b6cf6", "#e4572e", "#22c1a4", "#f5b942", "#e05fa0", "#9ad34a", "#8d8a84", "#5c7cfa"];

export function palette(mode: ColourMode): string[] {
  return mode === "decade" ? DECADE_COLOURS : mode === "position" ? POSITION_COLOURS : REGION_COLOURS;
}

export function legendEntries(mode: ColourMode, regions: Region[]): { label: string; colour: string }[] {
  const labels = mode === "decade" ? DECADES : mode === "position" ? POSITIONS : regions.map((r) => r.name);
  const colours = palette(mode);
  return labels.map((label, i) => ({ label, colour: colours[i % colours.length] }));
}

export type Points = {
  n: number;
  x: Float32Array;
  y: Float32Array;
  season: Int16Array;
  player: string[];
  teams: string[];
  /** Colour index per mode. */
  decade: Uint8Array;
  position: Uint8Array;
  region: Uint8Array;
  /** First point index of each player (points are grouped by player). */
  start: Map<string, [number, number]>;
};

export function buildPoints(map: MapData, byId: Map<string, PlayerRow>): Points {
  const n = Object.values(map).reduce((a, v) => a + v.length, 0);
  const pts: Points = {
    n,
    x: new Float32Array(n),
    y: new Float32Array(n),
    season: new Int16Array(n),
    player: new Array<string>(n),
    teams: new Array<string>(n),
    decade: new Uint8Array(n),
    position: new Uint8Array(n),
    region: new Uint8Array(n),
    start: new Map(),
  };
  let k = 0;
  for (const [pid, seasons] of Object.entries(map)) {
    const pos = Math.max(POSITIONS.indexOf(byId.get(pid)?.pos ?? ""), 0);
    const from = k;
    for (const [season, x, y, teams, region] of seasons) {
      pts.x[k] = x;
      pts.y[k] = y;
      pts.season[k] = season;
      pts.player[k] = pid;
      pts.teams[k] = teams;
      pts.decade[k] = Math.min(Math.max(Math.floor((season - 1980) / 10), 0), 4);
      pts.position[k] = pos;
      pts.region[k] = region;
      k++;
    }
    pts.start.set(pid, [from, k]);
  }
  return pts;
}

/** Indices of every season played (fully or partly) for a team code. */
export function teamIndices(pts: Points, code: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < pts.n; i++) if (pts.teams[i].split("/").includes(code)) out.push(i);
  return out;
}

export type View = { cx: number; cy: number; zoom: number };
export type Fit = { cx: number; cy: number; scale: number };

/** Fits the data bounds into a w x h box with an inner margin, keeping the aspect ratio. */
export function fitBounds(pts: { x: ArrayLike<number>; y: ArrayLike<number> }, w: number, h: number, margin = 0.06): Fit {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.x.length; i++) {
    minX = Math.min(minX, pts.x[i]);
    maxX = Math.max(maxX, pts.x[i]);
    minY = Math.min(minY, pts.y[i]);
    maxY = Math.max(maxY, pts.y[i]);
  }
  const scale = Math.min((w * (1 - 2 * margin)) / (maxX - minX || 1), (h * (1 - 2 * margin)) / (maxY - minY || 1));
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale };
}

/** Data coordinates to pixels in a w x h box (y up in data, down on screen). */
export function project(x: number, y: number, fit: Fit, view: View, w: number, h: number): [number, number] {
  const s = fit.scale * view.zoom;
  return [w / 2 + (x - view.cx) * s, h / 2 - (y - view.cy) * s];
}

/**
 * The map's pan and zoom: screen = base * k + (x, y), where base is a point's position at 1x (fitted to the plot).
 * Dots, grid lines, labels, the team code and every overlay go through the same transform.
 */
export type Transform = { k: number; x: number; y: number };
export const IDENTITY: Transform = { k: 1, x: 0, y: 0 };
export const K_MIN = 1;
export const K_MAX = 8;

export type Box = { minX: number; maxX: number; minY: number; maxY: number };

export const applyT = (t: Transform, bx: number, by: number): [number, number] => [bx * t.k + t.x, by * t.k + t.y];

/** Zoom to scale k2 keeping the screen point (px, py) fixed under the pointer. */
export function zoomAround(t: Transform, k2: number, px: number, py: number): Transform {
  const r = k2 / t.k;
  return { k: k2, x: px - (px - t.x) * r, y: py - (py - t.y) * r };
}

/** How far past the map's frame the pan may go when zoomed in: 25% of the container on each side. */
export const EDGE_GIVE = 0.25;

/** The give at zoom k: none at 1x, easing in to the full 25% by 1.5x so zooming out never jumps. */
export const giveAt = (k: number) => EDGE_GIVE * Math.min(1, Math.max(0, (k - 1) / 0.5));

/**
 * Keeps the scale in [K_MIN, K_MAX] and the pan within the 1x frame plus the give: x in [w(1 - k) - g w, g w] and
 * y in [h(1 - k) - g h, g h] with g = giveAt(k). At 1x that pins the map (x = y = 0). Zoomed in, the frame's edges
 * can come up to 25% of the container inside it, so a career near an edge can be centred.
 */
export function clampT(t: Transform, w: number, h: number): Transform {
  const k = Math.min(K_MAX, Math.max(K_MIN, t.k));
  const g = giveAt(k);
  const fix = (v: number, size: number) => Math.min(g * size, Math.max(size * (1 - k) - g * size, v));
  return { k, x: fix(t.x, w), y: fix(t.y, h) };
}

/** Base (1x) screen positions of every point and their bounding box. */
export function basePositions(pts: Points, fit: Fit, w: number, h: number): { bx: Float32Array; by: Float32Array; box: Box } {
  const bx = new Float32Array(pts.n);
  const by = new Float32Array(pts.n);
  const box: Box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const v: View = { cx: fit.cx, cy: fit.cy, zoom: 1 };
  for (let i = 0; i < pts.n; i++) {
    const [x, y] = project(pts.x[i], pts.y[i], fit, v, w, h);
    bx[i] = x;
    by[i] = y;
    box.minX = Math.min(box.minX, x);
    box.maxX = Math.max(box.maxX, x);
    box.minY = Math.min(box.minY, y);
    box.maxY = Math.max(box.maxY, y);
  }
  return { bx, by, box };
}
