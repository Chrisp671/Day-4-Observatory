/**
 * CHK-001 (first slice) — engine values against independently-known sky facts.
 * Reference events are public astronomical record (eclipse and phase times,
 * equinox instants, the J2000 sidereal-time epoch), so a wrong sign or a
 * swapped convention in frame() fails loudly here.
 */

import { describe, expect, it } from "vitest";
import { frame } from "./frame";

const NYC = { lat: 40.7128, lon: -74.006 };

describe("moon phase against known events", () => {
  it("is new during the 2024-04-08 total solar eclipse", () => {
    const s = frame(Date.UTC(2024, 3, 8, 18, 21), NYC.lat, NYC.lon);
    expect(s.moon.illuminatedFraction).toBeLessThan(0.01);
    const distFromNew = Math.min(s.moon.phaseAngleDeg, 360 - s.moon.phaseAngleDeg);
    expect(distFromNew).toBeLessThan(5);
    expect(s.moon.ageDays === undefined).toBe(false);
  });

  it("is full at the 2024-04-23 23:49 UTC full moon", () => {
    const s = frame(Date.UTC(2024, 3, 23, 23, 49), NYC.lat, NYC.lon);
    expect(s.moon.illuminatedFraction).toBeGreaterThan(0.99);
    expect(Math.abs(s.moon.phaseAngleDeg - 180)).toBeLessThan(5);
  });

  it("waxes the day before full and wanes the day after", () => {
    const before = frame(Date.UTC(2024, 3, 22, 23, 49), NYC.lat, NYC.lon);
    const after = frame(Date.UTC(2024, 3, 24, 23, 49), NYC.lat, NYC.lon);
    expect(before.moon.waxing).toBe(true);
    expect(after.moon.waxing).toBe(false);
  });
});

describe("sun geometry", () => {
  it("declination ≈ 0 at the 2025 March equinox (2025-03-20 09:01 UTC)", () => {
    const s = frame(Date.UTC(2025, 2, 20, 9, 1), NYC.lat, NYC.lon);
    expect(Math.abs(s.sun.declinationDeg)).toBeLessThan(0.5);
  });

  it("gives ≈12h of daylight in NYC at the equinox", () => {
    // Start before local sunrise (04:00 EDT) so next-rise and next-set bracket one day.
    const s = frame(Date.UTC(2025, 2, 20, 8, 0), NYC.lat, NYC.lon);
    expect(s.sun.nextRiseUnixMillis).not.toBeNull();
    expect(s.sun.nextSetUnixMillis).not.toBeNull();
    const daylightHours =
      ((s.sun.nextSetUnixMillis as number) - (s.sun.nextRiseUnixMillis as number)) / 3.6e6;
    expect(daylightHours).toBeGreaterThan(11.5);
    expect(daylightHours).toBeLessThan(12.5);
  });
});

describe("hour angles", () => {
  const haDistance = (a: number, b: number): number => {
    const d = Math.abs(a - b) % 24;
    return Math.min(d, 24 - d);
  };

  it("sun hour angle ≈ 0 at Greenwich apparent solar noon", () => {
    const s = frame(Date.UTC(2025, 2, 20, 12, 7, 30), 51.48, 0);
    expect(Math.abs(s.sun.hourAngleHours)).toBeLessThan(0.1);
  });

  it("moon and sun hour angles coincide at new moon (2024-04-08 eclipse)", () => {
    const s = frame(Date.UTC(2024, 3, 8, 18, 21), NYC.lat, NYC.lon);
    expect(haDistance(s.sun.hourAngleHours, s.moon.hourAngleHours)).toBeLessThan(0.7);
  });

  it("moon and sun hour angles are ~12h apart at full moon", () => {
    const s = frame(Date.UTC(2024, 3, 23, 23, 49), NYC.lat, NYC.lon);
    expect(Math.abs(haDistance(s.sun.hourAngleHours, s.moon.hourAngleHours) - 12)).toBeLessThan(1);
  });
});

describe("earth / sidereal frame", () => {
  it("GAST ≈ 18.697h at the J2000 epoch (2000-01-01 12:00 UTC)", () => {
    const s = frame(Date.UTC(2000, 0, 1, 12), 0, 0);
    expect(Math.abs(s.siderealHours - 18.697)).toBeLessThan(0.05);
  });

  it("subsolar longitude ≈ Greenwich at UTC solar noon", () => {
    // 2025-03-20: equation of time ≈ -7.5 min → solar noon at Greenwich ≈ 12:07 UTC.
    const s = frame(Date.UTC(2025, 2, 20, 12, 7, 30), 51.48, 0);
    expect(Math.abs(s.earth.subsolarLonDeg)).toBeLessThan(2.5);
    expect(Math.abs(s.earth.subsolarLatDeg)).toBeLessThan(0.5);
  });
});

describe("smoke", () => {
  it("returns finite numbers across a spread of times and places", () => {
    const times = [
      Date.UTC(1990, 6, 1, 3, 0),
      Date.UTC(2026, 7, 11, 17, 30),
      Date.UTC(2050, 11, 25, 0, 0),
    ];
    const places = [
      { lat: 40.7, lon: -74.0 },
      { lat: -33.9, lon: 151.2 },
      { lat: 64.1, lon: -21.9 },
    ];
    for (const t of times) {
      for (const p of places) {
        const s = frame(t, p.lat, p.lon);
        const nums = [
          s.siderealHours,
          s.sun.altitudeDeg, s.sun.azimuthDeg, s.sun.declinationDeg,
          s.moon.phaseAngleDeg, s.moon.ageDays, s.moon.illuminatedFraction,
          s.moon.altitudeDeg, s.moon.azimuthDeg,
          s.earth.subsolarLatDeg, s.earth.subsolarLonDeg,
        ];
        for (const n of nums) expect(Number.isFinite(n)).toBe(true);
        expect(s.moon.illuminatedFraction).toBeGreaterThanOrEqual(0);
        expect(s.moon.illuminatedFraction).toBeLessThanOrEqual(1);
        expect(s.earth.subsolarLonDeg).toBeGreaterThanOrEqual(-180);
        expect(s.earth.subsolarLonDeg).toBeLessThan(180);
      }
    }
  });
});
