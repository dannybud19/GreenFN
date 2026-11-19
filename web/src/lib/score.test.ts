import { describe, expect, it } from "vitest";
import type { Profiles } from "./data";
import { careerScores, topK } from "./score";

// Four players with 2-d unit profiles. Player 0 is the query.
//   1: same centre and peak as 0 but a very different spread
//   2: slightly different shape, same spread as 0
//   3: opposite shape
const profiles: Profiles = {
  ids: ["a", "b", "c", "d"],
  centre: [[1, 0], [1, 0], [Math.SQRT1_2, Math.SQRT1_2], [-1, 0]],
  peak: [[1, 0], [1, 0], [Math.SQRT1_2, Math.SQRT1_2], [-1, 0]],
  spread: [0.02, 0.1, 0.02, 0.02],
  scales: { centre: 0.5, peak: 0.5, spread: 0.02 },
  weights: { alpha: 0.25, beta: 0.75 },
};

describe("careerScores", () => {
  it("matches a hand calculation", () => {
    const s = careerScores(profiles, 0, 0);
    // player 1: (0.25 * 1 + 0.75 * 1) / 0.5 = 2
    expect(s[1]).toBeCloseTo(2, 10);
    // player 2: (0.25 + 0.75) * 0.7071 / 0.5
    expect(s[2]).toBeCloseTo(Math.SQRT2, 10);
    // player 3: (0.25 + 0.75) * -1 / 0.5
    expect(s[3]).toBeCloseTo(-2, 10);
  });

  it("excludes the player himself", () => {
    expect(careerScores(profiles, 0, 0)[0]).toBe(-Infinity);
    expect(topK(careerScores(profiles, 0, 0), 10)).not.toContain(0);
  });

  it("ignores spread at lambda 0", () => {
    const a = careerScores(profiles, 0, 0);
    expect(topK(a, 3)).toEqual([1, 2, 3]);
  });

  it("subtracts lambda times the scaled spread gap", () => {
    const s0 = careerScores(profiles, 0, 0);
    const s1 = careerScores(profiles, 0, 1);
    // spread gap for player 1 is 0.08, scaled by 0.02 = 4, times lambda 1
    expect(s0[1] - s1[1]).toBeCloseTo(4, 10);
    expect(s0[2] - s1[2]).toBeCloseTo(0, 10);
  });

  it("raising lambda reduces the spread gap of the top comps", () => {
    const gap = (lambda: number) => {
      const top = topK(careerScores(profiles, 0, lambda), 1);
      return Math.abs(profiles.spread[0] - profiles.spread[top[0]]);
    };
    expect(gap(0)).toBeCloseTo(0.08, 10); // the same-shape, different-spread player wins at lambda 0
    expect(gap(1)).toBeCloseTo(0, 10); // the same-spread player wins once consistency matters
  });
});

describe("topK", () => {
  it("returns the best indices in order and respects k", () => {
    expect(topK([0.1, 0.9, 0.5, 0.7], 2)).toEqual([1, 3]);
    expect(topK([0.1, 0.9, 0.5, 0.7], 10)).toEqual([1, 3, 2, 0]);
  });
  it("gives ties to the lower index and skips -Infinity", () => {
    expect(topK([0.5, -Infinity, 0.5], 2)).toEqual([0, 2]);
  });
});
