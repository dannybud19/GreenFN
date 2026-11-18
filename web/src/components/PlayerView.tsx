"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPlayers, fetchProfiles, type PlayerRow } from "@/lib/data";
import { years } from "@/lib/format";
import { careerScores, topK } from "@/lib/score";
import { MiniMap } from "./MiniMap";
import { WhyChart } from "./WhyChart";

export type CompRow = { id: string; name: string; first: number; last: number; pos: string; score: number };

type Props = {
  player: PlayerRow;
  /** The precomputed top 10 at lambda 0 (identical to the Python list). */
  comps: CompRow[];
  /** Why-similar rows (one value per stat, in `labels` order) for the default top 5. */
  why: Record<string, number[]>;
  labels: string[];
  map: [number, number, number][];
};

export function PlayerView({ player, comps, why, labels, map }: Props) {
  const [lambda, setLambda] = useState(0);
  const [computed, setComputed] = useState<{ lambda: number; rows: CompRow[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  // Above lambda 0 the list is recomputed in the browser; profiles.json and players.json load once, on first use.
  useEffect(() => {
    if (lambda === 0) return;
    let cancelled = false;
    Promise.all([fetchProfiles(), fetchPlayers()])
      .then(([prof, players]) => {
        if (cancelled) return;
        const i = prof.ids.indexOf(player.id);
        const scores = careerScores(prof, i, lambda);
        const byId = new Map(players.map((p) => [p.id, p]));
        const rows = topK(scores, 10).flatMap((j) => {
          const p = byId.get(prof.ids[j]);
          return p ? [{ id: p.id, name: p.name, first: p.first, last: p.last, pos: p.pos, score: scores[j] }] : [];
        });
        setComputed({ lambda, rows });
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [lambda, player.id]);

  const shown = lambda === 0 ? comps : (computed?.rows ?? comps);
  const stale = lambda > 0 && computed?.lambda !== lambda && !failed;
  const selectedId = shown.some((c) => c.id === picked) ? picked : (shown[0]?.id ?? null);
  const selected = shown.find((c) => c.id === selectedId) ?? null;
  const breakdown = selectedId ? why[selectedId] : undefined;

  const scores = shown.map((c) => c.score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const barWidth = (s: number) => (hi === lo ? 100 : 12 + (88 * (s - lo)) / (hi - lo));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="comps-heading">
        <h2 id="comps-heading" className="text-lg font-semibold">
          Closest career comps
        </h2>

        <div className="mt-3 rounded-lg border border-border bg-card p-3">
          <label htmlFor="lambda" className="block text-sm font-medium">
            Career shape weight (lambda): {lambda.toFixed(2)}
          </label>
          <input
            id="lambda"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={lambda}
            onChange={(e) => setLambda(Number(e.target.value))}
            aria-describedby="lambda-help"
            className="mt-2 w-full"
          />
          <p id="lambda-help" className="mt-1 text-xs text-muted">
            Higher values favour careers with a similar consistency, not just a similar style.
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted" aria-live="polite">
            <button
              type="button"
              onClick={() => setLambda(0)}
              disabled={lambda === 0}
              className="rounded border border-border px-2 py-1 text-foreground disabled:opacity-40"
            >
              Back to default
            </button>
            {stale && <span>Loading...</span>}
            {failed && <span>The slider data could not be loaded.</span>}
          </div>
        </div>

        <ol className={`mt-4 space-y-1 ${stale ? "opacity-60" : ""}`}>
          {shown.map((c, i) => {
            const isSel = c.id === selectedId;
            return (
              <li key={c.id}>
                <div
                  className={`rounded-lg border px-3 py-2 ${isSel ? "border-accent bg-accent-soft" : "border-border bg-card"}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="w-5 text-right text-sm tabular-nums text-muted">{i + 1}</span>
                    <Link href={`/player/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-sm text-muted">
                      {years(c.first, c.last)}
                      {c.pos ? ` · ${c.pos}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPicked(c.id)}
                      aria-pressed={isSel}
                      aria-label={`Show why ${player.name} and ${c.name} are similar`}
                      className="ml-auto rounded border border-border px-2 py-0.5 text-xs hover:bg-accent-soft"
                    >
                      Why similar
                    </button>
                  </div>
                  <div className="ml-7 mt-1.5 h-2 rounded bg-border" aria-hidden="true">
                    <div className="h-2 rounded bg-accent" style={{ width: `${barWidth(c.score)}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="space-y-8">
        <section aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-lg font-semibold">
            Why similar{selected ? `: ${selected.name}` : ""}
          </h2>
          {selected && breakdown ? (
            <>
              <WhyChart labels={labels} values={breakdown} aName={player.name} bName={selected.name} />
              <p className="mt-2 text-xs text-muted">
                Positive bars: stats that make them more alike than an average player would be. Computed with
                integrated gradients.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Breakdowns are precomputed for the default top 5.</p>
          )}
        </section>

        <section aria-labelledby="map-heading">
          <h2 id="map-heading" className="mb-2 text-lg font-semibold">
            Career on the map
          </h2>
          <MiniMap playerName={player.name} points={map} comps={shown} selectedId={selectedId} />
        </section>
      </div>
    </div>
  );
}
