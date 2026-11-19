"use client";

import { motion } from "motion/react";
import { K_MAX, K_MIN } from "@/lib/map";

type Props = { zoom: number; onIn: () => void; onOut: () => void; onReset: () => void };

/** − 1.0× +. The value follows the map live; double-clicking it resets to 1x, centred. */
export function ZoomControl({ zoom, onIn, onOut, onReset }: Props) {
  const btn =
    "flex size-7 items-center justify-center rounded-lg bg-surface-2 text-[15px] text-ink transition-colors duration-[120ms] hover:bg-border disabled:opacity-40";
  return (
    <div className="flex h-10 w-[132px] items-center justify-between rounded-xl border border-border bg-surface px-[6px]" role="group" aria-label="Zoom">
      <motion.button type="button" whileTap={{ scale: 0.97 }} className={btn} aria-label="Zoom out" disabled={zoom <= K_MIN + 0.001} onClick={onOut}>
        −
      </motion.button>
      <button
        type="button"
        onDoubleClick={onReset}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onReset();
          }
        }}
        title="Double-click (or press Enter, or 0 on the map) to reset"
        aria-label={`${zoom.toFixed(1)}× zoom. Press Enter to reset`}
        className="w-[44px] cursor-default text-center text-[13px] tabular-nums select-none"
      >
        {zoom.toFixed(1)}×
      </button>
      <motion.button type="button" whileTap={{ scale: 0.97 }} className={btn} aria-label="Zoom in" disabled={zoom >= K_MAX - 0.001} onClick={onIn}>
        +
      </motion.button>
    </div>
  );
}
