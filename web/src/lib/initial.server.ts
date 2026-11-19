// What every statically generated page hands the dashboard. Kept small on purpose: players.json (0.3 MB) and
// map.json (0.4 MB) are fetched in the browser, so they are not repeated inside ~2,470 HTML pages.
import type { PlayerFile, PlayerRow, Region } from "./data";
import { loadLegends, loadMeta, loadPlayerFile, loadPlayers, loadRegions } from "./data.server";

export type LegendRow = { player: PlayerRow; match: PlayerRow };

export type Selected = { player: PlayerRow; file: PlayerFile; comps: PlayerRow[] };

export type Initial = {
  regions: Region[];
  /** Feature labels and keys, in the order of the why-similar arrays. */
  labels: string[];
  features: string[];
  attribution: string;
  legends: LegendRow[];
  selected: Selected | null;
};

export async function buildInitial(id?: string): Promise<Initial | null> {
  const [players, meta, regions, legendIds] = await Promise.all([loadPlayers(), loadMeta(), loadRegions(), loadLegends()]);
  const byId = new Map(players.map((p) => [p.id, p]));
  const legends = legendIds.flatMap(({ id: lid, match }) => {
    const player = byId.get(lid);
    const m = byId.get(match);
    return player && m ? [{ player, match: m }] : [];
  });

  let selected: Selected | null = null;
  if (id !== undefined) {
    const player = byId.get(id);
    const file = await loadPlayerFile(id);
    if (!player || !file) return null;
    selected = { player, file, comps: file.comps.flatMap(([cid]) => byId.get(cid) ?? []) };
  }
  return { regions, labels: meta.labels, features: meta.features, attribution: meta.attribution, legends, selected };
}
