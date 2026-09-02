/**
 * Pure geometry of the rete: the ring order outward from the Sun's band, and
 * the honest-weight rule (how much of an up-window falls in real night).
 * Canvas drawing is left to the eye.
 */
import { describe, expect, it } from "vitest";
import {
  nightOverlapHours, RETE_OUTER, RING_BASE, RING_ORDER, RING_STEP, ringRadius,
} from "./planetarcs";

describe("ringRadius", () => {
  it("steps outward from the Sun's band: Mercury nearest, Saturn farthest", () => {
    const R = 500;
    const radii = RING_ORDER.map((n) => ringRadius(n, R));
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1] as number);
    expect(ringRadius("Mercury", R)).toBeCloseTo(RING_BASE * R, 9);
    expect(ringRadius("Saturn", R)).toBeCloseTo((RING_BASE + 4 * RING_STEP) * R, 9);
  });
  it("keeps every ring outside the band and inside the rete's edge", () => {
    for (const n of RING_ORDER) {
      expect(ringRadius(n, 1)).toBeGreaterThan(1);
      expect(ringRadius(n, 1)).toBeLessThan(RETE_OUTER);
    }
  });
  it("keeps a planet's ring when its neighbours are absent", () => {
    expect(ringRadius("Jupiter", 500)).toBe(500 * (RING_BASE + 3 * RING_STEP));
  });
});

describe("nightOverlapHours", () => {
  const dayRise = 6, daySet = 18; // a twelve-hour day
  it("counts none for a planet up only by day", () => {
    expect(nightOverlapHours(8, 16, dayRise, daySet)).toBeCloseTo(0, 5);
  });
  it("counts the whole window for a planet up only by night", () => {
    expect(nightOverlapHours(20, 4, dayRise, daySet)).toBeCloseTo(8, 0);
  });
  it("counts only the dark part of a window that straddles sunset", () => {
    expect(nightOverlapHours(14, 22, dayRise, daySet)).toBeCloseTo(4, 0);
  });
  it("treats polar night as all night and polar day as none", () => {
    expect(nightOverlapHours(10, 20, null, null)).toBeCloseTo(10, 5);
    expect(nightOverlapHours(10, 20, null, 18)).toBe(0);
  });
});
