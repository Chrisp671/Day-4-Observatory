// Independent owner-spec checks. Run against any build:
// node scripts/ring-id-spec.mjs --url http://127.0.0.1:4239/
// npm ci --prefix scripts/review supplies the pinned Playwright.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("./review/package.json", import.meta.url))("playwright");
const url = new URL(process.argv[process.argv.indexOf("--url") + 1] || "http://127.0.0.1:4239/");
assert(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname), "local preview only");
const names = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(100); };
const browser = await chromium.launch();
try {
for (const [width, height] of [[320,640],[360,780],[390,844],[820,844],[820,1180]]) {
 const tag = `${width}x${height}`;
 const context = await browser.newContext({ viewport: {width,height}, deviceScaleFactor: 2, timezoneId: "America/New_York" });
 const page = await context.newPage();
 await page.clock.setFixedTime(new Date("2026-09-02T23:00:00Z"));
 await page.goto(url.href);
 await page.evaluate(() => { localStorage.clear(); localStorage.setItem("day4-observatory.station", JSON.stringify({lat:40,lon:-74})); });
 await page.reload(); await settle(page);
 const fold = page.getByRole("button", {name:/tonight/i});
 if (await fold.count() === 1 && await fold.getAttribute("aria-expanded") === "true") await fold.click();
 const key = page.getByRole("button", {name:/^(Mercury|Venus|Mars|Jupiter|Saturn)$/});
 const found = await key.allTextContents();
 console.log(`${tag} key: ${JSON.stringify(found)}`);
 check(JSON.stringify(found.map(s=>s.trim())) === JSON.stringify(names), `${tag}: five-name key missing or out of ring order`);
 check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tag}: horizontal page overflow`);
 for (let i=0;i<await key.count();i++) {
  const b=key.nth(i);
  const issues=await b.evaluate(el=>{
   const r=el.getBoundingClientRect(); const issues=[];
   if(r.width<24 || r.height<24) issues.push("target below 24px");
   for(const e of [el,...el.querySelectorAll("*")]) if(e.textContent.trim()) {
    const s=getComputedStyle(e);
    if(parseFloat(s.fontSize)<12) issues.push("text below 12px");
    if(e.scrollWidth>e.clientWidth || s.textOverflow==="ellipsis") issues.push("text clipped/ellipsis");
   }
   return issues;
  });
  for(const issue of issues) check(false,`${tag}: ${found[i]} ${issue}`);
 }
 const hint = page.getByText(/tap.*(?:ring|name)|(?:ring|name).*tap/i).filter({visible:true});
 const hintText=await hint.allTextContents(); console.log(`${tag} hint: ${JSON.stringify(hintText)}`);
 check(hintText.length>0, `${tag}: first-visit tapping hint missing`);
 if(await hint.count()) {
  check(await hint.first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=12),`${tag}: hint below 12px`);
  await page.waitForTimeout(10100);
  check(await hint.count()>0,`${tag}: hint vanished on a timer`);
 }
 if(width===390) {
  // Read existing ledger colour declarations, never the implementation's geometry.
  await page.getByRole("tab", {name:"Planets",exact:true}).click();
  const colors=await page.locator("button.lrow").evaluateAll((rows,names)=>Object.fromEntries(names.map(name=>{
   const row=rows.find(r=>r.textContent.includes(name));
   const colored=row && [...row.querySelectorAll("[style]")].find(e=>e.style.color || e.style.backgroundColor);
   return [name,colored ? (colored.style.backgroundColor ? getComputedStyle(colored).backgroundColor : getComputedStyle(colored).color) : null];
  })),names);
  console.log("Ledger colours:",colors);
  await page.getByRole("tab", {name:"Stargazer",exact:true}).click();
  for(const name of names) {
   const point=await page.locator("canvas#sky").evaluate((c,color)=>{
    if(!color) return null;
    const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number);
    const ctx=c.getContext("2d"), {data}=ctx.getImageData(0,0,c.width,c.height);
    const rect=c.getBoundingClientRect(), cx=c.width/2, cy=c.height/2;
    // Restrict to concentric arcs; markers cannot win a whole radial band.
    let best=null;
    for(let r=Math.floor(c.width*.22);r<c.width*.47;r++) {
     const hits=[];
     for(let a=0;a<360;a++) {
      const x=Math.round(cx+r*Math.cos(a*Math.PI/180)), y=Math.round(cy+r*Math.sin(a*Math.PI/180));
      const k=(y*c.width+x)*4;
      if(rgb.every((v,i)=>Math.abs(data[k+i]-v)<25)) hits.push({x,y});
     }
     if(hits.length>=8 && (!best || hits.length>best.hits.length)) best={r,hits};
    }
    if(!best)return null;
    const p=best.hits[Math.floor(best.hits.length/2)];
    return {x:rect.x+p.x*rect.width/c.width,y:rect.y+p.y*rect.height/c.height};
   },colors[name]);
   if(!point){console.log(`SKIP ${name}: no identifiable visible arc at fixed instant`);continue;}
   console.log(`${name} arc:`,point);
   // Start unlit using the public row if available; this also exercises parity.
   if(await fold.count()===1) await fold.click();
   const row=page.locator("#tonight-list .lrow").filter({hasText:name});
   if(await row.count() && await row.isVisible()) {await row.click(); if(await page.evaluate(()=>localStorage.getItem("day4.lit"))===name) await row.click();}
   if(await fold.count()===1) await fold.click();
   await page.mouse.click(point.x,point.y); await settle(page);
   const lit=await page.evaluate(()=>localStorage.getItem("day4.lit"));
   check(lit===name,`ring tap: ${name} did not light/persist`);
   if(lit===name) {
    check(await page.getByText(new RegExp(`${name}.*(?:up|rise|set|below)`,"i")).filter({visible:true}).count()>0,`plinth: ${name} up-time line missing`);
    await page.reload();await settle(page);
    check(await page.evaluate(()=>localStorage.getItem("day4.lit"))===name,`reload: ${name} lost`);
    await page.mouse.click(point.x,point.y);await settle(page);
    check(await page.evaluate(()=>localStorage.getItem("day4.lit"))==="",`ring tap: ${name} did not release`);
   }
  }
 }
 for(let i=0;i<await key.count();i++) {
  await key.nth(i).click(); await settle(page);
  check(await page.evaluate(()=>localStorage.getItem("day4.lit"))===names[i],`${tag}: key ${names[i]} did not persist`);
  for(let j=0;j<await key.count();j++) check(await key.nth(j).getAttribute("aria-pressed")===(i===j?"true":"false"),`${tag}: key pressed state ${names[j]}`);
  check(await hint.count()===0,`${tag}: hint remained after selection`);
 }
 if(await key.count()) { await page.reload();await settle(page);check(await hint.count()===0,`${tag}: dismissed hint returned after reload`); }
 await context.close();
}
} finally {await browser.close();}
console.log("FAILURES:\n"+failures.map(f=>`- ${f}`).join("\n"));
process.exitCode=failures.length?1:0;
