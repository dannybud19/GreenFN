// Career playback rules (phase7d_plan.md section 2), kept pure so they can be tested.
import { clampT, type Transform } from "./map";

export type Badge = { kind: "up" | "down" | "same"; diff: number } | null;

/** Change from last season to one decimal: up, down or same. The first season (no previous value) has no badge. */
export function badge(prev: number | undefined, cur: number): Badge {
  if (prev === undefined) return null;
  const diff = Math.round((cur - prev) * 10) / 10;
  return { kind: diff > 0 ? "up" : diff < 0 ? "down" : "same", diff: Math.abs(diff) };
}

export function badgeText(b: Badge): string {
  if (!b) return "";
  return b.kind === "up" ? `▲ ${b.diff.toFixed(1)}` : b.kind === "down" ? `▼ ${b.diff.toFixed(1)}` : "= 0.0";
}

/** "PTS 30.1, down 1.4 from last season" (screen readers). */
export function statLabel(name: string, value: number, b: Badge): string {
  if (!b) return `${name} ${value.toFixed(1)}`;
  const change = b.kind === "same" ? "no change" : `${b.kind} ${b.diff.toFixed(1)}`;
  return `${name} ${value.toFixed(1)}, ${change} from last season`;
}

/** The arrows: back is disabled on the first season, forward on the last. */
export function stepState(i: number, n: number): { prevDisabled: boolean; nextDisabled: boolean } {
  return { prevDisabled: i <= 0, nextDisabled: i >= n - 1 };
}

export const FIT_MAX = 4;

/** Transform that frames a set of base points (with room around them), at most 4x, clamped to the plot. */
export function fitTransform(xs: number[], ys: number[], w: number, h: number): Transform {
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = Math.min(FIT_MAX, Math.max(1, Math.min(w / (maxX - minX + 260), h / (maxY - minY + 260))));
  return clampT({ k, x: w / 2 - ((minX + maxX) / 2) * k, y: h / 2 - ((minY + maxY) / 2) * k }, w, h);
}
