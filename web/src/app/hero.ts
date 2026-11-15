/**
 * The hero answer: what a visitor actually came for — the next sun event.
 * "Sunset in 5h 07m" is the headline; the instrument is how it's shown.
 *
 * Above it stands the instrument's own date and time, and beside it the
 * clock time the event falls at (REQ-017, DEC-057). Parker: "I like the
 * 'Sunset/Sunrise In' indicator, but it still needs the date and time above
 * those words." A countdown answers "how long"; it does not say from when, or
 * to when, and once the dot has been dragged into another day nobody can
 * tell. These three lines read as one sentence: Sat Nov 14 · 3:10 pm —
 * Sunset in 1h 42m — at 4:52 pm.
 */
import { fmt12, fmt12s } from "./clock12";

export interface SunEvent {
  readonly kind: "sunrise" | "sunset";
  readonly atUnixMillis: number;
}

/** The sooner of the next rise/set; null only in polar day/night. */
export function nextSunEvent(
  riseUnixMillis: number | null,
  setUnixMillis: number | null,
): SunEvent | null {
  if (riseUnixMillis === null && setUnixMillis === null) return null;
  if (setUnixMillis === null || (riseUnixMillis !== null && riseUnixMillis < setUnixMillis)) {
    return { kind: "sunrise", atUnixMillis: riseUnixMillis as number };
  }
  return { kind: "sunset", atUnixMillis: setUnixMillis };
}

/** "5h 07m" / "43m" — floors to the minute, never negative. */
export function formatCountdown(deltaMillis: number): string {
  const totalMinutes = Math.max(0, Math.floor(deltaMillis / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * "Sat Nov 14" — a date in the fewest plain words that still name the day.
 * The year is added only when it is not the year `presentUnixMillis` falls
 * in ("Sun Nov 14, 2027"): on an ordinary evening it would be noise, and
 * after stepping twelve months it is the one thing that says so.
 */
export function dateWords(unixMillis: number, presentUnixMillis: number): string {
  const d = new Date(unixMillis);
  const words = `${WEEKDAYS[d.getDay()] ?? ""} ${MONTHS[d.getMonth()] ?? ""} ${d.getDate()}`;
  return d.getFullYear() === new Date(presentUnixMillis).getFullYear()
    ? words
    : `${words}, ${d.getFullYear()}`;
}

/**
 * The line above the hero: the date and time the instrument is showing.
 * "Sat Nov 14 · 3:10 pm" while it follows the present. Once it has been moved
 * — dragged, stepped, typed or held — the seconds appear too, "Fri Oct 2 ·
 * 9:07:25 pm", because that is when a viewer is setting the time and needs to
 * see what a one-second step did. A running clock stays to the minute so the
 * masthead is not a ticking thing.
 */
export function whenLine(displayedUnixMillis: number, nowUnixMillis: number, travelled: boolean): string {
  const clock = travelled ? fmt12s(displayedUnixMillis) : fmt12(displayedUnixMillis);
  return `${dateWords(displayedUnixMillis, nowUnixMillis)} · ${clock}`;
}

/**
 * Beside the countdown: when the event itself falls. "at 4:52 pm" when it is
 * on the date the instrument shows — the line above already names that date —
 * and "at 6:41 am Sun Nov 15" when it is not, as the next sunrise never is
 * after dark. Always the event's own date and local time, never a guess.
 */
export function eventAt(eventUnixMillis: number, displayedUnixMillis: number): string {
  const event = new Date(eventUnixMillis);
  const shown = new Date(displayedUnixMillis);
  const sameDate = event.getFullYear() === shown.getFullYear()
    && event.getMonth() === shown.getMonth() && event.getDate() === shown.getDate();
  return sameDate
    ? `at ${fmt12(eventUnixMillis)}`
    : `at ${fmt12(eventUnixMillis)} ${dateWords(eventUnixMillis, displayedUnixMillis)}`;
}
