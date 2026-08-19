import { describe, expect, it } from "vitest";
import {
  addDays,
  appointedTimes,
  daysUntil,
  gregorianEaster,
  nextAppointed,
} from "./computus";

/** Published Easter Sundays — the check that matters. */
const KNOWN: ReadonlyArray<readonly [number, number, number]> = [
  [2020, 4, 12], [2021, 4, 4], [2022, 4, 17], [2023, 4, 9], [2024, 3, 31],
  [2025, 4, 20], [2026, 4, 5], [2027, 3, 28], [2028, 4, 16], [2029, 4, 1],
  [2030, 4, 21], [2031, 4, 13], [2032, 3, 28], [2033, 4, 17], [2038, 4, 25],
];

describe("gregorianEaster", () => {
  it("matches the published dates", () => {
    for (const [year, month, day] of KNOWN) {
      expect(gregorianEaster(year)).toEqual({ year, month, day });
    }
  });

  it("never falls outside 22 March to 25 April — the canonical bounds", () => {
    for (let y = 1900; y <= 2200; y++) {
      const e = gregorianEaster(y);
      const ord = e.month === 3 ? e.day : 31 + e.day;
      expect(ord).toBeGreaterThanOrEqual(22);   // 22 March
      expect(ord).toBeLessThanOrEqual(31 + 25); // 25 April
    }
  });

  it("always lands on a Sunday", () => {
    for (let y = 1900; y <= 2200; y++) {
      const e = gregorianEaster(y);
      expect(new Date(e.year, e.month - 1, e.day).getDay()).toBe(0);
    }
  });
});

describe("addDays", () => {
  it("rolls backwards across a month and a year boundary", () => {
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(addDays({ year: 2026, month: 1, day: 1 }, -1)).toEqual({ year: 2025, month: 12, day: 31 });
  });

  it("knows a leap year", () => {
    expect(addDays({ year: 2024, month: 2, day: 28 }, 1)).toEqual({ year: 2024, month: 2, day: 29 });
  });
});

describe("appointedTimes", () => {
  it("puts Good Friday two days before Easter, on a Friday", () => {
    const friday = appointedTimes(2026).find((a) => a.name === "Good Friday");
    expect(friday?.date).toEqual({ year: 2026, month: 4, day: 3 });
    expect(new Date(friday?.unixMillis ?? 0).getDay()).toBe(5);
  });

  it("keeps the feasts in calendar order", () => {
    for (const year of [2024, 2026, 2031]) {
      const times = appointedTimes(year);
      for (let i = 1; i < times.length; i++) {
        expect(times[i]?.unixMillis).toBeGreaterThan(times[i - 1]?.unixMillis as number);
      }
    }
  });

  it("sets Pentecost fifty days from Easter, on a Sunday", () => {
    const p = appointedTimes(2026).find((a) => a.name === "Pentecost");
    expect(new Date(p?.unixMillis ?? 0).getDay()).toBe(0);
  });
});

describe("nextAppointed", () => {
  it("finds the next feast later the same year", () => {
    const t = new Date(2026, 0, 15).getTime(); // mid-January 2026
    expect(nextAppointed(t).name).toBe("Ash Wednesday");
  });

  it("rolls into next year once this year's are spent", () => {
    const t = new Date(2026, 10, 1).getTime(); // November 2026
    const next = nextAppointed(t);
    expect(next.date.year).toBe(2027);
    expect(next.name).toBe("Ash Wednesday");
  });

  it("always returns a feast still ahead", () => {
    for (const t of [new Date(2026, 3, 4).getTime(), new Date(2026, 7, 19).getTime()]) {
      expect(nextAppointed(t).unixMillis).toBeGreaterThan(t);
    }
  });
});

describe("daysUntil", () => {
  it("counts calendar days, not elapsed hours", () => {
    const feast = appointedTimes(2026).find((a) => a.name === "Easter");
    // Late on 4 April is still one day before 5 April.
    const eve = new Date(2026, 3, 4, 23, 30).getTime();
    expect(daysUntil(eve, feast as never)).toBe(1);
  });

  it("is zero on the day itself", () => {
    const feast = appointedTimes(2026).find((a) => a.name === "Easter");
    expect(daysUntil(new Date(2026, 3, 5, 9, 0).getTime(), feast as never)).toBe(0);
  });
});
