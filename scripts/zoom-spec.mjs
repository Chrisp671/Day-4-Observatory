// Adversarial whole-screen double-tap-zoom check (Parker's iPhone Safari report):
//   - on a phone, a double tap ANYWHERE a finger can land must not trigger the
//     browser's double-tap zoom. Browsers allow double-tap zoom on an element
//     unless its computed CSS touch-action is 'manipulation' or 'none';
//   - for this app every element under any sampled point must therefore have
//     computed touch-action 'manipulation', except <canvas> which may be 'none'
//     (pinch on the dial is the deliberate exception);
//   - pinch-zoom itself must stay available: the viewport meta must NOT contain
//     user-scalable=no or maximum-scale.
// Samples densely (every 10 CSS px) over the whole viewport in every state:
// three modes, the TONIGHT board expanded, the station open, the trouble report
// open, and every scroll position on phones and the tablet. Reports every
// distinct offending element and exits 1 if any exist.
//
// usage: node scripts/zoom-spec.mjs [http://127.0.0.1:4193/]
// Uses the review pipeline's pinned Playwright (npm ci --prefix scripts/review).
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4193/";
// A local check only: it drives the page it is given.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");

const STEP = 10; // CSS px — dense enough to land in margins and gaps between rows
const VIEWPORTS = [
  { name: "phone-390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "phone-430", width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: "tablet-820", width: 820, height: 1180, isMobile: true, hasTouch: true },
];
const MODES = ["Stargazer", "Constellations", "Planets"];

const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});

/** Walk the whole viewport at STEP px and collect every point whose topmost
 *  element still allows double-tap zoom. Runs in the page so 3k+ probes per
 *  state cost one protocol round trip. */
const sampleViewport = (page) => page.evaluate((step) => {
  const offenders = new Map();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const walk = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return; // outside the layout viewport: no element to blame
    const ta = getComputedStyle(el).touchAction;
    // The only two values that suppress double-tap zoom; <canvas> may be 'none'
    // (dial pinch), everything else must be exactly 'manipulation'.
    const allowed = ta === "manipulation" || (ta === "none" && el.tagName === "CANVAS");
    if (allowed) return;
    const rawClass = el.className;
    const cls = typeof rawClass === "string" ? rawClass : (rawClass?.baseVal ?? "");
    const key = `${el.tagName}#${el.id || ""}.${cls || ""}|${ta}`;
    if (!offenders.has(key)) {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
      offenders.set(key, {
        tag: el.tagName,
        id: el.id || "",
        class: cls || "",
        touchAction: ta,
        text,
        x,
        y,
        count: 1,
      });
    } else {
      offenders.get(key).count += 1;
    }
  };
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) walk(x, y);
    walk(w - 1, y); // last column, so the right margin is not skipped
  }
  for (let x = 0; x < w; x += step) walk(x, h - 1);
  walk(w - 1, h - 1);
  return [...offenders.values()];
}, STEP);

/** Sample every scroll position the page offers, in viewport-height steps. */
const sampleAllScrollPositions = async (page) => {
  const results = [];
  const scrollInfo = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  const maxY = Math.max(0, scrollInfo.scrollHeight - scrollInfo.innerHeight);
  const positions = [];
  for (let y = 0; y < maxY; y += scrollInfo.innerHeight) positions.push(y);
  if (positions[positions.length - 1] !== maxY) positions.push(maxY);
  for (const y of positions) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await settle(page);
    const at = await page.evaluate(() => window.scrollY);
    for (const o of await sampleViewport(page)) {
      o.scrollY = at;
      results.push(o);
    }
  }
  return results;
};

const tab = (page, label) => page.getByRole("tab", { name: label, exact: true });
const selectedTab = (page) => page.locator('[role="tab"][aria-selected="true"]').textContent();

/** Switch mode, wait for its view, settle. */
const goMode = async (page, label) => {
  await tab(page, label).click();
  assert.equal(await selectedTab(page), label, `could not switch to ${label}`);
  await settle(page);
};

const covered = [];
const allOffenders = new Map(); // key -> offender (first coordinate kept)

