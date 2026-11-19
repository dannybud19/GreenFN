import { describe, expect, it } from "vitest";
import { STAT_PHRASES, whyOrder, whySentence } from "./format";

describe("why-similar wording", () => {
  const features = ["usg_percent", "fga_per_100_poss", "stl_percent", "tov_percent", "blk_percent"];

  it("has a phrase for each of the 15 stats", () => {
    expect(Object.keys(STAT_PHRASES)).toHaveLength(15);
  });

  it("builds the sentence from the top 3 positive stats, in order", () => {
    expect(whySentence([0.69, 0.38, 0.33, -0.07, 0.1], features)).toBe(
      "Both match closely on how much of the offence ran through them, how often they shot and how often they got steals.",
    );
    expect(whySentence([-1, -2, 0, 0, 0], features)).toContain("loosely");
  });

  it("orders rows: top 3 alike, then the biggest difference, then the rest", () => {
    expect(whyOrder([0.69, 0.38, 0.33, -0.07, 0.1])).toEqual([0, 1, 2, 3, 4]);
    expect(whyOrder([0.1, -0.5, 0.3, 0.2, -0.1])).toEqual([2, 3, 0, 1, 4]);
  });
});
import { spreadWords, years } from "./format";

describe("format", () => {
  it("writes year ranges", () => {
    expect(years(1985, 2003)).toBe("1985 to 2003");
    expect(years(1990, 1990)).toBe("1990");
  });
  it("words the spread percentile without overstating", () => {
    expect(spreadWords(null)).toContain("not rated");
    expect(spreadWords(0)).toBe("The most consistent of all players who played 4+ seasons");
    expect(spreadWords(0.0007)).toBe("More consistent than 99% of players who played 4+ seasons");
    expect(spreadWords(0.13)).toBe("More consistent than 87% of players who played 4+ seasons");
    expect(spreadWords(0.83)).toBe("Less consistent than 83% of players who played 4+ seasons");
    expect(spreadWords(0.5)).toBe("More consistent than 50% of players who played 4+ seasons");
    expect(spreadWords(0.51)).toBe("Less consistent than 51% of players who played 4+ seasons");
  });
});
