/**
 * The fiducial: the mark holding the hour the observer is actually living in.
 *
 * An astrolabe carries a fiducial — a fixed reference you read positions
 * against. Scrub the sun forward and it leaves this mark behind, so the gap
 * between them *is* how far you have travelled; live, the two sit together.
 *
 * It is a gnomon, not a cross. The cross belongs to the axis and to the sixth
 * hour (DEC-022); an index that says "you are here at 7pm" is a pointer, and
 * a pointer is all it should look like.
 *
 * Paints SceneMarks: the present hour and whether the viewer has travelled.
 * Deciding "travelled" belongs to the Scene; travelHours and isAtPresent stay
 * exported as the pure rule it applies, pinned by test.
 */
import { FACE, hourToAngle, pointOnCircle } from "./clockface";
import { THEME } from "./theme";
import type { SceneMarks } from "../app/scene";

export function drawFiducial(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  marks: SceneMarks,
): void {
  const { travelled } = marks;
  const a = hourToAngle(marks.nowHours);
  const rOut = R * FACE.dialOuter;
  const rIn = R * FACE.dialInner;
  // The mark rides just outside the rim: live, the sun sits under it rather
  // than beneath it, so neither obscures the other.
  const band = rOut - rIn;
  const centre = pointOnCircle(a, rOut + band * 0.62);
  const arm = band * 0.5;

  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(a + Math.PI / 2); // the gnomon points along the radius
  ctx.fillStyle = travelled ? THEME.sunlight : THEME.inkHi;
  ctx.globalAlpha = travelled ? 0.95 : 0.7;

  // A plain index: a wedge aimed at the hour it marks.
  ctx.beginPath();
  ctx.moveTo(0, arm * 0.95);
  ctx.lineTo(-arm * 0.72, -arm * 0.62);
  ctx.lineTo(arm * 0.72, -arm * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
