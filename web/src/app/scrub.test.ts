/**
 * CHK gate for drag-to-scrub — angle inversion and midnight-crossing wrap,
 * the two places a drag control silently breaks.
 */
import { describe, expect, it } from "vitest";
import { hourToAngle, pointOnCircle } from "../ui/clockface";
import { beginDrag, DRAG_HUB, hitSun, moveDrag, pointToDialHours, shortestHourDelta, type DragState } from "./scrub";

describe("pointToDialHours inverts hourToAngle", () => {
  it.each([0, 3.5, 6, 12, 17.75, 23.9])("round-trips %s h", (h) => {
    const p = pointOnCircle(hourToAngle(h), 100);
    expect(pointToDialHours(p.x, p.y)).toBeCloseTo(h, 6);
  });
});

describe("shortestHourDelta wraps across midnight", () => {
  it("takes the short way forward over 00", () => {
    expect(shortestHourDelta(23.5, 0.5)).toBeCloseTo(1, 10);
  });
  it("takes the short way backward over 00", () => {
    expect(shortestHourDelta(0.5, 23.5)).toBeCloseTo(-1, 10);
  });
  it("is signed and small for nearby positions", () => {
    expect(shortestHourDelta(12, 12.25)).toBeCloseTo(0.25, 10);
    expect(shortestHourDelta(12.25, 12)).toBeCloseTo(-0.25, 10);
  });
});

/**
 * REQ-017: "it needs to be able to continue into the day after and before and
 * keep going." A drag is walked round the dial in small steps, as a finger
 * would, and the total must be the whole journey — not the journey modulo a day.
 */
describe("a drag adds up its turns (DEC-057)", () => {
  const R = 400;
  const RADIUS = R * 0.93;
  /** Walk the pointer from one dial hour to another in steps, like a finger. */
  const walk = (state: DragState, fromHours: number, toHours: number, stepHours = 0.5): DragState => {
    const steps = Math.ceil(Math.abs(toHours - fromHours) / stepHours);
    let s = state;
    for (let i = 1; i <= steps; i++) {
      const h = fromHours + ((toHours - fromHours) * i) / steps;
      const p = pointOnCircle(hourToAngle(h), RADIUS);
      s = moveDrag(s, p.x, p.y, R);
    }
    return s;
  };
  const press = (hours: number): DragState => {
    const p = pointOnCircle(hourToAngle(hours), RADIUS);
    return beginDrag(p.x, p.y);
  };

  it("begins at nothing travelled", () => {
    expect(press(19).totalHours).toBe(0);
    expect(press(19).lastHours).toBeCloseTo(19, 6);
  });

  it("carries two and a half turns forward into the third day: +60 hours", () => {
    const end = walk(press(19), 19, 19 + 60);
    expect(end.totalHours).toBeCloseTo(60, 6);
    // The pointer itself is back at 7 on the dial; only the sum knows the days.
    expect(end.lastHours).toBeCloseTo(7, 6);
  });

  it("carries three turns backward into the days before: −72 hours", () => {
    const end = walk(press(6), 6, 6 - 72);
    expect(end.totalHours).toBeCloseTo(-72, 6);
    expect(end.lastHours).toBeCloseTo(6, 6);
  });

  it("never wraps: the total grows through every 12 am it crosses, both ways", () => {
    let s = press(23);
    let previous = 0;
    // Forward through five midnights, sampled every half hour.
    for (let h = 23.5; h <= 23 + 120; h += 0.5) {
      s = walk(s, h - 0.5, h);
      expect(s.totalHours).toBeGreaterThan(previous);
      previous = s.totalHours;
    }
    expect(s.totalHours).toBeCloseTo(120, 6);
    // And all the way back, past where it began, into the days before.
    for (let h = 23 + 119.5; h >= 23 - 48; h -= 0.5) {
      s = walk(s, h + 0.5, h);
      expect(s.totalHours).toBeLessThan(previous);
      previous = s.totalHours;
    }
    expect(s.totalHours).toBeCloseTo(-48, 6);
  });

  it("is a sum of moves, so a turn out and a turn back is where it started", () => {
    const out = walk(press(12), 12, 36);
    expect(out.totalHours).toBeCloseTo(24, 6);
    expect(walk(out, 36, 12).totalHours).toBeCloseTo(0, 6);
  });

  it("adds up the same whether the finger moves in fine steps or coarse ones", () => {
    const fine = walk(press(3), 3, 3 + 60, 0.05).totalHours;
    const coarse = walk(press(3), 3, 3 + 60, 5).totalHours;
    expect(fine).toBeCloseTo(60, 6);
    expect(coarse).toBeCloseTo(60, 6);
  });

  it("ignores the hub, where a few pixels are twelve hours", () => {
    const start = walk(press(15), 15, 16);
    const inHub = moveDrag(start, R * DRAG_HUB * 0.5, 0, R);
    expect(inHub).toBe(start);
    // Coming out the far side is counted once, the short way from where it last stood.
    const p = pointOnCircle(hourToAngle(17), RADIUS);
    expect(moveDrag(inHub, p.x, p.y, R).totalHours).toBeCloseTo(2, 6);
  });
});

describe("hitSun", () => {
  const R = 400;
  it("hits at the sun's exact position and near it", () => {
    const rMid = (R * (0.985 + 0.875)) / 2;
    const p = pointOnCircle(hourToAngle(15), rMid);
    expect(hitSun(p.x, p.y, 15, R)).toBe(true);
    expect(hitSun(p.x + R * 0.05, p.y, 15, R)).toBe(true);
  });
  it("misses far from the sun", () => {
    const rMid = (R * (0.985 + 0.875)) / 2;
    const p = pointOnCircle(hourToAngle(3), rMid);
    expect(hitSun(p.x, p.y, 15, R)).toBe(false);
  });
});
