/**
 * CHK-002 — moon dial positioning conventions.
 */
import { describe, expect, it } from "vitest";
import { moonDialHours } from "./moon";

describe("moonDialHours", () => {
  it("coincides with the sun at new moon (equal hour angles)", () => {
    expect(moonDialHours(15, 3.2, 3.2)).toBeCloseTo(15, 10);
  });
  it("sits opposite the sun at full moon (hour angles 12h apart)", () => {
    expect(moonDialHours(15, 3, -9)).toBeCloseTo(3, 10);
  });
  it("trails the sun clockwise while waxing (transits after the sun)", () => {
    // First quarter: moon transits ~6h after the sun → 6h later on the dial.
    expect(moonDialHours(12, 0, -6)).toBeCloseTo(18, 10);
  });
  it("wraps into [0, 24)", () => {
    const h = moonDialHours(23, 0, -3);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(24);
    expect(h).toBeCloseTo(2, 10);
  });
});
