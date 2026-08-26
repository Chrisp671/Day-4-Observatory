/**
 * Day4 Observatory — instrument shell.
 * Views per PLAN.md WI-004/005; time travel + station per WI-006 (REQ-005/006).
 */
import { frame } from "./engine/frame";
import { loadStation, parseCoordinate, saveStation, type Station } from "./app/location";
import { VERSE_VERSION, verseOfDay } from "./app/verse";
import { formatCountdown, nextSunEvent } from "./app/hero";
import { CONSTELLATIONS, isDarkEnough, tonightBoard, type SkyEntry } from "./app/constellations";
import { mismatchPhrase, zoneReport } from "./app/clockzone";
import { compassAbbrev, transcript } from "./app/transcript";
import { moonDay, planetBoard, sunDay, type PlanetTimes } from "./engine/planets";
import { fmt12, fmt12c, fmt12s } from "./app/clock12";
import { passionHours } from "./app/hours";
import { drawAxis, drawPassionHours, drawWell } from "./ui/passion";
import { drawFiducial } from "./ui/fiducial";
import { hitSun, pointToDialHours, shortestHourDelta } from "./app/scrub";
import { STEP_UNITS, stepTime, type StepUnit } from "./app/timecontrol";
import { hourToAngle, localHoursOfDay } from "./ui/clockface";
import { drawDial } from "./ui/dial";
import { drawEarth } from "./ui/earth";
import { buildGrain, drawGrain } from "./ui/grain";
import { drawMoon, drawMoonUpArc, moonDialHours } from "./ui/moon";
import { drawFirmament } from "./ui/firmament";
import { drawSidereal } from "./ui/sidereal";
import { skyPalette } from "./ui/sky";
import { drawSun } from "./ui/sun";

/* ————— state ————— */
let station: Station = loadStation();
/** Time-travel offset: displayed time = real now + offset. 0 = live. */
let offsetMillis = 0;

const displayedNow = (): number => Date.now() + offsetMillis;

/* ————— canvas ————— */
const canvas = document.getElementById("sky") as HTMLCanvasElement | null;
const ctx = canvas?.getContext("2d") ?? null;
const firmament = document.getElementById("firmament") as HTMLCanvasElement | null;
const fctx = firmament?.getContext("2d") ?? null;
let skyKey = ""; // last drawn firmament state (altitude bucket + size)

function fitFirmament(): void {
  if (firmament === null || fctx === null) return;
  const d = Math.min(window.devicePixelRatio || 1, 1.5);
  firmament.width = Math.floor(window.innerWidth * d);
  firmament.height = Math.floor(window.innerHeight * d);
  fctx.setTransform(d, 0, 0, d, 0, 0);
  skyKey = "";
}
let W = 0;
let R = 0;
let DPR = 1;

function fit(): void {
  if (canvas === null) return;
  const parent = canvas.parentElement;
  if (parent === null) return;
  const box = parent.getBoundingClientRect();
  // Measure the stage's CONTENT box: the border box includes padding, and a
  // dial sized to it overflows into whatever sits above and below.
  const pad = window.getComputedStyle(parent);
  const innerW = box.width - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
  const innerH = box.height - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
  // Portrait stack: the dial takes the stage width; desktop: fit the square.
  const portrait = window.matchMedia("(max-width: 720px)").matches;
  const size = Math.max(120, Math.floor(portrait
    ? Math.min(innerW, window.innerHeight * 0.52)
    : Math.min(innerW, innerH)));
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * DPR;
  canvas.height = size * DPR;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  W = size * DPR;
  R = W * 0.5 * 0.92;
  if (ctx !== null) buildGrain(ctx);
}

/* ————— dom helpers ————— */
const el = (id: string): HTMLElement | null => document.getElementById(id);
const setText = (id: string, text: string): void => {
  const e = el(id);
  if (e !== null) e.textContent = text;
};

const PHASE_NAMES = [
  "new moon", "waxing crescent", "first quarter", "waxing gibbous",
  "full moon", "waning gibbous", "last quarter", "waning crescent",
] as const;

