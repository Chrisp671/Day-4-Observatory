/**
 * The moon: a phase-rendered disc riding its orbit ring at its true position
 * relative to the sun (by hour-angle difference), with earthshine on the
 * dark side so the new moon still reads as a body.
 */
import { FACE, hourToAngle, pointOnCircle, TAU } from "./clockface";
import { THEME } from "./theme";

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

  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = THEME.inkHi;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawMoon(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  dialHours: number,
  phaseAngleDeg: number,
): void {
  const orbitR = R * FACE.moonOrbit;

  // Its orbit line, faint.
  ctx.lineWidth = 0.7 * dpr;
  ctx.strokeStyle = THEME.inkLow;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(0, 0, orbitR, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const pos = pointOnCircle(hourToAngle(dialHours), orbitR);
  drawMoonDisc(ctx, pos.x, pos.y, R * 0.075, phaseAngleDeg, dpr);
}
