/**
 * The atmospheric color script (DEC-010): the page lives through the day.
 *
 * "Let there be light" precedes the lights themselves — so the light rules
 * the palette. Every color here is keyed to the REAL solar altitude from
 * the engine and interpolated continuously, the way the sky itself moves:
 *
 *   alt ≤ -18°  astronomical night — deepest Prussian, full stars
 *   -18..-6°    astronomical/nautical twilight — indigo lift
 *   -6..0°      civil twilight — the field warms, stars begin to go
 *   0..8°       golden hour — amber sun, warm horizon
 *   ≥ 20°       full day — lifted daylight blue, no stars
 *
 * The sun's own color follows Rayleigh scattering: deep amber at the
 * horizon, bright gold at noon — the sky's physics, not a style choice.
 */

export interface SkyPalette {
  /** Outer field (page vignette edge). */
  readonly deep: string;
  /** Inner field (page centre). */
  readonly field: string;
  /** 0..1 multiplier for the star field. */
  readonly starAlpha: number;
  /** The sun disc's colour at this altitude. */
  readonly sunCore: string;
  /** 0..1 strength of the warm glow rising from the horizon (dawn/dusk). */
  readonly horizonGlow: number;
}

interface Stop {
  readonly alt: number;
  readonly deep: readonly [number, number, number];
  readonly field: readonly [number, number, number];
  readonly starAlpha: number;
  readonly sun: readonly [number, number, number];
}

// Keyframes, darkest to brightest. RGB triples.
const STOPS: readonly Stop[] = [
  { alt: -18, deep: [8, 22, 39], field: [14, 36, 64], starAlpha: 1, sun: [240, 179, 16] },
  { alt: -6, deep: [10, 26, 48], field: [16, 42, 76], starAlpha: 0.9, sun: [232, 130, 62] },
  { alt: 0, deep: [13, 32, 56], field: [22, 52, 94], starAlpha: 0.45, sun: [226, 110, 48] },
  { alt: 8, deep: [17, 42, 72], field: [29, 66, 114], starAlpha: 0.12, sun: [239, 160, 44] },
  { alt: 20, deep: [22, 52, 87], field: [36, 80, 127], starAlpha: 0, sun: [245, 198, 74] },
];

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Warm horizon light: none in deep night, peaking as the sun crosses the
 * horizon, gone again once the sun stands high. */
const glowAt = (alt: number): number => {
  if (alt <= -12 || alt >= 10) return 0;
  return alt < 0 ? 1 - alt / -12 : 1 - alt / 10;
};
const hex = (rgb: readonly [number, number, number]): string =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): readonly [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Continuous palette for a given solar altitude in degrees. */
export function skyPalette(sunAltitudeDeg: number): SkyPalette {
  const first = STOPS[0] as Stop;
  const last = STOPS[STOPS.length - 1] as Stop;
  if (sunAltitudeDeg <= first.alt) {
    return { deep: hex(first.deep), field: hex(first.field), starAlpha: first.starAlpha, sunCore: hex(first.sun), horizonGlow: glowAt(sunAltitudeDeg) };
  }
  if (sunAltitudeDeg >= last.alt) {
    return { deep: hex(last.deep), field: hex(last.field), starAlpha: last.starAlpha, sunCore: hex(last.sun), horizonGlow: glowAt(sunAltitudeDeg) };
  }
  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i] as Stop;
    const hi = STOPS[i + 1] as Stop;
    if (sunAltitudeDeg <= hi.alt) {
      const t = (sunAltitudeDeg - lo.alt) / (hi.alt - lo.alt);
      return {
        deep: hex(mix(lo.deep, hi.deep, t)),
        field: hex(mix(lo.field, hi.field, t)),
        starAlpha: lerp(lo.starAlpha, hi.starAlpha, t),
        sunCore: hex(mix(lo.sun, hi.sun, t)),
        horizonGlow: glowAt(sunAltitudeDeg),
      };
    }
  }
  return { deep: hex(last.deep), field: hex(last.field), starAlpha: last.starAlpha, sunCore: hex(last.sun), horizonGlow: glowAt(sunAltitudeDeg) };
}
