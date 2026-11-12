// Drive the chart's night disc (DEC-056) in a real browser and prove what the
// owner saw on his iPhone is gone:
//   - inside the disc the page shows nothing but the chart: every pixel of the
//     page within the rim is the chart canvas's own pixel, at noon as at
//     midnight, so no firmament star, glyph or haze and no daylight blue
//     reaches the chart;
//   - the disc is the sky's night (dark Prussian, never daylight blue), and
//     its interior is identical at noon and at midnight for the same figure;
//   - every name on the chart is plain words — no "Beta Sct" — at 12 px or
//     more, every name lies inside the disc, and no name runs into another
//     or into a compass letter;
//   - the three compass letters are drawn, and the page does not overflow
//     sideways.
// At 320, 390 and 820 wide and on an iPad in both orientations, with the
// clock held at a September noon and the midnight after it. Screenshots the
// first figure at each size and instant.
//
// usage: node scripts/chart-disc.mjs [http://127.0.0.1:4173/] [outDir]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
// A local check only: it seeds storage in the page it drives.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");
const out = resolve(process.argv[3] ?? "web/.shots/chart-disc");
/** Local noon and the midnight after it at the seeded station (New York). */
const INSTANTS = [
  { name: "noon", iso: "2026-09-02T16:00:00.000Z" },
  { name: "midnight", iso: "2026-09-03T04:00:00.000Z" },
];
const VIEWPORTS = [
  { name: "phone-320", width: 320, height: 640, isMobile: true },
  { name: "phone-390", width: 390, height: 844, isMobile: true },
  { name: "ipad-820", width: 820, height: 1180, isMobile: false },
  { name: "ipad-landscape", width: 1180, height: 820, isMobile: false },
];
/** The disc's geometry as ui/chart.ts has it (a driver cannot import TypeScript). */
const DISC = { inset: 8, labelH: 14, compassPx: 12 };
/** A Bayer abbreviation left on the chart: a Greek letter and three letters. */
const ABBREVIATED = /\b(Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega)\d*\s+[A-Z][A-Za-z]{2}\b$/;
const BAYER_NAME = /^[A-Z][a-z]+\d* [A-Z][A-Za-z]{2}$/;
/** How dark a disc pixel must be to count as the night (the field is 14,36,64; the rim's deep 8,22,39). */
const isNight = (r, g, b) => r <= 24 && g <= 48 && b <= 80;
/** The page's daylight blue (36,80,128) and its neighbours. */
const isDaylight = (r, g, b) => r < 60 && g > 60 && b > 100;

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
const listed = (page) => page.evaluate(() =>
  [...document.querySelectorAll("#sky-up button[data-constellation], #sky-rising button[data-constellation]")]
    .map((b) => b.dataset.constellation));
const openChart = async (page, name) => {
  const row = page.locator(`button[data-constellation="${name}"]`).first();
  await row.click();
  await chartLoaded(page);
  await settle(page);
  // Choosing it again repaints it, now that the fonts are certainly here: a
  // chart painted the instant its data arrived may have been set in the
  // fallback face, and a held clock never repaints on its own.
  await page.evaluate(() => { window.__chartText = []; });
  await row.click();
  await settle(page);
  await page.locator("#chart").scrollIntoViewIfNeeded();
  await settle(page);
};
/** The chart canvas's own pixels, its CSS size, and every word drawn on it. */
const canvasState = (page) => page.evaluate(() => {
  const c = document.getElementById("chart");
  const g = c.getContext("2d");
  const data = g.getImageData(0, 0, c.width, c.height).data;
  let s = "";
  for (let i = 0; i < data.length; i += 8192) s += String.fromCharCode.apply(null, data.subarray(i, i + 8192));
  return {
    w: c.width, css: c.getBoundingClientRect().width, pixels: btoa(s),
    text: window.__chartText.slice(),
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  };
});
/** A PNG's pixels, decoded by the browser (no image library here). */
const decode = (page, png) => page.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  let s = "";
  for (let i = 0; i < data.length; i += 8192) s += String.fromCharCode.apply(null, data.subarray(i, i + 8192));
  return { w: c.width, h: c.height, pixels: btoa(s) };
}, png.toString("base64"));

