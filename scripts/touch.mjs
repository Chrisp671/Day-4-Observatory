// Drive the phone controls and prove the two things a thumb found on an iPhone
// (Safari): the arrows were 16px wide and easy to miss, and two quick taps on a
// step button zoomed the page instead of stepping twice.
//   - every control a thumb uses carries `touch-action: manipulation`, so a fast
//     second tap is a tap and not a double-tap-to-zoom; the page itself stays
//     zoomable (the viewport meta sets no maximum-scale, no user-scalable=no);
//   - every such control answers a tap across at least 44×44 CSS px, or across
//     the documented floor where the plinth has no room for 44, and no control's
//     hit box steals from a neighbour's visible box;
//   - five quick taps on a step button advance exactly five steps — none
//     swallowed, none doubled — including taps on the label's half of the cell;
//   - every rail label (HOUR, DAY, PHASE, MONTH) sits clear of both its arrows:
//     at 390px the MONTH cell's forward arrow once stood on the H;
//   - the slop above the view tabs covers nothing interactive: it reaches up
//     over the hero and verse text, which are not controls.
// And the legibility floors of DEC-053 ("do what is best for someone who is
// 60"), in every view and at 320, 360, 390, 430 and 820 wide:
//   - no visible text is computed under 11px, and no readout or content text
//     (times, names, rows, detail text) under 12px;
//   - no visible text is clipped or cut off with an ellipsis — the text's own
//     ink box is measured against its element, every clipping ancestor and
//     the viewport, so "40.0°N 74…" and an "H" where HOLD stood both fail;
//   - the constellation rows, the TONIGHT toggle and the station fields reach
//     the floors named in FLOORS, with the reason each cannot reach 44.
// The hit box is measured, not read from CSS: `elementFromPoint` is probed
// outward from each control's centre until the browser hands the point to
// something else. Screenshots the rail at phone and tablet sizes.
//
// usage: node scripts/touch.mjs [http://127.0.0.1:4173/] [outDir]
// Uses the review pipeline's pinned Playwright (npm ci --prefix scripts/review).
// TOUCH_BROWSER=webkit runs the same checks in WebKit, the engine iOS uses.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const playwright = createRequire(new URL("./review/package.json", import.meta.url))("playwright");
const engine = playwright[process.env.TOUCH_BROWSER ?? "chromium"];
assert(engine !== undefined, "TOUCH_BROWSER must be chromium, webkit or firefox");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
// A local check only: it seeds storage in the page it drives.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");
const out = resolve(process.argv[3] ?? "web/.shots/touch");
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
/** Noon in New York on a day with no moonrise at 40N 74W (the moon bay is worded). */
const NO_MOONRISE_TIME = "2026-10-04T16:00:00.000Z";
const VIEWPORTS = [
  { name: "phone-320", width: 320, height: 640, isMobile: true },
  { name: "phone-360", width: 360, height: 780, isMobile: true },
  { name: "phone", width: 390, height: 844, isMobile: true },
  { name: "phone-large", width: 430, height: 932, isMobile: true },
  { name: "tablet", width: 820, height: 1180, isMobile: false },
];
/** Apple's minimum for a thumb, in CSS px. */
const THUMB = 44;
/** DEC-053's floors: no visible text under 11px; readouts and content under
 *  12px (the selectors in ui/legibility.ts, repeated here because a driver
 *  cannot import TypeScript); the shared dial never under 320px on a tablet. */
const TEXT_FLOOR = 11;
const CONTENT_FLOOR = 12;
const CONTENT = ".bay .v,.bay .s,#station-bay .v,.stationbar input,.lrow .n,.lrow .d,.crow .n,.crow .d," +
  ".prow .pbtn .n,.ptimes,.pwhere,.pcap,.chart-sub,.chart-where,.focus-context,#trouble-text";
const DIAL_FLOOR = 320;
/** The narrowest a stepper's half of a cell may get, in CSS px: the hit box
 *  PR #39 gave the arrows. The phone rail floors its cells at 58px to keep it. */
