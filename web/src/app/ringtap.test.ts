/**
 * The ring tap (DEC-055): the second dial gesture, pinned where a hit test
 * silently breaks — the midnight-crossing sweep, the gap between two rings,
 * and the sun, which must always win.
 */
import { describe, expect, it } from "vitest";
import { FACE, hourToAngle, pointOnCircle, RING_ORDER, ringFraction } from "../ui/clockface";
import { hitSun } from "./scrub";
import { isTap, RING_REACH, ringAt, ringCovers, TAP_SLOP_PX } from "./ringtap";
import type { SceneRing } from "./scene";

const ring = (name: string, riseHours: number, setHours: number): SceneRing => ({
  name, color: "#fff", radius: ringFraction(name), riseHours, setHours, peakHours: null, weight: "bright",
});
// Saturn up across midnight (19:52 → 08:16), Mars by day (00:45 → 15:40).
const RETE: readonly SceneRing[] = [ring("Mars", 0.75, 15.67), ring("Saturn", 19.87, 8.27)];
const R = 100;
const at = (hours: number, radius: number) => pointOnCircle(hourToAngle(hours), radius * R);

describe("ringCovers", () => {
  it("covers the hours between rise and set inside one day", () => {
    const mars = ring("Mars", 0.75, 15.67);
    expect(ringCovers(mars, 8)).toBe(true);
    expect(ringCovers(mars, 0.75)).toBe(true);
    expect(ringCovers(mars, 15.67)).toBe(true);
    expect(ringCovers(mars, 20)).toBe(false);
    expect(ringCovers(mars, 0.5)).toBe(false);
  });

  it("covers a sweep that crosses midnight the long way round, not the short", () => {
    const saturn = ring("Saturn", 19.87, 8.27);
    expect(ringCovers(saturn, 23.5)).toBe(true);
    expect(ringCovers(saturn, 0.1)).toBe(true);
    expect(ringCovers(saturn, 6)).toBe(true);
    expect(ringCovers(saturn, 12)).toBe(false);
    expect(ringCovers(saturn, 19)).toBe(false);
  });
});

