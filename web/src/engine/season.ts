/**
 * Planet seasons — "Saturn season: rises before 9 pm from Sep 14".
 *
 * Parker plans star parties by stepping the date forward month by month
 * until a planet "rises at a good time". This module does that stepping for
 * him, one calendar day at a time, and hands back the first day that
 * qualifies so the readout can say it without any tapping.
 *
 * A calendar day D qualifies when the planet's day-anchored rise (the first
 * rise at or after local midnight of D, same semantics as planetDays) lands
 * after local noon and strictly before SEASON_HOUR_LOCAL, and the set that
 * follows keeps it up for at least MIN_UP_HOURS. Evening object, up long
 * enough to be worth setting up a telescope for.
 *
 * Cost: one rise search plus (when the rise is in the window) one set search
 * per day stepped. Callers cache — the answer changes by the day, not by the
 * second.
 */
import { Body, Observer, SearchRiseSet } from "astronomy-engine";
import { PLANETS } from "./planets";

export interface Season {
  /** Local midnight of the first day within the horizon that qualifies, or null if none. */
  readonly fromUnixMillis: number | null;
  /** True when the asked day itself already qualifies. */
  readonly nowInSeason: boolean;
}

/** Rises by 9 pm local. */
export const SEASON_HOUR_LOCAL = 21;
/** How far ahead to look before giving up with null. */
export const SEASON_HORIZON_DAYS = 120;
/** The set must come at least this long after the rise. */
const MIN_UP_HOURS = 4;
const HOUR_MS = 3600_000;

/** The body for a planet name, or null: an unknown name has no season. */
function bodyFor(name: string): Body | null {
  const hit = PLANETS.find(([n]) => n === name);
  return hit === undefined ? null : hit[1];
}

const NO_SEASON: Season = { fromUnixMillis: null, nowInSeason: false };

/** Does calendar day (y, m, d) — local — qualify for this body? */
function qualifies(body: Body, observer: Observer, y: number, m: number, d: number): boolean {
  const midnight = new Date(y, m, d, 0, 0, 0, 0);
  const nextMidnight = new Date(y, m, d + 1, 0, 0, 0, 0).getTime();
  const noon = new Date(y, m, d, 12, 0, 0, 0).getTime();
  const cutoff = new Date(y, m, d, SEASON_HOUR_LOCAL, 0, 0, 0).getTime();

  const rise = SearchRiseSet(body, observer, +1, midnight, 2);
  if (rise === null) return false;
  const riseMs = rise.date.getTime();
  if (riseMs >= nextMidnight) return false; // no rise on D at all
  if (riseMs <= noon || riseMs >= cutoff) return false; // pre-dawn, or too late

  const set = SearchRiseSet(body, observer, -1, rise.date, 2);
  if (set === null) return false;
  return set.date.getTime() - riseMs >= MIN_UP_HOURS * HOUR_MS;
}

/**
 * The first calendar day, from the asked day forward up to horizonDays, on
 * which the named planet rises in the evening window. An unknown planet
 * name has no season: null, never an error.
 */
export function planetSeason(
  name: string,
  unixMillis: number,
  latitudeDeg: number,
  longitudeDeg: number,
  horizonDays: number = SEASON_HORIZON_DAYS,
): Season {
  const body = bodyFor(name);
  if (body === null) return NO_SEASON;
  const observer = new Observer(latitudeDeg, longitudeDeg, 0);
  const asked = new Date(unixMillis);
  const y = asked.getFullYear();
  const m = asked.getMonth();
  const d = asked.getDate();

  for (let i = 0; i <= horizonDays; i++) {
    // Building each day through the Date constructor lets DST shifts fall
    // where the local calendar puts them rather than at a fixed 24 h stride.
    const day = new Date(y, m, d + i, 0, 0, 0, 0);
    if (qualifies(body, observer, day.getFullYear(), day.getMonth(), day.getDate())) {
      return { fromUnixMillis: day.getTime(), nowInSeason: i === 0 };
    }
  }
  return { fromUnixMillis: null, nowInSeason: false };
}
