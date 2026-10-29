// Drive the ring identification (DEC-055) in a real browser and prove what
// Parker asked for on his iPhone and iPad — "it's not clear which object each
// arch line is showing until you toggle them on and off":
//   - a tap on a ring lights that ring: day4.lit names the planet, the key's
//     button for it is pressed, the echo line names it, the dial changes, and
//     the choice survives a reload;
//   - a tap on the lit ring releases it, and the echo line then takes no room;
//   - a tap between the band and the first ring lights nothing; a tap on the
//     sun lights nothing, and dragging the sun still scrubs time;
//   - the key is five buttons in ring order from the Sun, each lighting its
//     ring, each at least 44×44, none clipped, none past the viewport;
//   - the first-visit hint is shown with its exact words, disappears at the
//     first choice (by ring or by key), and stays gone after a reload;
//   - in the Planets view a ring tap opens the planet's row, and every row's
//     swatch is drawn as a piece of its ring.
// At 320, 390 and 820 wide and on an iPad in both orientations. Screenshots
// the first visit, a lit ring and the released state at each size.
//
// usage: node scripts/rings.mjs [http://127.0.0.1:4173/] [outDir]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
// A local check only: it seeds storage in the page it drives.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");
const out = resolve(process.argv[3] ?? "web/.shots/rings");
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
const RING_ORDER = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const HINT = "Tap a ring or a planet's name to see which is which.";
/** Apple's minimum for a thumb, in CSS px (DEC-053). */
const THUMB = 44;
const VIEWPORTS = [
  { name: "phone-320", width: 320, height: 640, isMobile: true },
  { name: "phone-390", width: 390, height: 844, isMobile: true },
  { name: "ipad-820", width: 820, height: 1180, isMobile: false },
  { name: "ipad-landscape", width: 1180, height: 820, isMobile: false },
];
/** The dial's geometry as ui/clockface.ts has it (a driver cannot import TypeScript). */
const FACE = { dialOuter: 0.985, dialInner: 0.875, ringBase: 1.14, ringStep: 0.042, reteOuter: 1.14 + 4 * 0.042 + 0.02 };
const ringFraction = (name) => FACE.ringBase + RING_ORDER.indexOf(name) * FACE.ringStep;
const hourToAngle = (hours) => (hours / 24) * Math.PI * 2 + Math.PI / 2;
const sweepHours = (rise, set) => (((set - rise) % 24) + 24) % 24;

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
const hinted = (page) => page.evaluate(() => localStorage.getItem("day4.ring-hint"));
const clock = (page) => page.locator("#timeline").textContent();
/** The key, the echo and the hint as the DOM has them. */
const state = (page) => page.evaluate(() => {
  const keys = [...document.querySelectorAll("#ring-key .kbtn")];
  const echo = document.getElementById("ring-echo");
  const hint = document.getElementById("ring-hint");
  return {
    keys: keys.map((b) => b.dataset.planet),
    pressed: keys.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.planet),
    swatches: keys.filter((b) => b.querySelector(".sw canvas") !== null).length,
    echo: echo.textContent,
    echoHeight: echo.getBoundingClientRect().height,
    hintShown: !hint.hidden && hint.getClientRects().length > 0,
    hintText: hint.textContent,
    hintPx: parseFloat(getComputedStyle(hint).fontSize),
  };
});
/** The dial's centre and face radius in CSS px, from the canvas's own box. */
const geometry = (page) => page.locator("#sky").evaluate((c, FACE) => {
  const r = c.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, R: ((r.width / 2) * FACE.dialOuter) / FACE.reteOuter, width: r.width };
}, FACE);
/** The day's rise and set the ring is drawn from, read from the Planets view's
 *  rows (painted every tick, open or not); null when the planet has no ring today. */
const ringTimes = (page, name) => page.evaluate((name) => {
  const d = document.getElementById(`planet-detail-${name.toLowerCase()}`);
  const parse = (text) => {
    const m = /(\d{1,2}):(\d{2}) ([ap]m)/.exec(text);
    if (m === null) return null;
    const h = (Number(m[1]) % 12) + (m[3] === "pm" ? 12 : 0);
    return h + Number(m[2]) / 60;
  };
  const rise = parse(d.querySelector(".ptimes span:nth-child(1) b").textContent);
  const set = parse(d.querySelector(".ptimes span:nth-child(3) b").textContent);
  return rise === null || set === null ? null : { rise, set };
}, name);
/** A point on the dial, in CSS px, at `hours` on the circle of radius `fraction`·R. */
const pointAt = (g, hours, fraction) => {
  const a = hourToAngle(hours);
  return { x: g.cx + Math.cos(a) * g.R * fraction, y: g.cy + Math.sin(a) * g.R * fraction };
};
const tap = async (page, p) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(120);
  await settle(page);
};
const waitLit = (page, name) => page.waitForFunction((n) => localStorage.getItem("day4.lit") === n, name, { timeout: 5000 });

