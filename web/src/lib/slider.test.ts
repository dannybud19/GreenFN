import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PlayerRow, Profiles } from "./data";
import { careerScores, topK } from "./score";

const dir = path.join(process.cwd(), "public", "data");
const profiles = JSON.parse(readFileSync(path.join(dir, "profiles.json"), "utf8")) as Profiles;
const players = JSON.parse(readFileSync(path.join(dir, "players.json"), "utf8")) as PlayerRow[];
const byId = new Map(players.map((p) => [p.id, p]));

describe("lambda slider on the real data", () => {
  it("returns 10 known players, never the player himself, for every player at lambda 0.5 and 1", () => {
    for (const lambda of [0.5, 1]) {
      for (let i = 0; i < profiles.ids.length; i++) {
        const top = topK(careerScores(profiles, i, lambda), 10);
        expect(top).toHaveLength(10);
        expect(top).not.toContain(i);
        for (const j of top) expect(byId.has(profiles.ids[j])).toBe(true);
      }
    }
  });

  it("raising lambda shrinks the mean spread gap of the top 10 (as in the Phase 5 lambda effect)", () => {
    const meanGap = (lambda: number) => {
      let total = 0;
      for (let i = 0; i < profiles.ids.length; i++) {
        const top = topK(careerScores(profiles, i, lambda), 10);
        total += top.reduce((a, j) => a + Math.abs(profiles.spread[i] - profiles.spread[j]), 0) / top.length;
      }
      return total / profiles.ids.length;
    };
    const gaps = [0, 0.25, 0.5, 1].map(meanGap);
    console.log(`SLIDER mean spread gap at lambda 0, 0.25, 0.5, 1: ${gaps.map((g) => g.toFixed(4)).join(", ")}`);
    for (let k = 1; k < gaps.length; k++) expect(gaps[k]).toBeLessThan(gaps[k - 1]);
  }, 120_000);

  it("changes Jordan's list when lambda rises", () => {
    const i = profiles.ids.indexOf("jordami01");
    const at0 = topK(careerScores(profiles, i, 0), 10);
    const at1 = topK(careerScores(profiles, i, 1), 10);
    expect(at1).not.toEqual(at0);
  });
});
