/**
 * CHK-002 — the rete's ring sweep, and the weight ladder that makes a ring
 * honest about whether its planet is up in real night (DEC-036).
 *
 * The sweep test is here because the correct behaviour looks like a bug. A
 * planet that rises at 23:58 and sets at 14:22 tomorrow hands the scene a set
 * hour that reads earlier in the day than its rise hour, and the obvious
 * "cleanup" — normalising the end below the start — draws the ring the wrong
 * side of the dial. This file exists so that refactor cannot land unnoticed.
 */
import { describe, expect, it } from "vitest";
import { RING_STROKE, ringSweepHours } from "./planetarcs";

describe("ringSweepHours", () => {
  it("measures a ring that stays inside one day", () => {
    expect(ringSweepHours(6, 20)).toBeCloseTo(14, 10);
    expect(ringSweepHours(20, 6)).toBeCloseTo(10, 10);
  });

  it("measures a ring that crosses midnight, where the set reads earlier than the rise", () => {
    // Rise 23:58, set 14:22 next day: up 14.4 hours, not -9.6.
    expect(ringSweepHours(23.98, 14.37)).toBeCloseTo(14.39, 10);
  });

  it("is the same going round the dial as it is on the clock", () => {
    // The point of the whole thing: a rise/set pair means the same thing
    // whichever hour the dial happens to call midnight.
    expect(ringSweepHours(23.9, 14.2)).toBeCloseTo(ringSweepHours(23.9 - 24, 14.2 - 24), 10);
  });

  it("never returns a negative span, and never more than a full turn", () => {
    for (let rise = 0; rise < 24; rise += 0.5) {
      for (let set = 0; set < 24; set += 0.5) {
        const sweep = ringSweepHours(rise, set);
        expect(sweep).toBeGreaterThanOrEqual(0);
        expect(sweep).toBeLessThan(24);
      }
    }
  });

  it("is zero-length for a body that rises and sets at the same hour", () => {
    expect(ringSweepHours(12, 12)).toBeCloseTo(0, 10);
  });
});

describe("the weight ladder", () => {
  it("has four steps, and only the lit one is a different width", () => {
    expect(Object.keys(RING_STROKE).sort()).toEqual(["bright", "dim", "faint", "lit"]);
    expect(RING_STROKE.lit.width).toBeGreaterThan(RING_STROKE.bright.width);
    for (const key of ["bright", "faint", "dim"] as const) {
      expect(RING_STROKE[key].width).toBe(RING_STROKE.bright.width);
    }
  });

  it("descends in opacity from lit to dim, so weight is readable as value", () => {
    const alphas = [RING_STROKE.lit, RING_STROKE.bright, RING_STROKE.faint, RING_STROKE.dim].map(
      (s) => s.alpha,
    );
    expect(alphas).toEqual([...alphas].sort((a, b) => b - a));
    expect(alphas[0]).toBe(1);
  });

  it("keeps the unlit steps distinguishable from one another", () => {
    // "Faint" and "dim" differing only by a hair would be one step, not two.
    expect(RING_STROKE.faint.alpha).toBeGreaterThan(RING_STROKE.dim.alpha);
  });
});
