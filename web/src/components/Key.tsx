"use client";

import { AnimatePresence, motion } from "motion/react";

export type KeyExtra = { label: string; colour: string };

/** KEY · 1 dot = 1 player season, then the swatches. Squares for the data, circles for highlights. */
export function Key({ entries, extras }: { entries: { label: string; colour: string }[]; extras: KeyExtra[] }) {
  return (
    <div className="max-w-full min-w-0 rounded-xl border border-border bg-surface px-4 py-2" aria-label="Key" data-box="key">
      <p className="label">
        <span className="font-semibold text-ink">Key</span>
        <span className="mx-[1em]">·</span>1 dot = 1 player season
      </p>
      <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] leading-5">
        <AnimatePresence mode="popLayout" initial={false}>
          {entries.map((e) => (
            <motion.li
              key={e.label}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5"
            >
              <span aria-hidden="true" className="block size-[10px]" style={{ background: e.colour }} />
              {e.label}
            </motion.li>
          ))}
          {extras.map((e) => (
            <motion.li
              key={`x-${e.label}`}
              layout="position"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5"
            >
              <span aria-hidden="true" className="block size-[10px] rounded-full" style={{ background: e.colour }} />
              {e.label}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
