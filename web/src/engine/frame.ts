/**
 * SEAM-001 — the single engine/UI boundary (see PLAN.md §8).
 *
 * One coarse call per animation frame: `frame(unixMillis, lat, lon)` returns
 * every number the views need. Views never call astronomy APIs directly.
 * This module is the swap contract for a future Rust/WASM engine (DEC-002):
 * any replacement must produce the same FrameState from the same inputs.
 *
 * Currently backed by astronomy-engine (MIT, ~1 arcminute accuracy — ASM-001).
 */

import {
  Body,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  SearchRiseSet,
  SiderealTime,
} from "astronomy-engine";

/** Mean length of a lunation in days (used for display-grade moon age). */
export const SYNODIC_MONTH_DAYS = 29.530588853;

export interface SunState {
  /** Degrees above the horizon (negative = below). Refraction-corrected. */
  readonly altitudeDeg: number;
  /** Compass azimuth in degrees (0 = north, 90 = east). */
  readonly azimuthDeg: number;
  /** Declination in degrees; drives the terminator's seasonal tilt. */
  readonly declinationDeg: number;
  /**
   * Local hour angle in hours, [-12, 12): 0 = transiting (due south / dial
   * top), negative = east of the meridian (before transit).
   */
  readonly hourAngleHours: number;
  /** Next sunrise after `unixMillis`, or null in polar day/night. */
  readonly nextRiseUnixMillis: number | null;
  /** Next sunset after `unixMillis`, or null in polar day/night. */
  readonly nextSetUnixMillis: number | null;
  /**
   * The sunrise and sunset that bracket one whole daylight period: today's if
   * the sun is up, otherwise the coming day's. Scripture counts hours from
   * sunrise, so anything reckoned that way needs a matched pair, not two
   * "next" events that may belong to different days.
   */
  readonly dayRiseUnixMillis: number | null;
  readonly daySetUnixMillis: number | null;
}

export interface MoonState {
  /** Ecliptic phase angle in degrees: 0 = new, 90 = first quarter, 180 = full. */
  readonly phaseAngleDeg: number;
  /** Days since new moon (display-grade: mean synodic month). */
  readonly ageDays: number;
  /** Fraction of the disc illuminated, 0..1. */
  readonly illuminatedFraction: number;
  /** True from new toward full (light grows on the right in the north). */
  readonly waxing: boolean;
  readonly altitudeDeg: number;
  readonly azimuthDeg: number;
  /** Local hour angle in hours, [-12, 12); same convention as SunState. */
  readonly hourAngleHours: number;
}

export interface EarthState {
  /** Latitude where the sun is at zenith (= solar declination). */
  readonly subsolarLatDeg: number;
  /** Longitude where the sun is at zenith, east-positive, [-180, 180). */
  readonly subsolarLonDeg: number;
}

export interface FrameState {
  readonly unixMillis: number;
  /** Greenwich apparent sidereal time in hours; drives the sidereal ring. */
  readonly siderealHours: number;
  readonly sun: SunState;
  readonly moon: MoonState;
  readonly earth: EarthState;
}

const toUnixOrNull = (t: { date: Date } | null): number | null =>
  t === null ? null : t.date.getTime();

/** Normalize degrees into [-180, 180). */
const wrapLon = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;

/** Normalize hours into [-12, 12). */
const wrapHours12 = (h: number): number => ((((h + 12) % 24) + 24) % 24) - 12;

export function frame(
  unixMillis: number,
  latitudeDeg: number,
  longitudeDeg: number,
): FrameState {
  const date = new Date(unixMillis);
  const observer = new Observer(latitudeDeg, longitudeDeg, 0);

  const gastHours = SiderealTime(date);
  // Local apparent sidereal time; a body transits when LST equals its RA.
  const lstHours = gastHours + longitudeDeg / 15;

  const sunEq = Equator(Body.Sun, date, observer, true, true);
  const sunHor = Horizon(date, observer, sunEq.ra, sunEq.dec, "normal");

  const moonEq = Equator(Body.Moon, date, observer, true, true);
  const moonHor = Horizon(date, observer, moonEq.ra, moonEq.dec, "normal");

  const phaseAngleDeg = MoonPhase(date);
  const moonIllum = Illumination(Body.Moon, date);

  const nextRise = toUnixOrNull(SearchRiseSet(Body.Sun, observer, +1, date, 2));
  const nextSet = toUnixOrNull(SearchRiseSet(Body.Sun, observer, -1, date, 2));
  // Sunset due before sunrise means the sun is up now, so the daylight period
  // we are inside began at the most recent sunrise — search backwards for it.
  const daylightNow = nextRise !== null && nextSet !== null && nextSet < nextRise;
  const dayRise = daylightNow
    ? toUnixOrNull(SearchRiseSet(Body.Sun, observer, +1, date, -2))
    : nextRise;
  const daySet = daylightNow ? nextSet : toUnixOrNull(
    nextRise === null ? null : SearchRiseSet(Body.Sun, observer, -1, new Date(nextRise), 2),
  );

  return {
    unixMillis,
    siderealHours: gastHours,
    sun: {
      altitudeDeg: sunHor.altitude,
      azimuthDeg: sunHor.azimuth,
      declinationDeg: sunEq.dec,
      hourAngleHours: wrapHours12(lstHours - sunEq.ra),
      nextRiseUnixMillis: nextRise,
      nextSetUnixMillis: nextSet,
      dayRiseUnixMillis: dayRise,
      daySetUnixMillis: daySet,
    },
    moon: {
      phaseAngleDeg,
      ageDays: (phaseAngleDeg / 360) * SYNODIC_MONTH_DAYS,
      illuminatedFraction: moonIllum.phase_fraction,
      waxing: phaseAngleDeg < 180,
      altitudeDeg: moonHor.altitude,
      azimuthDeg: moonHor.azimuth,
      hourAngleHours: wrapHours12(lstHours - moonEq.ra),
    },
    earth: {
      subsolarLatDeg: sunEq.dec,
      // Subsolar longitude (east+): the sun is at zenith where local sidereal
      // time equals the sun's right ascension → lon = (RA − GAST) * 15°/h.
      subsolarLonDeg: wrapLon((sunEq.ra - gastHours) * 15),
    },
  };
}
