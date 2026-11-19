import { describe, expect, it } from "vitest";
import { computeGrid, LABEL, layoutLabels, majorStep, minorAlpha, niceStep } from "./grid";

// Roughly the app's 1x map: 723 x 338 px of dots inside an 840 x 593 plot.
const box = { minX: 50, maxX: 773, minY: 128, maxY: 466 };
const W = 840;
const H = 593;

describe("map grid", () => {
  it("niceStep picks 1, 2 or 5 times a power of ten, at least the given spacing", () => {
    expect(niceStep(8)).toBe(20);
    expect(niceStep(20)).toBe(5);
    expect(niceStep(64)).toBe(2);
    expect(niceStep(90)).toBe(1);
    expect(niceStep(400)).toBe(0.5);
  });

  it("the major step is the nice step closest to 90 px on screen", () => {
    expect(majorStep(7.23, 3.38)).toBe(10); // 1x: 72 px across beats 145 px
    expect(majorStep(57.8, 27)).toBe(2); // 8x: 116 px beats 58 px
    expect(majorStep(90, 50)).toBe(1);
    expect(majorStep(300, 100)).toBe(0.2); // 60 px vs 150 px
  });

  it("minor lines fade in between 6 and 24 px", () => {
    expect(minorAlpha(5)).toBe(0);
    expect(minorAlpha(15)).toBeCloseTo(0.5);
    expect(minorAlpha(30)).toBe(1);
  });

  it("at 1x labels 0, 10, 20 ... 100 on both axes, origin at the top-left", () => {
    const g = computeGrid({ k: 1, x: 0, y: 0 }, box, W, H);
    expect(g.major).toBe(10);
    const tens = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(g.xs.filter((l) => l.major).map((l) => l.v)).toEqual(tens);
    expect(g.ys.filter((l) => l.major).map((l) => l.v)).toEqual(tens);
    expect(g.ys[0].px).toBe(128); // 0 at the top
    const lab = layoutLabels(g, W, H);
    expect(lab.across.map((l) => l.v)).toEqual(tens);
    expect(lab.down.map((l) => l.v)).toEqual(tens);
  });

  it("numbers sit at the grid edge, centred on their lines, with a 4 px tick", () => {
    const g = computeGrid({ k: 1, x: 0, y: 0 }, box, W, H);
    const lab = layoutLabels(g, W, H);
    for (const l of lab.across) {
      expect(l.y).toBe(128 - LABEL.gapTop);
      expect(l.tick).toEqual([l.x, 128 - 4, l.x, 128]);
      expect(g.xs.some((line) => line.major && line.v === l.v && line.px === l.x)).toBe(true);
    }
    for (const l of lab.down) {
      expect(l.x).toBe(50 - LABEL.gapLeft);
      expect(l.tick).toEqual([50 - 4, l.y, 50, l.y]);
    }
  });

  it("when the grid edge is off screen the numbers stick to the visible edge", () => {
    const t = { k: 4, x: -1200, y: -900 };
    const g = computeGrid(t, box, W, H);
    expect(g.span.y0).toBeLessThan(0);
    const lab = layoutLabels(g, W, H);
    expect(lab.top).toBe(LABEL.gapTop + LABEL.h);
    expect(lab.across.every((l) => l.y === lab.top - LABEL.gapTop)).toBe(true);
    expect(lab.left).toBeGreaterThanOrEqual(LABEL.gapLeft);
    expect(lab.across.every((l) => l.x >= lab.left - 0.5 && l.x <= W)).toBe(true);
  });

  it("shows no numbers for a grid that is entirely off screen", () => {
    // Panned down so far that the grid's top edge is below the plot.
    const g = computeGrid({ k: 4, x: 200, y: 150 }, box, W, H);
    expect(g.span.y0).toBeGreaterThan(H);
    const lab = layoutLabels(g, W, H);
    expect(lab.across).toEqual([]);
    expect(lab.down).toEqual([]);
  });

  it("skips every other number rather than let two overlap", () => {
    // Squash the across axis so 10-unit lines are only 20 px apart.
    const g = computeGrid({ k: 1, x: 0, y: 0 }, { minX: 0, maxX: 200, minY: 0, maxY: 900 }, 300, 1000);
    const lab = layoutLabels(g, 300, 1000);
    const xs = lab.across.map((l) => l.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(3 * LABEL.charW + 6);
  });
});
