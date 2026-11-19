"use client";

import { animate, AnimatePresence, motion, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColourSwitch } from "@/components/ColourSwitch";
import { Key, type KeyExtra } from "@/components/Key";
import { SearchBox } from "@/components/SearchBox";
import { TeamSelect } from "@/components/TeamSelect";
import { ZoomControl } from "@/components/ZoomControl";
import type { PlayerRow, Region, Team } from "@/lib/data";
import {
  applyT,
  clampT,
  fitInFrame,
  IDENTITY,
  K_MAX,
  K_MIN,
  legendEntries,
  palette,
  teamIndices,
  zoomAround,
  type ColourMode,
  type Points,
  type Transform,
} from "@/lib/map";
import { computeGrid, gridFrame, layoutLabels } from "@/lib/grid";
import { fitTransform } from "@/lib/playback";
import type { Theme } from "@/lib/theme";

const DRAG_THRESHOLD = 4;
const BUTTON_STEP = 2;

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
  /** Career playback: seasons up to index i of the selected player are shown, the newest pulsing. */
  play: { i: number } | null;
  /** Each new n runs the command once: fit the selected player's career, or reset to 1x. */
  viewCmd: { kind: "fit" | "reset"; n: number } | null;
  /** The playback bar, centred at the top of the map. */
  overlay?: React.ReactNode;
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

const clampK = (k: number) => Math.min(K_MAX, Math.max(K_MIN, k));

/** The team code types in letter by letter (Doto); untyped letters keep their space so the code stays centred. */
function TypedCode({ code, instant }: { code: string; instant: boolean }) {
  const [typed, setTyped] = useState(instant ? code.length : 0);
  useEffect(() => {
    if (instant) return;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= code.length) clearInterval(t);
    }, 90);
    return () => clearInterval(t);
  }, [code, instant]);
  const shown = instant ? code.length : typed;
  return (
    <>
      {code.slice(0, shown)}
      <span className="invisible">{code.slice(shown)}</span>
    </>
  );
}