const hhmm = fmt12;

/* ————— tonight: the evening's program (bottom band) ————— */
/** How many of the board's entries the strip shows; the rest stay off-screen. */
const TONIGHT_SLOTS = 3;

interface SkySlot {
  readonly root: HTMLElement;
  readonly name: HTMLElement;
  readonly when: HTMLElement;
}

const skySlots: SkySlot[] = [];

function buildTonight(): void {
  const host = el("tonight-list");
  if (host === null) return;
  for (let i = 0; i < TONIGHT_SLOTS; i++) {
    const root = document.createElement("div");
    root.className = "sky-item";
    const name = document.createElement("div");
    name.className = "sky-name";
    const when = document.createElement("div");
    when.className = "sky-when";
    root.append(name, when);
    host.appendChild(root);
    skySlots.push({ root, name, when });
  }
}

/** "up all night" / "sets in 3h 40m" / "rises in 2h 14m". */
function skyPhrase(entry: SkyEntry): string {
  if (entry.status === "circumpolar") return "up all night";
  const countdown = formatCountdown(entry.untilMillis ?? 0);
  return entry.status === "up" ? `sets in ${countdown}` : `rises in ${countdown}`;
}

function drawTonight(siderealHours: number, sunAltitudeDeg: number): void {
  // A constellation that never rises from this station is not news; drop it.
  const lst = siderealHours + station.lon / 15;
  // The glance board holds three headliners; the full sky lives behind the
  // TONIGHT fold (DEC-028's pattern: the label is the control).
  const board = tonightBoard(lst, station.lat, CONSTELLATIONS.filter((c) => c.notable === true))
    .filter((e) => e.status !== "never");

  // Saturn and Jupiter first — "when will I be able to see Saturn?" is the
  // question this board exists to answer (DEC-031).
  const t = displayedNow();
  const favourites = planetsNow(t).filter((p) => p.name === "Saturn" || p.name === "Jupiter");
  const rows: { name: string; phrase: string; up: boolean }[] = [
    ...favourites.map((p) => ({ name: p.name, phrase: planetPhrase(p, t), up: p.upNow })),
    ...board.map((e) => ({
      name: e.constellation.name, phrase: skyPhrase(e), up: e.status !== "down",
    })),
  ].slice(0, TONIGHT_SLOTS);

  skySlots.forEach((slot, i) => {
    const row = rows[i];
    if (row === undefined) {
      slot.root.style.display = "none";
      return;
    }
    slot.root.style.display = "";
    slot.root.classList.toggle("is-up", row.up);
    slot.name.textContent = row.name;
    slot.when.textContent = row.phrase;
  });

  // Up is not the same as visible: only promise stars once the sky is dark.
  setText("tonight-note", isDarkEnough(sunAltitudeDeg) ? "" : "visible after dark");
  drawAllSky(lst);
}

/* ————— the wandering stars (REQ-007/008, from the Parker walkthrough) ————— */
let planetKey = "";
let planets: readonly PlanetTimes[] = [];