/** The page and the canvas, pixel by pixel, inside the disc. */
function interior(canvas, page) {
  const size = canvas.w;
  assert.equal(page.w, size, `the chart screenshot is ${page.w}px wide for a ${size}px canvas`);
  const a = Buffer.from(canvas.pixels, "base64");
  const b = Buffer.from(page.pixels, "base64");
  const R = size / 2 - DISC.inset - 2;
  const inside = [];
  let night = 0, daylight = 0, mismatch = 0, total = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) > R) continue;
      const i = (y * size + x) * 4;
      total++;
      const [pr, pg, pb] = [b[i], b[i + 1], b[i + 2]];
      inside.push(pr, pg, pb);
      if (isNight(pr, pg, pb)) night++;
      if (isDaylight(pr, pg, pb)) daylight++;
      if (a[i + 3] !== 255 || Math.abs(a[i] - pr) > 3 || Math.abs(a[i + 1] - pg) > 3 || Math.abs(a[i + 2] - pb) > 3) mismatch++;
    }
  }
  return { total, night: night / total, daylight: daylight / total, mismatch: mismatch / total, pixels: Buffer.from(inside) };
}

/** Every word's box in CSS px about the chart's centre, from how it was drawn. */
const boxes = (text) => text.map((t) => {
  const h = t.compass ? DISC.compassPx : DISC.labelH;
  const x = t.align === "center" ? t.x - t.w / 2 : t.align === "right" ? t.x - t.w : t.x;
  return { text: t.text, px: t.px, compass: t.compass, x, y: t.y - h / 2, w: t.w, h };
});
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pct = (f) => `${(f * 100).toFixed(2)}%`;

/** Up to two listed constellations whose charts carry Bayer names, so the
 *  wording rule is exercised where it matters, fetched from the build itself. */
