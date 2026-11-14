/**
 * Typing a date and time (REQ-017, DEC-057).
 *
 * Parker: "I still need to be able to move the time by the minutes and
 * possibly seconds ... Or at least where I can enter the time manually."
 *
 * The control is the browser's own date-and-time field, so on a phone it is
 * the system's picker and nobody has to learn ours. That field speaks one
 * dialect — "2026-11-14T15:10:25", wall-clock time in the device's zone, no
 * offset — and this module is the two directions of it: the string the field
 * should hold for an instant, and the instant a string from the field means.
 * Pure, so the edges are tested without a browser.
 *
 * What the field hands back is not trusted to be a time. A cleared field is
 * the empty string; a year being typed passes through 0002, 0020 and 0202 on
 * its way to 2026; and nothing stops a caller passing anything at all. Every
 * one of those is `null` here — "no instant" — and the caller leaves the
 * instrument where it is.
 */

/** The earliest year the field accepts. Not an astronomical limit: a typed
 * year arrives a digit at a time, and under 1000 is what a year looks like
 * while it is still being typed. The steppers reach earlier dates. */
export const ENTRY_MIN_YEAR = 1000;
/** The latest: the field's own format has four digits for the year. */
export const ENTRY_MAX_YEAR = 9999;

/** The field's `min` and `max` attributes, in its own dialect. */
export const ENTRY_MIN = `${ENTRY_MIN_YEAR}-01-01T00:00:00`;
export const ENTRY_MAX = `${ENTRY_MAX_YEAR}-12-31T23:59:59`;

const two = (n: number): string => String(n).padStart(2, "0");

/**
 * The string the field holds for an instant: local wall-clock time to the
 * second, "2026-11-14T15:10:25". "" when the instant has no such string (a
 * year the field cannot show), which the field displays as empty.
 */
export function toEntryValue(unixMillis: number): string {
  const d = new Date(unixMillis);
  const year = d.getFullYear();
  if (!Number.isFinite(year) || year < ENTRY_MIN_YEAR || year > ENTRY_MAX_YEAR) return "";
  return `${String(year).padStart(4, "0")}-${two(d.getMonth() + 1)}-${two(d.getDate())}` +
    `T${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

/** "YYYY-MM-DDTHH:MM", optionally ":SS" and a fraction the field may append. */
const ENTRY = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/;

/**
 * The instant a string from the field means, read as local wall-clock time;
 * null when it is not a date and time the field could have meant.
 *
 * Seconds are optional because a phone's picker has no seconds wheel and
 * hands back "2026-11-14T15:10". A calendar date that does not exist
 * (February 30) is null rather than quietly becoming March 2. A wall-clock
 * time that does not exist — 2:30 am on the night the clocks go forward — is
 * the instant the device's own calendar resolves it to, because a picker can
 * be left on such a time and ignoring it would look like a broken control.
 */
export function parseEntry(value: string): number | null {
  const m = ENTRY.exec(value.trim());
  if (m === null) return null;
  const [year, month, day, hour, minute] = [m[1], m[2], m[3], m[4], m[5]].map(Number) as
    [number, number, number, number, number];
  const second = m[6] === undefined ? 0 : Number(m[6]);
  if (year < ENTRY_MIN_YEAR || year > ENTRY_MAX_YEAR) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  const d = new Date(year, month - 1, day, hour, minute, second, 0);
  // The date must be one the calendar has; the time may have been moved by
  // a daylight-saving gap, which can only move it forward within the day.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}