/** The five planets for the displayed minute; searches cached accordingly. */
function planetsNow(t: number): readonly PlanetTimes[] {
  const key = `${Math.floor(t / 60000)}|${station.lat}|${station.lon}`;
  if (key !== planetKey) {
    planetKey = key;
    planets = planetBoard(t, station.lat, station.lon);
  }
  return planets;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

let sunDayKey = "";

/** Today's sunrise/sunset, steady until the date changes (DEC-031, turn 98). */
function drawSunDay(t: number): void {
  const d = new Date(t);
  const key = `${d.toDateString()}|${station.lat}|${station.lon}`;
  if (key === sunDayKey) return;
  sunDayKey = key;
  const sd = sunDay(t, station.lat, station.lon);
  setText("rise", sd.riseUnixMillis === null ? "—" : fmt12(sd.riseUnixMillis));
  setText("set", sd.setUnixMillis === null ? "—" : fmt12(sd.setUnixMillis));
}

let moonDayKey = "";
let moonToday: { riseUnixMillis: number | null; setUnixMillis: number | null } = { riseUnixMillis: null, setUnixMillis: null };

/** Moon rise/set held steady for the displayed calendar day (REQ-008). */
function drawMoonDay(t: number): void {
  const d = new Date(t);
  const key = `${d.toDateString()}|${station.lat}|${station.lon}`;
  if (key === moonDayKey) return;
  moonDayKey = key;
  const md = moonDay(t, station.lat, station.lon);
  moonToday = md;
  if (md.riseUnixMillis === null) {
    setText("moon-times", "no moonrise today");
    return;
  }
  let out = `↑${fmt12c(md.riseUnixMillis)}`;
  if (md.setUnixMillis !== null) {
    const setD = new Date(md.setUnixMillis);
    // The moon often sets on the next date; say so instead of confusing.
    const dayTag = setD.getDate() === d.getDate() ? "" : ` ${WEEKDAY[setD.getDay()] ?? ""}`;
    out += ` · ↓${fmt12c(md.setUnixMillis)}${dayTag}`;
  }
  setText("moon-times", out);
}

/** "rises in 2h 14m · peaks 21:20" — the planning line for one planet. */
function planetPhrase(p: PlanetTimes, t: number): string {
  const next = p.upNow ? p.setUnixMillis : p.riseUnixMillis;
  const verb = p.upNow ? "sets in" : "rises in";
  let out = next === null ? "" : `${verb} ${formatCountdown(next - t)}`;
  if (p.upNow) out += ` · ${Math.round(p.altitudeDeg)}° ${compassAbbrev(p.azimuthDeg)}`;
  if (p.upNow && p.transitUnixMillis !== null && p.setUnixMillis !== null &&
      p.transitUnixMillis < p.setUnixMillis) {
    // ⋆ marks the peak — the culmination Parker plans viewing around.
    out += ` ⋆${fmt12c(p.transitUnixMillis)}`;
  }
  return out;
}

/** Refresh key for the expanded board: minute + station, not every second. */
let allSkyKey = "";

function drawAllSky(lstHours: number): void {
  const host = el("tonight-all");
  if (host === null || host.closest(".tonight")?.classList.contains("open") !== true) return;
  const key = `${Math.floor(lstHours * 60)}|${station.lat}|${station.lon}`;
  if (key === allSkyKey) return;
  allSkyKey = key;

  const t = displayedNow();
  const planetRows = planetsNow(t)
    .map((p) => `<div class="sky-row${p.upNow ? " is-up" : ""}">` +
      `<b class="planet">${p.name}</b><span>${planetPhrase(p, t)}</span></div>`)
    .join("");
  const rows = planetRows + tonightBoard(lstHours, station.lat)
    .filter((e) => e.status !== "never")
    .map((e) => {
      const mz = e.constellation.mazzaroth === true ? ` <i class="mz">★</i>` : "";
      return `<div class="sky-row${e.status === "down" ? "" : " is-up"}">` +
        `<b>${e.constellation.name}${mz}</b><span>${skyPhrase(e)}</span></div>`;
    })
    .join("");
  host.innerHTML = rows;
}

function wireTonightFold(): void {
  const btn = el("tonight-toggle");
  const section = btn?.closest(".tonight");
  btn?.addEventListener("click", () => {
    const open = !(section?.classList.contains("open") ?? false);
    section?.classList.toggle("open", open);
    btn?.setAttribute("aria-expanded", String(open));
    const all = el("tonight-all");
    const foot = document.querySelector(".tonight-foot");
    if (all !== null) all.hidden = !open;
    if (foot instanceof HTMLElement) foot.hidden = !open;
    allSkyKey = ""; // render immediately on open
    draw();
  });
}

/* ————— render ————— */
function draw(): void {
  if (canvas === null || ctx === null) return;
  const t = displayedNow();
  const s = frame(t, station.lat, station.lon);
  const tHours = localHoursOfDay(t);

  // The whole page follows the light: field, stars, and the sun's own
  // colour are keyed to the real solar altitude (DEC-010).
  const pal = skyPalette(s.sun.altitudeDeg);
  document.documentElement.style.setProperty("--print-0", pal.deep);
  document.documentElement.style.setProperty("--print-1", pal.field);

  // The firmament redraws only when the light meaningfully changes.
  const key = `${Math.round(s.sun.altitudeDeg * 2) / 2}|${window.innerWidth}x${window.innerHeight}`;
  if (fctx !== null && key !== skyKey) {
    drawFirmament(fctx, window.innerWidth, window.innerHeight, pal.starAlpha, pal.horizonGlow);
    skyKey = key;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, W);
  drawGrain(ctx, W, W);
  ctx.translate(W / 2, W / 2);

  drawSidereal(ctx, R, DPR, s.siderealHours);
  drawDial(ctx, R, DPR, {
    riseHours: s.sun.nextRiseUnixMillis === null ? null : localHoursOfDay(s.sun.nextRiseUnixMillis),
    setHours: s.sun.nextSetUnixMillis === null ? null : localHoursOfDay(s.sun.nextSetUnixMillis),
  });
  // The sixth hour to the ninth, counted from sunrise as Scripture counts them
  // (Mark 15:33) — so the darkness falls where it actually fell for this
  // station on this date, not at an assumed noon.
  const passion = passionHours(s.sun.dayRiseUnixMillis, s.sun.daySetUnixMillis);
  if (passion !== null) {
    drawPassionHours(
      ctx, R, DPR,
      localHoursOfDay(passion.fromUnixMillis),
      localHoursOfDay(passion.toUnixMillis),
    );
  }

  // The cross the dial turns upon, beneath everything it holds (Col 1:17).
  drawWell(ctx, R);
  // Like everything else here, it follows the light: plain by day, luminous
  // once the sky darkens.
  drawAxis(ctx, R, DPR, 0.55 + 0.45 * pal.starAlpha);
  drawEarth(ctx, R, DPR, hourToAngle(tHours));
  drawMoonUpArc(
    ctx, R, DPR,
    moonToday.riseUnixMillis === null ? null : localHoursOfDay(moonToday.riseUnixMillis),
    moonToday.setUnixMillis === null ? null : localHoursOfDay(moonToday.setUnixMillis),
  );
  drawMoon(ctx, R, DPR, moonDialHours(tHours, s.sun.hourAngleHours, s.moon.hourAngleHours), s.moon.phaseAngleDeg);
  drawSun(ctx, R, DPR, tHours, pal.sunCore);
  // The fiducial marks the hour the observer is actually living in; when
  // time has been scrubbed, the gap to the sun is the distance travelled.
  drawFiducial(ctx, R, DPR, localHoursOfDay(Date.now()), tHours);

  drawSunDay(t);
  const phaseIdx = Math.floor((s.moon.phaseAngleDeg / 360) * 8 + 0.5) % 8;
  setText("moon", `${s.moon.ageDays.toFixed(1)}d ${PHASE_NAMES[phaseIdx] ?? ""}`);
  setText(
    "station",
    `${Math.abs(station.lat).toFixed(1)}°${station.lat >= 0 ? "N" : "S"} ${Math.abs(station.lon).toFixed(1)}°${station.lon >= 0 ? "E" : "W"}`,
  );
  setText("dateline", new Date(t)
    .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase());
  setText("timeline", fmt12s(t));

  // Times are rendered in the device's zone; say so, and say when that is not
  // the clock the station keeps (a New York sunrise on a Chicago clock).
  const zone = zoneReport(t, station.lon);
  setText("zone", zone.label);
  setText("zone-note", zone.mismatched
    ? `readouts in ${zone.label} — ${mismatchPhrase(zone.offsetDeltaHours)}`
    : "");

  const ev = nextSunEvent(s.sun.nextRiseUnixMillis, s.sun.nextSetUnixMillis);
  if (ev !== null) {
    setText("hero-k", ev.kind === "sunset" ? "Sunset in" : "Sunrise in");
    setText("hero-v", formatCountdown(ev.atUnixMillis - t));
  } else {
    setText("hero-k", "Polar day or night");
    setText("hero-v", "");
  }

  const shifted = offsetMillis !== 0;
  el("timeline")?.classList.toggle("shifted", shifted);
  el("now")?.classList.toggle("armed", shifted);

  // The dial, spoken: reached on demand via aria-describedby, so it informs
  // without interrupting.
  setText("sky-transcript", transcript({
    sunAltitudeDeg: s.sun.altitudeDeg,
    sunAzimuthDeg: s.sun.azimuthDeg,
    moonPhaseName: PHASE_NAMES[phaseIdx] ?? "moon",
    moonAgeDays: s.moon.ageDays,
    riseHHMM: s.sun.nextRiseUnixMillis === null ? null : hhmm(s.sun.nextRiseUnixMillis),
    setHHMM: s.sun.nextSetUnixMillis === null ? null : hhmm(s.sun.nextSetUnixMillis),
  }));

  // The masthead verse follows the real calendar day (a daily devotion),
  // not the time-travelled instrument time.
  const verse = verseOfDay(Date.now());
  setText("verse-text", verse.text);
  setText("verse-ref", `${verse.reference} · ${VERSE_VERSION}`);

  drawTonight(s.siderealHours, s.sun.altitudeDeg);
  drawMoonDay(t);

  // The band carries the darkened hours every day; the caption speaks only
  // while they are actually passing. The rest of the time, silence.
  const inPassion = passion !== null &&
    t >= passion.fromUnixMillis && t <= passion.toUnixMillis;
  setText("passion", inPassion && passion !== null
    ? `The sixth hour to the ninth · ${hhmm(passion.fromUnixMillis)}–${hhmm(passion.toUnixMillis)}`
    : "");
}

/* ————— drag the sun to scrub time (REQ-005) ————— */
let dragging = false;
let lastDragHours = 0;

function canvasPoint(e: PointerEvent): { x: number; y: number } | null {
  if (canvas === null) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * DPR - W / 2,
    y: (e.clientY - rect.top) * DPR - W / 2,
  };
}

