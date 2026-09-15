/**
 * The rete — the planet rings outside the band ("the rings are a nice visual
 * cue to show me how long something is gonna be up", Parker, DEC-031; the
 * original's most-loved element, archived in analysis/observatory/original-app).
 *
 * The band is the Sun's sphere. Outside it the five rings step outward in
 * the true order from the Sun — Mercury first, then Venus, Mars, Jupiter,
 * Saturn — each spanning the hours its planet is above the horizon this
 * calendar day, with a gold diamond at its peak. No words on the dial: the
 * TONIGHT ledger is the legend, in the same order.
 *
 * Paints Scene.rete and nothing more. Each SceneRing arrives with its radius
 * (a fraction of R), its colour, its rise, set and peak in dial hours, and
 * its weight already judged — honest by night and day, or one ring lit and
 * the rest yielding. Ring order, planet colours, the night-overlap rule and
 * the tap that lights a ring all live on the far side of the seam; here a
 * weight is a stroke width, an alpha and, for the lit ring, a glow.
 */
import { hourToAngle, pointOnCircle } from "./clockface";
import { goldLeaf } from "./theme";
import type { RingWeight, SceneRing } from "../app/scene";

const KEEL = "rgba(4,10,22,0.55)";
const KEEL_DEEP = "rgba(4,10,22,0.8)";

const STROKE: Readonly<Record<RingWeight, { readonly width: number; readonly alpha: number }>> = {
  lit: { width: 3.2, alpha: 1 },
  bright: { width: 2.2, alpha: 0.92 },
  faint: { width: 2.2, alpha: 0.32 },
  dim: { width: 2.2, alpha: 0.24 },
};

/** A small radially-aligned diamond, centred on the ring at `angle`. */
function diamond(
  ctx: CanvasRenderingContext2D,
  angle: number,
  r: number,
  halfLong: number,
  halfWide: number,
): void {
  const p = pointOnCircle(angle, r);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(halfLong, 0);
  ctx.lineTo(0, halfWide);
  ctx.lineTo(-halfLong, 0);
  ctx.lineTo(0, -halfWide);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRete(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  rete: readonly SceneRing[],
): void {
  ctx.save();
  ctx.lineCap = "round";

  for (const ring of rete) {
    const r = R * ring.radius;
    const a0 = hourToAngle(ring.riseHours);
    const a1 = hourToAngle(ring.setHours);
    const { width, alpha } = STROKE[ring.weight];
    const isLit = ring.weight === "lit";

    // Keel: a dark bed under the colour so it holds against the field.
    ctx.globalAlpha = 1;
    ctx.strokeStyle = KEEL;
    ctx.lineWidth = (width + 1.6) * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();

    // The planet's own colour; the lit ring glows a little.
    ctx.save();
    if (isLit) {
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 6 * dpr;
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = width * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();
    ctx.restore();

    // Peak mark: a gold diamond, long axis radial, on a dark keel diamond.
    if (ring.peakHours !== null) {
      const ta = hourToAngle(ring.peakHours);
      const halfLong = R * 0.016;
      const halfWide = R * 0.010;
      const py = pointOnCircle(ta, r).y;
      ctx.globalAlpha = ring.weight === "dim" ? 0.35 : 1;
      ctx.fillStyle = KEEL_DEEP;
      diamond(ctx, ta, r, halfLong + 1.2 * dpr, halfWide + 1.2 * dpr);
      ctx.fillStyle = goldLeaf(ctx, py - halfLong, py + halfLong);
      diamond(ctx, ta, r, halfLong, halfWide);
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}
