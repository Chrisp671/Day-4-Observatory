/**
 * The 24-hour dial band: ticks, numerals, and the real day/night arcs.
 * Thin drawing layer over clockface.ts math; reads only FrameState-derived
 * values passed in (never calls the engine — SEAM-001).
 */
import { FACE, hourToAngle, pointOnCircle, TAU } from "./clockface";
import { THEME } from "./theme";

export interface DialTimes {
  /** Civil local hours-of-day of the next sunrise/sunset, or null (polar). */
  readonly riseHours: number | null;
  readonly setHours: number | null;
}

export function drawDial(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  times: DialTimes,
): void {
  const rOut = R * FACE.dialOuter;
  const rIn = R * FACE.dialInner;
  const rMid = (rOut + rIn) / 2;

  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = THEME.inkLow;
  ctx.globalAlpha = 0.9;
  for (const r of [rOut, rIn]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
  }

  // Night arc as ambience; rise/set encoded by SHAPE — full-band boundary
  // ticks — never by tint alone (DESIGN-CONSOLIDATED #2/#3: gold day-wash
  // deleted; the sun disc itself is the day indicator).
  if (times.riseHours !== null && times.setHours !== null) {
    ctx.lineWidth = rOut - rIn;
    ctx.lineCap = "butt";
    ctx.strokeStyle = THEME.night;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, rMid, hourToAngle(times.setHours), hourToAngle(times.riseHours + 24));
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const h of [times.riseHours, times.setHours]) {
      const a = hourToAngle(h);
      const inner = pointOnCircle(a, rIn - R * 0.012);
      const outer = pointOnCircle(a, rOut);
      ctx.lineWidth = 1.6 * dpr;
      ctx.strokeStyle = THEME.inkHi;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(outer.x, outer.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Three-level cadence (DESIGN-CONSOLIDATED #4): 6h major / hour / 30-min
  // minor at ≥2:1 length steps — rank by length and weight before opacity.
  ctx.font = `300 ${Math.round(R * 0.052)}px ${THEME.fontMono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const bandW = rOut - rIn;
  for (let i = 0; i < 48; i++) {
    const h = i / 2;
    const a = hourToAngle(h);
    const major = h % 6 === 0;
    const hourly = Number.isInteger(h);
    const innerR = major ? rIn - R * 0.012 : hourly ? rOut - bandW * 0.5 : rOut - bandW * 0.25;
    const inner = pointOnCircle(a, innerR);
    const outer = pointOnCircle(a, rOut);
    ctx.lineWidth = (major ? 1.4 : hourly ? 1.0 : 0.75) * dpr;
    ctx.strokeStyle = major ? THEME.inkHi : hourly ? THEME.inkMid : THEME.inkLow;
    ctx.globalAlpha = major ? 0.95 : hourly ? 0.9 : 1;
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.stroke();
    if (major) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = THEME.inkHi;
      const p = pointOnCircle(a, rIn - R * 0.055);
      ctx.fillText(String(h).padStart(2, "0"), p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}
