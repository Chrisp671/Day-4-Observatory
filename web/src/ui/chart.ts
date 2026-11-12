/**
 * The constellation chart (WI-032, REQ-015): one constellation on its own
 * page, the way an atlas shows it — north up, east to the left, the stars
 * where they stand, the figure's lines between them, the brightest named.
 *
 * The chart is drawn on its own round night disc (DEC-056): a map of what a
 * viewer will see after dark is painted in the dark, at noon as at midnight,
 * while the page around it keeps following the sun (DEC-010). Inside the
 * disc every dot is one of the chart's own stars; the page's firmament never
 * shows through it. The disc is not a horizon — the chart is a view about
 * the figure's centre, and where the figure is in the viewer's sky is said
 * in words beside it, from the Scene.
 *
 * Paints a Chart and nothing more. The projection is chart geometry (a
 * stereographic view about the figure's centre), not astronomy: no time, no
 * place, no altitude here.
 *
 * Words on this canvas are intended: this is the dedicated view DEC-038
 * reserves for readable names, not the clock dial. The names are set in
 * plain words (app/charts.ts starLabel), and placed by placeLabels so that
 * no two collide, none leaves the disc, and none runs into a compass letter.
 */
import { starLabel, type Chart, type ChartStar } from "../app/charts";
import { skyPalette } from "./sky";
import { THEME } from "./theme";

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** The compass letters' size in CSS px: the content floor of DEC-053. */
export const COMPASS_PX = 12;
/** The star names' size in CSS px, above the content floor (DEC-053). */
export const LABEL_PX = 13;
/** The box a name occupies, in CSS px: its line height. */
export const LABEL_H = 14;

/**
 * The disc's night: the deepest stop of the living sky, read from sky.ts so
 * the chart's dark and the page's astronomical night are one colour and
 * cannot drift apart. `field` fills the centre, `deep` the rim.
 */
export const CHART_NIGHT = ((): { readonly field: string; readonly deep: string } => {
  const night = skyPalette(-18);
  return { field: night.field, deep: night.deep };
})();

/** The rim: a thin quiet gold hairline, the app's gilding at a whisper. */
export const CHART_RIM = { color: THEME.sunlight, alpha: 0.5, width: 1 } as const;

/**
 * CSS px between the canvas edge and the disc's rim: the room the feathered
 * edge takes to blend into the page. The disc itself is opaque to the rim.
 */
export const DISC_INSET = 8;
/** CSS px kept clear between a name and the rim, or two names, or a letter. */
export const LABEL_GAP = 4;
/** CSS px from the rim to the inside of the star field: room for a glow, and
 * for the compass letters, which stand in this margin. */
export const FIELD_INSET = 22;

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
}

/** An axis-aligned box in CSS px about the chart's centre; `x`,`y` top-left. */
export interface ChartBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface ChartDisc {
  /** The filled disc's radius about (0, 0), CSS px. */
  readonly radius: number;
  /** CSS px beyond the rim over which the disc fades into the page. */
  readonly feather: number;
}

/** The disc for a chart `size` CSS px square. */
export function chartDisc(size: number): ChartDisc {
  return { radius: size / 2 - DISC_INSET, feather: DISC_INSET - 1 };
}

export interface CompassMark extends ChartBox {
  readonly letter: "N" | "E" | "W";
  /** Where the letter is set, centred on both axes. */
  readonly cx: number;
  readonly cy: number;
}

/**
 * North, east and west, standing just inside the rim in the margin the star
 * field leaves (north up, east left: an atlas page, not a horizon). Their
 * boxes are keep-outs for the names, sized for the widest letter so the
 * layout does not depend on the font that happens to load.
 */
export function compassMarks(disc: ChartDisc): readonly CompassMark[] {
  const r = disc.radius - FIELD_INSET / 2;
  const w = COMPASS_PX;
  const h = COMPASS_PX;
  const mark = (letter: "N" | "E" | "W", cx: number, cy: number): CompassMark =>
    ({ letter, cx, cy, x: cx - w / 2, y: cy - h / 2, w, h });
  return [mark("N", 0, -r), mark("E", -r, 0), mark("W", r, 0)];
}

export interface ChartLabel extends ChartBox {
  readonly text: string;
  /** Where the text is set: left edge, vertical middle. */
  readonly tx: number;
  readonly ty: number;
}

export interface LabelItem {
  readonly text: string;
  /** The star the name belongs to, and its disc radius. */
  readonly star: ChartPoint;
  readonly r: number;
}

export interface ChartProjection {
  /** Centre of the figure, degrees. */
  readonly ra0: number;
  readonly dec0: number;
  /** Canvas pixels per projected unit. */
  readonly scale: number;
  /** Map a sky position to canvas pixels about (0, 0). */
  project(raDeg: number, decDeg: number): ChartPoint;
}

