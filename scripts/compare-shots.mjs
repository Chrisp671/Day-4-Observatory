// Compare two capture directories pixel for pixel and fail if any file that
// must stay identical differs. Used to prove a change leaves Day 4 (and any
// other named state) byte-for-byte unchanged:
//
//   node scripts/review/capture.mjs http://127.0.0.1:4173/ web/.shots/before   # old build
//   node scripts/review/capture.mjs http://127.0.0.1:4173/ web/.shots/after    # new build
//   node scripts/compare-shots.mjs web/.shots/before web/.shots/after [allowed...]
//
// `allowed` names states (e.g. "planets") whose captures may differ; every
// other file present in both directories must be identical. PNGs are decoded
// by Chromium on a canvas, so no image library is needed beyond Playwright.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const [before, after, ...allowed] = process.argv.slice(2);
assert(before && after, "usage: compare-shots.mjs <beforeDir> <afterDir> [allowedState...]");
const files = (await readdir(before)).filter((f) => f.endsWith(".png")).sort();
assert(files.length > 0, `no captures in ${before}`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent("<canvas id=a></canvas><canvas id=b></canvas>");
  const compare = (a, b) => page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { same: false, why: `size ${ia.width}×${ia.height} vs ${ib.width}×${ib.height}` };
    const px = (img, id) => {
      const c = document.getElementById(id); c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, img.width, img.height).data;
    };
    const da = px(ia, "a"), db = px(ib, "b");
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, n = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) {
        const p = i / 4, x = p % ia.width, y = (p - x) / ia.width;
        n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    return n === 0 ? { same: true } : { same: false, why: `${n} px differ in [${minX},${minY}]–[${maxX},${maxY}]` };
  }, [a, b]);

  const failures = [];
  for (const file of files) {
    const [a, b] = await Promise.all([readFile(resolve(before, file)), readFile(resolve(after, file)).catch(() => null)]);
    if (b === null) { console.log(`${file}: missing in ${after}`); failures.push(file); continue; }
    const state = file.replace(/^[a-z]+-/, "").replace(/\.png$/, "");
    const r = await compare(`data:image/png;base64,${a.toString("base64")}`, `data:image/png;base64,${b.toString("base64")}`);
    const verdict = r.same ? "identical" : `differs (${r.why})`;
    const ok = r.same || allowed.includes(state);
    console.log(`${file}: ${verdict}${ok ? "" : "  ← must be identical"}`);
    if (!ok) failures.push(file);
  }
  assert.deepEqual(failures, [], "captures that must be identical differ");
  console.log(`compare-shots: ${files.length} files, all unchanged except ${allowed.length ? allowed.join(", ") : "none"}`);
} finally {
  await browser.close();
}
