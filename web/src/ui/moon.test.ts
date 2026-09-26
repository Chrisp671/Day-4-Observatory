/**
 * CHK-002 — moon dial positioning conventions, and the terminator the disc draws.
 */
import { describe, expect, it } from "vitest";
import { terminatorHalfWidth, moonDialHours } from "./moon";

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

describe("the terminator the disc draws", () => {
  it("closes to nothing at full moon, and opens to the full radius at new", () => {
    // The lit shape is a semicircle plus a half-ellipse of this semi-axis, so
    // a terminator of 0 leaves the whole half lit and one of r leaves none.
    expect(terminatorHalfWidth(1)).toBeCloseTo(1, 12);
    expect(terminatorHalfWidth(0)).toBeCloseTo(1, 12);
    expect(terminatorHalfWidth(0.5)).toBeCloseTo(0, 12);
  });

  it("is a straight edge at the quarters, and a curve everywhere else", () => {
    expect(terminatorHalfWidth(0.25)).toBeGreaterThan(0);
    expect(terminatorHalfWidth(0.75)).toBeGreaterThan(0);
  });

  it("narrows steadily as the moon fills, from new to full", () => {
    let previous = Infinity;
    for (let i = 1; i <= 250; i++) {
      const f = i / 500; // 0.002 .. 0.5, landing exactly on the full moon
      const width = terminatorHalfWidth(f);
      expect(width).toBeLessThan(previous);
      previous = width;
    }
    expect(previous).toBeCloseTo(0, 12);
  });

  it("reads the same from the far side of full, because a full moon is one shape", () => {
    expect(terminatorHalfWidth(0.5)).toBeCloseTo(terminatorHalfWidth(0.5), 12);
    for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(terminatorHalfWidth(f)).toBeCloseTo(terminatorHalfWidth(1 - f), 12);
    }
  });

  it("stays within the disc, so the terminator can never overshoot it", () => {
    for (let f = 0; f <= 1; f += 0.01) {
      expect(terminatorHalfWidth(f)).toBeLessThanOrEqual(1);
    }
  });
});
