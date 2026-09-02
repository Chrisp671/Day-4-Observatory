/**
 * The sidereal ring: a hairline scale that rotates with the stars (once per
 * sidereal day, ~4 minutes fast on the civil dial), carrying four gold
 * chart-star glyphs. Driven by FrameState.siderealHours.
 *
 * DEC-026 subtraction: the interior was crowded, so this ring gave up weight
 * (72 ticks → 24, hairline stroke, faint ink). The stars are the only thing
 * on it that carries colour — gold leaf, because they are the point of it.
 */
import { FACE, TAU } from "./clockface";
import { goldLeaf, THEME } from "./theme";

export function drawSidereal(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  siderealHours: number,
): void {
  const r = R * FACE.sidereal;
  ctx.save();
  ctx.rotate(-(siderealHours / 24) * TAU);

  // Hairline ring.
  ctx.lineWidth = 0.7 * dpr;
  ctx.strokeStyle = THEME.inkLow;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();

  // 24 ticks, every 15°; four majors at the quarters.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const major = i % 6 === 0;
    const t = major ? R * 0.016 : R * 0.008;
    ctx.strokeStyle = major ? THEME.inkMid : THEME.inkLow;
    ctx.globalAlpha = major ? 0.8 : 0.45;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - t), Math.sin(a) * (r - t));
    ctx.lineTo(Math.cos(a) * (r + t), Math.sin(a) * (r + t));
    ctx.stroke();
  }

  // Four chart-star glyphs riding the ring, in gold leaf.
  ctx.lineWidth = 0.9 * dpr;
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.42;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const s = R * 0.016;
    ctx.strokeStyle = goldLeaf(ctx, y - s, y + s);
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
    ctx.fillStyle = "#F7DE93";
    ctx.beginPath();
    ctx.arc(x, y, 1.1 * dpr, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
