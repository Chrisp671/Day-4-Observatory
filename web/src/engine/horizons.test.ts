/**
 * CHK-001 — the engine against NASA/JPL Horizons.
 *
 * 3 locations x 4 dates, pinned in `horizons-reference.ts` by
 * `scripts/build-horizons-fixture.mjs`. Regenerate that file to move the
 * reference; change a tolerance only on evidence, and say why in the comment
 * beside it. Each figure in brackets is the worst residual actually measured
 * across all twelve cases when the fixture was built (`--measure`), so the
 * margins below are known rather than hopeful.
 *
 * What is compared, and why the comparison is shaped the way it is:
 *
 * - RA/Dec, azimuth: the engine's positions against JPL's topocentric apparent
 *   values. Azimuth is unaffected by refraction, so it is a direct test.
 * - Altitude: Horizons reports AIRLESS elevation; the engine's `Horizon(...,
 *   "normal")` returns airless plus `Refraction("normal", airless)`, and that
 *   function is exported. So the test applies the engine's declared refraction
 *   model to JPL's airless value and compares altitude directly, to the same
 *   0.01 deg as everything else. JPL validates the geometry; the refraction
 *   model is a documented choice JPL cannot validate, and it is applied to
 *   JPL's number, never to the engine's.
 * - Moon phase: SIGNED. `MoonPhase` is the moon's geocentric ecliptic-of-date
 *   longitude minus the sun's, and JPL's `ObsEcLon` is that longitude for each
 *   body, so the difference is compared as-is, modulo 360. The sign matters:
 *   `waxing`, the phase name, the moon's age and the lit side of the disc all
 *   hang on it, and an unsigned comparison (against the S-T-O phase angle, say)
 *   would pass a flipped sign. The waxing flag is asserted from JPL's sign too.
 * - Illuminated fraction: compared directly. It is what the disc is drawn
 *   from, and it is well conditioned at conjunction, where the angle is not.
 * - Subsolar point: the fixture derives it from JPL's own sun azimuth and
 *   altitude with no Earth-rotation value involved, so this tests the engine's
 *   GAST arithmetic rather than restating it. (The RA tests below recover RA
 *   from the hour angle using the engine's own sidereal time, so GAST cancels
 *   there; this is the test that pins it.)
 * - Rise and set: the engine's reported instant against JPL's own crossing of
 *   the upper-limb horizon, interpolated from a one-minute JPL grid. The
 *   fixture also carries JPL's altitude at the instant the engine reported
 *   when the fixture was built; that is a self-consistency check on the
 *   fixture (see the reference-data block), not a live check on the engine,
 *   because the engine's instant is not re-queried at test time.
 */

import { describe, expect, it } from "vitest";
import { Refraction } from "astronomy-engine";
import { frame } from "./frame";
import { moonDay } from "./planets";
import { HORIZONS_REFERENCE, type HorizonEvent } from "./horizons-reference";

// The moon's day-anchored rise and set are sought from local midnight, and the
// generator pinned TZ=UTC before it asked. Pin it here too, at import time so it
// is in force for every assertion below. `process` is reached through a cast
// because the app's tsconfig deliberately carries no Node types.
const nodeProcess = (globalThis as { process?: { env: Record<string, string | undefined> } }).process;
if (!nodeProcess) throw new Error("no process.env in this runtime; TZ cannot be pinned for CHK-001");
nodeProcess.env.TZ = "UTC";

/** Angles, degrees. Worst measured residual in brackets. */
const RA_TOL = 0.01; //            [0.0012]
const DEC_TOL = 0.01; //           [0.0007]
const AZIMUTH_TOL = 0.01; //       [0.0014]
const ALTITUDE_TOL = 0.01; //      [0.0014] against JPL airless + Refraction("normal")
/**
 * Signed, modulo 360. 0.0057 of the residual is the sun's annual aberration
 * (20.5 arcsec), which JPL's apparent longitude includes and `MoonPhase` does
 * not; for the moon, light-time and aberration cancel to an arcsecond because
 * it shares the Earth's heliocentric velocity, so only the sun's shows. That is
 * 40 seconds of lunation, and the rest is arcseconds of lunar theory.
 */
const PHASE_TOL = 0.02; //         [0.0055]
const ILLUMINATION_TOL = 0.0005; // [0.000044]
const SUBSOLAR_TOL = 0.01; //      [0.0006]
/** Rise/set: the time itself, in minutes. A quarter of the display resolution. */
const EVENT_MINUTES = 0.25; //     [0.012] — under a second
/**
 * Fixture self-consistency: JPL's altitude at the instant recorded when the
 * fixture was built, against the limb rule from JPL's own angular diameter.
 * Both numbers are in the fixture; this does not exercise the engine.
 */
