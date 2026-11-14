import { describe, expect, it } from "vitest";
import { frame } from "../engine/frame";
import { moonDay, moonSetOfDay } from "../engine/planets";
import { fmt12 } from "./clock12";
import { parseEntry } from "./timeentry";
import { CONSTELLATIONS, skyEntry } from "./constellations";
import { RING_ORDER } from "../ui/clockface";
import { type PlinthInput, sceneConstellation, scenePlanets, sceneReadouts, sceneRete, sceneSpoken, sceneTonight } from "./scene-plinth";
import type { SceneRequest } from "./scene";

const NYC = { lat: 40.0, lon: -74.0 };
// Midsummer at the station, in UTC so the test does not depend on the
// machine's zone: 17:00 UTC is a few minutes past solar noon at 74°W.
const NOON = Date.UTC(2026, 5, 21, 17, 0, 0);
// 07:00 UTC is 3 am at the station: deep night.
const NIGHT = Date.UTC(2026, 5, 21, 7, 0, 0);

function input(t: number, lit: string | null, now: number = t): PlinthInput {
  const request: SceneRequest = {
    displayedUnixMillis: t,
    nowUnixMillis: now,
    station: NYC,
    lit,
    chart: null,
  };
  return { frame: frame(t, NYC.lat, NYC.lon), request };
}

describe("sceneRete", () => {
  it("keeps ring order, Mercury first, with strictly increasing radius", () => {
    const rete = sceneRete(input(NOON, null));
    expect(rete.length).toBeGreaterThan(0);
    const order = rete.map((r) => RING_ORDER.indexOf(r.name));
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1] as number);
      expect(rete[i]?.radius).toBeGreaterThan(rete[i - 1]?.radius as number);
    }
  });

  it("lights exactly one ring when Saturn is tapped, and dims the rest", () => {
    const rete = sceneRete(input(NOON, "Saturn"));
    const lit = rete.filter((r) => r.weight === "lit");
    expect(lit.map((r) => r.name)).toEqual(["Saturn"]);
    for (const r of rete) {
      if (r.name !== "Saturn") expect(r.weight).toBe("dim");
    }
  });

  it("weighs honestly when nothing is lit: bright or faint only", () => {
    const rete = sceneRete(input(NOON, null));
    for (const r of rete) expect(["bright", "faint"]).toContain(r.weight);
  });

  it("lights nothing and never throws for an unknown name", () => {
    const rete = sceneRete(input(NOON, "Pluto"));
    expect(rete.some((r) => r.weight === "lit")).toBe(false);
    expect(rete.every((r) => r.weight === "dim")).toBe(true);
  });

  it("carries a colour and a peak or null for every ring", () => {
    for (const r of sceneRete(input(NOON, null))) {
      expect(r.color).toMatch(/^#/);
      expect(r.peakHours === null || (r.peakHours >= 0 && r.peakHours < 24)).toBe(true);
    }
  });
});

describe("sceneReadouts", () => {
  it("counts down to the next sun event in hours and minutes", () => {
    const out = sceneReadouts(input(NOON, null));
    expect(out.heroKind).toBe("Sunset in");
    expect(out.heroValue).toMatch(/^\d+h \d+m$/);
  });

  it("keeps the passion caption silent at night and speaks it at solar noon", () => {
    expect(sceneReadouts(input(NIGHT, null)).passion).toBe("");
    const noon = sceneReadouts(input(NOON, null)).passion;
    expect(noon).not.toBe("");
    expect(noon).toMatch(/^The sixth hour to the ninth · /);
  });

  it("names the station, the phase, the sun's day and the verse", () => {
    const out = sceneReadouts(input(NOON, null));
    expect(out.station).toBe("40.0°N 74.0°W");
    expect(out.moonPhase).not.toBe("");
    expect(out.sunRise).toMatch(/^↑\d{1,2}:\d{2} [ap]m$/);
    expect(out.sunSet).toMatch(/^↓\d{1,2}:\d{2} [ap]m$/);
    expect(out.verse).not.toBe("");
    expect(out.verseRef).toMatch(/ · ESV$/);
    expect(out.clock).toMatch(/^\d{1,2}:\d{2} [ap]m$/);
  });

});

