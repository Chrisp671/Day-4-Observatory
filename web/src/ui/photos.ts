/**
 * Reference photographs for the Planets view (WI-033, DEC-039).
 *
 * Presentation data only: a static table keyed by the planet's name, beside
 * `PLANET_COLORS`. The Scene knows nothing of it (DEC-037) — the shell looks
 * a planet up here when it builds the row. Every image is NASA public-domain
 * work vendored under `web/public/planets/` and attributed in
 * `web/public/ATTRIBUTION.md`; the app makes no request outside its own origin.
 *
 * The honesty rule these carry: a photograph is what a spacecraft once saw,
 * not the sky tonight. Alt text and the caption both say so.
 */
export interface PlanetPhoto {
  /** Same-origin path under `web/public/`. */
  readonly src: string;
  /** Pixel size of the shipped file, so the box is reserved before it loads. */
  readonly width: number;
  readonly height: number;
  /** What the picture is, for the caption and for a reader who cannot see it. */
  readonly title: string;
  /** Who made it, as NASA credits it. */
  readonly credit: string;
  /** The NASA Image and Video Library page for this picture. */
  readonly creditUrl: string;
}

/** The sentence every photo carries, in the caption and in its alt text. */
export const PHOTO_NOTICE = "NASA reference photo — not live, not how it looks tonight";

export const PLANET_PHOTOS: Readonly<Record<string, PlanetPhoto>> = {
  Mercury: {
    src: "/planets/mercury.jpg", width: 1024, height: 576,
    title: "Mercury from MESSENGER, in enhanced colour",
    credit: "NASA/JHU APL/Carnegie Institution of Washington",
    creditUrl: "https://images.nasa.gov/details/PIA16853",
  },
  Venus: {
    src: "/planets/venus.jpg", width: 1024, height: 1000,
    title: "Venus from Mariner 10",
    credit: "NASA/JPL-Caltech",
    creditUrl: "https://images.nasa.gov/details/PIA23791",
  },
  Mars: {
    src: "/planets/mars.jpg", width: 1024, height: 1024,
    title: "Mars from the Viking orbiters",
    credit: "NASA/JPL/USGS",
    creditUrl: "https://images.nasa.gov/details/PIA00407",
  },
  Jupiter: {
    src: "/planets/jupiter.jpg", width: 1024, height: 576,
    title: "Jupiter from Cassini",
    credit: "NASA/JPL/University of Arizona",
    creditUrl: "https://images.nasa.gov/details/PIA02873",
  },
  Saturn: {
    src: "/planets/saturn.jpg", width: 1024, height: 496,
    title: "Saturn from Cassini",
    credit: "NASA/JPL/Space Science Institute",
    creditUrl: "https://images.nasa.gov/details/PIA11141",
  },
};

/** The photo for a planet, or null for a body we do not ship a picture of. */
export function photoFor(name: string): PlanetPhoto | null {
  return Object.prototype.hasOwnProperty.call(PLANET_PHOTOS, name) ? PLANET_PHOTOS[name] ?? null : null;
}

/** Alt text that names the picture and states plainly that it is not live. */
export function photoAlt(photo: PlanetPhoto): string {
  return `${photo.title}. ${PHOTO_NOTICE}.`;
}
