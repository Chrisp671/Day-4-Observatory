import { describe, expect, it } from "vitest";
import { fmt12, fmt12c, fmt12s } from "./clock12";

const at = (h: number, m: number, s = 0): number =>
  new Date(2026, 7, 22, h, m, s).getTime();

describe("fmt12", () => {
  it("reads the afternoon like a person", () => {
    expect(fmt12(at(21, 7))).toBe("9:07 pm");
    expect(fmt12(at(13, 0))).toBe("1:00 pm");
  });

  it("keeps midnight and noon at twelve, on the right side of the day", () => {
    expect(fmt12(at(0, 0))).toBe("12:00 am");
    expect(fmt12(at(0, 30))).toBe("12:30 am");
    expect(fmt12(at(12, 0))).toBe("12:00 pm");
    expect(fmt12(at(12, 30))).toBe("12:30 pm");
  });

  it("never shows a zero hour", () => {
    for (let h = 0; h < 24; h++) {
      expect(fmt12(at(h, 15))).not.toMatch(/^0:/);
    }
  });
});

describe("fmt12c", () => {
  it("compacts without losing the half of the day", () => {
    expect(fmt12c(at(15, 37))).toBe("3:37p");
    expect(fmt12c(at(0, 23))).toBe("12:23a");
  });
});

describe("fmt12s", () => {
  it("carries seconds for the corner clock", () => {
    expect(fmt12s(at(17, 8, 29))).toBe("5:08:29 pm");
  });
});
