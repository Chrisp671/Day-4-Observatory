// Drive Parker's five asks (REQ-017, DEC-057) in a real browser:
//   1. the date and time stand above the countdown, always, and the event's own
//      time stands beside it — the same instant the sun bay reads;
//   2. the rail steps by the second and the minute, each arrow a real button
//      that says what it does, and SET TIME opens the browser's own
//      date-and-time field, which moves the dial to what is entered, ignores
//      what is not a time, and does not release a held clock;
//   3. the sun still drags;
//   4. a drag adds up its turns: two and a half turns forward is sixty hours,
//      three days on, and it comes back the same way — with one finger, and
//      with a second finger resting on the dial, which is the case that used
//      to snap the day back to where it began;
//   5. the moon's rise and set stand in the sun's own shape, size and ink.
// Screenshots each state at phone, tablet and tablet-on-its-side sizes.
//
// usage: node scripts/timecontrols.mjs [http://127.0.0.1:4173/] [outDir]
// Uses the review pipeline's pinned Playwright (npm ci --prefix scripts/review).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
// A local check only: it seeds storage and drives input in the page it loads.
const target = new URL(url);
assert(["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:", "drive a local preview only");
const out = resolve(process.argv[3] ?? "web/.shots/timecontrols");
/** 7:00 pm on Wednesday 2 September 2026 at the station's clock (EDT). */
const FIXED_TIME = "2026-09-02T23:00:00.000Z";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, stacked: true },
  { name: "tablet", width: 820, height: 1180, stacked: true },
  // A tablet on its side: the date and time stand beside the countdown, so
  // the height-bound dial gives up nothing for them.
  { name: "tablet-wide", width: 1180, height: 820, stacked: false },
];
const DIAL_FLOOR = 320;
const THUMB = 44;
/** iOS Safari zooms the page on focusing a field set smaller than this. */
const NO_ZOOM = 16;

const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
});
const shot = async (page, file) => {
  await settle(page);
  await page.screenshot({ path: resolve(out, file), scale: "css", fullPage: true, animations: "disabled" });
};
const text = (page, sel) => page.locator(sel).evaluate((el) => el.textContent.trim());
const when = (page) => text(page, "#when");
const moved = (page) => page.locator("#when").evaluate((el) => el.classList.contains("shifted"));
const step = (page, name) => page.getByRole("button", { name, exact: true }).click();
/** The field's value to the second: a browser hands a whole minute back
 *  without its ":00", which is the same instant. */
const toSecond = (value) => (/T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value);
const fieldValue = async (page) => toSecond(await page.locator("#time-input").inputValue());

/** Where the dial is, and how far out the sun's grab circle sits: probed with
 *  the pointer rather than copied from the painter, so a moved band is found.
 *
 *  Measured from the top of the page, where the whole dial is on screen at
 *  every size driven here. Scrolling the dial itself to the top leaves a phone
 *  near the bottom of its page, and there a drag moves the page: the ledger's
 *  rows re-wrap as the hours pass, the document gets a line shorter, the
 *  browser clamps the scroll, and the dial slides 14px under a synthetic
 *  finger that cannot follow it as a real one would — a quarter of an hour of
 *  error that came and went from run to run until it was traced to this. */
const dialGeometry = async (page, sunHours) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  const box = await page.locator("#sky").boundingBox();
  const g = { cx: box.x + box.width / 2, cy: box.y + box.height / 2, half: box.width / 2, fraction: 0 };
  for (let f = 0.5; f < 1; f += 0.01) {
    const p = at(g, sunHours, f);
    await page.mouse.move(p.x, p.y);
    if (await page.locator("#sky").evaluate((el) => el.style.cursor) === "grab") {
      g.fraction = f + 0.03;
      break;
    }
  }
  assert(g.fraction > 0, "the sun could not be found on the dial to grab");
  await page.mouse.move(0, 0);
  return g;
};
/** Noon at the top, clockwise: the dial's own convention (ui/clockface.ts). */
const angle = (hours) => (hours / 24) * 2 * Math.PI + Math.PI / 2;
const at = (g, hours, fraction = g.fraction) => ({
  x: g.cx + Math.cos(angle(hours)) * g.half * fraction,
  y: g.cy + Math.sin(angle(hours)) * g.half * fraction,
});

