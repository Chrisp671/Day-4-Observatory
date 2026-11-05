/**
 * CHK-005 — the chart's geometry: stars land inside the disc, north is up,
 * east is left, and the figure is not torn across RA 0h; and DEC-056's disc:
 * its night is sky.ts's night, its names are plain words seated inside the
 * rim, clear of each other and of the compass letters.
 */
import { describe, expect, it } from "vitest";
import { parseChart, type Chart } from "../app/charts";
import {
  CHART_NIGHT, chartDisc, chartProjection, compassMarks, COMPASS_PX, DISC_INSET, FIELD_INSET,
  LABEL_GAP, LABEL_H, LABEL_PX, layoutChart, placeLabels, starRadius, type ChartBox,
} from "./chart";
import { skyPalette } from "./sky";

const FILES = import.meta.glob("../../public/charts/*.json", { eager: true, import: "default" });
const load = (abbr: string): Chart => parseChart(FILES[`../../public/charts/${abbr}.json`]) as Chart;
const ALL: readonly Chart[] = Object.entries(FILES)
  .filter(([path]) => !path.endsWith("/index.json"))
  .map(([, raw]) => parseChart(raw) as Chart);

/** The painter's own source, read the same way planetarcs.test.ts reads its painter. */
const painterSource = import.meta.glob("./chart.ts", {
  eager: true,
  query: "?raw",
  import: "default",
})["./chart.ts"] as string;

/** The chart's CSS size at the four viewports the drivers hold, and the print size. */
const SIZES = [288, 358, 410, 416, 580];
/** A stand-in for measureText: a 13 px italic serif averages about 7 px a glyph;
 * the wide one is a pessimistic font, so the seating cannot depend on Fraunces. */
const MEASURES: readonly [string, (text: string) => number][] = [
  ["7 px a glyph", (t) => t.length * 7],
  ["9 px a glyph", (t) => t.length * 9],
];

const corners = (b: ChartBox): readonly [number, number][] =>
  [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]];
const overlap = (a: ChartBox, b: ChartBox): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe("chartProjection", () => {
  it("keeps every star of every chart inside the padded circle", () => {
    for (const chart of ALL) {
      const proj = chartProjection(chart, 400, 30);
      for (const s of chart.stars) {
        const p = proj.project(s.raDeg, s.decDeg);
        expect(Math.hypot(p.x, p.y), `${chart.abbr} ${s.name}`).toBeLessThanOrEqual(170.01);
      }
    }
  });

  it("puts north up and east to the left, as a sky chart does", () => {
    const orion = load("Ori");
    const proj = chartProjection(orion, 400, 30);
    const centre = proj.project(proj.ra0, proj.dec0);
    const north = proj.project(proj.ra0, proj.dec0 + 5);
    const east = proj.project(proj.ra0 + 5, proj.dec0);
    expect(north.y).toBeLessThan(centre.y);
    expect(east.x).toBeLessThan(centre.x);
  });

  it("centres a figure that straddles RA 0h instead of tearing it", () => {
    // Andromeda and Pegasus both cross 0h: their centres must sit near 0h/24h, not at 12h.
    for (const abbr of ["And", "Peg"]) {
      const proj = chartProjection(load(abbr), 400, 30);
      expect(Math.min(proj.ra0, 360 - proj.ra0)).toBeLessThan(30);
    }
  });

  it("sizes stars by brightness, brightest largest, never vanishing", () => {
    expect(starRadius(0)).toBeGreaterThan(starRadius(2));
    expect(starRadius(2)).toBeGreaterThan(starRadius(5));
    expect(starRadius(6.5)).toBeGreaterThanOrEqual(1.1);
  });
});

describe("the night disc (DEC-056)", () => {
  it("is the living sky's own astronomical night, read from sky.ts", () => {
    const night = skyPalette(-18);
    expect(CHART_NIGHT.field).toBe(night.field);
    expect(CHART_NIGHT.deep).toBe(night.deep);
    // The darkest stop, where the page's stars are at full strength.
    expect(night.starAlpha).toBe(1);
    expect(skyPalette(-90)).toEqual(night);
  });

  it("repeats neither colour as a literal, so a changed night cannot leave the disc behind", () => {
    const night = skyPalette(-18);
    for (const hex of [night.field, night.deep]) {
      expect(painterSource.toLowerCase()).not.toContain(hex.toLowerCase());
      const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",\\s*");
      expect(painterSource).not.toMatch(new RegExp(rgb));
    }
  });

  it("fills the square to within the feather, and feathers inside the canvas", () => {
    for (const size of SIZES) {
      const disc = chartDisc(size);
      expect(disc.radius).toBe(size / 2 - DISC_INSET);
      expect(disc.radius + disc.feather).toBeLessThan(size / 2);
      expect(disc.feather).toBeGreaterThan(0);
    }
  });

  it("keeps every star of every chart inside the field, clear of the rim and the letters", () => {
    for (const chart of ALL) {
      const { disc, projection } = layoutChart(chart, 358, (t) => t.length * 7);
      for (const s of chart.stars) {
        const p = projection.project(s.raDeg, s.decDeg);
        expect(Math.hypot(p.x, p.y) + starRadius(s.mag), `${chart.abbr} ${s.name}`)
          .toBeLessThanOrEqual(disc.radius - FIELD_INSET + 5);
      }
    }
  });
});

