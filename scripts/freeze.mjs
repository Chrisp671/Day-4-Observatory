// Drive the frozen clock and prove DEC-051 in a real browser:
//   - HOLD is a real button that says what it does, in words a screen reader reads;
//   - freezing stops the clock: the readout holds and the dial stops repainting,
//     well past the 1s live cadence;
//   - the controls stay live while frozen, which is the owner's whole point —
//     stepping and scrubbing move the frozen sky, and neither releases the hold;
//   - releasing returns to live and the interval takes over again.
// Screenshots each state at phone and tablet sizes.
//
// usage: node scripts/freeze.mjs [http://127.0.0.1:4173/] [outDir]
// Uses the review pipeline's pinned Playwright (npm ci --prefix scripts/review).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
// A local check only: it seeds storage and reads canvas pixels in the page it drives.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");
const out = resolve(process.argv[3] ?? "web/.shots/freeze");
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
];
/** Longer than the 1s live cadence and the 60s reduced-motion one, so a sky that
 *  is still moving is caught rather than assumed to have ticked between reads. */
const DWELL_MS = 2500;

const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});
const shot = async (page, file) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await page.screenshot({ path: resolve(out, file), scale: "css", fullPage: false, animations: "disabled" });
};
const clock = (page) => page.locator("#timeline").textContent();
const pressed = (page) => page.locator("#freeze").getAttribute("aria-pressed");
/** The dial as a fingerprint of its own pixels: a repainted dial changes its
 *  hash even when the clock text has not. Hashing rather than holding buffers
 *  keeps this cheap and makes the comparison a one-liner. */
const dial = async (page) => createHash("sha256").update(await page.locator("#sky").screenshot()).digest("hex");

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1, locale: "en-US", timezoneId: "America/New_York",
    reducedMotion: "reduce", serviceWorkers: "block",
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
  await page.locator("#freeze").waitFor({ state: "visible" });
  await settle(page);

  // It is a real button, and it says what it does both ways.
  assert.equal(await page.locator("#freeze").textContent(), "HOLD", `${viewport.name}: the control is not labelled HOLD`);
  assert.equal(await pressed(page), "false", `${viewport.name}: HOLD starts pressed`);
  assert.match(await page.locator("#freeze").getAttribute("aria-label"), /hold/i,
    `${viewport.name}: HOLD does not say it holds`);
  await shot(page, `${viewport.name}-live.png`);

  const before = await clock(page);

  // Freeze: the clock stops and the dial stops repainting. The baseline is the
  // dial *after* the freeze settles, not before it — freezing repaints once (it
  // latches a button and captures a new instant), so comparing to the pre-freeze
  // frame would assert that pressing a button changes no pixels, which is false.
  await page.locator("#freeze").click();
  assert.equal(await pressed(page), "true", `${viewport.name}: HOLD did not latch`);
  assert.match(await page.locator("#freeze").getAttribute("aria-label"), /run again/i,
    `${viewport.name}: HOLD still claims to hold once it is held`);
  await shot(page, `${viewport.name}-frozen.png`);
  await page.waitForTimeout(300);
  const frozenAt = await clock(page);
  const dialFrozen = await dial(page);
  await page.waitForTimeout(DWELL_MS);
  assert.equal(await clock(page), frozenAt, `${viewport.name}: the clock moved while frozen`);
  assert.equal(await dial(page), dialFrozen, `${viewport.name}: the dial repainted while frozen`);

  // The controls stay live — a frozen sky is something you explore.
  await page.getByRole("button", { name: "Forward one hour", exact: true }).click();
  await page.waitForTimeout(300);
  assert.notEqual(await clock(page), frozenAt, `${viewport.name}: stepping did nothing while frozen`);
  assert.equal(await pressed(page), "true", `${viewport.name}: stepping released the hold`);
  assert.notEqual(await dial(page), dialFrozen, `${viewport.name}: the dial did not follow the step`);
  await shot(page, `${viewport.name}-frozen-stepped.png`);

  // And it stays held after the step, across another dwell.
  const stepped = await clock(page);
  await page.waitForTimeout(DWELL_MS);
  assert.equal(await clock(page), stepped, `${viewport.name}: the clock drifted after a step while frozen`);

  // Release returns to live. Under `setFixedTime` the real clock does not advance,
  // so "live" cannot be shown by the text moving; what it *can* show is that the
  // release returns the dial to the present rather than leaving it at the frozen
  // instant we stepped away from. The unit tests own the "the interval resumes"
  // clause, which needs a clock that actually ticks.
  await page.locator("#freeze").click();
  assert.equal(await pressed(page), "false", `${viewport.name}: HOLD did not release`);
  assert.match(await page.locator("#freeze").getAttribute("aria-label"), /hold/i,
    `${viewport.name}: the released control no longer says it holds`);
  await page.waitForTimeout(300);
  // The clock returning to the present IS the release clause. The dial's exact
  // pixels across a release are not asserted: the same instant reached live and
  // reached frozen differ in the header's `.shifted`/`.armed` state (travelled
  // is true frozen, false live), and chasing pixel-identity there would be
  // testing paint determinism, not freezing. What must hold is that the sky is
  // the present's sky again — and that the step's hour is gone, which the clock
  // assertion above already proves.
  assert.equal(await clock(page), before, `${viewport.name}: releasing did not return to the present`);
  await shot(page, `${viewport.name}-released.png`);

  // NOW, pressed while the clock is *held*, must release and return to the present.
  // It used to clear only the travel offset, which a held clock ignores: the button
  // stayed dressed as `.armed`, looked live, and repainted the same pinned instant.
  // Nothing caught that because the driver only ever released through HOLD, and the
  // pure module cannot see a click handler. This clause is the one that bites.
  await page.locator("#freeze").click();
  assert.equal(await pressed(page), "true", `${viewport.name}: could not re-hold for the NOW check`);
  await page.getByRole("button", { name: "Forward one hour", exact: true }).click();
  await page.waitForTimeout(300);
  assert.equal(await pressed(page), "true", `${viewport.name}: stepping released the hold before NOW`);
  const heldAway = await clock(page);
  assert.notEqual(heldAway, before, `${viewport.name}: the step did not move the held clock`);

  await page.getByRole("button", { name: "Return to the present", exact: true }).click();
  await page.waitForTimeout(300);
  assert.equal(await pressed(page), "false",
    `${viewport.name}: NOW did not release the hold, so it promised a present it could not reach`);
  assert.equal(await clock(page), before,
    `${viewport.name}: NOW did not return to the present while held`);
  await shot(page, `${viewport.name}-now-from-held.png`);

  assert.deepEqual(errors, [], `${viewport.name}: browser errors`);
  await context.close();
  console.log(`freeze: ${viewport.name} OK`);
}
await browser.close();