/** Every key button's box, text and clipping, plus the page's width. */
const layout = (page) => page.evaluate(() => {
  const plinth = document.querySelector("#view-day4 .plinth").getBoundingClientRect();
  const header = document.querySelector(".ledger-h").getBoundingClientRect();
  const toggle = document.getElementById("tonight-toggle").getBoundingClientRect();
  const keys = [...document.querySelectorAll("#ring-key .kbtn")].map((b) => {
    const r = b.getBoundingClientRect();
    const label = b.querySelector(".kn");
    const range = document.createRange();
    range.selectNodeContents(label);
    const ink = range.getBoundingClientRect();
    return {
      name: b.dataset.planet, width: r.width, height: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      px: parseFloat(getComputedStyle(label).fontSize),
      clipped: label.scrollWidth > label.clientWidth + 1 || ink.right > r.right + 1 || ink.left < r.left - 1,
      inkRight: ink.right,
    };
  });
  const echo = document.getElementById("ring-echo");
  return {
    keys, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth,
    plinth: { left: plinth.left, right: plinth.right },
    keyTop: Math.min(...keys.map((k) => k.top)), keyBottom: Math.max(...keys.map((k) => k.bottom)),
    toggleTop: toggle.top, toggleBottom: toggle.bottom, headerBottom: header.bottom,
    echoPx: parseFloat(getComputedStyle(echo).fontSize),
    echoClipped: echo.scrollWidth > echo.clientWidth + 1,
  };
});

