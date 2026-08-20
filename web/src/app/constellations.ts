/**
 * TONIGHT — which constellations are up, and when the rest arrive.
 *
 * Pure math on the far side of SEAM-001: this module never touches an
 * astronomy API. It needs only what `frame()` already returns — local
 * sidereal time, the station's latitude, and the sun's altitude — because a
 * star's rise/set follows from its fixed address in the sky plus where you
 * stand. That keeps the Rust-swap contract intact (DEC-002).
 *
 * The catalog is complete: all 88 IAU constellations, each tracked by its
 * brightest star (J2000), plus the Pleiades — an asterism, not a
 * constellation, carried because Scripture names it (Amos 5:8, Job 9:9).
 *
 * The twelve constellations of the sun's path are flagged `mazzaroth` —
 * God's own word for them ("Can you lead forth the Mazzaroth in their
 * season?", Job 38:32). They are tracked as astronomy, the same as every
 * other region of the sky; the app has no horoscopes in it.
 *
 * Honest by construction:
 *  - A constellation is a region, not a point; we track its brightest star
 *    and say so, rather than pretending a whole region rises at an instant.
 *  - "Up" is not "visible": daylight drowns everything, so the board reports
 *    darkness separately instead of promising what the eye cannot deliver.
 */

/** A constellation (or named asterism), tracked by its brightest star (J2000). */
export interface Constellation {
  readonly name: string;
  /** The star the rise/set times actually describe. */
  readonly star: string;
  /** Right ascension in hours, [0, 24). */
  readonly raHours: number;
  /** Declination in degrees. */
  readonly decDeg: number;
  /** One of the twelve of the sun's path — the Mazzaroth of Job 38:32. */
  readonly mazzaroth?: boolean;
  /** Bright and nameable: eligible for the three-slot glance board. */
  readonly notable?: boolean;
}

/* Coordinates are the constellation's brightest star, J2000, to ~0.1h/1° —
 * region-level precision, which is all a region's rise time can honestly
 * claim. Spot-checked against the bright stars in the test suite. */
