/**
 * Seeded star field — still, like a print; never shimmers between frames.
 */
import { TAU } from "./clockface";
import { THEME } from "./theme";

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  readonly angle: number;
  readonly radiusFrac: number;
  readonly size: number;
  readonly opacity: number;
}

const rnd = mulberry32(1826);
const STARS: readonly Star[] = Array.from({ length: 110 }, () => ({
  angle: rnd() * TAU,
  radiusFrac: 0.42 + rnd() * 0.62,
  size: rnd() < 0.14 ? 2.0 : 1.1,
  opacity: 0.4 + rnd() * 0.5,
}));

export function drawStars(
  ctx: CanvasRenderingContext2D,
  faceRadius: number,
  dpr: number,
  visibility = 1,
): void {
  if (visibility < 0.02) return; // daylight: the stars are still there — unseen
  for (const s of STARS) {
    ctx.globalAlpha = s.opacity * visibility;
    ctx.fillStyle = THEME.inkMid;
    ctx.beginPath();
    ctx.arc(
      Math.cos(s.angle) * s.radiusFrac * faceRadius * 1.06,
      Math.sin(s.angle) * s.radiusFrac * faceRadius * 1.06,
      s.size * dpr * 0.7,
      0,
      TAU,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
