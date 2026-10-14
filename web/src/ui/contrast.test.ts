/**
 * The contrast gate (WI-009, DEC-049). What was going to be a high-contrast
 * *mode* is a *measurement*, and this is it: three colour decisions that had
 * been prose in DESIGN-CONSOLIDATED are now assertions that fail.
 *
 * Why a gate and not a mode. DEC-014 already brightened every ink and added
 * scrims; DEC-009/010 built a palette that follows the light. Adding a fourth
 * palette that overrides the sky would contradict DEC-010's own rule ("the
 * light rules the palette") to solve a problem that measurement says is not
 * there. The gap was not the colours — it was that **nobody had measured
 * contrast as a function of time**, and the one ratio the design docs recorded
 * (10.2:1, at noon) said nothing about 6am.
 *
 * Falsifiable by construction: lighten the field, or dim an ink, and this fails.
 */
import { describe, expect, it } from "vitest";
import { tickAlpha, tickGeometry, tickRank } from "./dial";
import {
  ALTITUDE_SWEEP,
  SCRIM,
  contrastRatio,
  mastheadBackground,
  plinthBackground,
  skyBackground,
  skyAt,
  worstContrast,
  type ContrastFloor,
} from "./contrast";
import { skyPalette } from "./sky";
import { THEME } from "./theme";

/** WCAG 2.2 minimum for text, and for text under 18.66px bold / 24px. */
const AA_TEXT = 4.5;
/** WCAG 1.4.11 for graphics that carry information, and for focus rings. */
const AA_GRAPHIC = 3;

/** Float slack, well below anything the design would ever call a step. */
const F_EPSILON = 1e-9;

/**
 * The page's own stylesheet, as text. Loaded with `import.meta.glob` rather
 * than a plain `?raw` import: the review pipeline refuses to follow a relative
 * import carrying a query string, and halts the run as incomplete. The glob's
 * first argument must stay a literal — Vite rewrites it at build time.
 */
const indexHtml = import.meta.glob("../../index.html", {
  eager: true,
  query: "?raw",
  import: "default",
})["../../index.html"] as string;

/** Assert a measured floor and name the altitude that came closest, so a failure
 * says when it happened rather than only that it did. */
function expectAtLeast(measured: ContrastFloor, minimum: number, what: string): void {
  expect(
    measured.worst,
    `${what} falls to ${measured.worst.toFixed(2)}:1 at solar altitude ${measured.atAltitude}° (floor ${minimum}:1)`,
  ).toBeGreaterThanOrEqual(minimum);
}

/** How many text-shadow declarations the masthead carries today. */
const mastheadScrims = (): number => indexHtml.split("rgba(4,10,22,.8)").length - 1;

/** The CSS literal a scrim's alpha must appear as: `0.8` is written `.8`. */
const cssScrim = (rgb: string, alpha: number): string =>
  `rgba(${rgb},${String(alpha).replace(/^0\./, ".")})`;

describe("the scrims the contrast numbers are credited to", () => {
  it("are the ones index.html actually ships, not ones the gate invented", () => {
    // Both directions matter, and only one of them is the obvious one. Asserting
    // merely that the literal is *present* would let someone weaken `SCRIM`'s
    // alpha here and the gate would dutifully re-measure against a scrim that no
    // longer exists, and pass. Deriving the expected literal from the model's own
    // alpha ties the two together: change the CSS and this fails, change the
    // model and this fails.
    expect(indexHtml).toContain(cssScrim("4,10,22", SCRIM.masthead.alpha)); // masthead
    expect(indexHtml).toContain(cssScrim("8,22,39", SCRIM.plinth.alpha)); // plinth
  });

  it("are still on every masthead element that relies on one", () => {
    // The count is the contract, so removing the scrim from one element fails
    // rather than passing on the four that still have it — `.modes` is the one
    // that needs it most, being 9.5px `ink-mid` on the raw sky. Giving a NEW
    // element a scrim means bumping this number, which is the intended friction.
    expect(mastheadScrims()).toBe(5);
  });

  it("keep the masthead's small type off the raw sky, which is what earns it", () => {
    const raw = skyPalette(20).field;
    expect(contrastRatio(THEME.inkMid, mastheadBackground(20)))
      .toBeGreaterThan(contrastRatio(THEME.inkMid, raw));
    expect(contrastRatio(THEME.inkMid, plinthBackground(20)))
      .toBeGreaterThan(contrastRatio(THEME.inkMid, raw));
  });
});

