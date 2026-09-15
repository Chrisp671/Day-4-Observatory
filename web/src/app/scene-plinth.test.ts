import { describe, expect, it } from "vitest";
import { frame } from "../engine/frame";
import { RING_ORDER } from "../ui/clockface";
import { type PlinthInput, sceneReadouts, sceneRete, sceneSpoken, sceneTonight } from "./scene-plinth";
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

  it("shows the travelled date only when the instrument has left the present", () => {
    expect(sceneReadouts(input(NOON, null)).travelledDate).toBe("");
    const travelled = sceneReadouts(input(NOON, null, NOON - 86400000)).travelledDate;
    expect(travelled).toMatch(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d+$/);
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
});
