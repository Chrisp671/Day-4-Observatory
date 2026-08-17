/**
 * Day4 Observatory visual tokens (DEC-008): living-cyanotype instrument.
 * Rule: color belongs only to the sky. Palette is a blue-orange
 * complementary pair (DEC-009): Prussian field vs the warm family —
 * sun gold, twilight amber, moon ivory. All other marks are ink.
 */
export const THEME = {
  printDeep: "#081627", // vignette
  printField: "#0E2440", // Prussian field
  inkHi: "#D7E6F2", // primary linework
  inkMid: "#7E9CB8", // secondary linework
  inkLow: "#3A5876", // faint linework
  night: "#122A49", // night arc on the dial band
  shadow: "#0A1C33", // dark discs (moon shadow, night hemisphere)
  sunlight: "#F0B310", // Day4 brand gold — the sun, only
  dawn: "#E8955C", // twilight amber — the sky's own color at the boundaries
  moonlight: "#F2EDE0", // the moon, only — warm ivory against the cool inks
  fontMono: "'IBM Plex Mono', ui-monospace, monospace",
  fontSerif: "'Instrument Serif', Georgia, serif",
} as const;
