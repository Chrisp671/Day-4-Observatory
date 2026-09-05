/**
 * THE PLINTH — the worded half of the Scene (SEAM-003, DEC-037).
 *
 * Everything below the band and around it that is read rather than drawn:
 * the rete's rings and their honest weight, every readout string, the
 * TONIGHT ledger (glance and programme), and the spoken transcript. Ported
 * wording-for-wording from the shell it replaces; the rules are the shell's
 * rules, only now they live on the far side of the seam.
 *
 * Memoisation lives here, keyed as the shell keyed it: the sun day, moon
 * day, planet days and seasons by local date and station; the planet board
 * by the displayed minute and station. Callers keep nothing.
 *
 * Nothing here throws. A failure in the engine yields an empty rete, blank
 * readouts, an empty ledger, or an empty transcript — the painters draw
 * nothing for it and the page stays up.
 */
import type { FrameState } from "../engine/frame";
import { moonDay, planetBoard, planetDays, sunDay, type PlanetDay, type PlanetTimes } from "../engine/planets";
import { planetSeason } from "../engine/season";
import { localHoursOfDay, RING_ORDER, ringFraction } from "../ui/clockface";
import { PLANET_COLORS } from "../ui/theme";
import { fmt12, fmt12c } from "./clock12";
import { mismatchPhrase, zoneReport } from "./clockzone";
import { CONSTELLATIONS, isDarkEnough, tonightBoard, type SkyEntry } from "./constellations";
import { formatCountdown, nextSunEvent } from "./hero";
import { passionHours } from "./hours";
import type {
  SceneMovement,
  SceneReadouts,
  SceneRequest,
  SceneRing,
  SceneRow,
  SceneTonight,
} from "./scene";
import { compassAbbrev, transcript } from "./transcript";
import { VERSE_VERSION, verseOfDay } from "./verse";

export interface PlinthInput {
  readonly frame: FrameState;
  readonly request: SceneRequest;
}

/* ————————————————————————————— never throw ————————————————————————————— */

/** Run `fn`; on any failure hand back `fallback` instead of an exception. */
function safely<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/* ————————————————————————————— keys ————————————————————————————— */

const stationKey = (r: SceneRequest): string => `${r.station.lat}|${r.station.lon}`;

/** Local calendar date + station: the key for every day-anchored value. */
const dayKey = (r: SceneRequest): string =>
  `${new Date(r.displayedUnixMillis).toDateString()}|${stationKey(r)}`;

/* ————————————————————————————— the sun's day ————————————————————————————— */

let sunDayKey = "";
let sunToday: { riseUnixMillis: number | null; setUnixMillis: number | null } =
  { riseUnixMillis: null, setUnixMillis: null };

/** Today's sunrise/sunset, steady until the date changes (DEC-031, turn 98). */
function sunDayNow(r: SceneRequest): typeof sunToday {
  const key = dayKey(r);
  if (key !== sunDayKey) {
    sunDayKey = key;
    sunToday = sunDay(r.displayedUnixMillis, r.station.lat, r.station.lon);
  }
  return sunToday;
}

/* ————————————————————————————— the moon's day ————————————————————————————— */

let moonDayKey = "";
let moonToday: { riseUnixMillis: number | null; setUnixMillis: number | null } =
  { riseUnixMillis: null, setUnixMillis: null };

/** Moon rise/set held steady for the displayed calendar day (REQ-008). */
function moonDayNow(r: SceneRequest): typeof moonToday {
  const key = dayKey(r);
  if (key !== moonDayKey) {
    moonDayKey = key;
    moonToday = moonDay(r.displayedUnixMillis, r.station.lat, r.station.lon);
  }
  return moonToday;
}

/* ————————————————————————————— the rete ————————————————————————————— */

/** Hours the planet is up, allowing for a set that falls after midnight. */
const spanHours = (rise: number, set: number): number => (((set - rise) % 24) + 24) % 24;

/**
 * Hours of real night inside an up-window: the overlap of [rise, set] with
 * the night that runs from this day's sunset to the next sunrise. Polar days
 * and nights pass null and get the whole window (night) or none of it (day).
 */
function nightOverlapHours(
  rise: number,
  set: number,
  dayRise: number | null,
  daySet: number | null,
): number {
  const up = spanHours(rise, set);
  if (dayRise === null || daySet === null) return dayRise === null && daySet === null ? up : 0;
  const nightLen = spanHours(daySet, dayRise);
  // Walk the up-window in 6-minute steps and count those inside the night.
  const STEP = 0.1;
  let total = 0;
  for (let h = 0; h < up; h += STEP) {
    if (spanHours(daySet, (rise + h) % 24) < nightLen) total += STEP;
  }
  return Math.min(up, total);
}

/** A ring counts as "tonight's" when it is up at least this long after dark. */
const NIGHT_MIN_HOURS = 1;

