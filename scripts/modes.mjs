// Drive the three views and prove REQ-013 in a real browser (CHK-005):
//   - first visit opens Day 4; the chosen view is remembered on reload;
//   - the station and the displayed clock are the same in every view,
//     including after time has been travelled;
//   - the selector works by tap and by keyboard (arrows, Home, End);
//   - Day 4's dial comes back at full size after another view was shown.
// Screenshots every view at phone and tablet sizes into the output directory.
//
// usage: node scripts/modes.mjs [http://127.0.0.1:4173/] [outDir]
// Uses the review pipeline's pinned Playwright (npm ci --prefix scripts/review).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
const out = resolve(process.argv[3] ?? "web/.shots/modes");
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
];

const tab = (page, label) => page.getByRole("tab", { name: label, exact: true });
const selectedTab = (page) => page.locator('[role="tab"][aria-selected="true"]').textContent();
const visibleViews = (page) =>
  page.locator(".view:not([hidden])").evaluateAll((nodes) => nodes.map((n) => n.id));
const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});
const shot = async (page, file) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await page.screenshot({ path: resolve(out, file), scale: "css", fullPage: false, animations: "disabled" });
  console.log("shot", file);
};
/** Day 4's readouts and the focused views' context line, for comparison. */
const day4Context = (page) => page.evaluate(() => ({
  station: document.getElementById("station")?.textContent,
  clock: document.getElementById("timeline")?.textContent,
  zone: document.getElementById("zone")?.textContent,
}));
const focusContext = (page) => page.evaluate(() => ({
  station: document.getElementById("focus-station")?.textContent,
  clock: document.getElementById("focus-clock")?.textContent,
  zone: document.getElementById("focus-zone")?.textContent,
}));
const dialCssWidth = (page) => page.evaluate(() => document.getElementById("sky")?.getBoundingClientRect().width);

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
      locale: "en-US", timezoneId: "America/New_York", reducedMotion: "reduce", serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.clock.setFixedTime(new Date(FIXED_TIME));
    await page.addInitScript(() => {
      // First visit: no remembered mode. (Station fixed so the readouts are stable.)
      if (!sessionStorage.getItem("modes-check-seeded")) {
        localStorage.clear();
        localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
        sessionStorage.setItem("modes-check-seeded", "1");
      }
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#tonight-list .lrow").nth(1).waitFor({ state: "visible" });
    await settle(page);

    // 1. First visit opens Day 4, and only Day 4 is in the layout.
    assert.equal(await selectedTab(page), "Day 4", "first visit should open Day 4");
    assert.deepEqual(await visibleViews(page), ["view-day4"]);
    assert.equal(await page.evaluate(() => localStorage.getItem("day4.mode")), null, "nothing saved until chosen");
    const dialBefore = await dialCssWidth(page);
    assert(dialBefore > 200, `dial should be sized on Day 4 (got ${dialBefore})`);
    const day4 = await day4Context(page);
    assert(day4.station && day4.clock, "Day 4 readouts present");
    await shot(page, `${vp.name}-day4.png`);

    // 2. Tap Constellations: its view alone shows, on the same station and clock.
    await tab(page, "Constellations").click();
    assert.equal(await selectedTab(page), "Constellations");
    assert.deepEqual(await visibleViews(page), ["view-constellations"]);
    assert.equal(await page.evaluate(() => localStorage.getItem("day4.mode")), "constellations");
    assert.deepEqual(await focusContext(page), day4, "Constellations must share Day 4's station and clock");
    assert.equal(await page.locator("#focus-context").isVisible(), true);
    await shot(page, `${vp.name}-constellations.png`);

    // 3. Tap Planets: likewise.
    await tab(page, "Planets").click();
    assert.equal(await selectedTab(page), "Planets");
    assert.deepEqual(await visibleViews(page), ["view-planets"]);
    assert.deepEqual(await focusContext(page), day4, "Planets must share Day 4's station and clock");
    await shot(page, `${vp.name}-planets.png`);

    // 4. Reload: the choice is remembered; nothing else changed.
    await page.reload({ waitUntil: "networkidle" });
    await settle(page);
    assert.equal(await selectedTab(page), "Planets", "the chosen view should be remembered on reload");
    assert.deepEqual(await visibleViews(page), ["view-planets"]);
    assert.deepEqual(await focusContext(page), day4, "the remembered view still stands on the same station and clock");

    // 5. Keyboard: the row is one tab stop; arrows walk it, Home/End jump.
    await tab(page, "Planets").focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await selectedTab(page), "Constellations", "ArrowLeft steps back");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Constellations", "focus follows selection");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    assert.equal(await selectedTab(page), "Day 4", "ArrowRight wraps round to Day 4");
    await page.keyboard.press("End");
    assert.equal(await selectedTab(page), "Planets", "End jumps to the last view");
    await page.keyboard.press("Home");
    assert.equal(await selectedTab(page), "Day 4", "Home jumps to Day 4");
    const tabStops = await page.locator('[role="tab"]').evaluateAll((ts) => ts.map((t) => t.tabIndex));
    assert.deepEqual(tabStops, [0, -1, -1], "one tab stop: the selected tab");

    // 6. Back on Day 4 the dial is at full size again, not the hidden-stage size.
    await settle(page);
    const dialAfter = await dialCssWidth(page);
    assert.equal(dialAfter, dialBefore, `dial size should be restored (${dialBefore} -> ${dialAfter})`);

    // 7. Travel a month on Day 4, then switch: the focused view shows the travelled clock.
    await page.getByRole("button", { name: "Forward one month", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#travelled")?.textContent?.includes("October"));
    const travelled = await day4Context(page);
    assert.notEqual(travelled.clock, undefined);
    await tab(page, "Planets").click();
    assert.deepEqual(await focusContext(page), travelled, "travelled time is shared across views");
    assert.equal(await page.locator("#focus-clock").evaluate((e) => e.classList.contains("shifted")), true,
      "the shared clock is marked as travelled, like Day 4's");
    await shot(page, `${vp.name}-planets-travelled.png`);
    await tab(page, "Day 4").click();
    assert.equal(await page.locator("#travelled").textContent(), (await page.locator("#travelled").textContent()));
    assert(/October/.test(await page.locator("#travelled").textContent()), "Day 4 keeps the travelled date after a round trip");

    assert.deepEqual(errors, [], "browser errors");
    await context.close();
    console.log(`${vp.name}: all mode checks passed`);
  }
} finally {
  await browser.close();
}
