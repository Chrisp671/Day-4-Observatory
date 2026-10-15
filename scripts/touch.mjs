// Drive the phone controls and prove the two things a thumb found on an iPhone
// (Safari): the arrows were 16px wide and easy to miss, and two quick taps on a
// step button zoomed the page instead of stepping twice.
//   - every control a thumb uses carries `touch-action: manipulation`, so a fast
//     second tap is a tap and not a double-tap-to-zoom; the page itself stays
//     zoomable (the viewport meta sets no maximum-scale, no user-scalable=no);
//   - every such control answers a tap across at least 44×44 CSS px, or across
//     the documented floor where the plinth has no room for 44, and no control's
//     hit box steals from a neighbour's visible box;
//   - five quick taps on a step button advance exactly five steps — none
//     swallowed, none doubled — including taps on the label's half of the cell.
// The hit box is measured, not read from CSS: `elementFromPoint` is probed
// outward from each control's centre until the browser hands the point to
// something else. Screenshots the rail at phone and tablet sizes.
//
// usage: node scripts/touch.mjs [http://127.0.0.1:4173/] [outDir]
// Uses the review pipeline's pinned Playwright (npm ci --prefix scripts/review).
// TOUCH_BROWSER=webkit runs the same checks in WebKit, the engine iOS uses.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const playwright = createRequire(new URL("./review/package.json", import.meta.url))("playwright");
const engine = playwright[process.env.TOUCH_BROWSER ?? "chromium"];
assert(engine !== undefined, "TOUCH_BROWSER must be chromium, webkit or firefox");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
// A local check only: it seeds storage in the page it drives.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");
const out = resolve(process.argv[3] ?? "web/.shots/touch");
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true },
  { name: "phone-large", width: 430, height: 932, isMobile: true },
  { name: "tablet", width: 820, height: 1180, isMobile: false },
];
/** Apple's minimum for a thumb, in CSS px. */
const THUMB = 44;
/** Where the plinth has no 44px to give, the floor each control must still
 *  reach, and why. Everything not listed here must reach THUMB both ways. */
const FLOORS = [
  { match: (c) => c.cell !== null, width: (c) => Math.floor(c.cell / 2) - 1, height: THUMB,
    why: "a stepper owns its half of a cell, and the rail has no width to spare on a phone" },
  { match: (c) => c.id === "tonight-toggle", width: THUMB, height: 22,
    why: "the rail is above and the planets' own rows are directly below" },
  { match: (c) => c.id === "set-station" || c.id === "locate", width: 40, height: 24,
    why: "the station editor stacks its fields 4px apart" },
  { match: (c) => c.tag === "input", width: THUMB, height: 22,
    why: "the station editor's fields are 22px tall and 4px apart" },
  { match: (c) => c.classes.includes("lrow"), width: THUMB, height: 28,
    why: "the tonight rows stack with no room between them" },
];

const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});
const shot = async (page, file) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await page.screenshot({ path: resolve(out, file), scale: "css", fullPage: false, animations: "disabled" });
};
const travelled = (page) => page.locator("#travelled").textContent();
const clock = (page) => page.locator("#timeline").textContent();

/** Every visible control, each with the box the browser actually hands a tap
 *  to: probed outward from the centre along both axes with `elementFromPoint`.
 *  Scrolls each into view first, since the phone page scrolls. */
const measure = (page) => page.evaluate((STEP) => {
  const owns = (el, x, y) => {
    const hit = document.elementFromPoint(x, y);
    return hit !== null && el.contains(hit);
  };
  const probe = (el) => {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!owns(el, cx, cy)) return null;
    let left = cx, right = cx, top = cy, bottom = cy;
    while (left - STEP >= 0 && owns(el, left - STEP, cy)) left -= STEP;
    while (right + STEP <= innerWidth && owns(el, right + STEP, cy)) right += STEP;
    while (top - STEP >= 0 && owns(el, cx, top - STEP)) top -= STEP;
    while (bottom + STEP <= innerHeight && owns(el, cx, bottom + STEP)) bottom += STEP;
    // The last owned sample sits STEP short of the true edge on each side.
    const box = { left, top, right: right + STEP, bottom: bottom + STEP };
    return { box, width: box.right - box.left, height: box.bottom - box.top,
      self: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      scrollY: window.scrollY };
  };
  const controls = [];
  // The error strip (DEC-041) belongs to trouble.mjs; on a healthy page it is
  // hidden, and WebKit opens it on a ResizeObserver notice it raises as an error.
  for (const el of document.querySelectorAll("button, [role=button], [role=tab], input")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || el.disabled || el.closest(".trouble") !== null) continue;
    const cell = el.closest(".cell");
    const m = probe(el);
    controls.push({
      id: el.id, tag: el.tagName.toLowerCase(), classes: [...el.classList],
      label: el.getAttribute("aria-label") ?? (el.id || el.textContent.trim().slice(0, 16)),
      touchAction: getComputedStyle(el).touchAction,
      cell: cell === null ? null : cell.getBoundingClientRect().width,
      // Boxes in page coordinates, so controls probed at different scroll
      // positions can be compared for overlap.
      box: m === null ? null : {
        left: m.box.left, right: m.box.right, top: m.box.top + m.scrollY, bottom: m.box.bottom + m.scrollY },
      self: m === null ? null : {
        left: m.self.left, right: m.self.right, top: m.self.top + m.scrollY, bottom: m.self.bottom + m.scrollY },
      width: m === null ? 0 : m.width, height: m === null ? 0 : m.height,
    });
  }
  window.scrollTo(0, 0);
  const containers = {};
  for (const sel of [".rail", ".cell", ".modes", ".stationbar", ".ledger-h"]) {
    const el = document.querySelector(sel);
    if (el !== null) containers[sel] = getComputedStyle(el).touchAction;
  }
  return { controls, containers, viewportMeta: document.querySelector("meta[name=viewport]")?.getAttribute("content") ?? "" };
}, 0.5);

