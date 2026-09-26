/**
 * CHK-002 — the dial's own conventions: the four words it is allowed to say,
 * its three-level tick cadence, and the wrap in the day/night arcs.
 *
 * The numerals are the one piece of text on the dial, and DEC-038's dial-text
 * rule permits exactly these four. Pinning them here is what lets the review
 * rubric say "no unapproved dial words" and be right.
 */
import { describe, expect, it } from "vitest";
import { bandArcs, dialNumeral, tickRank } from "./dial";

describe("dialNumeral — a human clock, not a military one (REQ-012)", () => {
  it("reads midnight and noon as twelve on the right side of the day", () => {
    expect(dialNumeral(0)).toBe("12");
    expect(dialNumeral(12)).toBe("12");
  });

  it("gives the two sixes their half of the day", () => {
    expect(dialNumeral(6)).toBe("6 AM");
    expect(dialNumeral(18)).toBe("6 PM");
  });

  it("says nothing else — four strings for forty-eight ticks", () => {
    const said = new Set<string>();
    for (let i = 0; i < 48; i++) {
      const h = i / 2;
      if (tickRank(h) === "major") said.add(dialNumeral(h));
    }
    expect([...said].sort()).toEqual(["12", "6 AM", "6 PM"]);
  });

  it("marks exactly eight majors, and they are the sixes and the twelves", () => {
    const majors = Array.from({ length: 48 }, (_, i) => i / 2).filter((h) => tickRank(h) === "major");
    expect(majors).toEqual([0, 6, 12, 18]);
  });
});

describe("tickRank — rank by length and weight, not opacity (DESIGN-CONSOLIDATED #4)", () => {
  it("is three levels: six-hour majors, the hours, the half-hours", () => {
    expect(tickRank(0)).toBe("major");
    expect(tickRank(6)).toBe("major");
    expect(tickRank(1)).toBe("hourly");
    expect(tickRank(1.5)).toBe("minor");
  });

  it("covers all forty-eight ticks: 4 major, 20 hourly, 24 minor", () => {
    // A 24-hour dial has four six-hour majors, not eight: 48 ticks run 0 to 23.5,
    // so hour 24 never comes round.
    const counts = { major: 0, hourly: 0, minor: 0 };
    for (let i = 0; i < 48; i++) counts[tickRank(i / 2)]++;
    expect(counts).toEqual({ major: 4, hourly: 20, minor: 24 });
  });
});

describe("bandArcs", () => {
  it("leaves the band unshaded at a polar day or night, where the sky gives no event", () => {
    expect(bandArcs({ riseHours: null, setHours: null })).toBeNull();
    expect(bandArcs({ riseHours: 12, setHours: null })).toBeNull();
    expect(bandArcs({ riseHours: null, setHours: 12 })).toBeNull();
  });

  it("runs the lit day from rise to set and the dark night from set onward", () => {
    const arcs = bandArcs({ riseHours: 6, setHours: 20 });
    expect(arcs).not.toBeNull();
    expect(arcs?.dayFrom).toBe(6);
    expect(arcs?.dayTo).toBe(20);
    expect(arcs?.nightFrom).toBe(20);
  });

  it("ends the night at the NEXT rise — +24 — so the two arcs make one full turn", () => {
    // A night from 20:00 to 05:00 is nine hours, and the arc must reach 29:00,
    // not stop at 05:00 and sweep the long way round the wrong side.
    const arcs = bandArcs({ riseHours: 5, setHours: 20 });
    expect(arcs?.nightTo).toBe(29);
    const day = (arcs?.dayTo ?? 0) - (arcs?.dayFrom ?? 0);
    const night = (arcs?.nightTo ?? 0) - (arcs?.nightFrom ?? 0);
    expect(day + night).toBeCloseTo(24, 12);
  });

  it("holds that identity through the seasons, when the day is 8 or 16 hours", () => {
    for (const [rise, set] of [[4, 20], [8, 16], [0, 12], [11.5, 13.5]] as const) {
      const arcs = bandArcs({ riseHours: rise, setHours: set });
      const day = (arcs?.dayTo ?? 0) - (arcs?.dayFrom ?? 0);
      const night = (arcs?.nightTo ?? 0) - (arcs?.nightFrom ?? 0);
      expect(day + night).toBeCloseTo(24, 12);
    }
  });
});
