import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
];
export const STATES = ['loaded', 'month', 'tonight', 'second-row'];
export const FIXED_TIME = '2026-09-02T23:00:00.000Z';

export async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
}

export async function capture(url, output) {
  const target = new URL(url);
  assert(['localhost', '127.0.0.1'].includes(target.hostname), 'Capture requires localhost');
  assert.equal(target.protocol, 'http:');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  const manifest = { version: 1, time: FIXED_TIME, timezone: 'America/New_York',
    station: { lat: 40, lon: -74 }, scale: 'css', screenshots: [] };
  try {
    for (const viewport of VIEWPORTS) {
      for (const state of STATES) {
        // Every state starts from first-visit storage, not the previous screenshot.
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1, locale: 'en-US', timezoneId: manifest.timezone,
          reducedMotion: 'reduce', serviceWorkers: 'block',
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        const errors = [];
        page.on('pageerror', () => errors.push('Uncaught browser error'));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push('Browser console error');
        });
        page.on('response', (response) => {
          if (response.status() >= 400) errors.push(`HTTP ${response.status()}`);
        });
        await page.clock.setFixedTime(new Date(FIXED_TIME));
        await page.addInitScript(() => {
          localStorage.clear();
          localStorage.setItem('day4-observatory.station', JSON.stringify({ lat: 40, lon: -74 }));
          window.__reviewCanvasText = [];
          for (const method of ['fillText', 'strokeText']) {
            const original = CanvasRenderingContext2D.prototype[method];
            CanvasRenderingContext2D.prototype[method] = function (text, ...args) {
              const entry = `${this.canvas.id}: ${String(text)}`;
              if (window.__reviewCanvasText.length < 200 && !window.__reviewCanvasText.includes(entry)) {
                window.__reviewCanvasText.push(entry);
              }
              return original.call(this, text, ...args);
            };
          }
        });
        const response = await page.goto(target.href, { waitUntil: 'networkidle' });
        assert(response?.ok(), 'Preview page did not load');
        await page.locator('#tonight-list .lrow').nth(1).waitFor({ state: 'visible' });
        await settle(page);
        const beforeCanvas = await page.locator('canvas').evaluateAll((nodes) => nodes.map((node) => node.toDataURL()));
        if (state === 'month') {
          await page.getByRole('button', { name: 'Forward one month', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('#travelled')?.textContent?.includes('October'));
        } else if (state === 'tonight') {
          await page.locator('#tonight-toggle').click();
          await page.waitForFunction(() => document.querySelector('#tonight-toggle')?.getAttribute('aria-expanded') === 'true');
          await page.locator('#tonight-all').waitFor({ state: 'visible' });
        } else if (state === 'second-row') {
          const row = page.locator('#tonight-list .lrow').nth(1);
          const planet = await row.getAttribute('data-planet');
          assert(planet, 'Second row is not a selectable planet in this fixture');
          await row.click();
          assert.equal(await page.evaluate(() => localStorage.getItem('day4.lit')), planet);
        }
        await settle(page);
        if (state === 'month' || state === 'second-row') {
          const afterCanvas = await page.locator('canvas').evaluateAll((nodes) => nodes.map((node) => node.toDataURL()));
          assert.notDeepEqual(afterCanvas, beforeCanvas, `${state} did not change the rendered dial`);
        }
        // Clicking scrolls controls into view; all screenshots use the same top-of-page frame.
        await page.evaluate(() => window.scrollTo(0, 0));
        await settle(page);
        const file = `${viewport.name}-${state}.png`;
        await page.screenshot({ path: resolve(output, file), scale: 'css', fullPage: false, animations: 'disabled' });
        manifest.screenshots.push({ file, viewport: { width: viewport.width, height: viewport.height },
          state, canvasText: await page.evaluate(() => window.__reviewCanvasText),
          scrollHeight: await page.evaluate(() => document.documentElement.scrollHeight), errors });
        await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
        await context.close();
        assert.deepEqual(errors, [], `${file}: browser errors`);
      }
    }
  } finally {
    await browser.close();
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await capture(process.argv[2] ?? 'http://localhost:4173/', resolve(process.argv[3] ?? 'scripts/review/output'));
}
