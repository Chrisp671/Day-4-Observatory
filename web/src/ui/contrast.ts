/**
 * Contrast arithmetic, and the backgrounds this page actually paints on.
 *
 * DEC-010 made the background a *function of time*: the field walks from
 * Prussian to a lifted daylight blue and back. Contrast is therefore a function
 * of time too, and a palette checked once at noon has checked almost nothing.
 * This module exists so that fact is executable rather than remembered — the
 * gate that uses it is `contrast.test.ts`, and the three colour-independent
 * encodings it locks in are named in the plan as DEC-049.
 *
 * **The background is not always the raw sky.** There are three, and which one
 * a mark sits on decides what it has to clear:
 *
 *  - the **raw sky** — the field. Canvas marks have no scrim: ticks, numerals,
 *    the sun, the moon, the rete.
 *  - the **masthead** — the field under the header's text-shadow (DEC-014:
 *    "text-shadow scrims so starlight never eats the letterforms"). The
 *    masthead's small gold and ink type depends on this; the shadow is a blur,
 *    so its composite is the *most favourable* reading of what it buys.
 *  - the **plinth** — the field under the plinth's and the focus panel's
 *    `::before` gradient ("the plinth stands on clean ground: the firmament
 *    fades out beneath it so type never competes with stars"). The gradient's
 *    *lighter* end is used, which is the worst case of its two.
 *
 * `deep` is deliberately absent: it is darker than `field` at every altitude,
 * and these are light marks on a dark ground, so `field` always binds.
 */
import { skyPalette } from "./sky";

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
export function relativeLuminance(color: string): number {
  const channel = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, 1..21, order-independent. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** `color` at `alpha` laid over `backdrop`, returned as `#rrggbb`. */
export function composite(color: string, alpha: number, backdrop: string): string {
  const channel = (offset: number): number =>
    alpha * parseInt(color.slice(offset, offset + 2), 16) +
    (1 - alpha) * parseInt(backdrop.slice(offset, offset + 2), 16);
  return `#${[1, 3, 5].map((o) => Math.round(channel(o)).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The scrims, as the numbers `index.html` actually ships, held as data so the
 * gate can tie them to the CSS in **both** directions: a token that only cleared
 * its floor because of a scrim is not a token that clears its floor, so the
 * stylesheet changing must fail the gate, and the model changing must fail it
 * too — otherwise the gate is simply measuring against a scrim the page does not
 * have. `contrast.test.ts` derives the expected literal from these numbers, which
 * is what makes both directions fail.
 */
export const SCRIM = {
  /** `text-shadow:0 1px 10px rgba(4,10,22,.8)` on the masthead's type. */
  masthead: { color: "#040A16", alpha: 0.8 },
  /** `linear-gradient(180deg, rgba(8,22,39,.82) 36px, rgba(8,22,39,.9) 100%)`. */
  plinth: { color: "#081627", alpha: 0.82 },
} as const;

/** The raw sky, as the page paints it: `Scene.light.field`, the CSS `--print-1`. */
export function skyAt(sunAltitudeDeg: number): string {
  return skyPalette(sunAltitudeDeg).field;
}

/** A canvas mark's background — no scrim anywhere in the instrument. */
export function skyBackground(sunAltitudeDeg: number): string {
  return skyAt(sunAltitudeDeg);
}

/** The masthead's background: the field under its text-shadow. */
export function mastheadBackground(sunAltitudeDeg: number): string {
  const s = SCRIM.masthead;
  return composite(s.color, s.alpha, skyAt(sunAltitudeDeg));
}

/** The plinth's and the focus panel's background: the field under the ::before gradient. */
export function plinthBackground(sunAltitudeDeg: number): string {
  const s = SCRIM.plinth;
  return composite(s.color, s.alpha, skyAt(sunAltitudeDeg));
}

/** The altitude range a v1 station can actually show, and the sweep's step. */
export const ALTITUDE_SWEEP = { from: -18, to: 90, step: 0.25 } as const;

/** The sweep's sample count, as an integer so the walk never accumulates error. */
export function sweepPoints(): number {
  return Math.round((ALTITUDE_SWEEP.to - ALTITUDE_SWEEP.from) / ALTITUDE_SWEEP.step) + 1;
}

export interface ContrastFloor {
  /** The lowest ratio seen across the sweep. */
  readonly worst: number;
  /** The solar altitude at which it was lowest. */
  readonly atAltitude: number;
}

/**
 * The worst contrast `color` reaches against `background` anywhere in the day.
 * Returns the altitude too, so a failure names the moment that caused it — a
 * ratio with no time attached is how "it looked fine" survives a palette change.
 *
 * Stepped by index rather than by repeated addition, so the walk reaches exactly
 * -18° and 90° and no altitude is visited twice by rounding.
 */
export function worstContrast(
  color: string,
  background: (sunAltitudeDeg: number) => string,
): ContrastFloor {
  let worst = Infinity;
  let atAltitude: number = ALTITUDE_SWEEP.from;
  const points = sweepPoints();
  for (let i = 0; i < points; i++) {
    const alt = ALTITUDE_SWEEP.from + i * ALTITUDE_SWEEP.step;
    const ratio = contrastRatio(color, background(alt));
    if (ratio < worst) {
      worst = ratio;
      atAltitude = alt;
    }
  }
  return { worst, atAltitude };
}