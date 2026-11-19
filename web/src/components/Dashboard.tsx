"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPanel } from "@/components/MapPanel";
import { useTheme } from "@/components/useTheme";
import { fetchMap, fetchPlayerFile, fetchPlayers, fetchTeams, type PlayerFile, type PlayerRow, type Team } from "@/lib/data";
import type { Initial } from "@/lib/initial.server";
import { buildPoints, type ColourMode, type Points } from "@/lib/map";

const rise = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
});

const idFromPath = (path: string) => /^\/player\/([a-z0-9]+)\/?$/.exec(path)?.[1] ?? null;

/** The one page. Holds the state: theme, colour mode, selected player, open comp, team, tab, lambda. */
export function Dashboard({ initial }: { initial: Initial }) {
  const [theme] = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

  // Data: the selected player's file comes with the page; the rest loads in the browser.
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [pts, setPts] = useState<Points | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let off = false;
    fetchPlayers()
      .then(async (ps) => {
        if (off) return;
        setPlayers(ps);
        const map = await fetchMap();
        if (!off) setPts(buildPoints(map, new Map(ps.map((p) => [p.id, p]))));
      })
      .catch(() => !off && setLoadFailed(true));
    fetchTeams()
      .then((t) => !off && setTeams(t))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, PlayerRow>();
    for (const l of initial.legends) {
      m.set(l.player.id, l.player);
      m.set(l.match.id, l.match);
    }
    if (initial.selected) for (const p of [initial.selected.player, ...initial.selected.comps]) m.set(p.id, p);
    for (const p of players ?? []) m.set(p.id, p);
    return m;
  }, [initial, players]);

  // State.
  const [mode, setMode] = useState<ColourMode>("decade");
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selected?.player.id ?? null);
  const [files, setFiles] = useState<Record<string, PlayerFile>>(() => (initial.selected ? { [initial.selected.player.id]: initial.selected.file } : {}));
  const [comparingId, setComparingId] = useState<string | null>(null);

  const team = teams.find((t) => t.code === teamCode) ?? null;
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const file = selectedId ? (files[selectedId] ?? null) : null;

  useEffect(() => {
    if (!selectedId || files[selectedId]) return;
    let off = false;
    fetchPlayerFile(selectedId)
      .then((f) => !off && setFiles((fs) => ({ ...fs, [selectedId]: f })))
      .catch(() => !off && setLoadFailed(true));
    return () => {
      off = true;
    };
  }, [selectedId, files]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setComparingId(null);
    const path = id ? `/player/${id}` : "/";
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
  }, []);

  // Back and forward buttons move between selected players.
  useEffect(() => {
    const onPop = () => {
      setSelectedId(idFromPath(window.location.pathname));
      setComparingId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    document.title = selected ? `${selected.name} · GreenFN` : "GreenFN";
  }, [selected]);

  return (
    <main className="grid h-dvh min-h-[640px] grid-cols-[minmax(0,1fr)_432px] gap-6 p-10">
      <motion.div {...rise(0)} className="min-h-0">
        <MapPanel
          pts={pts}
          players={players}
          byId={byId}
          teams={teams}
          regions={initial.regions}
          mode={mode}
          onMode={setMode}
          team={team}
          onTeam={setTeamCode}
          selected={selected}
          comparing={comparingId ? (byId.get(comparingId) ?? null) : null}
          onSelect={select}
          onClear={() => select(null)}
          searchRef={searchRef}
          theme={theme}
          loadFailed={loadFailed}
        />
      </motion.div>
      <div className="flex min-h-0 flex-col gap-6">
        <motion.header {...rise(1)} className="card flex h-[58px] shrink-0 items-center px-5">
          <h1 className="dot-heading text-[28px] leading-none">GreenFN</h1>
        </motion.header>
        <motion.section {...rise(2)} className="card min-h-0 flex-1 p-5">
          <p className="label">{selected ? selected.name : "Start here"}</p>
          {file && <p className="mt-2 text-muted">{file.comps.length} comps</p>}
        </motion.section>
      </div>
    </main>
  );
}
