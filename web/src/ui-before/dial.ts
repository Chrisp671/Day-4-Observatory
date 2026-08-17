/**
 * The 24-hour dial band: ticks, numerals, and the real day/night arcs.
 * Thin drawing layer over clockface.ts math; reads only FrameState-derived
 * values passed in (never calls the engine — SEAM-001).
 */
import { FACE, hourToAngle, pointOnCircle, TAU } from "../ui/clockface";
import { THEME } from "../ui/theme";

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

  // Day and night arcs across the band, from the engine's real rise/set.
  if (times.riseHours !== null && times.setHours !== null) {
    ctx.lineWidth = rOut - rIn;
    ctx.lineCap = "butt";
    ctx.strokeStyle = THEME.night;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, rMid, hourToAngle(times.setHours), hourToAngle(times.riseHours + 24));
    ctx.stroke();
    ctx.strokeStyle = THEME.sunlight;
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(0, 0, rMid, hourToAngle(times.riseHours), hourToAngle(times.setHours));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Ticks and six-hour numerals.
  ctx.font = `300 ${Math.round(R * 0.052)}px ${THEME.fontMono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let h = 0; h < 24; h++) {
    const a = hourToAngle(h);
    const major = h % 6 === 0;
    const inner = pointOnCircle(a, major ? rIn - R * 0.012 : rIn);
    const outer = pointOnCircle(a, rOut);
    ctx.lineWidth = (major ? 1.4 : 0.7) * dpr;
    ctx.strokeStyle = major ? THEME.inkHi : THEME.inkMid;
    ctx.globalAlpha = major ? 0.95 : 0.55;
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.stroke();
    if (major) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = THEME.inkMid;
      const p = pointOnCircle(a, rIn - R * 0.055);
      ctx.fillText(String(h).padStart(2, "0"), p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}
