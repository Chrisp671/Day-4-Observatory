/**
 * The wandering stars — the naked-eye planets, and the moon's day.
 *
 * The club's planning questions, verbatim from the Parker walkthrough
 * (DEC-031): "when will I be able to see Saturn?" and "when does the moon
 * rise and set — held steady for the day I am looking at?" This module
 * answers both from real ephemeris, behind the engine seam like frame().
 *
 * Callers cache: rise/set searches are not free, and these numbers change
 * meaningfully by the minute, not by the second.
 */
import { Body, Equator, Horizon, Observer, SearchHourAngle, SearchRiseSet } from "astronomy-engine";

export const PLANETS: ReadonlyArray<readonly [string, Body]> = [
  ["Mercury", Body.Mercury],
  ["Venus", Body.Venus],
  ["Mars", Body.Mars],
  ["Jupiter", Body.Jupiter],
  ["Saturn", Body.Saturn],
];

export interface PlanetTimes {
  readonly name: string;
  /** True when the planet is above the horizon at the asked instant. */
  readonly upNow: boolean;
  /** Next rise/set after the asked instant; null only in pathological cases. */
  readonly riseUnixMillis: number | null;
  readonly setUnixMillis: number | null;
  /** Next transit ("peak") — the best viewing moment Parker plans around. */
  readonly transitUnixMillis: number | null;
  /** Degrees above the horizon right now (negative = below). */
  readonly altitudeDeg: number;
  /** Compass azimuth right now (0 = north, 90 = east). */
  readonly azimuthDeg: number;
}

const toUnixOrNull = (t: { date: Date } | null): number | null =>
  t === null ? null : t.date.getTime();

function timesFor(
  name: string,
  body: Body,
  date: Date,
  observer: Observer,
): PlanetTimes {
  const eq = Equator(body, date, observer, true, true);
  const hor = Horizon(date, observer, eq.ra, eq.dec, "normal");
  const rise = toUnixOrNull(SearchRiseSet(body, observer, +1, date, 2));
  const set = toUnixOrNull(SearchRiseSet(body, observer, -1, date, 2));
  const transit = SearchHourAngle(body, observer, 0, date, +1);
  return {
    name,
    upNow: hor.altitude > 0,
    riseUnixMillis: rise,
    setUnixMillis: set,
    transitUnixMillis: transit === null ? null : transit.time.date.getTime(),
    altitudeDeg: hor.altitude,
    azimuthDeg: hor.azimuth,
  };
}

/** The five naked-eye planets, in ecliptic order out from the sun. */
export function planetBoard(
  unixMillis: number,
  latitudeDeg: number,
  longitudeDeg: number,
): readonly PlanetTimes[] {
  const date = new Date(unixMillis);
  const observer = new Observer(latitudeDeg, longitudeDeg, 0);
  return PLANETS.map(([name, body]) => timesFor(name, body, date, observer));
}

export interface MoonDay {
  /** First moonrise on or after the local midnight of the asked day, or null. */
  readonly riseUnixMillis: number | null;
  /** The set that follows that rise — possibly on the next calendar day. */
  readonly setUnixMillis: number | null;
}

/**
 * The moon's rise and set anchored to a calendar day, so the readout holds
 * steady until the date changes (REQ-008). The moon rises ~50 minutes later
 * each day; roughly once a month a day has no moonrise at all, and the
 * following set often lands on the next date — which is why the caller shows
 * day-of-week labels rather than pretending otherwise.
 */
function bodyDay(
  body: Body,
  unixMillis: number,
  latitudeDeg: number,
  longitudeDeg: number,
): MoonDay {
  const d = new Date(unixMillis);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  const observer = new Observer(latitudeDeg, longitudeDeg, 0);
  const rise = toUnixOrNull(SearchRiseSet(body, observer, +1, midnight, 2));
  if (rise === null || rise >= nextMidnight.getTime()) {
    return { riseUnixMillis: null, setUnixMillis: null };
  }
  const set = toUnixOrNull(SearchRiseSet(body, observer, -1, new Date(rise), 2));
  return { riseUnixMillis: rise, setUnixMillis: set };
}

/**
 * The sun's rise and set anchored to the calendar day — Parker asked for
 * BOTH bodies' timestamps held steady until the date changes.
 */
export function sunDay(
  unixMillis: number,
  latitudeDeg: number,
  longitudeDeg: number,
): MoonDay {
  return bodyDay(Body.Sun, unixMillis, latitudeDeg, longitudeDeg);
}

export interface PlanetDay extends MoonDay {
  readonly name: string;
  /** Transit inside the up-window, for the peak dot; null when not found. */
  readonly transitUnixMillis: number | null;
}

/**
 * Each planet's appearance for the calendar day — rise, following set, and
 * the peak between them — with the same day-anchored semantics as the moon,
 * so the arcs on the dial hold steady until the date changes.
 */
export function planetDays(
  unixMillis: number,
  latitudeDeg: number,
  longitudeDeg: number,
): readonly PlanetDay[] {
  const observer = new Observer(latitudeDeg, longitudeDeg, 0);
  return PLANETS.map(([name, body]) => {
    const day = bodyDay(body, unixMillis, latitudeDeg, longitudeDeg);
    let transit: number | null = null;
    if (day.riseUnixMillis !== null && day.setUnixMillis !== null) {
      const t = SearchHourAngle(body, observer, 0, new Date(day.riseUnixMillis), +1);
      const tu = t === null ? null : t.time.date.getTime();
      transit = tu !== null && tu <= day.setUnixMillis ? tu : null;
    }
    return { name, ...day, transitUnixMillis: transit };
  });
}

export function moonDay(
  unixMillis: number,
  latitudeDeg: number,
  longitudeDeg: number,
): MoonDay {
  return bodyDay(Body.Moon, unixMillis, latitudeDeg, longitudeDeg);
}
