// Light and dark themes: `data-theme` on <html>, CSS variables in globals.css.
// First visit follows the system; after a toggle the choice is remembered in localStorage.

export type Theme = "light" | "dark";

export const THEME_KEY = "greenfn-theme";

/** Runs inline in <head> before paint, so the page never flashes the wrong theme. Kept tiny and dependency-free. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;})();`;

type ThemeRoot = { setAttribute(name: string, value: string): void; style: { colorScheme: string } };
type Store = { setItem(key: string, value: string): void };

/** Sets the theme on the root element and remembers it. Storage errors (private mode, blocked) are ignored. */
export function applyTheme(theme: Theme, root: ThemeRoot, store?: Store | null): void {
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  try {
    store?.setItem(THEME_KEY, theme);
  } catch {
    // The page still works; the choice just isn't remembered.
  }
}

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export const nextTheme = (t: Theme): Theme => (t === "dark" ? "light" : "dark");
