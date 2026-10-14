/**
 * The hero answer: what a visitor actually came for — the next sun event.
 * "Sunset in 5h 07m" is the headline; the instrument is how it's shown.
 */
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
