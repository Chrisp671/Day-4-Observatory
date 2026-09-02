/**
 * The planet up-arcs — "the rings are a nice visual cue to show me how long
 * something is gonna be up" (Parker, DEC-031; the original's most-loved
 * element, archived in analysis/observatory/original-app).
 *
 * Five thin arcs just inside the dial band, each spanning the hours its
 * planet is above the horizon this calendar day. Each arc sits on a dark
 * keel so it reads against the field at phone size, carries a gold diamond
 * at its peak, and — when there is room — its planet's name set along the
 * arc from the rise end. The colours stay within the design law — colour
 * only where the sky provides it (DEC-008) — because these ARE the planets'
 * sky colours, muted: Mercury dusk-grey, Venus brilliant white, Mars rust,
 * Jupiter cream, Saturn pale gold.
 */
import { hourToAngle, pointOnCircle } from "./clockface";
import { goldLeaf, THEME } from "./theme";

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
export const ARC_OUTER = 0.76;
/** Radial step inward per planet, as a fraction of R. */
export const ARC_STEP = 0.022;

/** Arcs shorter than this (hours) get no name label — there is no room. */
const LABEL_MIN_SPAN_H = 2.5;
/** Label starts this far (hours) after rise, or 18% of the span if shorter. */
const LABEL_LEAD_H = 1.6;

const KEEL = "rgba(4,10,22,0.55)";
const KEEL_DEEP = "rgba(4,10,22,0.8)";
const FALLBACK_COLOR = "#9FA6B8";

/** Radius of the i-th arc (0 = outermost) for a face of radius R. */
export function arcRadius(i: number, R: number): number {
  return R * (ARC_OUTER - i * ARC_STEP);
}

/**
 * The order of the spheres, outward from the Earth at the centre: Moon
 * (innermost, on its own orbit), then Mercury, Venus, Mars, Jupiter, Saturn,
 * with the Sun on the band outside them all — the classical sequence an
 * astrolabe carries, and the order Parker recited on the call. Each planet
 * keeps its own ring whether or not its neighbours rise that day.
 */
export const RING_ORDER: readonly string[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

/** Radius of a planet's ring by name: Saturn outermost, Mercury innermost. */
export function ringRadius(name: string, R: number): number {
  const k = RING_ORDER.indexOf(name);
  return arcRadius(k < 0 ? RING_ORDER.length - 1 : RING_ORDER.length - 1 - k, R);
}

/** Hours the planet is up, allowing for a set that falls after midnight. */
function spanHours(rise: number, set: number): number {
  return (((set - rise) % 24) + 24) % 24;
}

/**
 * Hours-of-day at which the rise-end label is centred, or null when the arc
 * is too short to carry a label. Wraps to [0, 24).
 */
export function labelHours(rise: number, set: number): number | null {
  const span = spanHours(rise, set);
  if (span < LABEL_MIN_SPAN_H) return null;
  const lead = Math.min(LABEL_LEAD_H, span * 0.18);
  return (((rise + lead) % 24) + 24) % 24;
}

/**
 * Set `text` along a circle of radius `r`, centred on `centreAngle`, one
 * character at a time with each glyph rotated to the local tangent. Glyphs
 * on the lower half of the dial (sin > 0) are flipped and walked backwards
 * so the word still reads left-to-right, right way up.
 */
function textAlongArc(
  ctx: CanvasRenderingContext2D,
  text: string,
  r: number,
  centreAngle: number,
  px: number,
  dpr: number,
): void {
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  // Letter-spacing scales with the type size; dpr keeps a floor on hi-res.
  const tracking = Math.max(0.12 * px, 0.6 * dpr);
  const total = widths.reduce((a, w) => a + w, 0) + tracking * (chars.length - 1);
  const flip = Math.sin(centreAngle) > 0;
  const dir = flip ? -1 : 1;
  // Walk from the leading edge of the word, advancing by each glyph's width.
  let along = -total / 2;
  chars.forEach((c, k) => {
    const w = widths[k] ?? 0;
    const theta = centreAngle + (dir * (along + w / 2)) / r;
    const p = pointOnCircle(theta, r);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(theta + Math.PI / 2 + (flip ? Math.PI : 0));
    ctx.fillText(c, 0, 0);
    ctx.restore();
    along += w + tracking;
  });
}

/** A small radially-aligned diamond, centred on the arc at `angle`. */
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

/** Labels closer than this (hours) on neighbouring arcs would overprint. */
const LABEL_CLEAR_H = 1.5;

/**
 * Label positions for a set of arcs, pushed apart so that no two names sit
 * on the same angle of the dial — two planets rising together would
 * otherwise print one word over the other on adjacent radii.
 */
export function labelPlan(arcs: readonly PlanetArc[]): (number | null)[] {
  const placed: number[] = [];
  return arcs.map((arc) => {
    let lh = labelHours(arc.riseHours, arc.setHours);
    if (lh === null) return null;
    const set = arc.setHours;
    const room = spanHours(lh, set) - 1; // keep the word inside the arc
    let pushed = 0;
    const clash = (h: number): boolean =>
      placed.some((p) => Math.min(spanHours(p, h), spanHours(h, p)) < LABEL_CLEAR_H);
    while (clash(lh) && pushed + LABEL_CLEAR_H <= room) {
      lh = (lh + LABEL_CLEAR_H) % 24;
      pushed += LABEL_CLEAR_H;
    }
    placed.push(lh);
    return lh;
  });
}

export function drawPlanetArcs(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  arcs: readonly PlanetArc[],
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.globalAlpha = 1;

  const labels = labelPlan(arcs);
  arcs.forEach((arc, i) => {
    const r = ringRadius(arc.name, R);
    const color = PLANET_COLORS[arc.name] ?? FALLBACK_COLOR;
    const a0 = hourToAngle(arc.riseHours);
    const a1 = hourToAngle(arc.setHours);

    // Keel: a dark bed under the colour so it holds against the field.
    ctx.globalAlpha = 1;
    ctx.strokeStyle = KEEL;
    ctx.lineWidth = 4.2 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();

    // The planet's own colour on top.
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();

    // Peak mark: a gold diamond, long axis radial, on a dark keel diamond.
    if (arc.transitHours !== null) {
      const ta = hourToAngle(arc.transitHours);
      const halfLong = R * 0.014;
      const halfWide = R * 0.009;
      const py = pointOnCircle(ta, r).y;
      ctx.globalAlpha = 1;
      ctx.fillStyle = KEEL_DEEP;
      diamond(ctx, ta, r, halfLong + 1.2 * dpr, halfWide + 1.2 * dpr);
      ctx.fillStyle = goldLeaf(ctx, py - halfLong, py + halfLong);
      diamond(ctx, ta, r, halfLong, halfWide);
    }

    // Rise-end name, set along the arc.
    const lh = labels[i] ?? null;
    if (lh !== null) {
      const px = 8.4 * dpr;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.font = `600 ${px}px ${THEME.fontCaps}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(4,10,22,0.9)";
      ctx.shadowBlur = 3 * dpr;
      textAlongArc(ctx, arc.name.toUpperCase(), r, hourToAngle(lh), px, dpr);
      ctx.restore();
    }
  });

  ctx.restore();
  ctx.globalAlpha = 1;
}