/**
 * REQ-017, item by item as Parker wrote them. The wording itself is pinned in
 * hero.test.ts and timeentry.test.ts; these hold the Scene to it — that the
 * line above the hero is the displayed instant, that the event's time is the
 * instant the countdown counts to, and that the moon's lines agree with the
 * engine's own day.
 */
describe("the date and time above the countdown (REQ-017)", () => {
  const DATE = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) [A-Z][a-z]{2} \d{1,2}(, \d{4})?$/;

  it("is always on the page: the date and the time to the minute while live", () => {
    const [date, clock, ...rest] = sceneReadouts(input(NOON, null)).when.split(" · ");
    expect(rest).toEqual([]);
    expect(date).toMatch(DATE);
    expect(clock).toBe(fmt12(NOON));
  });

  it("follows the displayed instant, not the real one, and shows the seconds once moved", () => {
    const displayed = NOON + 3 * 86400000 + 25000;
    const out = sceneReadouts(input(displayed, null, NOON));
    const [date, clock] = out.when.split(" · ");
    expect(date).toMatch(DATE);
    expect(clock).toMatch(/^\d{1,2}:\d{2}:\d{2} [ap]m$/);
    // The same instant the station bay's clock reads, to the minute.
    expect(clock?.replace(/:\d{2} /, " ")).toBe(out.clock);
    expect(out.when).not.toBe(sceneReadouts(input(NOON, null)).when);
  });

  it("changes its date when the displayed instant crosses into another day, either way", () => {
    const dates = [-2, -1, 0, 1, 2].map((d) => sceneReadouts(input(NOON + d * 86400000, null, NOON)).when.split(" · ")[0]);
    expect(new Set(dates).size).toBe(5);
  });

  it("names the year once a journey has left the present one", () => {
    expect(sceneReadouts(input(NOON + 400 * 86400000, null, NOON)).when).toMatch(/, 2027 · /);
    expect(sceneReadouts(input(NOON, null)).when).not.toMatch(/\d{4}/);
  });
});

describe("when the event falls, beside the countdown (REQ-017)", () => {
  it("is the instant the countdown counts to, in the clock's own words", () => {
    for (const t of [NOON, NIGHT]) {
      const at = input(t, null);
      const out = sceneReadouts(at);
      const next = out.heroKind === "Sunset in" ? at.frame.sun.nextSetUnixMillis : at.frame.sun.nextRiseUnixMillis;
      expect(next).not.toBeNull();
      expect(out.heroAt.startsWith(`at ${fmt12(next as number)}`), out.heroAt).toBe(true);
    }
  });

  it("names the event's date exactly when it is not the displayed one", () => {
    for (const t of [NOON, NIGHT, NOON + 9 * 3600000, NOON + 14 * 3600000]) {
      const at = input(t, null);
      const out = sceneReadouts(at);
      const next = (out.heroKind === "Sunset in" ? at.frame.sun.nextSetUnixMillis : at.frame.sun.nextRiseUnixMillis) as number;
      const sameDate = new Date(next).toDateString() === new Date(t).toDateString();
      expect(/ (Sun|Mon|Tue|Wed|Thu|Fri|Sat) [A-Z][a-z]{2} \d{1,2}/.test(out.heroAt), `${out.heroAt} @ ${new Date(t).toString()}`)
        .toBe(!sameDate);
    }
  });

  it("is silent when there is no next event, as the countdown is", () => {
    // Midsummer at 85°N: the sun neither rises nor sets.
    const t = NOON;
    const request: SceneRequest = { displayedUnixMillis: t, nowUnixMillis: t, station: { lat: 85, lon: -74 }, lit: null, chart: null };
    const out = sceneReadouts({ frame: frame(t, 85, -74), request });
    expect(out.heroKind).toBe("Polar day or night");
    expect(out.heroValue).toBe("");
    expect(out.heroAt).toBe("");
    // The date and time above it do not depend on the sun.
    expect(out.when).not.toBe("");
  });
});

