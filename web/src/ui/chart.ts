/**
 * The constellation chart (WI-032, REQ-015): one constellation on its own
 * page, the way an atlas shows it — north up, east to the left, the stars
 * where they stand, the figure's lines between them, the brightest named.
 *
 * Paints a Chart and nothing more. The projection is chart geometry (a
 * stereographic view about the figure's centre), not astronomy: no time, no
 * place, no altitude here. Where the constellation is in the viewer's sky is
 * said in words beside the chart, from the Scene.
 *
 * Words on this canvas are intended: this is the dedicated view DEC-038
 * reserves for readable names, not the clock dial.
 */
import type { Chart, ChartStar } from "../app/charts";
import { THEME } from "./theme";

const rad = (deg: number): number => (deg * Math.PI) / 180;

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
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
 * star inside a square of `size` pixels with `pad` pixels of margin. RA
 * grows to the left (east is left when you look up), north is up.
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
    extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y));
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

/** Draw the chart on a `W`×`W` device-pixel canvas, already cleared. */
export function drawChart(
  ctx: CanvasRenderingContext2D,
  W: number,
  dpr: number,
  chart: Chart,
): void {
  const size = W / dpr;
  const proj = chartProjection(chart, size, 34);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, W / 2, W / 2);

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

  // The stars, faint first so the bright ones sit on top.
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
      ctx.fillStyle = "rgba(231,240,250,0.18)";
      ctx.fill();
    }
  }

  // The names: set beside their stars, pushed apart if two would collide.
  const named = chart.stars.filter((s: ChartStar) => s.name !== "");
  ctx.font = `italic 600 13px ${THEME.fontSerif}`;
  ctx.textBaseline = "middle";
  const placed: { x: number; y: number; w: number }[] = [];
  for (const s of named) {
    const p = proj.project(s.raDeg, s.decDeg);
    const w = ctx.measureText(s.name).width;
    const r = starRadius(s.mag);
    // Prefer to the right; fall to the left near the right edge.
    let x = p.x + r + 6;
    let align: CanvasTextAlign = "left";
    if (x + w > size / 2 - 6) {
      x = p.x - r - 6;
      align = "right";
    }
    let y = p.y;
    for (const q of placed) {
      const x0 = align === "left" ? x : x - w;
      if (Math.abs(q.y - y) < 14 && x0 < q.x + q.w && x0 + w > q.x) y = q.y + 14;
    }
    placed.push({ x: align === "left" ? x : x - w, y, w });
    ctx.textAlign = align;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(8,22,39,0.85)";
    ctx.strokeText(s.name, x, y);
    ctx.fillStyle = "#F3ECDA";
    ctx.fillText(s.name, x, y);
  }

  // Cardinal reminders in the corners: north up, east left.
  ctx.font = `600 9px ${THEME.fontCaps}`;
  ctx.fillStyle = THEME.inkMid;
  ctx.globalAlpha = 0.8;
  ctx.textAlign = "center";
  ctx.fillText("N", 0, -size / 2 + 12);
  ctx.textAlign = "left";
  ctx.fillText("E", -size / 2 + 8, 0);
  ctx.textAlign = "right";
  ctx.fillText("W", size / 2 - 8, 0);
  ctx.restore();
}
