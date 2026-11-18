import { describe, expect, it } from "vitest";
import { spreadWords, years } from "./format";

describe("format", () => {
  it("writes year ranges", () => {
    expect(years(1985, 2003)).toBe("1985 to 2003");
    expect(years(1990, 1990)).toBe("1990");
  });
  it("words the spread percentile without overstating", () => {
    expect(spreadWords(null)).toContain("not rated");
    expect(spreadWords(0)).toBe("The steadiest of all players with 4+ seasons");
    expect(spreadWords(0.0007)).toBe("Steadier than 99% of players with 4+ seasons");
    expect(spreadWords(0.13)).toBe("Steadier than 87% of players with 4+ seasons");
    expect(spreadWords(0.83)).toBe("Less steady than 83% of players with 4+ seasons");
  });
});
