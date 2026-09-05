/**
 * THE SHELL — DOM binding for the page, and the only file that knows an
 * element id. index.html and this file are the two halves of one contract;
 * nothing else may query the document.
 *
 * Why (DEC-037): twenty ids were an unwritten agreement between the HTML and
 * a 700-line module. Now the agreement is the IDS table below, checked once
 * at boot (a missing element is reported and painted around, never thrown),
 * and everything the page shows arrives as a Scene already worded.
 *
 * The shell does three things and no more:
 *   1. bind(): find the elements once, wire input (steppers, NOW, station
 *      entry, the TONIGHT fold, the tappable ledger rows, sun drag) to the
 *      handlers it is given.
 *   2. paint(scene): write every readout, row, class and attribute from the
 *      Scene. Idempotent; called once per tick.
 *   3. fit(): size the canvases to the stage and report the face radius.
 *
 * It holds no astronomy, no formatting, no caching.
 */
import type { Scene } from "./scene";
import type { Station } from "./location";
import type { StepUnit } from "./timecontrol";

/** Every element the page addresses, by role. Values are the ids in index.html. */
export const IDS = {
  firmament: "firmament",
  sky: "sky",
  transcript: "sky-transcript",
  verseText: "verse-text",
  verseRef: "verse-ref",
  heroKind: "hero-k",
  heroValue: "hero-v",
  travelled: "travelled",
  zoneNote: "zone-note",
  passion: "passion",
  sunRise: "rise",
  sunSet: "set",
  moonPhase: "moon",
  moonTimes: "moon-times",
  station: "station",
  stationBay: "station-bay",
  stationBar: "stationbar",
  latIn: "lat-in",
  lonIn: "lon-in",
  setStation: "set-station",
  locate: "locate",
  stationStatus: "station-status",
  clock: "timeline",
  zone: "zone",
  steppers: "steppers",
  now: "now",
  tonightToggle: "tonight-toggle",
  tonightNote: "tonight-note",
  tonightList: "tonight-list",
  tonightAll: "tonight-all",
} as const;

/** What the shell can tell the app about. */
export interface ShellHandlers {
  readonly onStep: (unit: StepUnit, dir: 1 | -1) => void;
  readonly onNow: () => void;
  readonly onStation: (station: Station) => void;
  readonly onLocate: () => void;
  /** The viewer tapped a planet row; null releases the lit ring. */
  readonly onLit: (name: string | null) => void;
  /** The sun was dragged by this many dial hours (may cross midnight). */
  readonly onScrub: (deltaHours: number) => void;
  /** The stage changed size; the app should refit and repaint. */
  readonly onResize: () => void;
}

/** The canvases, sized, with the geometry the painters need. */
export interface Stage {
  readonly dial: CanvasRenderingContext2D | null;
  readonly firmament: CanvasRenderingContext2D | null;
  /** Device pixels across the dial canvas. */
  readonly W: number;
  /** The band's face radius in device pixels; ring radii are fractions of it. */
  readonly R: number;
  readonly dpr: number;
  readonly viewport: { readonly width: number; readonly height: number };
}

export interface Shell {
  /** Size the canvases to the stage; returns the new geometry. */
  fit(): Stage;
  /** Write the whole Scene to the DOM. */
  paint(scene: Scene): void;
  /** Whether the TONIGHT fold is open (the programme paints only then). */
  isFoldOpen(): boolean;
  /** Set the station entry's fields (after LOCATE succeeds). */
  showStation(station: Station): void;
  /** Show a one-line status under the station entry; "" clears it. */
  stationStatus(text: string): void;
}

/**
 * Find the elements, wire the handlers, return the shell. Elements that are
 * missing are logged once and painted around. Never throws.
 */
export declare function bind(doc: Document, handlers: ShellHandlers): Shell;
