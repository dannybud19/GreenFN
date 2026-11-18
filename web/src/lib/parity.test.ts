import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Profiles } from "./data";
import { careerScores, topK } from "./score";

const dir = path.join(process.cwd(), "public", "data");
const profiles = JSON.parse(readFileSync(path.join(dir, "profiles.json"), "utf8")) as Profiles;
const parity = JSON.parse(readFileSync(path.join(dir, "parity.json"), "utf8")) as Record<string, string[]>;

describe("parity with the Python top 10 at lambda 0", () => {
  it("top comp matches for every player, top-10 set for at least 99%", () => {
    let top1 = 0;
    let set10 = 0;
    let exact = 0;
    const n = profiles.ids.length;
    for (let i = 0; i < n; i++) {
      const ts = topK(careerScores(profiles, i, 0), 10).map((j) => profiles.ids[j]);
      const py = parity[profiles.ids[i]];
      if (ts[0] === py[0]) top1++;
      if (ts.length === py.length && new Set(ts).size === new Set([...ts, ...py]).size) set10++;
      if (ts.every((id, k) => id === py[k])) exact++;
    }
    const rates = { top1: top1 / n, set10: set10 / n, exact: exact / n };
    console.log(
      `PARITY players=${n} top1=${(rates.top1 * 100).toFixed(2)}% (${top1}) ` +
        `top10set=${(rates.set10 * 100).toFixed(2)}% (${set10}) exact=${(rates.exact * 100).toFixed(2)}% (${exact})`,
    );
    expect(top1).toBe(n);
    expect(rates.set10).toBeGreaterThanOrEqual(0.99);
  }, 120_000);
});
