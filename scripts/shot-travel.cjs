const PW = "C:/Users/chris/Documents/GitHub/open-design/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright";
const { chromium } = require(PW);
(async () => {
  const [url, outDir] = process.argv.slice(2);
  const b = await chromium.launch({ channel: "msedge" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${outDir}/live.png`, fullPage: true });
  console.log("live shot");
  // Scrub forward five hours: the sun should walk away from the cross.
  for (let i = 0; i < 5; i++) {
    await p.click('button[aria-label="Forward one hour"]');
    await p.waitForTimeout(120);
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${outDir}/travelled.png`, fullPage: true });
  console.log("travelled shot");
  await b.close();
})();
