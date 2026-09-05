/**
 * Pure dial mathematics — no canvas, no DOM, fully testable (CHK-002).
 *
 * Dial convention (per the approved WI-001 mockup): a 24-hour civil dial with
 * NOON AT TOP, MIDNIGHT AT BOTTOM, hours increasing clockwise; 06 sits on the
 * left, 18 on the right. Angles are canvas radians (0 = +x, y grows downward).
 */

export const TAU = Math.PI * 2;

/** Map hours-of-day (0..24) to a canvas angle on the dial. */
export function hourToAngle(hours: number): number {
  return (hours / 24) * TAU + Math.PI / 2;
}

/** Hours-of-day (fractional, 0..24) of a timestamp in the viewer's timezone. */
export function localHoursOfDay(unixMillis: number): number {
  const d = new Date(unixMillis);
  return (
    d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 + d.getMilliseconds() / 3.6e6
  );
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function pointOnCircle(angleRad: number, radius: number): Point {
  return { x: Math.cos(angleRad) * radius, y: Math.sin(angleRad) * radius };
}

/** Normalized instrument layout: every radius as a fraction of the face radius. */
export const FACE = {
  dialOuter: 0.985,
  dialInner: 0.875,
  numerals: 0.82,
  moonOrbit: 0.66, // the interior holds only earth, axis and moon
  sidereal: 0.46, // a hairline scale beneath the moon
  sunAnnotationInner: 0.32,
  earth: 0.3, // WI-005
  sunDisc: 0.03,
  sunGlow: 0.085,
  /** The rete (DEC-036): first ring outside the band, and the step between rings. */
  ringBase: 1.14,
  ringStep: 0.042,
  /** Outer edge of the rete; the canvas fit and the ground disc reach to it. */
  reteOuter: 1.14 + 4 * 0.042 + 0.02,
} as const;

/** The order of the spheres outward from the Sun's band: Mercury nearest. */
export const RING_ORDER: readonly string[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

/** Radius of a planet's ring as a fraction of R, by name; unknown names take the first ring. */
export function ringFraction(name: string): number {
  const k = RING_ORDER.indexOf(name);
  return FACE.ringBase + (k < 0 ? 0 : k) * FACE.ringStep;
}