describe("the raw sky, which has no scrim anywhere — the whole canvas", () => {
  it("keeps every ink that paints text or a large mark at AA for normal text", () => {
    // inkHi carries all body type, the rete's rings and the dial's band edge.
    // scripture is the masthead's warm ivory (DEC-014) and gold-soft the
    // citation gold. moonlight is a graphic — the moon disc and its up-arc —
    // and is held to the text floor rather than the graphic one because it
    // clears it anyway at 7.10:1, and one floor for all four is one less thing
    // to get wrong later.
    for (const [name, color] of [
      ["inkHi", THEME.inkHi],
      ["scripture", "#F3ECDA"],
      ["goldSoft", "#E7BE5A"],
      ["moonlight", THEME.moonlight],
    ] as const) {
      expectAtLeast(worstContrast(color, skyBackground), AA_TEXT, `${name} against the sky`);
    }
  });

  it("keeps inkMid above the graphic floor, and says which floor it is held to", () => {
    // The 24-hour ticks, the chart's figure lines, the graticule. Measured at
    // 4.07:1 — it clears 1.4.11's 3:1 and would not clear 4.5:1, so it is held
    // to the floor that matches the job rather than the one that matches the hope.
    expectAtLeast(worstContrast(THEME.inkMid, skyBackground), AA_GRAPHIC, "inkMid against the sky");
  });

  it("keeps the brand gold above the graphic floor, since the sun disc is gold", () => {
    expectAtLeast(worstContrast(THEME.sunlight, skyBackground), AA_GRAPHIC, "sunlight against the sky");
  });
});

describe("text on the scrims — the masthead and the plinth", () => {
  it("clears AA for every ink that paints type over the masthead's scrim", () => {
    for (const [name, color] of [
      ["inkHi", THEME.inkHi],
      ["inkMid", THEME.inkMid],
      ["goldSoft", "#E7BE5A"],
      ["sunlight", THEME.sunlight],
      ["scripture", "#F3ECDA"],
    ] as const) {
      expectAtLeast(worstContrast(color, mastheadBackground), AA_TEXT, `${name} on the masthead`);
    }
  });

  it("clears AA for every ink that paints type over the plinth's scrim", () => {
    // The plinth is where most of the small type lives: the bays, the rail, the
    // ledger, the planet rows, the constellation lists.
    for (const [name, color] of [
      ["inkHi", THEME.inkHi],
      ["inkMid", THEME.inkMid],
      ["goldSoft", "#E7BE5A"],
      ["sunlight", THEME.sunlight],
      ["scripture", "#F3ECDA"],
    ] as const) {
      expectAtLeast(worstContrast(color, plinthBackground), AA_TEXT, `${name} on the plinth`);
    }
  });
});

