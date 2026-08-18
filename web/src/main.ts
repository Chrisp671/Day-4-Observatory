/**
 * Day4 Observatory — instrument shell.
 * Views per PLAN.md WI-004/005; time travel + station per WI-006 (REQ-005/006).
 */
import { frame } from "./engine/frame";
import { loadStation, parseCoordinate, saveStation, type Station } from "./app/location";
import { formatCountdown, nextSunEvent } from "./app/hero";
import { hitSun, pointToDialHours, shortestHourDelta } from "./app/scrub";
import { STEP_UNITS, stepTime, type StepUnit } from "./app/timecontrol";
import { hourToAngle, localHoursOfDay } from "./ui/clockface";
import { drawDial } from "./ui/dial";
import { drawEarth } from "./ui/earth";
import { buildGrain, drawGrain } from "./ui/grain";
import { drawMoon, moonDialHours } from "./ui/moon";
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
  const box = canvas.parentElement?.getBoundingClientRect();
  if (box === undefined) return;
  // Portrait stack: the dial takes the stage width (with its padding);
  // desktop: fit the square inside the stage.
  const portrait = window.matchMedia("(max-width: 720px)").matches;
  const size = portrait
    ? Math.floor(Math.min(box.width - 32, window.innerHeight * 0.52))
    : Math.floor(Math.min(box.width, box.height));
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

const hhmm = (unixMillis: number): string =>
  new Date(unixMillis).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

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
  drawEarth(ctx, R, DPR, hourToAngle(tHours));
  drawMoon(ctx, R, DPR, moonDialHours(tHours, s.sun.hourAngleHours, s.moon.hourAngleHours), s.moon.phaseAngleDeg);
  drawSun(ctx, R, DPR, tHours, pal.sunCore);

  setText("rise", s.sun.nextRiseUnixMillis === null ? "—" : hhmm(s.sun.nextRiseUnixMillis));
  setText("set", s.sun.nextSetUnixMillis === null ? "—" : hhmm(s.sun.nextSetUnixMillis));
  const phaseIdx = Math.floor((s.moon.phaseAngleDeg / 360) * 8 + 0.5) % 8;
  setText("moon", `${s.moon.ageDays.toFixed(1)}d ${PHASE_NAMES[phaseIdx] ?? ""}`);
  setText(
    "station",
    `${Math.abs(station.lat).toFixed(1)}°${station.lat >= 0 ? "N" : "S"} ${Math.abs(station.lon).toFixed(1)}°${station.lon >= 0 ? "E" : "W"}`,
  );
  setText("dateline", new Date(t)
    .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase());
  setText("timeline", new Date(t).toLocaleTimeString("en-GB", { hour12: false }));

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

function buildSteppers(): void {
  const host = el("steppers");
  if (host === null) return;
  // One control per unit — a labelled cell flanked by its two chevrons —
  // instead of fourteen identical boxes.
  for (const { unit, label } of STEP_UNITS) {
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
buildSteppers();
buildStationControls();
wireScrub();
fit();
fitFirmament();
draw();
setInterval(draw, 1000);