/**
 * A stereographic projection about the figure's centre that fits every
 * star inside a circle of radius `size / 2 - pad` pixels. RA grows to the
 * left (east is left when you look up), north is up.
 */
export function chartProjection(chart: Chart, size: number, pad: number): ChartProjection {
  const pts = chart.stars.map((s) => [s.raDeg, s.decDeg] as const);
  // Centre: the mean direction vector, so a figure across RA 0h is not torn.
  let x = 0, y = 0, z = 0;
  for (const [ra, dec] of pts) {
    x += Math.cos(rad(dec)) * Math.cos(rad(ra));
    y += Math.cos(rad(dec)) * Math.sin(rad(ra));
    z += Math.sin(rad(dec));
  }
  const ra0 = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const dec0 = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI;
  const unit = (raDeg: number, decDeg: number): ChartPoint => {
    const dRa = rad(raDeg - ra0);
    const dec = rad(decDeg);
    const d0 = rad(dec0);
    const cosc = Math.sin(d0) * Math.sin(dec) + Math.cos(d0) * Math.cos(dec) * Math.cos(dRa);
    const k = 2 / (1 + cosc);
    return {
      x: -k * Math.cos(dec) * Math.sin(dRa),
      y: -k * (Math.cos(d0) * Math.sin(dec) - Math.sin(d0) * Math.cos(dec) * Math.cos(dRa)),
    };
  };
  let extent = 1e-6;
  for (const [ra, dec] of pts) {
    const p = unit(ra, dec);
    extent = Math.max(extent, Math.hypot(p.x, p.y));
  }
  const scale = Math.max(1, size / 2 - pad) / extent;
  return {
    ra0, dec0, scale,
    project: (raDeg, decDeg) => {
      const p = unit(raDeg, decDeg);
      return { x: p.x * scale, y: p.y * scale };
    },
  };
}

/** Star disc radius in CSS pixels from magnitude: bright and big, faint and small. */
export const starRadius = (mag: number): number => Math.max(1.1, 4.6 - mag * 0.7);

const overlaps = (a: ChartBox, b: ChartBox, gap: number): boolean =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

/** Half the chord the disc offers a box spanning `y0..y1`, less the gap; 0 when it offers none. */
const halfChord = (disc: ChartDisc, y0: number, y1: number): number => {
  const far = Math.max(Math.abs(y0), Math.abs(y1));
  const inside = disc.radius - LABEL_GAP;
  return far >= inside ? 0 : Math.sqrt(inside * inside - far * far);
};

/**
 * Set each name beside its star without any two colliding, without leaving
 * the disc, and clear of the `keepOut` boxes (the compass letters). Brightest
 * first, so the star a viewer looks for first gets the best seat. A name is
 * tried to the right of its star, then to the left, below and above, each at
 * a few line heights up or down; a seat is taken only where the whole box
 * lies inside the disc. If no seat is free as offered, the same seats are
 * tried again slid along the chord so the name fits, which may lay it over
 * its own star but never over another name, a letter, or the rim.
 */
export function placeLabels(
  items: readonly LabelItem[],
  disc: ChartDisc,
  keepOut: readonly ChartBox[],
  measure: (text: string) => number,
): ChartLabel[] {
  const placed: ChartLabel[] = [];
  const free = (box: ChartBox): boolean =>
    placed.every((q) => !overlaps(box, q, LABEL_GAP)) && keepOut.every((q) => !overlaps(box, q, LABEL_GAP));
  for (const item of items) {
    const w = measure(item.text);
    const h = LABEL_H;
    const { star, r } = item;
    const seats: readonly ChartPoint[] = [
      { x: star.x + r + 6, y: star.y - h / 2 },
      { x: star.x - r - 6 - w, y: star.y - h / 2 },
      { x: star.x - w / 2, y: star.y + r + 3 },
      { x: star.x - w / 2, y: star.y - r - 3 - h },
    ];
    // Rows to try, nearest the star first: a few either side as offered, and
    // when sliding, every row of the disc, so a long name near the rim walks
    // in to where the chord is wide enough rather than giving up.
    const rows = Math.ceil(disc.radius / h);
    const near = [0, 1, -1, 2, -2, 3, -3];
    const all = [0, ...Array.from({ length: rows }, (_, i) => [i + 1, -(i + 1)]).flat()];
    let seat: ChartBox | null = null;
    for (const slide of [false, true]) {
      for (const n of slide ? all : near) {
        for (const s of seats) {
          const y = s.y + n * h;
          const c = halfChord(disc, y, y + h);
          if (w > 2 * c) continue;
          let x = s.x;
          if (slide) x = Math.min(Math.max(x, -c), c - w);
          else if (x < -c || x + w > c) continue;
          const box = { x, y, w, h };
          if (free(box)) {
            seat = box;
            break;
          }
        }
        if (seat !== null) break;
      }
      if (seat !== null) break;
    }
    if (seat === null) {
      // Nowhere at all: the centre row, slid to fit; chart.test.ts holds
      // that no chart the app carries ever reaches this line.
      const c = halfChord(disc, -h / 2, h / 2);
      seat = { x: Math.min(Math.max(star.x - w / 2, -c), c - w), y: -h / 2, w, h };
    }
    placed.push({ ...seat, text: item.text, tx: seat.x, ty: seat.y + h / 2 });
  }
  return placed;
}

