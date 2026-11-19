import { describe, expect, it } from "vitest";
import { applyT, clampT, IDENTITY, K_MAX, zoomAround } from "./map";

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

  it("zoomed in, the 1x frame always covers the container", () => {
    for (const [x, y] of [[1e5, 1e5], [-1e5, -1e5], [1e5, -1e5], [-1e5, 1e5]]) {
      const c = clampT({ k: 4, x, y }, W, H);
      expect(c.x).toBeLessThanOrEqual(0);
      expect(c.x).toBeGreaterThanOrEqual(W * (1 - 4));
      expect(c.y).toBeLessThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(H * (1 - 4));
      // The frame's corners (0, 0) and (W, H) stay outside or on the container's edges.
      const [l, t] = applyT(c, 0, 0);
      const [r, b] = applyT(c, W, H);
      expect(l <= 0 && t <= 0 && r >= W && b >= H).toBe(true);
    }
  });

  it("leaves a transform that is already in range unchanged", () => {
    const t = { k: 2, x: -300, y: -200 };
    expect(clampT(t, W, H)).toEqual(t);
  });
});
