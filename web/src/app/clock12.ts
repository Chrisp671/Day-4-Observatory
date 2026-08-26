/**
 * Twelve-hour time, everywhere a human reads it (REQ-012).
 *
 * "Most astronomers don't use military time" — Parker, watching himself
 * translate 2100 into 9 o'clock. The engine keeps 24-hour math internally;
 * this module owns the words: 12:00 am is midnight, 12:00 pm is noon.
 */

/** "9:07 pm", "12:00 am" (midnight), "12:30 pm" (after noon). */
export function fmt12(unixMillis: number): string {
  const d = new Date(unixMillis);
  const h24 = d.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} ${h24 < 12 ? "am" : "pm"}`;
}

/** Compact form for tight cells: "9:07p", "12:00a". */
export function fmt12c(unixMillis: number): string {
  const d = new Date(unixMillis);
  const h24 = d.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}${h24 < 12 ? "a" : "p"}`;
}

/** With seconds, for the corner clock: "5:08:29 pm". */
export function fmt12s(unixMillis: number): string {
  const d = new Date(unixMillis);
  const h24 = d.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s} ${h24 < 12 ? "am" : "pm"}`;
}
