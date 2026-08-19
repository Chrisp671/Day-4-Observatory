/**
 * The fiducial: a cross on the band marking the hour the observer is actually
 * living in.
 *
 * An astrolabe carries a fiducial — a fixed reference mark you read positions
 * against. Here it marks the present. Scrub the sun forward and the sun leaves
 * the cross behind, so the distance between them *is* how far you have
 * travelled from now; live, the two sit together.
 */
import { FACE, hourToAngle, pointOnCircle } from "./clockface";
import { THEME } from "./theme";

/** Hours of travel between the displayed time and the present, in [-12, 12). */
export function travelHours(displayedHours: number, nowHours: number): number {
  return ((((displayedHours - nowHours) % 24) + 36) % 24) - 12;
}

/** Below a minute apart the cross and the sun are the same moment. */
export const AT_PRESENT_HOURS = 1 / 60;

export const isAtPresent = (displayedHours: number, nowHours: number): boolean =>
  Math.abs(travelHours(displayedHours, nowHours)) < AT_PRESENT_HOURS;

/**
 * Draw the cross at `nowHours` on the dial band. When the instrument is live
 * the sun already sits here, so the mark stays quiet; once time has been
 * scrubbed it brightens — it is the way home.
 */
export function drawFiducial(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  nowHours: number,
  displayedHours: number,
): void {
  const travelled = !isAtPresent(displayedHours, nowHours);
  const a = hourToAngle(nowHours);
  const rOut = R * FACE.dialOuter;
  const rIn = R * FACE.dialInner;
  // The mark rides just outside the rim: live, the sun sits under it rather
  // than beneath it, so neither obscures the other.
  const band = rOut - rIn;
  const centre = pointOnCircle(a, rOut + band * 0.62);
  const arm = band * 0.5;

  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(a + Math.PI / 2); // stand the cross upright on the band
  ctx.lineCap = "round";
  ctx.lineWidth = (travelled ? 2 : 1.4) * dpr;
  ctx.strokeStyle = travelled ? THEME.sunlight : THEME.inkHi;
  ctx.globalAlpha = travelled ? 0.95 : 0.55;

  // A Latin cross, its long arm reaching down to the band it marks.
  ctx.beginPath();
  ctx.moveTo(0, -arm * 0.85);
  ctx.lineTo(0, arm * 1.35);
  ctx.moveTo(-arm * 0.6, -arm * 0.2);
  ctx.lineTo(arm * 0.6, -arm * 0.2);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}
