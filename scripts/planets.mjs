// Drive the Planets view and prove REQ-014 in a real browser (CHK-005):
//   - all five planets have a row, in ring order, each a real <button>;
//   - tap and keyboard (Enter, Space) select a row, open its details, light
//     its ring (the dial changes) and remember the choice under day4.lit;
//   - a planet below the horizon keeps its row and says so;
//   - at a polar station a planet with no rise/set keeps its row and explains
//     why its ring is absent;
//   - Day 4's own planet rows — the glance and the expanded programme — are
//     buttons too, and work from the keyboard.
// Screenshots every selected planet at phone and tablet sizes.
//
// usage: node scripts/planets.mjs [http://127.0.0.1:4173/] [outDir]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
const out = resolve(process.argv[3] ?? "web/.shots/planets");
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
const RING_ORDER = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
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
const dial = (page) => page.locator("#sky").evaluate((c) => c.toDataURL());
const lit = (page) => page.evaluate(() => localStorage.getItem("day4.lit"));
const rowButton = (page, name) => page.locator(`#planets-list .prow button[data-planet="${name}"]`);
const rowState = (page, name) => rowButton(page, name).evaluate((b) => ({
  pressed: b.getAttribute("aria-pressed"),
  expanded: b.getAttribute("aria-expanded"),
  detailOpen: !b.nextElementSibling.hidden,
  tag: b.tagName,
}));
const detail = (page, name) => page.locator(`#planet-detail-${name.toLowerCase()}`).evaluate((d) => ({
  rise: d.querySelector(".ptimes span:nth-child(1) b").textContent,
  peak: d.querySelector(".ptimes span:nth-child(2) b").textContent,
  set: d.querySelector(".ptimes span:nth-child(3) b").textContent,
  where: d.querySelector(".pwhere").textContent,
  visibility: d.querySelector(".pvis").textContent,
  arcNote: d.querySelector(".parc").textContent,
}));

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
      if (!sessionStorage.getItem("planets-check-seeded")) {
        localStorage.clear();
        localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
        sessionStorage.setItem("planets-check-seeded", "1");
      }
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#tonight-list .lrow").nth(1).waitFor({ state: "visible" });
    await settle(page);

    /* ————— Day 4: the ledger's planet rows are real buttons ————— */
    const glanceTags = await page.locator("#tonight-list .lrow:not([hidden])").evaluateAll((rows) =>
      rows.map((r) => [r.tagName, r.dataset.planet ?? null, r.getAttribute("aria-pressed")]));
    for (const [tag, planet, pressed] of glanceTags) {
      if (planet !== null) {
        assert.equal(tag, "BUTTON", `glance row for ${planet} is a real button`);
        assert(pressed === "true" || pressed === "false", "glance planet row carries aria-pressed");
      } else {
        assert.equal(tag, "DIV", "constellation glance row is not a button");
      }
    }
    assert.equal(await lit(page), null, "nothing stored on a first visit; Saturn is the default");
    // Keyboard on the glance: focus Jupiter's row, press Enter.
    const jupiter = page.locator('#tonight-list .lrow[data-planet="Jupiter"]');
    await jupiter.focus();
    await page.keyboard.press("Enter");
    assert.equal(await lit(page), "Jupiter", "Enter on a glance row lights its ring");
    assert.equal(await jupiter.getAttribute("aria-pressed"), "true");
    // The programme's expanded rows are buttons too.
    await page.locator("#tonight-toggle").click();
    await page.locator("#tonight-all").waitFor({ state: "visible" });
    const progRows = await page.locator("#tonight-all .lrow").evaluateAll((rows) =>
      rows.map((r) => [r.tagName, r.dataset.planet]));
    assert.deepEqual(progRows.map((r) => r[1]), RING_ORDER, "the programme lists all five planets in ring order");
    assert(progRows.every((r) => r[0] === "BUTTON"), "every expanded planet row is a real button");
    const mercury = page.locator('#tonight-all .lrow[data-planet="Mercury"]');
    await mercury.focus();
    await page.keyboard.press("Space");
    assert.equal(await lit(page), "Mercury", "Space on an expanded row lights its ring");
    await page.locator('#tonight-all .lrow[data-planet="Mercury"]').click(); // rebuilt row: tap releases
    assert.equal(await lit(page), "", "tapping the lit row again releases it");
    await page.locator("#tonight-toggle").click();

    /* ————— Planets view ————— */
    await page.getByRole("tab", { name: "Planets", exact: true }).click();
    await page.locator("#view-planets").waitFor({ state: "visible" });
    assert.equal(await page.locator("#stage").isVisible(), true, "the dial stays with the Planets view");
    const names = await page.locator("#planets-list .prow button").evaluateAll((bs) => bs.map((b) => b.dataset.planet));
    assert.deepEqual(names, RING_ORDER, "five rows, ring order");

    for (const name of RING_ORDER) {
      const before = await dial(page);
      await rowButton(page, name).click();
      await settle(page);
      const state = await rowState(page, name);
      assert.equal(state.tag, "BUTTON");
      assert.deepEqual(state, { pressed: "true", expanded: "true", detailOpen: true, tag: "BUTTON" }, `${name} selected by tap`);
      assert.equal(await lit(page), name, `${name} remembered as the lit ring`);
      const others = await page.locator('#planets-list .prow button[aria-pressed="true"]').count();
      assert.equal(others, 1, "one row selected at a time");
      assert.notEqual(await dial(page), before, `${name}: lighting the ring changed the dial`);
      const d = await detail(page, name);
      for (const k of ["rise", "peak", "set", "visibility"]) assert(d[k], `${name} ${k} present`);
      if (d.where === "") assert.match(d.visibility, /^Below the horizon/, `${name} down: honest`);
      else assert.match(d.visibility, /^Up now/, `${name} up: honest`);
      console.log(`${vp.name} ${name}: ${d.rise} ${d.peak} ${d.set} | ${d.where} | ${d.visibility}${d.arcNote ? " | " + d.arcNote : ""}`);
      await shot(page, `${vp.name}-planets-${name.toLowerCase()}.png`);
    }

    // Keyboard: Enter releases the pressed row, Space presses it again.
    await rowButton(page, "Saturn").focus();
    await page.keyboard.press("Enter");
    assert.equal((await rowState(page, "Saturn")).pressed, "false", "Enter on the lit row releases it");
    assert.equal(await lit(page), "");
    await page.keyboard.press("Space");
    assert.equal((await rowState(page, "Saturn")).pressed, "true", "Space selects it again");
    assert.equal(await lit(page), "Saturn");
    // Tab order walks the five rows.
    await rowButton(page, "Mercury").focus();
    for (const expected of RING_ORDER.slice(1)) {
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.planet), expected, `Tab reaches ${expected}`);
    }

    /* ————— A polar station: rows survive missing rings ————— */
    await page.getByRole("tab", { name: "Day 4", exact: true }).click();
    await page.locator("#station").click();
    await page.locator("#lat-in").fill("85");
    await page.locator("#lon-in").fill("-74");
    await page.locator("#set-station").click();
    await page.waitForFunction(() => document.getElementById("station")?.textContent?.startsWith("85.0°N"));
    // Midsummer at 85°N: the sun and some planets never set.
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Back one month", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#travelled")?.textContent?.includes("June"));
    await page.getByRole("tab", { name: "Planets", exact: true }).click();
    await settle(page);
    const polar = [];
    for (const name of RING_ORDER) {
      await rowButton(page, name).click();
      polar.push({ name, ...(await detail(page, name)) });
    }
    assert.equal(polar.length, 5, "all five rows kept at the polar station");
    const noRing = polar.filter((p) => p.arcNote !== "");
    assert(noRing.length > 0, "at least one planet has no ring at 85°N in June, and says why");
    for (const p of noRing) assert.match(p.arcNote, /^No ring today/, `${p.name} explains its missing ring`);
    console.log(`${vp.name} polar:`, noRing.map((p) => `${p.name}: ${p.arcNote}`).join(" | "));
    await rowButton(page, noRing[0].name).click(); // release
    await rowButton(page, noRing[0].name).click(); // select for the picture
    await shot(page, `${vp.name}-planets-polar-${noRing[0].name.toLowerCase()}.png`);

    assert.deepEqual(errors, [], "browser errors");
    await context.close();
    console.log(`${vp.name}: all planet checks passed`);
  }
} finally {
  await browser.close();
}
