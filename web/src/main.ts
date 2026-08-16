/**
 * Day4 Observatory — instrument shell.
 * Views per PLAN.md WI-004/005; time travel + station per WI-006 (REQ-005/006).
 */
import { frame } from "./engine/frame";
import { loadStation, parseCoordinate, saveStation, type Station } from "./app/location";
import { STEP_UNITS, stepTime, type StepUnit } from "./app/timecontrol";
import { hourToAngle, localHoursOfDay } from "./ui/clockface";
import { drawDial } from "./ui/dial";
import { drawEarth } from "./ui/earth";
import { buildGrain, drawGrain } from "./ui/grain";
import { drawMoon, moonDialHours } from "./ui/moon";
import { drawSidereal } from "./ui/sidereal";
import { drawStars } from "./ui/stars";
import { drawSun } from "./ui/sun";

/* ————— state ————— */
let station: Station = loadStation();
/** Time-travel offset: displayed time = real now + offset. 0 = live. */
let offsetMillis = 0;

const displayedNow = (): number => Date.now() + offsetMillis;

/* ————— canvas ————— */
const canvas = document.getElementById("sky") as HTMLCanvasElement | null;
const ctx = canvas?.getContext("2d") ?? null;
let W = 0;
let R = 0;
let DPR = 1;

function fit(): void {
  if (canvas === null) return;
  const box = canvas.parentElement?.getBoundingClientRect();
  if (box === undefined) return;
  const size = Math.floor(Math.min(box.width, box.height));
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

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, W);
  drawGrain(ctx, W, W);
  ctx.translate(W / 2, W / 2);

  drawStars(ctx, R, DPR);
  drawSidereal(ctx, R, DPR, s.siderealHours);
  drawDial(ctx, R, DPR, {
    riseHours: s.sun.nextRiseUnixMillis === null ? null : localHoursOfDay(s.sun.nextRiseUnixMillis),
    setHours: s.sun.nextSetUnixMillis === null ? null : localHoursOfDay(s.sun.nextSetUnixMillis),
  });
  drawEarth(ctx, R, DPR, hourToAngle(tHours));
  drawMoon(ctx, R, DPR, moonDialHours(tHours, s.sun.hourAngleHours, s.moon.hourAngleHours), s.moon.phaseAngleDeg);
  drawSun(ctx, R, DPR, tHours);

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

  const shifted = offsetMillis !== 0;
  el("timeline")?.classList.toggle("shifted", shifted);
  el("now")?.classList.toggle("armed", shifted);
}

/* ————— time-travel controls (REQ-005) ————— */
function stepDisplayed(unit: StepUnit, dir: 1 | -1): void {
  offsetMillis = stepTime(displayedNow(), unit, dir) - Date.now();
  draw();
}

function buildStepButtons(): void {
  const back = el("back");
  const fwd = el("fwd");
  if (back === null || fwd === null) return;
  // Back buttons mirror the original's layout: largest unit outermost.
  for (const { unit, label } of [...STEP_UNITS].reverse()) {
    const b = document.createElement("button");
    b.textContent = `‹${label}`;
    b.setAttribute("aria-label", `Back one ${unit}`);
    b.addEventListener("click", () => stepDisplayed(unit, -1));
    back.appendChild(b);
  }
  for (const { unit, label } of STEP_UNITS) {
    const b = document.createElement("button");
    b.textContent = `${label}›`;
    b.setAttribute("aria-label", `Forward one ${unit}`);
    b.addEventListener("click", () => stepDisplayed(unit, 1));
    fwd.appendChild(b);
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
  draw();
});
buildStepButtons();
buildStationControls();
fit();
draw();
setInterval(draw, 1000);