describe("the date-and-time field's value (DEC-057)", () => {
  it("is the displayed instant to the second, in the field's own dialect", () => {
    const displayed = NOON + 5 * 86400000 + 42000;
    const out = sceneReadouts(input(displayed, null, NOON));
    expect(out.entryValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(parseEntry(out.entryValue)).toBe(displayed);
  });
});

describe("the moon's rise and set, in the sun's own shape (REQ-017)", () => {
  const DAY = 86400000;
  /** Sixty consecutive days at the station, each with the Scene's two lines
   * and the engine's own answers for that calendar day. */
  const days = Array.from({ length: 60 }, (_, i) => {
    const t = NOON + i * DAY;
    const out = sceneReadouts(input(t, null));
    return {
      t, rise: out.moonRise, set: out.moonSet, sunRise: out.sunRise, sunSet: out.sunSet,
      day: moonDay(t, NYC.lat, NYC.lon), lone: moonSetOfDay(t, NYC.lat, NYC.lon),
    };
  });
  const TIME = "\\d{1,2}:\\d{2} [ap]m";

  it("words a rise and a set exactly as the sun's are worded", () => {
    const both = days.filter((d) => d.day.riseUnixMillis !== null && d.day.setUnixMillis !== null);
    expect(both.length).toBeGreaterThan(50);
    for (const d of both) {
      expect(d.rise).toMatch(new RegExp(`^↑${TIME}$`));
      expect(d.set).toMatch(new RegExp(`^↓${TIME}( (Sun|Mon|Tue|Wed|Thu|Fri|Sat))?$`));
      // The sun's lines, for the same day, in the same shape.
      expect(d.sunRise).toMatch(new RegExp(`^↑${TIME}$`));
      expect(d.sunSet).toMatch(new RegExp(`^↓${TIME}$`));
    }
  });

  it("gives the engine's own times, the set tagged with its weekday when it falls on another date", () => {
    for (const d of days) {
      if (d.day.riseUnixMillis === null || d.day.setUnixMillis === null) continue;
      expect(d.rise).toBe(`↑${fmt12(d.day.riseUnixMillis)}`);
      expect(d.set.startsWith(`↓${fmt12(d.day.setUnixMillis)}`)).toBe(true);
      const nextDate = new Date(d.day.setUnixMillis).getDate() !== new Date(d.t).getDate();
      expect(/ [A-Z][a-z]{2}$/.test(d.set), d.set).toBe(nextDate);
    }
    // Both kinds occur: a set the same evening, and one after midnight.
    expect(days.some((d) => / [A-Z][a-z]{2}$/.test(d.set))).toBe(true);
    expect(days.some((d) => new RegExp(`^↓${TIME}$`).test(d.set))).toBe(true);
  });

  it("says so in words on the day with no moonrise, and still gives that day's moonset", () => {
    const noRise = days.filter((d) => d.day.riseUnixMillis === null);
    expect(noRise.length).toBeGreaterThanOrEqual(1);
    for (const d of noRise) {
      expect(d.rise).toBe("no moonrise today");
      // From 40°N the moon that rose the evening before sets on this day: the
      // readout used to stop at "no moonrise today" and hide this time.
      expect(d.lone).not.toBeNull();
      expect(d.set).toBe(`↓${fmt12(d.lone as number)}`);
      expect(new Date(d.lone as number).toDateString()).toBe(new Date(d.t).toDateString());
    }
  });

  it("never leaves either line empty, and never shows a dash for a missing time", () => {
    for (const d of days) {
      expect(d.rise).not.toBe("");
      expect(d.set).not.toBe("");
      expect(`${d.rise}${d.set}`).not.toMatch(/—|null|undefined|NaN/);
    }
  });

  it("says a moon that rises and does not set stays up, in words: Reykjavik, December", () => {
    // The CHK-001 matrix pins this one: the moon rises on 2026-12-21 at 64°N
    // and no set follows within the two days the search looks ahead.
    const station = { lat: 64.1466, lon: -21.9426 };
    const t = Date.UTC(2026, 11, 21, 12, 0, 0);
    const day = moonDay(t, station.lat, station.lon);
    const request: SceneRequest = { displayedUnixMillis: t, nowUnixMillis: t, station, lit: null, chart: null };
    const out = sceneReadouts({ frame: frame(t, station.lat, station.lon), request });
    if (day.riseUnixMillis !== null && day.setUnixMillis === null) {
      expect(out.moonRise).toBe(`↑${fmt12(day.riseUnixMillis)}`);
      expect(out.moonSet).toBe("no moonset for two days");
    } else {
      // In a zone where local midnight splits that day differently the case
      // may not arise; the wording rule is then exercised by the table below.
      expect(out.moonSet).not.toBe("");
    }
  });

  it("covers all four cases of its own table at a polar station across a lunation", () => {
    // 85°N: over a month the moon is up for days, down for days, and in
    // between rises and sets. Every line must be one of the four wordings.
    const station = { lat: 85, lon: -74 };
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const t = NOON + i * DAY;
      const request: SceneRequest = { displayedUnixMillis: t, nowUnixMillis: t, station, lit: null, chart: null };
      const out = sceneReadouts({ frame: frame(t, station.lat, station.lon), request });
      const rise = /^↑/.test(out.moonRise) ? "rise" : out.moonRise;
      const set = /^↓/.test(out.moonSet) ? "set" : out.moonSet;
      expect(["rise", "no moonrise today"]).toContain(rise);
      expect(["set", "no moonset today", "no moonset for two days"]).toContain(set);
      // A rise is never followed by "no moonset today": that pairing would be
      // two different days' worth of answer.
      if (rise === "rise") expect(set).not.toBe("no moonset today");
      if (rise === "no moonrise today") expect(set).not.toBe("no moonset for two days");
      seen.add(`${rise}|${set}`);
    }
    expect(seen.has("no moonrise today|no moonset today")).toBe(true);
    expect(seen.has("rise|no moonset for two days")).toBe(true);
  });
});