export function MapPanel(props: Props) {
  const { pts, byId, team, selected, comparing, mode, theme, play, viewCmd } = props;
  const reduce = useReducedMotion();
  const plotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Pan and zoom. The live value is in a ref (read by the canvas each frame); React state follows once per frame
  // so the grid, labels, team code and SVG overlays move with the dots.
  const tRef = useRef<Transform>(IDENTITY);
  const [t, setT] = useState<Transform>(IDENTITY);
  const stateFrame = useRef(0);
  const zoomAnim = useRef<AnimationPlaybackControls | null>(null);

  // Animated scalars for the canvas, kept in refs and drawn on the next frame.
  const anim = useRef({ appear: 0, modeT: 1, prevMode: mode as ColourMode, dimT: 0, teamT: 0, playT: 0 });
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

  // The grid's 0 to 100 frame is the whole map area at 1x; the dots are fitted inside it at their real
  // proportions (one scale for x and y), 8 px in, centred.
  const gridBox = useMemo(() => (size.w > 0 ? gridFrame(size.w, size.h) : null), [size]);
  const base = useMemo(() => (pts && gridBox ? fitInFrame(pts, gridBox, 8) : null), [pts, gridBox]);

  const allBuckets = useMemo(
    () => (pts ? { decade: buckets(pts, "decade"), position: buckets(pts, "position"), region: buckets(pts, "region") } : null),
    [pts],
  );
  const teamIdx = useMemo(() => (pts && team ? teamIndices(pts, team.code) : []), [pts, team]);
  // The last team stays drawn while its dots fade out after the team is cleared.
  const lastTeamIdx = useRef<number[]>([]);
  useEffect(() => {
    if (teamIdx.length) lastTeamIdx.current = teamIdx;
  }, [teamIdx]);

  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    if (!canvas || !base || !allBuckets || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = (colours.current ??= readColours());
    const a = anim.current;
    const { k, x: tx, y: ty } = tRef.current;
    const { bx, by } = base;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const d = 2.3 * Math.min(Math.sqrt(k), 2.2);
    const half = d / 2;
    const settled = (c.alpha + (c.dim - c.alpha) * a.dimT) * a.appear;
    // During career playback the rest of the map dims further (to 0.18, as in the lab).
    const alpha = settled + (0.18 * a.appear - settled) * a.playT;

    const pass = (m: ColourMode, al: number) => {
      if (al <= 0.002) return;
      const cols = palette(m);
      ctx.globalAlpha = al;
      allBuckets[m].forEach((idx, j) => {
        if (!idx) return;
        ctx.fillStyle = cols[j % cols.length];
        if (k >= 3) {
          // Zoomed in, the dots are drawn round.
          ctx.beginPath();
          for (const i of idx) {
            const px = bx[i] * k + tx;
            const py = by[i] * k + ty;
            ctx.moveTo(px + half, py);
            ctx.arc(px, py, half, 0, Math.PI * 2);
          }
          ctx.fill();
        } else for (const i of idx) ctx.fillRect(bx[i] * k + tx - half, by[i] * k + ty - half, d, d);
      });
    };
    if (a.modeT < 1) pass(a.prevMode, alpha * (1 - a.modeT));
    pass(mode, alpha * a.modeT);

    if (a.teamT > 0.002) {
      ctx.globalAlpha = a.teamT * a.appear;
      ctx.fillStyle = c.ink;
      const r = 1.9 * Math.min(Math.sqrt(k), 2);
      ctx.beginPath();
      for (const i of lastTeamIdx.current) {
        const px = bx[i] * k + tx;
        const py = by[i] * k + ty;
        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [base, size, allBuckets, mode]);

  const requestDraw = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    requestDraw();
  }, [requestDraw]);

  /**
   * Set the transform, clamped so the 1x frame always covers the plot (at 1x the map cannot move). Every drag,
   * wheel, pinch, button zoom and resize goes through here. The canvas redraws on the next frame; React state
   * follows once per frame.
   */
  const commit = useCallback(
    (next: Transform) => {
      if (!base) return;
      tRef.current = clampT(next, size.w, size.h, gridBox ?? undefined);
      requestDraw();
      if (!stateFrame.current)
        stateFrame.current = requestAnimationFrame(() => {
          stateFrame.current = 0;
          setT(tRef.current);
        });
    },
    [base, size, gridBox, requestDraw],
  );

  // A resize (or new data) keeps the current zoom, re-clamped to the new plot size.
  useEffect(() => {
    commit(tRef.current);
  }, [commit]);

  /** Eased zoom (buttons, double-click, reset). With an anchor the point under it stays put; jumps under reduced motion. */
  const animateTo = useCallback(
    (target: Transform, anchor?: [number, number], seconds = 0.32) => {
      zoomAnim.current?.stop();
      if (reduce) {
        commit(target);
        return;
      }
      const from = tRef.current;
      zoomAnim.current = animate(0, 1, {
        duration: seconds,
        ease: [0.2, 0.7, 0.2, 1],
        onUpdate: (s) => {
          const k = from.k * Math.pow(target.k / from.k, s);
          if (anchor) commit(zoomAround(from, k, anchor[0], anchor[1]));
          else commit({ k, x: from.x + (target.x - from.x) * s, y: from.y + (target.y - from.y) * s });
        },
      });
    },
    [commit, reduce],
  );

  const zoomBy = useCallback(
    (f: number, at?: [number, number]) => {
      if (!base) return;
      const p: [number, number] = at ?? [size.w / 2, size.h / 2];
      const k2 = clampK(tRef.current.k * f);
      animateTo(clampT(zoomAround(tRef.current, k2, p[0], p[1]), size.w, size.h, gridBox ?? undefined), p);
    },
    [animateTo, base, size, gridBox],
  );
  const reset = useCallback(() => animateTo(IDENTITY), [animateTo]);

  // Playback view commands: fit the selected player's seasons (600 ms, at most 4x), or reset to 1x.
  const lastCmd = useRef(0);
  useEffect(() => {
    if (!viewCmd || viewCmd.n === lastCmd.current || !base || !pts) return;
    if (viewCmd.kind === "reset") {
      lastCmd.current = viewCmd.n;
      animateTo(IDENTITY, undefined, 0.6);
      return;
    }
    if (!selected || !pts.start.has(selected.id)) return;
    lastCmd.current = viewCmd.n;
    const [a, b] = pts.start.get(selected.id)!;
    const xs = Array.from(base.bx.subarray(a, b));
    const ys = Array.from(base.by.subarray(a, b));
    animateTo(fitTransform(xs, ys, size.w, size.h, gridBox ?? undefined), undefined, 0.6);
  }, [viewCmd, base, pts, selected, size, gridBox, animateTo]);

  // Wheel and trackpad pinch (ctrlKey wheel on macOS) zoom around the pointer and never scroll the page.
  // Safari's trackpad pinch arrives as gesture events instead.
  useEffect(() => {
    const el = plotRef.current;
    if (!el || !base) return;
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAnim.current?.stop();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * size.h : e.deltaY;
      const f = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018));
      const [px, py] = local(e);
      commit(zoomAround(tRef.current, clampK(tRef.current.k * f), px, py));
    };
    let gestureStart: Transform | null = null;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureStart = tRef.current;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Event & { scale: number; clientX: number; clientY: number };
      if (!gestureStart) return;
      const [px, py] = local(g);
      commit(zoomAround(gestureStart, clampK(gestureStart.k * g.scale), px, py));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, [base, size, commit]);

  const tween = useCallback(
    (key: "appear" | "modeT" | "dimT" | "teamT" | "playT", to: number, seconds: number) =>
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
  const playing = play !== null;
  useEffect(() => {
    const c = tween("playT", playing ? 1 : 0, 0.35);
    return () => c.stop();
  }, [playing, tween]);

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

  // Pointers: one pointer drags (after 4 px), two pointers pinch. A press that never moves 4 px is a click and
  // selects the season under it.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; moved: boolean; pinch: { d: number; mx: number; my: number; t: Transform } | null } | null>(null);

  const nearest = (mx: number, my: number): number => {
    if (!base) return -1;
    const { k, x: tx, y: ty } = tRef.current;
    let best = -1;
    let bestD = 64;
    for (let i = 0; i < base.bx.length; i++) {
      const dd = (base.bx[i] * k + tx - mx) ** 2 + (base.by[i] * k + ty - my) ** 2;
      if (dd < bestD) {
        bestD = dd;
        best = i;
      }
    }
    return best;
  };
  const local = (e: React.PointerEvent | React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const pinchOf = () => {
    const [a, b] = [...pointers.current.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, t: tRef.current };
  };

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const [x, y] = local(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    zoomAnim.current?.stop();
    pointers.current.set(e.pointerId, { x, y });
    if (pointers.current.size === 1) gesture.current = { x, y, moved: false, pinch: null };
    else if (pointers.current.size === 2 && gesture.current) {
      gesture.current.moved = true;
      gesture.current.pinch = pinchOf();
    }
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const [x, y] = local(e);
    const g = gesture.current;
    const prev = pointers.current.get(e.pointerId);
    if (!g || !prev) {
      if (e.pointerType === "mouse") {
        const i = nearest(x, y);
        setHover(i < 0 ? null : i);
      }
      return;
    }
    pointers.current.set(e.pointerId, { x, y });
    if (g.pinch && pointers.current.size >= 2) {
      const now = pinchOf();
      const k2 = clampK(g.pinch.t.k * (now.d / g.pinch.d));
      const z = zoomAround(g.pinch.t, k2, g.pinch.mx, g.pinch.my);
      commit({ k: z.k, x: z.x + now.mx - g.pinch.mx, y: z.y + now.my - g.pinch.my });
      return;
    }
    if (!g.moved && Math.hypot(x - g.x, y - g.y) >= DRAG_THRESHOLD) {
      g.moved = true;
      setDragging(true);
      setHover(null);
    }
    if (g.moved) commit({ ...tRef.current, x: tRef.current.x + x - prev.x, y: tRef.current.y + y - prev.y });
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1 && g) {
      // A pinch ended with one finger still down: carry on as a drag from where that finger is.
      const [rest] = [...pointers.current.values()];
      gesture.current = { x: rest.x, y: rest.y, moved: true, pinch: null };
      return;
    }
    if (pointers.current.size > 0) return;
    gesture.current = null;
    setDragging(false);
    if (g && !g.moved && pts && e.type === "pointerup") {
      const [x, y] = local(e);
      const i = nearest(x, y);
      if (i >= 0) props.onSelect(pts.player[i]);
    }
  }
  function onDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    const [x, y] = local(e);
    zoomBy(BUTTON_STEP, [x, y]);
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };
    if (moves[e.key]) {
      e.preventDefault();
      commit({ ...tRef.current, x: tRef.current.x + moves[e.key][0], y: tRef.current.y + moves[e.key][1] });
    } else if (e.key === "+" || e.key === "=") zoomBy(BUTTON_STEP);
    else if (e.key === "-" || e.key === "_") zoomBy(1 / BUTTON_STEP);
    else if (e.key === "0") reset();
  }

  // Screen positions through the current transform.
  const at = (i: number): [number, number] => (base ? applyT(t, base.bx[i], base.by[i]) : [0, 0]);
  const seasonsOf = (p: PlayerRow | null) => {
    if (!p || !pts || !base || !pts.start.has(p.id)) return [];
    const [a, b] = pts.start.get(p.id)!;
    const out: { season: number; px: number; py: number }[] = [];
    for (let i = a; i < b; i++) {
      const [px, py] = at(i);
      out.push({ season: pts.season[i], px, py });
    }
    return out.sort((m, n) => m.season - n.season);
  };
  // During playback only the seasons played so far are shown; no name tag and no comparing dots.
  const allOwn = seasonsOf(selected);
  const own = play ? allOwn.slice(0, play.i + 1) : allOwn;
  const comp = !play && comparing && comparing.id !== selected?.id ? seasonsOf(comparing) : [];
  const anchor = !play && own.length ? own.reduce((m, p) => (p.py < m.py ? p : m)) : null;
  const tagW = selected ? selected.name.length * 7.2 + 22 : 0;
  const tagLeft = anchor ? (anchor.px + 64 + tagW > size.w ? anchor.px - 64 - tagW : anchor.px + 64) : 0;
  const tagTop = anchor ? anchor.py - 46 : 0;

  const extras: KeyExtra[] = [];
  if (team) extras.push({ label: `${team.short} season`, colour: "var(--ink)" });
  if (selected) extras.push({ label: "Selected", colour: "var(--red)" });
  if (!play && selected && comparing && comparing.id !== selected.id) extras.push({ label: "Comparing", colour: "var(--comparing)" });

  const hoverPlayer = hover !== null && pts ? byId.get(pts.player[hover]) : null;
  const hoverAt = hover !== null ? at(hover) : null;

  // The grid: 0 to 100 across the dots' bounding box, origin top-left, adaptive major and minor lines. Lines and
  // labels come from the same transform, so they move and scale together with the dots.
  const grid = gridBox ? computeGrid(t, gridBox, size.w, size.h) : null;
  const labels = grid ? layoutLabels(grid, size.w, size.h) : null;
  // The team code's cell: 0 to 10 by 0 to 10 at 1x (base coordinates), scaled with the map.
  const teamCell = gridBox ? { x: gridBox.minX, y: gridBox.minY, w: (gridBox.maxX - gridBox.minX) / 10, h: (gridBox.maxY - gridBox.minY) / 10 } : null;

  return (
    <section className="card relative flex min-h-0 flex-col p-4 md:h-full md:p-5" aria-label="Map of every NBA season since 1980" data-box="map">
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-[minmax(0,358px)_minmax(0,170px)_1fr] xl:gap-x-7">
        <div className="md:col-span-2 xl:col-span-1">
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

      {/* The map area: 16 px from the card's left, right and bottom edges (the card has 20 px padding). The KEY and
          zoom row sits on top of it at the bottom. */}
      <div className="relative -mx-1 mt-4 -mb-1 h-[360px] md:h-auto md:min-h-[300px] md:flex-1" data-box="map-area">
        <div
          ref={plotRef}
          tabIndex={0}
          role="application"
          aria-roledescription="map"
          aria-label="Every NBA season since 1980 as a dot. Click a dot to select that player. Drag to move; scroll, pinch or double-click to zoom. Keyboard: arrow keys move, plus and minus zoom, 0 resets."
          className={`absolute inset-0 touch-none overflow-hidden overscroll-contain outline-offset-4 select-none ${
            dragging ? "cursor-grabbing" : hover !== null ? "cursor-pointer" : "cursor-grab"
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHover(null)}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
          data-zoom={t.k.toFixed(2)}
          data-tx={t.x.toFixed(2)}
          data-ty={t.y.toFixed(2)}
          data-frame={gridBox ? [gridBox.minX, gridBox.minY, gridBox.maxX, gridBox.maxY].map((v) => v.toFixed(2)).join(",") : undefined}
          data-dots={base ? [base.box.minX, base.box.minY, base.box.maxX, base.box.maxY].map((v) => v.toFixed(2)).join(",") : undefined}
        >
          <svg aria-hidden="true" className="absolute inset-0 size-full">
            {grid && (
              <>
                <g opacity={grid.minorAlphaX}>
                  {grid.xs
                    .filter((l) => !l.major)
                    .map((l) => (
                      <line key={`vx${l.v}`} x1={l.px} x2={l.px} y1={grid.span.y0} y2={grid.span.y1} stroke="var(--grid)" shapeRendering="crispEdges" />
                    ))}
                </g>
                <g opacity={grid.minorAlphaY}>
                  {grid.ys
                    .filter((l) => !l.major)
                    .map((l) => (
                      <line key={`hy${l.v}`} y1={l.px} y2={l.px} x1={grid.span.x0} x2={grid.span.x1} stroke="var(--grid)" shapeRendering="crispEdges" />
                    ))}
                </g>
                {grid.xs
                  .filter((l) => l.major)
                  .map((l) => (
                    <line key={`VX${l.v}`} data-gx={l.v} x1={l.px} x2={l.px} y1={grid.span.y0} y2={grid.span.y1} stroke="var(--grid-major)" shapeRendering="crispEdges" />
                  ))}
                {grid.ys
                  .filter((l) => l.major)
                  .map((l) => (
                    <line key={`HY${l.v}`} data-gy={l.v} y1={l.px} y2={l.px} x1={grid.span.x0} x2={grid.span.x1} stroke="var(--grid-major)" shapeRendering="crispEdges" />
                  ))}
              </>
            )}
          </svg>

          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block size-full" />


          {/* Team code centred on its glyphs in the top-left 0 to 10 cell, moving and scaling with the grid.
              Letters only, never a logo. */}
          <div
            aria-hidden="true"
            data-team-cell
            className="pointer-events-none absolute top-0 left-0 flex origin-top-left items-center justify-center"
            style={
              teamCell
                ? { width: teamCell.w, height: teamCell.h, transform: `translate(${teamCell.x * t.k + t.x}px, ${teamCell.y * t.k + t.y}px) scale(${t.k})` }
                : { display: "none" }
            }
          >
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
                  <TypedCode code={team.code} instant={Boolean(reduce)} />
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
            {/* The newest played season pulses once when it arrives (not under reduced motion). */}
            {play && !reduce && own.length > 0 && (
              <motion.circle
                key={`pulse-${selected!.id}-${own[own.length - 1].season}`}
                cx={own[own.length - 1].px}
                cy={own[own.length - 1].py}
                fill="var(--red)"
                initial={{ r: 4, opacity: 0.35 }}
                animate={{ r: 12, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            )}
            <AnimatePresence>
              {own.map((p, i) => (
                <motion.circle
                  key={`s-${selected!.id}-${p.season}`}
                  data-season={p.season}
                  cx={p.px}
                  cy={p.py}
                  r={4.5}
                  fill="var(--red)"
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, opacity: play && i < own.length - 1 ? 0.75 : 1 }}
                  exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ type: "spring", stiffness: 520, damping: 22, delay: play ? 0 : i * 0.035 }}
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
                data-name-tag
              >
                {selected.name}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hoverAt && hoverPlayer && !dragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="pointer-events-none absolute z-10 rounded-full border border-border bg-surface px-2.5 text-[11px] leading-[22px] whitespace-nowrap"
                style={{ left: Math.min(hoverAt[0] + 10, size.w - 190), top: Math.max(hoverAt[1] - 30, 2) }}
              >
                {hoverPlayer.name} · {pts!.season[hover!]}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>{props.overlay}</AnimatePresence>

          {!pts && (
            <p className="absolute inset-0 flex items-center justify-center text-muted">{props.loadFailed ? "The map could not be loaded." : "Loading the map..."}</p>
          )}
        </div>
        {/* Grid numbers, laid out from the same grid and transform as the lines (lib/grid.ts layoutLabels), so they
            can never drift from them. Outside the clipped plot (same origin) so a number on the frame's outer edge
            is not cut off; above the dots so they stay readable; ticks join each number to its line. */}
        {labels && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] size-full overflow-visible" data-grid-labels>
            {labels.across.map((l) => (
              <g key={`ax${l.v}`}>
                <line x1={l.tick[0]} y1={l.tick[1]} x2={l.tick[2]} y2={l.tick[3]} stroke="var(--muted)" shapeRendering="crispEdges" />
                <text data-gx-label={l.v} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="text-after-edge" fontSize={10} fill="var(--muted)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round" className="tabular-nums">
                  {l.text}
                </text>
              </g>
            ))}
            {labels.down.map((l) => (
              <g key={`dy${l.v}`}>
                <line x1={l.tick[0]} y1={l.tick[1]} x2={l.tick[2]} y2={l.tick[3]} stroke="var(--muted)" shapeRendering="crispEdges" />
                <text data-gy-label={l.v} x={l.x} y={l.y} textAnchor="end" dominantBaseline="central" fontSize={10} fill="var(--muted)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round" className="tabular-nums">
                  {l.text}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Bottom row, fixed height: the zoom control is pinned bottom-right; the KEY sits bottom-left, capped 16 px
          short of the zoom control, and wraps onto more lines upward (over the empty bottom of the grid) when
          there are more items than fit, so neither the plot nor the zoom control ever moves. */}
      <div className="pointer-events-none absolute right-5 bottom-5 left-5 z-10 h-[58px] *:pointer-events-auto" data-box="map-bottom">
        <div className="absolute right-[148px] bottom-0 left-0 z-10 flex">
          <Key entries={legendEntries(mode, props.regions)} extras={extras} />
        </div>
        <div className="absolute right-0 bottom-0" data-box="zoom">
          <ZoomControl zoom={t.k} onIn={() => zoomBy(BUTTON_STEP)} onOut={() => zoomBy(1 / BUTTON_STEP)} onReset={reset} />
        </div>
      </div>
    </section>
  );
}
