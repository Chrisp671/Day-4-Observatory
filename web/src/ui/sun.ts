/**
 * The sun — the instrument's only hour hand (DEC-004/DEC-008): a brand-gold
 * disc riding the dial band at the current civil time, with a faint
 * chart-annotation radial tying it to the face center.
 *
 * Paints SceneSun: an hour and a colour. The colour follows the light
 * (DEC-010) but that reckoning is the Scene's; the disc is simply filled
 * with what it is handed.
 */
import { FACE, hourToAngle, pointOnCircle, TAU } from "./clockface";
import { THEME } from "./theme";
import type { SceneSun } from "../app/scene";

export function drawSun(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  sun: SceneSun,
): void {
  const a = hourToAngle(sun.hours);
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
  ctx.fillStyle = sun.color;
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
