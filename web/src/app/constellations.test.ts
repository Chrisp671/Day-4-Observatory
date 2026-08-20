import { describe, expect, it } from "vitest";
import {
  CONSTELLATIONS,
  horizonHourAngle,
  isDarkEnough,
  skyEntry,
  tonightBoard,
  type Constellation,
} from "./constellations";

const find = (name: string): Constellation =>
  CONSTELLATIONS.find((c) => c.name === name) as Constellation;

describe("the catalog", () => {
  it("carries all 88 IAU constellations, plus the Pleiades", () => {
    expect(CONSTELLATIONS.length).toBe(88 + 1);
    expect(find("Pleiades").star).toBe("Alcyone");
  });

  it("never repeats a name", () => {
    expect(new Set(CONSTELLATIONS.map((c) => c.name)).size).toBe(CONSTELLATIONS.length);
  });

  it("keeps every address on the sky", () => {
    for (const c of CONSTELLATIONS) {
      expect(c.raHours).toBeGreaterThanOrEqual(0);
      expect(c.raHours).toBeLessThan(24);
      expect(Math.abs(c.decDeg)).toBeLessThanOrEqual(90);
    }
  });

  it("flags exactly the twelve Mazzaroth — the constellations of the sun's path", () => {
    const mazzaroth = CONSTELLATIONS.filter((c) => c.mazzaroth === true).map((c) => c.name);
    expect(mazzaroth.sort()).toEqual([
      "Aquarius", "Aries", "Cancer", "Capricornus", "Gemini", "Leo",
      "Libra", "Pisces", "Sagittarius", "Scorpius", "Taurus", "Virgo",
    ]);
  });

  it("spot-checks the famous stars against known coordinates", () => {
    // [name, star, ra, dec] — a wrong sign or swapped field fails loudly.
    const known: ReadonlyArray<readonly [string, string, number, number]> = [
      ["Canis Major", "Sirius", 6.752, -16.716],
      ["Lyra", "Vega", 18.615, 38.784],
      ["Scorpius", "Antares", 16.49, -26.432],
      ["Carina", "Canopus", 6.4, -52.7],
      ["Eridanus", "Achernar", 1.63, -57.24],
      ["Piscis Austrinus", "Fomalhaut", 22.96, -29.62],
      ["Boötes", "Arcturus", 14.26, 19.18],
    ];
    for (const [name, star, ra, dec] of known) {
      const c = find(name);
      expect(c.star).toBe(star);
      expect(c.raHours).toBeCloseTo(ra, 1);
      expect(c.decDeg).toBeCloseTo(dec, 1);
    }
  });

  it("keeps Polaris circumpolar from the north and unrisen from the south", () => {
    const polaris = find("Ursa Minor");
    expect(horizonHourAngle(polaris.decDeg, 40)).toBe("circumpolar");
    expect(horizonHourAngle(polaris.decDeg, -40)).toBe("never");
  });
});

const SIDEREAL_HOUR_MILLIS = (23.9344696 / 24) * 3600000;
const DEEP_SOUTH: Constellation = { name: "Crux", star: "Acrux", raHours: 12.443, decDeg: -63.099 };

describe("horizonHourAngle", () => {
  it("gives exactly 6 hours for every star seen from the equator", () => {
    for (const c of CONSTELLATIONS) expect(horizonHourAngle(c.decDeg, 0)).toBeCloseTo(6, 6);
  });

  it("calls the far-north constellations circumpolar from 40°N", () => {
    // dec > 90 - latitude never sets: Cassiopeia (+56.5) and Ursa Major (+56.0).
    expect(horizonHourAngle(find("Cassiopeia").decDeg, 40)).toBe("circumpolar");
    expect(horizonHourAngle(find("Ursa Major").decDeg, 40)).toBe("circumpolar");
  });

  it("knows the deep south never rises from 40°N — but does from Sydney", () => {
    expect(horizonHourAngle(DEEP_SOUTH.decDeg, 40)).toBe("never");
    expect(horizonHourAngle(DEEP_SOUTH.decDeg, -33.9)).toBe("circumpolar");
  });

  it("mirrors across the equator: same star, opposite hemispheres", () => {
    const north = horizonHourAngle(20, 45) as number;
    const south = horizonHourAngle(-20, -45) as number;
    expect(south).toBeCloseTo(north, 10);
  });
});

