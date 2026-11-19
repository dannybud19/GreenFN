"use client";

import { motion } from "motion/react";

/** How many of `total` dots to fill for `value` out of `max` (rounded, clamped). Exported for tests. */
export function filledDots(value: number, max: number, total: number): number {
  if (!(max > 0) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(total, Math.round((Math.abs(value) / max) * total)));
}

type Tone = "ink" | "grey" | "red";

const FILL: Record<Tone, string> = { ink: "var(--ink)", grey: "var(--comparing)", red: "var(--red)" };

type MeterProps = {
  /** Filled dots = round(|value| / max x total). */
  value: number;
  max: number;
  total?: number;
  size?: number;
  gap?: number;
  tone?: Tone;
  /** Read by screen readers instead of the dots, e.g. "12 seasons". */
  label: string;
  /** Delay before the left-to-right fill starts, in seconds. */
  delay?: number;
  stagger?: number;
  className?: string;
};

/** The Nothing dot graphic: a row of circles, filled = amount, empty = the rest. Fills left to right. */
export function DotMeter({
  value,
  max,
  total = 12,
  size = 6,
  gap = 3,
  tone = "ink",
  label,
  delay = 0,
  stagger = 0.02,
  className = "",
}: MeterProps) {
  const filled = filledDots(value, max, total);
  return (
    <span role="img" aria-label={label} className={`inline-flex shrink-0 items-center ${className}`} style={{ gap }}>
      {Array.from({ length: total }, (_, i) => {
        const on = i < filled;
        return (
          <motion.span
            key={i}
            data-filled={on}
            aria-hidden="true"
            className="block rounded-full"
            style={{ width: size, height: size, background: on ? FILL[tone] : "var(--dot-empty)" }}
            initial={on ? { opacity: 0, scale: 0.4 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + i * stagger, duration: 0.18, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

type RowProps = {
  name: string;
  value: number;
  max: number;
  /** Negative values pull the careers apart: drawn grey and marked "differs". */
  delay?: number;
};

/** One why-similar row: stat name, then 16 dots in proportion to the attribution. */
export function DotRow({ name, value, max, delay = 0 }: RowProps) {
  const differs = value < 0;
  const n = filledDots(value, max, 16);
  return (
    <div className="flex h-[39px] snap-start items-center justify-between gap-3">
      <span className={`min-w-0 truncate whitespace-nowrap ${differs ? "text-muted" : "text-ink"}`}>
        {name}
        {differs && <span className="text-muted"> · differs</span>}
      </span>
      <DotMeter
        value={value}
        max={max}
        total={16}
        size={8}
        gap={3}
        tone={differs ? "grey" : "ink"}
        label={`${name}: ${n} of 16, ${differs ? "different" : "alike"}`}
        delay={delay}
        stagger={0.015}
      />
    </div>
  );
}
