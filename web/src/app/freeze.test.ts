/**
 * The frozen clock (DEC-051). Four rules, and the reason each one is what it is.
 */
import { describe, expect, it } from "vitest";
import { clockAt, needsTick, returnToPresent, scrubClock, stepClock } from "./freeze";
import { stepTime, type StepUnit } from "./timecontrol";

const T = (iso: string): number => new Date(iso).getTime();
const HOUR = 3600000;

describe("a live clock", () => {
  it("shows the present plus the travel offset", () => {
    const s = clockAt(T("2026-10-02T12:00:00Z"), 2 * HOUR, null);
    expect(s.mode).toBe("live");
    expect(s.displayedUnixMillis).toBe(T("2026-10-02T14:00:00Z"));
  });

  it("still reports the real present, which is what visibility is judged against", () => {
    const s = clockAt(T("2026-10-02T12:00:00Z"), 2 * HOUR, null);
    expect(s.nowUnixMillis).toBe(T("2026-10-02T12:00:00Z"));
  });

  it("keeps running: the same offset shows a later instant as time passes", () => {
    const first = clockAt(T("2026-10-02T12:00:00Z"), 2 * HOUR, null);
    const later = clockAt(T("2026-10-02T13:00:00Z"), 2 * HOUR, null);
    expect(later.displayedUnixMillis - first.displayedUnixMillis).toBe(HOUR);
  });
});

describe("a frozen clock", () => {
  it("holds the instant it was frozen at, however long the real clock runs", () => {
    const frozenAt = T("2026-10-02T23:00:00Z");
    const justAfter = clockAt(T("2026-10-02T23:00:01Z"), 0, frozenAt);
    const muchLater = clockAt(T("2026-10-03T09:30:00Z"), 0, frozenAt);
    expect(justAfter.displayedUnixMillis).toBe(frozenAt);
    expect(muchLater.displayedUnixMillis).toBe(frozenAt);
  });

  it("keeps reporting the real present, so the engine can still judge the sky", () => {
    const now = T("2026-10-03T09:30:00Z");
    const s = clockAt(now, 0, T("2026-10-02T23:00:00Z"));
    expect(s.nowUnixMillis).toBe(now);
    expect(s.displayedUnixMillis).not.toBe(now);
  });

  it("ignores a live travel offset, because the pinned instant replaced it", () => {
    const frozenAt = T("2026-10-02T23:00:00Z");
    const s = clockAt(T("2026-10-03T09:30:00Z"), 5 * HOUR, frozenAt);
    expect(s.displayedUnixMillis).toBe(frozenAt);
  });
});

describe("stepping while frozen", () => {
  const frozenAt = T("2026-10-02T23:00:00Z");
  const state = clockAt(T("2026-10-03T09:30:00Z"), 0, frozenAt);
  const stepper = (displayed: number) => stepTime(displayed, "hour" as StepUnit, 1);

  it("moves the pinned instant, so the frozen sky is something you explore", () => {
    const next = stepClock(state, 0, stepper);
    expect(next.frozenAt).toBe(frozenAt + HOUR);
    expect(next.offsetMillis).toBe(0);
  });

  it("never revives the clock by accident", () => {
    expect(stepClock(state, 0, stepper).frozenAt).not.toBeNull();
  });

  it("is not the same as stepping the live offset, which is the whole difference", () => {
    // While live the offset is recomputed from the present; while frozen the pin
    // moves. Same button, different arithmetic, because the two states mean
    // different things.
    const live = clockAt(T("2026-10-03T09:30:00Z"), 0, null);
    const fromLive = stepClock(live, stepTime(live.nowUnixMillis, "hour", 1), stepper);
    expect(fromLive.offsetMillis).toBe(HOUR);
    expect(fromLive.frozenAt).toBeNull();
  });
});

