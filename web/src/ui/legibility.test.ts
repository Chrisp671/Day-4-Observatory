/**
 * The stylesheet half of the legibility gate (DEC-053). The browser half is
 * scripts/touch.mjs, which measures computed sizes, hit boxes and clipping at
 * 320, 360, 390, 430 and 820. This half is fast and fails by selector.
 *
 * Falsifiable by construction: a font-size under 11px anywhere in index.html,
 * a content size under 12px, an ellipsis, or the station fields' old
 * `outline:none` all fail here, each naming what it found.
 */
import { describe, expect, it } from "vitest";
import { CONTENT_FLOOR_PX, CONTENT_SELECTORS, TARGET_FLOOR_PX, TARGET_PX, TEXT_FLOOR_PX } from "./legibility";
import { NUMERAL_FLOOR_PX } from "./dial";
import { COMPASS_PX } from "./chart";

const indexHtml = import.meta.glob("../../index.html", {
  eager: true,
  query: "?raw",
  import: "default",
})["../../index.html"] as string;

/** The stylesheet only, without its comments: a comment may quote a size. */
const css = (): string => {
  const open = indexHtml.indexOf("<style>");
  const close = indexHtml.indexOf("</style>");
  return indexHtml.slice(open, close).replace(/\/\*[\s\S]*?\*\//g, "");
};

/** The smallest CSS px a `font-size` value can resolve to, or NaN when the
 * value is not in px at all (em, rem, %), which the gate does not allow: a
 * relative size is a size nobody can check against a floor. */
function minimumPx(value: string): number {
  const v = value.trim();
  const clamp = /^clamp\(\s*([\d.]+)px\s*,/.exec(v);
  if (clamp !== null) return parseFloat(clamp[1] as string);
  const px = /^([\d.]+)px$/.exec(v);
  return px === null ? NaN : parseFloat(px[1] as string);
}

/** Every `font-size` in the stylesheet with the selector it belongs to. */
function fontSizes(): { selector: string; value: string }[] {
  const out: { selector: string; value: string }[] = [];
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of css().matchAll(rule)) {
    const selector = (m[1] as string).trim().replace(/\s+/g, " ");
    for (const d of (m[2] as string).matchAll(/font-size\s*:\s*([^;]+)/g)) {
      out.push({ selector, value: (d[1] as string).trim() });
    }
  }
  return out;
}

describe("the floors themselves", () => {
  it("are the numbers DEC-053 records", () => {
    expect(TEXT_FLOOR_PX).toBe(11);
    expect(CONTENT_FLOOR_PX).toBe(12);
    expect(NUMERAL_FLOOR_PX).toBe(12);
    expect(COMPASS_PX).toBeGreaterThanOrEqual(CONTENT_FLOOR_PX);
    expect(TARGET_PX).toBe(44);
    expect(TARGET_FLOOR_PX).toBe(24);
  });
});

describe("every size in index.html (DEC-053)", () => {
  it("is in px, so the floor is checkable", () => {
    const relative = fontSizes().filter((f) => Number.isNaN(minimumPx(f.value)));
    expect(relative.map((f) => `${f.selector} → ${f.value}`)).toEqual([]);
  });

  it("is never under the text floor", () => {
    const small = fontSizes().filter((f) => minimumPx(f.value) < TEXT_FLOOR_PX);
    expect(small.map((f) => `${f.selector} → ${f.value}`)).toEqual([]);
    expect(fontSizes().length).toBeGreaterThan(40);
  });

  it("holds readouts and content to the content floor, by selector", () => {
    for (const selector of CONTENT_SELECTORS) {
      const sizes = fontSizes().filter((f) => f.selector === selector);
      expect(sizes.length, `${selector} declares no font-size`).toBeGreaterThan(0);
      for (const f of sizes) {
        expect(minimumPx(f.value), `${selector} → ${f.value}`).toBeGreaterThanOrEqual(CONTENT_FLOOR_PX);
      }
    }
  });
});

describe("nothing is cut off, and focus is visible (DEC-053)", () => {
  it("never truncates text with an ellipsis", () => {
    expect(css()).not.toMatch(/text-overflow\s*:\s*ellipsis/);
  });

  it("never removes an outline, so the page's gold focus ring reaches every control", () => {
    expect(css()).not.toMatch(/outline\s*:\s*none/);
    expect(css()).toMatch(/:focus-visible\s*\{\s*outline\s*:\s*2px solid/);
  });

  it("keeps the readouts free to wrap: no nowrap on a bay's lines", () => {
    for (const f of css().matchAll(/\.bay \.[vs]\s*\{([^}]*)\}/g)) {
      expect(f[1]).not.toMatch(/white-space\s*:\s*nowrap/);
    }
  });
});

describe("the page's structure for a reader (DEC-053)", () => {
  it("has one main landmark holding the stage and the three views", () => {
    const mains = indexHtml.match(/<main[\s>]/g) ?? [];
    expect(mains.length).toBe(1);
    const inside = indexHtml.slice(indexHtml.indexOf("<main"), indexHtml.indexOf("</main>"));
    for (const id of ["stage", "view-day4", "view-constellations", "view-planets", "focus-context"]) {
      expect(inside, `#${id} is outside <main>`).toContain(`id="${id}"`);
    }
  });

  it("has exactly one h1, and it is the seal", () => {
    const h1s = indexHtml.match(/<h1[\s>]/g) ?? [];
    expect(h1s.length).toBe(1);
    expect(indexHtml).toMatch(/<h1 class="brand">\s*<img/);
  });
});
