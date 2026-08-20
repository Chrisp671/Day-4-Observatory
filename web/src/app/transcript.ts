/**
 * The dial, spoken.
 *
 * The canvas is a picture; a screen reader gets one sentence of aria-label
 * and nothing else. This module writes the fuller description — where the sun
 * stands, what the moon is doing, when the light changes — as plain prose.
 * It is attached to the canvas via aria-describedby, so a reader reaches it
 * on demand instead of being interrupted by a chattering live region.
 */

/** "east", "southwest" — the eight winds, from a compass azimuth. */
export function compassPoint(azimuthDeg: number): string {
  const POINTS = [
    "north", "northeast", "east", "southeast",
    "south", "southwest", "west", "northwest",
  ] as const;
  const idx = Math.round((((azimuthDeg % 360) + 360) % 360) / 45) % 8;
  return POINTS[idx] as string;
}

export interface TranscriptState {
  readonly sunAltitudeDeg: number;
  readonly sunAzimuthDeg: number;
  readonly moonPhaseName: string;
  readonly moonAgeDays: number;
  /** "05:12" or null in polar conditions. */
  readonly riseHHMM: string | null;
  readonly setHHMM: string | null;
}

/** One paragraph a screen reader can speak about the sky right now. */
export function transcript(s: TranscriptState): string {
  const sun =
    s.sunAltitudeDeg >= 0
      ? `The sun is up, ${Math.round(s.sunAltitudeDeg)} degrees above the horizon in the ${compassPoint(s.sunAzimuthDeg)}.`
      : s.sunAltitudeDeg > -6
        ? "The sun has just set; the sky is in twilight."
        : "The sun is down and the sky is dark.";
  const light =
    s.riseHHMM === null || s.setHHMM === null
      ? "There is no sunrise or sunset at this station today."
      : `Sunrise at ${s.riseHHMM}, sunset at ${s.setHHMM}.`;
  const moon = `The moon is a ${s.moonPhaseName}, ${s.moonAgeDays.toFixed(1)} days old.`;
  return `${sun} ${light} ${moon}`;
}
