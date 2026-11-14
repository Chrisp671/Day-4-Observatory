/**
 * CHK-003 — time-travel semantics, incl. the calendar edge cases the legacy
 * app never specified (and JS Date silently gets wrong via overflow).
 */
import { describe, expect, it } from "vitest";
import { STEP_UNITS, stepTime } from "./timecontrol";

const local = (y: number, mo: number, d: number, h = 12): number =>
  new Date(y, mo, d, h).getTime();

describe("fixed-width steps", () => {
  it("second, minute and hour step exact milliseconds", () => {
    const t = local(2026, 7, 11);
    expect(stepTime(t, "second", 1) - t).toBe(1000);
    expect(stepTime(t, "second", -1) - t).toBe(-1000);
    expect(stepTime(t, "minute", 1) - t).toBe(60000);
    expect(stepTime(t, "hour", -1) - t).toBe(-3600000);
  });
  it("phase steps one lunar quarter (~7.38 days)", () => {
    const t = local(2026, 7, 11);
    const days = (stepTime(t, "phase", 1) - t) / 86400000;
    expect(days).toBeCloseTo(29.530588853 / 4, 6);
  });
});

describe("the fine steps Parker asked for (REQ-017)", () => {
  it("sixty seconds forward is one minute forward, and sixty minutes one hour", () => {
    let t = local(2026, 10, 14, 23);
    const start = t;
    for (let i = 0; i < 60; i++) t = stepTime(t, "second", 1);
    expect(t).toBe(stepTime(start, "minute", 1));
    for (let i = 0; i < 59; i++) t = stepTime(t, "minute", 1);
    expect(t).toBe(stepTime(start, "hour", 1));
    // 11 pm plus an hour is the next calendar day: a fine step carries the date.
    expect(new Date(t).getDate()).toBe(15);
  });
  it("lists the units finest first, the second and the minute leading", () => {
    expect(STEP_UNITS.map((u) => u.unit).slice(0, 3)).toEqual(["second", "minute", "hour"]);
    expect(STEP_UNITS.find((u) => u.unit === "second")?.label).toBe("SEC");
    expect(STEP_UNITS.find((u) => u.unit === "minute")?.label).toBe("MIN");
  });
});

describe("calendar steps clamp instead of overflowing", () => {
  it("Jan 31 + 1 month = Feb 28 (not Mar 2-3)", () => {
    const out = new Date(stepTime(local(2026, 0, 31), "month", 1));
    expect(out.getMonth()).toBe(1);
    expect(out.getDate()).toBe(28);
  });
  it("Jan 31 + 1 month = Feb 29 in a leap year", () => {
    const out = new Date(stepTime(local(2024, 0, 31), "month", 1));
    expect(out.getMonth()).toBe(1);
    expect(out.getDate()).toBe(29);
  });
  it("Mar 31 - 1 month = Feb 28, not an overflow into March", () => {
    const out = new Date(stepTime(local(2026, 2, 31), "month", -1));
    expect(out.getMonth()).toBe(1);
    expect(out.getDate()).toBe(28);
  });
  it("Feb 29 + 1 year = Feb 28 of the next year", () => {
    const out = new Date(stepTime(local(2024, 1, 29), "year", 1));
    expect(out.getFullYear()).toBe(2025);
    expect(out.getMonth()).toBe(1);
    expect(out.getDate()).toBe(28);
  });
  it("century steps 100 years and preserves the date", () => {
    const out = new Date(stepTime(local(2026, 7, 11), "century", -1));
    expect(out.getFullYear()).toBe(1926);
    expect(out.getMonth()).toBe(7);
    expect(out.getDate()).toBe(11);
  });
  it("December + 1 month wraps the year correctly", () => {
    const out = new Date(stepTime(local(2026, 11, 15), "month", 1));
    expect(out.getFullYear()).toBe(2027);
    expect(out.getMonth()).toBe(0);
    expect(out.getDate()).toBe(15);
  });
  it("day steps preserve wall-clock hour", () => {
    const out = new Date(stepTime(local(2026, 7, 11, 9), "day", 1));
    expect(out.getHours()).toBe(9);
    expect(out.getDate()).toBe(12);
  });
});
