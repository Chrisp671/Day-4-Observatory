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
 * Weight is honest: a ring whose planet is up after dark is bright; a
 * daytime-only planet's ring is faint. Tap a name in the ledger and that one
 * ring is lit while the others fall back — the original's tap-to-switch
 * habit, with no control added.
 *
 * The colours stay within the design law — colour only where the sky
 * provides it (DEC-008) — because these ARE the planets' sky colours, muted:
 * Mercury dusk-grey, Venus brilliant white, Mars rust, Jupiter cream,
 * Saturn pale gold.
 */
import { hourToAngle, pointOnCircle } from "./clockface";
import { goldLeaf } from "./theme";

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
  /** Hours of real night (sun below the horizon) the planet is up. */
  readonly nightHours: number;
}

/**
 * The order of the spheres outward from the Sun's band: Mercury nearest,
 * Saturn farthest. Each planet keeps its own ring whether or not its
 * neighbours rise that day.
 */
export const RING_ORDER: readonly string[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

/** First ring, as a fraction of R (the band's face radius); leaves a gap for
 * the gnomon, the noon diamond and the standing cross. */
export const RING_BASE = 1.14;
/** Radial step outward per ring, as a fraction of R. */
export const RING_STEP = 0.042;
/** Outer edge of the rete, for the ground disc and the canvas fit. */
export const RETE_OUTER = RING_BASE + (RING_ORDER.length - 1) * RING_STEP + 0.02;

/** Radius of a planet's ring by name: Mercury innermost, Saturn outermost. */
export function ringRadius(name: string, R: number): number {
  const k = RING_ORDER.indexOf(name);
  return R * (RING_BASE + (k < 0 ? 0 : k) * RING_STEP);
}

/** Hours the planet is up, allowing for a set that falls after midnight. */
const spanHours = (rise: number, set: number): number => (((set - rise) % 24) + 24) % 24;

/**
 * Hours of real night inside an up-window: the overlap of [rise, set] with
 * the night that runs from this day's sunset to the next sunrise. Pure, so
 * the honest-weight rule is testable. Polar days and nights pass null and
 * get the whole window (night) or none of it (day).
 */
export function nightOverlapHours(
  rise: number,
  set: number,
  dayRise: number | null,
  daySet: number | null,
): number {
  const up = spanHours(rise, set);
  if (dayRise === null || daySet === null) return dayRise === null && daySet === null ? up : 0;
  const nightLen = spanHours(daySet, dayRise);
  // Walk the up-window in 6-minute steps and count those inside the night.
  const STEP = 0.1;
  let total = 0;
  for (let h = 0; h < up; h += STEP) {
    if (spanHours(daySet, (rise + h) % 24) < nightLen) total += STEP;
  }
  return Math.min(up, total);
}

/** A ring counts as "tonight's" when it is up at least this long after dark. */
export const NIGHT_MIN_HOURS = 1;

const KEEL = "rgba(4,10,22,0.55)";
const KEEL_DEEP = "rgba(4,10,22,0.8)";
const FALLBACK_COLOR = "#9FA6B8";

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

export interface ReteOptions {
  /** The one ring lit by a tap, or null for honest weights all round. */
  readonly lit: string | null;
}

export function drawPlanetArcs(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  arcs: readonly PlanetArc[],
  options: ReteOptions = { lit: null },
): void {
  ctx.save();
  ctx.lineCap = "round";

  for (const arc of arcs) {
    const r = ringRadius(arc.name, R);
    const color = PLANET_COLORS[arc.name] ?? FALLBACK_COLOR;
    const a0 = hourToAngle(arc.riseHours);
    const a1 = hourToAngle(arc.setHours);
    const isLit = options.lit === arc.name;
    const tonight = arc.nightHours >= NIGHT_MIN_HOURS;
    // Honest weight, unless one ring is lit: then it leads and the rest yield.
    const alpha = options.lit === null ? (tonight ? 0.92 : 0.32) : isLit ? 1 : 0.24;
    const width = isLit ? 3.2 : 2.2;

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
      ctx.shadowColor = color;
      ctx.shadowBlur = 6 * dpr;
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();
    ctx.restore();

    // Peak mark: a gold diamond, long axis radial, on a dark keel diamond.
    if (arc.transitHours !== null) {
      const ta = hourToAngle(arc.transitHours);
      const halfLong = R * 0.016;
      const halfWide = R * 0.010;
      const py = pointOnCircle(ta, r).y;
      ctx.globalAlpha = options.lit === null || isLit ? 1 : 0.35;
      ctx.fillStyle = KEEL_DEEP;
      diamond(ctx, ta, r, halfLong + 1.2 * dpr, halfWide + 1.2 * dpr);
      ctx.fillStyle = goldLeaf(ctx, py - halfLong, py + halfLong);
      diamond(ctx, ta, r, halfLong, halfWide);
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}
