"use client";

import { AnimatePresence, motion } from "motion/react";
import { DotMeter } from "@/components/DotMeter";
import type { PlayerRow, Team } from "@/lib/data";
import { years } from "@/lib/format";
import type { LegendRow } from "@/lib/initial.server";

export type Tab = "legends" | "team" | "search";

const TABS: { id: Tab; label: string }[] = [
  { id: "legends", label: "Legends" },
  { id: "team", label: "Your team" },
  { id: "search", label: "Search" },
];

type Props = {
  tab: Tab;
  onTab: (t: Tab) => void;
  legends: LegendRow[];
  team: Team | null;
  teams: Team[];
  byId: Map<string, PlayerRow>;
  onSelect: (id: string) => void;
  onTeam: (code: string) => void;
  onSearch: () => void;
};

const rowClass =
  "group flex w-full items-center gap-4 border-b border-border py-[11px] text-left transition-colors duration-[120ms] hover:bg-tint focus-visible:bg-tint";

function Num({ i }: { i: number }) {
  return <span className="dot-heading w-6 shrink-0 text-[16px] leading-none text-faint">{String(i + 1).padStart(2, "0")}</span>;
}

/** START HERE / FIND YOUR PLAYER, the three tabs and their lists (the list scrolls inside the card). */
export function StartCard({ tab, onTab, legends, team, teams, byId, onSelect, onTeam, onSearch }: Props) {
  const maxSeasons = team?.top[0]?.[1] ?? 1;
  const dots = Math.min(Math.max(maxSeasons, 1), 20);

  const head =
    tab === "legends"
      ? [`${legends.length} legends to try`, "Closest match"]
      : tab === "team"
        ? team
          ? [`Most seasons for the ${team.short}`, "Seasons"]
          : ["Pick a team", "Seasons"]
        : ["Search", ""];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pt-5">
        <p className="label text-ink">Start here</p>
        <h2 className="dot-heading mt-[14px] text-[30px] leading-[33px]">
          Find your
          <br />
          player
        </h2>
        <p className="mt-[14px] text-[12.5px] leading-[20px]">
          Type your favourite player, pick your team, or start with a legend. We&apos;ll show the careers that played most like theirs.
        </p>
        <div role="tablist" aria-label="Ways to start" className="mt-[18px] grid grid-cols-3 gap-[7px]">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <motion.button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls="start-panel"
                tabIndex={active ? 0 : -1}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onTab(t.id);
                  if (t.id === "search") onSearch();
                }}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const i = TABS.findIndex((x) => x.id === tab);
                  const next = TABS[(i + (e.key === "ArrowRight" ? 1 : 2)) % 3];
                  onTab(next.id);
                  document.getElementById(`tab-${next.id}`)?.focus();
                }}
                className={`relative h-8 rounded-lg border border-border text-[12.5px] transition-colors duration-[120ms] ${active ? "font-semibold text-ink" : "text-muted hover:bg-tint hover:text-ink"}`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-outline"
                    aria-hidden="true"
                    className="absolute -inset-px rounded-lg border-[1.5px] border-ink"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-[18px] flex items-center justify-between border-y border-border px-5 py-[13px]">
        <span className="label">{head[0]}</span>
        <span className="label">{head[1]}</span>
      </div>

      <div id="start-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="scroll-thin fade-bottom min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul key={`${tab}-${team?.code ?? ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === "legends" &&
              legends.map(({ player, match }, i) => (
                <li key={player.id}>
                  <button type="button" className={rowClass} onClick={() => onSelect(player.id)}>
                    <Num i={i} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{player.name}</span>
                      <span className="block text-[11.5px] leading-4 text-muted">
                        {player.pos} · {years(player.first, player.last)}
                      </span>
                    </span>
                    <span className="text-[12px] text-muted transition-colors duration-[120ms] group-hover:text-ink">
                      {match.name} <span aria-hidden="true">→</span>
                    </span>
                  </button>
                </li>
              ))}

            {tab === "team" &&
              team &&
              team.top.map(([pid, n, first, last], i) => {
                const p = byId.get(pid);
                return (
                  <li key={pid}>
                    <button type="button" className={rowClass} onClick={() => onSelect(pid)}>
                      <Num i={i} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{p?.name ?? pid}</span>
                        <span className="block text-[11.5px] leading-4 text-muted">{years(first, last)}</span>
                      </span>
                      <DotMeter value={n} max={dots} total={dots} size={6} gap={3} label={`${n} seasons`} delay={0.1 + i * 0.03} />
                      <span className="w-5 text-right text-[12px] tabular-nums">{n}</span>
                    </button>
                  </li>
                );
              })}

            {tab === "team" &&
              !team &&
              teams.map((t) => (
                <li key={t.code}>
                  <button type="button" className={rowClass} onClick={() => onTeam(t.code)}>
                    <span className="dot-heading w-10 shrink-0 text-[16px] leading-none">{t.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{t.name}</span>
                      <span className="block text-[11.5px] leading-4 text-muted">
                        {years(t.first, t.last)} · {t.players} players
                      </span>
                    </span>
                    <span className="text-[12px] tabular-nums">{t.seasons}</span>
                  </button>
                </li>
              ))}

            {tab === "search" && (
              <li className="py-4 text-[13px] leading-5 text-muted">
                Type a name in the search box above the map, or press <kbd className="rounded border border-border px-1 text-ink">/</kbd> from anywhere.
                Arrow keys move through the matches; Enter picks one.
              </li>
            )}
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>
  );
}