const LIMB_TOL = 0.02; //          [0.0034]

const circularDiff = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

const wrap360 = (deg: number): number => ((deg % 360) + 360) % 360;

/** Right ascension in degrees, recovered from an hour angle: RA = LST - HA. */
const recoveredRaDeg = (gastHours: number, lonDeg: number, hourAngleHours: number): number => {
  const lst = gastHours + lonDeg / 15;
  return (((lst - hourAngleHours) % 24) + 24) % 24 * 15;
};

/** The engine's declared refraction model, applied to JPL's airless altitude. */
const refracted = (airlessDeg: number): number => airlessDeg + Refraction("normal", airlessDeg);

type Case = (typeof HORIZONS_REFERENCE)[number];

const refMillis = (c: Case): number => Date.parse(c.date.refInstantUtc);

/** JPL's signed phase angle: moon longitude minus sun longitude, 0..360. */
const jplPhaseDeg = (c: Case): number =>
  wrap360(c.moon.geocentricEclipticLonDeg - c.sun.geocentricEclipticLonDeg);

const engineEvent = (
  kind: HorizonEvent["kind"],
  state: ReturnType<typeof frame>,
  moon: ReturnType<typeof moonDay>,
): number | null => {
  switch (kind) {
    case "sunrise":
      return state.sun.nextRiseUnixMillis;
    case "sunset":
      return state.sun.nextSetUnixMillis;
    case "moonrise":
      return moon.riseUnixMillis;
    case "moonset":
      return moon.setUnixMillis;
  }
};

describe("CHK-001 reference data", () => {
  it("is the matrix the check calls for: 3 locations x 4 dates", () => {
    expect(HORIZONS_REFERENCE).toHaveLength(12);
    expect(new Set(HORIZONS_REFERENCE.map((c) => c.location.id)).size).toBe(3);
    expect(new Set(HORIZONS_REFERENCE.map((c) => c.date.id)).size).toBe(4);
    // Covers the equinox, both solstices, and a conjunction.
    expect(HORIZONS_REFERENCE.map((c) => c.date.label)).toContain("March equinox");
    expect(HORIZONS_REFERENCE.some((c) => c.date.label.includes("eclipse"))).toBe(true);
    expect(HORIZONS_REFERENCE.some((c) => c.moon.geocentricIlluminatedFraction < 0.01)).toBe(true);
    expect(HORIZONS_REFERENCE.some((c) => c.moon.geocentricIlluminatedFraction > 0.9)).toBe(true);
    // Both sides of the sign are exercised: a waxing case and a waning one.
    expect(HORIZONS_REFERENCE.some((c) => jplPhaseDeg(c) < 180)).toBe(true);
    expect(HORIZONS_REFERENCE.some((c) => jplPhaseDeg(c) > 180)).toBe(true);
  });

  it("was generated with local midnight pinned to UTC, as this file is", () => {
    // If the TZ pin above did not take, this fails by the local offset (hours,
    // in milliseconds) rather than letting the moon tests below compare the
    // engine's day-anchored events against the wrong calendar day.
    expect(new Date(2026, 5, 21, 0, 0, 0, 0).getTime()).toBe(Date.UTC(2026, 5, 21));
  });

  it("pins exactly one absent event, and it is the four-day Reykjavik moon", () => {
    // Reykjavik, December solstice: the moon rises on the 21st with its
    // declination climbing past the circumpolar limit for 64 N, and JPL's own
    // elevation stays above the limb horizon for four days. moonDay() looks two
    // days ahead for the set that follows a rise, so it reports none; the app
    // shows a rise with no set. Pin that it is the only absence in the matrix.
    const absent = HORIZONS_REFERENCE.flatMap((c) =>
      c.events.filter((e) => e.engineUtc === null).map((e) => `${c.id} ${e.kind}`),
    );
    expect(absent).toEqual(["reykjavik@2026-12-21 moonset"]);
  });

  it("carries self-consistent rise/set rows: JPL's altitude at each recorded instant sits on the limb", () => {
    for (const c of HORIZONS_REFERENCE) {
      for (const e of c.events) {
        if (e.engineUtc === null) continue;
        if (e.jplElevationAtEngineDeg === null || e.jplCrossingUtc === null || e.limbHorizonDeg === null) {
          throw new Error(`${c.id} ${e.kind} has an engine instant but no JPL row to compare it with`);
        }
        expect(
          Math.abs(e.jplElevationAtEngineDeg - e.limbHorizonDeg),
          `${c.id} ${e.kind}`,
        ).toBeLessThanOrEqual(LIMB_TOL);
      }
    }
  });
});

