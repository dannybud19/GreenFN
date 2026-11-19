"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.5;

/** − 1.0× +. The value counts up or down to the new zoom. */
export function ZoomControl({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
  const [shown, setShown] = useState(zoom);
  const from = useRef(zoom);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      from.current = zoom;
      return;
    }
    const c = animate(from.current, zoom, {
      duration: 0.3,
      ease: "easeOut",
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => c.stop();
  }, [zoom, reduce]);

  const btn =
    "flex size-7 items-center justify-center rounded-lg bg-surface-2 text-[15px] text-ink transition-colors duration-[120ms] hover:bg-border disabled:opacity-40";
  return (
    <div className="flex h-10 w-[132px] items-center justify-between rounded-xl border border-border bg-surface px-[6px]" role="group" aria-label="Zoom">
      <motion.button type="button" whileTap={{ scale: 0.97 }} className={btn} aria-label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => onZoom(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}>
        −
      </motion.button>
      <span className="w-[38px] text-center text-[13px] tabular-nums" aria-hidden="true">
        {(reduce ? zoom : shown).toFixed(1)}×
      </span>
      <span className="sr-only" aria-live="polite">{`Zoom ${zoom.toFixed(1)} times`}</span>
      <motion.button type="button" whileTap={{ scale: 0.97 }} className={btn} aria-label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => onZoom(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}>
        +
      </motion.button>
    </div>
  );
}
