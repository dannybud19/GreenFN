import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { loadPlayers } from "@/lib/data.server";
import { buildInitial } from "@/lib/initial.server";

// A deep link: the dashboard with this player selected. Only ids in players.json exist; any other id is a 404.
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
  const initial = await buildInitial(id);
  if (!initial) notFound();
  return <Dashboard initial={initial} />;
}
