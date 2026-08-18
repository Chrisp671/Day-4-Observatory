import { describe, expect, it } from "vitest";
import { localDayNumber, VERSES, verseOfDay } from "./verse";

const DAY = 86400000;
// Noon local time avoids midnight-edge ambiguity across test-runner timezones.
const noonLocal = (y: number, m: number, d: number): number =>
  new Date(y, m - 1, d, 12, 0, 0).getTime();

describe("verseOfDay", () => {
  it("is stable across one whole local day", () => {
    const morning = new Date(2026, 7, 17, 0, 0, 1).getTime();
    const night = new Date(2026, 7, 17, 23, 59, 59).getTime();
    expect(verseOfDay(morning)).toEqual(verseOfDay(night));
  });

  it("changes at local midnight", () => {
    const beforeMidnight = new Date(2026, 7, 17, 23, 59, 59).getTime();
    const afterMidnight = new Date(2026, 7, 18, 0, 0, 1).getTime();
    expect(verseOfDay(beforeMidnight)).not.toEqual(verseOfDay(afterMidnight));
  });

  it("cycles through every verse in the canon", () => {
    const t0 = noonLocal(2026, 8, 17);
    const seen = new Set<string>();
    for (let i = 0; i < VERSES.length; i++) seen.add(verseOfDay(t0 + i * DAY).reference);
    expect(seen.size).toBe(VERSES.length);
  });

  it("holds the founding charter in the canon", () => {
    expect(VERSES.some((v) => v.reference === "Genesis 1:14")).toBe(true);
  });

  it("never yields a malformed verse (even for pre-epoch dates)", () => {
    for (const t of [noonLocal(1969, 12, 25), noonLocal(2026, 8, 17), noonLocal(2100, 1, 1)]) {
      const v = verseOfDay(t);
      expect(v.text.length).toBeGreaterThan(20);
      expect(v.reference).toMatch(/^[A-Za-z ]+ \d/);
    }
  });

  it("advances the local day number exactly once per day", () => {
    const t = noonLocal(2026, 8, 17);
    expect(localDayNumber(t + DAY) - localDayNumber(t)).toBe(1);
  });
});
