/**
 * The ground beneath the dial (DEC-010, DEC-026).
 *
 * An astrolabe is dark brass under any sky. The gold and ivory marks read
 * because the metal they sit on is dark — not because the room is. So when
 * the page lifts to daylight blue and the marks begin to wash out, the
 * answer is not a "day mode" but a material: a lapis disc under the dial,
 * a medallion that holds the gold.
 *
 * Its opacity follows the same real solar altitude the stars follow. At
 * night it is invisible and the dial sits directly on the sky; through
 * civil twilight it rises; by full day it is the ground the marks stand
 * on. There is no switch anywhere — only the sun's altitude, interpolated
 * continuously, the way everything else on this page moves.
 */
import { FACE, TAU } from "./clockface";

/** Altitude at or below which the ground is fully transparent (civil dusk). */
const NIGHT_ALT = -6;
/** Altitude at or above which the ground is fully present (full day). */
const DAY_ALT = 20;

/** 0..1 presence of the ground for a given solar altitude in degrees —
 * 0 at civil dusk and below, 1 at full day and above, smoothstep between. */
export function groundStrength(sunAltitudeDeg: number): number {
  const t = Math.min(1, Math.max(0, (sunAltitudeDeg - NIGHT_ALT) / (DAY_ALT - NIGHT_ALT)));
  return t * t * (3 - 2 * t);
}

/** The lapis medallion, centred at the current origin (the caller has already
 * translated to the dial centre). R is the dial radius in device pixels. */
export function drawGround(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  strength: number,
): void {
  if (strength < 0.01) return;

  const r = R * (FACE.dialOuter + 0.012);

  ctx.save();

  // The field: lit faintly from above, deepening toward the rim.
  const fill = ctx.createRadialGradient(0, -R * 0.15, R * 0.2, 0, 0, r);
  fill.addColorStop(0, `rgba(14,36,64,${0.8 * strength})`);
  fill.addColorStop(0.75, `rgba(10,26,48,${0.9 * strength})`);
  fill.addColorStop(1, `rgba(8,22,39,${0.96 * strength})`);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  // The bevel: a gold edge outside, a shadow just inside.
  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = `rgba(247,222,147,${0.38 * strength})`;
  ctx.beginPath();
  ctx.arc(0, 0, r + 1.5 * dpr, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = `rgba(4,10,22,${0.55 * strength})`;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1 * dpr, 0, TAU);
  ctx.stroke();

  ctx.restore();
}
