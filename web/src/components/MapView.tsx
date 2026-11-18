"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchBox } from "@/components/SearchBox";
import { fetchMap, fetchPlayers, type MapData, type PlayerRow } from "@/lib/data";
import { years } from "@/lib/format";

const DECADES = [1980, 1990, 2000, 2010, 2020];
const DECADE_COLOURS = ["#7b6cf6", "#2fa4e7", "#22c1a4", "#9ad34a", "#f5b942"];
const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const POSITION_COLOURS = ["#e4572e", "#f5b942", "#3fb97a", "#2fa4e7", "#9b6cf6"];

type Mode = "decade" | "position";

type Points = {
  x: Float32Array;
  y: Float32Array;
  player: string[];
  season: Int16Array;
  decadeIdx: Uint8Array;
  posIdx: Uint8Array;
};

function buildPoints(map: MapData, byId: Map<string, PlayerRow>): Points {
  const n = Object.values(map).reduce((a, v) => a + v.length, 0);
  const pts: Points = {
    x: new Float32Array(n),
    y: new Float32Array(n),
    player: new Array<string>(n),
    season: new Int16Array(n),
    decadeIdx: new Uint8Array(n),
    posIdx: new Uint8Array(n),
  };
  let k = 0;
  for (const [pid, seasons] of Object.entries(map)) {
    const pos = Math.max(POSITIONS.indexOf(byId.get(pid)?.pos ?? ""), 0);
    for (const [season, x, y] of seasons) {
      pts.x[k] = x;
      pts.y[k] = y;
      pts.player[k] = pid;
      pts.season[k] = season;
      pts.decadeIdx[k] = Math.min(Math.floor((season - 1980) / 10), 4);
      pts.posIdx[k] = pos;
      k++;
    }
  }
  return pts;
}

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

function bounds(xs: number[], ys: number[], pad: number, minSpan: number): Bounds {
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const dx = Math.max(maxX - minX, minSpan);
  const dy = Math.max(maxY - minY, minSpan);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  minX = cx - (dx * (1 + pad)) / 2;
  maxX = cx + (dx * (1 + pad)) / 2;
  minY = cy - (dy * (1 + pad)) / 2;
  maxY = cy + (dy * (1 + pad)) / 2;
  return { minX, maxX, minY, maxY };
}

