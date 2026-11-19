import { describe, expect, it } from "vitest";
import { computeGrid, minorAlpha, niceStep } from "./grid";

const box = { minX: 50, maxX: 850, minY: 40, maxY: 540 }; // 800 x 500 px at 1x

describe("map grid", () => {
  it("picks 1, 2 or 5 times a power of ten, at least 90 px apart", () => {
    expect(niceStep(8)).toBe(20); // 90 / 8 = 11.25 -> 20
    expect(niceStep(5)).toBe(20); // 18 -> 20
    expect(niceStep(20)).toBe(5); // 4.5 -> 5
    expect(niceStep(40)).toBe(5); // 2.25 -> 5
    expect(niceStep(64)).toBe(2); // 1.41 -> 2
    expect(niceStep(90)).toBe(1);
    expect(niceStep(400)).toBe(0.5);
    expect(niceStep(1000)).toBe(0.1);
  });

  it("minor lines fade in between 6 and 24 px", () => {
    expect(minorAlpha(5)).toBe(0);
    expect(minorAlpha(15)).toBeCloseTo(0.5);
    expect(minorAlpha(30)).toBe(1);
  });

  it("at 1x spans 0 to 100 with the origin at the top-left", () => {
    const g = computeGrid({ k: 1, x: 0, y: 0 }, box, 900, 600);
    expect(g.major).toBe(20); // 5 px per unit down -> 18 -> 20
    const majorsX = g.xs.filter((l) => l.major).map((l) => l.v);
    expect(majorsX).toEqual([0, 20, 40, 60, 80, 100]);
    expect(g.xs[0].px).toBe(50);
    expect(g.ys[0].px).toBe(40); // 0 at the top
    expect(g.ys[g.ys.length - 1].px).toBe(540); // 100 at the bottom
    expect(g.decimals).toBe(0);
  });

  it("gets finer when zoomed in and only lists lines in view", () => {
    const t = { k: 8, x: -2000, y: -1500 };
    const g = computeGrid(t, box, 900, 600);
    // 8x: 64 px per unit across, 40 down -> 90 / 40 = 2.25 -> 5; minors every 1 unit (40 px) fully visible.
    expect(g.major).toBe(5);
    expect(g.minor).toBe(1);
    expect(g.minorAlpha).toBe(1);
    for (const l of g.xs) expect(l.px >= -0.5 && l.px <= 900.5).toBe(true);
    for (const l of g.ys) expect(l.px >= -0.5 && l.px <= 600.5).toBe(true);
    expect(g.xs.some((l) => l.major)).toBe(true);
    // Very deep zoom would need decimals.
    expect(computeGrid({ k: 8, x: 0, y: 0 }, { minX: 0, maxX: 2500, minY: 0, maxY: 2500 }, 900, 600).decimals).toBe(1); // 200 px per unit -> step 0.5
  });
});
