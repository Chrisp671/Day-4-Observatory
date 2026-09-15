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

/** Draw the phase-correct moon disc centered at (x, y). */
export function drawMoonDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  phaseAngleDeg: number,
  dpr: number,
): void {
  const phase = phaseAngleDeg / 360;

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

  // Lit portion: semicircle plus terminator half-ellipse.
  // k runs +1 (new) → −1 (full) → +1; waxing lights the right side.
  const k = Math.cos(phase * TAU);
  const waxing = phase < 0.5;
  ctx.fillStyle = THEME.moonlight;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, !waxing);
  ctx.ellipse(0, 0, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k * (waxing ? 1 : -1) > 0);
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
  drawMoonDisc(ctx, pos.x, pos.y, discR, moon.phaseAngleDeg, dpr);
}
