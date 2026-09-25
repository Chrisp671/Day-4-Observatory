/**
 * CHK-001 fixture builder — NASA/JPL Horizons reference data.
 *
 *     node scripts/build-horizons-fixture.mjs [--measure]
 *
 * Writes `web/src/engine/horizons-reference.ts`: 3 locations x 4 dates of JPL
 * values, plus the provenance needed to reproduce each row. The test
 * (`horizons.test.ts`) pins the engine against this file and nothing else.
 *
 * Conventions, established by probing Horizons and astronomy-engine against
 * each other — every one of these is a real difference between the two, and
 * getting any of them wrong makes the comparison meaningless:
 *
 * - astronomy-engine's `Equator()` returns RA in HOURS. Horizons is in degrees.
 * - The engine passes an `Observer`, so its RA/Dec are TOPOCENTRIC. Horizons
 *   `CENTER='500@399'` is geocentric. The moon's horizontal parallax is nearly
 *   a degree, so RA/Dec are compared only through `CENTER='coord@399'`.
 * - `MoonPhase` and `Illumination` take no observer, so they are GEOCENTRIC.
 *   JPL's ecliptic longitudes and `MN_Illu%` are topocentric when the centre is
 *   a site, and for the moon that parallax is worth about a degree. Both frames
 *   are therefore pinned: topocentric for the positions the engine computes
 *   topocentrically, geocentric for the phase it computes geocentrically.
 * - astronomy-engine's `MoonPhase` is a SIGNED longitude difference: the moon's
 *   geocentric ecliptic-of-date longitude minus the sun's, 0..360, so 0 is new,
 *   90 first quarter, 180 full, 270 last quarter. The app's waxing/waning flag,
 *   phase name, moon age and the lit side of the disc all hang on that sign.
 *   Horizons' `ObsEcLon` (quantity 31) is the same longitude, so both bodies'
 *   are pinned geocentrically and the difference is compared signed. JPL's
 *   value is apparent (light-time and stellar aberration applied) and the
 *   engine's is not. That shows only for the sun: for the moon, light-time
 *   and aberration cancel to an arcsecond because it shares the Earth's
 *   heliocentric velocity, so the engine's phase sits a systematic 20 arcsec
 *   (0.0057 deg, 40 s of lunation) below JPL's, measured per body with
 *   `--measure`. The test's tolerance carries that. The unsigned
 *   `S-T-O` phase angle is NOT used: folding the engine's phase into an
 *   unsigned elongation would hide a wrong sign, and S-T-O also differs from a
 *   longitude difference by the moon's ecliptic latitude (up to 5 deg near
 *   syzygy) and by the sun-side angle of the triangle (up to 0.15 deg).
 * - Horizons' `Elevation_(a-app)` is AIRLESS; the engine's `Horizon(...,
 *   "normal")` adds `Refraction("normal", airless)` to it (that is exactly what
 *   `Horizon` does internally). The test applies the same declared model to
 *   JPL's airless value and compares altitude directly.
 * - `SearchRiseSet` fires when the body's UPPER LIMB crosses the horizon, i.e.
 *   the centre is at `-(34' refraction) - semidiameter`, with the semidiameter
 *   from the topocentric distance. Horizons reports the airless centre
 *   elevation and the topocentric angular diameter, so the target altitude
 *   follows from JPL's own numbers.
 *
 * astronomy-engine is used here only to choose WHICH instants to probe. The one
 * engine value written into the fixture is `events[].engineUtc`, recorded as
 * provenance (which JPL rows were read, and where the window was centred); the
 * test never treats it as an oracle. Every asserted-against number is JPL's.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Body,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  Refraction,
  SearchRiseSet,
  SiderealTime,
} from "../web/node_modules/astronomy-engine/esm/astronomy.js";

// The engine's day-anchored helpers use local midnight, so the fixture is
// generated with the process pinned to UTC and the test pins itself the same
// way. Only the moon's day-anchored rise/set depends on this.
process.env.TZ = "UTC";

const HERE = dirname(fileURLToPath(import.meta.url));
const API = "https://ssd.jpl.nasa.gov/api/horizons.api";
const MEASURE = process.argv.includes("--measure");

// --------------------------------------------------------------- the matrix

export const LOCATIONS = [
  { id: "new-york", name: "New York, NY, USA", latDeg: 40.7128, lonDeg: -74.006 },
  { id: "sydney", name: "Sydney, NSW, Australia", latDeg: -33.8688, lonDeg: 151.2093 },
  { id: "reykjavik", name: "Reykjavik, Iceland", latDeg: 64.1466, lonDeg: -21.9426 },
];

export const DATES = [
  { id: "2026-03-20", label: "March equinox", refInstantUtc: "2026-03-20T12:00:00.000Z" },
  { id: "2026-06-21", label: "June solstice", refInstantUtc: "2026-06-21T12:00:00.000Z" },
  { id: "2026-08-12", label: "total solar eclipse — moon new", refInstantUtc: "2026-08-12T12:00:00.000Z" },
  { id: "2026-12-21", label: "December solstice", refInstantUtc: "2026-12-21T12:00:00.000Z" },
];

const COMMAND = { sun: "10", moon: "301" };
const GEOCENTRIC = "500@399";
const TOPOCENTRIC = "coord@399";
// q1 astrometric RA/Dec, q2 apparent RA/Dec, q4 az/el, q13 angular diameter,
// q25 Target-Observer-Moon angle and moon illuminated percent ("MN_Illu%"),
// q31 observer-centred ecliptic-of-date longitude and latitude ("ObsEcLon",
// "ObsEcLat"). Az/el print as "n.a." for a geocentric centre.
const Q_POSITION = "1,2,4,13,25,31";

// ------------------------------------------------------------ Horizons access

let lastCallAt = 0;

async function throttle() {
  const wait = lastCallAt + 1200 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

const stamp = (millis) => {
  const d = new Date(millis);
  const p = (v, w = 2) => String(v).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
};

/**
 * One Horizons observer request. Returns `{ names, rows }` where `names` is the
 * printed column header and `rows` are the data lines, so every value is read
 * by column name rather than by a hardcoded offset.
 */
