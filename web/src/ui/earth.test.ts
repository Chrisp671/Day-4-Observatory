/**
 * CHK-002 — the graticule is a true orthographic projection, not a drawing
 * that merely looks like one (DESIGN-CONSOLIDATED #7).
 *
 * A parallel of latitude φ, seen orthographically, is a straight chord at
 * y = r·sin(φ) reaching x = ±r·cos(φ). So the two halves of that statement are
 * one identity: the chord's ends must land exactly on the limb. A graticule that
 * gets this wrong is the common failure — a chord drawn to the disc's width at
 * the tropic's height, or a tropic placed at the right height but clipped wrong —
 * and it is invisible until you measure it.
 */
import { describe, expect, it } from "vitest";
import { TROPIC_LAT_DEG, meridianHalfWidth, tropicChord } from "./earth";

const R = 1;

describe("tropicChord", () => {
  it("puts the tropic at r·sin(23.44°) above and below the equator", () => {
    const expected = R * Math.sin((TROPIC_LAT_DEG * Math.PI) / 180);
    expect(tropicChord(R).y).toBeCloseTo(expected, 12);
    expect(tropicChord(R, true).y).toBeCloseTo(-expected, 12);
  });

  it("reaches r·cos(23.44°) each way, so the chord is shorter than the equator", () => {
    const expected = R * Math.cos((TROPIC_LAT_DEG * Math.PI) / 180);
    expect(tropicChord(R).halfChord).toBeCloseTo(expected, 12);
    expect(tropicChord(R).halfChord).toBeLessThan(R);
  });

  it("ends on the limb — y² + x² = r², the test an airbrushed graticule fails", () => {
    for (const r of [0.1, 0.25, 0.5, 1, 3.7, 120]) {
      for (const south of [false, true]) {
        const { y, halfChord } = tropicChord(r, south);
        expect(y * y + halfChord * halfChord).toBeCloseTo(r * r, 9);
      }
    }
  });

  it("is symmetric about the equator: two chords, equal length, opposite sides", () => {
    const north = tropicChord(R);
    const south = tropicChord(R, true);
    expect(north.halfChord).toBeCloseTo(south.halfChord, 12);
    expect(north.y).toBeCloseTo(-south.y, 12);
  });
});

describe("meridianHalfWidth", () => {
  it("is r·sin(λ), so 30° is half the disc and 60° is √3/2 of it", () => {
    expect(meridianHalfWidth(R, 30)).toBeCloseTo(0.5, 12);
    expect(meridianHalfWidth(R, 60)).toBeCloseTo(Math.sqrt(3) / 2, 12);
  });

  it("widens with longitude, and never past the limb", () => {
    let previous = 0;
    for (const lon of [15, 30, 45, 60, 75]) {
      const width = meridianHalfWidth(R, lon);
      expect(width).toBeGreaterThan(previous);
      expect(width).toBeLessThanOrEqual(R);
      previous = width;
    }
  });

  it("is a half-width: the meridian's full width is twice it", () => {
    // The draw call passes this straight to ellipse(), where it is radiusX — the
    // drawing treats east and west of one meridian as a single ellipse.
    expect(meridianHalfWidth(R, 60) * 2).toBeCloseTo(Math.sqrt(3), 12);
  });
});