describe("stepping while live", () => {
  it("keeps the dial running: two taps are two days from the displayed instant, not from the last tap", () => {
    // Live stepping steps the DISPLAYED instant (what main.ts does), so the
    // offset is recomputed from the present each time and the clock keeps moving
    // between taps. If it re-derived from `now` instead, two taps an hour apart
    // would land one day out, because the second tap would discard the first.
    const first = clockAt(T("2026-10-02T12:00:00Z"), 0, null);
    const once = stepClock(
      first,
      stepTime(first.displayedUnixMillis, "day", 1),
      (d) => stepTime(d, "day", 1),
    );
    expect(once.offsetMillis).toBe(86400000);
    // The present has moved on between taps; the offset is still measured afresh.
    const second = clockAt(T("2026-10-02T15:00:00Z"), once.offsetMillis, null);
    const twice = stepClock(
      second,
      stepTime(second.displayedUnixMillis, "day", 1),
      (d) => stepTime(d, "day", 1),
    );
    // Second tap steps the *displayed* instant (already 1 day out) by another day.
    expect(twice.offsetMillis).toBe(2 * 86400000);
    expect(twice.frozenAt).toBeNull();
  });

  it("steps the displayed instant, so a calendar step keeps the wall-clock time", () => {
    // The point of `timecontrol`'s calendar units is that a "day" is a calendar
    // day, not 86,400,000ms: across a DST boundary it is 23 or 25 hours, and the
    // wall-clock hour must not move. Asserting the *offset's millisecond count*
    // would be wrong — it depends on the machine's timezone. Assert the actual
    // contract instead: same local hour, one calendar day later.
    const s = clockAt(T("2026-03-07T12:00:00Z"), 0, null);
    const next = stepClock(s, stepTime(s.displayedUnixMillis, "day", 1), (d) => stepTime(d, "day", 1));
    const before = new Date(s.displayedUnixMillis);
    const after = new Date(next.offsetMillis + s.nowUnixMillis);
    expect(after.getHours()).toBe(before.getHours()); // local wall-clock hour preserved
    expect(after.getDate()).toBe(before.getDate() + 1); // exactly one calendar day on
  });
});

describe("scrubbing", () => {
  it("adds to the live offset, as it always did", () => {
    const s = clockAt(T("2026-10-02T12:00:00Z"), HOUR, null);
    const next = scrubClock(s, HOUR, 2);
    expect(next.offsetMillis).toBe(3 * HOUR);
    expect(next.frozenAt).toBeNull();
  });

  it("moves a frozen sky instead, and keeps the pin frozen", () => {
    const frozenAt = T("2026-10-02T23:00:00Z");
    const s = clockAt(T("2026-10-03T09:30:00Z"), 0, frozenAt);
    const next = scrubClock(s, 0, -1.5);
    expect(next.frozenAt).toBe(frozenAt - 1.5 * HOUR);
    expect(next.frozenAt).not.toBeNull();
  });

  it("goes both ways, and a negative drag is not a stuck clock", () => {
    const frozenAt = T("2026-10-02T23:00:00Z");
    const s = clockAt(frozenAt, 0, frozenAt);
    const back = scrubClock(s, 0, -4);
    const on = scrubClock(s, 0, 4);
    expect(back.frozenAt!).toBeLessThan(frozenAt);
    expect(on.frozenAt!).toBeGreaterThan(frozenAt);
  });
});

describe("whether the sky needs redrawing on a timer", () => {
  it("does while live, because that is the only reason the interval exists", () => {
    expect(needsTick(clockAt(T("2026-10-02T12:00:00Z"), 0, null))).toBe(true);
  });

  it("does not while frozen — the heavens do not move, and repainting them 60×/min is waste", () => {
    expect(needsTick(clockAt(T("2026-10-02T23:00:00Z"), 0, T("2026-10-02T23:00:00Z")))).toBe(false);
  });

  it("resumes the moment the clock is released", () => {
    const frozen = clockAt(T("2026-10-02T23:00:00Z"), 0, T("2026-10-02T23:00:00Z"));
    expect(needsTick(frozen)).toBe(false);
    expect(needsTick(clockAt(T("2026-10-02T23:00:01Z"), 0, null))).toBe(true);
  });
});

