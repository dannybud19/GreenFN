"use client";

import type { Initial } from "@/lib/initial.server";

/** The one page. Map container on the left, GREENFN block and one scrolling panel on the right. */
export function Dashboard({ initial }: { initial: Initial }) {
  return (
    <main className="grid h-dvh grid-cols-[1fr_432px] gap-6 p-10">
      <section className="card" aria-label="Map of every season" />
      <div className="flex min-h-0 flex-col gap-6">
        <header className="card flex h-[58px] items-center px-5">
          <h1 className="dot-heading text-[28px] leading-none">GreenFN</h1>
        </header>
        <section className="card min-h-0 flex-1 p-5">
          <p className="label">{initial.selected ? initial.selected.player.name : "Start here"}</p>
        </section>
      </div>
    </main>
  );
}
