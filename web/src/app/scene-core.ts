/**
 * THE SCENE, core half — the light and the dial (SEAM-003, DEC-037).
 *
 * Six pure-ish functions, one per slice of the Scene that the dial's
 * painters consume: light, band, sun, moon, earth, marks. Each takes the
 * already-computed FrameState plus the SceneRequest, and returns the slice
 * in the page's own units (dial hours, fractions of R, final colours). A
 * composer calls frame() once per tick and hands the result in; nothing here
 * calls the engine except moonDay, which is day-anchored and memoised.
 *
 * Never throws. Polar cases (no rise, no set) pass through as null.
 */
import type { FrameState } from "../engine/frame";
import { moonDay } from "../engine/planets";
import { FACE, localHoursOfDay } from "../ui/clockface";
import { groundStrength } from "../ui/ground";
import { moonDialHours } from "../ui/moon";
import { skyPalette } from "../ui/sky";
import { passionHours } from "./hours";
import type {
  SceneBand,
  SceneEarth,
  SceneLight,
  SceneMarks,
  SceneMoon,
  SceneRequest,
  SceneSun,
} from "./scene";

export interface CoreInput {
  readonly frame: FrameState;
  readonly request: SceneRequest;
}

/* ————————————————————————————— memo ————————————————————————————— */

/** One remembered value per family, keyed by local date and station. A new
 * key for the same family replaces the old entry, so the memo never grows. */
const dayMemo = new Map<string, { readonly key: string; readonly value: unknown }>();

function memoByDay<T>(
  family: string,
  unixMillis: number,
  lat: number,
  lon: number,
  compute: () => T,
): T {
  const key = `${new Date(unixMillis).toDateString()}|${lat}|${lon}`;
  const hit = dayMemo.get(family);
  if (hit !== undefined && hit.key === key) return hit.value as T;
  const value = compute();
  dayMemo.set(family, { key, value });
  return value;
}

/* ————————————————————————————— helpers ————————————————————————————— */

const hoursOrNull = (unixMillis: number | null): number | null =>
  unixMillis === null ? null : localHoursOfDay(unixMillis);

/** The sun's place on the dial: the displayed instant's civil hours. */
const sunHoursOf = (input: CoreInput): number =>
  localHoursOfDay(input.request.displayedUnixMillis);

/* ————————————————————————————— the light ————————————————————————————— */

export function sceneLight(input: CoreInput): SceneLight {
  const alt = input.frame.sun.altitudeDeg;
  const pal = skyPalette(alt);
  return {
    field: pal.field,
    deep: pal.deep,
    stars: pal.starAlpha,
    horizonGlow: pal.horizonGlow,
    ground: groundStrength(alt),
    // Plain by day, luminous once the sky darkens.
    axis: 0.55 + 0.45 * pal.starAlpha,
    sunColor: pal.sunCore,
    // The light's half of the firmament's redraw key; the viewport is the
    // shell's business.
    key: `${Math.round(alt * 2) / 2}`,
  };
}

/* ————————————————————————————— the band ————————————————————————————— */

export function sceneBand(input: CoreInput): SceneBand {
  const { sun } = input.frame;
  const p = passionHours(sun.dayRiseUnixMillis, sun.daySetUnixMillis);
  const passion = p === null
    ? null
    : { fromHours: localHoursOfDay(p.fromUnixMillis), toHours: localHoursOfDay(p.toUnixMillis) };
  return {
    riseHours: hoursOrNull(sun.nextRiseUnixMillis),
    setHours: hoursOrNull(sun.nextSetUnixMillis),
    passion,
    // The sixth hour IS solar noon (DEC-024/033): the diamond sits where the
    // darkened hours begin, so noon is null whenever the reckoning is.
    noonHours: passion === null ? null : passion.fromHours,
  };
}

/* ————————————————————————————— the sun ————————————————————————————— */

export function sceneSun(input: CoreInput): SceneSun {
  return {
    hours: sunHoursOf(input),
    color: skyPalette(input.frame.sun.altitudeDeg).sunCore,
  };
}

/* ————————————————————————————— the moon ————————————————————————————— */

/** The moon's rise and following set for the displayed calendar day, held
 * steady until the date changes (REQ-008); shared with the plinth's wording. */
export function moonDayFor(request: SceneRequest): ReturnType<typeof moonDay> {
  const { lat, lon } = request.station;
  const t = request.displayedUnixMillis;
  return memoByDay("moonDay", t, lat, lon, () => moonDay(t, lat, lon));
}

/** Live means the displayed instant and the present are within a second;
 * anything more is a journey. One rule, used by the marks and the readouts. */
export const isTravelled = (request: SceneRequest): boolean =>
  Math.abs(request.displayedUnixMillis - request.nowUnixMillis) >= 1000;

export function sceneMoon(input: CoreInput): SceneMoon {
  const { frame, request } = input;
  const md = moonDayFor(request);
  // The contract is both-or-null: a rise with no following set inside the
  // search window draws nothing, rather than an open arc.
  const upArc = md.riseUnixMillis === null || md.setUnixMillis === null
    ? null
    : { riseHours: localHoursOfDay(md.riseUnixMillis), setHours: localHoursOfDay(md.setUnixMillis) };
  return {
    hours: moonDialHours(sunHoursOf(input), frame.sun.hourAngleHours, frame.moon.hourAngleHours),
    phaseAngleDeg: frame.moon.phaseAngleDeg,
    orbit: FACE.moonOrbit,
    upArc,
  };
}

/* ————————————————————————————— the earth ————————————————————————————— */

export function sceneEarth(input: CoreInput): SceneEarth {
  return { sunHours: sunHoursOf(input) };
}

/* ————————————————————————————— the marks ————————————————————————————— */

export function sceneMarks(input: CoreInput): SceneMarks {
  return {
    nowHours: localHoursOfDay(input.request.nowUnixMillis),
    travelled: isTravelled(input.request),
  };
}
