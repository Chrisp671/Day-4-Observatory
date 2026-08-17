/**
 * Earth at the face center: an orthographic graticule sphere with the night
 * hemisphere shaded opposite the sun's dial position, echoing the real
 * terminator the engine computes (FrameState.earth).
 */
import { FACE, TAU } from "../ui/clockface";
import { THEME } from "../ui/theme";

export function drawEarth(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  sunDialAngleRad: number,
): void {
  const r = R * FACE.earth;

  ctx.lineWidth = 1.1 * dpr;
  ctx.strokeStyle = THEME.inkHi;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();

  // Graticule: equator, central meridian, and two rings of each.
  ctx.lineWidth = 0.7 * dpr;
  ctx.strokeStyle = THEME.inkLow;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();
  for (const f of [0.38, 0.72]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * f, r, 0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * f, 0, 0, TAU);
    ctx.stroke();
  }

  // Night hemisphere: away from the sun's position on the dial.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  ctx.rotate(sunDialAngleRad + Math.PI);
  ctx.fillStyle = THEME.shadow;
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.22, r, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
