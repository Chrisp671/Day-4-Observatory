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
  // Locate each ring without the implementation's geometry. The spec stores the
  // lit planet in day4.lit, so a ring is where the dial changes most between
  // "this planet lit" and "nothing lit", among pixels close to its colour.
  // (A colour-only scan matched the moon's orbit and the band inside the face.)
  await page.getByRole("tab", {name:"Planets",exact:true}).click();
  const colors=await page.locator("button.lrow").evaluateAll((rows,names)=>Object.fromEntries(names.map(name=>{
   const row=rows.find(r=>r.textContent.includes(name));
   const colored=row && [...row.querySelectorAll("[style]")].find(e=>e.style.color || e.style.backgroundColor);
   return [name,colored ? (colored.style.backgroundColor ? getComputedStyle(colored).backgroundColor : getComputedStyle(colored).color) : null];
  })),names);
  console.log("Ledger colours:",colors);
  await page.getByRole("tab", {name:"Stargazer",exact:true}).click();
  const setLit=async(p,v)=>{await p.evaluate(v=>localStorage.setItem("day4.lit",v),v);await p.reload();await settle(p);};
  const pixels=(p)=>p.locator("canvas#sky").evaluate(c=>{const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let s="";for(let i=0;i<d.length;i+=8192)s+=String.fromCharCode.apply(null,d.subarray(i,i+8192));return btoa(s);});
  const probe=await context.newPage();
  await probe.goto(url.href);
  const other=await context.newPage();
  await other.goto(url.href);
  let held=false;
  for(const name of names) {
   await setLit(page,"");
   await setLit(probe,name);
   // Baseline: another planet lit, so every other ring is drawn the same way in
   // both pictures and only these two rings differ.
   await setLit(other,name==="Saturn"?"Mercury":"Saturn");
   const lit64=await pixels(probe);
   const point=await other.locator("canvas#sky").evaluate((c,{lit64,color})=>{
    if(!color) return null;
    const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number);
    const none=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
    const raw=atob(lit64);
    // Every pixel that lighting the planet changed and that now shows its
    // colour. Tap the middle of that arc (the circular mean of their angles,
    // so the sun at one end of a sweep is not where we tap), on the ring's
    // centre line: the middle of the changed run along that ray, because the
    // single most-changed pixel can sit in the glow, nearer a neighbour.
    const W=c.width, H=c.height, pts=[];
    for(let k=0;k<none.length;k+=4) {
     const lit=[raw.charCodeAt(k),raw.charCodeAt(k+1),raw.charCodeAt(k+2)];
     if(!rgb.every((v,i)=>Math.abs(lit[i]-v)<40)) continue;
     if(lit.reduce((s,v,i)=>s+Math.abs(v-none[k+i]),0)<150) continue;
     pts.push([(k/4)%W,Math.floor(k/4/W)]);
    }
    if(pts.length<20) return {skip:`only ${pts.length} changed pixels`};
    // The changed pixels are an arc: fit its circle (Kasa least squares) for
    // the dial's centre, rather than assuming where the page put it.
    let a=[[0,0,0],[0,0,0],[0,0,0]], b=[0,0,0];
    for(const [x,y] of pts){const v=[x,y,1], z=-(x*x+y*y);for(let i=0;i<3;i++){b[i]+=v[i]*z;for(let j=0;j<3;j++)a[i][j]+=v[i]*v[j];}}
    const det=(m)=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    const sol=[0,1,2].map(col=>det(a.map((row,i)=>row.map((v,j)=>j===col?b[i]:v)))/det(a));
    const ox=-sol[0]/2, oy=-sol[1]/2;
    // Tap the middle of the arc (circular mean of the angles, so the sun at
    // one end of a sweep is not where we tap), on the ring's centre line: the
    // middle of the changed run along that ray, not its brightest pixel, which
    // can sit in the glow nearer a neighbour.
    const changed=new Uint8Array(W*H); let sx=0, sy=0;
    for(const [x,y] of pts){changed[y*W+x]=1;const d=Math.hypot(x-ox,y-oy);sx+=(x-ox)/d;sy+=(y-oy)/d;}
    // The middle of an arc is its planet's peak, where the gold diamond covers
    // the ring; step a little either side of it until the ring shows.
    const mid=Math.atan2(sy,sx);
    let ang=mid, run=[];
    for(const off of [8,-8,14,-14,20,-20]) {
     ang=mid+off*Math.PI/180; run=[];
     for(let r=0;r<Math.max(W,H);r+=0.5) {
      const x=Math.round(ox+r*Math.cos(ang)), y=Math.round(oy+r*Math.sin(ang));
      if(x<0||y<0||x>=W||y>=H) break;
      if(changed[y*W+x]) run.push(r);
     }
     if(run.length) break;
    }
    if(!run.length) return {skip:`no changed pixel near the ray at ${(mid*180/Math.PI).toFixed(0)} deg`};
    const r=(run[0]+run[run.length-1])/2, rect=c.getBoundingClientRect();
    return {x:rect.x+(ox+r*Math.cos(ang))*rect.width/W,y:rect.y+(oy+r*Math.sin(ang))*rect.height/H,pixels:pts.length};
   },{lit64,color:colors[name]});
   if(!point || point.skip){console.log(`SKIP ${name}: ${point?.skip ?? "no colour"}`);continue;}
   console.log(`${name} ring:`,point);
   if(!held) {
    // No press-and-hold: holding a ring does what a tap does, and nothing more.
    held=true;
    await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForTimeout(900);await page.mouse.up();await settle(page);
    check(await page.evaluate(()=>localStorage.getItem("day4.lit"))===name,`hold: holding ${name}'s ring did not simply light it`);
    await setLit(page,"");
   }
   await page.mouse.click(point.x,point.y); await settle(page);
   const lit=await page.evaluate(()=>localStorage.getItem("day4.lit"));
   check(lit===name,`ring tap: ${name} did not light/persist`);
   if(lit===name) {
    const line=page.getByText(new RegExp(`${name}.*(?:up|rise|set|below|ring)`,"i")).filter({visible:true});
    check(await line.count()>0,`plinth: ${name} up-time line missing`);
    await page.reload();await settle(page);
    check(await page.evaluate(()=>localStorage.getItem("day4.lit"))===name,`reload: ${name} lost`);
    await page.mouse.click(point.x,point.y);await settle(page);
    check(await page.evaluate(()=>localStorage.getItem("day4.lit"))==="",`ring tap: ${name} did not release`);
    check(await page.getByText(new RegExp(`^\s*${name}\s*·`)).filter({visible:true}).count()===0,`plinth: ${name} line still shown with nothing lit`);
   }
  }
  await probe.close();
  await other.close();
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
