// Build-time loaders: read public/data/ straight from disk for static generation. Server-side only.
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Meta, PlayerFile, PlayerRow, Profiles } from "./data";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(...parts: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA_DIR, ...parts), "utf8")) as T;
}

export const loadPlayers = () => readJson<PlayerRow[]>("players.json");
export const loadMeta = () => readJson<Meta>("meta.json");
export const loadProfiles = () => readJson<Profiles>("profiles.json");
export const loadParity = () => readJson<Record<string, string[]>>("parity.json");

/** Returns null for an id with no file, so the page can answer 404. */
export async function loadPlayerFile(id: string): Promise<PlayerFile | null> {
  if (!/^[a-z0-9]+$/.test(id)) return null;
  try {
    return await readJson<PlayerFile>("player", `${id}.json`);
  } catch {
    return null;
  }
}
