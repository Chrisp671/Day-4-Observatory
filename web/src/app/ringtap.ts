/**
 * A tap on the rete (DEC-055): which ring, if any, a point on the dial lands on.
 *
 * Parker (iPhone, iPad): "it's not clear which object each arch line is
 * showing until you toggle them on and off." So the ring itself is now a
 * control: tapping it lights it exactly as tapping its planet's row does,
 * and tapping the lit ring again releases it. This is the dial's second
 * gesture beside dragging the sun (REQ-005), and it adds no words to the dial
 * (DEC-038's rule stands).
 *
 * Pure math, like scrub.ts: canvas-space points with the dial's centre at the
 * origin, the face radius R in the same units, and the Scene's rings. Pointer
 * wiring lives in the shell, which asks the sun first (`hitSun`) so a tap on
 * the sun always begins a drag and never lights a ring.
 */
import { FACE } from "../ui/clockface";
import { ringSweepHours } from "../ui/planetarcs";
import { pointToDialHours } from "./scrub";
import type { SceneRing } from "./scene";

/**
 * How far from a ring's own radius a tap still counts, as a fraction of R:
 * one and a half ring steps, so the reach of two neighbours overlaps and the
 * nearer wins. Rings are about 5.6 CSS px apart on a 390 px phone, so this is
 * generous on purpose — a finger is not a cursor.
 */
export const RING_REACH = FACE.ringStep * 1.5;

/**
 * How far a pointer may travel, in CSS px, and still be a tap. Further is a
 * drag, which lights nothing: dragging the sun scrubs time, and a drag that
 * started on a ring is simply a miss.
 */
export const TAP_SLOP_PX = 10;

/** True when `hour` lies inside the ring's sweep from rise to set, allowing
 * for a sweep that crosses midnight (set reads earlier than rise). */
export function ringCovers(ring: Pick<SceneRing, "riseHours" | "setHours">, hour: number): boolean {
  return ringSweepHours(ring.riseHours, hour) <= ringSweepHours(ring.riseHours, ring.setHours);
}

/**
 * The ring under a tap, or null. Only a ring whose sweep covers the tapped
 * hour is a candidate — the gap where a ring is not drawn belongs to nobody;
 * among the candidates the nearest by radius wins, if it lies within reach.
 */
export function ringAt(
  x: number,
  y: number,
  R: number,
  rete: readonly SceneRing[],
  reach: number = RING_REACH,
): string | null {
  if (!(R > 0)) return null;
  const rho = Math.hypot(x, y) / R;
  const hour = pointToDialHours(x, y);
  let best: string | null = null;
  let bestGap = reach;
  for (const ring of rete) {
    if (!ringCovers(ring, hour)) continue;
    const gap = Math.abs(rho - ring.radius);
    if (gap <= bestGap) {
      bestGap = gap;
      best = ring.name;
    }
  }
  return best;
}

/** Whether a pointer that moved by (dx, dy) device pixels was still a tap. */
export function isTap(dx: number, dy: number, dpr: number): boolean {
  return Math.hypot(dx, dy) <= TAP_SLOP_PX * dpr;
}
