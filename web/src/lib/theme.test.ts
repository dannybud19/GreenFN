import { describe, expect, it } from "vitest";
import { applyTheme, nextTheme, THEME_KEY, themeScript } from "./theme";

function fakeRoot() {
  const attrs: Record<string, string> = {};
  return { attrs, setAttribute: (k: string, v: string) => (attrs[k] = v), style: { colorScheme: "" } };
}

describe("theme toggle", () => {
  it("sets data-theme on the root and remembers the choice", () => {
    const root = fakeRoot();
    const saved: Record<string, string> = {};
    applyTheme("dark", root, { setItem: (k, v) => (saved[k] = v) });
    expect(root.attrs["data-theme"]).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
    expect(saved[THEME_KEY]).toBe("dark");
    applyTheme(nextTheme("dark"), root, null);
    expect(root.attrs["data-theme"]).toBe("light");
  });

  it("still switches when storage throws (private mode)", () => {
    const root = fakeRoot();
    applyTheme("dark", root, {
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(root.attrs["data-theme"]).toBe("dark");
  });

  it("the no-flash head script reads the stored key and falls back to the system setting", () => {
    expect(themeScript).toContain(THEME_KEY);
    expect(themeScript).toContain("prefers-color-scheme: dark");
    expect(themeScript).toContain("data-theme");
  });
});
