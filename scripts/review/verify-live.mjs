import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { VIEWPORTS, settle } from './capture.mjs';

export function assetPaths(html, base) {
  const paths = new Set();
  // Vite-generated HTML only: scripts, stylesheets and modulepreloads.
  for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    if (/^<link/i.test(tag[0]) && !/\brel\s*=\s*["'](?:stylesheet|modulepreload)["']/i.test(tag[0])) continue;
    const match = /\b(?:src|href)\s*=\s*["']([^"']+)["']/i.exec(tag[0]);
    if (!match) continue;
    const url = new URL(match[1], base);
    // Existing Google Fonts CSS is a hosted font dependency, not a Vite bundle.
    // Never fetch this URL in the hash verifier. All script URLs remain strict.
    if (/^<link/i.test(tag[0]) && url.origin === 'https://fonts.googleapis.com'
        && /^\/css2?$/.test(url.pathname) && !url.username && !url.password) continue;
    assert.equal(url.origin, base.origin, 'Cross-origin bundle reference');
    assert(!url.username && !url.password && !url.search && !url.hash, 'Invalid bundle URL');
    assert(url.pathname.startsWith(base.pathname), 'Bundle outside deployment path');
    const relative = decodeURIComponent(url.pathname.slice(base.pathname.length));
    assert(/^assets\/[A-Za-z0-9_./-]+\.(?:js|css)$/.test(relative), 'Unexpected bundle path');
    assert(!relative.split('/').includes('..'), 'Bundle path traversal');
    paths.add(relative);
  }
  assert(paths.size > 0 && paths.size <= 100, 'No bundles or too many bundles');
  return [...paths].sort();
}

async function fetchBytes(url, limit) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { 'Cache-Control': 'no-cache' } });
  assert(response.ok, `Live fetch failed: HTTP ${response.status}`);
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    assert(length <= limit, 'Live response too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function verifyBundles(rawUrl, dist, { allowLocal = false, attempts = 6, delay = 10000 } = {}) {
  const base = new URL(rawUrl);
  assert(!base.username && !base.password && !base.search && !base.hash, 'Invalid deployment URL');
  const local = ['localhost', '127.0.0.1'].includes(base.hostname);
  // Production is this repository's GitHub Pages origin, not a caller-selected fetch proxy.
  assert((base.protocol === 'https:' && base.hostname === 'chrisp671.github.io' && !base.port)
    || (allowLocal && local && base.protocol === 'http:'), 'Unapproved deployment origin');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const root = await realpath(dist);
  const expected = assetPaths(await readFile(resolve(root, 'index.html'), 'utf8'), base);
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const html = (await fetchBytes(base, 1024 * 1024)).toString('utf8');
      assert.deepEqual(assetPaths(html, base), expected, 'Live HTML has different bundle hashes');
      const hashes = {};
      for (const asset of expected) {
        const path = await realpath(resolve(root, asset));
        assert(path.startsWith(root + sep), 'Local asset escaped dist');
        const built = await readFile(path);
        const live = await fetchBytes(new URL(asset, base), 10 * 1024 * 1024);
        const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
        hashes[asset] = hash(built);
        assert.equal(hash(live), hashes[asset], 'Live bundle content differs from the build');
      }
      return { url: base.href, hashes };
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise((done) => setTimeout(done, delay));
    }
  }
  throw lastError;
}

async function main() {
  const output = resolve('scripts/review/output/live');
  await mkdir(output, { recursive: true });
  const result = await verifyBundles(process.env.LIVE_URL, process.env.DIST_DIR ?? 'web/dist');
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1, serviceWorkers: 'block' });
      const errors = [];
      page.on('pageerror', () => errors.push('Live JavaScript error'));
      const response = await page.goto(result.url, { waitUntil: 'networkidle', timeout: 30000 });
      assert(response?.ok(), 'Live page failed to load');
      await page.locator('#tonight-toggle').waitFor({ state: 'visible' });
      await settle(page);
      await page.screenshot({ path: resolve(output, `${viewport.name}-live.png`), scale: 'css' });
      assert.deepEqual(errors, [], 'Live browser errors');
      await page.close();
    }
  } finally { await browser.close(); }
  await writeFile(resolve(output, 'verification.json'), JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
