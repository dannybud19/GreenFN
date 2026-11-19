"use client";

import { useEffect, useState } from "react";
import { fetchMap, type MapData } from "@/lib/data";

type Pt = [number, number, number];
type Props = {
  playerName: string;
  points: Pt[];
  /** Comps in list order; the first five are drawn faintly behind the player's own career. */
  comps: { id: string; name: string }[];
  selectedId: string | null;
};

const W = 420;
const H = 300;
const PAD = 28;

export function MiniMap({ playerName, points, comps, selectedId }: Props) {
  const [map, setMap] = useState<MapData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMap()
      .then((m) => !cancelled && setMap(m))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const behind = map ? comps.slice(0, 5).map((c) => ({ ...c, pts: map[c.id] ?? [] })) : [];
  const all = [...points, ...behind.flatMap((b) => b.pts)];
  const xs = all.map((p) => p[1]);
  const ys = all.map((p) => p[2]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 0.5);
  const scale = (Math.min(W, H) - 2 * PAD) / span;
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;
  const px = (x: number) => ox + (x - minX) * scale;
  const py = (y: number) => H - (oy + (y - minY) * scale);
  const line = (pts: Pt[]) => [...pts].sort((a, b) => a[0] - b[0]).map((p) => `${px(p[1]).toFixed(1)},${py(p[2]).toFixed(1)}`).join(" ");
  const own = [...points].sort((a, b) => a[0] - b[0]);
  const first = own[0];
  const last = own[own.length - 1];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${playerName}'s career on the map, season by season, with his closest comps faint behind`} className="w-full rounded-lg border border-border bg-card">
        {behind.map((b) =>
          b.pts.length ? (
            <polyline
              key={b.id}
              points={line(b.pts)}
              fill="none"
              stroke={b.id === selectedId ? "var(--accent)" : "var(--muted)"}
              strokeOpacity={b.id === selectedId ? 0.8 : 0.3}
              strokeWidth={b.id === selectedId ? 2 : 1.2}
              strokeDasharray={b.id === selectedId ? undefined : "4 3"}
            />
          ) : null,
        )}
        <polyline points={line(points)} fill="none" stroke="var(--foreground)" strokeWidth="2" />
        {own.map((p) => (
          <circle key={p[0]} cx={px(p[1])} cy={py(p[2])} r="3.2" fill="var(--foreground)" stroke="var(--card)" strokeWidth="1" />
        ))}
        {first && (
          <text x={px(first[1])} y={py(first[2]) - 8} fontSize="11" textAnchor="middle" fill="var(--foreground)">
            {first[0]}
          </text>
        )}
        {last && last !== first && (
          <text x={px(last[1])} y={py(last[2]) - 8} fontSize="11" textAnchor="middle" fill="var(--foreground)">
            {last[0]}
          </text>
        )}
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        {failed
          ? "The map could not be loaded."
          : map
            ? "Solid line: this player's seasons. Dashed lines: his closest comps. A 2D picture for intuition only."
            : "Loading map..."}
      </figcaption>
    </figure>
  );
}
