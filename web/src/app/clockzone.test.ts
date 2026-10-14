import { describe, expect, it } from "vitest";
import {
  deviceOffsetHours,
  deviceZoneLabel,
  mismatchPhrase,
  nominalOffsetHours,
  zoneReport,
} from "./clockzone";

const NOW = Date.UTC(2026, 7, 19, 2, 21, 0); // 2026-08-19 02:21 UTC

describe("nominalOffsetHours", () => {
  it("gives one hour per 15 degrees, east positive", () => {
    expect(nominalOffsetHours(0)).toBe(0);
    expect(nominalOffsetHours(15)).toBe(1);
    expect(nominalOffsetHours(-74)).toBe(-5); // New York's longitude
    expect(nominalOffsetHours(151.2)).toBe(10); // Sydney
  });

  it("rounds to the nearer zone at a boundary", () => {
    expect(nominalOffsetHours(7.4)).toBe(0);
    expect(nominalOffsetHours(7.6)).toBe(1);
  });
});

describe("deviceZoneLabel", () => {
  it("names a zone it is given", () => {
    expect(deviceZoneLabel(NOW, "en-US", "UTC")).toBe("UTC");
    // Chicago in August keeps daylight time.
    expect(deviceZoneLabel(NOW, "en-US", "America/Chicago")).toBe("CDT");
    expect(deviceZoneLabel(NOW, "en-US", "America/New_York")).toBe("EDT");
  });

  it("always returns something to print", () => {
    expect(deviceZoneLabel(NOW).length).toBeGreaterThan(0);
  });
});

describe("deviceOffsetHours", () => {
  it("agrees with the runtime's own idea of its offset", () => {
    expect(deviceOffsetHours(NOW)).toBe(-new Date(NOW).getTimezoneOffset() / 60);
  });
});

describe("zoneReport", () => {
  it("flags no mismatch when the station shares the device's clock", () => {
    // Build a station longitude that matches whatever zone the test host keeps.
    const lon = deviceOffsetHours(NOW) * 15;
    const r = zoneReport(NOW, lon);
    expect(r.mismatched).toBe(false);
    expect(Math.abs(r.offsetDeltaHours)).toBeLessThan(1.5);
  });

  it("flags a mismatch when the station is hours away", () => {
    const farEast = (deviceOffsetHours(NOW) + 6) * 15;
    const r = zoneReport(NOW, farEast);
    expect(r.mismatched).toBe(true);
    expect(r.offsetDeltaHours).toBeCloseTo(-6, 6);
  });

  it("always names the clock the readouts are in", () => {
    expect(zoneReport(NOW, -74).label.length).toBeGreaterThan(0);
  });

  it("treats a one-hour difference as near enough — zones are not tidy", () => {
    const oneOver = (deviceOffsetHours(NOW) + 1) * 15;
    expect(zoneReport(NOW, oneOver).mismatched).toBe(false);
  });
});

describe("mismatchPhrase", () => {
  it("says which way the device clock runs", () => {
    expect(mismatchPhrase(-6)).toBe("6h behind the station");
    expect(mismatchPhrase(3)).toBe("3h ahead of the station");
  });
});
