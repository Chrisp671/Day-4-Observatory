/**
 * The ring key's swatch (DEC-055): a piece of the ring itself.
 *
 * The ledger's swatch used to be a 16×3 bar of the planet's colour, and the
 * eye had to match a colour name to a thin arc on the dial. Now the swatch is
 * a short arc drawn exactly as the rete draws the ring — the same keel, the
 * same colour and the same gold peak diamond, the lit one glowing — so the eye
 * matches mark to mark. Unlike the ring, it never fades (`swatchWeight`). A planet with no ring today gets
 * a dotted stub, which is also honest.
 *
 * A pure painter, like the rest of ui/: a context, its pixel ratio, one ring
 * (or null) and its colour. The shell owns the canvas and decides when to
 * repaint (`swatchKey`); it knows nothing about how the arc is drawn.
 */
import { goldLeaf } from "./theme";
import { keelChannels, RING_KEEL, RING_STROKE } from "./planetarcs";
import type { RingWeight, SceneRing } from "../app/scene";

/** CSS size of the swatch; the stylesheet in index.html agrees. */
export const SWATCH_W = 30;
export const SWATCH_H = 12;

const KEEL = `rgba(${keelChannels(RING_KEEL.color)},${RING_KEEL.alpha})`;
const KEEL_DEEP = `rgba(${keelChannels(RING_KEEL.color)},0.8)`;

/**
 * The weight a swatch is drawn at: the lit ring glows, every other ring is
 * drawn at full weight. The rete fades a ring whose planet is down in daylight
 * (DEC-036), and that honesty belongs on the dial; the swatch is the legend,
 * and a faded legend cannot be read (DEC-053, DEC-055).
 */
export function swatchWeight(weight: RingWeight): RingWeight {
  return weight === "lit" ? "lit" : "bright";
}

/** Everything the swatch shows, as one string: when it is unchanged, so is the picture. */
export function swatchKey(ring: SceneRing | null, color: string, dpr: number): string {
  return `${ring === null ? "none" : swatchWeight(ring.weight)}|${ring === null || ring.peakHours === null ? "nopeak" : "peak"}|${color}|${dpr}`;
}

/** Paint the swatch into a context whose canvas is SWATCH_W×SWATCH_H CSS px at `dpr`. */
export function drawRingSwatch(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  ring: SceneRing | null,
  color: string,
): void {
  const w = SWATCH_W * dpr;
  const h = SWATCH_H * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.lineCap = "round";

  // A gentle arc: a segment of a large circle whose centre sits well below
  // the swatch, so the key curves the way the ring curves.
  const big = SWATCH_W * 1.6 * dpr;
  const cx = w / 2;
  const cy = SWATCH_H * 0.42 * dpr + big;
  const half = Math.asin((w / 2 - 3 * dpr) / big);
  const a0 = -Math.PI / 2 - half;
  const a1 = -Math.PI / 2 + half;

  if (ring === null) {
    // No ring today: a dotted stub in the planet's colour, so the row still
    // says which planet it is without claiming an arc the dial does not draw.
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4 * dpr;
    ctx.setLineDash([1.5 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.arc(cx, cy, big, a0, a1);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const weight = swatchWeight(ring.weight);
  const { width, alpha } = RING_STROKE[weight];
  // Keel first, as on the rete, so the colour sits on the bed the gate measures.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = KEEL;
  ctx.lineWidth = (width + 1.6) * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, big, a0, a1);
  ctx.stroke();

  ctx.save();
  if (weight === "lit") {
    ctx.shadowColor = color;
    ctx.shadowBlur = 5 * dpr;
  }
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, big, a0, a1);
  ctx.stroke();
  ctx.restore();

  if (ring.peakHours !== null) {
    // The peak diamond, two thirds along, long axis radial (here: vertical).
    const ta = a0 + (a1 - a0) * 0.66;
    const px = cx + Math.cos(ta) * big;
    const py = cy + Math.sin(ta) * big;
    const halfLong = 3.2 * dpr;
    const halfWide = 2 * dpr;
    const diamond = (hl: number, hw: number): void => {
      ctx.beginPath();
      ctx.moveTo(px, py - hl);
      ctx.lineTo(px + hw, py);
      ctx.lineTo(px, py + hl);
      ctx.lineTo(px - hw, py);
      ctx.closePath();
      ctx.fill();
    };
    ctx.globalAlpha = 1;
    ctx.fillStyle = KEEL_DEEP;
    diamond(halfLong + 1.2 * dpr, halfWide + 1.2 * dpr);
    ctx.fillStyle = goldLeaf(ctx, py - halfLong, py + halfLong);
    diamond(halfLong, halfWide);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}
