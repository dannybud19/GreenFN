"use client";

import { motion } from "motion/react";
import type { Theme } from "@/lib/theme";

function Sun() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="2.2" fill="currentColor" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={6 + Math.cos(a) * 3.6} y1={6 + Math.sin(a) * 3.6} x2={6 + Math.cos(a) * 5.2} y2={6 + Math.sin(a) * 5.2} stroke="currentColor" strokeWidth="1" strokeLinecap="round" />;
      })}
    </svg>
  );
}

function Moon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <path d="M8.9 8.3A4.6 4.6 0 0 1 4 1.2a4.8 4.8 0 1 0 6.6 6.6 4.5 4.5 0 0 1-1.7.5Z" fill="currentColor" />
    </svg>
  );
}

type Props = { theme: Theme; onToggleTheme: () => void; aboutOpen: boolean; onAbout: () => void; aboutRef: React.RefObject<HTMLButtonElement | null> };

/** GREENFN wordmark (Doto), sun/moon theme switch and the (i) button that opens About. */
export function BrandBlock({ theme, onToggleTheme, aboutOpen, onAbout, aboutRef }: Props) {
  const dark = theme === "dark";
  return (
    <div className="flex h-full items-center justify-between px-5">
      <p className="dot-heading text-[24px] leading-none" aria-label="GreenFN">
        GreenFN
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label="Dark theme"
          onClick={onToggleTheme}
          className="relative flex h-[30px] w-[62px] items-center justify-between rounded-full border border-border px-[2px] transition-colors duration-[120ms] hover:bg-tint"
        >
          <motion.span
            aria-hidden="true"
            className="absolute top-[1px] size-[26px] rounded-full bg-ink"
            initial={false}
            animate={{ left: dark ? 32 : 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 32 }}
          />
          <span className={`relative flex size-[26px] items-center justify-center ${dark ? "text-faint" : "text-ink-inv"}`}>
            <Sun />
          </span>
          <span className={`relative flex size-[26px] items-center justify-center ${dark ? "text-ink-inv" : "text-faint"}`}>
            <Moon />
          </span>
        </button>
        <motion.button
          ref={aboutRef}
          type="button"
          aria-label="About GreenFN"
          aria-expanded={aboutOpen}
          aria-controls="about-card"
          onClick={onAbout}
          whileTap={{ scale: 0.97 }}
          className={`flex size-[30px] items-center justify-center rounded-full border text-[13px] font-semibold transition-colors duration-[120ms] ${
            aboutOpen ? "border-ink bg-ink text-ink-inv" : "border-border text-ink hover:bg-tint"
          }`}
        >
          i
        </motion.button>
      </div>
    </div>
  );
}
