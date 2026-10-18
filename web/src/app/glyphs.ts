/**
 * Words for the glyphs, and the joints a line may bend at (DEC-053).
 *
 * The Scene's strings carry ↑ ↓ ⋆ and the " · " separator: a sighted reader
 * learns them in a glance, a screen reader says "up arrow" or nothing. And a
 * readout that fits a 430px phone in one line — "↑11:41p · ↓1:41p Thu" — does
 * not fit a 320px one, where the old answer was an ellipsis, which on a
 * readout is a wrong readout.
 *
 * This module turns one final string into what the shell renders:
 *   - the text, character for character, so an element's `textContent` stays
 *     byte-identical to the Scene's string (every driver reads it that way);
 *   - each glyph marked with the word a screen reader should say instead;
 *   - the parts between separators kept whole, so a line that must wrap
 *     breaks only at a separator — never inside "40.0°N" or "⋆11:40p" — and
 *     the continuation line begins with the dot, as a ledger's would.
 *
 * Pure: no DOM. The shell builds spans from these tokens.
 */

/** The separator the Scene joins a line's parts with. */
export const SEPARATOR = " · ";

/** What a screen reader says for each glyph the page draws. */
export const GLYPH_WORDS: Readonly<Record<string, string>> = {
  "↑": "rises",
  "↓": "sets",
  "⋆": "peaks",
  "★": "Mazzaroth, a constellation of the sun's path",
};

export type Token =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "glyph"; readonly text: string; readonly word: string };

/** One string as text runs and glyphs, in order; concatenating `text` gives the input back. */
export function tokenize(text: string): readonly Token[] {
  const out: Token[] = [];
  let run = "";
  for (const ch of text) {
    const word = GLYPH_WORDS[ch];
    if (word === undefined) {
      run += ch;
      continue;
    }
    if (run !== "") out.push({ kind: "text", text: run });
    run = "";
    out.push({ kind: "glyph", text: ch, word });
  }
  if (run !== "") out.push({ kind: "text", text: run });
  return out;
}

/**
 * A line as its unbreakable parts. The first part is the text before the
 * first separator; every later part begins with "· " so that, joined with a
 * single space, the parts spell the line exactly. The shell renders each part
 * `white-space: nowrap` and puts a plain space between them: the only place
 * the browser may break the line is that space.
 */
export function lineParts(line: string): readonly (readonly Token[])[] {
  return line.split(SEPARATOR).map((part, i) => tokenize(i === 0 ? part : `${SEPARATOR.trimStart()}${part}`));
}

/** The text a rendered line carries — the same string it was built from. */
export function partsText(parts: readonly (readonly Token[])[]): string {
  return parts.map((part) => part.map((t) => t.text).join("")).join(" ");
}