describe("the echo line (DEC-055)", () => {
  it("is empty when nothing is lit, so the plinth shows no gap", () => {
    expect(sceneReadouts(input(NIGHT, null)).ringEcho).toBe("");
    expect(sceneReadouts(input(NOON, null)).ringEcho).toBe("");
  });

  it("names the lit planet and the set the arc is drawn to, in the clock's 12-hour words", () => {
    for (const name of RING_ORDER) {
      const echo = sceneReadouts(input(NIGHT, name)).ringEcho;
      const ring = sceneRete(input(NIGHT, name)).find((r) => r.weight === "lit");
      expect(echo.startsWith(`${name} · `), echo).toBe(true);
      if (ring === undefined) {
        expect(echo).toBe(`${name} · no ring today`);
        continue;
      }
      expect(echo).toMatch(/ · up (until|from \d{1,2}:\d{2} [ap]m until) \d{1,2}:\d{2} [ap]m$/);
      const setHours = Math.floor(ring.setHours);
      const h12 = setHours % 12 === 0 ? 12 : setHours % 12;
      expect(echo).toMatch(new RegExp(`until ${h12}:\\d{2} ${setHours < 12 ? "am" : "pm"}$`));
    }
  });

  it("agrees with the spoken transcript: the same planet, the same set", () => {
    for (const name of RING_ORDER) {
      const echo = sceneReadouts(input(NIGHT, name)).ringEcho;
      const spoken = sceneSpoken(input(NIGHT, name));
      if (!spoken.includes("ring is lit")) {
        expect(echo).toBe(`${name} · no ring today`);
        continue;
      }
      const until = /until (\d{1,2}:\d{2} [ap]m)\.$/.exec(spoken)?.[1];
      expect(echo.endsWith(`until ${until}`), `${echo} vs ${spoken}`).toBe(true);
    }
  });

  it("echoes nothing for a name that is not a planet, as the rete lights nothing", () => {
    expect(sceneReadouts(input(NIGHT, "Pluto")).ringEcho).toBe("");
  });
});

describe("sceneTonight", () => {
  it("leads the glance with the lit planet and shows at most three rows", () => {
    const out = sceneTonight(input(NOON, "Jupiter"));
    expect(out.glance.length).toBeLessThanOrEqual(3);
    expect(out.glance[0]?.name).toBe("Jupiter");
    expect(out.glance[0]?.lit).toBe(true);
  });

  it("plays the programme in three movements, titled in order", () => {
    const out = sceneTonight(input(NOON, null));
    expect(out.programme.map((m) => m.title)).toEqual(["THE WANDERING STARS", "UP NOW", "STILL TO RISE"]);
    expect(out.programme[0]?.rows.map((r) => r.name)).toEqual([...RING_ORDER]);
  });

  it("promises stars only after dark", () => {
    expect(sceneTonight(input(NOON, null)).note).toBe("visible after dark");
    expect(sceneTonight(input(NIGHT, null)).note).toBe("");
  });

  it("uses the short verb in the fold and stars the Mazzaroth", () => {
    const out = sceneTonight(input(NIGHT, null));
    const rows = [...(out.programme[1]?.rows ?? []), ...(out.programme[2]?.rows ?? [])];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.line).toMatch(/^(sets \d|rises \d|all night)/);
      expect(r.color).toBeNull();
    }
    expect(rows.some((r) => r.starred)).toBe(true);
    expect(out.footnote).toContain("Mazzaroth");
  });
});

