/**
 * Public invariants of the Scene's core half: the light follows the sun,
 * the band's hours are ordered, the sun stands where the clock says, and
 * nothing throws in the polar night.
 */
import { describe, expect, it } from "vitest";
import { frame } from "../engine/frame";
import { FACE, localHoursOfDay } from "../ui/clockface";
import {
  sceneBand,
  sceneEarth,
  sceneLight,
  sceneMarks,
  sceneMoon,
  sceneSun,
  type CoreInput,
} from "./scene-core";

const NYC = { lat: 40.0, lon: -74.0 };
const HOUR = 3600000;

/** A CoreInput for one displayed instant, live unless `now` is given. */
function at(displayed: number, station = NYC, now = displayed): CoreInput {
  return {
    frame: frame(displayed, station.lat, station.lon),
    request: { displayedUnixMillis: displayed, nowUnixMillis: now, station, lit: null },
  };
}

const NOON = new Date(2026, 5, 21, 12, 30, 0).getTime(); // 21 Jun 2026, near solar noon
const MIDNIGHT = new Date(2026, 5, 21, 0, 30, 0).getTime();

describe("sceneLight", () => {
  it("has no ground at night and full ground at noon", () => {
    expect(sceneLight(at(MIDNIGHT)).ground).toBe(0);
    expect(sceneLight(at(NOON)).ground).toBe(1);
  });

  it("keys the light so it changes across the day but not across a minute at noon", () => {
    expect(sceneLight(at(MIDNIGHT)).key).not.toBe(sceneLight(at(NOON)).key);
    expect(sceneLight(at(NOON)).key).toBe(sceneLight(at(NOON + 60000)).key);
  });

  it("keeps every scalar in 0..1 and every colour a hex string", () => {
    for (const t of [MIDNIGHT, NOON, NOON + 7 * HOUR]) {
      const l = sceneLight(at(t));
      for (const v of [l.stars, l.horizonGlow, l.ground, l.axis]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      for (const c of [l.field, l.deep, l.sunColor]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("sceneBand", () => {
  it("puts the next sunrise before the next sunset on a summer noon", () => {
    // At noon the sun is up: the next set is this evening, the next rise
    // tomorrow morning — so on the dial, rise hours < set hours.
    const b = sceneBand(at(NOON));
    expect(b.riseHours).not.toBeNull();
    expect(b.setHours).not.toBeNull();
    expect(b.riseHours as number).toBeLessThan(b.setHours as number);
  });

  it("marks solar noon at the sixth hour", () => {
    const b = sceneBand(at(NOON));
    expect(b.passion).not.toBeNull();
    expect(b.noonHours).toBe(b.passion?.fromHours);
    expect(b.passion?.fromHours as number).toBeLessThan(b.passion?.toHours as number);
  });
});

describe("sceneSun / sceneEarth", () => {
  it("stands the sun at the displayed instant's civil hour", () => {
    for (const t of [MIDNIGHT, NOON, NOON + 5 * HOUR]) {
      const s = sceneSun(at(t));
      expect(s.hours).toBeGreaterThanOrEqual(0);
      expect(s.hours).toBeLessThan(24);
      expect(s.hours).toBe(localHoursOfDay(t));
      expect(sceneEarth(at(t)).sunHours).toBe(s.hours);
    }
  });

  it("colours the sun from the same palette as the light", () => {
    expect(sceneSun(at(NOON)).color).toBe(sceneLight(at(NOON)).sunColor);
  });
});

describe("sceneMoon", () => {
  it("rides the fixed orbit and keeps its hours on the dial", () => {
    const m = sceneMoon(at(NOON));
    expect(m.orbit).toBe(FACE.moonOrbit);
    expect(m.hours).toBeGreaterThanOrEqual(0);
    expect(m.hours).toBeLessThan(24);
    expect(m.phaseAngleDeg).toBeGreaterThanOrEqual(0);
    expect(m.phaseAngleDeg).toBeLessThan(360);
  });

  it("gives an up-arc with both ends, or none at all", () => {
    const m = sceneMoon(at(NOON));
    if (m.upArc !== null) {
      expect(typeof m.upArc.riseHours).toBe("number");
      expect(typeof m.upArc.setHours).toBe("number");
    } else {
      expect(m.upArc).toBeNull();
    }
  });

  it("holds the up-arc steady across the calendar day (memoised by date)", () => {
    const morning = sceneMoon(at(new Date(2026, 7, 21, 6, 0).getTime())).upArc;
    const night = sceneMoon(at(new Date(2026, 7, 21, 23, 30).getTime())).upArc;
    expect(morning).toEqual(night);
  });
});

describe("sceneMarks", () => {
  it("is live when displayed equals now, travelled an hour away", () => {
    expect(sceneMarks(at(NOON)).travelled).toBe(false);
    const away = sceneMarks(at(NOON + HOUR, NYC, NOON));
    expect(away.travelled).toBe(true);
    expect(away.nowHours).toBe(localHoursOfDay(NOON));
  });
});

describe("polar night (85°N, December)", () => {
  const ARCTIC = { lat: 85.0, lon: 0.0 };
  const T = new Date(2026, 11, 15, 12, 0, 0).getTime();
  const input = at(T, ARCTIC);

  it("returns from every slice without throwing", () => {
    expect(() => sceneLight(input)).not.toThrow();
    expect(() => sceneBand(input)).not.toThrow();
    expect(() => sceneSun(input)).not.toThrow();
    expect(() => sceneMoon(input)).not.toThrow();
    expect(() => sceneEarth(input)).not.toThrow();
    expect(() => sceneMarks(input)).not.toThrow();
  });

  it("gives nulls where the sky gives no event", () => {
    const b = sceneBand(input);
    expect(b.riseHours).toBeNull();
    expect(b.setHours).toBeNull();
    expect(b.passion).toBeNull();
    expect(b.noonHours).toBeNull();
    // The light still speaks: the sun is simply below the horizon.
    expect(sceneLight(input).ground).toBe(0);
    expect(sceneLight(input).stars).toBe(1);
  });
});
