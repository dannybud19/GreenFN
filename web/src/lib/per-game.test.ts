import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { MapData, PlayerFile } from "./data";

const dir = path.join(process.cwd(), "public", "data");
const read = <T,>(f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as T;
const season = (id: string, year: number) => read<PlayerFile>(`player/${id}.json`).seasons.find((s) => s[0] === year);

describe("per-game points, rebounds and assists (Phase 7d)", () => {
  it("matches the dataset's known values", () => {
    expect(season("jordami01", 1987)).toEqual([1987, 37.1, 5.2, 4.6]);
    expect(season("jordami01", 1992)).toEqual([1992, 30.1, 6.4, 6.1]);
    expect(season("stockjo01", 1985)).toEqual([1985, 5.6, 1.3, 5.1]);
  });

  it("covers every app season exactly, in season order, with one-decimal values", () => {
    const map = read<MapData>("map.json");
    const files = readdirSync(path.join(dir, "player"));
    let n = 0;
    for (const f of files) {
      const p = read<PlayerFile>(`player/${f}`);
      const years = map[p.id].map((s) => s[0]).sort((a, b) => a - b);
      expect(p.seasons.map((s) => s[0])).toEqual(years);
      for (const [, ...vals] of p.seasons) for (const v of vals) expect(Math.round(v * 10) / 10).toBe(v);
      n += p.seasons.length;
    }
    expect(n).toBe(14672);
  });
});
