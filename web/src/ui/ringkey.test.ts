/**
 * The ring key's swatch (DEC-055): it is drawn as the ring is drawn, on the
 * same keel, at the same weight, so the legend cannot drift from the rete.
 */
import { describe, expect, it } from "vitest";
import { drawRingSwatch, SWATCH_H, SWATCH_W, swatchKey } from "./ringkey";
import { RING_STROKE } from "./planetarcs";
import type { SceneRing } from "../app/scene";

/** The painter's own source, read as planetarcs.test.ts reads its painter. */
const painterSource = import.meta.glob("./ringkey.ts", {
  eager: true,
  query: "?raw",
  import: "default",
})["./ringkey.ts"] as string;

const ring = (weight: SceneRing["weight"], peakHours: number | null = 12): SceneRing => ({
  name: "Saturn", color: "#C9A84C", radius: 1.308, riseHours: 19, setHours: 8, peakHours, weight,
});

/** A recording context: enough of CanvasRenderingContext2D to see what was drawn. */
function recorder() {
  const calls: string[] = [];
  const widths: number[] = [];
  const alphas: number[] = [];
  const styles: string[] = [];
  let alpha = 1;
  let width = 0;
  let style: unknown = "";
  const ctx = {
    canvas: {},
    set globalAlpha(v: number) { alpha = v; },
    get globalAlpha() { return alpha; },
    set lineWidth(v: number) { width = v; },
    get lineWidth() { return width; },
    set strokeStyle(v: unknown) { style = v; },
    get strokeStyle() { return style; },
    fillStyle: "" as unknown,
    lineCap: "butt",
    shadowColor: "",
    shadowBlur: 0,
    setTransform: () => calls.push("setTransform"),
    clearRect: () => calls.push("clearRect"),
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    arc: () => calls.push("arc"),
    stroke: () => { calls.push("stroke"); widths.push(width); alphas.push(alpha); styles.push(String(style)); },
    fill: () => calls.push("fill"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    closePath: () => calls.push("closePath"),
    setLineDash: () => calls.push("setLineDash"),
    createLinearGradient: () => ({ addColorStop: () => undefined }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, widths, alphas, styles };
}

describe("the swatch is a piece of the ring (DEC-055)", () => {
  it("derives its keel from RING_KEEL instead of repeating the colour", () => {
    expect(painterSource).not.toMatch(/rgba\(\s*4\s*,\s*10\s*,\s*22/);
    expect(painterSource).toMatch(/keelChannels\(RING_KEEL\.color\)/);
  });

  it("strokes the keel, then the colour at the ring's own weight, for every weight", () => {
    for (const weight of ["lit", "bright", "faint", "dim"] as const) {
      const r = recorder();
      drawRingSwatch(r.ctx, 2, ring(weight), "#C9A84C");
      // Two strokes: keel then colour; the colour at exactly the rete's width and alpha.
      expect(r.widths).toEqual([(RING_STROKE[weight].width + 1.6) * 2, RING_STROKE[weight].width * 2]);
      expect(r.alphas[0]).toBe(1);
      expect(r.alphas[1]).toBe(RING_STROKE[weight].alpha);
      expect(r.styles[1]).toBe("#C9A84C");
      expect(r.styles[0]).toMatch(/^rgba\(/);
    }
  });

  it("marks the peak with a diamond on its own keel, and omits it when the ring has none", () => {
    const withPeak = recorder();
    drawRingSwatch(withPeak.ctx, 1, ring("bright", 12), "#fff");
    expect(withPeak.calls.filter((c) => c === "fill").length).toBe(2);
    const without = recorder();
    drawRingSwatch(without.ctx, 1, ring("bright", null), "#fff");
    expect(without.calls.filter((c) => c === "fill").length).toBe(0);
  });

  it("draws a dotted stub, and no keel, for a planet with no ring today", () => {
    const r = recorder();
    drawRingSwatch(r.ctx, 1, null, "#9FA6B8");
    expect(r.calls).toContain("setLineDash");
    expect(r.widths).toEqual([1.4]);
    expect(r.styles).toEqual(["#9FA6B8"]);
    expect(r.calls.filter((c) => c === "fill").length).toBe(0);
  });

  it("clears the whole swatch before painting, and leaves the alpha at one", () => {
    const r = recorder();
    drawRingSwatch(r.ctx, 1, ring("dim"), "#fff");
    expect(r.calls[0]).toBe("setTransform");
    expect(r.calls[1]).toBe("clearRect");
    expect(r.ctx.globalAlpha).toBe(1);
  });
});

describe("swatchKey", () => {
  it("changes exactly when the picture would", () => {
    const a = swatchKey(ring("lit"), "#fff", 2);
    expect(swatchKey(ring("lit"), "#fff", 2)).toBe(a);
    expect(swatchKey(ring("dim"), "#fff", 2)).not.toBe(a);
    expect(swatchKey(ring("lit", null), "#fff", 2)).not.toBe(a);
    expect(swatchKey(ring("lit"), "#eee", 2)).not.toBe(a);
    expect(swatchKey(ring("lit"), "#fff", 1)).not.toBe(a);
    expect(swatchKey(null, "#fff", 2)).not.toBe(a);
    // The rise and set hours do not change the swatch, so they do not change the key.
    expect(swatchKey({ ...ring("lit"), riseHours: 1, setHours: 2 }, "#fff", 2)).toBe(a);
  });

  it("is a size a row can hold, and one the stylesheet names", () => {
    expect(SWATCH_W).toBe(30);
    expect(SWATCH_H).toBe(12);
  });
});