function wireScrub(): void {
  if (canvas === null) return;
  canvas.addEventListener("pointerdown", (e) => {
    const p = canvasPoint(e);
    if (p === null) return;
    if (hitSun(p.x, p.y, localHoursOfDay(displayedNow()), R)) {
      dragging = true;
      lastDragHours = pointToDialHours(p.x, p.y);
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      e.preventDefault();
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = canvasPoint(e);
    if (p === null) return;
    if (dragging) {
      const cur = pointToDialHours(p.x, p.y);
      offsetMillis += shortestHourDelta(lastDragHours, cur) * 3600000;
      lastDragHours = cur;
      draw();
    } else {
      canvas.style.cursor = hitSun(p.x, p.y, localHoursOfDay(displayedNow()), R)
        ? "grab"
        : "default";
    }
  });
  for (const type of ["pointerup", "pointercancel"] as const) {
    canvas.addEventListener(type, () => {
      dragging = false;
      canvas.style.cursor = "default";
    });
  }
}

/* ————— time-travel controls (REQ-005) ————— */
function stepDisplayed(unit: StepUnit, dir: 1 | -1): void {
  offsetMillis = stepTime(displayedNow(), unit, dir) - Date.now();
  draw();
}

/** The units the screen carries. The engine supports all seven (see
 * timecontrol.ts); the page shows three, because the heavens declaring the
 * glory of God (Psalm 19:1) should not share the room with fourteen buttons.
 * Drag the sun for minutes; hour, day and phase cover the rest. */
const SHOWN_UNITS: ReadonlySet<StepUnit> = new Set(["hour", "day", "month", "phase"]);

function buildSteppers(): void {
  const host = el("steppers");
  if (host === null) return;
  // One control per unit — a labelled cell flanked by its two chevrons.
  for (const { unit, label } of STEP_UNITS.filter((u) => SHOWN_UNITS.has(u.unit))) {
    const group = document.createElement("div");
    group.className = "stepper";

    const back = document.createElement("button");
    back.textContent = "‹";
    back.setAttribute("aria-label", `Back one ${unit}`);
    back.addEventListener("click", () => stepDisplayed(unit, -1));

    const name = document.createElement("span");
    name.textContent = label;

    const fwd = document.createElement("button");
    fwd.textContent = "›";
    fwd.setAttribute("aria-label", `Forward one ${unit}`);
    fwd.addEventListener("click", () => stepDisplayed(unit, 1));

    group.append(back, name, fwd);
    host.appendChild(group);
  }
  el("now")?.addEventListener("click", () => {
    offsetMillis = 0;
    draw();
  });
}

/* ————— station controls (REQ-006) ————— */
function buildStationControls(): void {
  const latInput = el("lat-in") as HTMLInputElement | null;
  const lonInput = el("lon-in") as HTMLInputElement | null;
  const status = el("station-status");
  if (latInput === null || lonInput === null) return;
  latInput.value = String(station.lat);
  lonInput.value = String(station.lon);

  // The coordinates are the control: tap to open the entry, which closes
  // itself once a new station takes (DEC-028 — the readout stays an
  // instrument, not a form).
  const toggle = el("station");
  const cell = toggle?.closest(".r-br");
  const setOpen = (open: boolean): void => {
    cell?.classList.toggle("open", open);
    toggle?.setAttribute("aria-expanded", String(open));
    if (open) latInput.focus();
  };
  toggle?.addEventListener("click", () => {
    setOpen(!(cell?.classList.contains("open") ?? false));
  });

  const apply = (): void => {
    const lat = parseCoordinate(latInput.value, "lat");
    const lon = parseCoordinate(lonInput.value, "lon");
    if (lat === null || lon === null) {
      if (status !== null) status.textContent = lat === null ? "latitude must be -90..90" : "longitude must be -180..180";
      return;
    }
    station = { lat, lon };
    saveStation(station);
    if (status !== null) status.textContent = "";
    setOpen(false);
    draw();
  };
  el("set-station")?.addEventListener("click", apply);
  for (const input of [latInput, lonInput]) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") apply();
    });
  }
  el("locate")?.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      if (status !== null) status.textContent = "geolocation unavailable — enter coordinates";
      return;
    }
    if (status !== null) status.textContent = "locating…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        station = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveStation(station);
        latInput.value = station.lat.toFixed(4);
        lonInput.value = station.lon.toFixed(4);
        if (status !== null) status.textContent = "";
        setOpen(false);
        draw();
      },
      () => {
        if (status !== null) status.textContent = "location denied — enter coordinates";
      },
    );
  });
}

/* ————— boot ————— */
window.addEventListener("resize", () => {
  fit();
  fitFirmament();
  draw();
});

// The stage can change height without the window resizing — a late-loading
// font, or the TONIGHT band growing as its text arrives. Re-fit when it does,
// or the dial keeps a stale size and overlaps its neighbours.
const stage = canvas?.parentElement;
if (stage != null && typeof ResizeObserver !== "undefined") {
  let lastH = 0;
  new ResizeObserver(() => {
    const h = Math.round(stage.getBoundingClientRect().height);
    if (h === lastH) return; // ignore the resize we just caused ourselves
    lastH = h;
    fit();
    draw();
  }).observe(stage);
}
wireTonightFold();
buildTonight();
buildSteppers();
buildStationControls();
wireScrub();
fit();
fitFirmament();
draw();
// The heavens move slowly; for those who ask for reduced motion, the
// instrument follows them once a minute instead of every second.
const cadence = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ? 60000
  : 1000;
setInterval(draw, cadence);
