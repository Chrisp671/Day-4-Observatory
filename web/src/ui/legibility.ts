/**
 * The legibility floors (DEC-053): "do what is best for someone who is 60."
 *
 * Numbers, not opinions, so a stylesheet change can fail a test. The gate in
 * legibility.test.ts reads index.html and holds every declared size to these;
 * scripts/touch.mjs holds the same in a real browser, where computed sizes,
 * hit boxes and clipped text can be measured rather than read.
 */

/** No visible text under this, in CSS px. */
export const TEXT_FLOOR_PX = 11;
/** Readouts and content — times, names, rows, detail text — no smaller than this. */
export const CONTENT_FLOOR_PX = 12;
/** A thumb's target, wherever the layout allows it (Apple's minimum). */
export const TARGET_PX = 44;
/** Never below this, even where the layout cannot give 44 (WCAG 2.5.8). */
export const TARGET_FLOOR_PX = 24;

/** The selectors whose type is content, held to CONTENT_FLOOR_PX. Each must
 * appear in the stylesheet with a font-size, so a renamed class fails loudly. */
export const CONTENT_SELECTORS: readonly string[] = [
  ".bay .v", ".bay .s", "#station-bay .v", ".stationbar input",
  ".lrow .n", ".lrow .d", ".crow .n", ".crow .d",
  ".prow .pbtn .n", ".ptimes", ".pwhere", ".pcap", ".chart-sub", ".chart-where",
  ".focus-context", "#trouble-text",
  // The ring key's names, the echo line and the first-visit hint (DEC-055).
  ".kbtn .kn", ".ringecho", ".ringhint",
];
