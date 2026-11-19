"use client";

import { useCallback, useSyncExternalStore } from "react";
import { applyTheme, currentTheme, nextTheme, type Theme } from "@/lib/theme";

// The inline head script sets data-theme before paint; this hook reads it and keeps components in sync.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let fadeTimer: ReturnType<typeof setTimeout> | undefined;

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  let store: Storage | null = null;
  try {
    store = window.localStorage;
  } catch {
    store = null;
  }
  applyTheme(theme, root, store);
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => root.classList.remove("theme-fade"), 300);
  listeners.forEach((l) => l());
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  const toggle = useCallback(() => setTheme(nextTheme(currentTheme())), []);
  return [theme, toggle];
}
