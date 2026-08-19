import { describe, expect, it } from "vitest";
import { marchEquinoxUnixMillis, paschalFullMoonUnixMillis } from "./paschal";
import { gregorianEaster, feastUnixMillis } from "../app/computus";

const DAY = 86400000;
const utc = (t: number) => new Date(t);

describe("marchEquinoxUnixMillis", () => {
  it("falls on 19–21 March, as it does in life", () => {
    for (let y = 2020; y <= 2035; y++) {
      const d = utc(marchEquinoxUnixMillis(y));
      expect(d.getUTCMonth()).toBe(2); // March
      expect(d.getUTCDate()).toBeGreaterThanOrEqual(19);
      expect(d.getUTCDate()).toBeLessThanOrEqual(21);
    }
  });
});

describe("paschalFullMoonUnixMillis", () => {
  it("comes after the equinox, never before", () => {
    for (let y = 2020; y <= 2035; y++) {
      const moon = paschalFullMoonUnixMillis(y) as number;
      expect(moon).toBeGreaterThanOrEqual(marchEquinoxUnixMillis(y));
    }
  });

  it("lands inside a lunar month of the equinox", () => {
    for (let y = 2020; y <= 2035; y++) {
      const moon = paschalFullMoonUnixMillis(y) as number;
      const since = (moon - marchEquinoxUnixMillis(y)) / DAY;
      expect(since).toBeLessThan(30);
    }
  });

  it("usually sits within a week before Easter — the sky and the table agree", () => {
    let agreements = 0;
    for (let y = 2020; y <= 2035; y++) {
      const moon = paschalFullMoonUnixMillis(y) as number;
      const easter = feastUnixMillis(gregorianEaster(y));
      const gap = (easter - moon) / DAY;
      if (gap > 0 && gap <= 8) agreements++;
    }
    // Not all years: the ecclesiastical cycle is arithmetic, not observational.
    expect(agreements).toBeGreaterThanOrEqual(13);
  });
});
