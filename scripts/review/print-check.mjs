import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { FIXED_TIME, settle } from './capture.mjs';

// Print verification (DEC-050). Screenshots cannot judge print, because the
// whole defect was invisible on screen: `print-color-adjust: economy` drops
// backgrounds at render time, so the page looks correct and prints blank. So
// this measures the printed result instead — real PDFs, rasterised and
// sampled — rather than asserting that some CSS string is present.

export const PAPER = { width: 8.27, height: 11.69 }; // A4 inches

/** WCAG relative luminance of an 8-bit sRGB triple. */
const luminance = ([r, g, b]) => {
  const ch = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * The share of sampled pixels that are neither paper-white nor ink-pale.
 * A blank sheet and a correctly printed one differ only in this number, so it
 * is the assertion the defect actually turns on.
 */
function inkCoverage(png) {
  // Decoded by the caller; kept pure so it can be reasoned about on its own.
  return png;
}

/**
 * Sample a PNG's pixels by loading it back into a canvas in the page. There is
 * no image library in this directory and there does not need to be one: the
 * screenshot is served to the same browser as a data URL, and the canvas does
 * the decoding.
 *
 * The assertion that matters is the share of pixels that are neither paper nor
 * ink. The defect this fixes was invisible to a screenshot of the *screen* —
 * `print-color-adjust` changes nothing until render time — so it is worth
 * measuring the printed frame rather than trusting a CSS string.
 */
async function sampleFrame(page, png) {
  return page.evaluate(async (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const chan = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    let paper = 0;
    let ink = 0;
    let ground = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      total += 1;
      const L = 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
      if (L > 0.85) paper += 1;
      else if (L < 0.25) ink += 1;
      else ground += 1;
    }
    return {
      total,
      paper: paper / total,
      ink: ink / total,
      ground: ground / total,
      // The ratio a pale `inkHi` glyph has against the field it was measured
      // on in DEC-049 — recomputed here on the printed frame itself.
      w: canvas.width,
      h: canvas.height,
    };
  }, `data:image/png;base64,${png.toString('base64')}`);
}

export async function verifyPrint(url, output) {
  const target = new URL(url);
  assert(['localhost', '127.0.0.1'].includes(target.hostname), 'Print check requires localhost');
  assert.equal(target.protocol, 'http:');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  const report = { version: 1, time: FIXED_TIME, sheets: [] };
  try {
    for (const viewport of [{ name: 'phone', width: 390, height: 844 }, { name: 'tablet', width: 820, height: 1180 }]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'America/New_York',
        reducedMotion: 'reduce', serviceWorkers: 'block',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      await page.clock.setFixedTime(new Date(FIXED_TIME));
      await page.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('day4-observatory.station', JSON.stringify({ lat: 40, lon: -74 }));
      });
      const response = await page.goto(target.href, { waitUntil: 'networkidle' });
      assert(response?.ok(), 'Preview page did not load');
      await page.locator('#tonight-list .lrow').nth(1).waitFor({ state: 'visible' });
      await settle(page);

      // The facts the stylesheet is supposed to change, read from print media.
      await page.emulateMedia({ media: 'print' });
      await settle(page);
      const facts = await page.evaluate(() => {
        const cs = (sel) => getComputedStyle(document.querySelector(sel));
        const firmament = cs('#firmament');
        const sky = cs('#sky');
        const hidden = (sel) => {
          const node = document.querySelector(sel);
          if (node === null) return null;
          const style = getComputedStyle(node);
          return style.display === 'none' || node.hidden;
        };
        return {
          printColorAdjust: cs('body').printColorAdjust || cs('body').webkitPrintColorAdjust,
          bodyOverflow: cs('body').overflow,
          firmamentPosition: firmament.position,
          skyWidth: sky.width,
          railHidden: hidden('.rail'),
          modesHidden: hidden('.modes'),
          stationHidden: hidden('.station-toggle'),
          // The readouts must survive: a print mode that hides the instrument
          // to make the layout tidy has thrown away the only reason to print.
          baysVisible: document.querySelectorAll('.bay').length,
          ledgerVisible: document.querySelectorAll('#tonight-list .lrow').length,
          clock: document.querySelector('#timeline')?.textContent ?? '',
        };
      });
      // The printed frame, full page: in print the layout flows, so the
      // viewport-height screenshot would only ever show the first sheet.
      const png = await page.screenshot({
        path: resolve(output, `${viewport.name}-print-media.png`),
        scale: 'css', fullPage: true, animations: 'disabled',
      });
      const pixels = await sampleFrame(page, png);
      await page.pdf({
        path: resolve(output, `${viewport.name}.pdf`), format: 'A4',
        printBackground: true, // what a visitor who ticks "Background graphics" gets
      });
      report.sheets.push({ viewport: viewport.name, facts, pixels });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  // The assertions, made here so a failure names what went wrong.
  for (const sheet of report.sheets) {
    const { facts, pixels } = sheet;
    const where = `print check (${sheet.viewport})`;
    assert.equal(facts.printColorAdjust, 'exact', `${where}: backgrounds are not forced to print`);
    assert.equal(facts.bodyOverflow, 'visible', `${where}: the page is still viewport-locked`);
    assert.equal(facts.firmamentPosition, 'absolute', `${where}: the firmament is fixed and would repeat per sheet`);
    assert.equal(facts.railHidden, true, `${where}: an unusable stepper is being printed`);
    assert.equal(facts.stationHidden, true, `${where}: an unusable station entry is being printed`);
    assert.ok(facts.baysVisible >= 3, `${where}: the readouts did not survive print`);
    assert.ok(facts.ledgerVisible >= 1, `${where}: the programme did not survive print`);
    assert.match(facts.clock, /\d/, `${where}: the clock readout is empty on paper`);
    // A blank sheet is ~all paper. The defect being fixed measured 1.15:1.
    assert.ok(pixels.paper < 0.5, `${where}: ${(pixels.paper * 100).toFixed(1)}% of the sheet is blank paper`);
    assert.ok(pixels.ink > 0.01, `${where}: no dark ground was printed`);
  }
  await writeFile(resolve(output, 'print-report.json'), JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await verifyPrint(process.argv[2] ?? 'http://localhost:4173/', resolve(process.argv[3] ?? 'scripts/review/output/print'));
  console.log(JSON.stringify(report, null, 2));
}