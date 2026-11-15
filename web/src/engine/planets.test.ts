import { describe, expect, it } from "vitest";
import { moonDay, moonSetOfDay, planetBoard, planetDays, PLANETS, sunDay } from "./planets";

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

describe("moonSetOfDay (REQ-017: the set on a day with no moonrise)", () => {
  /** Every day of a 60-day run, with what the two questions answer for it. */
  const sweep = Array.from({ length: 60 }, (_, i) => {
    const t = T + i * DAY;
    const dayStart = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate()).getTime();
    const nextStart = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate() + 1).getTime();
    return { t, dayStart, nextStart, day: moonDay(t, NYC.lat, NYC.lon), set: moonSetOfDay(t, NYC.lat, NYC.lon) };
  });

  it("is inside the asked calendar day whenever it is a time at all", () => {
    for (const d of sweep) {
      if (d.set === null) continue;
      expect(d.set).toBeGreaterThanOrEqual(d.dayStart);
      expect(d.set).toBeLessThan(d.nextStart);
    }
  });

  it("holds steady across the calendar day, like the rise", () => {
    const morning = moonSetOfDay(new Date(2026, 7, 21, 6, 0).getTime(), NYC.lat, NYC.lon);
    const night = moonSetOfDay(new Date(2026, 7, 21, 23, 30).getTime(), NYC.lat, NYC.lon);
    expect(morning).toBe(night);
  });

  it("finds a moonset on the day with no moonrise: the time the old readout hid", () => {
    const noRise = sweep.filter((d) => d.day.riseUnixMillis === null);
    expect(noRise.length).toBeGreaterThanOrEqual(1);
    for (const d of noRise) {
      // From 40°N the moon that rose late last evening sets in this day.
      expect(d.set, new Date(d.t).toDateString()).not.toBeNull();
    }
  });

  it("is the same instant moonDay pairs with a rise, when that set lands in the day it is asked about", () => {
    // Two routes to one event: the set that follows yesterday's rise, and the
    // first set of today. Where the first falls today, they must agree.
    let compared = 0;
    for (let i = 1; i < sweep.length; i++) {
      const yesterday = sweep[i - 1];
      const today = sweep[i];
      if (yesterday === undefined || today === undefined) continue;
      const paired = yesterday.day.setUnixMillis;
      if (paired === null || paired < today.dayStart || paired >= today.nextStart) continue;
      expect(today.set).not.toBeNull();
      expect(Math.abs((today.set as number) - paired)).toBeLessThan(1000);
      compared++;
    }
    expect(compared).toBeGreaterThan(20);
  });

  it("has a day with no moonset too, about once a month, and says null for it", () => {
    const none = sweep.filter((d) => d.set === null).length;
    expect(none).toBeGreaterThanOrEqual(1);
    expect(none).toBeLessThanOrEqual(3);
  });
});

describe("sunDay", () => {
  it("holds steady across one calendar day, rise before set", () => {
    const morning = sunDay(new Date(2026, 7, 22, 6, 0).getTime(), NYC.lat, NYC.lon);
    const night = sunDay(new Date(2026, 7, 22, 23, 0).getTime(), NYC.lat, NYC.lon);
    expect(morning).toEqual(night);
    expect(morning.riseUnixMillis as number).toBeLessThan(morning.setUnixMillis as number);
  });

  it("keeps both times inside the same summer day at 40°N", () => {
    const d = sunDay(T, NYC.lat, NYC.lon);
    const dayStart = new Date(2026, 7, 21).getTime();
    expect(d.riseUnixMillis as number).toBeGreaterThan(dayStart);
    expect(d.setUnixMillis as number).toBeLessThan(dayStart + DAY);
  });
});

describe("planetDays", () => {
  const days = planetDays(T, NYC.lat, NYC.lon);

  it("holds steady across the calendar day, like the moon", () => {
    const other = planetDays(new Date(2026, 7, 21, 7, 0).getTime(), NYC.lat, NYC.lon);
    expect(days).toEqual(other);
  });

  it("keeps every found peak inside its up-window", () => {
    for (const d of days) {
      if (d.transitUnixMillis === null) continue;
      expect(d.transitUnixMillis).toBeGreaterThan(d.riseUnixMillis as number);
      expect(d.transitUnixMillis).toBeLessThan(d.setUnixMillis as number);
    }
  });

  it("names all five, in order", () => {
    expect(days.map((d) => d.name)).toEqual(PLANETS.map(([n]) => n));
  });
});
