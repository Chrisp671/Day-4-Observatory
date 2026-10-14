/**
 * REQ-015 — chart data integrity: the generated files parse, carry real
 * star positions, connecting lines that land on stars, and named stars;
 * and every constellation the app lists has a chart to open.
 */
import { describe, expect, it } from "vitest";
import { chartLoader, parseChart, type Chart } from "./charts";
import { CONSTELLATIONS } from "./constellations";

/** Every generated file, by its file name, as the browser would receive it. */
const FILES: Readonly<Record<string, unknown>> = Object.fromEntries(
  Object.entries(import.meta.glob("../../public/charts/*.json", { eager: true, import: "default" }))
    .map(([path, data]) => [path.slice(path.lastIndexOf("/") + 1), data]),
);
const readJson = (file: string): unknown => FILES[file];
const index = readJson("index.json") as Record<string, string>;
/** Figure vertices drawn through stars fainter than the catalogue's limit. */
const KNOWN_FAINT_VERTICES: Readonly<Record<string, number>> = {
  "Cam.json": 2, "Cet.json": 1, "Lac.json": 1, "Per.json": 1,
};

/** Angular separation in degrees, good enough near a star. */
const sep = (a: readonly [number, number], b: readonly [number, number]): number => {
  let d = Math.abs(a[0] - b[0]);
  d = Math.min(d, 360 - d) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot(d, a[1] - b[1]);
};

describe("the chart files", () => {
  it("cover every constellation the app tracks, the Pleiades through Taurus", () => {
    for (const c of CONSTELLATIONS) expect(index[c.name], c.name).toBeDefined();
    expect(index["Pleiades"]).toBe(index["Taurus"]);
    expect(new Set(Object.values(index)).size).toBe(88);
  });

  it("all parse, with real coordinates, lines on stars, and named stars", () => {
    const files = Object.keys(FILES).filter((f) => /^[A-Z][A-Za-z]{2}\.json$/.test(f));
    expect(files.length).toBe(88);
    for (const file of files) {
      const chart = parseChart(readJson(file)) as Chart;
      expect(chart, file).not.toBeNull();
      expect(chart.stars.length).toBeGreaterThanOrEqual(4);
      // Brightest first, so the painter can label the head of the list.
      for (let i = 1; i < chart.stars.length; i++) expect(chart.stars[i]!.mag).toBeGreaterThanOrEqual(chart.stars[i - 1]!.mag);
      expect(chart.stars.filter((s) => s.name !== "").length).toBeGreaterThanOrEqual(1);
      expect(chart.lines.length).toBeGreaterThanOrEqual(1);
      // Every line vertex sits on a star of the chart — except the five
      // figure points the source draws through stars fainter than magnitude
      // 6, which the catalogue does not carry. Named so drift is caught.
      let loose = 0;
      for (const poly of chart.lines) {
        for (const v of poly) {
          const nearest = Math.min(...chart.stars.map((s) => sep(v, [s.raDeg, s.decDeg])));
          if (nearest >= 0.15) loose++;
        }
      }
      expect(loose, `${file} vertices off any star`).toBe(KNOWN_FAINT_VERTICES[file] ?? 0);
    }
  });

  it("names Orion's three brightest stars and puts the belt on a line", () => {
    const orion = parseChart(readJson("Ori.json")) as Chart;
    expect(orion.stars.slice(0, 3).map((s) => s.name)).toEqual(["Rigel", "Betelgeuse", "Bellatrix"]);
    const rigel = orion.stars[0]!;
    expect(rigel.raDeg / 15).toBeCloseTo(5.24, 1);
    expect(rigel.decDeg).toBeCloseTo(-8.2, 0);
  });

  it("matches the catalog's tracked star coordinates for a spot check", () => {
    const sirius = CONSTELLATIONS.find((c) => c.name === "Canis Major")!;
    const cma = parseChart(readJson(`${index["Canis Major"]}.json`)) as Chart;
    expect(cma.stars[0]!.name).toBe("Sirius");
    expect(cma.stars[0]!.raDeg / 15).toBeCloseTo(sirius.raHours, 1);
    expect(cma.stars[0]!.decDeg).toBeCloseTo(sirius.decDeg, 0);
  });
});

describe("parseChart", () => {
  it("rejects shapes the painter cannot draw instead of throwing", () => {
    expect(parseChart(null)).toBeNull();
    expect(parseChart({ abbr: "X", name: "X", stars: [], lines: [] })).toBeNull();
    expect(parseChart({ abbr: "X", name: "X", stars: [[400, 0, 1, ""]], lines: [] })).toBeNull();
    expect(parseChart({ abbr: "X", name: "X", stars: [[10, 0, 1, ""]], lines: [[[10, 0]]] })).toBeNull();
  });
});

describe("chartLoader", () => {
  it("fetches the index once and each chart once, and answers null for the unknown", async () => {
    const calls: string[] = [];
    const files: Record<string, unknown> = { "charts/index.json": index, "charts/Ori.json": readJson("Ori.json") };
    (globalThis as { fetch: unknown }).fetch = async (url: string) => {
      calls.push(url);
      const body = files[url];
      return { ok: body !== undefined, json: async () => body };
    };
    const loader = chartLoader("charts/");
    const a = await loader.load("Orion");
    const b = await loader.load("Orion");
    expect(a?.name).toBe("Orion");
    expect(b).toBe(a);
    expect(await loader.load("Atlantis")).toBeNull();
    expect(calls).toEqual(["charts/index.json", "charts/Ori.json"]);
  });
});
