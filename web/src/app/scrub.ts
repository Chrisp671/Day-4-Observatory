/**
 * Drag-to-scrub (REQ-005 interaction upgrade): the sun is the hour hand, so
 * grabbing it and dragging around the dial IS the time control. Pure math
 * here; pointer wiring lives in app/shell.ts.
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

/* ————— the drag itself: turns that add up (REQ-017, DEC-057) —————
 *
 * Parker, on an iPhone: "it needs to be able to continue into the day after
 * and before and keep going. Right now it jumps back to the beginning when
 * you make more than a full rotation."
 *
 * A drag is a sum, never a position. Each move contributes the shortest
 * signed way round from the last place the pointer stood, so crossing 12 am
 * forward adds an hour rather than subtracting twenty-three, and two and a
 * half turns are sixty hours. Mapping the pointer's angle straight to a time
 * of day cannot do that: an angle only knows where on the dial it is, not how
 * many times it has been there.
 *
 * The sum is only as good as the "last place", which is why the shell feeds
 * this from ONE pointer. The defect Parker met was a second finger resting on
 * the dial: its moves were read as the drag's own, so every delta was measured
 * against a point that never went round, and the total could never leave the
 * half-day either side of it. After a full turn it was back where it began.
 */

/** Inside this fraction of R the pointer's angle means nothing: at the hub a
 * few pixels of finger are twelve hours of dial, so a move there is ignored
 * and the sum picks up again, the short way, where the pointer comes out. */
export const DRAG_HUB = 0.12;

/** A drag in progress. */
export interface DragState {
  /** Dial hours of the last position that counted. */
  readonly lastHours: number;
  /** Hours travelled since the press: signed and unbounded — 60 after two
   * and a half turns forward, −72 after three turns back. */
  readonly totalHours: number;
}

/** Begin a drag where the pointer went down (canvas space, centre origin). */
export function beginDrag(x: number, y: number): DragState {
  return { lastHours: pointToDialHours(x, y), totalHours: 0 };
}

/**
 * The drag after one more pointer position. The delta is the shortest signed
 * way round from the last counted position, added to the total — so the total
 * carries through 12 am, in either direction, as many times as the pointer
 * goes round. A position inside the hub changes nothing.
 */
export function moveDrag(state: DragState, x: number, y: number, R: number): DragState {
  if (x * x + y * y < (R * DRAG_HUB) ** 2) return state;
  const hours = pointToDialHours(x, y);
  return {
    lastHours: hours,
    totalHours: state.totalHours + shortestHourDelta(state.lastHours, hours),
  };
}
