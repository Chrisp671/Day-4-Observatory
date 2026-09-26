/**
 * The moon: a phase-rendered disc riding its orbit at its true position
 * relative to the sun (by hour-angle difference), with earthshine on the
 * dark side so the new moon still reads as a body.
 *
 * The orbit itself is not drawn (DEC-026 subtraction): it was a construction
 * line that reported nothing. The disc alone rides the radius; the only line
 * on it is the up-arc, which says how long the moon is up (DEC-031).
 *
 * drawMoon paints SceneMoon: hours on the dial, phase, the orbit's fraction
 * of R, and today's up-arc or null. Where the moon is and whether it rose
 * today are the Scene's business; moonDialHours stays here only because it
 * is pure dial arithmetic and pinned by test (CHK-002).
 */
import { hourToAngle, pointOnCircle, TAU } from "./clockface";
import { THEME } from "./theme";
import type { SceneMoon } from "../app/scene";

/** Normalize hours into [0, 24). */
const wrap24 = (h: number): number => ((h % 24) + 24) % 24;

/**
 * Where the moon sits on the civil dial: the dial is anchored by the sun at
 * the current civil time, so the moon is offset from it by the true
 * hour-angle difference (sunHA − moonHA = how many hours the moon transits
 * after the sun). Pure and testable (CHK-002).
 */
export function moonDialHours(
  civilNowHours: number,
  sunHourAngleHours: number,
  moonHourAngleHours: number,
): number {
  return wrap24(civilNowHours + (sunHourAngleHours - moonHourAngleHours));
}

/**
 * The terminator's semi-axis as a fraction of the disc's radius, from the
 * Scene's illuminated fraction.
 *
 * The disc is a lit semicircle plus a terminator half-ellipse. If `k` is the
 * cosine of the phase angle then the lit area is `(1 - k) / 2` of the disc, so
 * the half-ellipse's semi-axis is `|k|·r` and `k` follows from the illuminated
 * fraction alone: `1 - 2f`. A full moon closes the terminator to nothing; a new
 * moon opens it to the full radius, leaving no light.
 *
 * Taking the fraction rather than the phase angle is deliberate. The engine
 * computes the illuminated fraction from the real Sun-Moon-Earth geometry and
 * the phase angle from a cheaper series, and the two disagree by about 1e-3 —
 * so a disc derived from one and a readout derived from the other can never be
 * made to agree exactly. The Scene carries both, and this painter paints the
 * Scene's number (DEC-037) instead of re-deriving it.
 */
export function terminatorHalfWidth(illuminatedFraction: number): number {
  return Math.abs(1 - 2 * illuminatedFraction);
}

/** Draw the phase-correct moon disc centered at (x, y). */
export function drawMoonDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  illuminatedFraction: number,
  waxing: boolean,
  dpr: number,
): void {
  ctx.save();
  ctx.translate(x, y);

  // Dark disc + earthshine so a new moon is still visible.
  ctx.fillStyle = THEME.shadow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = THEME.moonlight;
  ctx.globalAlpha = 0.09;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Lit portion: semicircle plus terminator half-ellipse, both signed by k so
  // the half-ellipse subtracts toward new and adds toward full. Waxing lights
  // the right side of the disc.
  const k = 1 - 2 * illuminatedFraction;
  ctx.fillStyle = THEME.moonlight;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, !waxing);
  ctx.ellipse(0, 0, terminatorHalfWidth(illuminatedFraction) * r, r, 0, Math.PI / 2, -Math.PI / 2, k * (waxing ? 1 : -1) > 0);
  ctx.fill();

  // No outline (DESIGN-CONSOLIDATED #5): moonlight↔shadow adjacency is
  // 15.17:1 — the disc separates itself; an outline doubles a boundary
  // that engraved lunar dials leave bare.
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * The up-arc first — an ivory band along the orbit from moonrise to moonset,
 * a little heavier than it was when it sat on a construction ring — then
 * the disc riding over it.
 */
export function drawMoon(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  moon: SceneMoon,
): void {
  const orbitR = R * moon.orbit;
  const discR = R * 0.075;

  if (moon.upArc !== null) {
    ctx.save();
    ctx.strokeStyle = THEME.moonlight;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2.8 * dpr;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, orbitR, hourToAngle(moon.upArc.riseHours), hourToAngle(moon.upArc.setHours));
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  const pos = pointOnCircle(hourToAngle(moon.hours), orbitR);
  drawMoonDisc(ctx, pos.x, pos.y, discR, moon.illuminatedFraction, moon.waxing, dpr);
}
