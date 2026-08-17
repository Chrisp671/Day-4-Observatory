/**
 * The sun — the instrument's only hour hand (DEC-004/DEC-008): a brand-gold
 * disc riding the dial band at the current civil time, with a faint
 * chart-annotation radial tying it to the face center.
 */
import { FACE, hourToAngle, pointOnCircle, TAU } from "./clockface";
import { THEME } from "./theme";

export function drawSun(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  nowHours: number,
  coreColor: string = THEME.sunlight,
): void {
  const a = hourToAngle(nowHours);
  const rMid = (R * (FACE.dialOuter + FACE.dialInner)) / 2;
  const pos = pointOnCircle(a, rMid);

  // Annotation radial: the sun is the hand.
  const from = pointOnCircle(a, R * FACE.sunAnnotationInner);
  ctx.lineWidth = 0.7 * dpr;
  ctx.strokeStyle = THEME.inkLow;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // No glow (DESIGN-CONSOLIDATED #1): a print reflects light, it does not emit.
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, R * FACE.sunDisc, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = THEME.inkHi;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, R * FACE.sunDisc, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
