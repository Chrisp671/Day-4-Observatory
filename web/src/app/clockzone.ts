/**
 * Which clock the instrument is reporting in.
 *
 * The engine works in absolute UTC and the station is a latitude/longitude,
 * but the readouts are rendered in the *device's* timezone. Point the station
 * somewhere else and the two silently disagree: you get New York's sunrise
 * printed on a Chicago clock. Nothing here changes the astronomy — it names
 * the clock being used, and says plainly when the station is somewhere that
 * keeps a different one.
 */

/** e.g. "CDT", "GMT+2" — whatever the device calls its own zone right now. */
export function deviceZoneLabel(
  unixMillis: number,
  locale = "en-GB",
  timeZone?: string,
): string {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    timeZoneName: "short",
    ...(timeZone === undefined ? {} : { timeZone }),
  }).formatToParts(new Date(unixMillis));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

/**
 * The zone a longitude would keep if the world had no politics: 15° per hour.
 * Real civil zones are drawn by governments and shift for daylight saving, so
 * this is a sanity check, never a clock to display.
 */
export function nominalOffsetHours(longitudeDeg: number): number {
  return Math.round(longitudeDeg / 15);
}

/** The device's own UTC offset in hours (east-positive), e.g. -5 for CDT. */
export function deviceOffsetHours(unixMillis: number): number {
  return -new Date(unixMillis).getTimezoneOffset() / 60;
}

/** Below this the station and the device keep near enough the same clock. */
export const MISMATCH_TOLERANCE_HOURS = 1.5;

export interface ZoneReport {
  /** What the displayed times are actually in. */
  readonly label: string;
  /** Whole hours between the device's clock and the station's longitude. */
  readonly offsetDeltaHours: number;
  /** True when the readouts are in a clock the station does not keep. */
  readonly mismatched: boolean;
}

/**
 * Describe the clock the readouts are in, relative to where the instrument
 * is pointed.
 */
export function zoneReport(
  unixMillis: number,
  stationLonDeg: number,
  locale = "en-GB",
): ZoneReport {
  const delta = deviceOffsetHours(unixMillis) - nominalOffsetHours(stationLonDeg);
  return {
    label: deviceZoneLabel(unixMillis, locale),
    offsetDeltaHours: delta,
    mismatched: Math.abs(delta) >= MISMATCH_TOLERANCE_HOURS,
  };
}

/** "2h behind the station" / "1h ahead of the station" — for the mismatch note. */
export function mismatchPhrase(offsetDeltaHours: number): string {
  const whole = Math.round(Math.abs(offsetDeltaHours));
  const hours = `${whole}h`;
  return offsetDeltaHours < 0 ? `${hours} behind the station` : `${hours} ahead of the station`;
}
