/**
 * The firmament (DEC-011): the page's background IS the night sky.
 *
 * A full-viewport seeded scene — the Milky Way as a soft luminous river,
 * field stars on a real magnitude law (many faint, few bright), the
 * brightest drawn as chart-star glyphs — all multiplied by the living-sky
 * star visibility, plus a warm horizon glow that rises from the bottom of
 * the page at dawn and dusk. Deterministic; redrawn only when the light
 * changes, never animated. "The heavens declare" — so the page holds them.
 */
import { THEME } from "./theme";

const TAU = Math.PI * 2;

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawFirmament(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  starVisibility: number,
  horizonGlow: number,
): void {
  ctx.clearRect(0, 0, w, h);

  // Dawn/dusk: warm light rising from the horizon at the base of the page.
  if (horizonGlow > 0.01) {
    const g = ctx.createLinearGradient(0, h, 0, h * 0.4);
    g.addColorStop(0, `rgba(232, 149, 92, ${0.22 * horizonGlow})`);
    g.addColorStop(0.55, `rgba(232, 149, 92, ${0.07 * horizonGlow})`);
    g.addColorStop(1, "rgba(232, 149, 92, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.4, w, h * 0.6);
  }

  if (starVisibility < 0.02) return; // daylight — the stars wait

  const rnd = mulberry32(4004);
  const cx = w * 0.5;
  const cy = h * 0.42;
  const tilt = -0.55; // the Milky Way crosses the page as a diagonal river
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const span = Math.hypot(w, h);

  // Galactic haze: soft overlapping luminous clouds along the band.
  for (let i = 0; i < 26; i++) {
    const t = (rnd() - 0.5) * span;
    const off = (rnd() - 0.5) * h * 0.16;
    const x = cx + cos * t - sin * off;
    const y = cy + sin * t + cos * off;
    const r = 40 + rnd() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(215, 230, 242, ${0.035 * starVisibility})`);
    g.addColorStop(1, "rgba(215, 230, 242, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  // Star dust: dense faint grains concentrated in the band (≈gaussian).
  ctx.fillStyle = THEME.inkHi;
  for (let i = 0; i < 900; i++) {
    const t = (rnd() - 0.5) * span;
    const off = (((rnd() + rnd() + rnd()) - 1.5) / 1.5) * h * 0.11;
    ctx.globalAlpha = (0.04 + rnd() * 0.1) * starVisibility;
    const s = 0.4 + rnd() * 0.9;
    ctx.fillRect(cx + cos * t - sin * off, cy + sin * t + cos * off, s, s);
  }

  // Field stars on a magnitude law: many faint, few bright.
  for (let i = 0; i < 340; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const faint = rnd() < 0.85;
    ctx.globalAlpha = (faint ? 0.15 + rnd() * 0.35 : 0.55 + rnd() * 0.4) * starVisibility;
    ctx.beginPath();
    ctx.arc(x, y, faint ? 0.6 + rnd() * 0.8 : 1.4 + rnd() * 1.3, 0, TAU);
    ctx.fill();
  }

  // The brightest few, drawn in the chart's own star-glyph language.
  ctx.strokeStyle = THEME.inkHi;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 7; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const s = 3 + rnd() * 3.5;
    ctx.globalAlpha = 0.75 * starVisibility;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