describe("skyEntry", () => {
  it("is up and setting when the star sits on the meridian", () => {
    const orion = find("Orion");
    const e = skyEntry(orion, orion.raHours, 0); // LST = RA → hour angle 0
    expect(e.status).toBe("up");
    // From the equator, the meridian is 6 sidereal hours from setting.
    expect(e.untilMillis as number).toBeCloseTo(6 * SIDEREAL_HOUR_MILLIS, 0);
  });

  it("is down and rising when the star sits at lower culmination", () => {
    const orion = find("Orion");
    const e = skyEntry(orion, orion.raHours + 12, 0);
    expect(e.status).toBe("down");
    expect(e.untilMillis as number).toBeCloseTo(6 * SIDEREAL_HOUR_MILLIS, 0);
  });

  it("reports circumpolar with no countdown — it never leaves", () => {
    const e = skyEntry(find("Cassiopeia"), 3, 40);
    expect(e.status).toBe("circumpolar");
    expect(e.untilMillis).toBeNull();
  });

  it("reports never with no countdown below the horizon forever", () => {
    const e = skyEntry(DEEP_SOUTH, 3, 40);
    expect(e.status).toBe("never");
    expect(e.untilMillis).toBeNull();
  });

  it("always counts forward, and never more than a full turn of the sky", () => {
    for (let lst = 0; lst < 24; lst += 0.37) {
      for (const c of CONSTELLATIONS) {
        const e = skyEntry(c, lst, 40);
        if (e.untilMillis === null) continue;
        expect(e.untilMillis).toBeGreaterThanOrEqual(0);
        expect(e.untilMillis).toBeLessThan(24 * SIDEREAL_HOUR_MILLIS);
      }
    }
  });

  it("flips a rising star to up once its countdown elapses", () => {
    const scorpius = find("Scorpius");
    const before = skyEntry(scorpius, scorpius.raHours - 7, 40); // still below
    expect(before.status).toBe("down");
    const waitSidereal = (before.untilMillis as number) / SIDEREAL_HOUR_MILLIS;
    const after = skyEntry(scorpius, scorpius.raHours - 7 + waitSidereal + 0.01, 40);
    expect(after.status).toBe("up");
  });
});

describe("tonightBoard", () => {
  it("leads with what is already up, then what is coming, then never", () => {
    const board = tonightBoard(6, 40);
    const rank = { circumpolar: 0, up: 0, down: 1, never: 2 } as const;
    for (let i = 1; i < board.length; i++) {
      const prev = board[i - 1], cur = board[i];
      if (prev === undefined || cur === undefined) continue;
      expect(rank[prev.status]).toBeLessThanOrEqual(rank[cur.status]);
    }
  });

  it("keeps every constellation in the catalog — nothing silently dropped", () => {
    expect(tonightBoard(6, 40)).toHaveLength(CONSTELLATIONS.length);
  });

  it("orders the rising ones soonest-first", () => {
    const rising = tonightBoard(6, 40).filter((e) => e.status === "down");
    for (let i = 1; i < rising.length; i++) {
      expect(rising[i - 1]?.untilMillis as number).toBeLessThanOrEqual(
        rising[i]?.untilMillis as number,
      );
    }
  });
});

describe("isDarkEnough", () => {
  it("promises stars only after civil twilight", () => {
    expect(isDarkEnough(5)).toBe(false); // daylight
    expect(isDarkEnough(-2)).toBe(false); // sun just down, sky still bright
    expect(isDarkEnough(-10)).toBe(true); // nautical twilight and beyond
  });
});
