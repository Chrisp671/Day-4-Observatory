/**
 * Earth at the face center — a TRUE equatorial-orthographic graticule
 * (DESIGN-CONSOLIDATED #7): in this projection parallels are straight
 * horizontal chords at y = r·sin(lat) and meridians are half-ellipses of
 * rx = r·sin(lon). The tropics sit at ±23.44°. Weight hierarchy per the
 * Wilson-globe rule: the limb is strongest; one curve family mid-weight,
 * the other hairline. Night hemisphere is one crisp clipped shape — the
 * old "softener" ellipse (an airbrush in disguise) is gone.
 */
import { FACE, TAU } from "./clockface";
import { THEME } from "./theme";

const TROPIC_SIN = Math.sin((23.44 * Math.PI) / 180); // ≈ 0.398

export function drawEarth(
  ctx: CanvasRenderingContext2D,
  R: number,
  dpr: number,
  sunDialAngleRad: number,
): void {
  const r = R * FACE.earth;

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

  // Tropics: straight chords at y = ±r·sin(23.44°) — hairline.
  ctx.lineWidth = 0.8 * dpr;
  ctx.strokeStyle = THEME.inkMid;
  ctx.globalAlpha = 0.5;
  for (const s of [-1, 1]) {
    const y = s * r * TROPIC_SIN;
    const halfChord = Math.sqrt(Math.max(0, r * r - y * y));
    ctx.beginPath();
    ctx.moveTo(-halfChord, y);
    ctx.lineTo(halfChord, y);
    ctx.stroke();
  }

  // Meridians at ±30° and ±60°: half-ellipses rx = r·sin(lon) — hairline.
  for (const lonDeg of [30, 60]) {
    const rx = r * Math.sin((lonDeg * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, r, 0, 0, TAU);
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
