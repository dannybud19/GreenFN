"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { DotRow } from "@/components/DotMeter";
import type { PlayerRow, Region } from "@/lib/data";
import { whyOrder, whySentence, years } from "@/lib/format";

type WhyProps = { comp: PlayerRow; values: number[] | null; labels: string[]; features: string[]; onSelect: (id: string) => void };

/** WHY THEY MATCH: one plain sentence, then the 15 stats as dot rows in their own scroll area (4 visible). */
export function WhyCard({ comp, values, labels, features, onSelect }: WhyProps) {
  const [atEnd, setAtEnd] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const goto = (
    <button
      type="button"
      onClick={() => onSelect(comp.id)}
      className="text-[11px] tracking-[0.06em] text-muted uppercase transition-colors duration-[120ms] hover:text-ink"
    >
      Open {comp.name} <span aria-hidden="true">→</span>
    </button>
  );
  if (!values) {
    return (
      <div className="rounded-xl border-[1.5px] border-ink p-4">
        <p className="label">Why they match</p>
        <p className="mt-2 text-[13px] leading-5">Breakdowns are precomputed for the default top 5.</p>
        <div className="mt-3 text-right">{goto}</div>
      </div>
    );
  }
  const max = Math.max(...values.map(Math.abs)) || 1;
  const order = whyOrder(values);
  return (
    <div className="rounded-xl border-[1.5px] border-ink p-4 pb-3">
      <p className="label">Why they match</p>
      <p className="mt-2 text-[13px] leading-5">{whySentence(values, features)}</p>
      {/* The rows scroll in their own box under its own top border, never under the sentence. Rows snap to the
          top edge so the first visible row is always whole; a short fade shows there is more above or below. */}
      <div className="mt-3 border-t border-border pt-1">
      <div
        data-why-scroll
        tabIndex={0}
        aria-label="All 15 stats, scroll for more"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtTop(el.scrollTop <= 1);
          setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
        }}
        style={{
          maskImage: `linear-gradient(to bottom, ${atTop ? "#000" : "transparent"} 0, #000 10px, #000 calc(100% - 10px), ${atEnd ? "#000" : "transparent"} 100%)`,
        }}
        className="scroll-thin h-[156px] snap-y snap-mandatory overflow-y-auto overscroll-contain pr-2"
      >
        <div aria-hidden="true">
          {order.map((k, i) => (
            <DotRow key={features[k]} name={labels[k]} value={values[k]} max={max} delay={0.05 + Math.min(i, 5) * 0.06} />
          ))}
        </div>
        <table className="sr-only">
          <caption>
            Why {comp.name} matches: integrated-gradients attribution per stat (positive = alike, negative = different)
          </caption>
          <thead>
            <tr>
              <th scope="col">Stat</th>
              <th scope="col">Attribution</th>
            </tr>
          </thead>
          <tbody>
            {order.map((k) => (
              <tr key={features[k]}>
                <th scope="row">{labels[k]}</th>
                <td>{values[k].toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="label flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-[6px] rounded-full bg-ink" />
            Alike
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-[6px] rounded-full bg-comparing" />
            Different
          </span>
        </span>
        <span className="label">{atEnd ? "15 of 15" : "4 of 15 · Scroll ↓"}</span>
      </div>
      <div className="mt-2 text-right">{goto}</div>
    </div>
  );
}

type ListProps = {
  comps: PlayerRow[];
  why: Record<string, number[]>;
  labels: string[];
  features: string[];
  regions: Region[];
  openId: string | null;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

/** MOST SIMILAR CAREERS: an accordion of 10 rows; one open at a time. Rows glide to new ranks when lambda moves. */
export function CompList({ comps, why, labels, features, regions, openId, onToggle, onHover, onSelect }: ListProps) {
  return (
    <section aria-labelledby="comps-heading" className="px-5 pb-6">
      <div className="flex items-center justify-between border-t border-border pt-4 pb-2">
        <h3 id="comps-heading" className="label">
          <span className="step">03</span>Most similar careers
        </h3>
        <span className="label text-ink">{comps.length}</span>
      </div>
      <LayoutGroup>
        <ul>
          {comps.map((c, i) => {
            const open = c.id === openId;
            const region = regions[c.region];
            return (
              <motion.li key={c.id} layout="position" transition={{ type: "spring", stiffness: 380, damping: 36 }} className="border-b border-border">
                <motion.button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`why-${c.id}`}
                  onClick={() => onToggle(c.id)}
                  onMouseEnter={() => onHover(c.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(c.id)}
                  onBlur={() => onHover(null)}
                  whileTap={{ scale: 0.99 }}
                  className="flex h-[42px] w-full items-center gap-3 text-left transition-colors duration-[120ms] hover:bg-tint"
                >
                  <span className="w-6 shrink-0 text-[13px] text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 truncate text-[13px] font-semibold" title={c.name}>
                    {c.name}
                  </span>
                  {region && <span className="shrink-0 rounded-full border border-border px-2 text-[11px] leading-[18px] text-muted">{region.name}</span>}
                  <span className="sr-only">, {years(c.first, c.last)}</span>
                  <motion.span aria-hidden="true" className="ml-auto text-[9px]" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    ▼
                  </motion.span>
                </motion.button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={`why-${c.id}`}
                      key="why"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1 pb-3">
                        <WhyCard comp={c} values={why[c.id] ?? null} labels={labels} features={features} onSelect={onSelect} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </LayoutGroup>
    </section>
  );
}