const record = (stateLabel, list) => {
  covered.push(stateLabel);
  for (const o of list) {
    const key = `${o.tag}#${o.id}.${o.class}|${o.touchAction}`;
    if (!allOffenders.has(key)) allOffenders.set(key, { ...o, firstSeenIn: stateLabel });
  }
};

const browser = await chromium.launch();
try {
  // 1. Pinch-zoom must still be allowed: no user-scalable=no, no maximum-scale.
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      deviceScaleFactor: 1, locale: "en-US", timezoneId: "America/New_York", serviceWorkers: "block",
    });
    const page = await context.newPage();
    await page.goto(target.href, { waitUntil: "networkidle" });
    const meta = await page.evaluate(() => {
      const m = document.querySelector('meta[name="viewport"]');
      return m ? m.getAttribute("content") : null;
    });
    console.log(`viewport meta: content="${meta}"`);
    const bad = [];
    if (meta == null) bad.push("missing <meta name=\"viewport\">");
    else {
      if (/user-scalable\s*=\s*no/i.test(meta)) bad.push("contains user-scalable=no");
      if (/maximum-scale/i.test(meta)) bad.push("contains maximum-scale");
    }
    if (bad.length) {
      console.log(`zoom-spec: FAIL viewport meta — ${bad.join("; ")}`);
    } else {
      console.log("viewport meta: pinch-zoom allowed");
    }
    await context.close();
    if (bad.length) process.exitCode = 1;
  }

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile, hasTouch: vp.hasTouch,
      deviceScaleFactor: 1, locale: "en-US", timezoneId: "America/New_York",
      reducedMotion: "reduce", serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
    });
    await page.goto(target.href, { waitUntil: "networkidle" });
    await settle(page);

    for (const mode of MODES) {
      await goMode(page, mode);
      record(`${vp.name}/${mode}/base`, await sampleAllScrollPositions(page));

      if (mode === "Stargazer") {
        // TONIGHT expanded: the full board replaces the short list.
        const toggle = page.locator("#tonight-toggle");
        if (await toggle.isVisible()) {
          await toggle.click();
          assert.equal(await toggle.getAttribute("aria-expanded"), "true", "TONIGHT did not expand");
          await settle(page);
          record(`${vp.name}/${mode}/tonight-open`, await sampleAllScrollPositions(page));
          await toggle.click();
          await settle(page);
        }
        // Station open: location controls drop open under the header.
        const station = page.locator("#station");
        if (await station.isVisible()) {
          await station.click();
          assert.equal(await station.getAttribute("aria-expanded"), "true", "station did not open");
          await settle(page);
          record(`${vp.name}/${mode}/station-open`, await sampleAllScrollPositions(page));
          await station.click();
          await settle(page);
        }
        // Trouble report open.
        const trouble = page.locator("#trouble-open");
        if (await trouble.isVisible()) {
          await trouble.click();
          assert.equal(await trouble.getAttribute("aria-expanded"), "true", "trouble did not open");
          await settle(page);
          record(`${vp.name}/${mode}/trouble-open`, await sampleAllScrollPositions(page));
          await trouble.click();
          await settle(page);
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`states covered (${covered.length}):`);
for (const s of covered) console.log(`  - ${s}`);

const offenders = [...allOffenders.values()].sort((a, b) =>
  a.tag.localeCompare(b.tag) || a.id.localeCompare(b.id) || a.class.localeCompare(b.class) || a.touchAction.localeCompare(b.touchAction));

if (offenders.length === 0) {
  console.log("zoom-spec: OK");
} else {
  console.log(`zoom-spec: FAIL — ${offenders.length} distinct element(s) still allow double-tap zoom:`);
  for (const o of offenders) {
    const id = o.id ? `#${o.id}` : "";
    const cls = o.class ? `.${o.class.split(/\s+/).join(".")}` : "";
    console.log(`  <${o.tag.toLowerCase()}>${id}${cls}`);
    console.log(`    touch-action: ${o.touchAction}  first at (${o.x},${o.y}) scrollY=${o.scrollY ?? 0} in ${o.firstSeenIn}`);
    if (o.text) console.log(`    text: "${o.text}"`);
    console.log(`    hit on ${o.count} sampled point(s) in that state`);
  }
  process.exitCode = 1;
}
