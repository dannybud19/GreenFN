import { describe, expect, it } from "vitest";
import { badge, badgeText, fitTransform, statLabel, stepState } from "./playback";

describe("career playback", () => {
  it("badges: up, down, same to one decimal, none on the first season", () => {
    expect(badge(undefined, 28.2)).toBeNull();
    expect(badge(28.2, 37.1)).toEqual({ kind: "up", diff: 8.9 });
    expect(badge(31.5, 30.1)).toEqual({ kind: "down", diff: 1.4 });
    expect(badge(6.4, 6.4)).toEqual({ kind: "same", diff: 0 });
    expect(badge(6.40, 6.43)).toEqual({ kind: "same", diff: 0 }); // same to one decimal
    expect(badgeText(badge(31.5, 30.1))).toBe("▼ 1.4");
    expect(badgeText(badge(5.2, 5.5))).toBe("▲ 0.3");
    expect(badgeText(badge(6.4, 6.4))).toBe("= 0.0");
    expect(badgeText(null)).toBe("");
  });

  it("labels each stat for screen readers", () => {
    expect(statLabel("PTS", 30.1, badge(31.5, 30.1))).toBe("PTS 30.1, down 1.4 from last season");
    expect(statLabel("AST", 6.1, badge(6.1, 6.1))).toBe("AST 6.1, no change from last season");
    expect(statLabel("REB", 6.5, null)).toBe("REB 6.5");
  });

  it("disables back on the first season and forward on the last", () => {
    expect(stepState(0, 14)).toEqual({ prevDisabled: true, nextDisabled: false });
    expect(stepState(6, 14)).toEqual({ prevDisabled: false, nextDisabled: false });
    expect(stepState(13, 14)).toEqual({ prevDisabled: false, nextDisabled: true });
    expect(stepState(0, 1)).toEqual({ prevDisabled: true, nextDisabled: true });
  });

  it("fits a career at most 4x and keeps the frame covering the plot", () => {
    // 260 px of room around the career (as in the lab): a tiny career in a 1200 px plot hits the 4x cap.
    const tight = fitTransform([600, 602], [600, 601], 1200, 1200);
    expect(tight.k).toBe(4);
    expect(fitTransform([400, 402], [300, 301], 900, 600).k).toBeCloseTo(600 / 261);
    const wide = fitTransform([0, 900], [0, 600], 900, 600);
    expect(wide).toEqual({ k: 1, x: 0, y: 0 });
    expect(tight.x).toBeLessThanOrEqual(0);
    expect(tight.x).toBeGreaterThanOrEqual(1200 * (1 - 4));
  });
});
