import { describe, expect, it } from "vitest";
import { GLYPH_WORDS, lineParts, partsText, SEPARATOR, tokenize } from "./glyphs";

describe("tokenize — a word for every glyph (DEC-053)", () => {
  it("marks each glyph with its spoken word and keeps the text around it", () => {
    expect(tokenize("↑6:24 am")).toEqual([
      { kind: "glyph", text: "↑", word: "rises" },
      { kind: "text", text: "6:24 am" },
    ]);
    expect(tokenize("23° SE ⋆11:40p")).toEqual([
      { kind: "text", text: "23° SE " },
      { kind: "glyph", text: "⋆", word: "peaks" },
      { kind: "text", text: "11:40p" },
    ]);
  });

  it("gives the Mazzaroth star a plain-words alternative, not a symbol name", () => {
    const [star] = tokenize("★");
    expect(star).toEqual({ kind: "glyph", text: "★", word: GLYPH_WORDS["★"] });
    expect(GLYPH_WORDS["★"]).toMatch(/constellation of the sun/);
  });

  it("concatenates back to the input, so textContent never changes", () => {
    for (const s of ["", "—", "no moonrise today", "↑11:41p · ↓1:41p Thu", "rises in 9h 10m · season from Dec 22"]) {
      expect(tokenize(s).map((t) => t.text).join("")).toBe(s);
    }
  });
});

describe("lineParts — a line bends only at its separators", () => {
  it("splits at the separator and gives every later part its leading dot", () => {
    const parts = lineParts("↑11:41p · ↓1:41p Thu");
    expect(parts.length).toBe(2);
    expect(parts[0]?.map((t) => t.text).join("")).toBe("↑11:41p");
    expect(parts[1]?.map((t) => t.text).join("")).toBe("· ↓1:41p Thu");
  });

  it("keeps a line with no separator as one whole part", () => {
    expect(lineParts("40.0°N 74.0°W").length).toBe(1);
    expect(lineParts("").length).toBe(1);
  });

  it("round-trips: the parts joined by one space are the line, for every shape the Scene words", () => {
    for (const s of [
      "↑11:41p · ↓1:41p Thu", "rises in 9h 10m · season from Dec 22", "sets in 1h 52m · 19° SW ⋆3:33p",
      "up all day", "not rising · season from Sep 14", "↓7:25 pm", "40.0°N 74.0°W", "",
    ]) {
      expect(partsText(lineParts(s))).toBe(s);
    }
    expect(SEPARATOR).toBe(" · ");
  });
});
