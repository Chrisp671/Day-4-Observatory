/**
 * CHK gate for the atmospheric color script — the palette must move the
 * way the sky moves: monotonically brighter with altitude, stars gone by
 * day, the sun reddest at the horizon, and no discontinuities.
 */
import { describe, expect, it } from "vitest";
import { skyPalette } from "./sky";

const rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
];
const luminance = (h: string): number => {
  const [r, g, b] = rgb(h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("skyPalette", () => {
  it("gets monotonically brighter from night to day", () => {
    const alts = [-30, -12, -3, 4, 12, 45];
    const lums = alts.map((a) => luminance(skyPalette(a).field));
    for (let i = 1; i < lums.length; i++) expect(lums[i]).toBeGreaterThan(lums[i - 1] as number);
  });

  it("shows full stars at night and none in daylight", () => {
    expect(skyPalette(-30).starAlpha).toBe(1);
    expect(skyPalette(-25).starAlpha).toBe(1);
    expect(skyPalette(45).starAlpha).toBe(0);
    const twilight = skyPalette(-3).starAlpha;
    expect(twilight).toBeGreaterThan(0);
    expect(twilight).toBeLessThan(1);
  });

  it("makes the sun reddest at the horizon (Rayleigh), gold at noon", () => {
    const horizon = rgb(skyPalette(0).sunCore);
    const noon = rgb(skyPalette(45).sunCore);
    const warmth = (c: [number, number, number]) => c[0] / Math.max(1, c[1]);
    expect(warmth(horizon)).toBeGreaterThan(warmth(noon));
  });

  it("is continuous — no visible jump across any keyframe", () => {
    for (const edge of [-18, -6, 0, 8, 20]) {
      const below = luminance(skyPalette(edge - 0.05).field);
      const above = luminance(skyPalette(edge + 0.05).field);
      expect(Math.abs(above - below)).toBeLessThan(1.5);
    }
  });

  it("glows at the horizon and nowhere else", () => {
    expect(skyPalette(-30).horizonGlow).toBe(0);
    expect(skyPalette(45).horizonGlow).toBe(0);
    expect(skyPalette(0).horizonGlow).toBeCloseTo(1, 5);
    expect(skyPalette(-6).horizonGlow).toBeGreaterThan(0.3);
    expect(skyPalette(5).horizonGlow).toBeGreaterThan(0.3);
  });

  it("clamps sanely outside the range", () => {
    expect(skyPalette(-90)).toEqual(skyPalette(-18));
    expect(skyPalette(90)).toEqual(skyPalette(20));
  });
});
