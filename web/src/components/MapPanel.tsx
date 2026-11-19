"use client";

import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColourSwitch } from "@/components/ColourSwitch";
import { Key, type KeyExtra } from "@/components/Key";
import { SearchBox } from "@/components/SearchBox";
import { TeamSelect } from "@/components/TeamSelect";
import { ZOOM_MAX, ZOOM_MIN, ZoomControl } from "@/components/ZoomControl";
import type { PlayerRow, Region, Team } from "@/lib/data";
import { fitBounds, legendEntries, palette, project, teamIndices, type ColourMode, type Points, type View } from "@/lib/map";
import type { Theme } from "@/lib/theme";

const COLS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const ROWS = [1, 2, 3, 4, 5, 6];

type Props = {
  pts: Points | null;
  players: PlayerRow[] | null;
  byId: Map<string, PlayerRow>;
  teams: Team[];
  regions: Region[];
  mode: ColourMode;
  onMode: (m: ColourMode) => void;
  team: Team | null;
  onTeam: (code: string | null) => void;
  selected: PlayerRow | null;
  comparing: PlayerRow | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  theme: Theme;
  loadFailed: boolean;
};

type Colours = { ink: string; red: string; alpha: number; dim: number };

function readColours(): Colours {
  const css = getComputedStyle(document.documentElement);
  const v = (k: string) => css.getPropertyValue(k).trim();
  return { ink: v("--ink") || "#111", red: v("--red") || "#d71921", alpha: Number(v("--dot-alpha")) || 0.55, dim: Number(v("--dot-dim")) || 0.3 };
}

/** Indices grouped by colour, per mode, so each colour is one fillStyle change per frame. */
function buckets(pts: Points, mode: ColourMode): number[][] {
  const key = mode === "decade" ? pts.decade : mode === "position" ? pts.position : pts.region;
  const out: number[][] = [];
  for (let i = 0; i < pts.n; i++) (out[key[i]] ??= []).push(i);
  return out;
}

