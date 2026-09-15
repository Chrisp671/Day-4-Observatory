/**
 * CHK-005 — the chart's geometry: stars land inside the square, north is
 * up, east is left, and the figure is not torn across RA 0h.
 */
import { describe, expect, it } from "vitest";
import { parseChart, type Chart } from "../app/charts";
import { chartProjection, starRadius } from "./chart";

const FILES = import.meta.glob("../../public/charts/*.json", { eager: true, import: "default" });
const load = (abbr: string): Chart => parseChart(FILES[`../../public/charts/${abbr}.json`]) as Chart;

describe("chartProjection", () => {
  it("keeps every star of every fitted chart inside the padded square", () => {
    for (const abbr of ["Ori", "UMa", "Hya", "Cru", "And", "Peg"]) {
      const chart = load(abbr);
      const proj = chartProjection(chart, 400, 30);
      for (const s of chart.stars) {
        const p = proj.project(s.raDeg, s.decDeg);
        expect(Math.abs(p.x), `${abbr} ${s.name}`).toBeLessThanOrEqual(170.01);
        expect(Math.abs(p.y), `${abbr} ${s.name}`).toBeLessThanOrEqual(170.01);
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
