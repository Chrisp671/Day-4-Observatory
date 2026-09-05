/**
 * THE SCENE — the second seam (SEAM-003), beside frame() (SEAM-001).
 *
 * One call per displayed instant returns everything the page needs, in the
 * page's own units, already worded. On the far side of this seam: astronomy,
 * milliseconds, time zones, day-anchoring, caching, ring order, honest
 * weight, the season search, the verse of the day, the spoken transcript. On
 * the near side: painters that draw what they are handed, and a shell that
 * binds DOM elements and input. Neither side may reach across.
 *
 * Why it exists (DEC-037): the shell had become the place where four caches,
 * two unit conversions and two data shapes met. Every new view meant editing
 * it. Now a view is a painter of one slice of the Scene, and the Rust engine
 * swap (DEC-002) has one more contract it must honour and nothing else.
 *
 * Units and conventions — binding for every field below:
 *   - "Hours" are dial hours of the viewer's civil day, 0..24, noon at the
 *     top (clockface.ts). A painter turns hours into an angle with
 *     hourToAngle() and never sees a timestamp.
 *   - "Fraction" is a fraction of R, the band's face radius. Fixed geometry
 *     (band, earth, numerals) stays in clockface.FACE; the Scene carries only
 *     the fractions that the design moves (ring radii, the moon's orbit).
 *   - Strings are final: formatted, cased, and in the page's voice. The shell
 *     sets textContent and nothing more.
 *   - null means "the sky gives no such event here" (polar day and night,
 *     the monthly day with no moonrise). It is never an error.
 *
 * Errors are defined out of existence: scene() never throws. An unknown lit
 * name lights nothing; a station off the map is clamped by the engine; a
 * missing event is null and the painter draws nothing for it.
 *
 * Memoisation lives inside: day-anchored values (sun day, moon day, planet
 * days, seasons, passion hours) by local date and station; the board by
 * minute; the frame by second. Callers call once per tick and keep nothing.
 */
import type { Station } from "./location";
import { frame, type FrameState } from "../engine/frame";
import { sceneBand, sceneEarth, sceneLight, sceneMarks, sceneMoon, sceneSun } from "./scene-core";
import { sceneReadouts, sceneRete, sceneSpoken, sceneTonight } from "./scene-plinth";

/* ————————————————————————————— request ————————————————————————————— */

export interface SceneRequest {
  /** The instant the instrument shows (real now + travel offset). */
  readonly displayedUnixMillis: number;
  /** The real present, for the gnomon and the verse of the day. */
  readonly nowUnixMillis: number;
  readonly station: Station;
  /** The ring the viewer tapped, or null for honest weights all round. */
  readonly lit: string | null;
}

/* ————————————————————————————— the light ————————————————————————————— */

/** The page follows the sun (DEC-010): field colours, star visibility, the
 * lapis ground under the dial, the axis's luminosity, the sun's own colour. */
export interface SceneLight {
  readonly field: string;
  readonly deep: string;
  /** 0..1 star visibility; the firmament redraws when this moves by ≥ 0.5°-bucket. */
  readonly stars: number;
  /** 0..1 warm glow at the foot of the page at dawn and dusk. */
  readonly horizonGlow: number;
  /** 0..1 presence of the lapis medallion beneath the dial (ground.ts). */
  readonly ground: number;
  /** 0..1 luminosity of the axis (Col 1:17): plain by day, light by night. */
  readonly axis: number;
  readonly sunColor: string;
  /** Key that changes only when the light meaningfully changes; the shell
   * uses it to decide whether the firmament must redraw. */
  readonly key: string;
}

/* ————————————————————————————— the dial ————————————————————————————— */

/** The band: day, night, the two twilights, the darkened hours, solar noon. */
export interface SceneBand {
  /** Next sunrise / sunset on the dial; null in polar day or night. */
  readonly riseHours: number | null;
  readonly setHours: number | null;
  /** The sixth hour to the ninth (Mark 15:33), reckoned seasonally (DEC-024). */
  readonly passion: { readonly fromHours: number; readonly toHours: number } | null;
  /** Solar noon, which is the sixth hour; the gold diamond on the rim. */
  readonly noonHours: number | null;
}

export interface SceneSun {
  readonly hours: number;
  readonly color: string;
}

export interface SceneMoon {
  readonly hours: number;
  readonly phaseAngleDeg: number;
  /** Orbit radius as a fraction of R. */
  readonly orbit: number;
  /** Today's up-arc, rise to the following set; null on the no-moonrise day. */
  readonly upArc: { readonly riseHours: number; readonly setHours: number } | null;
}

export interface SceneEarth {
  /** Where the sun stands on the dial; the night hemisphere faces away. */
  readonly sunHours: number;
}

