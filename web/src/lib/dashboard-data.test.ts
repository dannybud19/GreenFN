import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Legend, MapData, PlayerFile, PlayerRow, Region, Team } from "./data";

const dir = path.join(process.cwd(), "public", "data");
const read = <T,>(f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as T;

describe("Phase 7b data: teams, regions, legends", () => {
  const map = read<MapData>("map.json");
  const teams = read<Team[]>("teams.json");
  const regions = read<Region[]>("regions.json");
  const legends = read<Legend[]>("legends.json");
  const players = read<PlayerRow[]>("players.json");
  const ids = new Set(players.map((p) => p.id));

  it("teams.json covers every team code in map.json, and every code has a name", () => {
    const codes = new Set<string>();
    for (const seasons of Object.values(map)) for (const s of seasons) for (const c of s[3].split("/")) codes.add(c);
    const named = new Map(teams.map((t) => [t.code, t.name]));
    for (const c of codes) {
      expect(named.has(c), `team code ${c}`).toBe(true);
      expect(named.get(c)!.length).toBeGreaterThan(0);
    }
    expect(teams.length).toBe(codes.size);
    console.log(`TEAMS ${teams.length} codes, all named`);
  });

  it("team top lists name real players with sensible counts", () => {
    for (const t of teams) {
      expect(t.top.length).toBeGreaterThan(0);
      expect(t.top.length).toBeLessThanOrEqual(10);
      for (const [pid, n, first, last] of t.top) {
        expect(ids.has(pid)).toBe(true);
        expect(n).toBeGreaterThan(0);
        expect(last).toBeGreaterThanOrEqual(first);
      }
    }
    expect(teams.find((t) => t.code === "CHI")!.top[0][0]).toBe("jordami01");
  });

  it("has 9 regions with unique names, and every season's region is one of them", () => {
    expect(regions).toHaveLength(9);
    expect(new Set(regions.map((r) => r.name)).size).toBe(9);
    for (const seasons of Object.values(map)) for (const s of seasons) expect(s[4] >= 0 && s[4] < 9).toBe(true);
  });

  it("every legend and his closest match exist in players.json", () => {
    expect(legends.length).toBeGreaterThan(0);
    expect(legends.length).toBeLessThanOrEqual(10);
    for (const l of legends) {
      expect(ids.has(l.id)).toBe(true);
      expect(ids.has(l.match)).toBe(true);
      expect(read<PlayerFile>(`player/${l.id}.json`).comps[0][0]).toBe(l.match);
    }
  });

  it("player files and the search index carry a region", () => {
    const f = read<PlayerFile>("player/jordami01.json");
    expect(f.region).toBeGreaterThanOrEqual(0);
    expect(players.find((p) => p.id === "jordami01")!.region).toBe(f.region);
  });
});
