const PW = "C:/Users/chris/Documents/GitHub/open-design/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright";
const { chromium } = require(PW);
(async () => {
  const outDir = "C:/Users/chris/Documents/GitHub/Day-4-Observatory/web/.shots";
  const b = await chromium.launch({ channel: "msedge" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto("http://localhost:5174/", { waitUntil: "networkidle", timeout: 45000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${outDir}/after-closed.png`, fullPage: true });
  console.log("closed shot");
  await p.click("#station");
  await p.waitForTimeout(400);
  const expanded = await p.getAttribute("#station", "aria-expanded");
  console.log("aria-expanded after click:", expanded);
  await p.screenshot({ path: `${outDir}/after-open.png`, fullPage: true });
  console.log("open shot");
  // And prove it closes on SET.
  await p.click("#set-station");
  await p.waitForTimeout(400);
  console.log("aria-expanded after SET:", await p.getAttribute("#station", "aria-expanded"));
  await b.close();
})();
