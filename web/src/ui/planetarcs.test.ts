/**
 * Pure geometry of the planet up-arcs: the radial stack and where the
 * rise-end label lands. Canvas drawing is left to the eye.
 */
import { describe, expect, it } from "vitest";
import { ARC_OUTER, ARC_STEP, arcRadius, labelHours, labelPlan, ringRadius } from "./planetarcs";

describe("arcRadius", () => {
  it("stacks five arcs strictly inward, all between 0.66R and 0.76R", () => {
    const R = 500;
    const radii = [0, 1, 2, 3, 4].map((i) => arcRadius(i, R));
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeLessThan(radii[i - 1] as number);
    }
    for (const r of radii) {
      expect(r).toBeGreaterThanOrEqual(0.66 * R);
      expect(r).toBeLessThanOrEqual(0.76 * R);
    }
  });
  it("starts at ARC_OUTER and steps by ARC_STEP", () => {
    expect(arcRadius(0, 1)).toBeCloseTo(ARC_OUTER, 12);
    expect(arcRadius(1, 1)).toBeCloseTo(ARC_OUTER - ARC_STEP, 12);
    expect(arcRadius(4, 1)).toBeCloseTo(0.672, 12);
  });
});

describe("labelHours", () => {
  it("is null when the arc spans less than 2.5 hours", () => {
    expect(labelHours(10, 12)).toBeNull();
    expect(labelHours(10, 12.49)).toBeNull();
    expect(labelHours(23, 1)).toBeNull(); // 2h across midnight
  });
  it("leads by 1.6h on a long arc", () => {
    expect(labelHours(6, 18)).toBeCloseTo(7.6, 12);
  });
  it("leads by 18% of the span on a short arc", () => {
    // span 4h -> 0.72h < 1.6h
    expect(labelHours(10, 14)).toBeCloseTo(10.72, 12);
    // exactly 2.5h is allowed: lead 0.45h
    expect(labelHours(10, 12.5)).toBeCloseTo(10.45, 12);
  });
  it("wraps across midnight into [0, 24)", () => {
    // rise 23:00, set 05:00 -> span 6h, lead min(1.6, 1.08) = 1.08 -> 00:04.8
    expect(labelHours(23, 5)).toBeCloseTo(0.08, 12);
    // rise 22:00, set 09:00 -> span 11h, lead 1.6 -> 23.6, no wrap needed
    expect(labelHours(22, 9)).toBeCloseTo(23.6, 12);
    // rise 23:30, set 12:00 -> lead 1.6 -> 25.1 wraps to 1.1
    const v = labelHours(23.5, 12);
    expect(v).not.toBeNull();
    expect(v as number).toBeCloseTo(1.1, 12);
    expect(v as number).toBeGreaterThanOrEqual(0);
    expect(v as number).toBeLessThan(24);
  });
});

describe("labelPlan", () => {
  it("pushes a second label along its arc when two planets rise together", () => {
    const plan = labelPlan([
      { name: "Mercury", riseHours: 6, setHours: 18, transitHours: null },
      { name: "Venus", riseHours: 6.2, setHours: 19, transitHours: null },
    ]);
    const [a, b] = plan as [number, number];
    expect(Math.abs(b - a)).toBeGreaterThanOrEqual(1.5);
    expect(b).toBeLessThan(19);
  });
  it("leaves separated labels where they were", () => {
    const plan = labelPlan([
      { name: "Mars", riseHours: 2, setHours: 14, transitHours: null },
      { name: "Saturn", riseHours: 20, setHours: 6, transitHours: null },
    ]);
    expect(plan[0]).toBe(labelHours(2, 14));
    expect(plan[1]).toBe(labelHours(20, 6));
  });
});

describe("ringRadius", () => {
  it("stacks the spheres outward from the Earth: Mercury in, Saturn out", () => {
    const R = 500;
    const order = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"].map((n) => ringRadius(n, R));
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1] as number);
    expect(ringRadius("Saturn", R)).toBeCloseTo(ARC_OUTER * R, 9);
    expect(ringRadius("Mercury", R)).toBeCloseTo((ARC_OUTER - 4 * ARC_STEP) * R, 9);
  });
  it("keeps a planet's ring when its neighbours are absent", () => {
    expect(ringRadius("Jupiter", 500)).toBe(arcRadius(1, 500));
  });
});
