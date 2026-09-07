import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assetPaths, verifyBundles } from './verify-live.mjs';

const html = '<script type="module" src="./assets/index-abc.js"></script><link rel="stylesheet" href="./assets/index-def.css">';

test('asset parser preserves project mount and refuses foreign/traversal URLs', () => {
  const base = new URL('https://chrisp671.github.io/Day-4-Observatory/');
  assert.deepEqual(assetPaths(html, base), ['assets/index-abc.js', 'assets/index-def.css']);
  assert.deepEqual(assetPaths(html + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel">', base),
    ['assets/index-abc.js', 'assets/index-def.css']);
  assert.throws(() => assetPaths(html + '<script src="https://fonts.googleapis.com/css2"></script>', base));
  for (const url of ['https://evil.example/a.js', '//127.0.0.1/a.js', '../assets/a.js', './assets/%2e%2e/a.js', './assets/a.js?x=1']) {
    assert.throws(() => assetPaths(`<script src="${url}"></script>`, base));
  }
  assert.throws(() => assetPaths('<html>no build</html>', base));
});

test('live verification detects stale HTML, same-name tampering, redirects and propagation', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'day4-review-'));
  await mkdir(join(dir, 'assets'));
  await writeFile(join(dir, 'index.html'), html);
  await writeFile(join(dir, 'assets/index-abc.js'), 'built-js');
  await writeFile(join(dir, 'assets/index-def.css'), 'built-css');
  let mode = 'match';
  let pageRequests = 0;
  const server = createServer((req, res) => {
    if (mode === 'redirect') { res.writeHead(302, { location: 'http://127.0.0.1:1/' }); res.end(); return; }
    if (req.url === '/project/') {
      pageRequests++;
      const stale = mode === 'stale' || (mode === 'propagate' && pageRequests === 1);
      res.end(stale ? html.replaceAll('abc', 'old') : html);
    } else if (req.url.endsWith('.js')) res.end(mode === 'tamper' ? 'tampered-js' : 'built-js');
    else res.end('built-css');
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  t.after(async () => {
    await new Promise((done) => server.close(done));
    // Only the unique directory returned by mkdtemp is removed.
    await rm(dir, { recursive: true });
  });
  const url = `http://127.0.0.1:${server.address().port}/project/`;
  const verify = (extra = {}) => verifyBundles(url, dir, { allowLocal: true, attempts: 1, delay: 1, ...extra });
  assert.equal(Object.keys((await verify()).hashes).length, 2);
  for (const bad of ['stale', 'tamper', 'redirect']) {
    mode = bad;
    await assert.rejects(verify());
  }
  mode = 'propagate'; pageRequests = 0;
  assert.equal(Object.keys((await verify({ attempts: 2 })).hashes).length, 2);
  assert.equal(pageRequests, 2);
  await assert.rejects(verifyBundles(url, dir), /Unapproved deployment origin/);
  await assert.rejects(verifyBundles('https://evil.example/', dir), /Unapproved deployment origin/);
});
