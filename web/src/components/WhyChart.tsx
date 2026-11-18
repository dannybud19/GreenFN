import { useId } from "react";

type Props = {
  labels: string[];
  values: number[];
  aName: string;
  bName: string;
};

const W = 480;
const ROW = 26;
const LABEL_W = 150;
const ZERO = 320;
const HALF = 130;

/** Diverging horizontal bars, sorted by value. Positive (accent) = makes the pair more alike; negative (hatched) = less alike. */
export function WhyChart({ labels, values, aName, bName }: Props) {
  const hatch = useId().replace(/:/g, "");
  const rows = labels.map((label, i) => ({ label, v: values[i] })).sort((x, y) => y.v - x.v);
  const max = Math.max(...rows.map((r) => Math.abs(r.v)), 1e-9);
  const k = HALF / max;
  const H = rows.length * ROW + 8;
  const fmt = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Why ${aName} and ${bName} are similar, by stat`}
        className="w-full"
      >
        <defs>
          <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--card)" />
            <rect width="3" height="6" fill="var(--neg)" />
          </pattern>
        </defs>
        <line x1={ZERO} x2={ZERO} y1={0} y2={H} stroke="var(--border)" strokeWidth="1" />
        {rows.map((r, i) => {
          const y = i * ROW + 4;
          const w = Math.abs(r.v) * k;
          const x = r.v >= 0 ? ZERO : ZERO - w;
          const labelX = r.v >= 0 ? ZERO + w + 4 : ZERO - w - 4;
          return (
            <g key={r.label}>
              <text x={LABEL_W} y={y + 14} textAnchor="end" fontSize="12" fill="var(--foreground)">
                {r.label}
              </text>
              <rect
                x={x}
                y={y + 3}
                width={Math.max(w, 1)}
                height={ROW - 10}
                rx="2"
                fill={r.v >= 0 ? "var(--accent)" : `url(#${hatch})`}
                stroke={r.v >= 0 ? "none" : "var(--neg)"}
                strokeWidth="1"
              />
              <text
                x={labelX}
                y={y + 14}
                textAnchor={r.v >= 0 ? "start" : "end"}
                fontSize="11"
                fill="var(--muted)"
              >
                {fmt(r.v)}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>
          Why {aName} and {bName} are similar, by stat
        </caption>
        <thead>
          <tr>
            <th>Stat</th>
            <th>Effect on similarity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{fmt(r.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
