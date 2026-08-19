/**
 * Day4 Observatory visual tokens (DEC-008): living-cyanotype instrument.
 * Rule: color belongs only to the sky. Palette is a blue-orange
 * complementary pair (DEC-009): Prussian field vs the warm family —
 * sun gold, twilight amber, moon ivory. All other marks are ink.
 */
export const THEME = {
  printDeep: "#081627", // vignette
  printField: "#0E2440", // Prussian field
  inkHi: "#E7F0FA", // primary linework
  inkMid: "#9BB9D6", // secondary linework
  inkLow: "#46648A", // faint linework
  night: "#122A49", // night arc on the dial band
  shadow: "#0A1C33", // dark discs (moon shadow, night hemisphere)
  sunlight: "#F0B310", // Day4 brand gold — the sun, only
  dawn: "#E8955C", // twilight amber — the sky's own color at the boundaries
  moonlight: "#F2EDE0", // the moon, only — warm ivory against the cool inks
  fontMono: "'IBM Plex Mono', ui-monospace, monospace",
  fontSerif: "'Fraunces', Georgia, serif",
  fontCaps: "'Cinzel', 'Times New Roman', serif",
} as const;

/**
 * Gold leaf is a material, not a colour (DEC-016): it has a shadow side, a
 * body, and a specular highlight. A flat yellow reads as paint; this reads as
 * metal. `y0`/`y1` bracket the mark being filled, in the current transform.
 */
export function goldLeaf(
  ctx: CanvasRenderingContext2D,
  y0: number,
  y1: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#FFF7DD");
  g.addColorStop(0.35, "#F7DE93");
  g.addColorStop(0.7, "#D9A62B");
  g.addColorStop(1, "#6E4E12");
  return g;
}
