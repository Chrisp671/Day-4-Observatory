/**
 * TONIGHT — which constellations are up, and when the rest arrive.
 *
 * Pure math on the far side of SEAM-001: this module never touches an
 * astronomy API. It needs only what `frame()` already returns — local
 * sidereal time, the station's latitude, and the sun's altitude — because a
 * star's rise/set follows from its fixed address in the sky plus where you
 * stand. That keeps the Rust-swap contract intact (DEC-002).
 *
 * Honest by construction:
 *  - A constellation is a region, not a point; we track its brightest star
 *    and say so, rather than pretending a whole region rises at an instant.
 *  - "Up" is not "visible": daylight drowns everything, so the board reports
 *    darkness separately instead of promising what the eye cannot deliver.
 */

/** A constellation, tracked by its brightest star (J2000). */
export interface Constellation {
  readonly name: string;
  /** The star the rise/set times actually describe. */
  readonly star: string;
  /** Right ascension in hours, [0, 24). */
  readonly raHours: number;
  /** Declination in degrees. */
  readonly decDeg: number;
}

/** Nine seasonal headliners: bright, nameable, and spread across the sky. */
export const CONSTELLATIONS: readonly Constellation[] = [
  { name: "Orion", star: "Rigel", raHours: 5.242, decDeg: -8.202 },
  { name: "Canis Major", star: "Sirius", raHours: 6.752, decDeg: -16.716 },
  { name: "Taurus", star: "Aldebaran", raHours: 4.599, decDeg: 16.509 },
  { name: "Leo", star: "Regulus", raHours: 10.139, decDeg: 11.967 },
  { name: "Ursa Major", star: "Alioth", raHours: 12.900, decDeg: 55.960 },
  { name: "Cassiopeia", star: "Schedar", raHours: 0.675, decDeg: 56.537 },
  { name: "Lyra", star: "Vega", raHours: 18.615, decDeg: 38.784 },
  { name: "Cygnus", star: "Deneb", raHours: 20.690, decDeg: 45.280 },
  { name: "Scorpius", star: "Antares", raHours: 16.490, decDeg: -26.432 },
];

/** A sidereal day is shorter than a solar one; countdowns are solar. */
const SIDEREAL_TO_SOLAR = 23.9344696 / 24;
const HOUR_MILLIS = 3600000;

const rad = (deg: number): number => (deg * Math.PI) / 180;
/** Normalize hours into [0, 24). */
const wrap24 = (h: number): number => ((h % 24) + 24) % 24;
/** Normalize hours into [-12, 12). */
const wrapHours12 = (h: number): number => ((((h + 12) % 24) + 24) % 24) - 12;

/**
 * The hour angle at which the star meets the horizon, in hours (0..12), or
 * null when it never does: `"circumpolar"` (always up) / `"never"` (always
 * down) at this latitude.
 */
export function horizonHourAngle(
  decDeg: number,
  latitudeDeg: number,
): number | "circumpolar" | "never" {
  const cosH = -Math.tan(rad(latitudeDeg)) * Math.tan(rad(decDeg));
  if (cosH <= -1) return "circumpolar";
  if (cosH >= 1) return "never";
  return (Math.acos(cosH) * 12) / Math.PI;
}

export type SkyStatus = "up" | "down" | "circumpolar" | "never";

export interface SkyEntry {
  readonly constellation: Constellation;
  readonly status: SkyStatus;
  /**
   * Milliseconds until it rises (`status: "down"`) or sets (`status: "up"`);
   * null when it never rises or never sets from this station.
   */
  readonly untilMillis: number | null;
}

/**
 * Where one constellation stands right now, and how long until that changes.
 * `lstHours` is local apparent sidereal time (GAST + longitude/15).
 */
export function skyEntry(
  constellation: Constellation,
  lstHours: number,
  latitudeDeg: number,
): SkyEntry {
  const h0 = horizonHourAngle(constellation.decDeg, latitudeDeg);
  if (h0 === "circumpolar") return { constellation, status: "circumpolar", untilMillis: null };
  if (h0 === "never") return { constellation, status: "never", untilMillis: null };

  // Hour angle now: 0 = on the meridian, ±h0 = at the horizon.
  const hourAngle = wrapHours12(lstHours - constellation.raHours);
  const up = Math.abs(hourAngle) < h0;
  // Sidereal hours until the horizon crossing we care about, then to solar.
  const targetHourAngle = up ? h0 : -h0;
  const siderealWait = wrap24(targetHourAngle - hourAngle);
  return {
    constellation,
    status: up ? "up" : "down",
    untilMillis: siderealWait * SIDEREAL_TO_SOLAR * HOUR_MILLIS,
  };
}

/** Below this solar altitude the sky is dark enough for constellations. */
export const DARK_ENOUGH_ALTITUDE_DEG = -6;

export const isDarkEnough = (sunAltitudeDeg: number): boolean =>
  sunAltitudeDeg < DARK_ENOUGH_ALTITUDE_DEG;

/**
 * The board, ordered as an observer reads it: what's already up (soonest to
 * leave first — catch it now), then what's coming (soonest to arrive), then
 * the ones that never rise here. Callers may show fewer than the full list.
 */
export function tonightBoard(
  lstHours: number,
  latitudeDeg: number,
  catalog: readonly Constellation[] = CONSTELLATIONS,
): readonly SkyEntry[] {
  const rank: Record<SkyStatus, number> = { circumpolar: 0, up: 0, down: 1, never: 2 };
  return [...catalog]
    .map((c) => skyEntry(c, lstHours, latitudeDeg))
    .sort((a, b) => {
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return (a.untilMillis ?? Infinity) - (b.untilMillis ?? Infinity);
    });
}
