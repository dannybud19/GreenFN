import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DotMeter, DotRow, filledDots } from "./DotMeter";

const count = (html: string, on: boolean) => html.split(`data-filled="${on}"`).length - 1;

describe("DotMeter", () => {
  it("fills the right number of dots", () => {
    const html = renderToStaticMarkup(<DotMeter value={7} max={12} total={12} label="7 seasons" />);
    expect(count(html, true)).toBe(7);
    expect(count(html, false)).toBe(5);
    expect(html).toContain('aria-label="7 seasons"');
  });

  it("rounds, clamps and handles empty input", () => {
    expect(filledDots(12, 12, 12)).toBe(12);
    expect(filledDots(20, 12, 12)).toBe(12);
    expect(filledDots(0.5, 1, 16)).toBe(8);
    expect(filledDots(-0.25, 1, 16)).toBe(4);
    expect(filledDots(3, 0, 12)).toBe(0);
    expect(filledDots(Number.NaN, 1, 12)).toBe(0);
  });

  it("why rows use 16 dots and mark negative stats as different", () => {
    const alike = renderToStaticMarkup(<DotRow name="Usage" value={0.69} max={0.69} />);
    expect(count(alike, true)).toBe(16);
    const differs = renderToStaticMarkup(<DotRow name="Turnovers" value={-0.07} max={0.69} />);
    expect(count(differs, true)).toBe(2);
    expect(differs).toContain("differs");
    expect(differs).toContain("different");
  });
});
