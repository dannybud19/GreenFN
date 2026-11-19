"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AboutCard } from "@/components/AboutCard";
import { BrandBlock } from "@/components/BrandBlock";
import { CompList } from "@/components/CompList";
import { MapPanel } from "@/components/MapPanel";
import { PlaybackBar } from "@/components/PlaybackBar";
import { PlayerCard } from "@/components/PlayerCard";
import { StartCard, type Tab } from "@/components/StartCard";
import { useTheme } from "@/components/useTheme";
import { fetchMap, fetchPlayerFile, fetchPlayers, fetchProfiles, fetchTeams, type PlayerFile, type PlayerRow, type Profiles, type Team } from "@/lib/data";
import type { Initial } from "@/lib/initial.server";
import { buildPoints, type ColourMode, type Points } from "@/lib/map";
import { careerScores, topK } from "@/lib/score";

const rise = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
});

const idFromPath = (path: string) => /^\/player\/([a-z0-9]+)\/?$/.exec(path)?.[1] ?? null;

/** The one page. Holds the state: theme, colour mode, selected player, open comp, team, tab, lambda. */
export function Dashboard({ initial }: { initial: Initial }) {
  const [theme, toggleTheme] = useTheme();
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
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("legends");
  const [lambda, setLambda] = useState(0);
  const [profiles, setProfiles] = useState<Profiles | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const aboutRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const comparingId = hoverId ?? openId;

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

  // The slider loads profiles.json once, the first time it moves.
  useEffect(() => {
    if (lambda === 0 || profiles) return;
    let off = false;
    fetchProfiles()
      .then((p) => !off && setProfiles(p))
      .catch(() => !off && setLoadFailed(true));
    return () => {
      off = true;
    };
  }, [lambda, profiles]);

  // At lambda 0 the list is the precomputed one (the parity test checks they agree); otherwise score.ts.
  const compIds = useMemo(() => {
    if (!file || !selectedId) return [];
    if (lambda === 0 || !profiles) return file.comps.map((c) => c[0]);
    const i = profiles.ids.indexOf(selectedId);
    return i < 0 ? file.comps.map((c) => c[0]) : topK(careerScores(profiles, i, lambda), 10).map((j) => profiles.ids[j]);
  }, [file, selectedId, lambda, profiles]);
  const comps = compIds.flatMap((id) => byId.get(id) ?? []);

  // Career playback for the selected player: the season index shown and whether it is advancing.
  const reduce = useReducedMotion();
  const [pb, setPb] = useState<{ i: number; playing: boolean } | null>(null);
  const pbActive = useRef(false);
  useEffect(() => {
    pbActive.current = pb !== null;
  }, [pb]);
  const [viewCmd, setViewCmd] = useState<{ kind: "fit" | "reset"; n: number } | null>(null);
  const command = useCallback((kind: "fit" | "reset") => setViewCmd((c) => ({ kind, n: (c?.n ?? 0) + 1 })), []);
  const careerLen = file?.seasons?.length ?? 0;

  // One season every 900 ms (250 ms under reduced motion), stopping on the last.
  useEffect(() => {
    if (!pb?.playing || careerLen === 0) return;
    const id = setInterval(
      () => setPb((p) => (!p ? p : p.i + 1 >= careerLen - 1 ? { i: careerLen - 1, playing: false } : { i: p.i + 1, playing: true })),
      reduce ? 250 : 900,
    );
    return () => clearInterval(id);
  }, [pb?.playing, careerLen, reduce]);

  const startPlayback = useCallback(() => {
    setPb({ i: 0, playing: careerLen > 1 });
    command("fit");
  }, [careerLen, command]);
  const stopPlayback = useCallback(() => {
    if (!pbActive.current) return;
    setPb(null);
    command("reset");
  }, [command]);
  const onPlayButton = () => {
    if (!pb) startPlayback();
    else if (pb.playing) setPb({ ...pb, playing: false });
    else if (pb.i >= careerLen - 1) startPlayback();
    else setPb({ ...pb, playing: true });
  };
  const playLabel = !pb ? "▶ Play career" : pb.playing ? "❚❚ Pause" : pb.i >= careerLen - 1 ? "↺ Replay" : "▶ Play";
  const stepTo = (i: number) => setPb({ i: Math.max(0, Math.min(careerLen - 1, i)), playing: false });

  // Esc stops playback and restores the normal view.
  useEffect(() => {
    if (!pb) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stopPlayback();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pb, stopPlayback]);

  const select = useCallback((id: string | null) => {
    // Switching player while playback is on restarts it for the new player; clearing stops it.
    if (pbActive.current) {
      if (id) {
        setPb({ i: 0, playing: true });
        command("fit");
      } else {
        setPb(null);
        command("reset");
      }
    }
    setSelectedId(id);
    setHoverId(null);
    setOpenId(null);
    panelRef.current?.scrollTo({ top: 0 });
    const path = id ? `/player/${id}` : "/";
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
  }, [command]);

  // Back and forward buttons move between selected players.
  useEffect(() => {
    const onPop = () => {
      setSelectedId(idFromPath(window.location.pathname));
      setHoverId(null);
      setOpenId(null);
      setLambda(0);
      setPb(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    document.title = selected ? `${selected.name} · GreenFN` : "GreenFN";
  }, [selected]);

  return (
    <main className="flex flex-col gap-4 p-4 pb-[calc(44dvh+16px)] md:grid md:h-dvh md:min-h-[640px] md:grid-cols-[minmax(0,1fr)_340px] md:gap-6 md:p-6 xl:grid-cols-[minmax(0,1fr)_432px] xl:p-10">
      <motion.div {...rise(0)} className="min-h-0 max-md:order-2">
        <MapPanel
          pts={pts}
          players={players}
          byId={byId}
          teams={teams}
          regions={initial.regions}
          mode={mode}
          onMode={setMode}
          team={team}
          onTeam={(code) => {
            setTeamCode(code);
            if (code) setTab("team");
          }}
          selected={selected}
          comparing={comparingId ? (byId.get(comparingId) ?? null) : null}
          onSelect={select}
          onClear={() => select(null)}
          searchRef={searchRef}
          theme={theme}
          loadFailed={loadFailed}
          play={pb && file?.seasons ? { i: pb.i } : null}
          viewCmd={viewCmd}
          overlay={
            pb && selected && file?.seasons ? (
              <PlaybackBar key="bar" name={selected.name} seasons={file.seasons} i={pb.i} onPrev={() => stepTo(pb.i - 1)} onNext={() => stepTo(pb.i + 1)} />
            ) : null
          }
        />
      </motion.div>
      <div className="flex min-h-0 flex-col gap-6 max-md:contents">
        <motion.header {...rise(1)} className="card h-[58px] shrink-0 max-md:order-1" data-box="brand">
          <h1 className="sr-only">GreenFN: NBA career comps</h1>
          <BrandBlock theme={theme} onToggleTheme={toggleTheme} aboutOpen={aboutOpen} onAbout={() => setAboutOpen((o) => !o)} aboutRef={aboutRef} />
        </motion.header>
        <motion.div
          {...rise(2)}
          className={`relative min-h-0 flex-1 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:transition-[height] max-md:duration-300 ${sheetOpen ? "max-md:h-[86dvh]" : "max-md:h-[44dvh]"}`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? "Shrink the panel" : "Expand the panel"}
            className="absolute -top-0 left-1/2 z-20 flex h-6 w-16 -translate-x-1/2 items-center justify-center md:hidden"
          >
            <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-faint" />
          </button>
          <AnimatePresence>
            {aboutOpen && (
              <AboutCard
                attribution={initial.attribution}
                onClose={() => {
                  setAboutOpen(false);
                  aboutRef.current?.focus();
                }}
              />
            )}
          </AnimatePresence>
          <section data-box="panel" className="card h-full min-h-0 overflow-hidden max-md:rounded-b-none max-md:border-b-0 max-md:pt-4" aria-label={selected ? `${selected.name}: player and similar careers` : "Start here"}>
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <motion.div
                  key={`p-${selected.id}`}
                  ref={panelRef}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="scroll-thin h-full overflow-y-auto"
                >
                  <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-border bg-surface px-5 py-[13px]">
                    <span className="label">
                      <span className="step">02</span>Player
                    </span>
                    <button type="button" onClick={() => select(null)} className="label transition-colors duration-[120ms] hover:text-ink">
                      Clear <span aria-hidden="true">×</span>
                    </button>
                  </div>
                  <PlayerCard
                    player={selected}
                    region={initial.regions[selected.region] ?? null}
                    lambda={lambda}
                    onLambda={setLambda}
                    busy={lambda > 0 && !profiles}
                    playLabel={playLabel}
                    onPlay={onPlayButton}
                    playDisabled={careerLen === 0}
                  />
                  {file ? (
                    <CompList
                      comps={comps}
                      why={file.why}
                      labels={initial.labels}
                      features={initial.features}
                      regions={initial.regions}
                      openId={openId}
                      onToggle={(id) => setOpenId((o) => (o === id ? null : id))}
                      onHover={setHoverId}
                      onSelect={select}
                    />
                  ) : (
                    <p className="px-5 text-muted">{loadFailed ? "This player could not be loaded." : "Loading comps..."}</p>
                  )}
                </motion.div>
              ) : (
                <motion.div key="start" className="h-full" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                  <StartCard
                    tab={tab}
                    onTab={setTab}
                    legends={initial.legends}
                    team={team}
                    teams={teams}
                    byId={byId}
                    onSelect={select}
                    onTeam={(code) => {
                      setTeamCode(code);
                      setTab("team");
                    }}
                    onSearch={() => searchRef.current?.focus()}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </motion.div>
      </div>
    </main>
  );
}
