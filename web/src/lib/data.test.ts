import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Meta, PlayerFile, PlayerRow, Profiles } from "./data";

const dir = path.join(process.cwd(), "public", "data");
const read = <T,>(f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as T;

describe("public/data", () => {
  const players = read<PlayerRow[]>("players.json");
  const meta = read<Meta>("meta.json");
  const profiles = read<Profiles>("profiles.json");

  it("has one file per player and consistent counts", () => {
    expect(players.length).toBe(meta.counts.players);
    expect(profiles.ids.length).toBe(players.length);
    expect(readdirSync(path.join(dir, "player")).length).toBe(players.length);
    for (const f of ["map.json", "parity.json", "meta.json", "profiles.json", "players.json"]) {
      expect(existsSync(path.join(dir, f))).toBe(true);
    }
  });

  it("player files have 10 comps, a 15-stat breakdown for the top 5 and map points", () => {
    for (const id of ["jordami01", "stockjo01", "rodmade01"]) {
      const f = read<PlayerFile>(`player/${id}.json`);
      expect(f.comps).toHaveLength(10);
      expect(Object.keys(f.why)).toHaveLength(5);
      for (const row of Object.values(f.why)) expect(row).toHaveLength(meta.features.length);
      expect(f.map.length).toBeGreaterThan(0);
    }
  });

  it("Kobe Bryant is among Jordan's comps", () => {
    const f = read<PlayerFile>("player/jordami01.json");
    expect(f.comps.map((c) => c[0])).toContain("bryanko01");
  });

  it("has 15 feature labels", () => {
    expect(meta.labels).toHaveLength(15);
    expect(meta.features).toHaveLength(15);
  });
});
