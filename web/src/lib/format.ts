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

const normalise = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Players whose name contains every typed word; names starting with the first word come first, then longer careers. */
export function searchPlayers(players: PlayerRow[], query: string, limit: number): PlayerRow[] {
  const tokens = normalise(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const hits: { p: PlayerRow; rank: number }[] = [];
  for (const p of players) {
    const n = normalise(p.name);
    if (!tokens.every((t) => n.includes(t))) continue;
    const words = n.split(/[\s.'-]+/);
    const rank = n.startsWith(tokens[0]) ? 0 : words.some((w) => w.startsWith(tokens[0])) ? 1 : 2;
    hits.push({ p, rank });
  }
  hits.sort((a, b) => a.rank - b.rank || b.p.seasons - a.p.seasons || a.p.name.localeCompare(b.p.name));
  return hits.slice(0, limit).map((h) => h.p);
}

/**
 * Plain words for each of the 15 style stats, used in the why-similar sentence. A positive attribution means the
 * two careers are alike on that stat (not that both are high), so each phrase names the stat, not a level.
 */
export const STAT_PHRASES: Record<string, string> = {
  fga_per_100_poss: "how often they shot",
  x3p_ar: "how many of their shots were threes",
  f_tr: "how often they got to the line",
  ts_percent: "how efficiently they scored",
  x3p_percent_shrunk: "their three-point accuracy",
  x2p_percent_shrunk: "their two-point accuracy",
  ft_percent_shrunk: "their free-throw accuracy",
  usg_percent: "how much of the offence ran through them",
  ast_percent: "how often they set up teammates",
  tov_percent: "how often they turned it over",
  orb_percent: "how often they grabbed offensive rebounds",
  drb_percent: "how often they grabbed defensive rebounds",
  stl_percent: "how often they got steals",
  blk_percent: "how often they blocked shots",
  pf_per_100_poss: "how often they fouled",
};

const joinWords = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** "Both match closely on A, B and C." from the top 3 positive attributions. */
export function whySentence(values: number[], features: string[]): string {
  const top = values
    .map((v, i) => ({ v, f: features[i] }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map((x) => STAT_PHRASES[x.f] ?? x.f);
  if (!top.length) return "Both careers line up only loosely: no single stat stands out.";
  return `Both match closely on ${joinWords(top)}.`;
}

/**
 * Row order for the why card: the top 3 shared stats, then the biggest difference, then the rest by value,
 * so the 4 rows visible without scrolling are the ones nothing-style.md asks for.
 */
export function whyOrder(values: number[]): number[] {
  const byValue = values.map((_, i) => i).sort((a, b) => values[b] - values[a]);
  const top = byValue.filter((i) => values[i] > 0).slice(0, 3);
  const worst = byValue[byValue.length - 1];
  const head = values[worst] < 0 ? [...top, worst] : top;
  return [...head, ...byValue.filter((i) => !head.includes(i))];
}

/** "Steadier than 99% of players" style meter value: dots filled for steadiness (12 dots). */
export function steadiness(spreadPct: number | null): number | null {
  return spreadPct === null ? null : 1 - spreadPct;
}
