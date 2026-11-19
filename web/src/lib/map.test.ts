import { describe, expect, it } from "vitest";
import { applyT, clampT, giveAt, IDENTITY, K_MAX, zoomAround } from "./map";

const W = 800;
const H = 600;

describe("map pan and zoom transform", () => {
  it("zooming around a point keeps that point under the pointer", () => {
    const t = zoomAround(IDENTITY, 4, 300, 200);
    expect(applyT(t, 300, 200)).toEqual([300, 200]);
    const back = zoomAround(t, 1, 300, 200);
    expect(back.x).toBeCloseTo(0);
    expect(back.y).toBeCloseTo(0);
  });

  it("clamps the scale to 1x to 8x", () => {
    expect(clampT({ k: 20, x: 0, y: 0 }, W, H).k).toBe(K_MAX);
    expect(clampT({ k: 0.2, x: 0, y: 0 }, W, H).k).toBe(1);
  });

  it("at 1x the map cannot move at all", () => {
    expect(clampT({ k: 1, x: 250, y: -90 }, W, H)).toEqual({ k: 1, x: 0, y: 0 });
    expect(clampT({ k: 1, x: -5000, y: 5000 }, W, H)).toEqual({ k: 1, x: 0, y: 0 });
  });

  it("zoomed in, the pan can go up to 25% of the container past the frame, and no further", () => {
    for (const [x, y] of [[1e5, 1e5], [-1e5, -1e5], [1e5, -1e5], [-1e5, 1e5]]) {
      const c = clampT({ k: 4, x, y }, W, H);
      expect(c.x).toBeLessThanOrEqual(0.25 * W);
      expect(c.x).toBeGreaterThanOrEqual(W * (1 - 4) - 0.25 * W);
      expect(c.y).toBeLessThanOrEqual(0.25 * H);
      expect(c.y).toBeGreaterThanOrEqual(H * (1 - 4) - 0.25 * H);
    }
    expect(clampT({ k: 4, x: 1e5, y: 1e5 }, W, H)).toEqual({ k: 4, x: 200, y: 150 });
    expect(clampT({ k: 4, x: -1e5, y: -1e5 }, W, H)).toEqual({ k: 4, x: -2600, y: -1950 });
  });

  it("the give eases in from 1x to 1.5x, so zooming out never jumps", () => {
    expect(giveAt(1)).toBe(0);
    expect(giveAt(1.25)).toBeCloseTo(0.125);
    expect(giveAt(1.5)).toBe(0.25);
    expect(giveAt(8)).toBe(0.25);
  });

  it("leaves a transform that is already in range unchanged", () => {
    const t = { k: 2, x: -300, y: -200 };
    expect(clampT(t, W, H)).toEqual(t);
  });
});
