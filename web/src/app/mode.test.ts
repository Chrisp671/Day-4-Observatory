/**
 * REQ-013 — mode selection: first visit opens Day 4, the choice is
 * remembered, and nothing unreadable can put the page anywhere else.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODE, loadMode, MODE_KEY, MODES, parseMode, saveMode, stepMode, type ModeStore,
} from "./mode";

/** A Map wearing the two Storage methods the modes use. */
function fakeStore(initial: Record<string, string> = {}): ModeStore & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
  };
}

describe("the three modes", () => {
  it("are Stargazer, Constellations and Planets, in that order, Stargazer first (id day4, DEC-040)", () => {
    expect(MODES.map((m) => m.mode)).toEqual(["day4", "constellations", "planets"]);
    expect(MODES.map((m) => m.label)).toEqual(["Stargazer", "Constellations", "Planets"]);
    expect(DEFAULT_MODE).toBe("day4");
  });

  it("parse: a real mode passes through, anything else is Day 4", () => {
    expect(parseMode("planets")).toBe("planets");
    expect(parseMode("constellations")).toBe("constellations");
    expect(parseMode("parker")).toBe("day4"); // the old name is not a mode label
    expect(parseMode(null)).toBe("day4");
    expect(parseMode(42)).toBe("day4");
  });

  it("step: arrow keys walk the selector and wrap at both ends", () => {
    expect(stepMode("day4", 1)).toBe("constellations");
    expect(stepMode("constellations", 1)).toBe("planets");
    expect(stepMode("planets", 1)).toBe("day4");
    expect(stepMode("day4", -1)).toBe("planets");
  });
});

describe("remembering the mode", () => {
  it("first visit opens Day 4", () => {
    expect(loadMode(fakeStore())).toBe("day4");
  });

  it("no storage at all still opens Day 4", () => {
    expect(loadMode(null)).toBe("day4");
    expect(() => saveMode("planets", null)).not.toThrow();
  });

  it("a saved mode comes back on the next visit", () => {
    const store = fakeStore();
    saveMode("planets", store);
    expect(store.map.get(MODE_KEY)).toBe("planets");
    expect(loadMode(store)).toBe("planets");
  });

  it("a corrupt value falls back to Day 4 instead of a blank page", () => {
    expect(loadMode(fakeStore({ [MODE_KEY]: "eclipses" }))).toBe("day4");
  });

  it("storage that throws (private mode) is a visit that is simply not remembered", () => {
    const angry: ModeStore = {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => { throw new Error("QuotaExceededError"); },
    };
    expect(loadMode(angry)).toBe("day4");
    expect(() => saveMode("constellations", angry)).not.toThrow();
  });
});
