/**
 * The appointed times — mo'edim.
 *
 * Genesis 1:14 gives the lights a job: "let them be for signs and for seasons".
 * The word behind "seasons" is *mo'edim* — appointed times, the feasts. The sun
 * and moon were hung, among other things, to fix a calendar of appointments.
 *
 * This module keeps that promise. Easter is still reckoned from the moon: the
 * first Sunday after the paschal full moon, itself the first full moon on or
 * after the vernal equinox. The Church fixed the arithmetic (the computus) so
 * that every congregation would agree on the date without an observatory —
 * this is that arithmetic, the Anonymous Gregorian algorithm, exact for any
 * Gregorian year. The *observed* moon behind it lives in the engine.
 */

/** A date in the Gregorian calendar, at midnight local time. */
export interface FeastDate {
  readonly year: number;
  /** 1–12. */
  readonly month: number;
  /** 1–31. */
  readonly day: number;
}

/**
 * Easter Sunday by the Gregorian computus (Anonymous Gregorian / Meeus).
 * Pure arithmetic — no astronomy — because that is precisely what the Church
 * intended: a date every congregation can compute and agree on.
 */
export function gregorianEaster(year: number): FeastDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

const atMidnight = (d: FeastDate): number =>
  new Date(d.year, d.month - 1, d.day, 0, 0, 0, 0).getTime();

/** Local-midnight instant of a feast date. */
export const feastUnixMillis = atMidnight;

/** Shift a feast date by whole days, rolling months and years correctly. */
export function addDays(d: FeastDate, days: number): FeastDate {
  const t = new Date(d.year, d.month - 1, d.day + days);
  return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() };
}

export interface Appointed {
  readonly name: string;
  readonly date: FeastDate;
  readonly unixMillis: number;
}

/** The moveable feasts of a given year, in calendar order. */
export function appointedTimes(year: number): readonly Appointed[] {
  const easter = gregorianEaster(year);
  const days: ReadonlyArray<readonly [string, number]> = [
    ["Ash Wednesday", -46],
    ["Palm Sunday", -7],
    ["Good Friday", -2],
    ["Easter", 0],
    ["Ascension", 39],
    ["Pentecost", 49],
  ];
  return days.map(([name, offset]) => {
    const date = addDays(easter, offset);
    return { name, date, unixMillis: atMidnight(date) };
  });
}

/**
 * The next appointed time strictly after `unixMillis`, looking into next year
 * when this year's are spent.
 */
export function nextAppointed(unixMillis: number): Appointed {
  const year = new Date(unixMillis).getFullYear();
  for (const y of [year, year + 1]) {
    for (const a of appointedTimes(y)) {
      if (a.unixMillis > unixMillis) return a;
    }
  }
  // Unreachable for real dates; keeps the return type honest.
  return appointedTimes(year + 2)[0] as Appointed;
}

/** Whole days from `unixMillis` to a feast, counted in local calendar days. */
export function daysUntil(unixMillis: number, feast: Appointed): number {
  const now = new Date(unixMillis);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((feast.unixMillis - today) / 86400000);
}
