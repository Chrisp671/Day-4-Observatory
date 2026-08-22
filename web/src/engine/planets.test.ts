import { describe, expect, it } from "vitest";
import { moonDay, planetBoard, PLANETS } from "./planets";

const NYC = { lat: 40.0, lon: -74.0 };
const T = new Date(2026, 7, 21, 21, 0, 0).getTime(); // evening, 21 Aug 2026
const DAY = 86400000;

describe("planetBoard", () => {
  const board = planetBoard(T, NYC.lat, NYC.lon);

  it("carries all five naked-eye planets, in order", () => {
    expect(board.map((p) => p.name)).toEqual(PLANETS.map(([name]) => name));
  });

  it("finds a rise, a set, and a peak for every planet within days", () => {
    for (const p of board) {
      expect(p.riseUnixMillis).not.toBeNull();
      expect(p.setUnixMillis).not.toBeNull();
      expect(p.transitUnixMillis).not.toBeNull();
      for (const t of [p.riseUnixMillis, p.setUnixMillis, p.transitUnixMillis]) {
        expect(t as number).toBeGreaterThan(T);
        expect(t as number).toBeLessThan(T + 3 * DAY);
      }
    }
  });

  it("agrees with itself: up now means the set comes before the rise", () => {
    for (const p of board) {
      const setFirst = (p.setUnixMillis as number) < (p.riseUnixMillis as number);
      expect(p.upNow).toBe(setFirst);
    }
  });

  it("keeps altitude and azimuth on the sky", () => {
    for (const p of board) {
      expect(Math.abs(p.altitudeDeg)).toBeLessThanOrEqual(90);
      expect(p.azimuthDeg).toBeGreaterThanOrEqual(0);
      expect(p.azimuthDeg).toBeLessThan(360);
    }
  });
});

describe("moonDay", () => {
  it("holds steady across one calendar day", () => {
    const morning = moonDay(new Date(2026, 7, 21, 6, 0).getTime(), NYC.lat, NYC.lon);
    const night = moonDay(new Date(2026, 7, 21, 23, 30).getTime(), NYC.lat, NYC.lon);
    expect(morning).toEqual(night);
  });

  it("keeps the rise inside the asked day, and the set after the rise", () => {
    const d = moonDay(T, NYC.lat, NYC.lon);
    const rise = d.riseUnixMillis as number;
    const dayStart = new Date(2026, 7, 21).getTime();
    expect(rise).toBeGreaterThanOrEqual(dayStart);
    expect(rise).toBeLessThan(dayStart + DAY);
    expect(d.setUnixMillis as number).toBeGreaterThan(rise);
  });

  it("finds the no-moonrise day that comes roughly once a month", () => {
    let missing = 0;
    for (let i = 0; i < 32; i++) {
      const d = moonDay(T + i * DAY, NYC.lat, NYC.lon);
      if (d.riseUnixMillis === null) missing++;
    }
    expect(missing).toBeGreaterThanOrEqual(1);
    expect(missing).toBeLessThanOrEqual(2);
  });
});