/** How a ring is drawn. "lit" is the tapped one; "bright" is up after dark;
 * "faint" is a daytime object; "dim" is every other ring while one is lit. */
export type RingWeight = "lit" | "bright" | "faint" | "dim";

/** One planet ring on the rete, outside the band (DEC-036). */
export interface SceneRing {
  readonly name: string;
  readonly color: string;
  /** Radius as a fraction of R; Mercury nearest the band, Saturn farthest. */
  readonly radius: number;
  readonly riseHours: number;
  readonly setHours: number;
  /** The peak (culmination), or null when it falls outside the up-window. */
  readonly peakHours: number | null;
  readonly weight: RingWeight;
}

/** The gnomon: the hour the viewer is actually living in (DEC-020). */
export interface SceneMarks {
  readonly nowHours: number;
  /** True once the instrument has been scrubbed away from the present. */
  readonly travelled: boolean;
}

/* ————————————————————————————— the plinth ————————————————————————————— */

/** Every string the header and plinth show. Empty string means "show
 * nothing" — the shell hides empty elements by CSS, never by logic. */
export interface SceneReadouts {
  readonly verse: string;
  readonly verseRef: string;
  /** "Sunset in" / "Sunrise in" / "Polar day or night". */
  readonly heroKind: string;
  /** "2h 37m", or "" when there is no next event. */
  readonly heroValue: string;
  /** "Friday, October 2" while travelled; "" when live. */
  readonly travelledDate: string;
  /** "readouts in CDT — …" when the device clock is not the station's; else "". */
  readonly zoneNote: string;
  readonly sunRise: string;
  readonly sunSet: string;
  readonly moonPhase: string;
  readonly moonTimes: string;
  readonly station: string;
  readonly clock: string;
  readonly zone: string;
  /** "The sixth hour to the ninth · 11:55 am–3:10 pm" only while it passes. */
  readonly passion: string;
}

/** One row of the ledger, glance or programme. */
export interface SceneRow {
  readonly name: string;
  readonly line: string;
  readonly up: boolean;
  /** Ring colour for a planet; null for a constellation. */
  readonly color: string | null;
  /** True for the tapped planet's row. */
  readonly lit: boolean;
  /** Mazzaroth: a constellation of the sun's path (Job 38:32). */
  readonly starred: boolean;
}

export interface SceneMovement {
  readonly title: string;
  readonly rows: readonly SceneRow[];
}

export interface SceneTonight {
  /** "visible after dark" until the sky is dark enough; else "". */
  readonly note: string;
  /** The three headliners: the lit planet, then favourites, then the sky. */
  readonly glance: readonly SceneRow[];
  /** The fold: The Wandering Stars, Up Now, Still to Rise. */
  readonly programme: readonly SceneMovement[];
  readonly footnote: string;
}

/* ————————————————————————————— the whole ————————————————————————————— */

export interface Scene {
  readonly light: SceneLight;
  readonly band: SceneBand;
  readonly sun: SceneSun;
  readonly moon: SceneMoon;
  readonly earth: SceneEarth;
  /** In ring order, Mercury first. A planet without a rise and set that day is absent. */
  readonly rete: readonly SceneRing[];
  readonly marks: SceneMarks;
  readonly readouts: SceneReadouts;
  readonly tonight: SceneTonight;
  /** The dial in one plain paragraph, for aria-describedby (DEC-029). */
  readonly spoken: string;
}

/**
 * The only entry point. Pure with respect to its arguments; memoised inside.
 * Never throws.
 *
 * Composition: one engine frame per displayed second and station, handed to
 * the two halves of the scene — the core (light and dial) and the plinth
 * (rete, readouts, tonight, transcript). Each half keeps its own day-anchored
 * memos; this function keeps only the frame.
 */
export function scene(request: SceneRequest): Scene {
  const f = frameFor(request);
  const input = { frame: f, request };
  return {
    light: sceneLight(input),
    band: sceneBand(input),
    sun: sceneSun(input),
    moon: sceneMoon(input),
    earth: sceneEarth(input),
    rete: sceneRete(input),
    marks: sceneMarks(input),
    readouts: sceneReadouts(input),
    tonight: sceneTonight(input),
    spoken: sceneSpoken(input),
  };
}

let frameKey = "";
let frameMemo: FrameState | null = null;

/** The engine frame for the displayed second at this station, memoised. */
function frameFor(request: SceneRequest): FrameState {
  const key = `${Math.floor(request.displayedUnixMillis / 1000)}|${request.station.lat}|${request.station.lon}`;
  if (frameMemo === null || key !== frameKey) {
    frameKey = key;
    frameMemo = frame(request.displayedUnixMillis, request.station.lat, request.station.lon);
  }
  return frameMemo;
}
