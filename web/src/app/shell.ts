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
import type { Scene, SceneMovement, ScenePlanet, SceneRow } from "./scene";
import { GLANCE_ROWS } from "./scene-consts";
import { parseCoordinate, type Station } from "./location";
import { MODES, stepMode, type Mode } from "./mode";
import { STEP_UNITS, type StepUnit } from "./timecontrol";
import { hitSun, pointToDialHours, shortestHourDelta } from "./scrub";
import { FACE } from "../ui/clockface";
import { buildGrain } from "../ui/grain";

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
  /* The three views (DEC-038): the selector, one panel per mode, and the
   * shared station/time line the focused views stand on. */
  modes: "modes",
  stage: "stage",
  viewDay4: "view-day4",
  planetsList: "planets-list",
  planetsNote: "planets-note",
  viewConstellations: "view-constellations",
  viewPlanets: "view-planets",
  focusContext: "focus-context",
  focusStation: "focus-station",
  focusClock: "focus-clock",
  focusZone: "focus-zone",
  /* The Constellations view (REQ-015): the chart, its words, the two lists. */
  chartStage: "chart-stage",
  chart: "chart",
  chartTitle: "chart-title",
  chartStatus: "chart-status",
  chartTracked: "chart-tracked",
  chartWhere: "chart-where",
  chartVis: "chart-vis",
  chartNote: "chart-note",
  chartLoad: "chart-load",
  skyNote: "sky-note",
  skyUp: "sky-up",
  skyRising: "sky-rising",
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
  /** The viewer chose a view: Day 4, Constellations or Planets. */
  readonly onMode: (mode: Mode) => void;
  /** The viewer chose a constellation to chart. */
  readonly onChart: (name: string) => void;
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
  /** The constellation chart canvas, and its device pixels across; 0 until first shown. */
  readonly chart: CanvasRenderingContext2D | null;
  readonly chartW: number;
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
  /** Show one view and mark its tab; the others are hidden, not removed. */
  showMode(mode: Mode): void;
  /** A one-line note under the chart's words ("loading chart…"); "" clears it. */
  chartStatus(text: string): void;
}

type Role = keyof typeof IDS;
type Found = Partial<Record<Role, HTMLElement>>;

/** The units the rail carries; drag the sun for minutes (see timecontrol.ts). */
const SHOWN_UNITS: ReadonlySet<StepUnit> = new Set(["hour", "day", "month", "phase"]);

/** How many glance rows the ledger shows; the rest live behind the fold. */
const GLANCE_SLOTS = GLANCE_ROWS;

/** A glance slot is one row element, rebuilt only when its kind changes: a
 * real button for a planet (the control for its ring), a plain row for a
 * constellation. The list stays three `.lrow` elements in order. */
interface Slot {
  row: HTMLElement;
  kind: "planet" | "sky" | null;
  swatch: HTMLElement;
  label: HTMLElement;
  line: HTMLElement;
}

/** One row of the Planets view: the button, and the details it expands. */
interface PlanetSlot {
  readonly root: HTMLElement;
  readonly button: HTMLButtonElement;
  readonly swatch: HTMLElement;
  readonly label: HTMLElement;
  readonly line: HTMLElement;
  readonly detail: HTMLElement;
  readonly rise: HTMLElement;
  readonly peak: HTMLElement;
  readonly set: HTMLElement;
  readonly where: HTMLElement;
  readonly visibility: HTMLElement;
  readonly arcNote: HTMLElement;
}

/**
 * Find the elements, wire the handlers, return the shell. Elements that are
 * missing are logged once and painted around. Never throws.
 */
