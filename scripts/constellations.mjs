// Drive the Constellations view and prove REQ-015 in a real browser (CHK-005):
//   - chart data is fetched only once a constellation is chosen, never on load;
//   - the view opens on a constellation that is up, its chart drawn with
//     stars, lines and readable names (>= 12px CSS) on the canvas;
//   - Up Now / Rising Later rows are real buttons; tap and keyboard choose;
//   - a rising-later choice says "Below the horizon" and still draws its chart;
//   - a Mazzaroth choice carries the footnote; a never-rising one says so;
//   - the shared station and clock line is present.
// Screenshots the chosen states at phone and tablet sizes.
//
// usage: node scripts/constellations.mjs [http://127.0.0.1:4173/] [outDir]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
const out = resolve(process.argv[3] ?? "web/.shots/constellations");
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
];

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
const chartLoaded = (page) => page.waitForFunction(() => document.getElementById("chart-load")?.textContent === "");
const words = (page) => page.evaluate(() => ({
  title: document.getElementById("chart-title")?.textContent,
  status: document.getElementById("chart-status")?.textContent,
  tracked: document.getElementById("chart-tracked")?.textContent,
  where: document.getElementById("chart-where")?.textContent,
  vis: document.getElementById("chart-vis")?.textContent,
  note: document.getElementById("chart-note")?.textContent,
  load: document.getElementById("chart-load")?.textContent,
}));
/** How many canvas pixels are lit on the chart, and which names were drawn. */
const chartInk = (page) => page.evaluate(() => {
  const c = document.getElementById("chart");
  const ctx = c.getContext("2d");
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let lit = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 40) lit++;
  return { lit, text: window.__chartText.slice() };
});
const chosen = (page) => page.locator('[data-constellation][aria-pressed="true"]');

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
    const chartRequests = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("request", (r) => { if (r.url().includes("/charts/")) chartRequests.push(r.url()); });
    await page.clock.setFixedTime(new Date(FIXED_TIME));
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("sky-check-seeded")) {
        localStorage.clear();
        localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
        sessionStorage.setItem("sky-check-seeded", "1");
      }
      // Record every word drawn on the chart canvas, with its CSS font size.
      window.__chartText = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
        if (this.canvas.id === "chart") {
          const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? "0");
          const scale = this.getTransform().a;
          const entry = `${text}@${(px * scale / (window.devicePixelRatio || 1)).toFixed(1)}`;
          if (!window.__chartText.includes(entry)) window.__chartText.push(entry);
        }
        return original.call(this, text, ...args);
      };
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#tonight-list .lrow").nth(1).waitFor({ state: "visible" });
    await settle(page);
    assert.deepEqual(chartRequests, [], "no chart data is fetched on Day 4");

    /* ————— open the view: a constellation that is up, its chart drawn ————— */
    await page.getByRole("tab", { name: "Constellations", exact: true }).click();
    await page.locator("#view-constellations").waitFor({ state: "visible" });
    assert.equal(await page.locator("#stage").isVisible(), false, "the dial yields to the chart");
    await chartLoaded(page);
    await settle(page);
    assert(chartRequests.length >= 2, "the index and one chart were fetched on choosing");
    const first = await words(page);
    const firstRow = await chosen(page).getAttribute("data-constellation");
    assert(firstRow, "a constellation is chosen on opening");
    assert.equal(first.title.replace(/^★ /, ""), firstRow, "the title names the chosen constellation");
    assert.match(first.status, /^(Up now|Up all night)/, "the opening choice is up");
    assert.match(first.where, /^\d+° up, [a-z]+$/, "direction and altitude shown");
    assert.match(first.tracked, /^tracked by /);
    assert(first.vis.length > 20, "a visibility sentence");
    const ink = await chartInk(page);
    assert(ink.lit > 500, `the chart has stars and lines drawn (${ink.lit} px)`);
    const names = ink.text.filter((t) => !/^[NEW]@/.test(t));
    assert(names.length >= 1, "at least one star name on the chart");
    for (const n of names) assert(parseFloat(n.split("@")[1]) >= 12, `name readable at CSS size: ${n}`);
    console.log(`${vp.name} opens on ${firstRow}: ${first.status} | ${first.where} | ${first.vis} | names ${names.join(", ")}`);
    await shot(page, `${vp.name}-constellations-${firstRow.toLowerCase().replace(/\s+/g, "-")}.png`);

    /* ————— the rows are buttons; tap a Rising Later one ————— */
    const upTags = await page.locator("#sky-up > *").evaluateAll((r) => r.map((e) => e.tagName));
    const risingTags = await page.locator("#sky-rising > *").evaluateAll((r) => r.map((e) => e.tagName));
    assert(upTags.length > 0 && risingTags.length > 0, "both lists populated");
    assert(upTags.every((t) => t === "BUTTON") && risingTags.every((t) => t === "BUTTON"), "every row is a real button");
    const risingRow = page.locator("#sky-rising button").first();
    const risingName = await risingRow.getAttribute("data-constellation");
    await risingRow.click();
    await chartLoaded(page);
    await settle(page);
    const rising = await words(page);
    assert.equal(rising.title.replace(/^★ /, ""), risingName);
    assert.match(rising.status, /^Rises in \d/);
    assert.equal(rising.where, "", "no direction while below the horizon");
    assert.match(rising.vis, /^Below the horizon; rises in the [a-z]+ in \d/);
    assert.equal(await chosen(page).count(), 1, "one chosen row");
    assert((await chartInk(page)).lit > 500, "the rising constellation's chart is drawn too");
    console.log(`${vp.name} rising: ${risingName}: ${rising.status} | ${rising.vis}`);
    await shot(page, `${vp.name}-constellations-rising-${risingName.toLowerCase().replace(/\s+/g, "-")}.png`);

    /* ————— keyboard: Tab to a row, Enter chooses it ————— */
    const target = page.locator("#sky-up button").nth(1);
    const targetName = await target.getAttribute("data-constellation");
    await page.locator("#sky-up button").first().focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.constellation), targetName, "Tab walks the rows");
    await page.keyboard.press("Enter");
    await chartLoaded(page);
    assert.equal((await words(page)).title.replace(/^★ /, ""), targetName, "Enter chooses the focused row");

    /* ————— a Mazzaroth constellation carries the footnote ————— */
    const mz = page.locator("#sky-up button .mz, #sky-rising button .mz").first();
    const mzName = await mz.locator("xpath=ancestor::button").getAttribute("data-constellation");
    await mz.locator("xpath=ancestor::button").click();
    await chartLoaded(page);
    const m = await words(page);
    assert.match(m.title, /^★ /);
    assert.match(m.note, /Mazzaroth/);
    console.log(`${vp.name} mazzaroth: ${mzName}: ${m.status}`);
    await shot(page, `${vp.name}-constellations-${mzName.toLowerCase()}.png`);

    /* ————— the shared station and clock stand under the view ————— */
    const ctx = await page.evaluate(() => ({
      station: document.getElementById("focus-station")?.textContent,
      clock: document.getElementById("focus-clock")?.textContent,
      visible: !document.getElementById("focus-context")?.hidden,
    }));
    assert.equal(ctx.visible, true);
    assert.equal(ctx.station, "40.0°N 74.0°W");
    assert.match(ctx.clock, /^\d{1,2}:\d{2} [ap]m$/);

    // Never-risers are left out of both lists by design (DEC-030); their
    // wording is pinned by the sceneConstellation unit test (Crux from 40°N).

    assert.deepEqual(errors, [], "browser errors");
    await context.close();
    console.log(`${vp.name}: all constellation checks passed`);
  }
} finally {
  await browser.close();
}
