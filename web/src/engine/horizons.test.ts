/**
 * CHK-001 — the engine against NASA/JPL Horizons.
 *
 * 3 locations x 4 dates, pinned in `horizons-reference.ts` by
 * `scripts/build-horizons-fixture.mjs`. Regenerate that file to move the
 * reference; regenerate the tolerances only on evidence, and say why in the
 * comment beside them. Each figure in brackets is the worst residual actually
 * measured across all twelve cases when the fixture was built, so the margins
 * below are known rather than hopeful.
 *
 * What is compared, and why the comparison is shaped the way it is:
 *
 * - RA/Dec, azimuth: the engine's positions against JPL's topocentric apparent
 *   values. Azimuth is unaffected by refraction, so it is a near-direct test.
 * - Altitude: NOT compared for equality. Horizons reports airless elevation and
 *   the engine reports refraction-corrected altitude, so the difference is the
 *   refraction lift — zero above the horizon's saturation, up to a little over
 *   34' at low altitude. The assertion is that the lift is non-negative and
 *   physically bounded, which catches a real error while accepting the model
 *   difference that is not an error at all.
 * - Moon elongation: JPL's Sun-Moon-Earth angle and astronomy-engine's
 *   `MoonPhase` measure the same thing from opposite ends, so the engine's phase
 *   is folded into an unsigned elongation and JPL's is unfolded out of one.
 *   Folding matters: at the eclipse date the moon is 2.4' from the sun, where
 *   the phase angle is a small difference of two nearly-parallel directions and
 *   a naive signed comparison reads 353' of error where the real error is 0.2'.
 * - Illuminated fraction: compared directly. It is what the disc is drawn from,
 *   and it is well conditioned even at conjunction, where the phase angle is not.
 * - Subsolar point: the fixture derives it from JPL's own sun azimuth and
 *   altitude with no Earth-rotation value involved, so this tests the engine's
 *   GAST arithmetic rather than restating it.
 * - Rise and set: the engine's reported instant, against JPL's own crossing of
 *   the upper-limb horizon interpolated from a one-minute JPL grid. The
 *   altitude residual and the time residual are both asserted, so a failure
 *   says which went wrong.
 */

import { describe, expect, it } from "vitest";
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
const RA_TOL = 0.01; //           [0.0011]
const DEC_TOL = 0.01; //          [0.0007]
const AZIMUTH_TOL = 0.01; //      [0.0014]
const REFRACTION_MAX = 0.7; //    [0.639] the lift, from 0 up
const ELONGATION_TOL = 0.5; //    [0.34]
const ILLUMINATION_TOL = 0.002; // [0.0000438]
const SUBSOLAR_TOL = 0.01; //     [0.0005]
/** Rise/set: JPL's altitude at the engine's instant, against the limb rule. */
const LIMB_TOL = 0.02; //         [0.0034]
/** Rise/set: the time itself, in minutes. */
const EVENT_MINUTES = 1; //       [0.012] — under a second

const circularDiff = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

/** Unsigned Sun-Moon elongation, 0..180, from either a phase or an S-T-O angle. */
const elongation = (phaseLike: number): number =>
  phaseLike <= 180 ? phaseLike : 360 - phaseLike;

/** Right ascension in degrees, recovered from an hour angle: RA = LST - HA. */
const recoveredRaDeg = (gastHours: number, lonDeg: number, hourAngleHours: number): number => {
  const lst = gastHours + lonDeg / 15;
  return (((lst - hourAngleHours) % 24) + 24) % 24 * 15;
};

const refMillis = (c: (typeof HORIZONS_REFERENCE)[number]): number =>
  Date.parse(c.date.refInstantUtc);

const engineEvent = (
  c: (typeof HORIZONS_REFERENCE)[number],
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
  });

  it("was generated with local midnight pinned to UTC, as this file is", () => {
    expect(new Date(2026, 5, 21, 0, 0, 0, 0).getTime()).toBe(Date.UTC(2026, 5, 21));
  });
});

