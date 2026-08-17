/**
 * The sidereal ring: a fine tick ring that rotates with the stars (once per
 * sidereal day, ~4 minutes fast on the civil dial), carrying four chart-star
 * glyphs. Driven by FrameState.siderealHours.
 */
import { FACE, TAU } from "./clockface";
import { THEME } from "./theme";

export function drawSidereal(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  siderealHours: number,
): void {
  const r = R * FACE.sidereal;
  ctx.save();
  ctx.rotate(-(siderealHours / 24) * TAU);

  ctx.lineWidth = 0.9 * dpr;
  ctx.strokeStyle = THEME.inkMid;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();

  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const major = i % 6 === 0;
    const t = major ? R * 0.018 : R * 0.009;
    ctx.globalAlpha = major ? 0.95 : 0.6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - t), Math.sin(a) * (r - t));
    ctx.lineTo(Math.cos(a) * (r + t), Math.sin(a) * (r + t));
    ctx.stroke();
  }

  // Four chart-star glyphs riding the ring.
  ctx.lineWidth = 0.9 * dpr;
  ctx.strokeStyle = THEME.inkMid;
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.42;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const s = R * 0.016;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
