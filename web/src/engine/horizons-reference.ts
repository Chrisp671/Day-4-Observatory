/**
 * CHK-001 reference data — NASA/JPL Horizons. GENERATED, do not edit by hand.
 *
 * Regenerate with:  node scripts/build-horizons-fixture.mjs
 * Then run:          node scripts/build-horizons-fixture.mjs --measure
 * to print the engine's own values beside each pinned one.
 *
 * Source: Horizons API, `ssd.jpl.nasa.gov/api/horizons.api`, DE441 ephemerides,
 * target radii 695700 km (Sun) and 1737.4 km (Moon). Positions and altitudes are
 * topocentric — `CENTER='coord@399'` with the site's own coordinates —
 * because that is what the engine computes; the ecliptic longitudes and the
 * illuminated fraction are geocentric, because `MoonPhase` and
 * `Illumination` take no observer. Columns are apparent RA/Dec of date,
 * airless topocentric altitude and azimuth, geocentric ecliptic-of-date
 * longitude (both bodies) and latitude (moon), the moon's illuminated percent,
 * the angular diameter, and the altitude at each rise/set the engine reports.
 *
 * `events[].jplCrossingUtc` is JPL's own crossing of `limbHorizonDeg` on a
 * one-minute grid, found by linear interpolation. That altitude is
 * `-(34' refraction) - semidiameter`: the rule astronomy-engine's
 * `SearchRiseSet` implements, expressed with JPL's own angular diameter.
 * `engineUtc` is where the engine put the event WHEN THE FIXTURE WAS BUILT.
 * It is provenance — it says which JPL rows were read — and the test never
 * asserts against it; the engine's live value is compared to
 * `jplCrossingUtc`. `jplElevationAtEngineDeg` is JPL's altitude at that
 * recorded instant, so `jplElevationAtEngineDeg - limbHorizonDeg` is a
 * fixture self-consistency check, not a live engine check.
 *
 * The generator pins `process.env.TZ = 'UTC'`, because the moon's day-anchored
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
  /** When JPL's own elevation crosses `limbHorizonDeg`, ISO 8601. */
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
    /** Airless. The engine's altitude is this plus `Refraction("normal", this)`. */
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
     * signed phase angle is `moon.lon - sun.lon` (mod 360): 0 new, 180 full.
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
  {
    id: "new-york@2026-03-20",
    location: { id: "new-york", name: "New York, NY, USA", latDeg: 40.7128, lonDeg: -74.006 },
    date: { id: "2026-03-20", label: "March equinox", refInstantUtc: "2026-03-20T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 359.896666,
      apparentDecDeg: -0.04708,
      topocentricAltDeg: 10.634824,
      topocentricAzDeg: 99.362904,
      geocentricEclipticLonDeg: 359.885427,
    },
    moon: {
      apparentRaDeg: 16.869006,
      apparentDecDeg: 9.865329,
      geocentricEclipticLonDeg: 18.863988,
      geocentricEclipticLatDeg: 3.369138,
      geocentricIlluminatedFraction: 0.028147,
      topocentricAltDeg: 4.287825,
      topocentricAzDeg: 80.668202,
    },
    subsolar: { latDeg: -0.04708, lonDeg: 1.86069 },
    events: [
      { kind: "sunrise", engineUtc: "2026-03-21T10:57:38.631Z", jplElevationAtEngineDeg: -0.835847, jplCrossingUtc: "2026-03-21T10:57:38.537Z", limbHorizonDeg: -0.83415, angularDiameterArcsec: 1925.879 },
      { kind: "sunset", engineUtc: "2026-03-20T23:08:11.342Z", jplElevationAtEngineDeg: -0.833496, jplCrossingUtc: "2026-03-20T23:08:11.220Z", limbHorizonDeg: -0.834189, angularDiameterArcsec: 1926.158 },
      { kind: "moonrise", engineUtc: "2026-03-20T11:31:55.060Z", jplElevationAtEngineDeg: -0.836323, jplCrossingUtc: "2026-03-20T11:31:55.141Z", limbHorizonDeg: -0.835896, angularDiameterArcsec: 1938.454 },
      { kind: "moonset", engineUtc: "2026-03-21T01:24:21.841Z", jplElevationAtEngineDeg: -0.835672, jplCrossingUtc: "2026-03-21T01:24:21.666Z", limbHorizonDeg: -0.837567, angularDiameterArcsec: 1950.48 },
    ],
  },
  {
    id: "new-york@2026-06-21",
    location: { id: "new-york", name: "New York, NY, USA", latDeg: 40.7128, lonDeg: -74.006 },
    date: { id: "2026-06-21", label: "June solstice", refInstantUtc: "2026-06-21T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 90.157591,
      apparentDecDeg: 23.436589,
      topocentricAltDeg: 26.469614,
      topocentricAzDeg: 80.926666,
      geocentricEclipticLonDeg: 90.142812,
    },
    moon: {
      apparentRaDeg: 175.063461,
      apparentDecDeg: -0.558479,
      geocentricEclipticLonDeg: 175.217,
      geocentricEclipticLatDeg: -2.016746,
      geocentricIlluminatedFraction: 0.458358,
      topocentricAltDeg: -45.700425,
      topocentricAzDeg: 30.298005,
    },
    subsolar: { latDeg: 23.436589, lonDeg: 0.456223 },
    events: [
      { kind: "sunrise", engineUtc: "2026-06-22T09:25:17.160Z", jplElevationAtEngineDeg: -0.829621, jplCrossingUtc: "2026-06-22T09:25:17.286Z", limbHorizonDeg: -0.828857, angularDiameterArcsec: 1887.773 },
      { kind: "sunset", engineUtc: "2026-06-22T00:30:42.668Z", jplElevationAtEngineDeg: -0.82691, jplCrossingUtc: "2026-06-22T00:30:42.734Z", limbHorizonDeg: -0.828865, angularDiameterArcsec: 1887.825 },
      { kind: "moonrise", engineUtc: "2026-06-21T16:49:31.300Z", jplElevationAtEngineDeg: -0.824066, jplCrossingUtc: "2026-06-21T16:49:31.230Z", limbHorizonDeg: -0.823372, angularDiameterArcsec: 1848.276 },
      { kind: "moonset", engineUtc: "2026-06-22T04:50:34.718Z", jplElevationAtEngineDeg: -0.819906, jplCrossingUtc: "2026-06-22T04:50:34.787Z", limbHorizonDeg: -0.822344, angularDiameterArcsec: 1840.88 },
    ],
  },
  {
    id: "new-york@2026-08-12",
    location: { id: "new-york", name: "New York, NY, USA", latDeg: 40.7128, lonDeg: -74.006 },
    date: { id: "2026-08-12", label: "total solar eclipse — moon new", refInstantUtc: "2026-08-12T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 142.222228,
      apparentDecDeg: 14.872487,
      topocentricAltDeg: 20.711127,
      topocentricAzDeg: 87.899236,
      geocentricEclipticLonDeg: 139.808346,
    },
    moon: {
      apparentRaDeg: 140.241377,
      apparentDecDeg: 16.432892,
      geocentricEclipticLonDeg: 136.651203,
      geocentricEclipticLatDeg: 1.201874,
      geocentricIlluminatedFraction: 0.00087,
      topocentricAltDeg: 23.174904,
      topocentricAzDeg: 87.845292,
    },
    subsolar: { latDeg: 14.872487, lonDeg: 1.266683 },
    events: [
      { kind: "sunrise", engineUtc: "2026-08-13T10:04:29.437Z", jplElevationAtEngineDeg: -0.831233, jplCrossingUtc: "2026-08-13T10:04:29.533Z", limbHorizonDeg: -0.829653, angularDiameterArcsec: 1893.501 },
      { kind: "sunset", engineUtc: "2026-08-12T23:57:54.999Z", jplElevationAtEngineDeg: -0.826523, jplCrossingUtc: "2026-08-12T23:57:55.051Z", limbHorizonDeg: -0.829636, angularDiameterArcsec: 1893.38 },
      { kind: "moonrise", engineUtc: "2026-08-12T09:43:00.662Z", jplElevationAtEngineDeg: -0.83929, jplCrossingUtc: "2026-08-12T09:43:00.366Z", limbHorizonDeg: -0.838282, angularDiameterArcsec: 1955.633 },
      { kind: "moonset", engineUtc: "2026-08-13T00:04:47.453Z", jplElevationAtEngineDeg: -0.836405, jplCrossingUtc: "2026-08-13T00:04:47.452Z", limbHorizonDeg: -0.83773, angularDiameterArcsec: 1951.658 },
    ],
  },
  {
    id: "new-york@2026-12-21",
    location: { id: "new-york", name: "New York, NY, USA", latDeg: 40.7128, lonDeg: -74.006 },
    date: { id: "2026-12-21", label: "December solstice", refInstantUtc: "2026-12-21T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 269.593428,
      apparentDecDeg: -23.438554,
      topocentricAltDeg: -3.567138,
      topocentricAzDeg: 118.173221,
      geocentricEclipticLonDeg: 269.625145,
    },
    moon: {
      apparentRaDeg: 49.33115,
      apparentDecDeg: 22.756372,
      geocentricEclipticLonDeg: 53.559885,
      geocentricEclipticLatDeg: 5.106907,
      geocentricIlluminatedFraction: 0.90298,
      topocentricAltDeg: -19.400156,
      topocentricAzDeg: 327.573055,
    },
    subsolar: { latDeg: -23.438554, lonDeg: -0.481462 },
    events: [
      { kind: "sunrise", engineUtc: "2026-12-21T12:16:33.267Z", jplElevationAtEngineDeg: -0.838411, jplCrossingUtc: "2026-12-21T12:16:33.330Z", limbHorizonDeg: -0.837518, angularDiameterArcsec: 1950.128 },
      { kind: "sunset", engineUtc: "2026-12-21T21:31:49.364Z", jplElevationAtEngineDeg: -0.836137, jplCrossingUtc: "2026-12-21T21:31:49.512Z", limbHorizonDeg: -0.837527, angularDiameterArcsec: 1950.197 },
      { kind: "moonrise", engineUtc: "2026-12-21T19:00:03.715Z", jplElevationAtEngineDeg: -0.842575, jplCrossingUtc: "2026-12-21T19:00:03.840Z", limbHorizonDeg: -0.840421, angularDiameterArcsec: 1971.032 },
      { kind: "moonset", engineUtc: "2026-12-22T10:52:33.143Z", jplElevationAtEngineDeg: -0.84312, jplCrossingUtc: "2026-12-22T10:52:33.070Z", limbHorizonDeg: -0.843289, angularDiameterArcsec: 1991.683 },
    ],
  },
  {
    id: "sydney@2026-03-20",
    location: { id: "sydney", name: "Sydney, NSW, Australia", latDeg: -33.8688, lonDeg: 151.2093 },
    date: { id: "2026-03-20", label: "March equinox", refInstantUtc: "2026-03-20T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 359.893741,
      apparentDecDeg: -0.044128,
      topocentricAltDeg: -45.553201,
      topocentricAzDeg: 226.71765,
      geocentricEclipticLonDeg: 359.885427,
    },
    moon: {
      apparentRaDeg: 15.500496,
      apparentDecDeg: 10.935403,
      geocentricEclipticLonDeg: 18.863988,
      geocentricEclipticLatDeg: 3.369138,
      geocentricIlluminatedFraction: 0.028147,
      topocentricAltDeg: -42.021915,
      topocentricAzDeg: 252.707043,
    },
    subsolar: { latDeg: -0.044128, lonDeg: 1.857712 },
    events: [
      { kind: "sunrise", engineUtc: "2026-03-20T19:58:43.571Z", jplElevationAtEngineDeg: -0.835704, jplCrossingUtc: "2026-03-20T19:58:43.436Z", limbHorizonDeg: -0.834196, angularDiameterArcsec: 1926.211 },
      { kind: "sunset", engineUtc: "2026-03-21T08:05:35.579Z", jplElevationAtEngineDeg: -0.832528, jplCrossingUtc: "2026-03-21T08:05:35.472Z", limbHorizonDeg: -0.834161, angularDiameterArcsec: 1925.96 },
      { kind: "moonrise", engineUtc: "2026-03-20T22:04:47.558Z", jplElevationAtEngineDeg: -0.838027, jplCrossingUtc: "2026-03-20T22:04:47.478Z", limbHorizonDeg: -0.836511, angularDiameterArcsec: 1942.878 },
      { kind: "moonset", engineUtc: "2026-03-21T09:06:06.093Z", jplElevationAtEngineDeg: -0.837849, jplCrossingUtc: "2026-03-21T09:06:06.030Z", limbHorizonDeg: -0.837946, angularDiameterArcsec: 1953.208 },
    ],
  },
  {
    id: "sydney@2026-06-21",
    location: { id: "sydney", name: "Sydney, NSW, Australia", latDeg: -33.8688, lonDeg: 151.2093 },
    date: { id: "2026-06-21", label: "June solstice", refInstantUtc: "2026-06-21T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 90.15452,
      apparentDecDeg: 23.438394,
      topocentricAltDeg: -62.42216,
      topocentricAzDeg: 255.505128,
      geocentricEclipticLonDeg: 90.142812,
    },
    moon: {
      apparentRaDeg: 174.087077,
      apparentDecDeg: 0.576798,
      geocentricEclipticLonDeg: 175.217,
      geocentricEclipticLatDeg: -2.016746,
      geocentricIlluminatedFraction: 0.458358,
      topocentricAltDeg: 18.73275,
      topocentricAzDeg: 283.910891,
    },
    subsolar: { latDeg: 23.438394, lonDeg: 0.453088 },
    events: [
      { kind: "sunrise", engineUtc: "2026-06-21T21:00:12.010Z", jplElevationAtEngineDeg: -0.829078, jplCrossingUtc: "2026-06-21T21:00:12.070Z", limbHorizonDeg: -0.828865, angularDiameterArcsec: 1887.826 },
      { kind: "sunset", engineUtc: "2026-06-22T06:54:00.990Z", jplElevationAtEngineDeg: -0.825475, jplCrossingUtc: "2026-06-22T06:54:01.108Z", limbHorizonDeg: -0.828861, angularDiameterArcsec: 1887.798 },
      { kind: "moonrise", engineUtc: "2026-06-21T01:24:58.693Z", jplElevationAtEngineDeg: -0.828462, jplCrossingUtc: "2026-06-21T01:24:58.773Z", limbHorizonDeg: -0.82584, angularDiameterArcsec: 1866.051 },
      { kind: "moonset", engineUtc: "2026-06-21T13:38:53.193Z", jplElevationAtEngineDeg: -0.824342, jplCrossingUtc: "2026-06-21T13:38:53.115Z", limbHorizonDeg: -0.824722, angularDiameterArcsec: 1858 },
    ],
  },
  {
    id: "sydney@2026-08-12",
    location: { id: "sydney", name: "Sydney, NSW, Australia", latDeg: -33.8688, lonDeg: 151.2093 },
    date: { id: "2026-08-12", label: "total solar eclipse — moon new", refInstantUtc: "2026-08-12T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 142.219275,
      apparentDecDeg: 14.874751,
      topocentricAltDeg: -56.893618,
      topocentricAzDeg: 242.399645,
      geocentricEclipticLonDeg: 139.808346,
    },
    moon: {
      apparentRaDeg: 139.090012,
      apparentDecDeg: 17.299351,
      geocentricEclipticLonDeg: 136.651203,
      geocentricEclipticLatDeg: 1.201874,
      geocentricIlluminatedFraction: 0.00087,
      topocentricAltDeg: -60.755091,
      topocentricAzDeg: 242.246551,
    },
    subsolar: { latDeg: 14.874751, lonDeg: 1.263665 },
    events: [
      { kind: "sunrise", engineUtc: "2026-08-12T20:36:44.154Z", jplElevationAtEngineDeg: -0.830276, jplCrossingUtc: "2026-08-12T20:36:44.196Z", limbHorizonDeg: -0.829628, angularDiameterArcsec: 1893.319 },
      { kind: "sunset", engineUtc: "2026-08-13T07:23:53.909Z", jplElevationAtEngineDeg: -0.826396, jplCrossingUtc: "2026-08-13T07:23:53.985Z", limbHorizonDeg: -0.82965, angularDiameterArcsec: 1893.481 },
      { kind: "moonrise", engineUtc: "2026-08-12T20:50:02.056Z", jplElevationAtEngineDeg: -0.837365, jplCrossingUtc: "2026-08-12T20:50:02.062Z", limbHorizonDeg: -0.837166, angularDiameterArcsec: 1947.597 },
      { kind: "moonset", engineUtc: "2026-08-13T07:57:31.077Z", jplElevationAtEngineDeg: -0.837363, jplCrossingUtc: "2026-08-13T07:57:30.844Z", limbHorizonDeg: -0.836864, angularDiameterArcsec: 1945.42 },
    ],
  },
  {
    id: "sydney@2026-12-21",
    location: { id: "sydney", name: "Sydney, NSW, Australia", latDeg: -33.8688, lonDeg: 151.2093 },
    date: { id: "2026-12-21", label: "December solstice", refInstantUtc: "2026-12-21T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 269.590299,
      apparentDecDeg: -23.434917,
      topocentricAltDeg: -26.685449,
      topocentricAzDeg: 209.139183,
      geocentricEclipticLonDeg: 269.625145,
    },
    moon: {
      apparentRaDeg: 49.602771,
      apparentDecDeg: 24.445967,
      geocentricEclipticLonDeg: 53.559885,
      geocentricEclipticLatDeg: 5.106907,
      geocentricIlluminatedFraction: 0.90298,
      topocentricAltDeg: 30.63698,
      topocentricAzDeg: 347.630121,
    },
    subsolar: { latDeg: -23.434917, lonDeg: -0.484631 },
    events: [
      { kind: "sunrise", engineUtc: "2026-12-21T18:41:06.261Z", jplElevationAtEngineDeg: -0.838705, jplCrossingUtc: "2026-12-21T18:41:06.392Z", limbHorizonDeg: -0.837523, angularDiameterArcsec: 1950.165 },
      { kind: "sunset", engineUtc: "2026-12-22T09:05:55.227Z", jplElevationAtEngineDeg: -0.836689, jplCrossingUtc: "2026-12-22T09:05:55.281Z", limbHorizonDeg: -0.837537, angularDiameterArcsec: 1950.263 },
      { kind: "moonrise", engineUtc: "2026-12-21T06:05:50.670Z", jplElevationAtEngineDeg: -0.840446, jplCrossingUtc: "2026-12-21T06:05:50.718Z", limbHorizonDeg: -0.838355, angularDiameterArcsec: 1956.159 },
      { kind: "moonset", engineUtc: "2026-12-21T16:13:00.063Z", jplElevationAtEngineDeg: -0.840758, jplCrossingUtc: "2026-12-21T16:13:00.024Z", limbHorizonDeg: -0.840828, angularDiameterArcsec: 1973.964 },
    ],
  },
  {
    id: "reykjavik@2026-03-20",
    location: { id: "reykjavik", name: "Reykjavik, Iceland", latDeg: 64.1466, lonDeg: -21.9426 },
    date: { id: "2026-03-20", label: "March equinox", refInstantUtc: "2026-03-20T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 359.895312,
      apparentDecDeg: -0.047687,
      topocentricAltDeg: 23.467696,
      topocentricAzDeg: 153.898356,
      geocentricEclipticLonDeg: 359.885427,
    },
    moon: {
      apparentRaDeg: 16.390239,
      apparentDecDeg: 9.684565,
      geocentricEclipticLonDeg: 18.863988,
      geocentricEclipticLatDeg: 3.369138,
      geocentricIlluminatedFraction: 0.028147,
      topocentricAltDeg: 28.635782,
      topocentricAzDeg: 133.416547,
    },
    subsolar: { latDeg: -0.047687, lonDeg: 1.859151 },
    events: [
      { kind: "sunrise", engineUtc: "2026-03-21T07:25:04.284Z", jplElevationAtEngineDeg: -0.834461, jplCrossingUtc: "2026-03-21T07:25:04.165Z", limbHorizonDeg: -0.834161, angularDiameterArcsec: 1925.961 },
      { kind: "sunset", engineUtc: "2026-03-20T19:43:25.167Z", jplElevationAtEngineDeg: -0.834243, jplCrossingUtc: "2026-03-20T19:43:24.975Z", limbHorizonDeg: -0.834199, angularDiameterArcsec: 1926.231 },
      { kind: "moonrise", engineUtc: "2026-03-20T07:13:40.773Z", jplElevationAtEngineDeg: -0.837378, jplCrossingUtc: "2026-03-20T07:13:40.936Z", limbHorizonDeg: -0.835781, angularDiameterArcsec: 1937.622 },
      { kind: "moonset", engineUtc: "2026-03-20T22:58:16.503Z", jplElevationAtEngineDeg: -0.837073, jplCrossingUtc: "2026-03-20T22:58:16.114Z", limbHorizonDeg: -0.837236, angularDiameterArcsec: 1948.096 },
    ],
  },
  {
    id: "reykjavik@2026-06-21",
    location: { id: "reykjavik", name: "Reykjavik, Iceland", latDeg: 64.1466, lonDeg: -21.9426 },
    date: { id: "2026-06-21", label: "June solstice", refInstantUtc: "2026-06-21T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 90.156131,
      apparentDecDeg: 23.436255,
      topocentricAltDeg: 46.705225,
      topocentricAzDeg: 149.349965,
      geocentricEclipticLonDeg: 90.142812,
    },
    moon: {
      apparentRaDeg: 175.205195,
      apparentDecDeg: -0.797559,
      geocentricEclipticLonDeg: 175.217,
      geocentricEclipticLatDeg: -2.016746,
      geocentricIlluminatedFraction: 0.458358,
      topocentricAltDeg: -8.236085,
      topocentricAzDeg: 74.546531,
    },
    subsolar: { latDeg: 23.436255, lonDeg: 0.454578 },
    events: [
      { kind: "sunrise", engineUtc: "2026-06-22T02:55:35.395Z", jplElevationAtEngineDeg: -0.829248, jplCrossingUtc: "2026-06-22T02:55:35.629Z", limbHorizonDeg: -0.828862, angularDiameterArcsec: 1887.807 },
      { kind: "sunset", engineUtc: "2026-06-22T00:03:50.581Z", jplElevationAtEngineDeg: -0.828588, jplCrossingUtc: "2026-06-22T00:03:50.455Z", limbHorizonDeg: -0.828864, angularDiameterArcsec: 1887.822 },
      { kind: "moonrise", engineUtc: "2026-06-21T13:13:36.384Z", jplElevationAtEngineDeg: -0.824391, jplCrossingUtc: "2026-06-21T13:13:36.160Z", limbHorizonDeg: -0.824119, angularDiameterArcsec: 1853.656 },
      { kind: "moonset", engineUtc: "2026-06-22T01:02:58.035Z", jplElevationAtEngineDeg: -0.822417, jplCrossingUtc: "2026-06-22T01:02:58.179Z", limbHorizonDeg: -0.822741, angularDiameterArcsec: 1843.737 },
    ],
  },
  {
    id: "reykjavik@2026-08-12",
    location: { id: "reykjavik", name: "Reykjavik, Iceland", latDeg: 64.1466, lonDeg: -21.9426 },
    date: { id: "2026-08-12", label: "total solar eclipse — moon new", refInstantUtc: "2026-08-12T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 142.220846,
      apparentDecDeg: 14.872052,
      topocentricAltDeg: 38.194379,
      topocentricAzDeg: 151.012924,
      geocentricEclipticLonDeg: 139.808346,
    },
    moon: {
      apparentRaDeg: 139.64357,
      apparentDecDeg: 16.246546,
      geocentricEclipticLonDeg: 136.651203,
      geocentricEclipticLatDeg: 1.201874,
      geocentricIlluminatedFraction: 0.00087,
      topocentricAltDeg: 40.059179,
      topocentricAzDeg: 153.77085,
    },
    subsolar: { latDeg: 14.872052, lonDeg: 1.265135 },
    events: [
      { kind: "sunrise", engineUtc: "2026-08-13T05:12:36.038Z", jplElevationAtEngineDeg: -0.829839, jplCrossingUtc: "2026-08-13T05:12:36.135Z", limbHorizonDeg: -0.829644, angularDiameterArcsec: 1893.439 },
      { kind: "sunset", engineUtc: "2026-08-12T21:53:51.884Z", jplElevationAtEngineDeg: -0.828395, jplCrossingUtc: "2026-08-12T21:53:51.861Z", limbHorizonDeg: -0.829632, angularDiameterArcsec: 1893.348 },
      { kind: "moonrise", engineUtc: "2026-08-12T04:08:25.553Z", jplElevationAtEngineDeg: -0.838783, jplCrossingUtc: "2026-08-12T04:08:24.834Z", limbHorizonDeg: -0.83897, angularDiameterArcsec: 1960.587 },
      { kind: "moonset", engineUtc: "2026-08-12T21:51:26.172Z", jplElevationAtEngineDeg: -0.837117, jplCrossingUtc: "2026-08-12T21:51:26.427Z", limbHorizonDeg: -0.837756, angularDiameterArcsec: 1951.845 },
    ],
  },
  {
    id: "reykjavik@2026-12-21",
    location: { id: "reykjavik", name: "Reykjavik, Iceland", latDeg: 64.1466, lonDeg: -21.9426 },
    date: { id: "2026-12-21", label: "December solstice", refInstantUtc: "2026-12-21T12:00:00.000Z" },
    sun: {
      apparentRaDeg: 269.59191,
      apparentDecDeg: -23.439327,
      topocentricAltDeg: 0.824269,
      topocentricAzDeg: 160.385556,
      geocentricEclipticLonDeg: 269.625145,
    },
    moon: {
      apparentRaDeg: 49.936283,
      apparentDecDeg: 22.612043,
      geocentricEclipticLonDeg: 53.559885,
      geocentricEclipticLatDeg: 5.106907,
      geocentricIlluminatedFraction: 0.90298,
      topocentricAltDeg: -2.086711,
      topocentricAzDeg: 16.765659,
    },
    subsolar: { latDeg: -23.439327, lonDeg: -0.483127 },
    events: [
      { kind: "sunrise", engineUtc: "2026-12-22T11:22:45.526Z", jplElevationAtEngineDeg: -0.837883, jplCrossingUtc: "2026-12-22T11:22:45.406Z", limbHorizonDeg: -0.837537, angularDiameterArcsec: 1950.265 },
      { kind: "sunset", engineUtc: "2026-12-21T15:29:26.489Z", jplElevationAtEngineDeg: -0.836876, jplCrossingUtc: "2026-12-21T15:29:26.752Z", limbHorizonDeg: -0.837522, angularDiameterArcsec: 1950.156 },
      { kind: "moonrise", engineUtc: "2026-12-21T12:32:11.547Z", jplElevationAtEngineDeg: -0.840512, jplCrossingUtc: "2026-12-21T12:32:12.068Z", limbHorizonDeg: -0.839715, angularDiameterArcsec: 1965.947 },
      { kind: "moonset", engineUtc: null, jplElevationAtEngineDeg: null, jplCrossingUtc: null, limbHorizonDeg: null, angularDiameterArcsec: null },
    ],
  },
];
