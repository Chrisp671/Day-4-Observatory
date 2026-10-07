/**
 * Freeze-time (REQ-005, DEC-051): stop the clock, keep the instrument.
 *
 * An observatory's "hold" — you park the heavens at an interesting instant and
 * then walk around them. The rule the owner chose is that freezing stops the
 * *sky* and not the *controls*: the steppers and the drag-to-scrub stay live and
 * move the frozen sky, so a frozen dial is something you explore rather than a
 * picture you look at once.
 *
 * This is a pure module for the same reason `scrub.ts` and `timecontrol.ts` are:
 * the interesting part is not "add a boolean" but what that boolean does to four
 * different places, and that is worth testing without a browser.
 *
 * **Nothing here reaches the Scene.** A frozen instrument is already a travelled
 * one as far as the engine is concerned — `scene-core.isTravelled` compares the
 * displayed instant against the present — so freezing needs no new field, no new
 * wording, and no change to SEAM-001 or SEAM-003. The Scene is told an instant;
 * it has no opinion about how that instant was chosen.
 */

/** Viewer state: what the clock is doing. */
export type Clock = "live" | "frozen";

export interface ClockState {
  readonly mode: Clock;
  /** Real now + travel offset while live; the pinned instant while frozen. */
  readonly displayedUnixMillis: number;
  /** Real now, always — the engine needs the present to judge visibility. */
  readonly nowUnixMillis: number;
}

/**
 * The state a clock is in at a given real instant.
 *
 * `frozenAt` is the pinned instant, or null while live. Keeping it as millis
 * rather than an offset is what makes the frozen sky *stay* frozen: a freeze at
 * 23:00 must still read 23:00 an hour later, which an offset could not do.
 */
export function clockAt(
  nowUnixMillis: number,
  offsetMillis: number,
  frozenAt: number | null,
): ClockState {
  if (frozenAt === null) {
    return { mode: "live", displayedUnixMillis: nowUnixMillis + offsetMillis, nowUnixMillis };
  }
  return { mode: "frozen", displayedUnixMillis: frozenAt, nowUnixMillis };
}

/**
 * Move a frozen clock. While live this is just the travel offset, but while
 * frozen the pinned instant itself moves — which is the whole difference
 * between a frozen sky you can explore and a frozen sky you cannot.
 */
export function moveWhileFrozen(frozenAt: number, deltaMillis: number): number {
  return frozenAt + deltaMillis;
}

/**
 * What stepping one unit does to the clock.
 *
 * The caller passes `nextDisplayedForLive`, which it gets by stepping the
 * *displayed* instant with `stepTime` — live stepping must move the shown sky
 * and keep running, so a calendar step still lands on the same wall-clock hour
 * across a DST boundary. While frozen, the pinned instant steps instead and the
 * real present is untouched, which is the whole difference between a frozen sky
 * you can explore and one you cannot.
 */
export function stepClock(
  state: ClockState,
  nextDisplayedForLive: number,
  stepper: (displayed: number) => number,
): { readonly offsetMillis: number; readonly frozenAt: number | null } {
  if (state.mode === "frozen") {
    return { offsetMillis: 0, frozenAt: stepper(state.displayedUnixMillis) };
  }
  return { offsetMillis: nextDisplayedForLive - state.nowUnixMillis, frozenAt: null };
}

/** Scrubbing is a travel delta in hours, live or frozen. */
export function scrubClock(
  state: ClockState,
  offsetMillis: number,
  deltaHours: number,
): { readonly offsetMillis: number; readonly frozenAt: number | null } {
  const delta = deltaHours * 3600000;
  if (state.mode === "frozen") {
    return { offsetMillis, frozenAt: moveWhileFrozen(state.displayedUnixMillis, delta) };
  }
  return { offsetMillis: offsetMillis + delta, frozenAt: null };
}

/**
 * Whether the sky needs redrawing on a timer.
 *
 * A frozen clock is exactly the case where the answer is no: the one thing the
 * interval exists to do is advance the heavens, and a frozen sky does not
 * advance. This is here rather than inlined so the rule is stated once and
 * tested — an interval left running would keep recomputing the Scene and
 * repainting an identical dial sixty times a minute.
 */
export function needsTick(state: ClockState): boolean {
  return state.mode === "live";
}