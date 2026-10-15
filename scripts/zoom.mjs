// Prove that no point a finger can land on lets iOS Safari double-tap-to-zoom.
// PR #39 gave the controls `touch-action: manipulation`, and Parker (iPhone,
// Safari) confirmed quick taps on buttons stopped zooming — then reported that
// a quick tap that missed the button still zoomed: every blank area, the verse,
// the headings, the ledger gaps and the stage around the dial were still
// `touch-action: auto`. So the rule is the whole page, and this driver samples
// the whole page:
//   - a grid every STEP CSS px across the entire viewport, in every view
//     (Stargazer, Constellations, Planets), with the TONIGHT fold closed and
//     open where the view has one, at the top of the page and again scrolled
//     to the bottom wherever the page scrolls;
//   - at each point, the element the browser would hand the touch to
//     (`elementFromPoint`) must compute `touch-action: manipulation`, or `none`
//     if and only if it is a canvas (the dial and the chart own their gestures);
//   - every ancestor of that element computes `manipulation` too, because the
//     browser intersects the touched element's touch-action with its ancestors'
//     up to the nearest scroll container, and the body is a scroll container on
//     a phone and in Constellations;
//   - the page itself stays zoomable: the viewport meta sets no maximum-scale
//     and no user-scalable=no. Only the double-tap gesture goes.
// The first offending point is reported with its element (tag, id or class, a
// snippet of its text) and its coordinates, so the gap can be found by hand.
//
// usage: node scripts/zoom.mjs [http://127.0.0.1:4173/]
// Uses the review pipeline's pinned Playwright (npm ci --prefix scripts/review).
// ZOOM_BROWSER=webkit runs the same checks in WebKit, the engine iOS uses.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const playwright = createRequire(new URL("./review/package.json", import.meta.url))("playwright");
const engine = playwright[process.env.ZOOM_BROWSER ?? "chromium"];
assert(engine !== undefined, "ZOOM_BROWSER must be chromium, webkit or firefox");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
// A local check only: it seeds storage in the page it drives.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true },
  { name: "phone-large", width: 430, height: 932, isMobile: true },
  { name: "tablet", width: 820, height: 1180, isMobile: false },
];
/** The grid pitch, in CSS px: finer than any gap between two elements on the
 *  page, so a strip of bare body between two ledgers cannot slip through. */
const STEP = 8;
/** The views, by tab label, and whether the view has the TONIGHT fold. */
const VIEWS = [
  { label: "Stargazer", view: "#view-day4", fold: true },
  { label: "Constellations", view: "#view-constellations", fold: false },
  { label: "Planets", view: "#view-planets", fold: false },
];

const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});

/** Every grid point in the viewport, each with the element the browser hands
 *  a touch to and that element's computed touch-action — and its ancestors',
 *  since the browser intersects them. Stops at the first point that would
 *  zoom, and says which element and why. */
const sample = (page) => page.evaluate((STEP) => {
  const actions = new Map();
  const action = (el) => {
    let ta = actions.get(el);
    if (ta === undefined) {
      ta = getComputedStyle(el).touchAction;
      actions.set(el, ta);
    }
    return ta;
  };
  const describe = (el) => {
    const name = el.id !== "" ? `#${el.id}` : el.classList.length > 0 ? `.${[...el.classList].join(".")}` : "";
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `<${el.tagName.toLowerCase()}${name}>${text === "" ? "" : ` "${text}"`}`;
  };
  const allowed = (el) => action(el) === "manipulation" || (action(el) === "none" && el.tagName === "CANVAS");
  let points = 0, canvasPoints = 0;
  const elements = new Set();
  const found = (x, y, el, ancestor) => ({ points, elements: elements.size, canvasPoints,
    offender: { x, y, scrollY: window.scrollY, element: describe(el), touchAction: action(el), ancestor } });
  for (let y = STEP / 2; y < innerHeight; y += STEP) {
    for (let x = STEP / 2; x < innerWidth; x += STEP) {
      const el = document.elementFromPoint(x, y);
      if (el === null) continue;
      points++;
      elements.add(el);
      if (el.tagName === "CANVAS") canvasPoints++;
      if (!allowed(el)) return found(x, y, el, null);
      for (let up = el.parentElement; up !== null; up = up.parentElement) {
        if (action(up) !== "manipulation") return found(x, y, el, `${describe(up)} (touch-action ${action(up)})`);
      }
    }
  }
  return { points, elements: elements.size, canvasPoints, offender: null };
}, STEP);

