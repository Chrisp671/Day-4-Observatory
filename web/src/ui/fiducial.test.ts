import { describe, expect, it } from "vitest";
import { AT_PRESENT_HOURS, isAtPresent, travelHours } from "./fiducial";

describe("travelHours", () => {
  it("is zero when the dial shows the present", () => {
    expect(travelHours(13.5, 13.5)).toBe(0);
  });

  it("counts forward travel as positive", () => {
    expect(travelHours(15, 12)).toBe(3);
  });

  it("counts backward travel as negative", () => {
    expect(travelHours(9, 12)).toBe(-3);
  });

  it("takes the short way round midnight", () => {
    // 23:00 shown, 01:00 now — two hours back, not twenty-two forward.
    expect(travelHours(23, 1)).toBe(-2);
    expect(travelHours(1, 23)).toBe(2);
  });

  it("never reports more than half a day of travel", () => {
    for (let shown = 0; shown < 24; shown += 0.25) {
      for (let now = 0; now < 24; now += 1) {
        const t = travelHours(shown, now);
        expect(t).toBeGreaterThanOrEqual(-12);
        expect(t).toBeLessThan(12);
      }
    }
  });
});

describe("isAtPresent", () => {
  it("holds while the clock is live", () => {
    expect(isAtPresent(12, 12)).toBe(true);
    expect(isAtPresent(12 + AT_PRESENT_HOURS / 2, 12)).toBe(true);
  });

  it("breaks as soon as time is scrubbed a minute", () => {
    expect(isAtPresent(12 + 2 / 60, 12)).toBe(false);
    expect(isAtPresent(6, 18)).toBe(false);
  });
});
