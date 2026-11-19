"use client";

import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { badge, badgeText, statLabel, stepState, type Badge } from "@/lib/playback";

const STATS = [
  { name: "PTS", col: 1 },
  { name: "REB", col: 2 },
  { name: "AST", col: 3 },
] as const;

/** The value counts from last season's value to the new one (450 ms); under reduced motion it just changes. */
function CountingValue({ value, b, i }: { value: number; b: Badge; i: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      from.current = value;
      return;
    }
    const c = animate(from.current, value, {
      duration: 0.45,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => c.stop();
  }, [value, reduce]);
  // The value flashes the badge colour for 700 ms, then settles (CSS keyframes, off under reduced motion).
  const flash = b && b.kind !== "same" ? (b.kind === "up" ? "flash-up" : "flash-down") : "";
  return (
    <span key={`${i}-${flash}`} className={`dot-heading inline-block min-w-[3.2ch] text-right text-[18px] leading-none tabular-nums ${flash}`}>
      {(reduce ? value : shown).toFixed(1)}
    </span>
  );
}

type Props = {
  name: string;
  /** [season, pts, reb, ast] for every season of his career, in order. */
  seasons: [number, number, number, number][];
  i: number;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * One slim line centred at the top of the map: ‹ NAME YEAR 07/14 │ PTS 30.1 ▼ 1.4  REB …  AST … ›.
 * Year and values in Doto, the rest Geist Mono. It never wraps; on a phone it scrolls sideways inside itself.
 */
export function PlaybackBar({ name, seasons, i, onPrev, onNext }: Props) {
  const cur = seasons[i];
  const prev = i > 0 ? seasons[i - 1] : undefined;
  const { prevDisabled, nextDisabled } = stepState(i, seasons.length);
  const count = `${String(i + 1).padStart(2, "0")}/${String(seasons.length).padStart(2, "0")}`;
  const step =
    "flex size-[26px] shrink-0 items-center justify-center rounded-full border border-border text-[15px] leading-none transition-colors duration-[120ms] hover:bg-tint disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <motion.div
      data-box="playback"
      role="group"
      aria-label={`Career playback: ${name}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="scroll-thin absolute top-2.5 left-1/2 z-20 flex max-w-[calc(100%-16px)] -translate-x-1/2 items-center gap-3 overflow-x-auto rounded-full border border-border bg-surface py-1.5 pr-2 pl-2.5 whitespace-nowrap"
    >
      <button type="button" className={step} aria-label="Previous season" disabled={prevDisabled} onClick={onPrev}>
        ‹
      </button>
      <span className="label max-w-[26ch] truncate" title={name}>
        {name}
      </span>
      <span className="dot-heading text-[22px] leading-none tabular-nums">{cur[0]}</span>
      <span className="text-[10.5px] text-muted tabular-nums">{count}</span>
      <span className="sr-only" aria-live="polite">{`${cur[0]}, season ${i + 1} of ${seasons.length}`}</span>
      <span aria-hidden="true" className="h-[18px] w-px shrink-0 bg-border" />
      {STATS.map(({ name: stat, col }) => {
        const v = cur[col];
        const b = badge(prev?.[col], v);
        return (
          <span key={stat} className="inline-flex items-baseline gap-1.5" data-stat={stat}>
            <span className="sr-only">{statLabel(stat, v, b)}</span>
            <span className="label" aria-hidden="true">
              {stat}
            </span>
            <span aria-hidden="true">
              <CountingValue value={v} b={b} i={i} />
            </span>
            <span aria-hidden="true" className="inline-block min-w-[5ch] text-[10.5px] font-semibold tabular-nums">
              <AnimatePresence mode="popLayout" initial={false}>
                {b && (
                  <motion.span
                    key={i}
                    data-badge={b.kind}
                    className="inline-block"
                    style={{ color: b.kind === "up" ? "var(--up)" : b.kind === "down" ? "var(--down)" : "var(--same)" }}
                    initial={{ opacity: 0, y: 6, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={{ type: "spring", stiffness: 520, damping: 16 }}
                  >
                    {badgeText(b)}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </span>
        );
      })}
      <button type="button" className={step} aria-label="Next season" disabled={nextDisabled} onClick={onNext}>
        ›
      </button>
    </motion.div>
  );
}
