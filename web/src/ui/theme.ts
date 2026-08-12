/**
 * Day4 Observatory visual tokens (DEC-008): living-cyanotype instrument.
 * Rule: color belongs only to the sky — the sun and moon get color, all
 * other marks are Prussian-blue linework.
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
  moonlight: "#ECF2F7", // the moon, only
  fontMono: "'IBM Plex Mono', ui-monospace, monospace",
  fontSerif: "'Instrument Serif', Georgia, serif",
} as const;
