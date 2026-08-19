/**
 * The hours of the day as Scripture counts them.
 *
 * "The sixth hour" is not noon on a clock. In the reckoning the Gospels use,
 * daylight is divided into twelve equal hours from sunrise to sunset — so an
 * hour is longer in summer than in winter, and longer in Edinburgh than in
 * Quito. The sixth hour lands at solar midday whatever the season, and the
 * ninth hour three seasonal hours later.
 *
 * That matters for Mark 15:33: the darkness ran from the sixth hour to the
 * ninth. An instrument that hard-coded 12:00–15:00 would be telling the
 * viewer something false about their own sky. This module computes those
 * hours for the station and the date actually on screen.
 */

/** Daylight is twelve hours, however long the day happens to be. */
export const HOURS_OF_DAYLIGHT = 12;

/** Length of one seasonal hour in millis, or null when the sun never sets/rises. */
export function seasonalHourMillis(
  riseUnixMillis: number | null,
  setUnixMillis: number | null,
): number | null {
  if (riseUnixMillis === null || setUnixMillis === null) return null;
  const daylight = setUnixMillis - riseUnixMillis;
  if (!(daylight > 0)) return null;
  return daylight / HOURS_OF_DAYLIGHT;
}

/**
 * The instant the nth hour of the day arrives, counting from sunrise:
 * the first hour begins at sunrise, the sixth arrives at solar midday, the
 * twelfth at sunset.
 */
export function hourOfDay(
  riseUnixMillis: number | null,
  setUnixMillis: number | null,
  n: number,
): number | null {
  const hour = seasonalHourMillis(riseUnixMillis, setUnixMillis);
  if (hour === null || riseUnixMillis === null) return null;
  return riseUnixMillis + n * hour;
}

export interface PassionHours {
  /** The sixth hour — solar midday. */
  readonly fromUnixMillis: number;
  /** The ninth hour. */
  readonly toUnixMillis: number;
  /** Length of one seasonal hour, in minutes — how long an "hour" ran that day. */
  readonly hourMinutes: number;
}

/**
 * "And when the sixth hour had come, there was darkness over the whole land
 * until the ninth hour." — Mark 15:33. Null in polar day or night, where the
 * reckoning has no sunrise to count from.
 */
export function passionHours(
  riseUnixMillis: number | null,
  setUnixMillis: number | null,
): PassionHours | null {
  const from = hourOfDay(riseUnixMillis, setUnixMillis, 6);
  const to = hourOfDay(riseUnixMillis, setUnixMillis, 9);
  const hour = seasonalHourMillis(riseUnixMillis, setUnixMillis);
  if (from === null || to === null || hour === null) return null;
  return { fromUnixMillis: from, toUnixMillis: to, hourMinutes: hour / 60000 };
}
