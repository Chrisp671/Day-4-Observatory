/**
 * WI-008 A/B harness (dev only — not part of the production build).
 * Renders the pre-refinement modules and the current ones against the
 * SAME FrameState, so every visible difference is a design decision
 * rather than a difference in sky state.
 */
import { frame } from "./engine/frame";
import { hourToAngle, localHoursOfDay } from "./ui/clockface";
import { drawStars } from "./ui/stars";
import { drawSidereal } from "./ui/sidereal";

import { drawDial as dialBefore } from "./ui-before/dial";
import { drawEarth as earthBefore } from "./ui-before/earth";
import { drawMoon as moonBefore, moonDialHours } from "./ui-before/moon";
import { drawSun as sunBefore } from "./ui-before/sun";

import { drawDial as dialAfter } from "./ui/dial";
import { drawEarth as earthAfter } from "./ui/earth";
import { drawMoon as moonAfter } from "./ui/moon";
import { drawSun as sunAfter } from "./ui/sun";
import { buildGrain, drawGrain } from "./ui/grain";

const STATION = { lat: 40.0, lon: -74.0 };
const WHEN = new Date(2026, 7, 17, 14, 30, 0).getTime();
const DPR = 2;

function render(id: string, after: boolean): void {
  const cv = document.getElementById(id) as HTMLCanvasElement | null;
  const ctx = cv?.getContext("2d") ?? null;
  if (cv === null || ctx === null) return;

  const W = cv.width;
  const R = W * 0.5 * 0.92;
  const s = frame(WHEN, STATION.lat, STATION.lon);
  const tHours = localHoursOfDay(WHEN);
  const times = {
    riseHours: s.sun.nextRiseUnixMillis === null ? null : localHoursOfDay(s.sun.nextRiseUnixMillis),
    setHours: s.sun.nextSetUnixMillis === null ? null : localHoursOfDay(s.sun.nextSetUnixMillis),
  };
  const moonHours = moonDialHours(tHours, s.sun.hourAngleHours, s.moon.hourAngleHours);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, W);
  if (after) {
    buildGrain(ctx);
    drawGrain(ctx, W, W);
  }
  ctx.translate(W / 2, W / 2);

  drawStars(ctx, R, DPR);
  drawSidereal(ctx, R, DPR, s.siderealHours);
  if (after) {
    dialAfter(ctx, R, DPR, times);
    earthAfter(ctx, R, DPR, hourToAngle(tHours));
    moonAfter(ctx, R, DPR, moonHours, s.moon.phaseAngleDeg);
    sunAfter(ctx, R, DPR, tHours);
  } else {
    dialBefore(ctx, R, DPR, times);
    earthBefore(ctx, R, DPR, hourToAngle(tHours));
    moonBefore(ctx, R, DPR, moonHours, s.moon.phaseAngleDeg);
    sunBefore(ctx, R, DPR, tHours);
  }
}

render("before", false);
render("after", true);
