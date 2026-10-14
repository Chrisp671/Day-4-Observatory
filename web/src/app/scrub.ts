/**
 * Drag-to-scrub (REQ-005 interaction upgrade): the sun is the hour hand, so
 * grabbing it and dragging around the dial IS the time control. Pure math
 * here; pointer wiring lives in main.ts.
 */
import { FACE, TAU } from "../ui/clockface";

/** Inverse of hourToAngle: a canvas-space point (centre origin, y down) → dial hours. */
export function pointToDialHours(x: number, y: number): number {
  const a = Math.atan2(y, x);
  const h = ((a - Math.PI / 2) / TAU) * 24;
  return ((h % 24) + 24) % 24;
}

/** Shortest signed hour delta between two dial positions, in (-12, 12]. */
export function shortestHourDelta(fromHours: number, toHours: number): number {
  let d = (toHours - fromHours) % 24;
  if (d > 12) d -= 24;
  if (d <= -12) d += 24;
  return d;
}

/**
 * True when a canvas-space point is on (or generously near) the sun disc.
 * The grab target is ~2.5× the visual disc — fingers are not cursors.
 */
export function hitSun(x: number, y: number, sunHours: number, R: number): boolean {
  const rMid = (R * (FACE.dialOuter + FACE.dialInner)) / 2;
  const a = (sunHours / 24) * TAU + Math.PI / 2;
  const dx = x - Math.cos(a) * rMid;
  const dy = y - Math.sin(a) * rMid;
  return dx * dx + dy * dy <= (R * 0.075) ** 2;
}
