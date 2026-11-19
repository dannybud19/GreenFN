"use client";

import { AnimatePresence, motion } from "motion/react";
import { DotMeter } from "@/components/DotMeter";
import { FitName } from "@/components/FitName";
import type { PlayerRow, Region } from "@/lib/data";
import { spreadWords } from "@/lib/format";

type Props = {
  player: PlayerRow;
  region: Region | null;
  lambda: number;
  onLambda: (l: number) => void;
  busy: boolean;
  /** Career playback button: "▶ Play career", "❚❚ Pause", "▶ Play" (paused) or "↺ Replay". */
  playLabel: string;
  onPlay: () => void;
  playDisabled: boolean;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-[15px] leading-5 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Doto name, seasons / from / to / position, a consistency dot meter and the lambda row. */
export function PlayerCard({ player, region, lambda, onLambda, busy, playLabel, onPlay, playDisabled }: Props) {
  const steady = player.spreadPct === null ? 0 : 1 - player.spreadPct;
  const words = spreadWords(player.spreadPct);
  return (
    <div className="px-5 pb-5">
      <FitName name={player.name} />
      <div className="mt-2 flex h-7 items-center justify-between gap-3">
        {region ? <span className="inline-block truncate rounded-full border border-border px-2 text-[11px] leading-[18px] text-muted">{region.name}</span> : <span />}
        <motion.button
          type="button"
          onClick={onPlay}
          disabled={playDisabled}
          whileTap={{ scale: 0.97 }}
          data-play-button
          className="h-7 shrink-0 rounded-full border border-ink px-3 text-[12px] font-medium whitespace-nowrap transition-colors duration-[120ms] hover:bg-ink hover:text-ink-inv disabled:opacity-40"
        >
          {playLabel}
        </motion.button>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-3">
        <Stat label="Seasons" value={player.seasons} />
        <Stat label="From" value={player.first} />
        <Stat label="To" value={player.last} />
        <Stat label="Position" value={player.pos || "?"} />
      </dl>

      <div className="mt-5">
        <p className="label">Consistency</p>
        <DotMeter className="mt-2" value={steady} max={1} total={24} size={7} gap={4} tone="red" label={words} delay={0.15} stagger={0.018} />
        <p className="mt-1.5 text-[11.5px] leading-4 text-muted">{words}</p>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <label htmlFor="lambda" className="label">
            Career shape weight (lambda)
          </label>
          <AnimatePresence>
            {lambda !== 0 && (
              <motion.button
                type="button"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onLambda(0)}
                className="rounded-full border border-border px-2 text-[11px] leading-[18px] text-muted transition-colors duration-[120ms] hover:bg-tint hover:text-ink"
              >
                Back to default
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="lambda"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={lambda}
            onChange={(e) => onLambda(Number(e.target.value))}
            aria-describedby="lambda-help"
            aria-busy={busy}
            className="lambda h-4 min-w-0 flex-1 cursor-pointer"
          />
          <output htmlFor="lambda" className="w-9 text-right text-[13px] tabular-nums">
            {lambda.toFixed(2)}
          </output>
        </div>
        <p id="lambda-help" className="mt-1 text-[11.5px] leading-4 text-muted">
          Higher values favour careers with a similar consistency, not just a similar style.
        </p>
      </div>
    </div>
  );
}
