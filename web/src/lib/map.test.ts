import { describe, expect, it } from "vitest";
import { applyT, clampT, IDENTITY, K_MAX, zoomAround } from "./map";

const box = { minX: 100, maxX: 700, minY: 100, maxY: 500 };

describe("map pan and zoom transform", () => {
  it("zooming around a point keeps that point under the pointer", () => {
    const t = zoomAround(IDENTITY, 4, 300, 200);
    expect(applyT(t, 300, 200)).toEqual([300, 200]);
    const back = zoomAround(t, 1, 300, 200);
    expect(back.x).toBeCloseTo(0);
    expect(back.y).toBeCloseTo(0);
  });

  it("clamps the scale to 1x to 8x", () => {
    expect(clampT({ k: 20, x: 0, y: 0 }, box, 800, 600).k).toBe(K_MAX);
    expect(clampT({ k: 0.2, x: 0, y: 0 }, box, 800, 600).k).toBe(1);
  });

  it("never lets the dots be dragged fully out of view", () => {
    const far = clampT({ k: 2, x: -100000, y: 100000 }, box, 800, 600, 60);
    const [right] = applyT(far, box.maxX, 0);
    const [, top] = applyT(far, 0, box.minY);
    expect(right).toBeGreaterThanOrEqual(60);
    expect(top).toBeLessThanOrEqual(600 - 60);
  });

  it("leaves a transform that is already in range unchanged", () => {
    const t = { k: 2, x: -300, y: -200 };
    expect(clampT(t, box, 800, 600)).toEqual(t);
  });
});
