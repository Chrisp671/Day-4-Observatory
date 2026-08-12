/**
 * CHK-002 seed — the dial's angle conventions, pinned so no future port or
 * refactor can silently mirror or rotate the instrument (RSK-001).
 */
import { describe, expect, it } from "vitest";
import { hourToAngle, localHoursOfDay, pointOnCircle } from "./clockface";

const at = (h: number) => pointOnCircle(hourToAngle(h), 1);

describe("dial convention: noon top, midnight bottom, clockwise", () => {
  it("puts 12:00 at the top (y negative in canvas space)", () => {
    expect(at(12).y).toBeCloseTo(-1, 10);
    expect(at(12).x).toBeCloseTo(0, 10);
  });
  it("puts 00:00 at the bottom", () => {
    expect(at(0).y).toBeCloseTo(1, 10);
  });
  it("puts 06:00 on the left and 18:00 on the right", () => {
    expect(at(6).x).toBeCloseTo(-1, 10);
    expect(at(18).x).toBeCloseTo(1, 10);
  });
  it("advances clockwise: 13:00 is right of 12:00", () => {
    expect(at(13).x).toBeGreaterThan(0);
    expect(at(13).y).toBeLessThan(0);
  });
});

describe("localHoursOfDay", () => {
  it("is within [0, 24) and consistent with Date's local fields", () => {
    const now = Date.now();
    const h = localHoursOfDay(now);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(24);
    expect(Math.floor(h)).toBe(new Date(now).getHours());
  });
});
