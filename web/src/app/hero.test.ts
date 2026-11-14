import { describe, expect, it } from "vitest";
import { dateWords, eventAt, formatCountdown, nextSunEvent, whenLine } from "./hero";

const local = (y: number, mo: number, d: number, h = 0, mi = 0, sec = 0): number =>
  new Date(y, mo, d, h, mi, sec).getTime();

describe("nextSunEvent", () => {
  it("is sunset when the sun is up (set comes before next rise)", () => {
    expect(nextSunEvent(2000, 1000)).toEqual({ kind: "sunset", atUnixMillis: 1000 });
  });
  it("is sunrise when the sun is down", () => {
    expect(nextSunEvent(1000, 2000)).toEqual({ kind: "sunrise", atUnixMillis: 1000 });
  });
  it("handles polar cases", () => {
    expect(nextSunEvent(null, null)).toBeNull();
    expect(nextSunEvent(null, 5)).toEqual({ kind: "sunset", atUnixMillis: 5 });
    expect(nextSunEvent(5, null)).toEqual({ kind: "sunrise", atUnixMillis: 5 });
  });
});

describe("formatCountdown", () => {
  it("formats hours and zero-padded minutes", () => {
    expect(formatCountdown(5 * 3600000 + 7 * 60000)).toBe("5h 07m");
  });
  it("drops the hour part under an hour", () => {
    expect(formatCountdown(43 * 60000)).toBe("43m");
  });
  it("floors partial minutes and clamps negatives", () => {
    expect(formatCountdown(59_999)).toBe("0m");
    expect(formatCountdown(-5000)).toBe("0m");
  });
});

describe("dateWords", () => {
  const NOW = local(2026, 10, 14, 15, 10);
  it("names the weekday, the month and the day in short plain words", () => {
    expect(dateWords(NOW, NOW)).toBe("Sat Nov 14");
    expect(dateWords(local(2026, 0, 1), NOW)).toBe("Thu Jan 1");
  });
  it("adds the year only when it is not the present one", () => {
    expect(dateWords(local(2026, 11, 31, 23), NOW)).toBe("Thu Dec 31");
    expect(dateWords(local(2027, 0, 1), NOW)).toBe("Fri Jan 1, 2027");
    expect(dateWords(local(2025, 10, 14), NOW)).toBe("Fri Nov 14, 2025");
  });
});

describe("whenLine (REQ-017: the date and time above the countdown)", () => {
  const NOW = local(2026, 10, 14, 15, 10, 25);
  it("is the date and the time to the minute while the clock follows the present", () => {
    expect(whenLine(NOW, NOW, false)).toBe("Sat Nov 14 · 3:10 pm");
  });
  it("shows the seconds once the instrument has been moved, so a one-second step is visible", () => {
    const moved = local(2026, 9, 2, 21, 7, 25);
    expect(whenLine(moved, NOW, true)).toBe("Fri Oct 2 · 9:07:25 pm");
    expect(whenLine(moved + 1000, NOW, true)).toBe("Fri Oct 2 · 9:07:26 pm");
  });
  it("carries the date across 12 am in both directions", () => {
    expect(whenLine(local(2026, 10, 14, 23, 59, 59), NOW, true)).toBe("Sat Nov 14 · 11:59:59 pm");
    expect(whenLine(local(2026, 10, 15, 0, 0, 0), NOW, true)).toBe("Sun Nov 15 · 12:00:00 am");
    expect(whenLine(local(2026, 10, 13, 23, 59, 59), NOW, true)).toBe("Fri Nov 13 · 11:59:59 pm");
  });
  it("says the year after a journey into another one", () => {
    expect(whenLine(local(2027, 10, 14, 15, 10, 25), NOW, true)).toBe("Sun Nov 14, 2027 · 3:10:25 pm");
  });
});

describe("eventAt (the event's own date and time)", () => {
  const SHOWN = local(2026, 10, 14, 15, 10);
  it("is the clock time alone when the event is on the date the instrument shows", () => {
    expect(eventAt(local(2026, 10, 14, 16, 52), SHOWN)).toBe("at 4:52 pm");
  });
  it("names the date when the event is on another one, as tomorrow's sunrise is", () => {
    expect(eventAt(local(2026, 10, 15, 6, 41), local(2026, 10, 14, 20, 0))).toBe("at 6:41 am Sun Nov 15");
  });
  it("names the year too when the event falls in the next one", () => {
    expect(eventAt(local(2027, 0, 1, 7, 20), local(2026, 11, 31, 20, 0))).toBe("at 7:20 am Fri Jan 1, 2027");
  });
  it("is relative to the shown date, not the real one", () => {
    // The instrument stands on Dec 24; an event on Dec 24 needs no date.
    expect(eventAt(local(2026, 11, 24, 16, 35), local(2026, 11, 24, 9, 0))).toBe("at 4:35 pm");
  });
});
