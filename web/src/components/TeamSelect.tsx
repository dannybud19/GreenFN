"use client";

import type { Team } from "@/lib/data";

/** Dropdown of every team code in the data, "All teams" first. Letters only, never a logo. */
export function TeamSelect({ teams, value, onChange, id }: { teams: Team[]; value: string | null; onChange: (code: string | null) => void; id: string }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-border bg-surface pr-9 pl-4 text-[13.5px] text-ink transition-colors duration-[120ms] hover:bg-tint"
      >
        <option value="">{teams.length ? `All ${teams.length} teams` : "All teams"}</option>
        {teams.map((t) => (
          <option key={t.code} value={t.code}>
            {t.name}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[9px] text-ink">
        ▼
      </span>
    </div>
  );
}