export function MapPanel(props: Props) {
  const { pts, byId, team, selected, comparing, mode, theme } = props;
  const reduce = useReducedMotion();
  const plotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const viewRef = useRef<View | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; i: number } | null>(null);
  const [zoomTarget, setZoomTarget] = useState(1);

  // Animated scalars for the canvas, kept in refs and drawn on the next frame.
  const anim = useRef({ appear: 0, modeT: 1, prevMode: mode as ColourMode, dimT: 0, teamT: 0 });
  const colours = useRef<Colours | null>(null);
  const frame = useRef(0);
  const dur = (s: number) => (reduce ? 0 : s);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useMemo(() => (pts && size.w > 0 ? fitBounds(pts, size.w, size.h) : null), [pts, size]);

  // Start (and reset) the view at the fitted centre.
  useEffect(() => {
    if (!fit) return;
    const v = viewRef.current ? { ...viewRef.current } : { cx: fit.cx, cy: fit.cy, zoom: 1 };
    if (v.zoom === 1) {
      v.cx = fit.cx;
      v.cy = fit.cy;
    }
    viewRef.current = v;
    setView(v);
  }, [fit]);

  const allBuckets = useMemo(
    () => (pts ? { decade: buckets(pts, "decade"), position: buckets(pts, "position"), region: buckets(pts, "region") } : null),
    [pts],
  );
  const teamIdx = useMemo(() => (pts && team ? teamIndices(pts, team.code) : []), [pts, team]);
  const lastTeamIdx = useRef<number[]>([]);
  if (teamIdx.length) lastTeamIdx.current = teamIdx;

  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    const v = viewRef.current;
    if (!canvas || !pts || !fit || !v || !allBuckets || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = (colours.current ??= readColours());
    const a = anim.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const s = fit.scale * v.zoom;
    const ox = size.w / 2 - v.cx * s;
    const oy = size.h / 2 + v.cy * s;
    const d = 2.3 * Math.min(Math.sqrt(v.zoom), 1.8);
    const base = (c.alpha + (c.dim - c.alpha) * a.dimT) * a.appear;

    const pass = (m: ColourMode, alpha: number) => {
      if (alpha <= 0.002) return;
      const cols = palette(m);
      ctx.globalAlpha = alpha;
      allBuckets[m].forEach((idx, k) => {
        if (!idx) return;
        ctx.fillStyle = cols[k % cols.length];
        for (const i of idx) ctx.fillRect(ox + pts.x[i] * s - d / 2, oy - pts.y[i] * s - d / 2, d, d);
      });
    };
    if (a.modeT < 1) pass(a.prevMode, base * (1 - a.modeT));
    pass(mode, base * a.modeT);

    if (a.teamT > 0.002) {
      ctx.globalAlpha = a.teamT * a.appear;
      ctx.fillStyle = c.ink;
      const r = 1.9 * Math.min(Math.sqrt(v.zoom), 1.6);
      ctx.beginPath();
      for (const i of lastTeamIdx.current) {
        const px = ox + pts.x[i] * s;
        const py = oy - pts.y[i] * s;
        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [pts, fit, size, allBuckets, mode]);

  const requestDraw = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    requestDraw();
  }, [requestDraw, view]);

  const tween = useCallback(
    (key: "appear" | "modeT" | "dimT" | "teamT", to: number, seconds: number) =>
      animate(anim.current[key], to, {
        duration: dur(seconds),
        ease: "easeOut",
        onUpdate: (val) => {
          anim.current[key] = val;
          requestDraw();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestDraw, reduce],
  );

  // Map dots fade in once the data arrives.
  useEffect(() => {
    if (!pts) return;
    const c = tween("appear", 1, 0.6);
    return () => c.stop();
  }, [pts, tween]);

  // Colour switch: the old colours fade out while the new ones fade in (300 ms).
  const shownMode = useRef(mode);
  useEffect(() => {
    if (shownMode.current === mode) return;
    anim.current.prevMode = shownMode.current;
    anim.current.modeT = 0;
    shownMode.current = mode;
    const c = tween("modeT", 1, 0.3);
    return () => c.stop();
  }, [mode, tween]);

  // A team or a player selected: the rest dim; the team's seasons brighten.
  const dimmed = Boolean(team || selected);
  useEffect(() => {
    const c = tween("dimT", dimmed ? 1 : 0, 0.35);
    return () => c.stop();
  }, [dimmed, tween]);
  useEffect(() => {
    anim.current.teamT = 0;
    const c = tween("teamT", team ? 1 : 0, 0.45);
    return () => c.stop();
  }, [team, tween]);

  // Theme: re-read the colours and fade the canvas back in.
  useEffect(() => {
    colours.current = null;
    requestDraw();
    const el = canvasRef.current;
    if (!el || reduce) return;
    const c = animate(el, { opacity: [0.35, 1] }, { duration: 0.25 });
    return () => c.stop();
  }, [theme, requestDraw, reduce]);

  // Zoom: ease the canvas to the new scale (300 ms). Zooming in centres on the selected player if there is one.
  const zoomTo = useCallback(
    (z: number) => {
      const v0 = viewRef.current;
      if (!v0 || !fit || !pts) return;
      let tx = v0.cx;
      let ty = v0.cy;
      if (z === 1) {
        tx = fit.cx;
        ty = fit.cy;
      } else if (selected && pts.start.has(selected.id) && v0.zoom === 1) {
        const [a, b] = pts.start.get(selected.id)!;
        tx = 0;
        ty = 0;
        for (let i = a; i < b; i++) {
          tx += pts.x[i] / (b - a);
          ty += pts.y[i] / (b - a);
        }
      }
      const from = { ...v0 };
      setZoomTarget(z);
      animate(0, 1, {
        duration: dur(0.3),
        ease: "easeOut",
        onUpdate: (t) => {
          const v = { cx: from.cx + (tx - from.cx) * t, cy: from.cy + (ty - from.cy) * t, zoom: from.zoom + (z - from.zoom) * t };
          viewRef.current = v;
          setView(v);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fit, pts, selected, reduce],
  );

  // Pointer: hover shows the season under the cursor; click selects that player; drag pans when zoomed in.
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const nearest = (mx: number, my: number): number => {
    const v = viewRef.current;
    if (!pts || !fit || !v) return -1;
    let best = -1;
    let bestD = 64;
    for (let i = 0; i < pts.n; i++) {
      const [px, py] = project(pts.x[i], pts.y[i], fit, v, size.w, size.h);
      const dd = (px - mx) ** 2 + (py - my) ** 2;
      if (dd < bestD) {
        bestD = dd;
        best = i;
      }
    }
    return best;
  };
  const local = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const v = viewRef.current;
    if (!v) return;
    const [x, y] = local(e);
    drag.current = { x, y, cx: v.cx, cy: v.cy, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const [x, y] = local(e);
    const g = drag.current;
    if (g && fit && viewRef.current) {
      const dx = x - g.x;
      const dy = y - g.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) g.moved = true;
      if (g.moved && viewRef.current.zoom > 1) {
        const s = fit.scale * viewRef.current.zoom;
        const v = { ...viewRef.current, cx: g.cx - dx / s, cy: g.cy + dy / s };
        viewRef.current = v;
        setView(v);
        setHover(null);
        return;
      }
    }
    const i = nearest(x, y);
    setHover(i < 0 ? null : { x, y, i });
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const g = drag.current;
    drag.current = null;
    if (g && !g.moved && pts) {
      const [x, y] = local(e);
      const i = nearest(x, y);
      if (i >= 0) props.onSelect(pts.player[i]);
    }
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const v = viewRef.current;
    if (!v || !fit) return;
    const step = 40 / (fit.scale * v.zoom);
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key] && v.zoom > 1) {
      e.preventDefault();
      const nv = { ...v, cx: v.cx + moves[e.key][0], cy: v.cy + moves[e.key][1] };
      viewRef.current = nv;
      setView(nv);
    } else if (e.key === "+" || e.key === "=") {
      zoomTo(Math.min(ZOOM_MAX, v.zoom + 0.5));
    } else if (e.key === "-") {
      zoomTo(Math.max(ZOOM_MIN, v.zoom - 0.5));
    }
  }

  // SVG layer: the selected player's seasons (red) and the comparing player's (grey). At most ~40 nodes.
  const seasonsOf = (p: PlayerRow | null) => {
    if (!p || !pts || !fit || !view || !pts.start.has(p.id)) return [];
    const [a, b] = pts.start.get(p.id)!;
    const out: { season: number; px: number; py: number }[] = [];
    for (let i = a; i < b; i++) {
      const [px, py] = project(pts.x[i], pts.y[i], fit, view, size.w, size.h);
      out.push({ season: pts.season[i], px, py });
    }
    return out.sort((m, n) => m.season - n.season);
  };
  const own = seasonsOf(selected);
  const comp = comparing && comparing.id !== selected?.id ? seasonsOf(comparing) : [];
  const anchor = own.length ? own.reduce((m, p) => (p.py < m.py ? p : m)) : null;
  const tagW = selected ? selected.name.length * 7.2 + 22 : 0;
  const tagLeft = anchor ? (anchor.px + 64 + tagW > size.w ? anchor.px - 64 - tagW : anchor.px + 64) : 0;
  const tagTop = anchor ? Math.max(anchor.py - 46, 4) : 0;

  // Team code in A1 types in letter by letter.
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    setTyped(reduce ? 3 : 0);
    if (!team || reduce) return;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= team.code.length) clearInterval(t);
    }, 90);
    return () => clearInterval(t);
  }, [team, reduce]);

  const extras: KeyExtra[] = [];
  if (team) extras.push({ label: `${team.short} season`, colour: "var(--ink)" });
  if (selected) extras.push({ label: "Selected", colour: "var(--red)" });
  if (selected && comparing && comparing.id !== selected.id) extras.push({ label: "Comparing", colour: "var(--comparing)" });

  const hoverPlayer = hover && pts ? byId.get(pts.player[hover.i]) : null;
  const cellW = size.w / 8;
  const cellH = size.h / 6;

  return (
    <section className="card relative flex h-full min-h-0 flex-col p-5" aria-label="Map of every NBA season since 1980">
      <div className="grid grid-cols-1 gap-x-7 gap-y-3 md:grid-cols-[minmax(0,358px)_minmax(0,170px)_1fr]">
        <div>
          <label htmlFor="player-search" className="label block" onClick={() => props.searchRef.current?.focus()}>
            <span className="step">01</span>Your player
          </label>
          <div className="mt-2">
            <SearchBox inputId="player-search" players={props.players} selectedName={selected?.name ?? null} onSelect={(p) => props.onSelect(p.id)} onClear={props.onClear} inputRef={props.searchRef} />
          </div>
        </div>
        <div>
          <label htmlFor="team-select" className="label block">
            Your team
          </label>
          <div className="mt-2">
            <TeamSelect id="team-select" teams={props.teams} value={team?.code ?? null} onChange={props.onTeam} />
          </div>
        </div>
        <div className="md:justify-self-end">
          <p className="label md:text-right" id="colour-label">
            Colour dots by
          </p>
          <div className="mt-2 flex md:justify-end">
            <ColourSwitch mode={mode} onChange={props.onMode} />
          </div>
        </div>
      </div>

      <div className="relative mx-[1px] mt-11 mb-5 min-h-[260px] flex-1 pl-5 md:mr-[19px] md:ml-[1px]">
        {/* Column letters and row numbers sit outside the plot. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 left-5">
          {COLS.map((c, i) => (
            <span key={c} className="absolute -top-[17px] -translate-x-1/2 text-[10px] text-axis" style={{ left: `${(i + 0.5) * 12.5}%` }}>
              {c}
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-5">
          {ROWS.map((r, i) => (
            <span key={r} className="absolute left-0 -translate-y-1/2 text-[10px] text-axis" style={{ top: `${((i + 0.5) / 6) * 100}%` }}>
              {r}
            </span>
          ))}
        </div>

        <div
          ref={plotRef}
          tabIndex={0}
          role="application"
          aria-roledescription="map"
          aria-label="Every NBA season since 1980 as a dot. Click a dot to select that player. Plus and minus zoom; arrow keys pan when zoomed in."
          className={`absolute inset-y-0 right-0 left-5 overflow-hidden outline-offset-4 ${view && view.zoom > 1 ? "cursor-grab active:cursor-grabbing" : hover ? "cursor-pointer" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKeyDown}
        >
          <svg aria-hidden="true" className="absolute inset-0 size-full" preserveAspectRatio="none">
            {COLS.map((_, i) => (
              <line key={`v${i}`} x1={i * cellW + 0.5} x2={i * cellW + 0.5} y1={0} y2={size.h} stroke="var(--grid)" />
            ))}
            <line x1={size.w - 0.5} x2={size.w - 0.5} y1={0} y2={size.h} stroke="var(--grid)" />
            {ROWS.map((_, i) => (
              <line key={`h${i}`} y1={i * cellH + 0.5} y2={i * cellH + 0.5} x1={0} x2={size.w} stroke="var(--grid)" />
            ))}
            <line y1={size.h - 0.5} y2={size.h - 0.5} x1={0} x2={size.w} stroke="var(--grid)" />
          </svg>

          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block size-full" />

          {/* Team code centred on its glyphs in cell A1. Letters only, never a logo. */}
          <div aria-hidden="true" className="pointer-events-none absolute top-0 left-0 flex items-center justify-center" style={{ width: cellW, height: cellH }}>
            <AnimatePresence>
              {team && (
                <motion.span
                  key={team.code}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="dot-heading block text-[32px] leading-none text-ink"
                  style={{ textBoxTrim: "trim-both", textBoxEdge: "cap alphabetic" } as React.CSSProperties}
                >
                  {team.code.slice(0, typed)}
                  <span className="invisible">{team.code.slice(typed)}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <AnimatePresence>
              {comp.map((p) => (
                <motion.circle
                  key={`c-${comparing!.id}-${p.season}`}
                  cx={p.px}
                  cy={p.py}
                  r={3.5}
                  fill="var(--comparing)"
                  stroke="var(--surface)"
                  strokeWidth={1}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </AnimatePresence>
            {anchor && (
              <motion.line
                key={`lead-${selected!.id}`}
                x1={anchor.px}
                y1={anchor.py}
                x2={tagLeft > anchor.px ? tagLeft : tagLeft + tagW}
                y2={tagTop + 22}
                stroke="var(--ink)"
                strokeWidth={1}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              />
            )}
            <AnimatePresence>
              {own.map((p, i) => (
                <motion.circle
                  key={`s-${selected!.id}-${p.season}`}
                  cx={p.px}
                  cy={p.py}
                  r={4.5}
                  fill="var(--red)"
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ type: "spring", stiffness: 520, damping: 22, delay: i * 0.035 }}
                />
              ))}
            </AnimatePresence>
          </svg>

          <AnimatePresence>
            {anchor && selected && (
              <motion.div
                key={`tag-${selected.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.25, ease: "easeOut" }}
                className="pointer-events-none absolute rounded-full bg-ink px-[10px] text-[11px] leading-[22px] font-semibold tracking-[0.04em] whitespace-nowrap text-ink-inv uppercase"
                style={{ left: tagLeft, top: tagTop }}
              >
                {selected.name}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hover && hoverPlayer && !drag.current?.moved && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="pointer-events-none absolute z-10 rounded-full border border-border bg-surface px-2.5 text-[11px] leading-[22px] whitespace-nowrap"
                style={{ left: Math.min(hover.x + 12, size.w - 190), top: Math.max(hover.y - 30, 2) }}
              >
                {hoverPlayer.name} · {pts!.season[hover.i]}
              </motion.div>
            )}
          </AnimatePresence>

          {!pts && (
            <p className="absolute inset-0 flex items-center justify-center text-muted">{props.loadFailed ? "The map could not be loaded." : "Loading the map..."}</p>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <Key entries={legendEntries(mode, props.regions)} extras={extras} />
        <ZoomControl zoom={zoomTarget} onZoom={zoomTo} />
      </div>
    </section>
  );
}
