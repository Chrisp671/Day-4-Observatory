/**
 * The 24-hour dial band: ticks, numerals, and the real day/night arcs.
 * Thin drawing layer over clockface.ts math; reads only FrameState-derived
 * values passed in (never calls the engine — SEAM-001).
 */
import { FACE, hourToAngle, pointOnCircle, TAU } from "./clockface";
import { goldLeaf, THEME } from "./theme";

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

  ctx.lineWidth = 1.3 * dpr;
  ctx.strokeStyle = goldLeaf(ctx, -rOut, rOut);
  ctx.globalAlpha = 0.95;
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
    // Night is DARKER than the field, day is LIGHTER: a value ladder, so the
    // day/night read survives without spending a hue on it.
    ctx.strokeStyle = THEME.shadow;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(0, 0, rMid, hourToAngle(times.setHours), hourToAngle(times.riseHours + 24));
    ctx.stroke();
    ctx.strokeStyle = THEME.inkHi;
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, rMid, hourToAngle(times.riseHours), hourToAngle(times.setHours));
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Twilight (DEC-009): the band warms through amber around each boundary
    // — the sky's actual dawn/dusk colors, and the Prussian blue's
    // complementary partner. Alpha peaks at the boundary and fades over
    // ~75 minutes each side.
    const TWILIGHT_SPAN_HOURS = 1.25;
    const TWILIGHT_STEPS = 24;
    ctx.lineWidth = rOut - rIn;
    ctx.strokeStyle = THEME.dawn;
    for (const boundary of [times.riseHours, times.setHours]) {
      for (let i = 0; i < TWILIGHT_STEPS; i++) {
        const t0 = -1 + (2 * i) / TWILIGHT_STEPS;
        const t1 = -1 + (2 * (i + 1)) / TWILIGHT_STEPS;
        const mid = (t0 + t1) / 2;
        ctx.globalAlpha = 0.38 * (1 - Math.abs(mid)) ** 1.5;
        ctx.beginPath();
        ctx.arc(
          0, 0, rMid,
          hourToAngle(boundary + t0 * TWILIGHT_SPAN_HOURS),
          hourToAngle(boundary + t1 * TWILIGHT_SPAN_HOURS),
        );
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const h of [times.riseHours, times.setHours]) {
      const a = hourToAngle(h);
      const inner = pointOnCircle(a, rIn - R * 0.012);
      const outer = pointOnCircle(a, rOut);
      ctx.lineWidth = 1.8 * dpr;
      ctx.strokeStyle = goldLeaf(ctx, -rOut, rOut);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(outer.x, outer.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Three-level cadence (DESIGN-CONSOLIDATED #4): 6h major / hour / 30-min
  // minor at ≥2:1 length steps — rank by length and weight before opacity.
  ctx.font = `600 ${Math.round(R * 0.058)}px ${THEME.fontCaps}`;
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
    ctx.strokeStyle = major ? goldLeaf(ctx, -rOut, rOut) : hourly ? THEME.inkMid : THEME.inkLow;
    ctx.globalAlpha = major ? 0.95 : hourly ? 0.9 : 1;
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.stroke();
    if (major) {
      ctx.globalAlpha = 1;
      const p = pointOnCircle(a, rIn - R * 0.062);
      ctx.fillStyle = goldLeaf(ctx, p.y - R * 0.04, p.y + R * 0.04);
      ctx.fillText(String(h).padStart(2, "0"), p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}
