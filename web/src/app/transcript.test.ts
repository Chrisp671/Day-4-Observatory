import { describe, expect, it } from "vitest";
import { compassPoint, litRingSentence, transcript } from "./transcript";

describe("compassPoint", () => {
  it("names the cardinal winds", () => {
    expect(compassPoint(0)).toBe("north");
    expect(compassPoint(90)).toBe("east");
    expect(compassPoint(180)).toBe("south");
    expect(compassPoint(270)).toBe("west");
  });

  it("rounds to the nearer of the eight, and wraps", () => {
    expect(compassPoint(44)).toBe("northeast");
    expect(compassPoint(350)).toBe("north");
    expect(compassPoint(-90)).toBe("west");
    expect(compassPoint(720 + 135)).toBe("southeast");
  });
});

describe("transcript", () => {
  const base = {
    sunAltitudeDeg: 34.2, sunAzimuthDeg: 140,
    moonPhaseName: "first quarter", moonAgeDays: 7.7,
    riseHHMM: "05:12", setHHMM: "18:45",
  };

  it("speaks a daytime sky", () => {
    expect(transcript(base)).toBe(
      "The sun is up, 34 degrees above the horizon in the southeast. " +
      "Sunrise at 05:12, sunset at 18:45. " +
      "The moon is a first quarter, 7.7 days old.",
    );
  });

  it("knows twilight from night", () => {
    expect(transcript({ ...base, sunAltitudeDeg: -3 })).toContain("twilight");
    expect(transcript({ ...base, sunAltitudeDeg: -20 })).toContain("dark");
  });

  it("stays honest at the poles", () => {
    const polar = transcript({ ...base, riseHHMM: null, setHHMM: null });
    expect(polar).toContain("no sunrise or sunset");
    expect(polar).not.toContain("null");
  });

  it("names the lit ring in one sentence, after the moon (DEC-053)", () => {
    const lit = { name: "Saturn", up: true, riseHHMM: "7:12 pm", setHHMM: "3:00 am" };
    expect(transcript({ ...base, lit })).toBe(
      "The sun is up, 34 degrees above the horizon in the southeast. " +
      "Sunrise at 05:12, sunset at 18:45. " +
      "The moon is a first quarter, 7.7 days old. " +
      "Saturn's ring is lit, up until 3:00 am.",
    );
  });

  it("says nothing about the rete when no ring is lit, and ends cleanly", () => {
    expect(transcript(base)).toBe(transcript({ ...base, lit: null }));
    expect(transcript({ ...base, lit: null })).not.toMatch(/\s$/);
    expect(transcript({ ...base, lit: null })).not.toContain("ring");
  });
});

describe("litRingSentence", () => {
  it("says when a lit ring that has not risen will be up", () => {
    expect(litRingSentence({ name: "Jupiter", up: false, riseHHMM: "11:20 pm", setHHMM: "9:05 am" }))
      .toBe("Jupiter's ring is lit, up from 11:20 pm until 9:05 am.");
  });

  it("is empty for no ring", () => {
    expect(litRingSentence(null)).toBe("");
    expect(litRingSentence(undefined)).toBe("");
  });
});