const fmt = (n) => n.toFixed(1);

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
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
    page.on("pageerror", (e) => errors.push(`uncaught: ${e.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    await page.clock.setFixedTime(new Date(FIXED_TIME));
    // First-visit storage once per tab; a reload keeps what the visit wrote,
    // which is the whole point of the persistence checks below.
    await page.addInitScript(() => {
      if (sessionStorage.getItem("rings.seeded") === "1") return;
      sessionStorage.setItem("rings.seeded", "1");
      localStorage.clear();
      localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
    });
    await page.goto(target.href, { waitUntil: "networkidle" });
    await page.locator("#tonight-list .lrow").nth(1).waitFor({ state: "visible" });
    await settle(page);
    console.log(`\nrings: ${vp.name} (${vp.width}×${vp.height})`);

    // ——— the first visit: the hint in its exact words, the key in ring order, Saturn lit ———
    let s = await state(page);
    assert.deepEqual(s.keys, RING_ORDER, `${vp.name}: the key is not the five planets in ring order (${s.keys})`);
    assert.equal(s.swatches, 5, `${vp.name}: ${s.swatches} of 5 key swatches are drawn as a ring`);
    assert.equal(await lit(page), null, `${vp.name}: first visit starts with day4.lit set`);
    assert.deepEqual(s.pressed, ["Saturn"], `${vp.name}: Saturn is not the one lit on a first visit (${s.pressed})`);
    assert(s.hintShown, `${vp.name}: the first-visit hint is not shown`);
    assert.equal(s.hintText, HINT, `${vp.name}: the hint's words`);
    assert(s.hintPx >= 12, `${vp.name}: the hint is ${s.hintPx}px, under 12px`);
    assert.match(s.echo, /^Saturn · (up (until|from)|no ring today)/, `${vp.name}: the echo line reads "${s.echo}"`);
    await shot(page, `${vp.name}-first-visit.png`);

    // ——— layout: five whole buttons, every one a thumb target, nothing past the edge ———
    const lay = await layout(page);
    assert(lay.pageWidth <= lay.viewport, `${vp.name}: the page is ${lay.pageWidth}px wide in a ${lay.viewport}px viewport`);
    for (const k of lay.keys) {
      assert(k.width + 0.01 >= THUMB && k.height + 0.01 >= THUMB, `${vp.name}: key "${k.name}" is ${fmt(k.width)}×${fmt(k.height)}, under ${THUMB}×${THUMB}`);
      assert(!k.clipped, `${vp.name}: key "${k.name}" is clipped or truncated`);
      assert(k.px >= 12, `${vp.name}: key "${k.name}" is set at ${k.px}px, under 12px`);
      assert(k.left >= lay.plinth.left - 0.5 && k.right <= lay.plinth.right + 0.5, `${vp.name}: key "${k.name}" lies outside the plinth`);
    }
    assert(lay.echoPx >= 12 && !lay.echoClipped, `${vp.name}: the echo line is ${lay.echoPx}px or clipped`);
    const rows = new Set(lay.keys.map((k) => Math.round(k.top))).size;
    const sameRowAsTonight = lay.keyTop < lay.toggleBottom && lay.keyBottom > lay.toggleTop;
    console.log(`  key: ${rows} line(s), ${sameRowAsTonight ? "beside TONIGHT" : "under TONIGHT"}, buttons ${lay.keys.map((k) => `${fmt(k.width)}×${fmt(k.height)}`).join(" ")}`);
    const g0 = await geometry(page);
    console.log(`  dial ${fmt(g0.width)}px wide`);
    // DEC-053 floors the shared dial at 320 on a portrait tablet; a landscape
    // iPad was 306 before this work and is height-bound by design, so it is
    // reported, not floored.
    if (vp.width === 820) assert(g0.width >= 320, `${vp.name}: the dial shrank to ${fmt(g0.width)}px (floor 320, DEC-053)`);

    // ——— ring taps: each ring that is drawn today lights its planet, and the first retires the hint ———
    let tapped = 0;
    let firstTap = true;
    for (const name of RING_ORDER) {
      const times = await ringTimes(page, name);
      if (times === null) {
        console.log(`  ${name}: no ring today, skipped on the dial`);
        continue;
      }
      const g = await geometry(page);
      const hour = (times.rise + sweepHours(times.rise, times.set) / 2) % 24;
      const before = await dial(page);
      const wasLit = await lit(page);
      await tap(page, pointAt(g, hour, ringFraction(name)));
      if (wasLit === name) {
        // Tapping the lit ring releases it; tap once more to light it for the checks below.
        await page.waitForFunction(() => localStorage.getItem("day4.lit") === "");
        await tap(page, pointAt(g, hour, ringFraction(name)));
      }
      await waitLit(page, name);
      s = await state(page);
      assert.deepEqual(s.pressed, [name], `${vp.name}: tapping ${name}'s ring pressed ${s.pressed}`);
      assert(s.echo.startsWith(`${name} · up `), `${vp.name}: echo after tapping ${name}'s ring reads "${s.echo}"`);
      assert.notEqual(await dial(page), before, `${vp.name}: tapping ${name}'s ring did not change the dial`);
      assert(!s.hintShown, `${vp.name}: the hint is still shown after a ring tap`);
      assert.equal(await hinted(page), "1", `${vp.name}: the hint's retirement is not remembered`);
      console.log(`  ${name}: ring at ${fmt(hour)}h lit, echo "${s.echo}"`);
      tapped++;
      if (firstTap) {
        firstTap = false;
        await shot(page, `${vp.name}-lit-${name.toLowerCase()}.png`);
        // Persistence: the ring and the hint's retirement both survive a reload.
        await page.reload({ waitUntil: "networkidle" });
        await page.locator("#tonight-list .lrow").nth(1).waitFor({ state: "visible" });
        await settle(page);
        assert.equal(await lit(page), name, `${vp.name}: day4.lit did not survive the reload`);
        s = await state(page);
        assert.deepEqual(s.pressed, [name], `${vp.name}: after a reload the key presses ${s.pressed}`);
        assert(!s.hintShown, `${vp.name}: the hint came back after a reload`);
        assert(s.echo.startsWith(`${name} · `), `${vp.name}: the echo did not survive the reload ("${s.echo}")`);
      }
    }
    assert(tapped >= 3, `${vp.name}: only ${tapped} rings could be tapped on this date`);

    // ——— release: the lit ring tapped again; the echo takes no room ———
    {
      const name = await lit(page);
      const times = await ringTimes(page, name);
      const g = await geometry(page);
      const hour = (times.rise + sweepHours(times.rise, times.set) / 2) % 24;
      await tap(page, pointAt(g, hour, ringFraction(name)));
      await page.waitForFunction(() => localStorage.getItem("day4.lit") === "");
      s = await state(page);
      assert.deepEqual(s.pressed, [], `${vp.name}: released, yet the key presses ${s.pressed}`);
      assert.equal(s.echo, "", `${vp.name}: released, yet the echo reads "${s.echo}"`);
      assert.equal(s.echoHeight, 0, `${vp.name}: the empty echo line still takes ${fmt(s.echoHeight)}px`);
      await shot(page, `${vp.name}-released.png`);
    }

    // ——— misses: the gap inside the first ring, and the sun, light nothing; the sun still drags ———
    {
      const g = await geometry(page);
      const before = await dial(page);
      await tap(page, pointAt(g, 21, FACE.ringBase - FACE.ringStep * 2));
      assert.equal(await lit(page), "", `${vp.name}: a tap in the gap before the first ring lit ${await lit(page)}`);
      assert.equal(await dial(page), before, `${vp.name}: a tap in the gap changed the dial`);
      // The sun at the fixture: 19:00 at the station, on the band's middle.
      const sunHours = 19;
      const rMid = (FACE.dialOuter + FACE.dialInner) / 2;
      await tap(page, pointAt(g, sunHours, rMid));
      assert.equal(await lit(page), "", `${vp.name}: a tap on the sun lit ${await lit(page)}`);
      const clockBefore = await clock(page);
      const from = pointAt(g, sunHours, rMid);
      const to = pointAt(g, sunHours + 1.5, rMid);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 12 });
      await page.mouse.up();
      await settle(page);
      assert.notEqual(await clock(page), clockBefore, `${vp.name}: dragging the sun no longer scrubs time`);
      assert.equal(await lit(page), "", `${vp.name}: dragging the sun lit ${await lit(page)}`);
      // And a drag that starts on a ring is not a tap: it lights nothing.
      const times = await ringTimes(page, "Saturn");
      if (times !== null) {
        const hour = (times.rise + sweepHours(times.rise, times.set) / 2) % 24;
        const a = pointAt(g, hour, ringFraction("Saturn"));
        const b = pointAt(g, hour + 1, ringFraction("Saturn"));
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 8 });
        await page.mouse.up();
        await settle(page);
        assert.equal(await lit(page), "", `${vp.name}: a drag that began on Saturn's ring lit ${await lit(page)}`);
      }
      await page.getByRole("button", { name: "Return to the present" }).click();
      await settle(page);
      console.log("  gap, sun and a drag light nothing; the sun still scrubs");
    }

    // ——— the key: each button lights its ring; the lit one tapped again releases ———
    for (const name of RING_ORDER) {
      const before = await dial(page);
      await page.locator(`#ring-key .kbtn[data-planet="${name}"]`).click();
      await waitLit(page, name);
      s = await state(page);
      assert.deepEqual(s.pressed, [name], `${vp.name}: the key's ${name} pressed ${s.pressed}`);
      assert(s.echo.startsWith(`${name} · `), `${vp.name}: echo after the key's ${name} reads "${s.echo}"`);
      assert.notEqual(await dial(page), before, `${vp.name}: the key's ${name} did not change the dial`);
    }
    await page.locator('#ring-key .kbtn[data-planet="Saturn"]').click();
    await page.waitForFunction(() => localStorage.getItem("day4.lit") === "");
    assert.deepEqual((await state(page)).pressed, [], `${vp.name}: the key did not release Saturn`);
    console.log("  key: five buttons light and release");

    // ——— the Planets view: a ring tap opens the row; every row's swatch is a ring ———
    await page.getByRole("tab", { name: "Planets", exact: true }).click();
    await page.locator("#view-planets").waitFor({ state: "visible" });
    await settle(page);
    const rowSwatches = await page.evaluate(() =>
      [...document.querySelectorAll("#planets-list .pbtn .sw")].filter((sw) => sw.querySelector("canvas") !== null).length);
    assert.equal(rowSwatches, 5, `${vp.name}: ${rowSwatches} of 5 Planets rows have a ring swatch`);
    {
      const name = RING_ORDER.find(async (n) => (await ringTimes(page, n)) !== null) ?? "Saturn";
      const times = await ringTimes(page, name);
      const g = await geometry(page);
      const hour = (times.rise + sweepHours(times.rise, times.set) / 2) % 24;
      await tap(page, pointAt(g, hour, ringFraction(name)));
      await waitLit(page, name);
      const row = await page.locator(`#planets-list .pbtn[data-planet="${name}"]`).evaluate((b) => ({
        pressed: b.getAttribute("aria-pressed"), expanded: b.getAttribute("aria-expanded"), open: !b.nextElementSibling.hidden,
      }));
      assert.deepEqual(row, { pressed: "true", expanded: "true", open: true }, `${vp.name}: a ring tap in Planets did not open ${name}'s row`);
      console.log(`  Planets: a tap on ${name}'s ring opens its row`);
    }

    assert.deepEqual(errors, [], `${vp.name}: browser errors`);
    await context.close();
    console.log(`rings: ${vp.name} OK`);
  }
} finally {
  await browser.close();
}