describe("ringAt", () => {
  it("finds the ring under a tap on its own sweep, including across midnight", () => {
    const p = at(22, ringFraction("Saturn"));
    expect(ringAt(p.x, p.y, R, RETE)).toBe("Saturn");
    const q = at(2, ringFraction("Saturn"));
    expect(ringAt(q.x, q.y, R, RETE)).toBe("Saturn");
    const m = at(10, ringFraction("Mars"));
    expect(ringAt(m.x, m.y, R, RETE)).toBe("Mars");
  });

  it("ignores a ring whose sweep does not cover the tapped hour", () => {
    // Jupiter's radius lies between the two. At 22:00 Mars is not up, so the
    // tap falls to Saturn; at 12:00 Saturn is not up, so it falls to Mars.
    const p = at(22, ringFraction("Jupiter"));
    expect(ringAt(p.x, p.y, R, RETE)).toBe("Saturn");
    const q = at(12, ringFraction("Jupiter"));
    expect(ringAt(q.x, q.y, R, RETE)).toBe("Mars");
    // On Saturn's own radius at an hour Saturn is down, Mars is two steps
    // away — beyond reach — so the tap lands on nothing.
    const s = at(12, ringFraction("Saturn"));
    expect(ringAt(s.x, s.y, R, RETE)).toBeNull();
  });

  it("misses the band, the gap before the first ring, and the open sky beyond the last", () => {
    const band = at(22, 0.93);
    expect(ringAt(band.x, band.y, R, RETE)).toBeNull();
    const gap = at(22, FACE.ringBase - RING_REACH - 0.001);
    expect(ringAt(gap.x, gap.y, R, RETE)).toBeNull();
    const sky = at(22, ringFraction("Saturn") + RING_REACH + 0.001);
    expect(ringAt(sky.x, sky.y, R, RETE)).toBeNull();
    expect(ringAt(10, 10, 0, RETE)).toBeNull();
    expect(ringAt(10, 10, R, [])).toBeNull();
  });

  it("chooses the nearer of two rings that both cover the hour", () => {
    const both = [ring("Jupiter", 3, 17), ring("Saturn", 3, 17)];
    const nearJ = at(10, ringFraction("Jupiter") + 0.01);
    const nearS = at(10, ringFraction("Saturn") - 0.01);
    expect(ringAt(nearJ.x, nearJ.y, R, both)).toBe("Jupiter");
    expect(ringAt(nearS.x, nearS.y, R, both)).toBe("Saturn");
    // Exactly between two neighbours is still a hit — one of them, never neither.
    const mid = at(10, (ringFraction("Jupiter") + ringFraction("Saturn")) / 2);
    expect(["Jupiter", "Saturn"]).toContain(ringAt(mid.x, mid.y, R, both));
  });

  it("gives every ring the half-step either side of it, and the outer rings a full reach beyond", () => {
    // Rings are one step apart, so between neighbours the midpoint divides
    // them; the reach (1.5 steps) matters only inside Mercury and outside
    // Saturn, where there is no neighbour to lose to.
    const all = RING_ORDER.map((n) => ring(n, 1, 23));
    const half = FACE.ringStep / 2 - 0.001;
    for (const name of RING_ORDER) {
      const r = ringFraction(name);
      for (const off of [-half, 0, half]) {
        const p = at(12, r + off);
        expect(ringAt(p.x, p.y, R, all), `${name} at ${off.toFixed(3)}R off`).toBe(name);
      }
    }
    const inner = at(12, ringFraction("Mercury") - RING_REACH + 0.001);
    expect(ringAt(inner.x, inner.y, R, all)).toBe("Mercury");
    const outer = at(12, ringFraction("Saturn") + RING_REACH - 0.001);
    expect(ringAt(outer.x, outer.y, R, all)).toBe("Saturn");
    expect(RING_REACH).toBeGreaterThan(FACE.ringStep);
  });

  it("never lands on the sun: the sun's grab circle and the first ring's reach do not meet", () => {
    // hitSun grabs within 0.075R of the band's middle (0.93R), so its furthest
    // reach is 1.005R; the first ring's reach begins at ringBase - RING_REACH.
    const sunReach = (FACE.dialOuter + FACE.dialInner) / 2 + 0.075;
    expect(sunReach).toBeLessThan(FACE.ringBase - RING_REACH);
    // And in practice: a point on the sun disc at an hour Mercury covers.
    const sunHours = 14;
    const all = RING_ORDER.map((n) => ring(n, 1, 23));
    const rMid = (R * (FACE.dialOuter + FACE.dialInner)) / 2;
    const p = pointOnCircle(hourToAngle(sunHours), rMid);
    expect(hitSun(p.x, p.y, sunHours, R)).toBe(true);
    expect(ringAt(p.x, p.y, R, all)).toBeNull();
    // The sun's outer grab edge, likewise.
    const edge = pointOnCircle(hourToAngle(sunHours), rMid + R * 0.074);
    expect(hitSun(edge.x, edge.y, sunHours, R)).toBe(true);
    expect(ringAt(edge.x, edge.y, R, all)).toBeNull();
  });
});

describe("isTap", () => {
  it("is a tap within the slop, scaled by the pixel ratio, and a drag beyond it", () => {
    expect(isTap(0, 0, 1)).toBe(true);
    expect(isTap(TAP_SLOP_PX, 0, 1)).toBe(true);
    expect(isTap(TAP_SLOP_PX + 0.5, 0, 1)).toBe(false);
    expect(isTap(TAP_SLOP_PX * 2, 0, 2)).toBe(true);
    expect(isTap(TAP_SLOP_PX * 2 + 1, 0, 2)).toBe(false);
    expect(isTap(TAP_SLOP_PX, TAP_SLOP_PX, 1)).toBe(false);
  });
});