const STEPPER = 28;
/** How far a rail label's ink must sit from each of its arrows, in CSS px: the
 *  glyph's padding on a phone, which is all the 390px rail can afford. */
const CLEARANCE = 2;
/** Every control the page must show, at every viewport (the page is the same
 *  stack on a phone and a tablet), by the label `measure` reports: aria-label,
 *  else id. A missing one fails by name, and so does one not listed here, so a
 *  new control has to say what floor it reaches. The tonight rows are not
 *  listed: how many planets are up depends on the date, so they are matched
 *  by class, and there must be at least one. */
const TABS = ["tab-day4", "tab-constellations", "tab-planets"];
const EXPECTED = [
  ...TABS,
  "station", "Latitude", "Longitude", "set-station", "locate",
  ...["hour", "day", "phase", "month"].flatMap((unit) => [`Back one ${unit}`, `Forward one ${unit}`]),
  "Return to the present", "Hold the clock where it is",
  "tonight-toggle",
];
const isRow = (c) => c.classes.includes("lrow");
const isSkyRow = (c) => c.classes.includes("crow");
/** Where the plinth has no 44px to give, the floor each control must still
 *  reach, and why (DEC-053 names these as the documented exceptions).
 *  Everything not listed here must reach THUMB both ways. */
const FLOORS = [
  { match: (c) => c.cell !== null, width: (c) => Math.max(STEPPER, Math.floor(c.cell / 2) - 1), height: THUMB,
    why: `a stepper owns its half of a cell, never under ${STEPPER}px, and the rail has no width to spare on a phone` },
  { match: (c) => c.id === "tonight-toggle", width: THUMB, height: 28,
    why: "the rail's buttons fill their cells above and the planets' own rows are directly below; the slop takes the ledger's padding and no more" },
  { match: (c) => c.id === "set-station" || c.id === "locate", width: 40, height: 34,
    why: "the station editor shares a bay with the moon's readout; 44px here would move the rail every time it opens" },
  { match: (c) => c.tag === "input", width: THUMB, height: 32,
    why: "the station editor's fields are 32px tall and 4px apart, for the same reason as its buttons" },
  { match: (c) => c.classes.includes("pbtn"), width: THUMB, height: THUMB,
    why: "five rows in the Planets view, each a full thumb target" },
  { match: isRow, width: THUMB, height: 32,
    why: "three glance rows at 44px would push the ledger off a 390×844 fold with the dial" },
  { match: isSkyRow, width: THUMB, height: THUMB,
    why: "the constellation lists scroll, so every row is a full thumb target" },
];

const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});
const shot = async (page, file) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await page.screenshot({ path: resolve(out, file), scale: "css", fullPage: false, animations: "disabled" });
};
const travelled = (page) => page.locator("#travelled").textContent();
const clock = (page) => page.locator("#timeline").textContent();

/** Every visible control, each with the box the browser actually hands a tap
 *  to: probed outward from the centre along both axes with `elementFromPoint`.
 *  Scrolls each into view first, since the phone page scrolls. */
