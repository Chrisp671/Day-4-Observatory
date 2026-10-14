/**
 * Constants shared by the contract, the scene halves and the shell, kept in
 * a leaf module so nothing that implements the Scene has to import the file
 * that composes it.
 */

/** How many rows the glance board carries; the rest live behind the fold. */
export const GLANCE_ROWS = 3;

/** The three movements of the programme, in order. */
export const MOVEMENTS = {
  wandering: "THE WANDERING STARS",
  up: "UP NOW",
  rising: "STILL TO RISE",
} as const;