describe("sceneSpoken", () => {
  it("speaks the sky in one paragraph that names the moon", () => {
    const spoken = sceneSpoken(input(NOON, null));
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken).toContain("moon");
  });

  it("names the lit ring, and only when one is lit (DEC-053)", () => {
    expect(sceneSpoken(input(NIGHT, null))).not.toContain("ring");
    const spoken = sceneSpoken(input(NIGHT, "Saturn"));
    expect(spoken).toMatch(/Saturn's ring is lit, up (until|from .+ until) \d{1,2}:\d{2} [ap]m\.$/);
  });

  it("agrees with the rete: the sentence's set is the lit arc's set, or there is no sentence", () => {
    for (const name of RING_ORDER) {
      const ring = sceneRete(input(NIGHT, name)).find((r) => r.weight === "lit");
      const spoken = sceneSpoken(input(NIGHT, name));
      if (ring === undefined) {
        expect(spoken).not.toContain("ring");
      } else {
        const setHours = Math.floor(ring.setHours);
        const h12 = setHours % 12 === 0 ? 12 : setHours % 12;
        expect(spoken).toContain(`${name}'s ring is lit`);
        expect(spoken).toMatch(new RegExp(`until ${h12}:\\d{2} ${setHours < 12 ? "am" : "pm"}\\.$`));
      }
    }
  });
});