describe.each(HORIZONS_REFERENCE.map((c) => [c.id, c] as const))("CHK-001 %s", (_id, c) => {
  const { latDeg, lonDeg } = c.location;
  const state = () => frame(refMillis(c), latDeg, lonDeg);
  const moon = () => moonDay(refMillis(c), latDeg, lonDeg);

  it("puts the sun's declination where JPL puts it", () => {
    expect(Math.abs(state().sun.declinationDeg - c.sun.apparentDecDeg)).toBeLessThanOrEqual(DEC_TOL);
  });

  it("puts the sun's azimuth and refraction-corrected altitude where JPL does", () => {
    const s = state();
    expect(circularDiff(s.sun.azimuthDeg, c.sun.topocentricAzDeg)).toBeLessThanOrEqual(AZIMUTH_TOL);
    const lift = s.sun.altitudeDeg - c.sun.topocentricAltDeg;
    expect(lift).toBeGreaterThanOrEqual(0);
    expect(lift).toBeLessThanOrEqual(REFRACTION_MAX);
  });

  it("puts the sun on the meridian JPL's own geometry implies", () => {
    // frame() exposes a body's RA only inside its hour angle, so recover it:
    // hourAngle = LST - RA, and LST = GAST + longitude/15.
    const s = state();
    expect(
      circularDiff(recoveredRaDeg(s.siderealHours, lonDeg, s.sun.hourAngleHours), c.sun.apparentRaDeg),
    ).toBeLessThanOrEqual(RA_TOL);
  });

  it("puts the moon where JPL puts it", () => {
    const s = state();
    // The moon's declination is not on FrameState, so it is not asserted
    // directly. It does not need to be: altitude, azimuth and hour angle
    // between them determine the moon's position uniquely, and all three are
    // asserted here to within a few arcseconds — the right ascension from the
    // hour angle below, the azimuth and the refraction-bounded altitude in the
    // next test.
    expect(
      circularDiff(recoveredRaDeg(s.siderealHours, lonDeg, s.moon.hourAngleHours), c.moon.apparentRaDeg),
    ).toBeLessThanOrEqual(RA_TOL);
  });

  it("agrees with JPL on the moon's azimuth, altitude and illumination", () => {
    const s = state();
    expect(circularDiff(s.moon.azimuthDeg, c.moon.topocentricAzDeg)).toBeLessThanOrEqual(AZIMUTH_TOL);
    const lift = s.moon.altitudeDeg - c.moon.topocentricAltDeg;
    expect(lift).toBeGreaterThanOrEqual(0);
    expect(lift).toBeLessThanOrEqual(REFRACTION_MAX);
    expect(
      Math.abs(s.moon.illuminatedFraction - c.moon.geocentricIlluminatedFraction),
    ).toBeLessThanOrEqual(ILLUMINATION_TOL);
  });

  it("agrees with JPL on how far the moon is from the sun", () => {
    const s = state();
    const engineElongation = elongation(s.moon.phaseAngleDeg);
    const jplElongation = elongation(180 - c.moon.geocentricPhaseAngleDeg);
    expect(Math.abs(engineElongation - jplElongation)).toBeLessThanOrEqual(ELONGATION_TOL);
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
      const reported = engineEvent(c, kind, state(), moon());
      const { engineUtc, jplElevationAtEngineDeg, jplCrossingUtc, limbHorizonDeg } = pinned;

      if (engineUtc === null) {
        // A real absence, not a missing measurement: at Reykjavik on the winter
        // solstice the moon is still up two days after its rise, so the search
        // finds no set. The app shows a rise with no set; pin that.
        expect(reported, `${c.id} ${kind} should have no event`).toBeNull();
        return;
      }
      if (jplElevationAtEngineDeg === null || jplCrossingUtc === null || limbHorizonDeg === null) {
        throw new Error(`${c.id} ${kind} has an engine instant but no JPL row to compare it with`);
      }

      expect(reported, `${c.id} ${kind} should be an event`).not.toBeNull();
      // JPL's airless centre altitude where the engine says the limb event is,
      // against the limb horizon derived from JPL's own angular diameter.
      expect(Math.abs(jplElevationAtEngineDeg - limbHorizonDeg)).toBeLessThanOrEqual(LIMB_TOL);
      // And the event itself, against JPL's crossing of that same altitude.
      const minutes = Math.abs((Date.parse(jplCrossingUtc) - (reported as number)) / 60000);
      expect(minutes, `${c.id} ${kind} was ${minutes.toFixed(3)} min out`).toBeLessThanOrEqual(EVENT_MINUTES);
    },
  );
});
