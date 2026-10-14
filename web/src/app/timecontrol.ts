/**
 * REQ-005 — time-travel stepping semantics (WI-006).
 *
 * Re-specified from EOClock.mm:440-493,680-758 (per PLAN.md debt finding 4):
 * the legacy 300-line button-branch chains reduce to this table. Calendar
 * units step by calendar (preserving wall-clock time across DST), fixed
 * units step by exact milliseconds, and month/year steps CLAMP the
 * day-of-month (Jan 31 + 1 month = Feb 28/29, never Mar 2-3).
 */

export type StepUnit = "minute" | "hour" | "day" | "phase" | "month" | "year" | "century";

export type StepDirection = 1 | -1;

/** Mean synodic month in days; a "phase" step is one lunar quarter. */
const SYNODIC_DAYS = 29.530588853;
const PHASE_STEP_MILLIS = (SYNODIC_DAYS / 4) * 86400000;

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

function stepCalendar(base: Date, years: number, months: number, days: number): number {
  const targetYear = base.getFullYear() + years;
  const targetMonthRaw = base.getMonth() + months;
  // Normalize month overflow ourselves so we can clamp the day afterwards.
  const targetYearAdj = targetYear + Math.floor(targetMonthRaw / 12);
  const targetMonth = ((targetMonthRaw % 12) + 12) % 12;
  const clampedDay = Math.min(base.getDate(), daysInMonth(targetYearAdj, targetMonth));
  const d = new Date(base.getTime());
  d.setFullYear(targetYearAdj, targetMonth, clampedDay);
  if (days !== 0) d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Step a timestamp by one unit in the given direction. */
export function stepTime(unixMillis: number, unit: StepUnit, dir: StepDirection): number {
  const base = new Date(unixMillis);
  switch (unit) {
    case "minute":
      return unixMillis + dir * 60000;
    case "hour":
      return unixMillis + dir * 3600000;
    case "phase":
      return unixMillis + dir * PHASE_STEP_MILLIS;
    case "day":
      return stepCalendar(base, 0, 0, dir);
    case "month":
      return stepCalendar(base, 0, dir, 0);
    case "year":
      return stepCalendar(base, dir, 0, 0);
    case "century":
      return stepCalendar(base, dir * 100, 0, 0);
  }
}

/** Display order and labels for the control strip. */
export const STEP_UNITS: readonly { readonly unit: StepUnit; readonly label: string }[] = [
  { unit: "minute", label: "MIN" },
  { unit: "hour", label: "HOUR" },
  { unit: "day", label: "DAY" },
  { unit: "phase", label: "PHASE" },
  { unit: "month", label: "MONTH" },
  { unit: "year", label: "YEAR" },
  { unit: "century", label: "CENT" },
] as const;
