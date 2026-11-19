"use client";

import { motion } from "motion/react";
import type { ColourMode } from "@/lib/map";

const MODES: { id: ColourMode; label: string }[] = [
  { id: "decade", label: "Decade" },
  { id: "position", label: "Position" },
  { id: "region", label: "Region" },
];

/** Decade / Position / Region pill switch. The active pill slides between options. */
export function ColourSwitch({ mode, onChange }: { mode: ColourMode; onChange: (m: ColourMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Colour dots by" className="flex h-[30px] items-center rounded-full border border-border p-[2px]">
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <motion.button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.id)}
            onKeyDown={(e) => {
              const i = MODES.findIndex((x) => x.id === mode);
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const next = MODES[(i + (e.key === "ArrowRight" ? 1 : MODES.length - 1)) % MODES.length];
                onChange(next.id);
                (e.currentTarget.parentElement?.querySelector(`[data-mode="${next.id}"]`) as HTMLElement | null)?.focus();
              }
            }}
            tabIndex={active ? 0 : -1}
            data-mode={m.id}
            whileTap={{ scale: 0.97 }}
            className={`relative h-full rounded-full px-[11px] text-[12.5px] transition-colors duration-[120ms] ${
              active ? "text-ink-inv" : "text-muted hover:bg-tint hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="colour-pill"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{m.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
