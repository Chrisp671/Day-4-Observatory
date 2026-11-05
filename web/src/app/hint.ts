/**
 * The first-visit hint (DEC-055): plain words, once.
 *
 * "Tap a ring or a planet's name to see which is which." A visitor who has
 * never lit or released a planet is told how; the hint stays until they do it
 * once — by ring, by key or by row — and never leaves on a timer, because a
 * hint that vanishes before it is read was never a hint. Remembered in
 * localStorage beside `day4.lit` and `day4.mode`, with the same shrug when
 * storage refuses: then it simply shows again next visit.
 *
 * Pure: storage is an argument, so a test can hand it a fake or a thrower.
 */
import { browserStore, type ModeStore } from "./mode";

/** The hint, word for word. ≥ 12 px wherever it is set (DEC-053). */
export const RING_HINT = "Tap a ring or a planet's name to see which is which.";

/** Storage key; "1" once the person has lit or released a planet. */
export const HINT_KEY = "day4.ring-hint";

/** True once the visitor has lit or released a planet on some visit. */
export function hintSeen(store: ModeStore | null = browserStore()): boolean {
  try {
    return store?.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remember that the visitor has done it once; storage that refuses simply forgets. */
export function markHintSeen(store: ModeStore | null = browserStore()): void {
  try {
    store?.setItem(HINT_KEY, "1");
  } catch {
    /* private mode: the hint shows again next visit, which is harmless */
  }
}
