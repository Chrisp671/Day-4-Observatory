/**
 * CHK gate for the ground beneath the dial — its presence must follow the
 * sun the way the sky does: absent at night, full by day, rising
 * monotonically and continuously between, with no switch anywhere.
 */
import { describe, expect, it } from "vitest";
import { groundStrength } from "./ground";

describe("groundStrength", () => {
  it("is absent at night and through civil dusk", () => {
    expect(groundStrength(-30)).toBe(0);
    expect(groundStrength(-6)).toBe(0);
  });

  it("is fully present by full day", () => {
    expect(groundStrength(20)).toBe(1);
    expect(groundStrength(45)).toBe(1);
  });

  it("rises strictly with altitude from civil dusk to full day", () => {
    const alts = [-6, -2, 4, 10, 16, 20];
    const s = alts.map(groundStrength);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1] as number);
  });

  it("is continuous — no visible jump at either edge", () => {
    expect(Math.abs(groundStrength(20.1) - groundStrength(19.9))).toBeLessThan(0.05);
    expect(Math.abs(groundStrength(-5.9) - groundStrength(-6.1))).toBeLessThan(0.05);
  });

  it("is half present at the midpoint", () => {
    expect(groundStrength(7)).toBeCloseTo(0.5, 2);
  });
});
