/**
 * Earth at the face center — a TRUE equatorial-orthographic graticule
 * (DESIGN-CONSOLIDATED #7): in this projection parallels are straight
 * horizontal chords at y = r·sin(lat) and meridians are half-ellipses of
 * rx = r·sin(lon). The tropics sit at ±23.44°. Weight hierarchy per the
 * Wilson-globe rule: the limb is strongest; one curve family mid-weight,
 * the other hairline. Night hemisphere is one crisp clipped shape — the
 * old "softener" ellipse (an airbrush in disguise) is gone.
 *
 * Paints SceneEarth: only where the sun stands on the dial, in hours. The
 * night hemisphere faces away from it; the globe knows no clock and no
 * station beyond that.
 */
import { FACE, hourToAngle, TAU } from "./clockface";
import { THEME } from "./theme";
import type { SceneEarth } from "../app/scene";

/** The obliquity the graticule is drawn at (DESIGN-CONSOLIDATED #7). */
export const TROPIC_LAT_DEG = 23.44;

/**
 * A parallel of latitude φ on an orthographic disc is a straight horizontal
 * chord sitting at y = r·sin(φ) and running to x = ±r·cos(φ) — which is to say
 * its two ends lie exactly on the limb, because y² + x² = r². The tropics are
 * the two chords at ±TROPIC_LAT_DEG.
 */
export function tropicChord(r: number, south = false): { y: number; halfChord: number } {
  const lat = (TROPIC_LAT_DEG * Math.PI) / 180;
  const y = (south ? -1 : 1) * r * Math.sin(lat);
  return { y, halfChord: r * Math.cos(lat) };
}

/**
 * A meridian at longitude λ projects to an ellipse of semi-axes r·sin(λ) across
 * and r·down, so a family of them at 30° and 60° is 0.5r and 0.866r wide. The
 * east and west halves of the same meridian are one ellipse, not two.
 */
export function meridianHalfWidth(r: number, lonDeg: number): number {
  return r * Math.sin((lonDeg * Math.PI) / 180);
}

export function drawEarth(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  earth: SceneEarth,
): void {
  const r = R * FACE.earth;
  const sunDialAngleRad = hourToAngle(earth.sunHours);

  // Limb — strongest line on the body.
  ctx.lineWidth = 1.9 * dpr;
  ctx.strokeStyle = THEME.inkHi;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();

  // Equator and central meridian — mid-weight.
  ctx.lineWidth = 1.1 * dpr;
  ctx.strokeStyle = THEME.inkMid;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();

  // Tropics: straight chords whose ends lie on the limb — hairline.
  ctx.lineWidth = 0.8 * dpr;
  ctx.strokeStyle = THEME.inkMid;
  ctx.globalAlpha = 0.5;
  for (const south of [false, true]) {
    const { y, halfChord } = tropicChord(r, south);
    ctx.beginPath();
    ctx.moveTo(-halfChord, y);
    ctx.lineTo(halfChord, y);
    ctx.stroke();
  }

  // Meridians at ±30° and ±60°: one half-ellipse each — hairline.
  for (const lonDeg of [30, 60]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, meridianHalfWidth(r, lonDeg), r, 0, 0, TAU);
    ctx.stroke();
  }

  // Night hemisphere: one crisp analytic shape, away from the sun.
  ctx.rotate(sunDialAngleRad + Math.PI);
  ctx.fillStyle = THEME.shadow;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