describe("inkLow is exempt from 3:1, and the exemption is paid for in geometry", () => {
  // Measured at 1.36:1 against the noon field — it fails 1.4.11 on its own. The
  // exemption is honest only if something else carries the information, so the
  // next two tests are the real assertion; this one records the number that
  // makes the exemption necessary, and fails if it is ever "fixed" by accident.
  it("is faint, and stays faint — so nobody can claim it clears 3:1", () => {
    const { worst } = worstContrast(THEME.inkLow, skyBackground);
    expect(worst).toBeLessThan(AA_GRAPHIC);
  });

  it("ranks the dial's ticks by length and weight, so the faint ink costs no read", () => {
    // DESIGN-CONSOLIDATED #4: "Rank by length and weight, not opacity." Three
    // ranks, and dial.ts claims "≥2:1 length steps" — which holds for every
    // adjacent pair, not just one.
    //
    // The contract is a FLOOR of 2:1, not an exact 2:1, and asserting an exact
    // ratio here would make this an implementation lock wearing a design guard's
    // clothes: the insets happen to halve, so the ratio is exactly 2 at any
    // radius, and anyone moving an inset for looks would trip a nine-digit
    // tolerance instead of a clear "the ranks are no longer far enough apart".
    // F_EPSILON is float noise, not slack in the design.
    const R = 340;
    const rOut = R * 0.985;
    const rIn = R * 0.875;
    const major = tickGeometry("major", rOut, rIn, R);
    const hourly = tickGeometry("hourly", rOut, rIn, R);
    const minor = tickGeometry("minor", rOut, rIn, R);

    expect(major.length).toBeGreaterThan(hourly.length);
    expect(hourly.length).toBeGreaterThan(minor.length);
    expect(minor.length).toBeGreaterThan(0);
    expect(major.length / hourly.length).toBeGreaterThanOrEqual(2 - F_EPSILON);
    expect(hourly.length / minor.length).toBeGreaterThanOrEqual(2 - F_EPSILON);
    expect(major.weight).toBeGreaterThan(hourly.weight);
    expect(hourly.weight).toBeGreaterThan(minor.weight);
    // The floor is necessary but NOT sufficient. A major that stopped flush with
    // the band's inner edge would measure exactly 2:1 and sail through, while
    // contradicting the reason it overshoots at all — that it spans the whole
    // band rather than ending where the band ends. So the span is its own claim.
    expect(major.length).toBeGreaterThan(rOut - rIn);
  });

  it("keeps the 2:1 floor at every dial size, not just the one it was checked at", () => {
    // The floor is a property of the design, so it has to hold across the range
    // the canvas fit actually produces, not at one hand-picked radius.
    for (const R of [180, 260, 340, 512, 900]) {
      const rOut = R * 0.985;
      const rIn = R * 0.875;
      const hourly = tickGeometry("hourly", rOut, rIn, R);
      const minor = tickGeometry("minor", rOut, rIn, R);
      expect(hourly.length / minor.length).toBeGreaterThanOrEqual(2 - F_EPSILON);
    }
  });

  it("makes the faintest rank the MOST opaque, so no rank is carried by tint", () => {
    // If the faintest ink were also the most transparent, rank would be a
    // luminance signal — which is exactly what DEC-009/010's palette cannot
    // afford, because the sky moves under it.
    expect(tickAlpha("minor")).toBe(1);
    expect(tickAlpha("minor")).toBeGreaterThanOrEqual(tickAlpha("major"));
    expect(tickAlpha("minor")).toBeGreaterThanOrEqual(tickAlpha("hourly"));
  });

  it("gives every one of the forty-eight ticks a rank that draws something", () => {
    // Not a shape check for its own sake: this is the assertion that a rank can
    // never escape the ladder. A tick whose rank resolved to nothing, or to a
    // zero-length or zero-weight stroke, would be invisible while still counting
    // as one of the 48.
    const R = 340;
    const rOut = R * 0.985;
    const rIn = R * 0.875;
    const ranks = Array.from({ length: 48 }, (_, i) => tickRank(i / 2));
    expect(ranks.filter((r) => r === "minor").length).toBe(24);
    for (const rank of ranks) {
      const geo = tickGeometry(rank, rOut, rIn, R);
      expect(geo.length).toBeGreaterThan(0);
      expect(geo.weight).toBeGreaterThan(0);
      expect(tickAlpha(rank)).toBeGreaterThan(0);
    }
  });
});

describe("the sweep itself", () => {
  it("covers astronomical night through high noon, which is the whole page", () => {
    expect(ALTITUDE_SWEEP.from).toBeLessThanOrEqual(-18);
    expect(ALTITUDE_SWEEP.to).toBeGreaterThanOrEqual(90);
    expect(skyAt(ALTITUDE_SWEEP.from)).toBe(skyPalette(-18).field);
    expect(skyAt(ALTITUDE_SWEEP.to)).toBe(skyPalette(20).field);
  });

  it("finds the worst case where the field stops moving", () => {
    // Recorded because it is counter-intuitive and it is why a noon-only check
    // is nearly a full check: the field plateaus at +20° and holds to +90°, so
    // the worst moment is also the common one for most of every daylight hour.
    // The sweep reaches the plateau at 19.75° too — `skyPalette` rounds to the
    // same `#rrggbb` — so the claim is about the field, not the sampled instant.
    const { atAltitude } = worstContrast(THEME.inkHi, skyBackground);
    expect(skyAt(atAltitude)).toBe(skyAt(20));
    expect(skyAt(20)).toBe(skyAt(90));
    // The first sample whose field has already rounded to the plateau, so the
    // reported instant is the top of the plateau and not the whole of it.
    expect(Math.abs(atAltitude - 20)).toBeLessThanOrEqual(ALTITUDE_SWEEP.step);
  });

  it("never reports a ratio below 1, and is order-independent", () => {
    const noon = skyAt(45);
    expect(contrastRatio(THEME.inkHi, noon)).toBeCloseTo(contrastRatio(noon, THEME.inkHi), 12);
    for (const color of [THEME.inkHi, THEME.inkMid, THEME.inkLow, THEME.moonlight]) {
      expect(contrastRatio(color, noon)).toBeGreaterThanOrEqual(1);
    }
  });
});