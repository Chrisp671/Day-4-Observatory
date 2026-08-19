const PW = "C:/Users/chris/Documents/GitHub/open-design/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright";
const { chromium } = require(PW);
(async () => {
  const [url, out, w, h] = process.argv.slice(2);
  let b, used;
  for (const opt of [{}, { channel: "msedge" }, { channel: "chrome" }]) {
    try { b = await chromium.launch(opt); used = JSON.stringify(opt); break; }
    catch (e) { console.log("launch failed:", JSON.stringify(opt), String(e).slice(0, 80)); }
  }
  if (!b) { console.log("NO BROWSER AVAILABLE"); process.exit(1); }
  console.log("browser:", used);
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out, fullPage: true });
  console.log("SHOT OK ->", out);
  await b.close();
})();
