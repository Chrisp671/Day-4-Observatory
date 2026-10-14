import { describe, expect, it } from "vitest";
import { formatCountdown, nextSunEvent } from "./hero";

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
