/**
 * CHK gate for REQ-006 — the locale-parsing spec the legacy app never had.
 */
import { describe, expect, it } from "vitest";
import { parseCoordinate } from "./location";

describe("parseCoordinate", () => {
  it("parses plain decimals", () => {
    expect(parseCoordinate("40.7128", "lat")).toBeCloseTo(40.7128, 10);
    expect(parseCoordinate("-74.006", "lon")).toBeCloseTo(-74.006, 10);
  });
  it("accepts comma decimals (the legacy floatValue bug, fixed)", () => {
    expect(parseCoordinate("48,8566", "lat")).toBeCloseTo(48.8566, 10);
  });
  it("rejects garbage instead of returning 0", () => {
    expect(parseCoordinate("abc", "lat")).toBeNull();
    expect(parseCoordinate("", "lat")).toBeNull();
    expect(parseCoordinate("12.3.4", "lat")).toBeNull();
  });
  it("rejects out-of-range values instead of silently clamping", () => {
    expect(parseCoordinate("91", "lat")).toBeNull();
    expect(parseCoordinate("-90.001", "lat")).toBeNull();
    expect(parseCoordinate("181", "lon")).toBeNull();
  });
  it("accepts the poles and the antimeridian boundary", () => {
    expect(parseCoordinate("90", "lat")).toBe(90);
    expect(parseCoordinate("-180", "lon")).toBe(-180);
  });
});