export function bind(doc: Document, handlers: ShellHandlers): Shell {
  const win = doc.defaultView ?? window;
  const els = lookup(doc);

  const dial = asCanvas(els.sky);
  const ctx = dial?.getContext("2d") ?? null;
  const firm = asCanvas(els.firmament);
  const fctx = firm?.getContext("2d") ?? null;
  const chartCanvas = asCanvas(els.chart);
  const chartCtx = chartCanvas?.getContext("2d") ?? null;

  let W = 0;
  let R = 0;
  let DPR = 1;
  let chartW = 0;
  let lastScene: Scene | null = null;

  const setText = (role: Role, text: string): void => {
    const e = els[role];
    if (e !== undefined) e.textContent = text;
  };

  /* ————— fit ————— */
  /** The largest square a stage's CONTENT box holds (a canvas sized to the
   * border box overflows into whatever sits above and below), applied to the
   * canvas; 0 while the stage is hidden, so a hidden canvas keeps its size. */
  const squareFor = (canvas: HTMLCanvasElement | null): number => {
    const parent = canvas?.parentElement ?? null;
    const box = parent?.getBoundingClientRect() ?? null;
    if (canvas === null || parent === null || box === null || box.width <= 0) return 0;
    const pad = win.getComputedStyle(parent);
    const innerW = box.width - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
    const innerH = box.height - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
    const portrait = win.matchMedia("(max-width: 720px)").matches;
    const size = Math.max(120, Math.floor(portrait
      ? Math.min(innerW, win.innerHeight * 0.52)
      : Math.min(innerW, innerH)));
    DPR = Math.min(win.devicePixelRatio || 1, 2);
    canvas.width = size * DPR;
    canvas.height = size * DPR;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    return size * DPR;
  };
  const fit = (): Stage => {
    const dialPx = squareFor(dial);
    // A hidden stage (another view is showing) keeps its last size; it is
    // refitted the moment Day 4 returns.
    if (dial !== null && dialPx > 0) {
      W = dialPx;
      // The rete rides outside the band, so the band yields the rim to it.
      R = (W * 0.5 * FACE.dialOuter) / FACE.reteOuter;
      if (ctx !== null) buildGrain(ctx);
    }
    const chartPx = squareFor(chartCanvas);
    if (chartPx > 0) chartW = chartPx;
    if (firm !== null && fctx !== null) {
      const d = Math.min(win.devicePixelRatio || 1, 1.5);
      firm.width = Math.floor(win.innerWidth * d);
      firm.height = Math.floor(win.innerHeight * d);
      fctx.setTransform(d, 0, 0, d, 0, 0);
    }
    return {
      dial: ctx,
      firmament: fctx,
      W,
      R,
      dpr: DPR,
      viewport: { width: win.innerWidth, height: win.innerHeight },
      chart: chartCtx,
      chartW,
    };
  };

  /* ————— the ledger: three glance slots, built once ————— */
  /** A planet row is the control for its ring: tap to light, tap to release. */
  const toggleLit = (name: string, lit: boolean): void => handlers.onLit(lit ? null : name);

  /** A fresh row of the given kind; planet rows are buttons for their ring. */
  const buildRow = (kind: "planet" | "sky"): Omit<Slot, "kind"> => {
    if (kind === "planet") {
      const b = planetButton(doc);
      b.button.addEventListener("click", () => {
        toggleLit(b.button.dataset["planet"] ?? "", b.button.classList.contains("chosen"));
      });
      return { row: b.button, swatch: b.swatch, label: b.label, line: b.line };
    }
    const row = doc.createElement("div");
    row.className = "lrow";
    const label = doc.createElement("span");
    label.className = "n";
    const line = doc.createElement("span");
    line.className = "d";
    row.append(label, line);
    return { row, swatch: label, label, line };
  };

  const slots: Slot[] = [];
  if (els.tonightList !== undefined) {
    for (let i = 0; i < GLANCE_SLOTS; i++) {
      const built = buildRow("sky");
      built.row.hidden = true;
      els.tonightList.appendChild(built.row);
      slots.push({ ...built, kind: null });
    }
  }

  const paintGlance = (rows: readonly SceneRow[]): void => {
    slots.forEach((slot, i) => {
      const row = rows[i];
      if (row === undefined) {
        slot.row.hidden = true;
        return;
      }
      const kind = row.color === null ? "sky" : "planet";
      if (kind !== slot.kind) {
        const built = buildRow(kind);
        slot.row.replaceWith(built.row);
        Object.assign(slot, built, { kind });
      }
      slot.row.hidden = false;
      slot.row.classList.toggle("is-up", row.up);
      slot.label.textContent = row.name;
      slot.line.textContent = row.line;
      if (kind === "planet") {
        slot.row.classList.toggle("chosen", row.lit);
        slot.row.setAttribute("aria-pressed", String(row.lit));
        slot.row.dataset["planet"] = row.name;
        // The swatch is the legend for the rings on the rete (DEC-034).
        slot.swatch.style.background = row.color ?? "";
        slot.label.style.color = row.color ?? "";
      }
    });
  };

  /* ————— the Planets view: five rows, built once, each a real button ————— */
  const planetSlots = new Map<string, PlanetSlot>();
  const paintPlanets = (planets: readonly ScenePlanet[]): void => {
    const host = els.planetsList;
    if (host === undefined) return;
    for (const p of planets) {
      let slot = planetSlots.get(p.name);
      if (slot === undefined) {
        const built = planetRow(doc, p.name);
        built.button.addEventListener("click", () => toggleLit(p.name, built.button.classList.contains("chosen")));
        host.appendChild(built.root);
        planetSlots.set(p.name, built);
        slot = built;
      }
      slot.root.classList.toggle("is-up", p.up);
      slot.root.classList.toggle("chosen", p.lit);
      slot.button.classList.toggle("chosen", p.lit);
      slot.button.setAttribute("aria-pressed", String(p.lit));
      slot.button.setAttribute("aria-expanded", String(p.lit));
      slot.swatch.style.background = p.color;
      slot.label.style.color = p.color;
      slot.label.textContent = p.name;
      slot.line.textContent = p.line;
      slot.detail.hidden = !p.lit;
      slot.rise.textContent = p.rise;
      slot.peak.textContent = p.peak;
      slot.set.textContent = p.set;
      slot.where.textContent = p.where;
      slot.visibility.textContent = p.visibility;
      slot.arcNote.textContent = p.arcNote;
    }
  };

  /* ————— the fold: the programme, rebuilt only when its words change ————— */
  const fold = els.tonightToggle?.closest(".tonight") ?? null;
  const isFoldOpen = (): boolean => fold?.classList.contains("open") ?? false;
  let programmeKey = "";

  const paintProgramme = (
    programme: readonly SceneMovement[], footnote: string,
  ): void => {
    const host = els.tonightAll;
    if (host === undefined || !isFoldOpen()) return;
    const key = programme
      .map((m) => `${m.title}|${m.rows.map((r) => `${r.name}${r.line}${r.lit ? "*" : ""}${r.up ? "^" : ""}`).join("|")}`)
      .join("\n") + `\n${footnote}`;
    if (key === programmeKey) return;
    programmeKey = key;

    const frag = doc.createDocumentFragment();
    for (const movement of programme) {
      frag.append(sectionHeader(doc, movement.title, movement.rows.length));
      // Planets keep the ledger's full row; the constellations fold into columns.
      if (movement.rows.some((r) => r.color !== null)) {
        for (const row of movement.rows) frag.append(ledgerRow(doc, row, toggleLit));
      } else {
        const cols = doc.createElement("div");
        cols.className = "cols";
        for (const row of movement.rows) cols.append(columnRow(doc, row));
        frag.append(cols);
      }
    }
    const foot = doc.createElement("div");
    foot.className = "tonight-foot";
    foot.textContent = footnote;
    frag.append(foot);
    host.replaceChildren(frag);
  };

  els.tonightToggle?.addEventListener("click", () => {
    const open = !isFoldOpen();
    fold?.classList.toggle("open", open);
    els.tonightToggle?.setAttribute("aria-expanded", String(open));
    if (els.tonightAll !== undefined) els.tonightAll.hidden = !open;
    programmeKey = ""; // render immediately on open
    if (lastScene !== null) paint(lastScene);
  });

  /* ————— paint ————— */
  const paint = (scene: Scene): void => {
    lastScene = scene;
    const r = scene.readouts;
    setText("verseText", r.verse);
    setText("verseRef", r.verseRef);
    setText("heroKind", r.heroKind);
    setText("heroValue", r.heroValue);
    setText("travelled", r.travelledDate);
    setText("zoneNote", r.zoneNote);
    setText("passion", r.passion);
    setText("sunRise", r.sunRise);
    setText("sunSet", r.sunSet);
    setText("moonPhase", r.moonPhase);
    setText("moonTimes", r.moonTimes);
    setText("station", r.station);
    setText("clock", r.clock);
    setText("zone", r.zone);
    setText("transcript", scene.spoken);

    // The whole page follows the light (DEC-010).
    doc.documentElement.style.setProperty("--print-0", scene.light.deep);
    doc.documentElement.style.setProperty("--print-1", scene.light.field);

    els.clock?.classList.toggle("shifted", scene.marks.travelled);
    els.now?.classList.toggle("armed", scene.marks.travelled);

    paintGlance(scene.tonight.glance);
    setText("tonightNote", scene.tonight.note);
    paintProgramme(scene.tonight.programme, scene.tonight.footnote);

    paintPlanets(scene.planets);
    setText("planetsNote", scene.tonight.note);

    // The chosen constellation, and the two lists to choose from.
    const c = scene.constellation;
    setText("chartTitle", c === null ? "Choose a constellation" : `${c.starred ? "★ " : ""}${c.name}`);
    setText("chartStatus", c?.status ?? "");
    setText("chartTracked", c?.tracked ?? "");
    setText("chartWhere", c?.where ?? "");
    setText("chartVis", c?.visibility ?? "");
    setText("chartNote", c?.note ?? "");
    setText("skyNote", scene.tonight.note);
    paintSky(scene.tonight.programme);

    // The focused views stand on the same station and clock as Day 4.
    setText("focusStation", r.station);
    setText("focusClock", r.clock);
    setText("focusZone", r.zone);
    els.focusClock?.classList.toggle("shifted", scene.marks.travelled);
  };

  /* ————— the Constellations view: two lists, rebuilt only when their words change ————— */
  let skyKey = "";
  const paintSky = (programme: readonly SceneMovement[]): void => {
    const hostUp = els.skyUp;
    const hostRising = els.skyRising;
    if (hostUp === undefined || hostRising === undefined) return;
    const up = programme[1]?.rows ?? [];
    const rising = programme[2]?.rows ?? [];
    const key = [...up, ...rising].map((r) => `${r.name}${r.line}${r.lit ? "*" : ""}${r.up ? "^" : ""}`).join("|");
    if (key === skyKey) return;
    skyKey = key;
    for (const [host, rows] of [[hostUp, up], [hostRising, rising]] as const) {
      const frag = doc.createDocumentFragment();
      for (const row of rows) frag.append(skyButton(doc, row, handlers.onChart));
      host.replaceChildren(frag);
    }
  };
  const chartStatus = (text: string): void => setText("chartLoad", text);

  /* ————— the modes: one row of tabs, one panel each (DEC-038) ————— */
  const views: Readonly<Record<Mode, HTMLElement | undefined>> = {
    day4: els.viewDay4,
    constellations: els.viewConstellations,
    planets: els.viewPlanets,
  };
  const tabs = new Map<Mode, HTMLButtonElement>();
  if (els.modes !== undefined) {
    for (const { mode, label } of MODES) {
      const tab = doc.createElement("button");
      tab.type = "button";
      tab.id = `tab-${mode}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("aria-controls", views[mode]?.id ?? "");
      tab.tabIndex = -1;
      tab.textContent = label;
      tab.addEventListener("click", () => handlers.onMode(mode));
      // Arrow keys walk the row; Home and End jump to its ends.
      tab.addEventListener("keydown", (e) => {
        const next: Mode | null =
          e.key === "ArrowRight" || e.key === "ArrowDown" ? stepMode(mode, 1)
          : e.key === "ArrowLeft" || e.key === "ArrowUp" ? stepMode(mode, -1)
          : e.key === "Home" ? (MODES[0]?.mode ?? mode)
          : e.key === "End" ? (MODES[MODES.length - 1]?.mode ?? mode)
          : null;
        if (next === null) return;
        e.preventDefault();
        handlers.onMode(next);
        tabs.get(next)?.focus();
      });
      els.modes.appendChild(tab);
      tabs.set(mode, tab);
    }
  }
  const showMode = (mode: Mode): void => {
    for (const { mode: m } of MODES) {
      const view = views[m];
      if (view !== undefined) view.hidden = m !== mode;
      const tab = tabs.get(m);
      if (tab !== undefined) {
        tab.setAttribute("aria-selected", String(m === mode));
        tab.tabIndex = m === mode ? 0 : -1;
      }
    }
    if (els.focusContext !== undefined) els.focusContext.hidden = mode === "day4";
    // The dial is shared by Day 4 and Planets; Constellations has its own view.
    if (els.stage !== undefined) els.stage.hidden = mode === "constellations";
  };

  /* ————— the rail: steppers and NOW ————— */
  if (els.steppers !== undefined) {
    for (const { unit, label } of STEP_UNITS.filter((u) => SHOWN_UNITS.has(u.unit))) {
      const cell = doc.createElement("div");
      cell.className = "cell";
      const back = doc.createElement("button");
      back.textContent = "‹";
      back.setAttribute("aria-label", `Back one ${unit}`);
      back.addEventListener("click", () => handlers.onStep(unit, -1));
      const name = doc.createElement("span");
      name.textContent = label;
      const fwd = doc.createElement("button");
      fwd.textContent = "›";
      fwd.setAttribute("aria-label", `Forward one ${unit}`);
      fwd.addEventListener("click", () => handlers.onStep(unit, 1));
      cell.append(back, name, fwd);
      els.steppers.appendChild(cell);
    }
  }
  els.now?.addEventListener("click", () => handlers.onNow());

  /* ————— the station: the readout is the control (DEC-028) ————— */
  const latIn = asInput(els.latIn);
  const lonIn = asInput(els.lonIn);
  const bay = els.stationBay ?? els.station?.closest(".bay") ?? null;
  const setBayOpen = (open: boolean): void => {
    bay?.classList.toggle("open", open);
    els.station?.setAttribute("aria-expanded", String(open));
    if (open) latIn?.focus();
  };
  const stationStatus = (text: string): void => setText("stationStatus", text);
  /** Fills the entry and closes the bay: a station that took is no longer being entered. */
  const showStation = (station: Station): void => {
    if (latIn !== null) latIn.value = String(Number(station.lat.toFixed(4)));
    if (lonIn !== null) lonIn.value = String(Number(station.lon.toFixed(4)));
    setBayOpen(false);
  };
  els.station?.addEventListener("click", () => {
    setBayOpen(!(bay?.classList.contains("open") ?? false));
  });
  const applyStation = (): void => {
    if (latIn === null || lonIn === null) return;
    const lat = parseCoordinate(latIn.value, "lat");
    const lon = parseCoordinate(lonIn.value, "lon");
    if (lat === null || lon === null) {
      stationStatus(lat === null ? "latitude must be -90..90" : "longitude must be -180..180");
      return;
    }
    stationStatus("");
    setBayOpen(false);
    handlers.onStation({ lat, lon });
  };
  els.setStation?.addEventListener("click", applyStation);
  for (const input of [latIn, lonIn]) {
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyStation();
    });
  }
  els.locate?.addEventListener("click", () => handlers.onLocate());

  /* ————— drag the sun to scrub time (REQ-005) ————— */
  if (dial !== null) {
    let dragging = false;
    let lastDragHours = 0;
    const point = (e: PointerEvent): { x: number; y: number } => {
      const rect = dial.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * DPR - W / 2,
        y: (e.clientY - rect.top) * DPR - W / 2,
      };
    };
    const overSun = (p: { x: number; y: number }): boolean =>
      lastScene !== null && hitSun(p.x, p.y, lastScene.sun.hours, R);
    dial.addEventListener("pointerdown", (e) => {
      const p = point(e);
      if (!overSun(p)) return;
      dragging = true;
      lastDragHours = pointToDialHours(p.x, p.y);
      dial.setPointerCapture(e.pointerId);
      dial.style.cursor = "grabbing";
      e.preventDefault();
    });
    dial.addEventListener("pointermove", (e) => {
      const p = point(e);
      if (dragging) {
        const cur = pointToDialHours(p.x, p.y);
        const delta = shortestHourDelta(lastDragHours, cur);
        lastDragHours = cur;
        handlers.onScrub(delta);
      } else {
        dial.style.cursor = overSun(p) ? "grab" : "default";
      }
    });
    for (const type of ["pointerup", "pointercancel"] as const) {
      dial.addEventListener(type, () => {
        dragging = false;
        dial.style.cursor = "default";
      });
    }
  }

  /* ————— resize: the window, and the stage on its own ————— */
  win.addEventListener("resize", () => handlers.onResize());
  // The stage can change height without the window resizing (a late font,
  // the TONIGHT band growing). Re-fit, or the dial overlaps its neighbours.
  const stage = dial?.parentElement ?? null;
  if (stage !== null && typeof ResizeObserver !== "undefined") {
    let lastH = 0;
    new ResizeObserver(() => {
      const h = Math.round(stage.getBoundingClientRect().height);
      if (h === lastH) return; // ignore the resize we just caused ourselves
      lastH = h;
      handlers.onResize();
    }).observe(stage);
  }

  return { fit, paint, isFoldOpen, showStation, stationStatus, showMode, chartStatus };
}

/* ————— element lookup and row builders ————— */

/** Every IDS element that exists; the missing ones are warned about once. */
function lookup(doc: Document): Found {
  const found: Found = {};
  const missing: string[] = [];
  for (const role of Object.keys(IDS) as Role[]) {
    const e = doc.getElementById(IDS[role]);
    if (e === null) missing.push(IDS[role]);
    else found[role] = e;
  }
  if (missing.length > 0) {
    console.warn(`shell: missing elements, painted around: ${missing.join(", ")}`);
  }
  return found;
}

const asCanvas = (e: HTMLElement | undefined): HTMLCanvasElement | null =>
  e instanceof HTMLCanvasElement ? e : null;

const asInput = (e: HTMLElement | undefined): HTMLInputElement | null =>
  e instanceof HTMLInputElement ? e : null;

function sectionHeader(doc: Document, title: string, count: number): HTMLElement {
  const section = doc.createElement("div");
  section.className = "section";
  const t = doc.createElement("span");
  t.className = "t";
  t.textContent = title;
  const rule = doc.createElement("span");
  rule.className = "rule";
  const c = doc.createElement("span");
  c.className = "c";
  c.textContent = String(count);
  section.append(t, rule, c);
  return section;
}

/** An empty planet row that is a real button: swatch, coloured name, line. */
function planetButton(doc: Document): {
  button: HTMLButtonElement; swatch: HTMLElement; label: HTMLElement; line: HTMLElement;
} {
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "lrow";
  button.setAttribute("aria-pressed", "false");
  const name = doc.createElement("span");
  name.className = "n";
  const swatch = doc.createElement("i");
  swatch.className = "sw";
  const label = doc.createElement("span");
  name.append(swatch, label);
  const line = doc.createElement("span");
  line.className = "d";
  button.append(name, line);
  return { button, swatch, label, line };
}

/** A planet row in the programme: a button that lights the planet's ring. */
function ledgerRow(
  doc: Document, row: SceneRow, toggleLit: (name: string, lit: boolean) => void,
): HTMLElement {
  const b = planetButton(doc);
  b.button.className = `lrow${row.up ? " is-up" : ""}${row.lit ? " chosen" : ""}`;
  b.button.setAttribute("aria-pressed", String(row.lit));
  b.button.dataset["planet"] = row.name;
  b.label.style.color = row.color ?? "";
  b.swatch.style.background = row.color ?? "";
  b.label.textContent = row.name;
  b.line.textContent = row.line;
  b.button.addEventListener("click", () => toggleLit(row.name, row.lit));
  return b.button;
}

/** A row of the Planets view: the button, and the details that open under it. */
function planetRow(doc: Document, name: string): PlanetSlot {
  const root = doc.createElement("div");
  root.className = "prow";
  const b = planetButton(doc);
  b.button.className = "lrow pbtn";
  b.button.dataset["planet"] = name;
  const detail = doc.createElement("div");
  detail.className = "pdetail";
  detail.id = `planet-detail-${name.toLowerCase()}`;
  detail.hidden = true;
  b.button.setAttribute("aria-controls", detail.id);
  b.button.setAttribute("aria-expanded", "false");

  const times = doc.createElement("div");
  times.className = "ptimes";
  const cell = (k: string): HTMLElement => {
    const wrap = doc.createElement("span");
    const key = doc.createElement("em");
    key.textContent = k;
    const val = doc.createElement("b");
    wrap.append(key, val);
    times.append(wrap);
    return val;
  };
  const rise = cell("RISE");
  const peak = cell("PEAK");
  const set = cell("SET");
  const where = doc.createElement("div");
  where.className = "pwhere";
  const visibility = doc.createElement("p");
  visibility.className = "pvis";
  const arcNote = doc.createElement("p");
  arcNote.className = "parc";
  detail.append(times, where, visibility, arcNote);
  root.append(b.button, detail);
  return {
    root, button: b.button, swatch: b.swatch, label: b.label, line: b.line,
    detail, rise, peak, set, where, visibility, arcNote,
  };
}

/** A constellation row in the Constellations view: a real button that opens its chart. */
function skyButton(doc: Document, row: SceneRow, onChart: (name: string) => void): HTMLElement {
  const b = doc.createElement("button");
  b.type = "button";
  b.className = `crow${row.up ? " is-up" : ""}${row.lit ? " chosen" : ""}`;
  b.setAttribute("aria-pressed", String(row.lit));
  b.dataset["constellation"] = row.name;
  const name = doc.createElement("span");
  name.className = "n";
  name.textContent = row.name;
  if (row.starred) {
    const mz = doc.createElement("i");
    mz.className = "mz";
    mz.textContent = "★";
    name.append(mz);
  }
  const line = doc.createElement("span");
  line.className = "d";
  line.textContent = row.line;
  b.append(name, line);
  b.addEventListener("click", () => onChart(row.name));
  return b;
}

/** A constellation row in the columns, starred when Mazzaroth. */
function columnRow(doc: Document, row: SceneRow): HTMLElement {
  const root = doc.createElement("div");
  root.className = `crow${row.up ? " is-up" : ""}`;
  const name = doc.createElement("span");
  name.className = "n";
  name.textContent = row.name;
  if (row.starred) {
    const mz = doc.createElement("i");
    mz.className = "mz";
    mz.textContent = "★";
    name.append(mz);
  }
  const line = doc.createElement("span");
  line.className = "d";
  line.textContent = row.line;
  root.append(name, line);
  return root;
}