async function withBayerNames(page, names) {
  const index = await (await page.request.get(new URL("charts/index.json", target).href)).json();
  const picked = [];
  for (const name of names) {
    const abbr = index[name];
    if (abbr === undefined) continue;
    const chart = await (await page.request.get(new URL(`charts/${abbr}.json`, target).href)).json();
    if (chart.stars.some((s) => BAYER_NAME.test(s[3]))) picked.push(name);
    if (picked.length === 2) break;
  }
  return picked;
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const vp of VIEWPORTS) {
    console.log(`\nchart-disc: ${vp.name} (${vp.width}×${vp.height})`);
    const pages = {};
    for (const instant of INSTANTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
        hasTouch: vp.isMobile, isMobile: vp.isMobile,
        locale: "en-US", timezoneId: "America/New_York", reducedMotion: "reduce", serviceWorkers: "block",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("pageerror", (e) => errors.push(`${vp.name} ${instant.name} uncaught: ${e.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`${vp.name} ${instant.name} console: ${message.text()}`);
      });
      await page.clock.setFixedTime(new Date(instant.iso));
      await page.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
        // Record every word drawn on the chart canvas: its place, its width
        // and its CSS size, in the canvas's own units about its centre.
        window.__chartText = [];
        const original = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
          if (this.canvas.id === "chart") {
            const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? "0");
            const scale = this.getTransform().a / (window.devicePixelRatio || 1);
            window.__chartText.push({
              text, x, y, w: this.measureText(text).width, align: this.textAlign,
              px: px * scale, compass: /^[NEWS]$/.test(text) && /Cinzel|Times/.test(this.font),
            });
          }
          return original.call(this, text, x, y, ...rest);
        };
      });
      await page.goto(target.href, { waitUntil: "networkidle" });
      await page.locator("#tonight-list .lrow").nth(1).waitFor({ state: "visible" });
      await page.getByRole("tab", { name: "Constellations", exact: true }).click();
      await page.locator("#view-constellations").waitFor({ state: "visible" });
      await chartLoaded(page);
      await settle(page);
      pages[instant.name] = page;
    }

    // The same figures at both instants: the first listed at both, and two
    // with Bayer names, so noon and midnight can be compared dot for dot.
    const lists = await Promise.all(INSTANTS.map((i) => listed(pages[i.name])));
    const common = lists[0].filter((n) => lists[1].includes(n));
    assert(common.length >= 1, `${vp.name}: no constellation is listed at both noon and midnight`);
    const bayer = await withBayerNames(pages.noon, common);
    assert(bayer.length >= 1, `${vp.name}: no listed constellation carries a Bayer name to spell out`);
    const figures = [...new Set([common[0], ...bayer])];
    console.log(`  figures: ${figures.join(", ")}`);

    for (const [k, name] of figures.entries()) {
      const seen = {};
      for (const instant of INSTANTS) {
        const page = pages[instant.name];
        const tag = `${vp.name} ${instant.name} ${name}`;
        await openChart(page, name);
        const canvas = await canvasState(page);
        // The canvas can sit at a fractional page y; an element screenshot
        // then comes back a row tall and a row off. Clip to its snapped box.
        const box = await page.locator("#chart").evaluate((c) => {
          const r = c.getBoundingClientRect();
          return { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY), width: Math.round(r.width), height: Math.round(r.height) };
        });
        const png = await page.screenshot({ clip: box, fullPage: true, animations: "disabled" });
        const shotPixels = await decode(page, png);
        const d = interior(canvas, shotPixels);
        assert(!canvas.overflow, `${tag}: the page overflows sideways`);
        // The disc: nothing of the page inside the rim, and the night's colours.
        assert(d.mismatch === 0, `${tag}: ${pct(d.mismatch)} of the disc's pixels are not the chart's own — the page shows through`);
        assert(d.night >= 0.85, `${tag}: only ${pct(d.night)} of the disc is night-dark`);
        assert(d.daylight < 0.005, `${tag}: ${pct(d.daylight)} of the disc is daylight blue`);
        // The words: plain, legible, inside, apart.
        const words = boxes(canvas.text);
        const labels = words.filter((w) => !w.compass);
        const compass = words.filter((w) => w.compass);
        assert.deepEqual(compass.map((c) => c.text).sort(), ["E", "N", "W"], `${tag}: compass letters drawn: ${compass.map((c) => c.text)}`);
        assert(labels.length >= 1, `${tag}: no star name on the chart`);
        const R = canvas.css / 2 - DISC.inset;
        for (const w of words) {
          assert(w.px >= 12, `${tag}: "${w.text}" is set at ${w.px.toFixed(1)}px, under 12px`);
          assert(!ABBREVIATED.test(w.text), `${tag}: "${w.text}" is an abbreviation, not plain words`);
          for (const [cx, cy] of [[w.x, w.y], [w.x + w.w, w.y], [w.x, w.y + w.h], [w.x + w.w, w.y + w.h]]) {
            assert(Math.hypot(cx, cy) <= R, `${tag}: "${w.text}" leaves the disc (corner ${cx.toFixed(0)},${cy.toFixed(0)}, rim ${R.toFixed(0)})`);
          }
        }
        for (let i = 0; i < words.length; i++) {
          for (let j = i + 1; j < words.length; j++) {
            assert(!overlap(words[i], words[j]), `${tag}: "${words[i].text}" runs into "${words[j].text}"`);
          }
        }
        seen[instant.name] = { pixels: d.pixels, canvas: canvas.pixels };
        console.log(`  ${instant.name} ${name}: disc ${canvas.css}px, ${pct(d.night)} night, ${labels.map((l) => l.text).join(", ")}`);
        if (k === 0) await shot(page, `${vp.name}-${instant.name}-${name.toLowerCase().replace(/\s+/g, "-")}.png`);
      }
      // The same figure at noon and at midnight: the disc does not follow the sun.
      assert(seen.noon.canvas === seen.midnight.canvas, `${vp.name} ${name}: the chart canvas differs between noon and midnight`);
      const a = seen.noon.pixels, b = seen.midnight.pixels;
      let differ = 0;
      for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 2) differ++;
      assert(differ === 0, `${vp.name} ${name}: ${differ} channel values inside the disc differ between noon and midnight`);
    }
    for (const page of Object.values(pages)) await page.context().close();
  }
  assert.deepEqual(errors, [], `page errors:\n${errors.join("\n")}`);
  console.log("\nchart-disc: OK");
} finally {
  await browser.close();
}
