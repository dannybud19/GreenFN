import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { loadPlayers } from "@/lib/data.server";
import { playerSummary } from "@/lib/format";

const EXAMPLES = ["jordami01", "stockjo01", "rodmade01", "nashst01", "jokicni01", "curryst01"];

export default async function Home() {
  const players = await loadPlayers();
  const examples = EXAMPLES.flatMap((id) => players.find((p) => p.id === id) ?? []);
  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find the player with the same career shape.</h1>
      <p className="mt-3 text-lg text-muted">
        GreenFN compares whole NBA careers, not single seasons, and looks across eras. Search a player to see his closest
        comps and why they are alike.
      </p>
      <div className="mt-8">
        <SearchBox autoFocus />
      </div>
      <section className="mt-10" aria-labelledby="examples-heading">
        <h2 id="examples-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Try one of these
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {examples.map((p) => (
            <li key={p.id}>
              <Link
                href={`/player/${p.id}`}
                className="block rounded-lg border border-border bg-card px-3 py-2 hover:border-accent"
              >
                <span className="font-medium">{p.name}</span>
                <span className="block text-sm text-muted">{playerSummary(p)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
