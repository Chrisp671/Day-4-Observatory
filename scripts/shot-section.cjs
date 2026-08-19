const PW = "C:/Users/chris/Documents/GitHub/open-design/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright";
const { chromium } = require(PW);
(async () => {
  const [url, outDir, sel, w, h] = process.argv.slice(2);
  const b = await chromium.launch({ channel: "msedge" });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  const nodes = await p.$$(sel);
  for (let i = 0; i < nodes.length; i++) {
    await nodes[i].screenshot({ path: `${outDir}/dir-${i + 1}.png` });
    console.log("shot", i + 1);
  }
  await b.close();
})();
