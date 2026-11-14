/**
 * The date-and-time field's dialect (DEC-057): what it should hold for an
 * instant, and what a string from it means. The edges are where a typed time
 * silently goes wrong — a half-typed year, a cleared field, a date the
 * calendar does not have, a phone's picker that sends no seconds.
 */
import { describe, expect, it } from "vitest";
import { ENTRY_MAX, ENTRY_MIN, parseEntry, toEntryValue } from "./timeentry";

const local = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number =>
  new Date(y, mo, d, h, mi, s).getTime();

describe("toEntryValue", () => {
  it("writes local wall-clock time to the second, zero-padded", () => {
    expect(toEntryValue(local(2026, 10, 14, 15, 10, 25))).toBe("2026-11-14T15:10:25");
    expect(toEntryValue(local(2027, 0, 3, 4, 5, 6))).toBe("2027-01-03T04:05:06");
  });

  it("writes midnight as 00:00:00, not 24 or 12", () => {
    expect(toEntryValue(local(2026, 10, 15))).toBe("2026-11-15T00:00:00");
  });

  it("drops the fraction of a second rather than rounding into the next one", () => {
    expect(toEntryValue(local(2026, 10, 14, 23, 59, 59) + 999)).toBe("2026-11-14T23:59:59");
  });

  it("is empty for a year the field cannot show", () => {
    expect(toEntryValue(local(999, 5, 1))).toBe("");
    expect(toEntryValue(Number.NaN)).toBe("");
  });
});

describe("parseEntry", () => {
  it("round-trips every instant to the second", () => {
    for (const t of [
      local(2026, 10, 14, 15, 10, 25),
      local(2026, 11, 31, 23, 59, 59),
      local(2028, 1, 29, 0, 0, 0),
      local(1987, 6, 4, 12, 0, 1),
    ]) {
      expect(parseEntry(toEntryValue(t))).toBe(t);
    }
  });

  it("reads a phone picker's value, which has no seconds, as the top of the minute", () => {
    expect(parseEntry("2026-12-24T21:00")).toBe(local(2026, 11, 24, 21, 0, 0));
  });

  it("accepts the fraction a browser may append and ignores it", () => {
    expect(parseEntry("2026-12-24T21:00:30.250")).toBe(local(2026, 11, 24, 21, 0, 30));
  });

  it("is local wall-clock time: the string carries no zone and gains none", () => {
    const t = parseEntry("2026-07-01T09:30:00") as number;
    const d = new Date(t);
    expect([d.getHours(), d.getMinutes(), d.getDate(), d.getMonth()]).toEqual([9, 30, 1, 6]);
  });

  it("is null for a cleared field and for anything that is not the field's dialect", () => {
    for (const bad of ["", "   ", "tomorrow", "2026-11-14", "15:10", "2026-11-14 15:10", "11/14/2026, 3:10 PM",
      "2026-11-14T15:10:25Z", "2026-11-14T15:10:25+05:00", "20261114T151025"]) {
      expect(parseEntry(bad), bad).toBeNull();
    }
  });

  it("is null for a year still being typed: 0002, 0020 and 0202 on the way to 2026", () => {
    for (const partial of ["0002-11-14T15:10", "0020-11-14T15:10", "0202-11-14T15:10"]) {
      expect(parseEntry(partial), partial).toBeNull();
    }
    expect(parseEntry("2026-11-14T15:10")).not.toBeNull();
  });

  it("is null for a date the calendar does not have, never the overflowed one", () => {
    expect(parseEntry("2026-02-30T12:00:00")).toBeNull();
    expect(parseEntry("2026-04-31T12:00:00")).toBeNull();
    expect(parseEntry("2026-13-01T12:00:00")).toBeNull();
    expect(parseEntry("2026-00-10T12:00:00")).toBeNull();
    expect(parseEntry("2027-02-29T12:00:00")).toBeNull();
    // A leap day that exists is a date.
    expect(parseEntry("2028-02-29T12:00:00")).toBe(local(2028, 1, 29, 12));
  });

  it("is null for a time of day the clock does not have", () => {
    expect(parseEntry("2026-11-14T24:00:00")).toBeNull();
    expect(parseEntry("2026-11-14T12:60:00")).toBeNull();
    expect(parseEntry("2026-11-14T12:00:60")).toBeNull();
  });

  it("accepts the bounds it advertises to the field, and nothing past them", () => {
    expect(parseEntry(ENTRY_MIN)).not.toBeNull();
    expect(parseEntry(ENTRY_MAX)).not.toBeNull();
    expect(parseEntry("0999-12-31T23:59:59")).toBeNull();
  });
});
