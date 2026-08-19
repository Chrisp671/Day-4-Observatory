import { describe, expect, it } from "vitest";
import { hourOfDay, passionHours, seasonalHourMillis } from "./hours";

const MIN = 60000;
const H = 60 * MIN;
const rise = Date.UTC(2026, 2, 20, 6, 0, 0); // a convenient sunrise
const twelveHourDay = { rise, set: rise + 12 * H };
const fifteenHourDay = { rise, set: rise + 15 * H };
const nineHourDay = { rise, set: rise + 9 * H };

describe("seasonalHourMillis", () => {
  it("is sixty minutes only on a twelve-hour day", () => {
    expect(seasonalHourMillis(twelveHourDay.rise, twelveHourDay.set)).toBe(H);
  });

  it("stretches in summer and shrinks in winter", () => {
    expect(seasonalHourMillis(fifteenHourDay.rise, fifteenHourDay.set)).toBe(75 * MIN);
    expect(seasonalHourMillis(nineHourDay.rise, nineHourDay.set)).toBe(45 * MIN);
  });

  it("is null where the sun does not rise and set", () => {
    expect(seasonalHourMillis(null, rise)).toBeNull();
    expect(seasonalHourMillis(rise, null)).toBeNull();
    expect(seasonalHourMillis(rise, rise)).toBeNull(); // no daylight at all
    expect(seasonalHourMillis(rise, rise - H)).toBeNull(); // set before rise
  });
});

describe("hourOfDay", () => {
  it("puts the sixth hour at solar midday, whatever the season", () => {
    for (const day of [twelveHourDay, fifteenHourDay, nineHourDay]) {
      const midday = day.rise + (day.set - day.rise) / 2;
      expect(hourOfDay(day.rise, day.set, 6)).toBe(midday);
    }
  });

  it("begins the day at sunrise and ends it at sunset", () => {
    expect(hourOfDay(twelveHourDay.rise, twelveHourDay.set, 0)).toBe(twelveHourDay.rise);
    expect(hourOfDay(twelveHourDay.rise, twelveHourDay.set, 12)).toBe(twelveHourDay.set);
  });

  it("is null when there is no day to count", () => {
    expect(hourOfDay(null, null, 6)).toBeNull();
  });
});

describe("passionHours", () => {
  it("runs from the sixth hour to the ninth", () => {
    const p = passionHours(twelveHourDay.rise, twelveHourDay.set);
    expect(p?.fromUnixMillis).toBe(rise + 6 * H); // midday
    expect(p?.toUnixMillis).toBe(rise + 9 * H);
    expect(p?.hourMinutes).toBe(60);
  });

  it("always spans a quarter of the daylight — three hours of twelve", () => {
    for (const day of [twelveHourDay, fifteenHourDay, nineHourDay]) {
      const p = passionHours(day.rise, day.set);
      const daylight = day.set - day.rise;
      expect((p as { fromUnixMillis: number; toUnixMillis: number }).toUnixMillis -
        (p as { fromUnixMillis: number }).fromUnixMillis).toBeCloseTo(daylight / 4, 6);
    }
  });

  it("lengthens with the summer day — the three hours are not three clock hours", () => {
    const summer = passionHours(fifteenHourDay.rise, fifteenHourDay.set);
    expect(summer?.hourMinutes).toBe(75);
    // Sixth to ninth hour spans 3h45m of clock time on a fifteen-hour day.
    expect((summer as { toUnixMillis: number }).toUnixMillis -
      (summer as { fromUnixMillis: number }).fromUnixMillis).toBe(3 * 75 * MIN);
  });

  it("ends before sunset, always", () => {
    for (const day of [twelveHourDay, fifteenHourDay, nineHourDay]) {
      const p = passionHours(day.rise, day.set);
      expect((p as { toUnixMillis: number }).toUnixMillis).toBeLessThan(day.set);
    }
  });

  it("is null in polar day or night", () => {
    expect(passionHours(null, null)).toBeNull();
    expect(passionHours(rise, null)).toBeNull();
  });
});
