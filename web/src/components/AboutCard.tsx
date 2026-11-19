"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

/** One sentence plus the GitHub link. Scales out of the (i) button; Esc or × closes it. */
export function AboutCard({ onClose, attribution }: { onClose: () => void; attribution: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(t) && !t.closest("[aria-controls='about-card']")) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      id="about-card"
      role="dialog"
      aria-label="About GreenFN"
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.14 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      style={{ transformOrigin: "calc(100% - 35px) -40px" }}
      className="absolute inset-x-0 top-0 z-20 rounded-[20px] border-[1.5px] border-ink bg-surface p-5 outline-none"
    >
      <div className="flex items-start justify-between">
        <p className="dot-heading text-[24px] leading-none">GreenFN</p>
        <button type="button" onClick={onClose} aria-label="Close About" className="-m-1 flex size-7 items-center justify-center rounded-full text-[16px] transition-colors duration-[120ms] hover:bg-tint">
          ×
        </button>
      </div>
      <p className="mt-4 text-[13.5px] leading-[21px]">
        A machine-learning model that finds NBA players whose careers look alike, from the style of every season they played since 1980.
      </p>
      <a
        href="https://github.com/dannybud19/GreenFN"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block border-b border-ink text-[13px] leading-5 transition-opacity duration-[120ms] hover:opacity-70"
      >
        github.com/dannybud19/GreenFN ↗
      </a>
      <p className="mt-4 text-[11px] leading-4 text-muted">
        The map and its regions are a 2D picture and a reading aid, not a model output: comps are computed in the full 32-dimension model.
      </p>
      <p className="mt-2 text-[11px] leading-4 text-muted">{attribution}</p>
    </motion.div>
  );
}
