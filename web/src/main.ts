/**
 * Day4 Observatory — the instrument, assembled.
 *
 * Three parts, and this file only joins them (DEC-037):
 *   - scene(): everything the page shows, computed and worded (app/scene.ts).
 *   - the shell: DOM binding and input (app/shell.ts).
 *   - the painters: pure functions of a Scene slice (ui/*).
 * State here is exactly what the viewer can change: the station, the travel
 * offset, the lit ring, and the mode. Nothing else is remembered.
 */
import { scene, type Scene } from "./app/scene";
import { bind, type Stage } from "./app/shell";
import { loadStation, saveStation, type Station } from "./app/location";
import { loadMode, saveMode, type Mode } from "./app/mode";
import { chartLoader, type Chart } from "./app/charts";
import { drawChart } from "./ui/chart";
import { stepTime, type StepUnit } from "./app/timecontrol";
import { drawDial } from "./ui/dial";
import { drawEarth } from "./ui/earth";
import { drawFiducial } from "./ui/fiducial";
import { drawFirmament } from "./ui/firmament";
import { drawGrain } from "./ui/grain";
import { drawGround } from "./ui/ground";
import { drawMoon } from "./ui/moon";
import { drawAxis, drawPassionHours, drawWell } from "./ui/passion";
import { drawRete } from "./ui/planetarcs";
import { drawSun } from "./ui/sun";

/* ————— what the viewer can change ————— */
let station: Station = loadStation();
/** Time-travel offset: displayed time = real now + offset. 0 = live. */
let offsetMillis = 0;

const LIT_KEY = "day4.lit";
/** The one ring lit on the rete, remembered across visits; Saturn to begin. */
let lit: string | null = (() => {
  try {
    const v = localStorage.getItem(LIT_KEY);
    return v === null ? "Saturn" : v === "" ? null : v;
  } catch {
    return "Saturn";
  }
})();

/** Which view is showing: Day 4 on a first visit, then whatever was chosen
 * last. The station and the travel offset are shared by every view. */
let mode: Mode = loadMode();

/** The constellation chosen in the Constellations view; the first one up
 * when the view is first opened. Its chart is fetched only then. */
let chart: string | null = null;
const charts = chartLoader("charts/");
let chartData: Chart | null = null;
let chartDataFor: string | null = null;

/* ————— the shell ————— */
const shell = bind(document, {
  onStep: (unit: StepUnit, dir: 1 | -1) => {
    offsetMillis = stepTime(Date.now() + offsetMillis, unit, dir) - Date.now();
    tick();
  },
  onNow: () => {
    offsetMillis = 0;
    tick();
  },
  onStation: (next: Station) => {
    station = next;
    saveStation(station);
    shell.stationStatus("");
    tick();
  },
  onLocate: () => {
    if (!("geolocation" in navigator)) {
      shell.stationStatus("geolocation unavailable — enter coordinates");
      return;
    }
    shell.stationStatus("locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        station = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveStation(station);
        shell.showStation(station);
        shell.stationStatus("");
        tick();
      },
      () => shell.stationStatus("location denied — enter coordinates"),
    );
  },
  onLit: (name: string | null) => {
    lit = name;
    try {
      localStorage.setItem(LIT_KEY, name ?? "");
    } catch {
      /* private mode: the choice simply does not persist */
    }
    tick();
  },
  onScrub: (deltaHours: number) => {
    offsetMillis += deltaHours * 3600000;
    tick();
  },
  onResize: () => {
    stage = shell.fit();
    firmamentKey = "";
    tick();
  },
  onMode: (next: Mode) => {
    mode = next;
    saveMode(mode);
    shell.showMode(mode);
    // Day 4's stage may have just come back into the layout: refit before painting.
    stage = shell.fit();
    if (mode === "constellations" && chart === null) {
      // Open on something: the first constellation that is up right now.
      const up = currentScene().tonight.programme[1]?.rows[0];
      if (up !== undefined) chooseChart(up.name);
    }
    tick();
  },
  onChart: (name: string) => {
    chooseChart(name);
    tick();
  },
});

/** Choose a constellation and fetch its chart if it is not already here. */
function chooseChart(name: string): void {
  chart = name;
  if (chartDataFor === name) return;
  chartData = null;
  chartDataFor = null;
  shell.chartStatus("loading chart…");
  void charts.load(name).then((data) => {
    if (chart !== name) return; // the viewer has moved on
    chartData = data;
    chartDataFor = name;
    shell.chartStatus(data === null ? "no chart for this one" : "");
    tick();
  });
}

shell.showMode(mode);
let stage: Stage = shell.fit();
let firmamentKey = "";

/* ————— the painters, in paint order ————— */
function paint(s: Scene): void {
  const { dial: ctx, firmament: fctx, W, R, dpr, viewport } = stage;

  // The firmament redraws only when the light meaningfully changes.
  const key = `${s.light.key}|${viewport.width}x${viewport.height}`;
  if (fctx !== null && key !== firmamentKey) {
    drawFirmament(fctx, viewport.width, viewport.height, s.light);
    firmamentKey = key;
  }
  // No dial to paint while another view is showing and the stage has never been sized.
  if (ctx === null || W === 0) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, W);
  drawGrain(ctx, W, W);
  ctx.translate(W / 2, W / 2);

  drawGround(ctx, R, dpr, s.light);
  drawDial(ctx, R, dpr, s.band);
  drawPassionHours(ctx, R, dpr, s.band);
  drawWell(ctx, R);
  drawAxis(ctx, R, dpr, s.light);
  drawEarth(ctx, R, dpr, s.earth);
  drawRete(ctx, R, dpr, s.rete);
  drawMoon(ctx, R, dpr, s.moon);
  drawSun(ctx, R, dpr, s.sun);
  drawFiducial(ctx, R, dpr, s.marks);
}

/** The constellation chart, when one is chosen and loaded. */
function paintChart(): void {
  const { chart: cctx, chartW, dpr } = stage;
  if (cctx === null || chartW === 0) return;
  cctx.setTransform(1, 0, 0, 1, 0, 0);
  cctx.clearRect(0, 0, chartW, chartW);
  if (chartData !== null && chartDataFor === chart) drawChart(cctx, chartW, dpr, chartData);
}

/** The Scene for the displayed instant; memoised inside, so cheap to ask twice. */
function currentScene(): Scene {
  const now = Date.now();
  return scene({
    displayedUnixMillis: now + offsetMillis,
    nowUnixMillis: now,
    station,
    lit,
    chart,
  });
}

/* ————— one tick: compute, paint, bind ————— */
function tick(): void {
  const s = currentScene();
  paint(s);
  paintChart();
  shell.paint(s);
}

/* ————— boot ————— */
shell.showStation(station);
tick();
// The heavens move slowly; for those who ask for reduced motion, the
// instrument follows them once a minute instead of every second.
const cadence = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 60000 : 1000;
setInterval(tick, cadence);
