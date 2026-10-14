// Drive the live page into a state, then screenshot it.
// usage: node scripts/drive.cjs <url> <out.png> <w> <h> [action ...]
//   actions: click=<css selector>   (repeat by listing it again)
//            clickn=<css selector>x<n>
const PW = "C:/Users/chris/Documents/GitHub/open-design/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright";
const { chromium } = require(PW);
(async () => {
  const [url, out, w, h, ...actions] = process.argv.slice(2);
  let b;
  for (const opt of [{ channel: "msedge" }, {}, { channel: "chrome" }]) {
    try { b = await chromium.launch(opt); break; } catch { /* next */ }
  }
  if (!b) { console.log("NO BROWSER AVAILABLE"); process.exit(1); }
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  for (const a of actions) {
    const m = /^clickn=(.+)x(\d+)$/.exec(a);
    const sel = m ? m[1] : a.replace(/^click=/, "");
    const n = m ? +m[2] : 1;
    for (let i = 0; i < n; i++) await p.click(sel);
  }
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out, fullPage: true });
  console.log("SHOT OK ->", out);
  await b.close();
})();
