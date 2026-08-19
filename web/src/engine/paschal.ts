/**
 * The moon the feast is reckoned from.
 *
 * The computus in `app/computus.ts` is arithmetic — deliberately so, since the
 * Church wanted a date every congregation could agree on without an
 * observatory. This is the other half: the *observed* paschal moon, the first
 * astronomical full moon on or after the March equinox.
 *
 * They usually agree within a day or two. Occasionally they do not (1900,
 * 2019, 2038 among them), because the ecclesiastical tables use a fixed
 * 19-year lunar cycle and a nominal 21 March equinox. That divergence is a
 * fact worth showing, not hiding: an astronomy instrument can say what the sky
 * did while the calendar says what the Church agreed.
 */
import { Body, SearchMoonPhase, Seasons } from "astronomy-engine";

/** The March (vernal) equinox, in unix millis. */
export function marchEquinoxUnixMillis(year: number): number {
  return Seasons(year).mar_equinox.date.getTime();
}

/**
 * The first astronomical full moon on or after the March equinox, in unix
 * millis. Null only if the search fails, which it should not for real years.
 */
export function paschalFullMoonUnixMillis(year: number): number | null {
  const equinox = new Date(marchEquinoxUnixMillis(year));
  const full = SearchMoonPhase(180, equinox, 40);
  return full === null ? null : full.date.getTime();
}

/** Kept so the import of Body is meaningful if this file grows. */
export const PASCHAL_BODY = Body.Moon;
