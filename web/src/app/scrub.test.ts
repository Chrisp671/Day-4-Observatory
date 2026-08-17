/**
 * CHK gate for drag-to-scrub — angle inversion and midnight-crossing wrap,
 * the two places a drag control silently breaks.
 */
import { describe, expect, it } from "vitest";
import { hourToAngle, pointOnCircle } from "../ui/clockface";
import { hitSun, pointToDialHours, shortestHourDelta } from "./scrub";

describe("pointToDialHours inverts hourToAngle", () => {
  it.each([0, 3.5, 6, 12, 17.75, 23.9])("round-trips %s h", (h) => {
    const p = pointOnCircle(hourToAngle(h), 100);
    expect(pointToDialHours(p.x, p.y)).toBeCloseTo(h, 6);
  });
});

describe("shortestHourDelta wraps across midnight", () => {
  it("takes the short way forward over 00", () => {
    expect(shortestHourDelta(23.5, 0.5)).toBeCloseTo(1, 10);
  });
  it("takes the short way backward over 00", () => {
    expect(shortestHourDelta(0.5, 23.5)).toBeCloseTo(-1, 10);
  });
  it("is signed and small for nearby positions", () => {
    expect(shortestHourDelta(12, 12.25)).toBeCloseTo(0.25, 10);
    expect(shortestHourDelta(12.25, 12)).toBeCloseTo(-0.25, 10);
  });
});

describe("hitSun", () => {
  const R = 400;
  it("hits at the sun's exact position and near it", () => {
    const rMid = (R * (0.985 + 0.875)) / 2;
    const p = pointOnCircle(hourToAngle(15), rMid);
    expect(hitSun(p.x, p.y, 15, R)).toBe(true);
    expect(hitSun(p.x + R * 0.05, p.y, 15, R)).toBe(true);
  });
  it("misses far from the sun", () => {
    const rMid = (R * (0.985 + 0.875)) / 2;
    const p = pointOnCircle(hourToAngle(3), rMid);
    expect(hitSun(p.x, p.y, 15, R)).toBe(false);
  });
});