describe("the seam that did not move", () => {
  it("a frozen clock needs no Scene field, because it is already a travelled one", () => {
    // This is the assertion that protects SEAM-003. `isTravelled` compares the
    // displayed instant against the present, so freezing is indistinguishable
    // from time travel as far as the engine is concerned — which is why no
    // contract extension was needed and none is claimed.
    const frozenAt = T("2026-10-02T23:00:00Z");
    const frozen = clockAt(T("2026-10-03T09:30:00Z"), 0, frozenAt);
    const travelled = clockAt(T("2026-10-03T09:30:00Z"), frozenAt - T("2026-10-03T09:30:00Z"), null);
    expect(frozen.displayedUnixMillis).toBe(travelled.displayedUnixMillis);
    expect(frozen.nowUnixMillis).toBe(travelled.nowUnixMillis);
  });
});

describe("why the skip is only testable here", () => {
  // The browser driver CANNOT prove the interval is skipped, and pretending
  // otherwise would be the kind of test that passes for the wrong reason. Under
  // `page.clock.setFixedTime`, a redundant repaint of an unchanged Scene
  // produces byte-identical pixels, so a screenshot comparison cannot tell
  // "painted once" from "painted sixty times". The guard is therefore asserted
  // directly, and the driver proves the visible consequence instead.
  it("reports the interval's work by whether the clock advanced", () => {
    const live = clockAt(T("2026-10-02T12:00:00Z"), 0, null);
    const frozen = clockAt(T("2026-10-02T12:00:00Z"), 0, T("2026-10-02T12:00:00Z"));
    // The counter-example that matters: remove the guard in main.ts and both
    // become 1, repainting a frozen sky every cadence. The guard is the only
    // thing standing between a hold and a busy loop.
    expect(needsTick(live)).toBe(true);
    expect(needsTick(frozen)).toBe(false);
    expect(needsTick(live)).not.toBe(needsTick(frozen));
  });
});

describe("returning to the present", () => {
  // The shipped bug: while the clock was held, NOW cleared only the travel offset,
  // which that mode ignores. It looked armed and repainted the same pinned instant.
  it("releases a held clock, because clearing the offset alone cannot", () => {
    const now = T("2026-10-02T12:00:00Z");
    const held = clockAt(now, 0, T("2026-10-02T09:30:00Z"));
    expect(held.displayedUnixMillis).toBe(T("2026-10-02T09:30:00Z"));
    expect(needsTick(held)).toBe(false);

    const next = returnToPresent();
    expect(next.frozenAt).toBe(null);
    expect(next.offsetMillis).toBe(0);
    expect(needsTick(clockAt(now, next.offsetMillis, next.frozenAt))).toBe(true);
  });

  it("actually arrives at the present, not merely stops being frozen", () => {
    // The assertion that bites: before the fix the display stayed pinned at 09:30
    // and only the mode changed. Reaching the present is the whole promise.
    const now = T("2026-10-02T12:00:00Z");
    const next = returnToPresent();
    expect(clockAt(now, next.offsetMillis, next.frozenAt).displayedUnixMillis).toBe(now);
    expect(clockAt(now, next.offsetMillis, next.frozenAt).displayedUnixMillis)
      .not.toBe(T("2026-10-02T09:30:00Z"));
  });

  it("is idempotent, and does not disturb a clock that was already live and untravelled", () => {
    const now = T("2026-10-02T12:00:00Z");
    const live = clockAt(now, 0, null);
    const next = returnToPresent();
    const once = clockAt(now, next.offsetMillis, next.frozenAt);
    const twice = clockAt(now, returnToPresent().offsetMillis, returnToPresent().frozenAt);
    expect(once).toEqual(twice);
    expect(once.displayedUnixMillis).toBe(live.displayedUnixMillis);
  });

  it("discards a travel offset as well, so NOW means now and not merely unpinned", () => {
    const now = T("2026-10-02T12:00:00Z");
    const travelled = clockAt(now, 3 * HOUR, null);
    expect(travelled.displayedUnixMillis).toBe(T("2026-10-02T15:00:00Z"));
    const next = returnToPresent();
    expect(clockAt(now, next.offsetMillis, next.frozenAt).displayedUnixMillis).toBe(now);
  });
});