describe("the compass letters (DEC-053, DEC-056)", () => {
  it("are set at the content floor, where a 60-year-old can orient the chart", () => {
    // constellations.mjs holds the drawn size in the browser; this holds the
    // number the painter asks for.
    expect(COMPASS_PX).toBeGreaterThanOrEqual(12);
    expect(LABEL_PX).toBeGreaterThanOrEqual(12);
    expect(LABEL_H).toBeGreaterThanOrEqual(LABEL_PX);
  });

  it("stand inside the rim in the field's margin: north up, east left, west right", () => {
    for (const size of SIZES) {
      const disc = chartDisc(size);
      const marks = compassMarks(disc);
      expect(marks.map((m) => m.letter)).toEqual(["N", "E", "W"]);
      const [n, e, w] = marks as [typeof marks[0], typeof marks[0], typeof marks[0]];
      expect(n.cy).toBeLessThan(0);
      expect(e.cx).toBeLessThan(0);
      expect(w.cx).toBeGreaterThan(0);
      for (const m of marks) {
        for (const [x, y] of corners(m)) expect(Math.hypot(x, y), `${m.letter} at ${size}`).toBeLessThan(disc.radius);
        // In the margin the star field leaves, not over it.
        expect(Math.hypot(m.cx, m.cy)).toBeGreaterThan(disc.radius - FIELD_INSET);
      }
    }
  });
});

describe("placeLabels (DEC-056): names inside the disc, never on each other or a letter", () => {
  for (const [how, measure] of MEASURES) {
    it(`seats every name of every chart at every size, measured at ${how}`, () => {
      for (const chart of ALL) {
        for (const size of SIZES) {
          const { disc, compass, labels } = layoutChart(chart, size, measure);
          const named = chart.stars.filter((s) => s.name !== "");
          expect(labels.length, chart.abbr).toBe(named.length);
          for (const l of labels) {
            const where = `${chart.abbr} "${l.text}" at ${size} (${how})`;
            expect(l.w, where).toBe(measure(l.text));
            for (const [x, y] of corners(l)) {
              expect(Math.hypot(x, y), where).toBeLessThanOrEqual(disc.radius - LABEL_GAP + 0.01);
            }
            for (const m of compass) expect(overlap(l, m), `${where} runs into ${m.letter}`).toBe(false);
          }
          for (let i = 0; i < labels.length; i++) {
            for (let j = i + 1; j < labels.length; j++) {
              const a = labels[i] as ChartBox & { text: string };
              const b = labels[j] as ChartBox & { text: string };
              expect(overlap(a, b), `${chart.abbr} "${a.text}" over "${b.text}" at ${size} (${how})`).toBe(false);
            }
          }
        }
      }
    });
  }

  it("prefers the seat to the right of the star, and falls to the left near the rim", () => {
    const disc = chartDisc(358);
    const measure = (t: string): number => t.length * 7;
    const [inner] = placeLabels([{ text: "Altair", star: { x: 0, y: 0 }, r: 4 }], disc, [], measure);
    expect(inner?.tx).toBeGreaterThan(0);
    expect(inner?.ty).toBeCloseTo(0, 5);
    const [edge] = placeLabels([{ text: "Altair", star: { x: disc.radius - 30, y: 0 }, r: 4 }], disc, [], measure);
    expect((edge?.tx ?? 0) + (edge?.w ?? 0)).toBeLessThan(disc.radius - 30);
  });

  it("moves a name off a compass letter rather than through it", () => {
    const disc = chartDisc(358);
    const w = compassMarks(disc).find((m) => m.letter === "W") as ChartBox;
    // A star whose name, set to its right as offered, would end 4 px into
    // the W while still fitting inside the rim: only the keep-out moves it.
    const width = 50;
    const star = { x: w.x + 4 - width - 6 - 2, y: 0 };
    const offered = { x: star.x + 2 + 6, y: -LABEL_H / 2, w: width, h: LABEL_H };
    expect(overlap(offered, w)).toBe(true);
    for (const [x, y] of corners(offered)) expect(Math.hypot(x, y)).toBeLessThanOrEqual(disc.radius - LABEL_GAP);
    const [label] = placeLabels([{ text: "Zeta Scuti", star, r: 2 }], disc, compassMarks(disc), () => width);
    expect(label).toBeDefined();
    expect(overlap(label as ChartBox, w)).toBe(false);
  });

  it("sets the names in plain words", () => {
    const { labels } = layoutChart(load("Sct"), 358, (t) => t.length * 7);
    expect(labels.map((l) => l.text).sort()).toEqual(["Alpha Scuti", "Beta Scuti", "Zeta Scuti"]);
  });
});
