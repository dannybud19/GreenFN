"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { fetchPlayers, type PlayerRow } from "@/lib/data";
import { playerSummary } from "@/lib/format";

const normalise = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Props = {
  /** Called with the chosen player. Default: open his page. */
  onSelect?: (p: PlayerRow) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

export function SearchBox({ onSelect, label = "Search players", placeholder = "Type a player's name", autoFocus }: Props) {
  const router = useRouter();
  const id = useId();
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPlayers()
      .then((p) => !cancelled && setPlayers(p))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const index = useMemo(() => (players ?? []).map((p) => ({ p, n: normalise(p.name) })), [players]);

  const results = useMemo(() => {
    const tokens = normalise(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const hits: { p: PlayerRow; rank: number }[] = [];
    for (const { p, n } of index) {
      if (!tokens.every((t) => n.includes(t))) continue;
      const words = n.split(/[\s.'-]+/);
      const rank = n.startsWith(tokens[0]) ? 0 : words.some((w) => w.startsWith(tokens[0])) ? 1 : 2;
      hits.push({ p, rank });
    }
    hits.sort((a, b) => a.rank - b.rank || b.p.seasons - a.p.seasons || a.p.name.localeCompare(b.p.name));
    return hits.slice(0, 8).map((h) => h.p);
  }, [index, query]);

  function choose(p: PlayerRow) {
    setOpen(false);
    setQuery(onSelect ? "" : p.name);
    if (onSelect) onSelect(p);
    else router.push(`/player/${p.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const listId = `${id}-list`;
  const showList = open && query.trim().length > 0;

  return (
    <div className="relative w-full">
      <label htmlFor={`${id}-input`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${id}-opt-${results[active].id}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-base shadow-sm"
      />
      {failed && <p className="mt-1 text-sm text-muted">The player list could not be loaded. Reload the page to try again.</p>}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching players"
          className="absolute z-20 mt-1 max-h-96 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted" role="presentation">
              {players ? "No player found" : "Loading players..."}
            </li>
          )}
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${id}-opt-${p.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? "bg-accent-soft" : ""}`}
            >
              <span className="font-medium">{p.name}</span>
              <span className="ml-2 text-sm text-muted">{playerSummary(p)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