const fmt = (n) => n.toFixed(1);
const check = (where, s) => {
  if (s.offender !== null) {
    const o = s.offender;
    const why = o.ancestor === null
      ? `${o.element} computes touch-action ${o.touchAction}`
      : `${o.element} sits under ${o.ancestor}`;
    assert.fail(`${where}: a quick tap at (${fmt(o.x)}, ${fmt(o.y)}), scrolled ${fmt(o.scrollY)}px, can zoom: ${why}`);
  }
  assert(s.points > 1000, `${where}: only ${s.points} points sampled`);
  console.log(`  ${where.padEnd(54)} ${String(s.points).padStart(6)} points, ${String(s.elements).padStart(3)} elements, canvas at ${s.canvasPoints}`);
};
/** Top of the page, then the bottom if the page scrolls at all. */
const positions = async (page) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1);
  return scrollable ? ["top", "bottom"] : ["top"];
};
const scrollTo = async (page, position) => {
  await page.evaluate((p) => window.scrollTo(0, p === "top" ? 0 : document.documentElement.scrollHeight), position);
  await settle(page);
  const y = await page.evaluate(() => window.scrollY);
  if (position === "bottom") assert(y > 0, "the page said it scrolls but did not");
  return y;
};

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

    // The page stays zoomable; only the double-tap gesture goes.
    const viewportMeta = await page.evaluate(() => document.querySelector("meta[name=viewport]")?.getAttribute("content") ?? "");
    assert.match(viewportMeta, /width=device-width/, `${vp.name}: the viewport meta no longer fits the device`);
    assert.doesNotMatch(viewportMeta, /user-scalable\s*=\s*(no|0)/i, `${vp.name}: pinch zoom is disabled (user-scalable)`);
    assert.doesNotMatch(viewportMeta, /maximum-scale/i, `${vp.name}: pinch zoom is capped (maximum-scale)`);

    console.log(`\nzoom: ${vp.name} ${vp.width}×${vp.height} — every ${STEP}px, viewport meta "${viewportMeta}"`);
    for (const view of VIEWS) {
      await page.getByRole("tab", { name: view.label, exact: true }).click();
      await page.locator(view.view).waitFor({ state: "visible" });
      if (view.label === "Constellations") {
        await page.waitForFunction(() => document.getElementById("chart-load")?.textContent === "");
      }
      await settle(page);
      for (const fold of view.fold ? ["closed", "open"] : ["none"]) {
        if (fold !== "none") {
          const toggle = page.locator("#tonight-toggle");
          const want = fold === "open" ? "true" : "false";
          if ((await toggle.getAttribute("aria-expanded")) !== want) {
            await toggle.click();
            await page.waitForFunction((w) => document.getElementById("tonight-toggle")?.getAttribute("aria-expanded") === w, want);
            await settle(page);
          }
        }
        for (const position of await positions(page)) {
          const y = await scrollTo(page, position);
          check(`${vp.name} ${view.label}, fold ${fold}, ${position} (scrollY ${fmt(y)})`, await sample(page));
        }
      }
      // Leave the fold closed so the next view starts the same way.
      if (view.fold && (await page.locator("#tonight-toggle").getAttribute("aria-expanded")) === "true") {
        await page.locator("#tonight-toggle").click();
      }
    }
    assert.deepEqual(errors, [], `${vp.name}: browser errors`);
    await context.close();
    console.log(`zoom: ${vp.name} OK`);
  }
} finally {
  await browser.close();
}