const measure = (page) => page.evaluate((STEP) => {
  const owns = (el, x, y) => {
    const hit = document.elementFromPoint(x, y);
    return hit !== null && el.contains(hit);
  };
  const probe = (el) => {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!owns(el, cx, cy)) return null;
    let left = cx, right = cx, top = cy, bottom = cy;
    while (left - STEP >= 0 && owns(el, left - STEP, cy)) left -= STEP;
    while (right + STEP <= innerWidth && owns(el, right + STEP, cy)) right += STEP;
    while (top - STEP >= 0 && owns(el, cx, top - STEP)) top -= STEP;
    while (bottom + STEP <= innerHeight && owns(el, cx, bottom + STEP)) bottom += STEP;
    // The last owned sample sits STEP short of the true edge on each side.
    const box = { left, top, right: right + STEP, bottom: bottom + STEP };
    // A viewport-locked body (a tablet) scrolls itself when a control is
    // scrolled into view, so the page offset is the window's and the body's.
    return { box, width: box.right - box.left, height: box.bottom - box.top,
      self: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      scrollY: window.scrollY + document.body.scrollTop };
  };
  const controls = [];
  // The error strip (DEC-041) belongs to trouble.mjs; on a healthy page it is
  // hidden, and WebKit opens it on a ResizeObserver notice it raises as an error.
  for (const el of document.querySelectorAll("button, [role=button], [role=tab], input")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || el.disabled || el.closest(".trouble") !== null) continue;
    const cell = el.closest(".cell");
    const m = probe(el);
    controls.push({
      id: el.id, tag: el.tagName.toLowerCase(), classes: [...el.classList],
      label: el.getAttribute("aria-label") ?? (el.id || el.textContent.trim().slice(0, 16)),
      touchAction: getComputedStyle(el).touchAction,
      cell: cell === null ? null : cell.getBoundingClientRect().width,
      // Boxes in page coordinates, so controls probed at different scroll
      // positions can be compared for overlap.
      box: m === null ? null : {
        left: m.box.left, right: m.box.right, top: m.box.top + m.scrollY, bottom: m.box.bottom + m.scrollY },
      self: m === null ? null : {
        left: m.self.left, right: m.self.right, top: m.self.top + m.scrollY, bottom: m.self.bottom + m.scrollY },
      width: m === null ? 0 : m.width, height: m === null ? 0 : m.height,
    });
  }
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;
  const containers = {};
  for (const sel of [".rail", ".cell", ".modes", ".stationbar", ".ledger-h"]) {
    const el = document.querySelector(sel);
    if (el !== null) containers[sel] = getComputedStyle(el).touchAction;
  }
  // Every visible element that carries text (DEC-053): its computed size, and
  // whether its ink spills past its own box, past an ancestor that clips, or
  // past the viewport. Measured from a Range over the contents, which is the
  // text's real extent even where `overflow:hidden` would paint less of it.
  const CONTENT_SEL = ".bay .v,.bay .s,#station-bay .v,.stationbar input,.lrow .n,.lrow .d,.crow .n,.crow .d," +
    ".prow .pbtn .n,.ptimes,.pwhere,.pcap,.chart-sub,.chart-where,.focus-context,#trouble-text";
  const texts = [];
  for (const el of document.querySelectorAll("body *")) {
    if (["CANVAS", "SCRIPT", "STYLE", "IMG"].includes(el.tagName)) continue;
    if (el.closest("[hidden]") !== null || el.closest(".sr-only") !== null || el.closest(".trouble") !== null) continue;
    const field = el.tagName === "INPUT" || el.tagName === "TEXTAREA";
    // The element's OWN words: its text nodes, not its children's. A row's
    // line is measured through the spans that hold its words, each against
    // the block that lays them out, so a part that runs past its row is
    // caught at the part and a hidden transcript is never summed into main.
    const ownText = field ? [] : [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim() !== "");
    const own = field ? el.value : ownText.map((n) => n.textContent).join("");
    if (own.trim() === "") continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.display === "contents" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    let ink = r;
    if (!field) {
      const range = document.createRange();
      range.setStartBefore(ownText[0]);
      range.setEndAfter(ownText[ownText.length - 1]);
      ink = range.getBoundingClientRect();
    }
    // The box the words must stay inside: the nearest ancestor-or-self that
    // is not inline (a flex item is blockified, so a row's `.d` counts).
    let box = el;
    while (box !== document.body && getComputedStyle(box).display.startsWith("inline") && box.parentElement !== null) box = box.parentElement;
    const b = box.getBoundingClientRect();
    let clipLeft = 0, clipRight = innerWidth;
    for (let a = el.parentElement; a !== null; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const c = a.getBoundingClientRect();
      clipLeft = Math.max(clipLeft, c.left);
      clipRight = Math.min(clipRight, c.right);
    }
    const name = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.classList.length ? "." + [...el.classList].join(".") : ""}`;
    texts.push({
      name, text: own.trim().replace(/\s+/g, " ").slice(0, 28),
      px: parseFloat(cs.fontSize),
      // The Mazzaroth star beside a name is a mark, and RISE / PEAK / SET are
      // keys like SUN and MOON, not readouts: the text floor, not the content one.
      content: (el.matches(CONTENT_SEL) || el.closest(CONTENT_SEL) !== null) && el.closest(".mz, .ptimes em") === null,
      ellipsis: cs.textOverflow === "ellipsis" && cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1,
      // How far the ink runs past the tightest of: the box that lays it out,
      // the nearest clipping ancestor, the viewport. Positive is a cut-off reader.
      spill: Math.max(ink.right - Math.min(b.right, clipRight, innerWidth), Math.max(b.left, clipLeft, 0) - ink.left),
      hidden: cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1 ? el.scrollWidth - el.clientWidth : 0,
    });
  }
  const pageWidth = document.documentElement.scrollWidth;
  // The ink, not the element: a label's text box and each arrow's glyph box,
  // from a Range over the text, so an overflowing word is caught where it
  // overflows and not where its span happens to end.
  const ink = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { left: r.left, right: r.right };
  };
  const rail = [...document.querySelectorAll(".cell")].map((cell) => {
    const [back, label, fwd] = cell.children;
    return { label: label.textContent, cell: cell.getBoundingClientRect().width,
      back: ink(back), text: ink(label), fwd: ink(fwd) };
  });
  // Everything under the tabs' slop, top to bottom, at a grid of points over
  // the slop's own box (the ::after above each tab, 8px either side).
  const CONTROL = "button, [role=button], [role=tab], input, a";
  const slops = [...document.querySelectorAll(".modes [role=tab]")].map((tab) => {
    const r = tab.getBoundingClientRect();
    const after = getComputedStyle(tab, "::after");
    const top = r.top + parseFloat(after.top), left = r.left + parseFloat(after.left);
    const right = r.right - parseFloat(after.right);
    const under = [];
    let points = 0;
    for (let y = top + 1; y < r.top; y += 3) {
      for (let x = left + 1; x < right; x += 4) {
        points++;
        for (const el of document.elementsFromPoint(x, y)) {
          if (el !== tab && el.matches(CONTROL)) under.push(el.id || el.textContent.trim().slice(0, 16));
        }
        if (!tab.contains(document.elementFromPoint(x, y))) under.push("(not the tab itself)");
      }
    }
    return { tab: tab.id, slop: r.top - top, points, under: [...new Set(under)] };
  });
  return { controls, containers, rail, slops, texts, pageWidth,
    dialWidth: document.getElementById("sky")?.getBoundingClientRect().width ?? 0,
    viewportMeta: document.querySelector("meta[name=viewport]")?.getAttribute("content") ?? "" };
}, 0.5);

const fmt = (n) => n.toFixed(1);

/** DEC-053's text floors and the no-clipping rule, for one view at one size. */
const checkText = (vp, view, texts, pageWidth, width) => {
  assert(texts.length > 10, `${vp} ${view}: too little text measured (${texts.length})`);
  assert(pageWidth <= width, `${vp} ${view}: the page is ${pageWidth}px wide in a ${width}px viewport`);
  const small = texts.filter((t) => t.px + 0.01 < TEXT_FLOOR);
  assert.deepEqual(small.map((t) => `${t.name} "${t.text}" ${t.px}px`), [],
    `${vp} ${view}: text under ${TEXT_FLOOR}px`);
  const smallContent = texts.filter((t) => t.content && t.px + 0.01 < CONTENT_FLOOR);
  assert.deepEqual(smallContent.map((t) => `${t.name} "${t.text}" ${t.px}px`), [],
    `${vp} ${view}: readout or content text under ${CONTENT_FLOOR}px`);
  const cut = texts.filter((t) => t.ellipsis || t.spill > 1 || t.hidden > 0);
  assert.deepEqual(cut.map((t) => `${t.name} "${t.text}"${t.ellipsis ? " ellipsis" : ""}${t.spill > 1 ? ` spills ${fmt(t.spill)}px` : ""}${t.hidden > 0 ? ` hides ${fmt(t.hidden)}px` : ""}`), [],
    `${vp} ${view}: text cut off`);
  const smallest = texts.reduce((a, t) => (t.px < a.px ? t : a));
  console.log(`  ${view.padEnd(14)} ${texts.length} text elements, smallest ${smallest.px}px (${smallest.name}), none clipped`);
};

/** Hit boxes for one view: every control reaches its floor, none steals. */
const checkTargets = (vp, view, controls, expected) => {
  const named = controls.filter((c) => !isRow(c) && !isSkyRow(c)).map((c) => c.label);
  const missing = expected.filter((name) => !named.includes(name));
  assert.deepEqual(missing, [], `${vp} ${view}: controls missing: ${missing.join(", ")}`);
  const unlisted = named.filter((name) => !expected.includes(name));
  assert.deepEqual(unlisted, [], `${vp} ${view}: controls not expected, so with no floor of their own: ${unlisted.join(", ")}`);
  console.log(`\ntouch: ${vp} ${view} — hit boxes (CSS px)`);
  for (const c of controls) {
    assert.equal(c.touchAction, "manipulation",
      `${vp}: "${c.label}" lets a quick second tap zoom (touch-action ${c.touchAction})`);
    assert(c.box !== null, `${vp}: "${c.label}" does not answer a tap at its own centre`);
    const floor = FLOORS.find((f) => f.match(c));
    const minW = floor === undefined ? THUMB : floor.width instanceof Function ? floor.width(c) : floor.width;
    const minH = floor === undefined ? THUMB : floor.height;
    const note = floor === undefined ? "" : `  (floor ${minW}×${minH}: ${floor.why})`;
    if (!isSkyRow(c) || c === controls.find(isSkyRow)) {
      console.log(`  ${c.label.padEnd(26)} ${fmt(c.width).padStart(6)} × ${fmt(c.height).padEnd(6)}${note}`);
    }
    assert(c.width + 0.01 >= minW && c.height + 0.01 >= minH,
      `${vp} ${view}: "${c.label}" answers a tap across ${fmt(c.width)}×${fmt(c.height)}, below ${minW}×${minH}`);
    // Nothing steals from a control's own visible box.
    const s = c.self, b = c.box;
    assert(b.left <= s.left + 1 && b.right >= s.right - 1 && b.top <= s.top + 1 && b.bottom >= s.bottom - 1,
      `${vp} ${view}: part of "${c.label}" answers to another control`);
  }
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i].box, b = controls[j].box;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      assert(!(w > 0.5 && h > 0.5),
        `${vp} ${view}: "${controls[i].label}" and "${controls[j].label}" overlap by ${fmt(w)}×${fmt(h)}`);
    }
  }
  const skyRows = controls.filter(isSkyRow);
  if (skyRows.length > 0) console.log(`  … and ${skyRows.length} constellation rows, every one ≥ ${THUMB}×${THUMB}`);
};

const check = (vp, measured, width) => {
  const { controls, containers, rail, slops, viewportMeta } = measured;
  checkTargets(vp, "Stargazer", controls, EXPECTED);
  assert(controls.some(isRow), `${vp}: no tonight rows`);
  checkText(vp, "Stargazer", measured.texts, measured.pageWidth, width);

  // The page stays zoomable; only the double-tap gesture goes.
  assert.match(viewportMeta, /width=device-width/, `${vp}: the viewport meta no longer fits the device`);
  assert.doesNotMatch(viewportMeta, /user-scalable\s*=\s*(no|0)/i, `${vp}: pinch zoom is disabled (user-scalable)`);
  assert.doesNotMatch(viewportMeta, /maximum-scale/i, `${vp}: pinch zoom is capped (maximum-scale)`);
  for (const [sel, ta] of Object.entries(containers)) {
    assert.equal(ta, "manipulation", `${vp}: ${sel} lets a quick second tap zoom (touch-action ${ta})`);
  }


  // Each rail label sits clear of both its arrows.
  console.log(`touch: ${vp} — rail labels, ink to arrow (CSS px)`);
  assert.deepEqual(rail.map((r) => r.label), ["HOUR", "DAY", "PHASE", "MONTH"], `${vp}: the rail's cells`);
  for (const r of rail) {
    const before = r.text.left - r.back.right, after = r.fwd.left - r.text.right;
    console.log(`  ${r.label.padEnd(6)} cell ${fmt(r.cell).padStart(5)}   ‹ ${fmt(before).padStart(5)} | ${fmt(after).padStart(5)} ›`);
    assert(before + 0.05 >= CLEARANCE,
      `${vp}: "${r.label}" runs into its back arrow (${fmt(before)}px clear, needs ${CLEARANCE})`);
    assert(after + 0.05 >= CLEARANCE,
      `${vp}: "${r.label}" runs into its forward arrow (${fmt(after)}px clear, needs ${CLEARANCE})`);
  }

  // The tabs' slop is a trade-off, not a theft: it reaches up over the hero,
  // and nothing interactive lies anywhere under it.
  assert.equal(slops.length, 3, `${vp}: expected three view tabs, found ${slops.length}`);
  for (const s of slops) {
    assert(s.slop > 0 && s.points > 0, `${vp}: "${s.tab}" has no slop above it to check`);
    assert.deepEqual(s.under, [],
      `${vp}: the slop above "${s.tab}" lies over another control: ${s.under.join(", ")}`);
    console.log(`  ${s.tab.padEnd(18)} slop ${fmt(s.slop)}px up, ${s.points} points, nothing interactive beneath`);
  }
  return controls;
};

