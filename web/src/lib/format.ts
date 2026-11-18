import type { Meta, PlayerRow } from "./data";

/** "1985 to 2003", or just "1985" for a single season. */
export function years(first: number, last: number): string {
  return first === last ? String(first) : `${first} to ${last}`;
}

/**
 * Career shape in words. `spreadPct` is the share of players with 4+ seasons whose spread is LOWER (steadier)
 * than this player's, so a low value means a very steady career. Percentages are rounded down, never up.
 */
export function spreadWords(spreadPct: number | null): string {
  if (spreadPct === null) return "Career shape not rated (fewer than 4 seasons)";
  if (spreadPct === 0) return "The steadiest of all players with 4+ seasons";
  const steadier = Math.floor((1 - spreadPct) * 100);
  const lessSteady = Math.floor(spreadPct * 100);
  return steadier >= 50
    ? `Steadier than ${steadier}% of players with 4+ seasons`
    : `Less steady than ${lessSteady}% of players with 4+ seasons`;
}

/** Display labels for the 15 style stats, in the order of the why-similar arrays. */
export function featureLabels(meta: Meta): string[] {
  return meta.labels;
}

export function playerSummary(p: PlayerRow): string {
  return `${years(p.first, p.last)} · ${p.seasons} ${p.seasons === 1 ? "season" : "seasons"}${p.pos ? ` · ${p.pos}` : ""}`;
}
