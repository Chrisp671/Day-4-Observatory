/**
 * REQ-006 — station (observer location) entry and persistence.
 *
 * Fixes the legacy locale bug by design (FlipsideViewController.mm:289-293
 * used `floatValue`, so European "48,8" parsed as 48.0 and out-of-range
 * values were silently clamped): comma decimals are accepted, invalid or
 * out-of-range input is REJECTED (returns null) so the UI can say so.
 */

export interface Station {
  readonly lat: number;
  readonly lon: number;
}

export const DEFAULT_STATION: Station = { lat: 40.0, lon: -74.0 };

const RANGE = { lat: 90, lon: 180 } as const;

/** Parse one coordinate; locale-tolerant; null = invalid (caller shows error). */
export function parseCoordinate(input: string, kind: "lat" | "lon"): number | null {
  const cleaned = input.trim().replace(",", ".");
  if (cleaned === "" || !/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) > RANGE[kind]) return null;
  return value;
}

const STORAGE_KEY = "day4-observatory.station";

export function loadStation(): Station {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_STATION;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" && parsed !== null &&
      typeof (parsed as Station).lat === "number" &&
      typeof (parsed as Station).lon === "number" &&
      Math.abs((parsed as Station).lat) <= 90 &&
      Math.abs((parsed as Station).lon) <= 180
    ) {
      return { lat: (parsed as Station).lat, lon: (parsed as Station).lon };
    }
    return DEFAULT_STATION;
  } catch {
    return DEFAULT_STATION;
  }
}

export function saveStation(station: Station): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(station));
  } catch {
    // Storage unavailable (private mode): the session still works, unsaved.
  }
}