interface DayArc {
  readonly name: string;
  readonly riseHours: number;
  readonly setHours: number;
  readonly transitHours: number | null;
  readonly nightHours: number;
}

let planetDayKey = "";
let planetArcs: readonly DayArc[] = [];

/** The five up-arcs for the displayed calendar day (cached daily). */
function planetArcsNow(r: SceneRequest): readonly DayArc[] {
  const key = dayKey(r);
  if (key !== planetDayKey) {
    planetDayKey = key;
    const sd = sunDayNow(r);
    const dayRise = sd.riseUnixMillis === null ? null : localHoursOfDay(sd.riseUnixMillis);
    const daySet = sd.setUnixMillis === null ? null : localHoursOfDay(sd.setUnixMillis);
    planetArcs = planetDays(r.displayedUnixMillis, r.station.lat, r.station.lon)
      .filter((p: PlanetDay) => p.riseUnixMillis !== null && p.setUnixMillis !== null)
      .map((p: PlanetDay) => {
        const riseHours = localHoursOfDay(p.riseUnixMillis as number);
        const setHours = localHoursOfDay(p.setUnixMillis as number);
        return {
          name: p.name,
          riseHours,
          setHours,
          transitHours: p.transitUnixMillis === null ? null : localHoursOfDay(p.transitUnixMillis),
          nightHours: nightOverlapHours(riseHours, setHours, dayRise, daySet),
        };
      });
  }
  return planetArcs;
}

/**
 * The rete: one ring per planet that rises and sets this calendar day, in
 * ring order, Mercury nearest the band. Honest weight unless one ring is
 * lit; an unknown lit name lights nothing and dims the rest.
 */
export function sceneRete(input: PlinthInput): readonly SceneRing[] {
  return safely((): readonly SceneRing[] => {
    const { request } = input;
    const arcs = [...planetArcsNow(request)]
      .sort((a, b) => RING_ORDER.indexOf(a.name) - RING_ORDER.indexOf(b.name));
    return arcs.map((arc) => ({
      name: arc.name,
      color: PLANET_COLORS[arc.name] ?? "",
      radius: ringFraction(arc.name),
      riseHours: arc.riseHours,
      setHours: arc.setHours,
      peakHours: arc.transitHours,
      weight: request.lit === null
        ? (arc.nightHours >= NIGHT_MIN_HOURS ? "bright" : "faint")
        : (arc.name === request.lit ? "lit" : "dim"),
    }));
  }, []);
}

/* ————————————————————————————— readouts ————————————————————————————— */

const PHASE_NAMES = [
  "new moon", "waxing crescent", "first quarter", "waxing gibbous",
  "full moon", "waning gibbous", "last quarter", "waning crescent",
] as const;

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const phaseName = (phaseAngleDeg: number): string => {
  const phaseIdx = Math.floor((phaseAngleDeg / 360) * 8 + 0.5) % 8;
  return PHASE_NAMES[phaseIdx] ?? "";
};

/** "↑6:12a · ↓9:40p Thu" / "no moonrise today" — the moon's day, worded. */
function moonTimesLine(r: SceneRequest): string {
  const d = new Date(r.displayedUnixMillis);
  const md = moonDayNow(r);
  if (md.riseUnixMillis === null) return "no moonrise today";
  let out = `↑${fmt12c(md.riseUnixMillis)}`;
  if (md.setUnixMillis !== null) {
    const setD = new Date(md.setUnixMillis);
    // The moon often sets on the next date; say so instead of confusing.
    const dayTag = setD.getDate() === d.getDate() ? "" : ` ${WEEKDAY[setD.getDay()] ?? ""}`;
    out += ` · ↓${fmt12c(md.setUnixMillis)}${dayTag}`;
  }
  return out;
}

const BLANK_READOUTS: SceneReadouts = {
  verse: "", verseRef: "", heroKind: "", heroValue: "", travelledDate: "", zoneNote: "",
  sunRise: "", sunSet: "", moonPhase: "", moonTimes: "", station: "", clock: "", zone: "",
  passion: "",
};