export const CONSTELLATIONS: readonly Constellation[] = [
  { name: "Andromeda", star: "Alpheratz", raHours: 0.14, decDeg: 29.09 },
  { name: "Antlia", star: "Alpha Antliae", raHours: 10.45, decDeg: -31.07 },
  { name: "Apus", star: "Alpha Apodis", raHours: 14.8, decDeg: -79.04 },
  { name: "Aquarius", star: "Sadalsuud", raHours: 21.53, decDeg: -5.57, mazzaroth: true },
  { name: "Aquila", star: "Altair", raHours: 19.846, decDeg: 8.87, notable: true },
  { name: "Ara", star: "Beta Arae", raHours: 17.42, decDeg: -55.53 },
  { name: "Aries", star: "Hamal", raHours: 2.12, decDeg: 23.46, mazzaroth: true },
  { name: "Auriga", star: "Capella", raHours: 5.28, decDeg: 46.0, notable: true },
  { name: "Boötes", star: "Arcturus", raHours: 14.26, decDeg: 19.18, notable: true },
  { name: "Caelum", star: "Alpha Caeli", raHours: 4.68, decDeg: -41.86 },
  { name: "Camelopardalis", star: "Beta Camelopardalis", raHours: 5.06, decDeg: 60.44 },
  { name: "Cancer", star: "Tarf", raHours: 8.28, decDeg: 9.19, mazzaroth: true },
  { name: "Canes Venatici", star: "Cor Caroli", raHours: 12.93, decDeg: 38.32 },
  { name: "Canis Major", star: "Sirius", raHours: 6.752, decDeg: -16.716, notable: true },
  { name: "Canis Minor", star: "Procyon", raHours: 7.655, decDeg: 5.22 },
  { name: "Capricornus", star: "Deneb Algedi", raHours: 21.78, decDeg: -16.13, mazzaroth: true },
  { name: "Carina", star: "Canopus", raHours: 6.4, decDeg: -52.7 },
  { name: "Cassiopeia", star: "Schedar", raHours: 0.675, decDeg: 56.537, notable: true },
  { name: "Centaurus", star: "Rigil Kentaurus", raHours: 14.66, decDeg: -60.84 },
  { name: "Cepheus", star: "Alderamin", raHours: 21.31, decDeg: 62.59 },
  { name: "Cetus", star: "Diphda", raHours: 0.73, decDeg: -17.99 },
  { name: "Chamaeleon", star: "Alpha Chamaeleontis", raHours: 8.31, decDeg: -76.92 },
  { name: "Circinus", star: "Alpha Circini", raHours: 14.71, decDeg: -64.98 },
  { name: "Columba", star: "Phact", raHours: 5.66, decDeg: -34.07 },
  { name: "Coma Berenices", star: "Beta Comae", raHours: 13.2, decDeg: 27.88 },
  { name: "Corona Australis", star: "Meridiana", raHours: 19.16, decDeg: -37.9 },
  { name: "Corona Borealis", star: "Alphecca", raHours: 15.58, decDeg: 26.71 },
  { name: "Corvus", star: "Gienah", raHours: 12.26, decDeg: -17.54 },
  { name: "Crater", star: "Delta Crateris", raHours: 11.32, decDeg: -14.78 },
  { name: "Crux", star: "Acrux", raHours: 12.443, decDeg: -63.099 },
  { name: "Cygnus", star: "Deneb", raHours: 20.69, decDeg: 45.28, notable: true },
  { name: "Delphinus", star: "Rotanev", raHours: 20.63, decDeg: 14.6 },
  { name: "Dorado", star: "Alpha Doradus", raHours: 4.57, decDeg: -55.04 },
  { name: "Draco", star: "Eltanin", raHours: 17.94, decDeg: 51.49 },
  { name: "Equuleus", star: "Kitalpha", raHours: 21.26, decDeg: 5.25 },
  { name: "Eridanus", star: "Achernar", raHours: 1.63, decDeg: -57.24 },
  { name: "Fornax", star: "Alpha Fornacis", raHours: 3.2, decDeg: -28.99 },
  { name: "Gemini", star: "Pollux", raHours: 7.755, decDeg: 28.03, mazzaroth: true, notable: true },
  { name: "Grus", star: "Alnair", raHours: 22.14, decDeg: -46.96 },
  { name: "Hercules", star: "Kornephoros", raHours: 16.5, decDeg: 21.49 },
  { name: "Horologium", star: "Alpha Horologii", raHours: 4.23, decDeg: -42.29 },
  { name: "Hydra", star: "Alphard", raHours: 9.46, decDeg: -8.66 },
  { name: "Hydrus", star: "Beta Hydri", raHours: 0.43, decDeg: -77.25 },
  { name: "Indus", star: "Alpha Indi", raHours: 20.63, decDeg: -47.29 },
  { name: "Lacerta", star: "Alpha Lacertae", raHours: 22.52, decDeg: 50.28 },
  { name: "Leo", star: "Regulus", raHours: 10.139, decDeg: 11.967, mazzaroth: true, notable: true },
  { name: "Leo Minor", star: "Praecipua", raHours: 10.89, decDeg: 34.21 },
  { name: "Lepus", star: "Arneb", raHours: 5.55, decDeg: -17.82 },
  { name: "Libra", star: "Zubeneschamali", raHours: 15.28, decDeg: -9.38, mazzaroth: true },
  { name: "Lupus", star: "Alpha Lupi", raHours: 14.7, decDeg: -47.39 },
  { name: "Lynx", star: "Alpha Lyncis", raHours: 9.35, decDeg: 34.39 },
  { name: "Lyra", star: "Vega", raHours: 18.615, decDeg: 38.784, notable: true },
  { name: "Mensa", star: "Alpha Mensae", raHours: 6.17, decDeg: -74.75 },
  { name: "Microscopium", star: "Gamma Microscopii", raHours: 21.02, decDeg: -32.26 },
  { name: "Monoceros", star: "Beta Monocerotis", raHours: 6.48, decDeg: -7.03 },
  { name: "Musca", star: "Alpha Muscae", raHours: 12.62, decDeg: -69.14 },
  { name: "Norma", star: "Gamma2 Normae", raHours: 16.33, decDeg: -50.16 },
  { name: "Octans", star: "Nu Octantis", raHours: 21.69, decDeg: -77.39 },
  { name: "Ophiuchus", star: "Rasalhague", raHours: 17.58, decDeg: 12.56 },
  { name: "Orion", star: "Rigel", raHours: 5.242, decDeg: -8.202, notable: true },
  { name: "Pavo", star: "Peacock", raHours: 20.43, decDeg: -56.74 },
  { name: "Pegasus", star: "Enif", raHours: 21.74, decDeg: 9.88 },
  { name: "Perseus", star: "Mirfak", raHours: 3.41, decDeg: 49.86 },
  { name: "Phoenix", star: "Ankaa", raHours: 0.44, decDeg: -42.31 },
  { name: "Pictor", star: "Alpha Pictoris", raHours: 6.8, decDeg: -61.94 },
  { name: "Pisces", star: "Alpherg", raHours: 1.52, decDeg: 15.35, mazzaroth: true },
  { name: "Piscis Austrinus", star: "Fomalhaut", raHours: 22.96, decDeg: -29.62 },
  { name: "Puppis", star: "Naos", raHours: 8.06, decDeg: -40.0 },
  { name: "Pyxis", star: "Alpha Pyxidis", raHours: 8.73, decDeg: -33.19 },
  { name: "Reticulum", star: "Alpha Reticuli", raHours: 4.24, decDeg: -62.47 },
  { name: "Sagitta", star: "Gamma Sagittae", raHours: 19.98, decDeg: 19.49 },
  { name: "Sagittarius", star: "Kaus Australis", raHours: 18.4, decDeg: -34.38, mazzaroth: true },
  { name: "Scorpius", star: "Antares", raHours: 16.49, decDeg: -26.432, mazzaroth: true, notable: true },
  { name: "Sculptor", star: "Alpha Sculptoris", raHours: 0.98, decDeg: -29.36 },
  { name: "Scutum", star: "Alpha Scuti", raHours: 18.59, decDeg: -8.24 },
  { name: "Serpens", star: "Unukalhai", raHours: 15.74, decDeg: 6.43 },
  { name: "Sextans", star: "Alpha Sextantis", raHours: 10.13, decDeg: -0.37 },
  { name: "Taurus", star: "Aldebaran", raHours: 4.599, decDeg: 16.509, mazzaroth: true, notable: true },
  { name: "Telescopium", star: "Alpha Telescopii", raHours: 18.45, decDeg: -45.97 },
  { name: "Triangulum", star: "Beta Trianguli", raHours: 2.16, decDeg: 34.99 },
  { name: "Triangulum Australe", star: "Atria", raHours: 16.81, decDeg: -69.03 },
  { name: "Tucana", star: "Alpha Tucanae", raHours: 22.31, decDeg: -60.26 },
  { name: "Ursa Major", star: "Alioth", raHours: 12.9, decDeg: 55.96, notable: true },
  { name: "Ursa Minor", star: "Polaris", raHours: 2.53, decDeg: 89.26 },
  { name: "Vela", star: "Gamma Velorum", raHours: 8.16, decDeg: -47.34 },
  { name: "Virgo", star: "Spica", raHours: 13.42, decDeg: -11.16, mazzaroth: true },
  { name: "Volans", star: "Beta Volantis", raHours: 8.43, decDeg: -66.14 },
  { name: "Vulpecula", star: "Anser", raHours: 19.48, decDeg: 24.66 },
  // Not a constellation: the star cluster Scripture names alongside Orion.
  { name: "Pleiades", star: "Alcyone", raHours: 3.79, decDeg: 24.11, notable: true },
];

/** The 88 IAU constellations, without the Pleiades asterism. */
export const IAU_COUNT = 88;

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
