// Types and client-side loaders for the files in public/data/ (written by src/export_web.py).
// Server-side loaders (fs, used at build time for static generation) live in data.server.ts.

export type PlayerRow = {
  id: string;
  name: string;
  first: number;
  last: number;
  seasons: number;
  decade: number;
  pos: string;
  /** Share of players with 4+ seasons who have a lower (steadier) spread; null if the player has fewer than 4 seasons. */
  spreadPct: number | null;
};

/** One player's page data: top 10 comps [id, score], why-similar rows for the top 5 (15 values, in meta.features order), his map points [season, x, y]. */
export type PlayerFile = {
  id: string;
  comps: [string, number][];
  why: Record<string, number[]>;
  map: [number, number, number][];
};

export type MapData = Record<string, [number, number, number][]>;

export type Profiles = {
  ids: string[];
  centre: number[][];
  peak: number[][];
  spread: number[];
  scales: { centre: number; peak: number; spread: number };
  weights: { alpha: number; beta: number };
};

export type Meta = {
  features: string[];
  labels: string[];
  model: unknown;
  counts: { players: number; seasons: number; players_explained: number };
  exportsCreated: string;
  attribution: string;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return (await res.json()) as T;
}

let profilesCache: Promise<Profiles> | null = null;
let mapCache: Promise<MapData> | null = null;
let playersCache: Promise<PlayerRow[]> | null = null;

/** Loaded once, only when the lambda slider first moves. */
export function fetchProfiles(): Promise<Profiles> {
  return (profilesCache ??= getJson<Profiles>("/data/profiles.json"));
}

/** Loaded on demand by the map page and the mini map. */
export function fetchMap(): Promise<MapData> {
  return (mapCache ??= getJson<MapData>("/data/map.json"));
}

export function fetchPlayers(): Promise<PlayerRow[]> {
  return (playersCache ??= getJson<PlayerRow[]>("/data/players.json"));
}