/** Every string the header and plinth show, final and in the page's voice. */
export function sceneReadouts(input: PlinthInput): SceneReadouts {
  return safely((): SceneReadouts => {
    const { frame: s, request: r } = input;
    const t = r.displayedUnixMillis;
    const { station } = r;

    // The masthead verse follows the real calendar day (a daily devotion),
    // not the time-travelled instrument time.
    const verse = verseOfDay(r.nowUnixMillis);

    const ev = nextSunEvent(s.sun.nextRiseUnixMillis, s.sun.nextSetUnixMillis);
    const heroKind = ev === null ? "Polar day or night" : ev.kind === "sunset" ? "Sunset in" : "Sunrise in";
    const heroValue = ev === null ? "" : formatCountdown(ev.atUnixMillis - t);

    // Travelled: the header says where you have landed — the date Parker
    // steps toward, month by month, looking for Saturn season (DEC-031).
    const travelledDate = Math.abs(t - r.nowUnixMillis) < 1000
      ? ""
      : new Date(t).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    // Times are rendered in the device's zone; say so, and say when that is not
    // the clock the station keeps (a New York sunrise on a Chicago clock).
    const zone = zoneReport(t, station.lon);
    const zoneNote = zone.mismatched
      ? `readouts in ${zone.label} — ${mismatchPhrase(zone.offsetDeltaHours)}`
      : "";

    const sd = sunDayNow(r);
    const sunRise = sd.riseUnixMillis === null ? "—" : `↑${fmt12(sd.riseUnixMillis)}`;
    const sunSet = sd.setUnixMillis === null ? "" : `↓${fmt12(sd.setUnixMillis)}`;

    // The sixth hour to the ninth, counted from sunrise as Scripture counts
    // them (Mark 15:33). The caption speaks only while they are passing.
    const passion = passionHours(s.sun.dayRiseUnixMillis, s.sun.daySetUnixMillis);
    const inPassion = passion !== null && t >= passion.fromUnixMillis && t <= passion.toUnixMillis;

    return {
      verse: verse.text,
      verseRef: `${verse.reference} · ${VERSE_VERSION}`,
      heroKind,
      heroValue,
      travelledDate,
      zoneNote,
      sunRise,
      sunSet,
      // The phase by name; the age lives in the spoken transcript.
      moonPhase: phaseName(s.moon.phaseAngleDeg),
      moonTimes: moonTimesLine(r),
      station: `${Math.abs(station.lat).toFixed(1)}°${station.lat >= 0 ? "N" : "S"} ${Math.abs(station.lon).toFixed(1)}°${station.lon >= 0 ? "E" : "W"}`,
      clock: fmt12(t),
      zone: zone.label,
      passion: inPassion && passion !== null
        ? `The sixth hour to the ninth · ${fmt12(passion.fromUnixMillis)}–${fmt12(passion.toUnixMillis)}`
        : "",
    };
  }, BLANK_READOUTS);
}

/* ————————————————————————————— tonight ————————————————————————————— */

/** How many of the board's entries the glance shows; the rest wait in the fold. */
const TONIGHT_SLOTS = 3;

let boardKey = "";
let board: readonly PlanetTimes[] = [];

/** The five planets for the displayed minute; searches cached accordingly. */
function planetsNow(r: SceneRequest): readonly PlanetTimes[] {
  const key = `${Math.floor(r.displayedUnixMillis / 60000)}|${stationKey(r)}`;
  if (key !== boardKey) {
    boardKey = key;
    board = planetBoard(r.displayedUnixMillis, r.station.lat, r.station.lon);
  }
  return board;
}

/* ————— the season: Parker's month-by-month hunt, answered ————— */
const seasonCache = new Map<string, string>();

