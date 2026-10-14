import { describe, expect, it } from "vitest";
import { midHours } from "./passion";

describe("midHours", () => {
  it("halves an ordinary span", () => {
    expect(midHours(12, 15)).toBe(13.5);
    expect(midHours(6, 18)).toBe(12);
  });

  it("takes the short way across midnight", () => {
    expect(midHours(23, 1)).toBe(0);
    expect(midHours(22, 2)).toBe(0);
  });

  it("always lands inside the day", () => {
    for (let from = 0; from < 24; from += 0.5) {
      for (const span of [0.5, 3, 7.25]) {
        const m = midHours(from, (from + span) % 24);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThan(24);
      }
    }
  });
});
