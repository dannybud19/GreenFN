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
  /** Index into regions.json: the most common map region of his seasons. */
  region: number;
};

/** One player's page data: top 10 comps [id, score], why-similar rows for the top 5 (15 values, in meta.features order), his map points [season, x, y]. */
export type PlayerFile = {
  id: string;
  region: number;
  comps: [string, number][];
  why: Record<string, number[]>;
  map: [number, number, number][];
};

/** One season on the map: [season, x, y, team codes joined by "/", region index]. */
export type MapPoint = [number, number, number, string, number];

export type MapData = Record<string, MapPoint[]>;

/** A team code with its players who have the most qualified seasons for it: top = [id, seasons, first, last]. */
export type Team = {
  code: string;
  name: string;
  short: string;
  first: number;
  last: number;
  seasons: number;
  players: number;
  top: [string, number, number, number][];
};

/** A map region (k-means on the 2D map): a reading aid, not a model output. */
export type Region = { name: string; desc: string; x: number; y: number };

/** A hand-picked legend to try and his closest career comp. */
export type Legend = { id: string; match: string };

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
let teamsCache: Promise<Team[]> | null = null;
const playerFiles = new Map<string, Promise<PlayerFile>>();

/** Loaded once, only when the lambda slider first moves. */
export function fetchProfiles(): Promise<Profiles> {
  return (profilesCache ??= getJson<Profiles>("/data/profiles.json"));
}

/** Loaded once by the map panel. */
export function fetchMap(): Promise<MapData> {
  return (mapCache ??= getJson<MapData>("/data/map.json"));
}

export function fetchPlayers(): Promise<PlayerRow[]> {
  return (playersCache ??= getJson<PlayerRow[]>("/data/players.json"));
}

export function fetchTeams(): Promise<Team[]> {
  return (teamsCache ??= getJson<Team[]>("/data/teams.json"));
}

/** One player's file, cached; a failed load is dropped from the cache so it can be retried. */
export function fetchPlayerFile(id: string): Promise<PlayerFile> {
  let p = playerFiles.get(id);
  if (!p) {
    p = getJson<PlayerFile>(`/data/player/${id}.json`);
    p.catch(() => playerFiles.delete(id));
    playerFiles.set(id, p);
  }
  return p;
}