describe.each(HORIZONS_REFERENCE.map((c) => [c.id, c] as const))("CHK-001 %s", (_id, c) => {
  const { latDeg, lonDeg } = c.location;
  const state = () => frame(refMillis(c), latDeg, lonDeg);
  const moon = () => moonDay(refMillis(c), latDeg, lonDeg);

  it("puts the sun's declination where JPL puts it", () => {
    expect(Math.abs(state().sun.declinationDeg - c.sun.apparentDecDeg)).toBeLessThanOrEqual(DEC_TOL);
  });

  it("puts the sun's azimuth and altitude where JPL does", () => {
    const s = state();
    expect(circularDiff(s.sun.azimuthDeg, c.sun.topocentricAzDeg)).toBeLessThanOrEqual(AZIMUTH_TOL);
    expect(Math.abs(s.sun.altitudeDeg - refracted(c.sun.topocentricAltDeg))).toBeLessThanOrEqual(ALTITUDE_TOL);
  });

  it("puts the sun's right ascension where JPL puts it", () => {
    // frame() exposes a body's RA only inside its hour angle, so recover it:
    // hourAngle = LST - RA, and LST = GAST + longitude/15.
    const s = state();
    expect(
      circularDiff(recoveredRaDeg(s.siderealHours, lonDeg, s.sun.hourAngleHours), c.sun.apparentRaDeg),
    ).toBeLessThanOrEqual(RA_TOL);
  });

  it("puts the moon's right ascension where JPL puts it", () => {
    const s = state();
    // The moon's declination is not on FrameState, so it is not asserted
    // directly. It does not need to be: right ascension, azimuth and altitude
    // between them fix the moon's position, and all three are asserted to
    // 0.01 deg — the right ascension here, the other two in the next test.
    expect(
      circularDiff(recoveredRaDeg(s.siderealHours, lonDeg, s.moon.hourAngleHours), c.moon.apparentRaDeg),
    ).toBeLessThanOrEqual(RA_TOL);
  });

  it("agrees with JPL on the moon's azimuth, altitude and illumination", () => {
    const s = state();
    expect(circularDiff(s.moon.azimuthDeg, c.moon.topocentricAzDeg)).toBeLessThanOrEqual(AZIMUTH_TOL);
    expect(Math.abs(s.moon.altitudeDeg - refracted(c.moon.topocentricAltDeg))).toBeLessThanOrEqual(ALTITUDE_TOL);
    expect(
      Math.abs(s.moon.illuminatedFraction - c.moon.geocentricIlluminatedFraction),
    ).toBeLessThanOrEqual(ILLUMINATION_TOL);
  });

  it("agrees with JPL on the moon's signed phase angle, and so on which way it is going", () => {
    const s = state();
    const jpl = jplPhaseDeg(c);
    expect(circularDiff(s.moon.phaseAngleDeg, jpl), `engine ${s.moon.phaseAngleDeg} vs JPL ${jpl}`)
      .toBeLessThanOrEqual(PHASE_TOL);
    expect(s.moon.waxing).toBe(jpl < 180);
  });

  it("puts the sun's shadow where JPL's own azimuth and altitude put it", () => {
    const s = state();
    expect(Math.abs(s.earth.subsolarLatDeg - c.subsolar.latDeg)).toBeLessThanOrEqual(SUBSOLAR_TOL);
    expect(circularDiff(s.earth.subsolarLonDeg, c.subsolar.lonDeg)).toBeLessThanOrEqual(SUBSOLAR_TOL);
  });

  it.each(["sunrise", "sunset", "moonrise", "moonset"] as const)(
    "puts %s where JPL's own ephemeris puts it",
    (kind) => {
      const pinned = c.events.find((e) => e.kind === kind);
      if (!pinned) throw new Error(`no pinned ${kind} for ${c.id}`);
      const reported = engineEvent(kind, state(), moon());

      if (pinned.engineUtc === null) {
        // A real absence, pinned as such (see the reference-data block).
        expect(reported, `${c.id} ${kind} should have no event`).toBeNull();
        return;
      }
      if (pinned.jplCrossingUtc === null) {
        throw new Error(`${c.id} ${kind} has an engine instant but no JPL crossing to compare it with`);
      }
      expect(reported, `${c.id} ${kind} should be an event`).not.toBeNull();
      // The engine's live instant against JPL's crossing of the limb horizon.
      const minutes = Math.abs((Date.parse(pinned.jplCrossingUtc) - (reported as number)) / 60000);
      expect(minutes, `${c.id} ${kind} was ${minutes.toFixed(3)} min out`).toBeLessThanOrEqual(EVENT_MINUTES);
    },
  );
});