const fmt = (n) => n.toFixed(1);
const check = (vp, measured) => {
  const { controls, containers, viewportMeta } = measured;
  assert(controls.length >= 16, `${vp}: expected the rail, tabs, station and ledger controls, found ${controls.length}`);

  // The page stays zoomable; only the double-tap gesture goes.
  assert.match(viewportMeta, /width=device-width/, `${vp}: the viewport meta no longer fits the device`);
  assert.doesNotMatch(viewportMeta, /user-scalable\s*=\s*(no|0)/i, `${vp}: pinch zoom is disabled (user-scalable)`);
  assert.doesNotMatch(viewportMeta, /maximum-scale/i, `${vp}: pinch zoom is capped (maximum-scale)`);
  for (const [sel, ta] of Object.entries(containers)) {
    assert.equal(ta, "manipulation", `${vp}: ${sel} lets a quick second tap zoom (touch-action ${ta})`);
  }

  console.log(`\ntouch: ${vp} — hit boxes (CSS px)`);
  for (const c of controls) {
    assert.equal(c.touchAction, "manipulation",
      `${vp}: "${c.label}" lets a quick second tap zoom (touch-action ${c.touchAction})`);
    assert(c.box !== null, `${vp}: "${c.label}" does not answer a tap at its own centre`);
    const floor = FLOORS.find((f) => f.match(c));
    const minW = floor === undefined ? THUMB : floor.width instanceof Function ? floor.width(c) : floor.width;
    const minH = floor === undefined ? THUMB : floor.height;
    const note = floor === undefined ? "" : `  (floor ${minW}×${minH}: ${floor.why})`;
    console.log(`  ${c.label.padEnd(26)} ${fmt(c.width).padStart(6)} × ${fmt(c.height).padEnd(6)}${note}`);
    assert(c.width + 0.01 >= minW && c.height + 0.01 >= minH,
      `${vp}: "${c.label}" answers a tap across ${fmt(c.width)}×${fmt(c.height)}, below ${minW}×${minH}`);
    // Nothing steals from a control's own visible box.
    const s = c.self, b = c.box;
    assert(b.left <= s.left + 1 && b.right >= s.right - 1 && b.top <= s.top + 1 && b.bottom >= s.bottom - 1,
      `${vp}: part of "${c.label}" answers to another control`);
  }
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i].box, b = controls[j].box;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      assert(!(w > 0.5 && h > 0.5),
        `${vp}: "${controls[i].label}" and "${controls[j].label}" overlap by ${fmt(w)}×${fmt(h)}`);
    }
  }
  return controls;
};

await mkdir(out, { recursive: true });
const browser = await engine.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
      hasTouch: true, isMobile: vp.isMobile,
      locale: "en-US", timezoneId: "America/New_York", reducedMotion: "reduce", serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", () => errors.push("uncaught browser error"));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push("browser console error");
    });
    await page.clock.setFixedTime(new Date(FIXED_TIME));
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
    });
    await page.goto(target.href, { waitUntil: "networkidle" });
    await page.locator("#tonight-list .lrow").nth(1).waitFor({ state: "visible" });
    await settle(page);
    await shot(page, `${vp.name}-rail.png`);

    // The station editor is a control a thumb uses too; measure it open.
    await page.locator("#station").click();
    await page.locator("#stationbar").waitFor({ state: "visible" });
    const controls = check(vp.name, await measure(page));
    await page.locator("#station").click();
    await page.locator("#stationbar").waitFor({ state: "hidden" });

    // Five quick taps are five steps. The taps land on the label's half of the
    // cell — the part of the hit box that is new — not on the glyph itself.
    const before = await travelled(page);
    const clockBefore = await clock(page);
    assert.equal(before, "", `${vp.name}: the page starts travelled`);
    // Geometry read at tap time: closing the editor moved the rail.
    const tapAt = async (name, side) => {
      const point = await page.evaluate(([label, s]) => {
        const b = [...document.querySelectorAll("button")].find((el) => el.getAttribute("aria-label") === label);
        b.scrollIntoView({ block: "center" });
        const cell = b.closest(".cell").getBoundingClientRect();
        // 3px past the cell's midline, on the label: the half that is new.
        return { x: cell.left + cell.width / 2 + 3 * s, y: cell.top + cell.height / 2 };
      }, [name, side]);
      for (let i = 0; i < 5; i++) await page.touchscreen.tap(point.x, point.y);
    };
    await tapAt("Forward one day", +1);
    await page.waitForTimeout(300);
    assert.equal(await travelled(page), "Monday, September 7",
      `${vp.name}: five quick taps forward did not advance exactly five days (${await travelled(page)})`);
    assert.equal(await clock(page), clockBefore, `${vp.name}: stepping a day moved the hour`);
    await tapAt("Back one day", -1);
    await page.waitForTimeout(300);
    assert.equal(await travelled(page), "", `${vp.name}: five quick taps back did not return (${await travelled(page)})`);
    await page.evaluate(() => window.scrollTo(0, 0));

    assert.deepEqual(errors, [], `${vp.name}: browser errors`);
    await context.close();
    console.log(`touch: ${vp.name} OK`);
  }
} finally {
  await browser.close();
}
