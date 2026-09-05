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
import { GLANCE_ROWS, type Scene, type SceneMovement, type SceneRow } from "./scene";
import { parseCoordinate, type Station } from "./location";
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

type Role = keyof typeof IDS;
type Found = Partial<Record<Role, HTMLElement>>;

/** The units the rail carries; drag the sun for minutes (see timecontrol.ts). */
const SHOWN_UNITS: ReadonlySet<StepUnit> = new Set(["hour", "day", "month", "phase"]);

/** How many glance rows the ledger shows; the rest live behind the fold. */
const GLANCE_SLOTS = GLANCE_ROWS;

interface Slot {
  readonly root: HTMLElement;
  readonly swatch: HTMLElement;
  readonly label: HTMLElement;
  readonly line: HTMLElement;
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

  let W = 0;
  let R = 0;
  let DPR = 1;
  let lastScene: Scene | null = null;

  const setText = (role: Role, text: string): void => {
    const e = els[role];
    if (e !== undefined) e.textContent = text;
  };

  /* ————— fit ————— */
  const fit = (): Stage => {
    const parent = dial?.parentElement ?? null;
    if (dial !== null && parent !== null) {
      const box = parent.getBoundingClientRect();
      // The stage's CONTENT box: a dial sized to the border box overflows
      // into whatever sits above and below.
      const pad = win.getComputedStyle(parent);
      const innerW = box.width - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
      const innerH = box.height - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
      const portrait = win.matchMedia("(max-width: 720px)").matches;
      const size = Math.max(120, Math.floor(portrait
        ? Math.min(innerW, win.innerHeight * 0.52)
        : Math.min(innerW, innerH)));
      DPR = Math.min(win.devicePixelRatio || 1, 2);
      dial.width = size * DPR;
      dial.height = size * DPR;
      dial.style.width = `${size}px`;
      dial.style.height = `${size}px`;
      W = size * DPR;
      // The rete rides outside the band, so the band yields the rim to it.
      R = (W * 0.5 * FACE.dialOuter) / FACE.reteOuter;
      if (ctx !== null) buildGrain(ctx);
    }
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
    };
  };

  /* ————— the ledger: three glance slots, built once ————— */
  const slots: Slot[] = [];
  if (els.tonightList !== undefined) {
    for (let i = 0; i < GLANCE_SLOTS; i++) {
      const root = doc.createElement("div");
      root.className = "lrow";
      const name = doc.createElement("span");
      name.className = "n";
      const swatch = doc.createElement("i");
      swatch.className = "sw";
      const label = doc.createElement("span");
      name.append(swatch, label);
      const line = doc.createElement("span");
      line.className = "d";
      root.append(name, line);
      // A planet row is the control for its ring: tap to light, tap to release.
      root.addEventListener("click", () => {
        const planet = root.dataset["planet"];
        if (planet === undefined || planet === "") return;
        handlers.onLit(root.classList.contains("chosen") ? null : planet);
      });
      els.tonightList.appendChild(root);
      slots.push({ root, swatch, label, line });
    }
  }

  const paintGlance = (rows: readonly SceneRow[]): void => {
    slots.forEach((slot, i) => {
      const row = rows[i];
      if (row === undefined) {
        slot.root.style.display = "none";
        return;
      }
      slot.root.style.display = "";
      slot.root.classList.toggle("is-up", row.up);
      slot.root.classList.toggle("chosen", row.color !== null && row.lit);
      slot.root.dataset["planet"] = row.color === null ? "" : row.name;
      if (row.color === null) slot.root.removeAttribute("role");
      else slot.root.setAttribute("role", "button");
      slot.label.textContent = row.name;
      slot.line.textContent = row.line;
      // The swatch is the legend for the rings on the rete (DEC-034).
      slot.swatch.style.display = row.color === null ? "none" : "";
      slot.swatch.style.background = row.color ?? "";
      slot.label.style.color = row.color ?? "";
    });
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
        for (const row of movement.rows) frag.append(ledgerRow(doc, row));
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

  return { fit, paint, isFoldOpen, showStation, stationStatus };
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

/** A planet row in the programme: swatch, coloured name, line. */
function ledgerRow(doc: Document, row: SceneRow): HTMLElement {
  const root = doc.createElement("div");
  root.className = `lrow${row.up ? " is-up" : ""}${row.lit ? " chosen" : ""}`;
  const name = doc.createElement("span");
  name.className = "n";
  name.style.color = row.color ?? "";
  const swatch = doc.createElement("i");
  swatch.className = "sw";
  swatch.style.background = row.color ?? "";
  name.append(swatch, doc.createTextNode(row.name));
  const line = doc.createElement("span");
  line.className = "d";
  line.textContent = row.line;
  root.append(name, line);
  return root;
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
