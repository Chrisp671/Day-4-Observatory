import { describe, expect, it } from "vitest";
import { PLANETS } from "./planets";
import { planetSeason, SEASON_HORIZON_DAYS } from "./season";

const NYC = { lat: 40.0, lon: -74.0 };
const T = new Date(2026, 7, 28, 22, 0, 0).getTime(); // evening, 28 Aug 2026
const ASKED_MIDNIGHT = new Date(2026, 7, 28).getTime();
const HORIZON_END = new Date(2026, 7, 28 + SEASON_HORIZON_DAYS).getTime();

const isLocalMidnight = (ms: number): boolean => {
  const d = new Date(ms);
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
};

describe("planetSeason", () => {
  it("gives an unknown planet no season instead of an error", () => {
    expect(planetSeason("Pluto", T, NYC.lat, NYC.lon)).toEqual({ fromUnixMillis: null, nowInSeason: false });
    expect(planetSeason("", T, NYC.lat, NYC.lon).nowInSeason).toBe(false);
  });

  const seasons = PLANETS.map(([name]) => [name, planetSeason(name, T, NYC.lat, NYC.lon)] as const);

  it("returns a boolean and either null or a local midnight inside the horizon", () => {
    for (const [, s] of seasons) {
      expect(typeof s.nowInSeason).toBe("boolean");
      if (s.fromUnixMillis === null) continue;
      expect(isLocalMidnight(s.fromUnixMillis)).toBe(true);
      expect(s.fromUnixMillis).toBeGreaterThanOrEqual(ASKED_MIDNIGHT);
      expect(s.fromUnixMillis).toBeLessThanOrEqual(HORIZON_END);
    }
  });

  it("agrees with itself: nowInSeason means from is the asked day's midnight", () => {
    for (const [, s] of seasons) {
      if (s.nowInSeason) expect(s.fromUnixMillis).toBe(ASKED_MIDNIGHT);
    }
  });

  it("is monotone: asking on the found day reports nowInSeason", () => {
    for (const [name, s] of seasons) {
      if (s.fromUnixMillis === null) continue;
      const again = planetSeason(name, s.fromUnixMillis, NYC.lat, NYC.lon, 0);
      expect(again.nowInSeason).toBe(true);
      expect(again.fromUnixMillis).toBe(s.fromUnixMillis);
    }
  });

  it("answers for all five planets without throwing", () => {
    expect(seasons.map(([name]) => name)).toEqual(PLANETS.map(([n]) => n));
    for (const [, s] of seasons) {
      expect(s.fromUnixMillis === null || Number.isFinite(s.fromUnixMillis)).toBe(true);
    }
  });

  it("holds steady across the asked calendar day", () => {
    const morning = planetSeason("Saturn", new Date(2026, 7, 28, 6, 0).getTime(), NYC.lat, NYC.lon);
    const night = planetSeason("Saturn", new Date(2026, 7, 28, 23, 30).getTime(), NYC.lat, NYC.lon);
    expect(morning).toEqual(night);
  });
});
