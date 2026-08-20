/**
 * Render PWA icons from an HTML tile: the Day4 logo mark on the deep-blue
 * field with a scatter of gold stars. Rendered, not hand-drawn, so the icon
 * and the app share one visual language.
 */
const PW = "C:/Users/chris/Documents/GitHub/open-design/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright";
const { chromium } = require(PW);

const tile = (pad) => `<!DOCTYPE html><html><head><style>
  *{margin:0;padding:0}
  body{width:512px;height:512px;overflow:hidden;
    background:radial-gradient(130% 130% at 50% 42%, #16345E 0%, #0E2440 52%, #081627 100%)}
  .star{position:absolute;background:#DCE8F5;border-radius:50%}
  /* The icon carries the MARK, not the wordmark: a home-screen tile is
     48px, and only the ringed planet survives that. */
  .mark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    width:${Math.round(512 * (1 - 2 * pad))}px;
    height:${Math.round(512 * (1 - 2 * pad))}px;overflow:hidden;
    filter:drop-shadow(0 6px 22px rgba(0,0,0,.6))}
  .mark img{position:absolute;height:62%;top:19%;left:-11%}
</style></head><body>
  <div class="star" style="left:12%;top:18%;width:3px;height:3px;opacity:.7"></div>
  <div class="star" style="left:84%;top:14%;width:2px;height:2px;opacity:.5"></div>
  <div class="star" style="left:74%;top:78%;width:3px;height:3px;opacity:.6"></div>
  <div class="star" style="left:20%;top:80%;width:2px;height:2px;opacity:.5"></div>
  <div class="star" style="left:90%;top:48%;width:2px;height:2px;opacity:.45"></div>
  <div class="star" style="left:8%;top:52%;width:2px;height:2px;opacity:.45"></div>
  <div class="mark"><img src="http://localhost:5174/day4-logo-dark.png"></div>
</body></html>`;

(async () => {
  const out = "C:/Users/chris/Documents/GitHub/Day-4-Observatory/web/public";
  const b = await chromium.launch({ channel: "msedge" });
  // [file, pad, size] — maskable icons keep content inside the 80% safe zone.
  const jobs = [
    ["icon-512.png", 0.10, 512],
    ["icon-192.png", 0.10, 192],
    ["icon-maskable-512.png", 0.20, 512],
    ["icon-maskable-192.png", 0.20, 192],
  ];
  for (const [file, pad, size] of jobs) {
    const p = await b.newPage({ viewport: { width: 512, height: 512 } });
    await p.setContent(tile(pad), { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const shot = await p.screenshot({ clip: { x: 0, y: 0, width: 512, height: 512 } });
    // Resize via a second page drawing to a canvas of the target size.
    const q = await b.newPage({ viewport: { width: size, height: size } });
    await q.setContent(`<canvas id=c width=${size} height=${size}></canvas>`);
    await q.evaluate(async ([data, s]) => {
      const img = new Image();
      img.src = "data:image/png;base64," + data;
      await img.decode();
      const c = document.getElementById("c");
      c.getContext("2d").drawImage(img, 0, 0, s, s);
    }, [shot.toString("base64"), size]);
    const el = await q.$("#c");
    await el.screenshot({ path: `${out}/${file}` });
    console.log("icon:", file);
    await p.close(); await q.close();
  }
  await b.close();
})();
