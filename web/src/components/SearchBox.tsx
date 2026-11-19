"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PlayerRow } from "@/lib/data";
import { searchPlayers, years } from "@/lib/format";

type Props = {
  players: PlayerRow[] | null;
  /** Name of the selected player, shown in the box. */
  selectedName: string | null;
  onSelect: (p: PlayerRow) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputId: string;
};

/** Type-ahead over players.json. `/` focuses it, arrows move, Enter picks, Esc closes or clears. */
export function SearchBox({ players, selectedName, onSelect, onClear, inputRef, inputId }: Props) {
  const id = useId();
  const [query, setQuery] = useState(selectedName ?? "");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const lastSelected = useRef(selectedName);

  // Show the selected player's name whenever the selection changes from elsewhere (legend, comp, map click).
  useEffect(() => {
    if (selectedName !== lastSelected.current) {
      lastSelected.current = selectedName;
      setQuery(selectedName ?? "");
      setOpen(false);
    }
  }, [selectedName]);

  // "/" anywhere (outside a text field) focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef]);

  const results = useMemo(() => (players ? searchPlayers(players, query, 7) : []), [players, query]);
  const showList = open && query.trim().length > 0 && query !== selectedName;

  function choose(p: PlayerRow) {
    setOpen(false);
    setQuery(p.name);
    lastSelected.current = p.name;
    onSelect(p);
  }

  function clear() {
    setQuery("");
    setOpen(false);
    if (selectedName) onClear();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && showList && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (showList) setOpen(false);
      else clear();
    }
  }

  const listId = `${id}-list`;
  return (
    <div className="relative">
      <motion.div
        className="flex h-10 items-center gap-3 rounded-[10px] border bg-surface pr-2 pl-[14px]"
        animate={{ borderColor: "var(--ink)", boxShadow: focused ? "inset 0 0 0 1px var(--ink)" : "inset 0 0 0 0.5px var(--ink)" }}
        transition={{ duration: 0.12 }}
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-ink">
          <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${id}-opt-${results[active].id}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Type any player since 1980"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => {
            setFocused(false);
            setOpen(false);
          }}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint focus-visible:outline-none"
        />
        {query ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            className="rounded-[5px] border border-border px-1.5 text-[10px] leading-[18px] text-muted transition-colors duration-[120ms] hover:bg-tint hover:text-ink"
            aria-label="ESC: clear search"
          >
            ESC
          </button>
        ) : (
          <kbd aria-hidden="true" className="rounded-[5px] border border-border px-1.5 font-mono text-[10px] leading-[18px] text-muted">
            /
          </kbd>
        )}
      </motion.div>

      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label="Matching players"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-[10px] border border-border bg-surface p-1"
          >
            {results.length === 0 && (
              <li role="presentation" className="px-3 py-2 text-muted">
                {players ? "No player found" : "Loading players..."}
              </li>
            )}
            {results.map((p, i) => (
              <motion.li
                key={p.id}
                id={`${id}-opt-${p.id}`}
                role="option"
                aria-selected={i === active}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025, duration: 0.14 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                onMouseEnter={() => setActive(i)}
                className="relative flex cursor-pointer items-baseline justify-between gap-3 rounded-[7px] px-3 py-1.5"
              >
                {i === active && (
                  <motion.span
                    layoutId={`${id}-hl`}
                    className="absolute inset-0 rounded-[7px] bg-surface-2"
                    transition={{ type: "spring", stiffness: 600, damping: 40 }}
                  />
                )}
                <span className="relative font-semibold">{p.name}</span>
                <span className="relative text-[11.5px] text-muted">
                  {p.pos ? `${p.pos} · ` : ""}
                  {years(p.first, p.last)}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
