/**
 * The planet up-arcs — "the rings are a nice visual cue to show me how long
 * something is gonna be up" (Parker, DEC-031; the original's most-loved
 * element, archived in analysis/observatory/original-app).
 *
 * Five thin arcs just inside the dial band, each spanning the hours its
 * planet is above the horizon this calendar day, with a small dot at the
 * peak. The colours stay within the design law — colour only where the sky
 * provides it (DEC-008) — because these ARE the planets' sky colours, muted:
 * Mercury dusk-grey, Venus brilliant white, Mars rust, Jupiter cream,
 * Saturn pale gold.
 */
import { hourToAngle, pointOnCircle, TAU } from "./clockface";

/** Muted sky colours, keyed by planet name; exported for the board legend. */
export const PLANET_COLORS: Readonly<Record<string, string>> = {
  Mercury: "#9FA6B8",
  Venus: "#EDEFF4",
  Mars: "#C97B5A",
  Jupiter: "#E3D3AE",
  Saturn: "#D9C27E",
};

export interface PlanetArc {
  readonly name: string;
  readonly riseHours: number;
  readonly setHours: number;
  /** Hours-of-day of the peak, or null when it falls outside the window. */
  readonly transitHours: number | null;
}

/** Outermost arc radius, as a fraction of R; arcs stack inward from here. */
const ARC_OUTER = 0.845;
const ARC_STEP = 0.022;

export function drawPlanetArcs(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  arcs: readonly PlanetArc[],
): void {
  ctx.save();
  ctx.lineCap = "round";
  arcs.forEach((arc, i) => {
    const r = R * (ARC_OUTER - i * ARC_STEP);
    const color = PLANET_COLORS[arc.name] ?? "#9FA6B8";
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.6 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, r, hourToAngle(arc.riseHours), hourToAngle(arc.setHours));
    ctx.stroke();
    if (arc.transitHours !== null) {
      const p = pointOnCircle(hourToAngle(arc.transitHours), r);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.1 * dpr, 0, TAU);
      ctx.fill();
    }
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}
