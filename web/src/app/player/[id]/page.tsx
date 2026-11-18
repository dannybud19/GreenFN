import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerView, type CompRow } from "@/components/PlayerView";
import { loadMeta, loadPlayerFile, loadPlayers } from "@/lib/data.server";
import { playerSummary, spreadWords } from "@/lib/format";

// Only the players in players.json exist; any other id is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const players = await loadPlayers();
  return players.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/player/[id]">): Promise<Metadata> {
  const { id } = await params;
  const player = (await loadPlayers()).find((p) => p.id === id);
  return { title: player ? player.name : "Player not found" };
}

export default async function PlayerPage({ params }: PageProps<"/player/[id]">) {
  const { id } = await params;
  const [players, file, meta] = await Promise.all([loadPlayers(), loadPlayerFile(id), loadMeta()]);
  const player = players.find((p) => p.id === id);
  if (!player || !file) notFound();

  const byId = new Map(players.map((p) => [p.id, p]));
  const comps: CompRow[] = file.comps.flatMap(([cid, score]) => {
    const c = byId.get(cid);
    return c ? [{ id: c.id, name: c.name, first: c.first, last: c.last, pos: c.pos, score }] : [];
  });

  return (
    <article>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{player.name}</h1>
        <p className="mt-1 text-muted">{playerSummary(player)}</p>
        <p className="mt-1 text-sm">{spreadWords(player.spreadPct)}</p>
      </header>
      <PlayerView player={player} comps={comps} why={file.why} labels={meta.labels} map={file.map} />
    </article>
  );
}