async function observer({ command, center, siteCoord, quantities, start, stop, step }) {
  await throttle();
  const params = {
    format: "text",
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "OBSERVER",
    CSV_FORMAT: "YES",
    CAL_FORMAT: "CAL",
    ANG_FORMAT: "DEG",
    EXTRA_PREC: "YES",
    COMMAND: `'${command}'`,
    CENTER: `'${center}'`,
    QUANTITIES: `'${quantities}'`,
    START_TIME: stamp(start),
    STOP_TIME: stamp(stop),
    STEP_SIZE: step,
  };
  if (siteCoord) params.SITE_COORD = `'${siteCoord}'`;
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(180000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Horizons ${res.status}: ${text.slice(0, 300)}`);
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const soe = lines.findIndex((l) => l === "$$SOE");
  const eoe = lines.findIndex((l) => l === "$$EOE");
  if (soe < 0) throw new Error(`no $$SOE for ${command} @ ${stamp(start)}: ${text.slice(0, 400)}`);
  // Horizons prints the column header immediately above $$SOE, and repeats it
  // inside long tables. The last comma-bearing line before $$SOE is the header.
  const header = lines
    .slice(0, soe)
    .reverse()
    .find((l) => l.includes(",") && l.includes("Date"));
  if (!header) throw new Error(`no column header for ${command} @ ${stamp(start)}`);
  const names = header.split(",").map((s) => s.trim());
  const rows = lines
    .slice(soe + 1, eoe < 0 ? undefined : eoe)
    .filter((l) => l.length > 0 && l !== header && !l.startsWith("Date__"));
  return { names, rows };
}

/** Read one column by name; "n.a." and blanks become null. */
function column(table, name) {
  const index = table.names.indexOf(name);
  if (index < 0) throw new Error(`Horizons table has no column ${name}; has ${table.names.join(" | ")}`);
  if (table.rows.length === 0) throw new Error(`Horizons table has no rows to read ${name} from`);
  const raw = table.rows[0].split(",")[index]?.trim() ?? "";
  if (raw === "" || raw.toLowerCase() === "n.a.") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`column ${name} was not a number: ${JSON.stringify(raw)}`);
  return value;
}

const parseTime = (text) => {
  const m = /^(\d{4})-(\w{3})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!m) throw new Error(`unparsed Horizons time ${JSON.stringify(text)}`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Date.UTC(+m[1], months.indexOf(m[2]), +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
};

// ------------------------------------------------------------- the geometry

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const wrap360 = (d) => ((d % 360) + 360) % 360;
const circularDiff = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};
const round = (v, digits = 6) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/** JPL's own sun altitude minus the engine's: the refraction lift, 0 .. 34'. */
const REFRACTION_AT_HORIZON_DEG = 34 / 60;

/** Centre altitude when the upper limb stands on the horizon. */
const limbHorizon = (angDiamArcsec) => -REFRACTION_AT_HORIZON_DEG - angDiamArcsec / 7200;

/**
 * The subsolar point implied by JPL's own topocentric sun azimuth and altitude,
 * with no Earth-rotation value anywhere: put the observed direction into the
 * site's local east-north-up frame, rotate it to ECEF using only the site's
 * lat/lon, and read off where it points straight up. The engine derives the
 * same point from GAST, so this is an independent check on that arithmetic.
 */
function subsolarFromTopocentric(altDeg, azDeg, latDeg, lonDeg) {
  const h = altDeg * D2R;
  const a = azDeg * D2R;
  const phi = latDeg * D2R;
  const lam = lonDeg * D2R;
  const north = Math.cos(h) * Math.cos(a);
  const east = Math.cos(h) * Math.sin(a);
  const up = Math.sin(h);
  const nHat = [-Math.sin(phi) * Math.cos(lam), -Math.sin(phi) * Math.sin(lam), Math.cos(phi)];
  const eHat = [-Math.sin(lam), Math.cos(lam), 0];
  const uHat = [Math.cos(phi) * Math.cos(lam), Math.cos(phi) * Math.sin(lam), Math.sin(phi)];
  const v = [0, 1, 2].map((i) => north * nHat[i] + east * eHat[i] + up * uHat[i]);
  return { latDeg: Math.asin(v[2]) * R2D, lonDeg: wrap180(Math.atan2(v[1], v[0]) * R2D) };
}

/**
 * JPL's own crossing of `target` degrees, interpolated on the one-minute grid
 * JPL was asked for. `direction` is +1 for a rise and -1 for a set.
 */
function crossingTime(table, target, direction) {
  const index = table.names.indexOf("Elevation_(a-app)");
  const at = (row) => {
    const raw = row.split(",")[index]?.trim() ?? "";
    return raw === "" || raw.toLowerCase() === "n.a." ? null : Number(raw);
  };
  for (let i = 1; i < table.rows.length; i++) {
    const a = at(table.rows[i - 1]);
    const b = at(table.rows[i]);
    if (a === null || b === null || a === b) continue;
    const rising = b > a;
    if (rising !== direction > 0) continue;
    if ((a - target) * (b - target) > 0) continue;
    const f = (target - a) / (b - a);
    return parseTime(table.rows[i - 1].split(",")[0]) + f * (parseTime(table.rows[i].split(",")[0]) - parseTime(table.rows[i - 1].split(",")[0]));
  }
  return null;
}

// ------------------------------------------------ the engine, to place probes
// Mirrors engine/frame.ts and engine/planets.ts closely enough to ask Horizons
// about the same instants. Nothing here is written to the fixture.

function engineProbe(refMillis, latDeg, lonDeg) {
  const date = new Date(refMillis);
  const observer = new Observer(latDeg, lonDeg, 0);
  const gast = SiderealTime(date);
  const sunEq = Equator(Body.Sun, date, observer, true, true);
  const moonEq = Equator(Body.Moon, date, observer, true, true);
  const midnight = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const probe = (body, from) => {
    const rise = SearchRiseSet(body, observer, +1, from, 2);
    const set = SearchRiseSet(body, observer, -1, from, 2);
    return {
      rise: rise === null ? null : rise.date.getTime(),
      set: set === null ? null : set.date.getTime(),
    };
  };
  const sunEvents = probe(Body.Sun, date);
  const moonEvents = probe(Body.Moon, midnight);
  const nextMidnight = midnight.getTime() + 86400000;
  if (moonEvents.rise === null || moonEvents.rise >= nextMidnight) {
    moonEvents.rise = null;
    moonEvents.set = null;
  } else {
    moonEvents.set = SearchRiseSet(Body.Moon, observer, -1, new Date(moonEvents.rise), 2)?.date.getTime() ?? null;
  }
  return {
    sunRaDeg: sunEq.ra * 15,
    sunDecDeg: sunEq.dec,
    sunAltDeg: Horizon(date, observer, sunEq.ra, sunEq.dec, "normal").altitude,
    sunAzDeg: Horizon(date, observer, sunEq.ra, sunEq.dec, "normal").azimuth,
    moonRaDeg: moonEq.ra * 15,
    moonDecDeg: moonEq.dec,
    moonAltDeg: Horizon(date, observer, moonEq.ra, moonEq.dec, "normal").altitude,
    moonAzDeg: Horizon(date, observer, moonEq.ra, moonEq.dec, "normal").azimuth,
    phaseAngleDeg: MoonPhase(date),
    illuminatedFraction: Illumination(Body.Moon, date).phase_fraction,
    subsolarLatDeg: sunEq.dec,
    subsolarLonDeg: wrap180((sunEq.ra - gast) * 15),
    sunEvents,
    moonEvents,
  };
}

// ------------------------------------------------------------------- build

async function probeEvent(kind, command, site, centreMillis, direction) {
  if (centreMillis === null) {
    return { kind, engineUtc: null, jplElevationAtEngineDeg: null, jplCrossingUtc: null, limbHorizonDeg: null, angularDiameterArcsec: null };
  }
  const window_ = 30 * 60000;
  const table = await observer({
    command,
    center: TOPOCENTRIC,
    siteCoord: site,
    quantities: Q_POSITION,
    start: centreMillis - window_,
    stop: centreMillis + window_,
    step: "1 m",
  });
  const angularDiameterArcsec = column(table, "Ang-diam");
  const limb = limbHorizon(angularDiameterArcsec);
  const at = table.rows.find((row) => Math.abs(parseTime(row.split(",")[0]) - centreMillis) <= 30000);
  if (!at) throw new Error(`no Horizons row at the engine's ${kind} instant`);
  const elevation = column({ names: table.names, rows: [at] }, "Elevation_(a-app)");
  const crossing = crossingTime(table, limb, direction);
  return {
    kind,
    engineUtc: new Date(centreMillis).toISOString(),
    jplElevationAtEngineDeg: round(elevation),
    jplCrossingUtc: crossing === null ? null : new Date(Math.round(crossing)).toISOString(),
    limbHorizonDeg: round(limb),
    angularDiameterArcsec: round(angularDiameterArcsec, 3),
  };
}

async function buildCase(location, dateCase) {
  const { latDeg, lonDeg } = location;
  const refMillis = Date.parse(dateCase.refInstantUtc);
  const site = `${lonDeg},${latDeg},0`;

  const position = async (body) =>
    observer({
      command: COMMAND[body],
      center: TOPOCENTRIC,
      siteCoord: site,
      quantities: Q_POSITION,
      start: refMillis,
      stop: refMillis + 60000,
      step: "1 m",
    });

  const sunTable = await position("sun");
  const moonTable = await position("moon");
  // Phase and illumination are geocentric in the engine, so ask JPL in that
  // frame too rather than inheriting the site's parallax. Both bodies, because
  // the phase is the difference of their ecliptic longitudes.
  const geocentric = async (body) =>
    observer({
      command: COMMAND[body],
      center: GEOCENTRIC,
      quantities: Q_POSITION,
      start: refMillis,
      stop: refMillis + 60000,
      step: "1 m",
    });
  const sunGeoTable = await geocentric("sun");
  const moonGeoTable = await geocentric("moon");
  const sunAltDeg = column(sunTable, "Elevation_(a-app)");
  const sunAzDeg = column(sunTable, "Azimuth_(a-app)");
  const probe = engineProbe(refMillis, latDeg, lonDeg);
  const subsolar = subsolarFromTopocentric(sunAltDeg, sunAzDeg, latDeg, lonDeg);

  const events = [];
  events.push(await probeEvent("sunrise", COMMAND.sun, site, probe.sunEvents.rise, +1));
  events.push(await probeEvent("sunset", COMMAND.sun, site, probe.sunEvents.set, -1));
  events.push(await probeEvent("moonrise", COMMAND.moon, site, probe.moonEvents.rise, +1));
  events.push(await probeEvent("moonset", COMMAND.moon, site, probe.moonEvents.set, -1));

  const c = {
    id: `${location.id}@${dateCase.id}`,
    location,
    date: dateCase,
    sun: {
      apparentRaDeg: round(column(sunTable, "R.A.__(a-app)")),
      apparentDecDeg: round(column(sunTable, "DEC___(a-app)")),
      topocentricAltDeg: round(sunAltDeg),
      topocentricAzDeg: round(sunAzDeg),
      geocentricEclipticLonDeg: round(column(sunGeoTable, "ObsEcLon")),
    },
    moon: {
      apparentRaDeg: round(column(moonTable, "R.A.__(a-app)")),
      apparentDecDeg: round(column(moonTable, "DEC___(a-app)")),
      geocentricEclipticLonDeg: round(column(moonGeoTable, "ObsEcLon")),
      geocentricEclipticLatDeg: round(column(moonGeoTable, "ObsEcLat")),
      geocentricIlluminatedFraction: round(column(moonGeoTable, "MN_Illu%") / 100),
      topocentricAltDeg: round(column(moonTable, "Elevation_(a-app)")),
      topocentricAzDeg: round(column(moonTable, "Azimuth_(a-app)")),
    },
    subsolar: { latDeg: round(subsolar.latDeg), lonDeg: round(subsolar.lonDeg) },
    events,
  };

  if (MEASURE) {
    const gap = (a, b) => Math.abs(a - b);
    // The same model the engine's Horizon() applies, on JPL's airless value.
    const refracted = (airless) => airless + Refraction("normal", airless);
    const jplPhase = wrap360(c.moon.geocentricEclipticLonDeg - c.sun.geocentricEclipticLonDeg);
    const lines = [
      `sun  Ra ${gap(probe.sunRaDeg, c.sun.apparentRaDeg).toFixed(5)}  Dec ${gap(probe.sunDecDeg, c.sun.apparentDecDeg).toFixed(5)}  Az ${gap(probe.sunAzDeg, c.sun.topocentricAzDeg).toFixed(5)}  Alt(vs refracted JPL) ${gap(probe.sunAltDeg, refracted(c.sun.topocentricAltDeg)).toFixed(5)}  lift ${(probe.sunAltDeg - c.sun.topocentricAltDeg).toFixed(4)}`,
      `moon Ra ${gap(probe.moonRaDeg, c.moon.apparentRaDeg).toFixed(5)}  Dec ${gap(probe.moonDecDeg, c.moon.apparentDecDeg).toFixed(5)}  Az ${gap(probe.moonAzDeg, c.moon.topocentricAzDeg).toFixed(5)}  Alt(vs refracted JPL) ${gap(probe.moonAltDeg, refracted(c.moon.topocentricAltDeg)).toFixed(5)}  lift ${(probe.moonAltDeg - c.moon.topocentricAltDeg).toFixed(4)}`,
      `moon phase(signed) ${circularDiff(probe.phaseAngleDeg, jplPhase).toFixed(5)}  engine ${probe.phaseAngleDeg.toFixed(4)} jpl ${jplPhase.toFixed(4)}  eclLat ${c.moon.geocentricEclipticLatDeg.toFixed(4)}  illum ${gap(probe.illuminatedFraction, c.moon.geocentricIlluminatedFraction).toFixed(6)}`,
      `subsolar lat ${gap(probe.subsolarLatDeg, c.subsolar.latDeg).toFixed(5)}  lon ${gap(probe.subsolarLonDeg, c.subsolar.lonDeg).toFixed(5)}`,
    ];
    for (const e of events) {
      if (e.engineUtc === null) {
        lines.push(`${e.kind.padEnd(8)} (no event)`);
        continue;
      }
      const minutes = (new Date(e.jplCrossingUtc) - new Date(e.engineUtc)) / 60000;
      lines.push(
        `${e.kind.padEnd(8)} alt@engine ${e.jplElevationAtEngineDeg.toFixed(4)} vs limb ${e.limbHorizonDeg.toFixed(4)} ` +
          `resid ${(e.jplElevationAtEngineDeg - e.limbHorizonDeg).toFixed(4)} deg  time vs JPL crossing ${minutes.toFixed(3)} min`,
      );
    }
    console.log(c.id);
    for (const l of lines) console.log("    ", l);
  }
  return c;
}

// ------------------------------------------------------------------ output

function render(cases) {
  const rows = cases
    .map((c) => {
      const events = c.events
        .map(
          (e) =>
            `      { kind: ${JSON.stringify(e.kind)}, engineUtc: ${JSON.stringify(e.engineUtc)}, ` +
            `jplElevationAtEngineDeg: ${e.jplElevationAtEngineDeg}, ` +
            `jplCrossingUtc: ${JSON.stringify(e.jplCrossingUtc)}, ` +
            `limbHorizonDeg: ${e.limbHorizonDeg}, ` +
            `angularDiameterArcsec: ${e.angularDiameterArcsec} },`,
        )
        .join("\n");
      return `  {
    id: ${JSON.stringify(c.id)},
    location: { id: ${JSON.stringify(c.location.id)}, name: ${JSON.stringify(c.location.name)}, latDeg: ${c.location.latDeg}, lonDeg: ${c.location.lonDeg} },
    date: { id: ${JSON.stringify(c.date.id)}, label: ${JSON.stringify(c.date.label)}, refInstantUtc: ${JSON.stringify(c.date.refInstantUtc)} },
    sun: {
      apparentRaDeg: ${c.sun.apparentRaDeg},
      apparentDecDeg: ${c.sun.apparentDecDeg},
      topocentricAltDeg: ${c.sun.topocentricAltDeg},
      topocentricAzDeg: ${c.sun.topocentricAzDeg},
      geocentricEclipticLonDeg: ${c.sun.geocentricEclipticLonDeg},
    },
    moon: {
      apparentRaDeg: ${c.moon.apparentRaDeg},
      apparentDecDeg: ${c.moon.apparentDecDeg},
      geocentricEclipticLonDeg: ${c.moon.geocentricEclipticLonDeg},
      geocentricEclipticLatDeg: ${c.moon.geocentricEclipticLatDeg},
      geocentricIlluminatedFraction: ${c.moon.geocentricIlluminatedFraction},
      topocentricAltDeg: ${c.moon.topocentricAltDeg},
      topocentricAzDeg: ${c.moon.topocentricAzDeg},
    },
    subsolar: { latDeg: ${c.subsolar.latDeg}, lonDeg: ${c.subsolar.lonDeg} },
    events: [
${events}
    ],
  },`;
    })
    .join("\n");

  return `/**
 * CHK-001 reference data — NASA/JPL Horizons. GENERATED, do not edit by hand.
 *
 * Regenerate with:  node scripts/build-horizons-fixture.mjs
 * Then run:          node scripts/build-horizons-fixture.mjs --measure
 * to print the engine's own values beside each pinned one.
 *
 * Source: Horizons API, \`ssd.jpl.nasa.gov/api/horizons.api\`, DE441 ephemerides,
 * target radii 695700 km (Sun) and 1737.4 km (Moon). Positions and altitudes are
 * topocentric — \`CENTER='coord@399'\` with the site's own coordinates —
 * because that is what the engine computes; the ecliptic longitudes and the
 * illuminated fraction are geocentric, because \`MoonPhase\` and
 * \`Illumination\` take no observer. Columns are apparent RA/Dec of date,
 * airless topocentric altitude and azimuth, geocentric ecliptic-of-date
 * longitude (both bodies) and latitude (moon), the moon's illuminated percent,
 * the angular diameter, and the altitude at each rise/set the engine reports.
 *
 * \`events[].jplCrossingUtc\` is JPL's own crossing of \`limbHorizonDeg\` on a
 * one-minute grid, found by linear interpolation. That altitude is
 * \`-(34' refraction) - semidiameter\`: the rule astronomy-engine's
 * \`SearchRiseSet\` implements, expressed with JPL's own angular diameter.
 * \`engineUtc\` is where the engine put the event WHEN THE FIXTURE WAS BUILT.
 * It is provenance — it says which JPL rows were read — and the test never
 * asserts against it; the engine's live value is compared to
 * \`jplCrossingUtc\`. \`jplElevationAtEngineDeg\` is JPL's altitude at that
 * recorded instant, so \`jplElevationAtEngineDeg - limbHorizonDeg\` is a
 * fixture self-consistency check, not a live engine check.
 *
 * The generator pins \`process.env.TZ = 'UTC'\`, because the moon's day-anchored
 * rise and set are sought from local midnight. The test pins itself the same
 * way and asserts it took.
 */

/** One rise or set, as the engine reported it and as JPL sees it. */
export interface HorizonEvent {
  readonly kind: "sunrise" | "sunset" | "moonrise" | "moonset";
  /** When the engine says the event happens. Null when there is no event. */
  readonly engineUtc: string | null;
  /** JPL's airless topocentric centre altitude at that instant, degrees. */
  readonly jplElevationAtEngineDeg: number | null;
  /** When JPL's own elevation crosses \`limbHorizonDeg\`, ISO 8601. */
  readonly jplCrossingUtc: string | null;
  /** Centre altitude for the upper limb on the horizon, degrees. */
  readonly limbHorizonDeg: number | null;
  readonly angularDiameterArcsec: number | null;
}

export interface HorizonCase {
  readonly id: string;
  readonly location: { readonly id: string; readonly name: string; readonly latDeg: number; readonly lonDeg: number };
  readonly date: { readonly id: string; readonly label: string; readonly refInstantUtc: string };
  readonly sun: {
    readonly apparentRaDeg: number;
    readonly apparentDecDeg: number;
    /** Airless. The engine's altitude is this plus \`Refraction("normal", this)\`. */
    readonly topocentricAltDeg: number;
    readonly topocentricAzDeg: number;
    /** Geocentric apparent ecliptic-of-date longitude, degrees. */
    readonly geocentricEclipticLonDeg: number;
  };
  readonly moon: {
    readonly apparentRaDeg: number;
    readonly apparentDecDeg: number;
    /**
     * Geocentric apparent ecliptic-of-date longitude, degrees. The engine's
     * signed phase angle is \`moon.lon - sun.lon\` (mod 360): 0 new, 180 full.
     */
    readonly geocentricEclipticLonDeg: number;
    /** Geocentric ecliptic latitude, degrees; near zero at an eclipse. */
    readonly geocentricEclipticLatDeg: number;
    readonly geocentricIlluminatedFraction: number;
    /** Airless, as for the sun. */
    readonly topocentricAltDeg: number;
    readonly topocentricAzDeg: number;
  };
  /** The subsolar point implied by JPL's sun azimuth and altitude alone. */
  readonly subsolar: { readonly latDeg: number; readonly lonDeg: number };
  readonly events: readonly HorizonEvent[];
}

/** 3 locations x 4 dates, 2026-03-20 through 2026-12-21. */
export const HORIZONS_REFERENCE: readonly HorizonCase[] = [
${rows}
];
`;
}

async function main() {
  const cases = [];
  for (const location of LOCATIONS) {
    for (const date of DATES) {
      cases.push(await buildCase(location, date));
    }
  }
  const target = resolve(HERE, "..", "web", "src", "engine", "horizons-reference.ts");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, render(cases), "utf8");
  console.log(`\nwrote ${cases.length} cases to ${target}`);
}

await main();