/** "season from Sep 14" for a planet not yet rising in the evening, else "". */
function seasonNote(name: string, r: SceneRequest): string {
  const key = `${name}|${dayKey(r)}`;
  const hit = seasonCache.get(key);
  if (hit !== undefined) return hit;
  const note = safely(() => {
    const s = planetSeason(name, r.displayedUnixMillis, r.station.lat, r.station.lon);
    return s.nowInSeason || s.fromUnixMillis === null
      ? ""
      : `season from ${new Date(s.fromUnixMillis).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, "");
  seasonCache.set(key, note);
  return note;
}

/** "rises in 2h 14m · peaks 21:20" — the planning line for one planet. */
function planetPhrase(p: PlanetTimes, r: SceneRequest): string {
  const t = r.displayedUnixMillis;
  const next = p.upNow ? p.setUnixMillis : p.riseUnixMillis;
  const verb = p.upNow ? "sets in" : "rises in";
  let out = next === null ? "" : `${verb} ${formatCountdown(next - t)}`;
  if (p.upNow) out += ` · ${Math.round(p.altitudeDeg)}° ${compassAbbrev(p.azimuthDeg)}`;
  if (p.upNow && p.transitUnixMillis !== null && p.setUnixMillis !== null &&
      p.transitUnixMillis < p.setUnixMillis) {
    // ⋆ marks the peak — the culmination Parker plans viewing around.
    out += ` ⋆${fmt12c(p.transitUnixMillis)}`;
  }
  // Not an evening object yet: say when it will be, so nobody has to step
  // month by month to find out (DEC-031: "when will I be able to see Saturn?").
  if (!p.upNow) {
    const season = seasonNote(p.name, r);
    if (season !== "") out += ` · ${season}`;
  }
  return out;
}

/** "up all night" / "sets in 3h 40m" / "rises in 2h 14m". */
function skyPhrase(entry: SkyEntry): string {
  if (entry.status === "circumpolar") return "up all night";
  const countdown = formatCountdown(entry.untilMillis ?? 0);
  return entry.status === "up" ? `sets in ${countdown}` : `rises in ${countdown}`;
}

/** Short forms for the columns: the name never yields, so the verb does. */
const shortSkyPhrase = (e: SkyEntry): string =>
  skyPhrase(e).replace(" in ", " ").replace("up all night", "all night");

const planetRow = (p: PlanetTimes, r: SceneRequest): SceneRow => ({
  name: p.name,
  line: planetPhrase(p, r),
  up: p.upNow,
  color: PLANET_COLORS[p.name] ?? null,
  lit: p.name === r.lit,
  starred: false,
});

const skyRow = (e: SkyEntry, line: string): SceneRow => ({
  name: e.constellation.name,
  line,
  up: e.status !== "down",
  color: null,
  lit: false,
  starred: e.constellation.mazzaroth === true,
});

const FOOTNOTE =
  "★ Mazzaroth — the constellations of the sun’s path, led out in their season (Job 38:32)";

const EMPTY_TONIGHT: SceneTonight = {
  note: "",
  glance: [],
  programme: [
    { title: "THE WANDERING STARS", rows: [] },
    { title: "UP NOW", rows: [] },
    { title: "STILL TO RISE", rows: [] },
  ],
  footnote: FOOTNOTE,
};

/** The evening's program: three headliners at a glance, the whole sky in the fold. */
export function sceneTonight(input: PlinthInput): SceneTonight {
  return safely((): SceneTonight => {
    const { frame: s, request: r } = input;
    const lst = s.siderealHours + r.station.lon / 15;

    // A constellation that never rises from this station is not news; drop it.
    // The glance board holds three headliners; the full sky lives behind the
    // TONIGHT fold (DEC-028's pattern: the label is the control).
    const notable = tonightBoard(lst, r.station.lat, CONSTELLATIONS.filter((c) => c.notable === true))
      .filter((e) => e.status !== "never");

    // Saturn and Jupiter first — "when will I be able to see Saturn?" is the
    // question this board exists to answer (DEC-031).
    // The lit planet leads; then the club's favourites; all in ring order.
    const planets = planetsNow(r);
    const lit = r.lit;
    const wanted = new Set([lit ?? "", "Saturn", "Jupiter"]);
    const favourites = planets
      .filter((p) => wanted.has(p.name))
      .sort((a, b) => (a.name === lit ? -1 : b.name === lit ? 1 : RING_ORDER.indexOf(a.name) - RING_ORDER.indexOf(b.name)));
    const glance: SceneRow[] = [
      ...favourites.map((p) => planetRow(p, r)),
      ...notable.map((e) => skyRow(e, skyPhrase(e))),
    ].slice(0, TONIGHT_SLOTS);

    // The program, in movements: the wandering stars first, then what is up,
    // then what is still to rise — each counted, the Mazzaroth starred,
    // never-risers left out. A programme, not a wall (DEC-030).
    const all = tonightBoard(lst, r.station.lat).filter((e) => e.status !== "never");
    const up = all.filter((e) => e.status !== "down");
    const rising = all.filter((e) => e.status === "down");
    const programme: SceneMovement[] = [
      { title: "THE WANDERING STARS", rows: planets.map((p) => planetRow(p, r)) },
      { title: "UP NOW", rows: up.map((e) => skyRow(e, shortSkyPhrase(e))) },
      { title: "STILL TO RISE", rows: rising.map((e) => skyRow(e, shortSkyPhrase(e))) },
    ];

    return {
      // Up is not the same as visible: only promise stars once the sky is dark.
      note: isDarkEnough(s.sun.altitudeDeg) ? "" : "visible after dark",
      glance,
      programme,
      footnote: FOOTNOTE,
    };
  }, EMPTY_TONIGHT);
}

/* ————————————————————————————— spoken ————————————————————————————— */

/** The dial in one plain paragraph, for aria-describedby (DEC-029). */
export function sceneSpoken(input: PlinthInput): string {
  return safely(() => {
    const { frame: s } = input;
    return transcript({
      sunAltitudeDeg: s.sun.altitudeDeg,
      sunAzimuthDeg: s.sun.azimuthDeg,
      moonPhaseName: phaseName(s.moon.phaseAngleDeg) || "moon",
      moonAgeDays: s.moon.ageDays,
      riseHHMM: s.sun.nextRiseUnixMillis === null ? null : fmt12(s.sun.nextRiseUnixMillis),
      setHHMM: s.sun.nextSetUnixMillis === null ? null : fmt12(s.sun.nextSetUnixMillis),
    });
  }, "");
}