export function MapView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ pts: Points; byId: Map<string, PlayerRow> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode>("decade");
  const [selId, setSelId] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [theme, setTheme] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMap(), fetchPlayers()])
      .then(([map, players]) => {
        if (cancelled) return;
        const byId = new Map(players.map((p) => [p.id, p]));
        setData({ pts: buildPoints(map, byId), byId });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(280, Math.floor(entry.contentRect.width));
      setSize({ w, h: Math.round(Math.min(Math.max(w * 0.7, 320), 640)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redraw when the light/dark theme flips so the trajectory colours follow.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setTheme((t) => t + 1);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const selected = selId && data ? (data.byId.get(selId) ?? null) : null;

  const view = useMemo<Bounds | null>(() => {
    if (!data) return null;
    const { pts } = data;
    if (selId) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < pts.x.length; i++) {
        if (pts.player[i] !== selId) continue;
        xs.push(pts.x[i]);
        ys.push(pts.y[i]);
      }
      if (xs.length) return bounds(xs, ys, 0.35, 2);
    }
    return bounds(Array.from(pts.x), Array.from(pts.y), 0.04, 1);
  }, [data, selId]);

  const project = useCallback(
    (x: number, y: number) => {
      if (!view) return [0, 0] as const;
      const s = Math.min(size.w / (view.maxX - view.minX), size.h / (view.maxY - view.minY));
      const ox = (size.w - (view.maxX - view.minX) * s) / 2;
      const oy = (size.h - (view.maxY - view.minY) * s) / 2;
      return [ox + (x - view.minX) * s, size.h - (oy + (y - view.minY) * s)] as const;
    },
    [view, size],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !view) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const css = getComputedStyle(document.documentElement);
    const fg = css.getPropertyValue("--foreground").trim() || "#000";
    const card = css.getPropertyValue("--card").trim() || "#fff";
    const { pts } = data;
    const colours = mode === "decade" ? DECADE_COLOURS : POSITION_COLOURS;
    ctx.globalAlpha = selId ? 0.22 : 0.7;
    for (let i = 0; i < pts.x.length; i++) {
      const [px, py] = project(pts.x[i], pts.y[i]);
      ctx.fillStyle = colours[mode === "decade" ? pts.decadeIdx[i] : pts.posIdx[i]];
      ctx.fillRect(px - 1.25, py - 1.25, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
    if (selId) {
      const own: { s: number; px: number; py: number }[] = [];
      for (let i = 0; i < pts.x.length; i++) {
        if (pts.player[i] !== selId) continue;
        const [px, py] = project(pts.x[i], pts.y[i]);
        own.push({ s: pts.season[i], px, py });
      }
      own.sort((a, b) => a.s - b.s);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      own.forEach((p, i) => (i ? ctx.lineTo(p.px, p.py) : ctx.moveTo(p.px, p.py)));
      ctx.stroke();
      for (const p of own) {
        ctx.beginPath();
        ctx.arc(p.px, p.py, 4, 0, Math.PI * 2);
        ctx.fillStyle = colours[mode === "decade" ? Math.min(Math.floor((p.s - 1980) / 10), 4) : Math.max(POSITIONS.indexOf(selected?.pos ?? ""), 0)];
        ctx.fill();
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = card;
      ctx.fillStyle = fg;
      for (const p of [own[0], own[own.length - 1]]) {
        if (!p) continue;
        ctx.strokeText(String(p.s), p.px, p.py - 9);
        ctx.fillText(String(p.s), p.px, p.py - 9);
      }
    }
  }, [data, view, size, mode, selId, selected, project, theme]);

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!data) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { pts } = data;
    let best = -1;
    let bestD = 100; // 10 px
    for (let i = 0; i < pts.x.length; i++) {
      const [px, py] = project(pts.x[i], pts.y[i]);
      const d = (px - mx) ** 2 + (py - my) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHover(best < 0 ? null : { x: mx, y: my, text: `${data.byId.get(pts.player[best])?.name ?? pts.player[best]}, ${pts.season[best]}` });
  }

  function onClick() {
    if (!data || !hover) return;
    const { pts } = data;
    // pick the point under the last hover position
    let best = -1;
    let bestD = 100;
    for (let i = 0; i < pts.x.length; i++) {
      const [px, py] = project(pts.x[i], pts.y[i]);
      const d = (px - hover.x) ** 2 + (py - hover.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) setSelId(pts.player[best]);
  }

  const legend = mode === "decade" ? DECADES.map((d, i) => [`${d}s`, DECADE_COLOURS[i]]) : POSITIONS.map((p, i) => [p, POSITION_COLOURS[i]]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <SearchBox label="Draw a player's career" placeholder="Search a player to draw his trajectory" onSelect={(p) => setSelId(p.id)} />
        <fieldset className="flex items-center gap-3 text-sm">
          <legend className="mb-1 block text-sm font-medium">Colour by</legend>
          {(["decade", "position"] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5">
              <input type="radio" name="colour-mode" checked={mode === m} onChange={() => setMode(m)} />
              {m === "decade" ? "Decade" : "Position"}
            </label>
          ))}
        </fieldset>
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" aria-label="Legend">
        {legend.map(([label, colour]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: colour }} />
            {label}
          </li>
        ))}
        {selected && (
          <li className="ml-auto flex items-center gap-3">
            <span>
              <Link href={`/player/${selected.id}`} className="font-medium underline">
                {selected.name}
              </Link>{" "}
              <span className="text-muted">{years(selected.first, selected.last)}</span>
            </span>
            <button type="button" onClick={() => setSelId(null)} className="rounded border border-border px-2 py-1 text-xs">
              Reset view
            </button>
          </li>
        )}
      </ul>

      <div ref={wrapRef} className="relative mt-3 w-full rounded-lg border border-border bg-card">
        <canvas
          ref={canvasRef}
          style={{ width: size.w, height: size.h, display: "block" }}
          role="img"
          aria-label="Scatter map of every season in the data, coloured by the chosen grouping. Use the search box to draw one player's career."
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onClick={onClick}
        />
        {!data && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            {failed ? "The map could not be loaded." : "Loading map..."}
          </p>
        )}
        {hover && (
          <div
            className="pointer-events-none absolute rounded bg-foreground px-2 py-1 text-xs text-background"
            style={{ left: Math.min(hover.x + 12, size.w - 150), top: Math.max(hover.y - 28, 4) }}
          >
            {hover.text}
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">
        The map is a 2D picture for intuition. Comps are computed in the full 32-dimension model, not from distances on this map.
      </p>
    </div>
  );
}