/** Everything the painter sets on a `size` CSS px chart, in CSS px about its centre. */
export interface ChartLayout {
  readonly disc: ChartDisc;
  readonly projection: ChartProjection;
  readonly compass: readonly CompassMark[];
  readonly labels: readonly ChartLabel[];
}

/** The layout for a chart `size` CSS px square; `measure` gives a name's width. */
export function layoutChart(chart: Chart, size: number, measure: (text: string) => number): ChartLayout {
  const disc = chartDisc(size);
  const projection = chartProjection(chart, size, DISC_INSET + FIELD_INSET);
  const compass = compassMarks(disc);
  const items: LabelItem[] = chart.stars
    .filter((s: ChartStar) => s.name !== "")
    .map((s) => ({ text: starLabel(s.name, chart), star: projection.project(s.raDeg, s.decDeg), r: starRadius(s.mag) }));
  return { disc, projection, compass, labels: placeLabels(items, disc, compass, measure) };
}

/** "r,g,b" from a #rrggbb token, for an rgba() with its own alpha. */
const channels = (hex: string): string =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");

/** Draw the chart on a `W`×`W` device-pixel canvas, already cleared. */
export function drawChart(
  ctx: CanvasRenderingContext2D,
  W: number,
  dpr: number,
  chart: Chart,
): void {
  const size = W / dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, W / 2, W / 2);
  ctx.font = `italic 600 ${LABEL_PX}px ${THEME.fontSerif}`;
  const { disc, projection: proj, compass, labels } = layoutChart(chart, size, (text) => ctx.measureText(text).width);

  // The night disc: the field at the centre deepening to the rim, opaque to
  // the rim, then feathered into whatever light the page is in.
  const R = disc.radius;
  const outer = R + disc.feather;
  const night = ctx.createRadialGradient(0, 0, 0, 0, 0, outer);
  night.addColorStop(0, CHART_NIGHT.field);
  night.addColorStop(R / outer, CHART_NIGHT.deep);
  night.addColorStop(1, `rgba(${channels(CHART_NIGHT.deep)},0)`);
  ctx.fillStyle = night;
  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.lineWidth = CHART_RIM.width;
  ctx.strokeStyle = `rgba(${channels(CHART_RIM.color)},${CHART_RIM.alpha})`;
  ctx.stroke();

  // The figure: hairlines in mid ink, joined and rounded like a drawn line.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = THEME.inkMid;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.1;
  for (const poly of chart.lines) {
    ctx.beginPath();
    poly.forEach(([ra, dec], i) => {
      const p = proj.project(ra, dec);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // The stars, faint first so the bright ones sit on top. Full brightness at
  // any hour: the disc is night whatever the page is doing.
  const stars = [...chart.stars].reverse();
  for (const s of stars) {
    const p = proj.project(s.raDeg, s.decDeg);
    const r = starRadius(s.mag);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = THEME.inkHi;
    ctx.fill();
    if (s.mag < 1.5) {
      // A bright star breathes a little.
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${channels(THEME.inkHi)},0.18)`;
      ctx.fill();
    }
  }

  // The names, in plain words, where placeLabels seated them, each on a
  // halo of the disc's own deep so a line through it does not cut the word.
  ctx.font = `italic 600 ${LABEL_PX}px ${THEME.fontSerif}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  for (const l of labels) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(${channels(CHART_NIGHT.deep)},0.85)`;
    ctx.strokeText(l.text, l.tx, l.ty);
    ctx.fillStyle = "#F3ECDA";
    ctx.fillText(l.text, l.tx, l.ty);
  }

  // The compass letters inside the rim: north up, east left. Set in the high
  // ink at the content floor (DEC-053): a visitor orients the chart against
  // the "look southwest" line below it, so these are readouts, not decoration.
  ctx.font = `600 ${COMPASS_PX}px ${THEME.fontCaps}`;
  ctx.fillStyle = THEME.inkHi;
  ctx.textAlign = "center";
  for (const m of compass) ctx.fillText(m.letter, m.cx, m.cy);
  ctx.restore();
}