describe("scenePlanets (REQ-014)", () => {
  it("always carries all five, in ring order, each with a colour and final strings", () => {
    const out = scenePlanets(input(NIGHT, null));
    expect(out.map((p) => p.name)).toEqual([...RING_ORDER]);
    for (const p of out) {
      expect(p.color).toMatch(/^#/);
      for (const s of [p.line, p.rise, p.peak, p.set, p.visibility]) expect(s).not.toBe("");
      expect(p.line).not.toMatch(/^ ·/);
      expect(p.rise === "—" || /^↑\d{1,2}:\d{2} [ap]m$/.test(p.rise)).toBe(true);
      expect(p.set === "—" || /^↓\d{1,2}:\d{2} [ap]m( [A-Z][a-z]{2})?$/.test(p.set)).toBe(true);
      expect(p.peak === "—" || /^⋆\d{1,2}:\d{2} [ap]m( [A-Z][a-z]{2})?$/.test(p.peak)).toBe(true);
    }
  });

  it("marks exactly the tapped planet lit, and none when nothing is tapped", () => {
    expect(scenePlanets(input(NIGHT, "Mars")).filter((p) => p.lit).map((p) => p.name)).toEqual(["Mars"]);
    expect(scenePlanets(input(NIGHT, null)).some((p) => p.lit)).toBe(false);
  });

  it("agrees with the rete: a planet has an arc note exactly when it has no ring", () => {
    for (const t of [NOON, NIGHT]) {
      const ringed = new Set(sceneRete(input(t, null)).map((r) => r.name));
      for (const p of scenePlanets(input(t, null))) {
        expect(p.arcNote === "").toBe(ringed.has(p.name));
      }
    }
  });

  it("words a planet below the horizon honestly, with when it rises", () => {
    const down = scenePlanets(input(NIGHT, null)).filter((p) => !p.up);
    for (const p of down) {
      expect(p.where).toBe("");
      expect(p.visibility).toMatch(/^Below the horizon/);
      expect(p.visibility).toMatch(/rises in \d|does not rise/);
    }
  });

  it("tells a viewer where to look when a planet is up after dark", () => {
    const up = scenePlanets(input(NIGHT, null)).filter((p) => p.up);
    for (const p of up) {
      expect(p.where).toMatch(/^\d+° up, [a-z]+$/);
      expect(p.visibility).toMatch(/^Up now/);
    }
  });

  it("keeps every row and explains the missing ring at a polar station in midsummer", () => {
    const polar = { lat: 85.0, lon: -74.0 };
    const request: SceneRequest = { displayedUnixMillis: NOON, nowUnixMillis: NOON, station: polar, lit: null, chart: null };
    const inp: PlinthInput = { frame: frame(NOON, polar.lat, polar.lon), request };
    const planets = scenePlanets(inp);
    const rete = sceneRete(inp);
    expect(planets.length).toBe(5);
    expect(rete.length).toBeLessThan(5);
    const noRing = planets.filter((p) => p.arcNote !== "");
    expect(noRing.length).toBe(5 - rete.length);
    for (const p of noRing) expect(p.arcNote).toMatch(/^No ring today/);
  });
});

describe("sceneConstellation (REQ-015)", () => {
  const withChart = (t: number, chart: string | null): PlinthInput => {
    const request: SceneRequest = { displayedUnixMillis: t, nowUnixMillis: t, station: NYC, lit: null, chart };
    return { frame: frame(t, NYC.lat, NYC.lon), request };
  };

  it("is null when nothing is chosen or the name is unknown", () => {
    expect(sceneConstellation(withChart(NIGHT, null))).toBeNull();
    expect(sceneConstellation(withChart(NIGHT, "Atlantis"))).toBeNull();
  });

  it("words an up constellation with where to look, and marks the chosen row lit", () => {
    const out = sceneConstellation(withChart(NIGHT, "Cassiopeia"));
    expect(out?.status).toBe("Up all night");
    expect(out?.where).toMatch(/^\d+° up, [a-z]+$/);
    expect(out?.visibility).toMatch(/^Up now/);
    expect(out?.tracked).toBe("tracked by Schedar");
    const rows = sceneTonight(withChart(NIGHT, "Cassiopeia")).programme.flatMap((m) => m.rows);
    expect(rows.filter((r) => r.lit).map((r) => r.name)).toEqual(["Cassiopeia"]);
  });

  it("says plainly when a constellation never rises from the station", () => {
    const out = sceneConstellation(withChart(NIGHT, "Crux"));
    expect(out?.status).toBe("Never rises from this station");
    expect(out?.where).toBe("");
    expect(out?.visibility).toMatch(/never clears the horizon/);
  });

  it("gives a rise countdown for one below the horizon, and stars the Mazzaroth", () => {
    const down = ["Leo", "Virgo", "Aries", "Taurus", "Libra"].map((n) => sceneConstellation(withChart(NIGHT, n)))
      .find((o) => o?.status.startsWith("Rises in"));
    expect(down).toBeDefined();
    expect(down?.starred).toBe(true);
    expect(down?.note).toContain("Mazzaroth");
    expect(down?.where).toBe("");
    expect(down?.visibility).toMatch(/^Below the horizon; rises in the [a-z]+ in \d/);
  });

  it("says a constellation on the horizon is setting, not climbing, unless it is circumpolar", () => {
    // Stand half a minute before each up constellation's setting moment: its
    // altitude rounds to 0, so there is nowhere to point, and the sentence
    // must say it is setting — never the circumpolar "climbs later" line.
    const lst = frame(NIGHT, NYC.lat, NYC.lon).siderealHours + NYC.lon / 15;
    let seen = 0;
    for (const c of CONSTELLATIONS) {
      const e = skyEntry(c, lst, NYC.lat);
      if (e.status !== "up" || e.untilMillis === null) continue;
      const out = sceneConstellation(withChart(NIGHT + e.untilMillis - 30_000, c.name));
      if (out === null || out.where !== "") continue;
      seen++;
      expect(out.status, c.name).toMatch(/^Up now · sets in 0m$/);
      expect(out.visibility, c.name).toMatch(/^Setting now, right on the [a-z]+ horizon/);
    }
    expect(seen).toBeGreaterThan(3);
    expect(sceneConstellation(withChart(NIGHT, "Cassiopeia"))?.status).toBe("Up all night");
  });

  it("does not promise stars before dark", () => {
    const out = sceneConstellation(withChart(NOON, "Cassiopeia"));
    expect(out?.visibility).toMatch(/not dark yet/);
  });
});