await mkdir(out, { recursive: true });
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
    await shot(page, `${vp.name}-rail.png`);

    // The station editor is a control a thumb uses too; measure it open. The
    // fold is opened as well, so the programme's rows and the long
    // constellation names are measured for size and clipping (DEC-053).
    await page.locator("#station").click();
    await page.locator("#stationbar").waitFor({ state: "visible" });
    await page.locator("#tonight-toggle").click();
    await page.locator("#tonight-all").waitFor({ state: "visible" });
    await settle(page);
    const controls = check(vp.name, await measure(page), vp.width);
    await page.locator("#tonight-toggle").click();
    await page.locator("#tonight-all").waitFor({ state: "hidden" });
    await page.locator("#station").click();
    await page.locator("#stationbar").waitFor({ state: "hidden" });

    // Five quick taps are five steps. The taps land on the label's half of the
    // cell — the part of the hit box that is new — not on the glyph itself.
    const before = await travelled(page);
    const clockBefore = await clock(page);
    assert.equal(before, "", `${vp.name}: the page starts travelled`);
    // Geometry read at tap time: closing the editor moved the rail.
    const tapAt = async (name, side) => {
      const point = await page.evaluate(([label, s]) => {
        const b = [...document.querySelectorAll("button")].find((el) => el.getAttribute("aria-label") === label);
        b.scrollIntoView({ block: "center" });
        const cell = b.closest(".cell").getBoundingClientRect();
        // 3px past the cell's midline, on the label: the half that is new.
        return { x: cell.left + cell.width / 2 + 3 * s, y: cell.top + cell.height / 2 };
      }, [name, side]);
      for (let i = 0; i < 5; i++) await page.touchscreen.tap(point.x, point.y);
    };
    await tapAt("Forward one day", +1);
    await page.waitForTimeout(300);
    assert.equal(await travelled(page), "Monday, September 7",
      `${vp.name}: five quick taps forward did not advance exactly five days (${await travelled(page)})`);
    assert.equal(await clock(page), clockBefore, `${vp.name}: stepping a day moved the hour`);
    await tapAt("Back one day", -1);
    await page.waitForTimeout(300);
    assert.equal(await travelled(page), "", `${vp.name}: five quick taps back did not return (${await travelled(page)})`);
    await page.evaluate(() => window.scrollTo(0, 0));

    // The Planets view with its second row open: the detail text, the photo's
    // caption and the five row buttons; on a tablet the shared dial keeps its
    // floor instead of shrinking under the open row (DEC-053).
    await page.getByRole("tab", { name: "Planets", exact: true }).click();
    await page.locator("#view-planets").waitFor({ state: "visible" });
    await page.locator("#planets-list button[data-planet]").nth(1).click();
    await page.waitForFunction(() => document.querySelector("#planets-list .pdetail:not([hidden])") !== null);
    await settle(page);
    const planets = await measure(page);
    checkTargets(vp.name, "Planets", planets.controls, TABS);
    assert(planets.controls.filter((c) => c.classes.includes("pbtn")).length === 5, `${vp.name}: five planet rows`);
    checkText(vp.name, "Planets", planets.texts, planets.pageWidth, vp.width);
    if (!vp.isMobile) {
      assert(planets.dialWidth >= DIAL_FLOOR,
        `${vp.name}: the dial shrank to ${fmt(planets.dialWidth)}px under the open Planets row (floor ${DIAL_FLOOR})`);
      console.log(`  dial ${fmt(planets.dialWidth)}px wide with a row open (floor ${DIAL_FLOOR})`);
    }

    // The Constellations view: seventy-odd row buttons, every one a thumb
    // target, every name whole.
    await page.getByRole("tab", { name: "Constellations", exact: true }).click();
    await page.locator("#view-constellations").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.getElementById("chart-load")?.textContent === "");
    await page.locator("#sky-rising button.crow").first().waitFor({ state: "visible" });
    await settle(page);
    const sky = await measure(page);
    checkTargets(vp.name, "Constellations", sky.controls, TABS);
    assert(sky.controls.filter(isSkyRow).length >= 40, `${vp.name}: the constellation lists are short (${sky.controls.filter(isSkyRow).length} rows)`);
    checkText(vp.name, "Constellations", sky.texts, sky.pageWidth, vp.width);
    await page.evaluate(() => window.scrollTo(0, 0));

    assert.deepEqual(errors, [], `${vp.name}: browser errors`);
    await context.close();
    console.log(`touch: ${vp.name} OK`);
  }

  // A worded readout on a narrow phone. On 2026-10-04 at 40N 74W there is no
  // moonrise, so the moon bay reads "no moonrise today": one part with no time
  // glyph. Found by an independent review of #42: kept unbreakable, it spilled
  // ~28px into STATION at 320. Prose parts must wrap at their spaces.
  for (const vp of VIEWPORTS.filter((v) => v.width <= 390)) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
      hasTouch: true, isMobile: vp.isMobile,
      locale: "en-US", timezoneId: "America/New_York", reducedMotion: "reduce", serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.clock.setFixedTime(new Date(NO_MOONRISE_TIME));
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
    });
    await page.goto(target.href, { waitUntil: "networkidle" });
    await settle(page);
    const moon = await page.evaluate(() => {
      const el = document.getElementById("moon-times");
      const bay = el?.closest(".bay");
      if (!el || !bay) return null;
      const right = bay.getBoundingClientRect().right - parseFloat(getComputedStyle(bay).paddingRight);
      const parts = [...el.querySelectorAll(".part")].map((p) => {
        const range = document.createRange(); range.selectNodeContents(p);
        return Math.max(...[...range.getClientRects()].map((r) => r.right));
      });
      return { text: el.textContent.trim(), spill: Math.max(0, ...parts.map((r) => r - right)), over: el.scrollWidth - el.clientWidth };
    });
    assert(moon, `${vp.name}: no moon bay found`);
    assert.match(moon.text, /no moonrise/, `${vp.name}: ${NO_MOONRISE_TIME} should have no moonrise, read "${moon.text}"`);
    assert(moon.spill <= 0.5 && moon.over <= 1,
      `${vp.name}: "${moon.text}" spills ${fmt(moon.spill)}px past its bay (scroll overflow ${moon.over}px)`);
    console.log(`touch: ${vp.name} "${moon.text}" fits its bay`);
    await context.close();
  }
} finally {
  await browser.close();
}
