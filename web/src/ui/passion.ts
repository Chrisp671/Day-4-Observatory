/**
 * The Sixth Hour and the Axis (DEC-022/023, "Radiant").
 *
 * Two marks, one confession. The axis is the cross the whole dial turns upon,
 * drawn as light rather than metal and set beneath everything it holds. The
 * darkened hours are the sixth to the ninth — carried on the band, rimmed in
 * gold at both bounds, because the darkness was real and it ended.
 *
 * Neither is a pointer. "Now" is marked elsewhere, by a plain gnomon.
 */
import { FACE, hourToAngle, pointOnCircle, TAU } from "./clockface";
import { goldLeaf } from "./theme";

/** Midpoint of an arc that may cross midnight, in hours-of-day. */
export function midHours(fromHours: number, toHours: number): number {
  const span = ((toHours - fromHours) % 24 + 24) % 24;
  return ((fromHours + span / 2) % 24 + 24) % 24;
}

/** The cross the dial turns upon: light from behind the world. */
export function drawAxis(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  strength = 1,
): void {
  ctx.save();
  ctx.lineCap = "butt";
  ctx.shadowColor = `rgba(247,222,147,${0.8 * strength})`;
  ctx.shadowBlur = R * 0.075;
  ctx.strokeStyle = `rgba(247,222,147,${0.42 * strength})`;
  // R is already in device pixels; scaling by dpr again would double-count it.
  ctx.lineWidth = R * 0.016;
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.60);
  ctx.lineTo(0, R * 0.74);
  ctx.moveTo(-R * 0.47, -R * 0.20);
  ctx.lineTo(R * 0.47, -R * 0.20);
  ctx.stroke();
  ctx.restore();
}

/**
 * The three hours, on the band: the light withdrawn between them, gold struck
 * across each bound, and one cross standing over the middle of it — upright,
 * never turning with the dial.
 */
export function drawPassionHours(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  fromHours: number,
  toHours: number,
): void {
  const rOut = R * FACE.dialOuter;
  const rIn = R * FACE.dialInner;

  // Withdraw the light. Softened at each end so it reads as a shadow falling,
  // not as a painted block.
  const STEPS = 48;
  const span = ((toHours - fromHours) % 24 + 24) % 24;
  ctx.save();
  for (let i = 0; i < STEPS; i++) {
    const t0 = i / STEPS;
    const t1 = (i + 1) / STEPS;
    const edge = Math.min(t0, 1 - t0);
    ctx.globalAlpha = 0.9 * (0.45 + 0.55 * Math.min(1, edge / 0.12));
    ctx.fillStyle = "#04070E";
    ctx.beginPath();
    ctx.arc(0, 0, rOut, hourToAngle(fromHours + t0 * span), hourToAngle(fromHours + t1 * span));
    ctx.arc(0, 0, rIn, hourToAngle(fromHours + t1 * span), hourToAngle(fromHours + t0 * span), true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Gold at the sixth hour and the ninth: the darkness bounded on both sides.
  for (const h of [fromHours, toHours]) {
    const a = hourToAngle(h);
    const inner = pointOnCircle(a, rIn);
    const outer = pointOnCircle(a, rOut);
    ctx.save();
    ctx.shadowColor = "rgba(247,222,147,0.9)";
    ctx.shadowBlur = 6 * dpr;
    ctx.strokeStyle = goldLeaf(ctx, -rOut, rOut);
    ctx.lineWidth = 2.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.stroke();
    ctx.restore();
  }

  // The cross, standing over the hours it remembers.
  const arm = R * 0.052;
  const centre = pointOnCircle(hourToAngle(midHours(fromHours, toHours)), rOut + arm * 1.45);
  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(247,222,147,0.75)";
  ctx.shadowBlur = 5 * dpr;
  ctx.lineWidth = 2.6 * dpr;
  ctx.strokeStyle = goldLeaf(ctx, -arm * 1.2, arm * 1.2);
  ctx.beginPath();
  ctx.moveTo(0, -arm * 1.15);
  ctx.lineTo(0, arm * 1.0);
  ctx.moveTo(-arm * 0.66, -arm * 0.42);
  ctx.lineTo(arm * 0.66, -arm * 0.42);
  ctx.stroke();
  ctx.restore();
}

/** A light-well behind the world, so the axis reads as glow and not as a scratch. */
export function drawWell(ctx: CanvasRenderingContext2D, R: number): void {
  const well = ctx.createRadialGradient(0, 0, R * FACE.earth * 0.9, 0, 0, R * 0.62);
  well.addColorStop(0, "rgba(247,222,147,0.13)");
  well.addColorStop(1, "rgba(247,222,147,0)");
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.62, 0, TAU);
  ctx.fill();
}
