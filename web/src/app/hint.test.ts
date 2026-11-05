/**
 * The first-visit hint (DEC-055): shown until the visitor has lit or released
 * a planet once, remembered across visits, and never thrown by storage.
 */
import { describe, expect, it } from "vitest";
import { HINT_KEY, hintSeen, markHintSeen, RING_HINT } from "./hint";
import type { ModeStore } from "./mode";

const fakeStore = (): ModeStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
};

const thrower: ModeStore = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

describe("the hint's words", () => {
  it("are plain, say both ways to do it, and say why", () => {
    expect(RING_HINT).toBe("Tap a ring or a planet's name to see which is which.");
    expect(RING_HINT).toMatch(/ring/);
    expect(RING_HINT).toMatch(/name/);
  });
});

describe("hintSeen / markHintSeen", () => {
  it("shows the hint on a first visit", () => {
    expect(hintSeen(fakeStore())).toBe(false);
    expect(hintSeen(null)).toBe(false);
  });

  it("hides it once a planet has been lit or released, and remembers across visits", () => {
    const store = fakeStore();
    markHintSeen(store);
    expect(hintSeen(store)).toBe(true);
    expect(store.data.get(HINT_KEY)).toBe("1");
    // A second visit reads the same store.
    expect(hintSeen({ getItem: (k) => store.data.get(k) ?? null, setItem: () => undefined })).toBe(true);
  });

  it("treats anything but the mark as unseen", () => {
    const store = fakeStore();
    store.data.set(HINT_KEY, "yes");
    expect(hintSeen(store)).toBe(false);
    store.data.set(HINT_KEY, "");
    expect(hintSeen(store)).toBe(false);
  });

  it("never throws when storage refuses, and shows the hint again", () => {
    expect(() => markHintSeen(thrower)).not.toThrow();
    expect(hintSeen(thrower)).toBe(false);
    expect(() => markHintSeen(null)).not.toThrow();
  });

  it("keeps its own key, beside the lit ring's and the mode's", () => {
    expect(HINT_KEY).toMatch(/^day4\./);
    expect(HINT_KEY).not.toBe("day4.lit");
    expect(HINT_KEY).not.toBe("day4.mode");
  });
});
