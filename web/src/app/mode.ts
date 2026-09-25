/**
 * THE MODES — one instrument, three views (DEC-038, REQ-013).
 *
 *   Stargazer · Constellations · Planets
 *
 * Stargazer (labelled "Day 4" until DEC-040; its id stays `day4` so a
 * remembered choice survives the rename) is the completed experience (the Parker walkthrough, DEC-031..036),
 * kept exactly as it is. Constellations and Planets are focused views that
 * share its station and its displayed time; switching changes what is shown,
 * never where or when.
 *
 * A mode is viewer state, like the station and the lit ring: it lives in
 * main.ts, is remembered across visits, and never enters the Scene. The
 * Scene answers "what does the sky show at this place and time"; a mode
 * only decides which of that the page presents.
 *
 * First visit opens Day 4. Anything unreadable in storage is Day 4 too —
 * an unknown mode is never an error, just the front door.
 */

export type Mode = "day4" | "constellations" | "planets";

export interface ModeInfo {
  readonly mode: Mode;
  /** The word on the selector, in the page's voice. */
  readonly label: string;
}

/** In selector order; Stargazer first because it is the instrument itself. */
export const MODES: readonly ModeInfo[] = [
  { mode: "day4", label: "Stargazer" },
  { mode: "constellations", label: "Constellations" },
  { mode: "planets", label: "Planets" },
];

export const DEFAULT_MODE: Mode = "day4";

/** Storage key; sits beside `day4.lit` and the station key. */
export const MODE_KEY = "day4.mode";

const isMode = (value: unknown): value is Mode =>
  MODES.some((m) => m.mode === value);

/** A stored or requested value, or the default when it is not a mode. */
export function parseMode(raw: unknown): Mode {
  return isMode(raw) ? raw : DEFAULT_MODE;
}

/** The neighbouring mode in selector order, wrapping at both ends (arrow keys). */
export function stepMode(mode: Mode, dir: 1 | -1): Mode {
  const i = MODES.findIndex((m) => m.mode === mode);
  const n = MODES.length;
  const next = MODES[((i < 0 ? 0 : i) + dir + n) % n];
  return next === undefined ? DEFAULT_MODE : next.mode;
}

/** The slice of Storage the modes need; localStorage fits, so does a test fake. */
export interface ModeStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage when the browser grants it; null in private mode or Node. */
function browserStore(): ModeStore | null {
  try {
    const s = (globalThis as { localStorage?: ModeStore }).localStorage;
    return s === undefined ? null : s;
  } catch {
    return null;
  }
}

/** The remembered mode, or Day 4 on a first visit or an unreadable store. */
export function loadMode(store: ModeStore | null = browserStore()): Mode {
  try {
    return parseMode(store?.getItem(MODE_KEY) ?? null);
  } catch {
    return DEFAULT_MODE;
  }
}

/** Remember the mode; storage that refuses simply does not remember. */
export function saveMode(mode: Mode, store: ModeStore | null = browserStore()): void {
  try {
    store?.setItem(MODE_KEY, mode);
  } catch {
    /* private mode: the choice simply does not persist */
  }
}