/** Drag the sun round by `hours` (signed) with real touch points. `rest` is a
 *  second finger laid on the dial for the whole drag, trembling by a pixel as
 *  a resting finger does. */
const touchDrag = async (cdp, g, fromHours, hours, rest = null) => {
  const steps = Math.ceil(Math.abs(hours) * 4);
  const resting = (i) => (rest === null ? [] : [{ x: rest.x + (i % 2), y: rest.y, id: 2 }]);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...at(g, fromHours), id: 1 }] });
  if (rest !== null) {
    // The second finger comes down after the first has the sun: a touchStart
    // naming both points presses the new one and leaves the first as it was.
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...at(g, fromHours), id: 1 }, ...resting(0)] });
  }
  for (let i = 1; i <= steps; i++) {
    const p = at(g, fromHours + (hours * i) / steps);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...p, id: 1 }, ...resting(i)] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, hasTouch: true,
      locale: "en-US", timezoneId: "America/New_York", reducedMotion: "reduce", serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(`uncaught: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
    await page.clock.setFixedTime(new Date(FIXED_TIME));
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("day4-observatory.station", JSON.stringify({ lat: 40, lon: -74 }));
    });
    await page.goto(target.href, { waitUntil: "networkidle" });
    await page.locator("#tonight-list .lrow").first().waitFor({ state: "visible" });
    await settle(page);
    const say = (line) => console.log(`timecontrols: ${vp.name} ${line}`);

    /* ————— 1. the date and time above the countdown ————— */
    assert.equal(await when(page), "Wed Sep 2 · 7:00 pm", `${vp.name}: the date and time above the countdown`);
    assert.equal(await moved(page), false, `${vp.name}: a live clock is marked as moved`);
    assert.equal(await text(page, "#hero-k"), "Sunset in", `${vp.name}: the countdown's words`);
    const heroAt = await text(page, "#hero-at");
    const sunSet = await text(page, "#set");
    assert.match(heroAt, /^at \d{1,2}:\d{2} pm$/, `${vp.name}: the event's time reads "${heroAt}"`);
    assert.equal(heroAt, `at ${sunSet.replace("↓", "")}`,
      `${vp.name}: the countdown counts to ${heroAt}, but the sun bay says ${sunSet}`);
    const header = await page.evaluate(() => {
      const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
      const size = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
      return { when: box("#when"), words: box("#hero-k"), at: box("#hero-at"), whenPx: size("#when"), atPx: size("#hero-at"),
        pageWidth: document.documentElement.scrollWidth };
    });
    if (vp.stacked) {
      assert(header.when.bottom <= header.words.top + 1,
        `${vp.name}: the date and time are not above the countdown's words (${header.when.bottom} vs ${header.words.top})`);
    } else {
      assert(header.when.right <= header.words.left && header.when.top < header.words.bottom && header.when.bottom > header.words.top,
        `${vp.name}: on a short screen the date and time should stand beside the countdown, on its row`);
    }
    assert(header.whenPx >= 15 && header.atPx >= 14, `${vp.name}: header type too small (${header.whenPx}px, ${header.atPx}px)`);
    assert(header.when.left >= 0 && header.when.right <= vp.width && header.at.right <= vp.width && header.pageWidth <= vp.width,
      `${vp.name}: the header's new lines run past the viewport`);
    say(`"${await when(page)}" over "Sunset in ${await text(page, "#hero-v")} ${heroAt}"`);
    await shot(page, `${vp.name}-live.png`);

    /* ————— 5. the moon's rise and set, in the sun's own shape ————— */
    const bays = await page.evaluate(() => {
      const of = (id) => {
        const el = document.getElementById(id);
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { text: el.textContent.trim(), size: cs.fontSize, color: cs.color, family: cs.fontFamily, top: r.top, height: r.height,
          spoken: [...el.querySelectorAll(".glyph")].map((g) => g.getAttribute("aria-label")) };
      };
      return { sunRise: of("rise"), sunSet: of("set"), moonRise: of("moon-rise"), moonSet: of("moon-set"), phase: of("moon") };
    });
    assert.match(bays.moonRise.text, /^↑\d{1,2}:\d{2} [ap]m$/, `${vp.name}: moonrise reads "${bays.moonRise.text}"`);
    assert.match(bays.moonSet.text, /^↓\d{1,2}:\d{2} [ap]m( (Sun|Mon|Tue|Wed|Thu|Fri|Sat))?$/, `${vp.name}: moonset reads "${bays.moonSet.text}"`);
    for (const key of ["size", "color", "family"]) {
      assert.equal(bays.moonRise[key], bays.sunRise[key], `${vp.name}: moonrise and sunrise differ in ${key}`);
      assert.equal(bays.moonSet[key], bays.sunSet[key], `${vp.name}: moonset and sunset differ in ${key}`);
    }
    assert.deepEqual([bays.moonRise.spoken, bays.moonSet.spoken], [["rises"], ["sets"]], `${vp.name}: the moon's arrows are not spoken as words`);
    assert.notEqual(bays.phase.text, "", `${vp.name}: the moon's phase has left the bay`);
    assert(parseFloat(bays.phase.size) >= 12, `${vp.name}: the phase is ${bays.phase.size}`);
    say(`moon ${bays.phase.text} ${bays.moonRise.text} ${bays.moonSet.text} — in the sun's ${bays.sunRise.size} and ${bays.sunSet.size}`);

    /* ————— 2a. the second and the minute, on the rail ————— */
    const cells = await page.locator(".cell span").allTextContents();
    assert.deepEqual(cells, ["SEC", "MIN", "HOUR", "DAY", "PHASE", "MONTH"], `${vp.name}: the rail's units`);
    await step(page, "Forward one minute");
    assert.equal(await when(page), "Wed Sep 2 · 7:01:00 pm", `${vp.name}: one minute forward`);
    assert.equal(await moved(page), true, `${vp.name}: a moved clock is not marked`);
    for (let i = 0; i < 3; i++) await step(page, "Forward one second");
    assert.equal(await when(page), "Wed Sep 2 · 7:01:03 pm", `${vp.name}: three seconds forward`);
    await step(page, "Back one second");
    await step(page, "Back one minute");
    await step(page, "Back one minute");
    assert.equal(await when(page), "Wed Sep 2 · 6:59:02 pm", `${vp.name}: a second and two minutes back`);
    // Fine steps carry the date like any other: five hours on is tomorrow.
    for (let i = 0; i < 5; i++) await step(page, "Forward one hour");
    assert.equal(await when(page), "Wed Sep 2 · 11:59:02 pm", `${vp.name}: just before midnight`);
    for (let i = 0; i < 58; i++) await step(page, "Forward one second");
    assert.equal(await when(page), "Thu Sep 3 · 12:00:00 am", `${vp.name}: a one-second step across midnight did not carry the date`);
    await step(page, "Back one second");
    assert.equal(await when(page), "Wed Sep 2 · 11:59:59 pm", `${vp.name}: and back across it`);
    await page.locator("#now").click();
    assert.equal(await when(page), "Wed Sep 2 · 7:00 pm", `${vp.name}: NOW did not return to the present`);
    assert.equal(await moved(page), false, `${vp.name}: back at the present, still marked as moved`);
    say("steps by the second and the minute, across midnight and back");

    /* ————— 2b. SET TIME: the browser's own date-and-time field ————— */
    const toggle = page.locator("#time-toggle");
    const entry = page.locator("#time-entry");
    const field = page.locator("#time-input");
    assert.equal(await toggle.textContent(), "SET TIME", `${vp.name}: the control is not labelled SET TIME`);
    assert.equal(await toggle.getAttribute("aria-expanded"), "false", `${vp.name}: SET TIME starts open`);
    assert.equal(await entry.isVisible(), false, `${vp.name}: the entry is on a page that did not ask for it`);
    const dialClosed = (await page.locator("#sky").boundingBox()).width;
    await toggle.click();
    await entry.waitFor({ state: "visible" });
    assert.equal(await toggle.getAttribute("aria-expanded"), "true", `${vp.name}: SET TIME does not say it is open`);
    const fieldFacts = await field.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { type: el.type, step: el.step, value: el.value, min: el.min, max: el.max, px: parseFloat(getComputedStyle(el).fontSize),
        height: r.height, left: r.left, right: r.right, label: el.labels?.[0]?.textContent ?? "", focused: document.activeElement === el };
    });
    assert.equal(fieldFacts.type, "datetime-local", `${vp.name}: not the browser's date-and-time field`);
    assert.equal(fieldFacts.step, "1", `${vp.name}: the field does not take seconds`);
    assert.equal(toSecond(fieldFacts.value), "2026-09-02T19:00:00", `${vp.name}: the field does not show the instant on the dial`);
    assert.equal(fieldFacts.label, "DATE AND TIME", `${vp.name}: the field has no label`);
    assert.equal(fieldFacts.focused, true, `${vp.name}: opening the entry did not put the reader in the field`);
    assert(fieldFacts.px >= NO_ZOOM, `${vp.name}: the field is ${fieldFacts.px}px; iOS zooms the page under ${NO_ZOOM}`);
    assert(fieldFacts.height >= THUMB, `${vp.name}: the field is ${fieldFacts.height}px tall`);
    assert(fieldFacts.left >= 0 && fieldFacts.right <= vp.width, `${vp.name}: the field runs past the viewport`);
    assert.match(fieldFacts.min, /^1000-01-01T/, `${vp.name}: the field's earliest date`);
    // A tablet's locked viewport would take the row out of the dial; it keeps its floor.
    const dialOpen = (await page.locator("#sky").boundingBox()).width;
    if (vp.width > 720) {
      assert(dialOpen >= DIAL_FLOOR, `${vp.name}: the dial shrank to ${dialOpen}px with the entry open (floor ${DIAL_FLOOR})`);
    } else {
      assert.equal(dialOpen, dialClosed, `${vp.name}: opening the entry resized the dial`);
    }

    await field.fill("2026-12-24T21:00:30");
    assert.equal(await when(page), "Thu Dec 24 · 9:00:30 pm", `${vp.name}: the dial did not go to the entered date and time`);
    assert.equal(await text(page, "#timeline"), "9:00 pm", `${vp.name}: the station clock did not follow`);
    assert.equal(await text(page, "#hero-k"), "Sunrise in", `${vp.name}: at 9 pm the next event is sunrise`);
    assert.match(await text(page, "#hero-at"), /^at \d{1,2}:\d{2} am Fri Dec 25$/,
      `${vp.name}: tomorrow's sunrise does not name its date ("${await text(page, "#hero-at")}")`);
    assert.equal(await moved(page), true, `${vp.name}: an entered time is not marked as moved`);
    await shot(page, `${vp.name}-entered.png`);
    // A year into the next one is named, so twelve months on is not mistaken for today.
    await field.fill("2027-12-24T21:00:30");
    assert.equal(await when(page), "Fri Dec 24, 2027 · 9:00:30 pm", `${vp.name}: a date in another year does not say so`);
    await field.fill("2026-12-24T21:00:30");

    // What is not a time moves nothing: a cleared field, a year mid-typing.
    await field.fill("");
    assert.equal(await when(page), "Thu Dec 24 · 9:00:30 pm", `${vp.name}: clearing the field moved the dial`);
    await field.evaluate((el) => {
      el.value = "0202-12-24T21:00:30";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    assert.equal(await when(page), "Thu Dec 24 · 9:00:30 pm", `${vp.name}: a half-typed year moved the dial`);
    // And it does not linger as if it had taken: leaving the field restores the dial's own instant.
    await field.blur();
    assert.equal(await fieldValue(page), "2026-12-24T21:00:30", `${vp.name}: the field kept a value the dial never took`);

    // Stepping while the entry is open keeps the field honest.
    await step(page, "Forward one minute");
    assert.equal(await fieldValue(page), "2026-12-24T21:01:30", `${vp.name}: the field does not follow a step`);

    // A held clock stays held: an entered time moves it without releasing it.
    await page.locator("#freeze").click();
    assert.equal(await page.locator("#freeze").getAttribute("aria-pressed"), "true", `${vp.name}: HOLD did not press`);
    await field.fill("2026-06-21T04:30:15");
    await field.blur();
    assert.equal(await when(page), "Sun Jun 21 · 4:30:15 am", `${vp.name}: a held clock ignored the entered time`);
    assert.equal(await page.locator("#freeze").getAttribute("aria-pressed"), "true", `${vp.name}: entering a time released the hold`);

    await page.locator("#now").click();
    assert.equal(await when(page), "Wed Sep 2 · 7:00 pm", `${vp.name}: NOW did not return from an entered time`);
    assert.equal(await page.locator("#freeze").getAttribute("aria-pressed"), "false", `${vp.name}: NOW left the clock held`);
    assert.equal(await fieldValue(page), "2026-09-02T19:00:00", `${vp.name}: the field did not return with the dial`);
    await toggle.click();
    assert.equal(await entry.isVisible(), false, `${vp.name}: SET TIME does not close the entry`);
    assert.equal(await toggle.getAttribute("aria-expanded"), "false", `${vp.name}: SET TIME still says open`);
    say("SET TIME opens the date-and-time field; it moves the dial, ignores what is not a time, keeps a hold");

    /* ————— 3 and 4. the sun drags, and the turns add up ————— */
    const cdp = await context.newCDPSession(page);
    const SUN = 19; // 7:00 pm on the dial
    let g = await dialGeometry(page, SUN);

    // Two and a half turns forward: sixty hours, three days on.
    const scrolledAt = await page.evaluate(() => window.scrollY);
    await touchDrag(cdp, g, SUN, 60);
    assert.match(await when(page), /^Sat Sep 5 · (6:5\d|7:0\d):\d{2} am$/,
      `${vp.name}: two and a half turns forward should reach Saturday morning, read "${await when(page)}"`);
    // The dial owns its gestures: a drag on it must not scroll the page.
    assert.equal(await page.evaluate(() => window.scrollY), scrolledAt, `${vp.name}: dragging the sun scrolled the page`);
    await shot(page, `${vp.name}-dragged.png`);
    // And three turns back from there, through where it began, into the days before.
    g = await dialGeometry(page, 7);
    await touchDrag(cdp, g, 7, -72);
    assert.match(await when(page), /^Wed Sep 2 · (6:5\d|7:0\d):\d{2} am$/,
      `${vp.name}: three turns back should reach Wednesday morning, read "${await when(page)}"`);
    await page.locator("#now").click();
    say("a drag of two and a half turns is three days on; three turns back returns through them");

    // The same drag with a second finger resting on the dial. Before this
    // was fixed the day snapped back to Wednesday every full turn. The
    // resting finger is deliberately NOT at a whole quarter-hour: the drag is
    // sampled every quarter of an hour, and a rest point exactly opposite one
    // of those samples lands on the twelve-hour tie, where the old sum
    // happened to come out right going forward and hid the defect.
    g = await dialGeometry(page, SUN);
    await touchDrag(cdp, g, SUN, 60, at(g, 6.1, 0.3));
    assert.match(await when(page), /^Sat Sep 5 · (6:5\d|7:0\d):\d{2} am$/,
      `${vp.name}: with a second finger resting on the dial the turns did not add up, read "${await when(page)}"`);
    await page.locator("#now").click();
    g = await dialGeometry(page, SUN);
    await touchDrag(cdp, g, SUN, -48, at(g, 13.1, 0.5));
    assert.match(await when(page), /^Mon Aug 31 · (6:5\d|7:0\d):\d{2} pm$/,
      `${vp.name}: two turns back with a resting finger should reach Monday evening, read "${await when(page)}"`);
    await page.locator("#now").click();
    say("a second finger resting on the dial no longer anchors the drag");

    // A mouse drags it too, and its release ends the drag.
    g = await dialGeometry(page, SUN);
    const from = at(g, SUN);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 120; i++) {
      const p = at(g, SUN + (30 * i) / 120);
      await page.mouse.move(p.x, p.y);
    }
    await page.mouse.up();
    const afterMouse = await when(page);
    assert.match(afterMouse, /^Fri Sep 4 · (12:5\d|1:0\d):\d{2} am$/,
      `${vp.name}: a mouse drag of a turn and a quarter should reach early Friday, read "${afterMouse}"`);
    const free = at(g, SUN + 36, 0.4);
    await page.mouse.move(free.x, free.y);
    assert.equal(await when(page), afterMouse, `${vp.name}: the dial kept following the pointer after release`);
    await page.locator("#now").click();

    assert.deepEqual(errors, [], `${vp.name}: the page reported errors: ${errors.join("; ")}`);
    await context.close();
  }
  console.log("timecontrols: OK");
} finally {
  await browser.close();
}
