// Drive error reporting and prove DEC-041 in a real browser:
//   - a working page carries NO error UI at all;
//   - an uncaught error and an unhandled rejection both raise the affordance;
//   - the composed report says what broke, which build, and which browser;
//   - the report contains no identifier, no location, and no storage key;
//   - NOTHING is transmitted. Watch the network for the whole run and assert the
//     app issued no request it did not already make on a clean page.
//
// usage: node scripts/trouble.mjs [http://127.0.0.1:4173/] [outDir]
// Uses the review pipeline's pinned Playwright (npm ci --prefix scripts/review).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
// A local check only: it throws inside the page it drives, on purpose.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");
const out = resolve(process.argv[3] ?? "web/.shots/trouble");
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
];

const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});
const shot = async (page, file) => {
  await settle(page);
  await page.screenshot({ path: resolve(out, file), scale: "css", fullPage: false, animations: "disabled" });
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const viewport of VIEWPORTS) {
  // A fresh context per viewport, and the request log compared against a clean
  // page's, so "nothing was transmitted" is a measurement rather than a promise.
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1, locale: "en-US", timezoneId: "America/New_York",
    reducedMotion: "reduce", serviceWorkers: "block",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(target.href, { waitUntil: "networkidle" });
  await page.locator("#tonight-list .lrow").nth(1).waitFor({ state: "visible" });
  await settle(page);
  const cleanRequests = [...requests];

  // 1. A working page shows no error UI whatsoever.
  assert.equal(await page.locator("#trouble").isHidden(), true,
    `${viewport.name}: the error strip is visible on a healthy page`);
  assert.equal(await page.locator("#trouble").getAttribute("hidden"), "",
    `${viewport.name}: #trouble is not hidden on a healthy page`);

  // 2. An uncaught error raises it, and the strip says something human.
  await page.evaluate(() => {
    setTimeout(() => { throw new Error("deliberate failure from the driver"); }, 0);
  });
  await page.locator("#trouble").waitFor({ state: "visible" });
  const note = await page.locator("#trouble-note").textContent();
  assert.match(note, /something went wrong/i, `${viewport.name}: the note is not human: "${note}"`);

  // 3. An unhandled rejection is caught too, and the count grows.
  await page.evaluate(() => { Promise.reject(new Error("deliberate rejection")); });
  await page.waitForFunction(
    () => (document.querySelector("#trouble-note")?.textContent ?? "").includes("2 things"),
    undefined,
    { timeout: 5000 },
  );

  // 4. Opening the panel composes the report, and it is a real bug report.
  await page.locator("#trouble-open").click();
  await page.locator("#trouble-report").waitFor({ state: "visible" });
  assert.equal(await page.locator("#trouble-open").getAttribute("aria-expanded"), "true");
  const report = await page.locator("#trouble-text").inputValue();
  assert.match(report, /deliberate failure from the driver/, `${viewport.name}: the thrown error is missing`);
  assert.match(report, /deliberate rejection/, `${viewport.name}: the rejected promise is missing`);
  assert.match(report, /^Build: /m, `${viewport.name}: the report does not name a build`);
  assert.match(report, /^Browser: /m, `${viewport.name}: the report does not name a browser`);
  assert.match(report, /^When: /m, `${viewport.name}: the report has no timestamp`);
  // The build must be the real one: this preview serves a content-hashed bundle.
  const bundle = cleanRequests.find((u) => /\/assets\/index-[\w-]+\.js$/.test(u));
  assert(bundle, `${viewport.name}: no bundled script found to compare the build against`);
  const hash = /index-([\w-]+)\.js$/.exec(bundle)[1];
  assert(report.includes(hash), `${viewport.name}: the report names the wrong build (wanted ${hash})`);
  await shot(page, `${viewport.name}-report.png`);

  // 5. The privacy clauses, on the text the visitor would actually send.
  const lower = report.toLowerCase();
  for (const forbidden of ["latitude", "longitude", "localstorage", "cookie", "referrer", "day4-observatory.station"]) {
    assert(!lower.includes(forbidden), `${viewport.name}: the report leaks ${forbidden}`);
  }
  assert(!/\d{2}\.\d{4,}\s*,\s*-\d{2,}/.test(report),
    `${viewport.name}: the report contains something shaped like a coordinate`);

  // 6. Nothing was transmitted. The only new requests are the ones our own
  //    deliberate failure provoked inside the page — which is none.
  const added = requests.filter((u) => !cleanRequests.includes(u));
  assert.deepEqual(added, [], `${viewport.name}: the app made a request after a failure: ${added.join(", ")}`);

  // 7. The strip is honest that it sent nothing.
  assert.match(await page.locator(".trouble-hint").textContent(), /nothing was sent/i);

  // 8. DISMISS is a real exit (DEC-052). Copying is how a visitor takes the
  //    report away; declining to is a different act, and one the visitor is
  //    entitled to. Without it the notice is unremovable for the session.
  //
  //    The count is checked on a *second* error first, so that the dismissal
  //    below has to drop a strip whose count is visibly non-zero. Asserting only
  //    "it disappeared" would be satisfied by a strip that was never told to show
  //    in the first place, which is the mutation this caught.
  await page.evaluate(() => {
    setTimeout(() => { throw new Error("second deliberate failure"); }, 0);
  });
  await page.waitForFunction(
    () => (document.querySelector("#trouble-note")?.textContent ?? "").includes("3 things"),
    undefined,
    { timeout: 5000 },
  );
  await page.locator("#trouble-dismiss").click();
  await page.locator("#trouble").waitFor({ state: "hidden" });
  assert.equal(await page.locator("#trouble").isHidden(), true,
    `${viewport.name}: DISMISS left the notice up`);
  // Dismissing must also close the panel, or an expanded, focusable report is
  // stranded behind a hidden parent and reachable by keyboard alone.
  assert.equal(await page.locator("#trouble-open").getAttribute("aria-expanded"), "false",
    `${viewport.name}: DISMISS left the report panel marked open`);

  // 9. And it re-arms: a LATER failure raises a fresh strip counting only what
  //    happened after the dismissal, not tallying the dismissed ones again.
  await page.evaluate(() => {
    setTimeout(() => { throw new Error("third deliberate failure"); }, 0);
  });
  await page.locator("#trouble").waitFor({ state: "visible" });
  const freshNote = await page.locator("#trouble-note").textContent();
  assert.match(freshNote, /something went wrong/i, `${viewport.name}: the strip did not come back`);
  assert(!/things went wrong/.test(freshNote),
    `${viewport.name}: the dismissed failures are still being counted: "${freshNote}"`);
  await page.locator("#trouble-open").click();
  await page.locator("#trouble-report").waitFor({ state: "visible" });
  const second = await page.locator("#trouble-text").inputValue();
  assert.match(second, /third deliberate failure/, `${viewport.name}: the new failure is not in the report`);
  assert(!second.includes("deliberate rejection"),
    `${viewport.name}: a dismissed failure is still in the report`);

  // 10. Still nothing transmitted, after all of that.
  const addedAfter = requests.filter((u) => !cleanRequests.includes(u));
  assert.deepEqual(addedAfter, [], `${viewport.name}: a request was made after dismiss: ${addedAfter.join(", ")}`);

  await context.close();
  console.log(`trouble: ${viewport.name} OK`);
}
await browser.close();