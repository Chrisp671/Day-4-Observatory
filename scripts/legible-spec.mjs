// Adversarial legibility contract for a 60-year-old reader.
// usage: node scripts/legible-spec.mjs [http://127.0.0.1:4233/]
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");
const target = new URL(process.argv[2] ?? "http://127.0.0.1:4233/");
assert(target.protocol === "http:" && ["localhost", "127.0.0.1"].includes(target.hostname), "drive a local preview only");

const VIEWPORTS = [
  { name: "phone-320", width: 320, height: 640, isMobile: true, hasTouch: true },
  { name: "phone-360", width: 360, height: 780, isMobile: true, hasTouch: true },
  { name: "phone-390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "phone-430", width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: "tablet-820", width: 820, height: 1180, isMobile: false, hasTouch: false },
];
const MODES = ["Stargazer", "Constellations", "Planets"];
const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});
const goMode = async (page, label) => {
  await page.getByRole("tab", { name: label, exact: true }).click();
  assert.equal(await page.locator('[role="tab"][aria-selected="true"]').textContent(), label);
  await settle(page);
};

// One browser round trip per state. The point grid measures the real clickable
// region, including CSS padding and overlap by neighbouring elements.
const inspect = (page) => page.evaluate(() => {
  const findings = [];
  const desc = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().replace(/\s+/g, ".") : "";
    return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls ? `.${cls}` : ""}> "${(el.textContent || el.value || "").replace(/\s+/g, " ").trim().slice(0, 55)}"`;
  };
  const visible = (el) => {
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden" || s.visibility === "collapse") return false;
      const r = p.getBoundingClientRect();
      if (r.width <= 1 && r.height <= 1 && ["hidden", "clip"].includes(s.overflow)) return false;
      if (s.clipPath === "inset(50%)" || s.clip === "rect(0px, 0px, 0px, 0px)") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
  };
  const add = (rule, el, value, severity = "FAIL") => findings.push({ severity, rule, element: desc(el), value });
  const h1 = document.querySelectorAll("h1").length;
  const main = document.querySelectorAll("main").length;
  if (h1 !== 1) add("STRUCTURE", document.documentElement, `<h1> count ${h1}; expected 1`);
  if (main !== 1) add("STRUCTURE", document.documentElement, `<main> count ${main}; expected 1`);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || !visible(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight);
    if (!rects.length) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 11) add("TEXT SIZE", el, `${size.toFixed(2)}px < 11px`);
    const farRight = Math.max(...rects.map((r) => r.right));
    if (farRight > innerWidth + 1) add("RIGHT EDGE", el, `${farRight.toFixed(1)}px > viewport ${innerWidth}px`);
  }

  for (const el of document.querySelectorAll("*")) {
    if (!visible(el) || !el.textContent.trim()) continue;
    const s = getComputedStyle(el);
    if ((["hidden", "clip"].includes(s.overflowX) || s.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 1) {
      add("CLIPPING", el, `scrollWidth ${el.scrollWidth}px > clientWidth ${el.clientWidth}px; overflow-x ${s.overflowX}; text-overflow ${s.textOverflow}`);
    }
  }

  const controls = [...document.querySelectorAll('button, input, a[href], [role="tab"], [role="button"]')];
  const focus = [];
  for (const el of controls) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const left = Math.max(0, Math.floor((r.left - 24) / 2) * 2);
    const right = Math.min(innerWidth - 1, Math.ceil((r.right + 24) / 2) * 2);
    const top = Math.max(0, Math.floor((r.top - 24) / 2) * 2);
    const bottom = Math.min(innerHeight - 1, Math.ceil((r.bottom + 24) / 2) * 2);
    for (let y = top; y <= bottom; y += 2) for (let x = left; x <= right; x += 2) {
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    const width = Number.isFinite(minX) ? maxX - minX + 2 : 0;
    const height = Number.isFinite(minY) ? maxY - minY + 2 : 0;
    if (width < 24 || height < 24) add("TARGET", el, `hit area ${width}x${height}px < 24x24px`);
    else if (width < 44 || height < 44) add("TARGET", el, `hit area ${width}x${height}px < 44x44px`, "WARN");
    if (el.tabIndex >= 0 && !el.disabled) {
      const s = getComputedStyle(el);
      const index = focus.length;
      el.dataset.legibleFocus = String(index);
      focus.push({ index, element: desc(el), baseline: { outline: s.outline, shadow: s.boxShadow, border: s.borderColor } });
    }
  }
  return { findings, focus };
});

const inspectFocus = async (page, focus) => {
  const findings = [];
  await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
  const seen = new Set();
  for (let n = 0; n < focus.length + 8; n++) {
    await page.keyboard.press("Tab");
    const result = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el?.dataset?.legibleFocus) return null;
      const s = getComputedStyle(el);
      return { index: Number(el.dataset.legibleFocus), outline: s.outline, outlineWidth: parseFloat(s.outlineWidth), outlineColor: s.outlineColor, shadow: s.boxShadow, border: s.borderColor };
    });
    if (!result || seen.has(result.index)) continue;
    seen.add(result.index);
    const item = focus[result.index];
    const outlineVisible = result.outlineWidth > 0 && result.outlineColor !== "transparent" && !/rgba\([^)]*,\s*0\)/.test(result.outlineColor) && result.outline !== item.baseline.outline;
    const changed = outlineVisible || (result.shadow !== "none" && result.shadow !== item.baseline.shadow) || result.border !== item.baseline.border;
    if (!changed) findings.push({ severity: "FAIL", rule: "FOCUS", element: item.element, value: `no visible focus change; outline ${result.outline}; shadow ${result.shadow}; border ${result.border}` });
    if (seen.size === focus.length) break;
  }
  for (const item of focus) if (!seen.has(item.index)) findings.push({ severity: "FAIL", rule: "FOCUS", element: item.element, value: "not reached by keyboard Tab" });
  return findings;
};

const covered = [];
const findings = [];
const sample = async (page, state) => {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  for (const [position, y] of [["top", 0], ["bottom", maxY]]) {
    await page.evaluate((scrollY) => scrollTo(0, scrollY), y);
    await settle(page);
    const label = `${state}/${position}`;
    covered.push(label);
    const result = await inspect(page);
    findings.push(...result.findings.map((f) => ({ ...f, state: label })));
    findings.push(...(await inspectFocus(page, result.focus)).map((f) => ({ ...f, state: label })));
    await page.evaluate(() => {
      document.body.removeAttribute("tabindex");
      document.querySelectorAll("[data-legible-focus]").forEach((el) => delete el.dataset.legibleFocus);
    });
  }
  await page.evaluate(() => scrollTo(0, 0));
};

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: 1, locale: "en-US", timezoneId: "America/New_York", reducedMotion: "reduce", serviceWorkers: "block" });
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
      await sample(page, `${vp.name}/${mode}/base`);
      if (mode === "Stargazer") {
        const tonight = page.locator("#tonight-toggle");
        await tonight.click();
        assert.equal(await tonight.getAttribute("aria-expanded"), "true");
        await sample(page, `${vp.name}/${mode}/tonight-open`);
        await tonight.click();
        const station = page.locator("#station");
        await station.click();
        assert.equal(await station.getAttribute("aria-expanded"), "true");
        await sample(page, `${vp.name}/${mode}/station-open`);
        await station.click();
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

for (const f of findings) console.log(`${f.severity} ${f.state} ${f.rule} ${f.element}: ${f.value}`);
console.log(`states covered (${covered.length}):`);
for (const state of covered) console.log(`  ${state}`);
const failures = findings.filter((f) => f.severity === "FAIL").length;
const warnings = findings.length - failures;
console.log(`legible-spec: ${failures ? "FAIL" : "OK"} (${failures} failures, ${warnings} warnings)`);
if (failures) process.exitCode = 1;
