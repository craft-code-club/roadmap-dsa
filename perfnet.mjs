import { chromium } from '@playwright/test';
const BASE='http://localhost:4612';
const b=await chromium.launch();
for (const r of process.argv.slice(2)){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const req=[];
  page.on('response', async resp=>{ try{ const buf=await resp.body().catch(()=>null); req.push({url:resp.url().replace(BASE,''),size:buf?buf.length:0,type:resp.request().resourceType()}); }catch(e){} });
  await page.goto(BASE+r,{waitUntil:'networkidle'});
  const h=await page.evaluate(()=>document.body.scrollHeight);
  for(let y=0;y<h;y+=600){ await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(40); }
  await page.waitForTimeout(3000);
  const S=f=>Math.round(req.filter(f).reduce((a,x)=>a+x.size,0)/1024), N=f=>req.filter(f).length;
  const rsc=x=>x.url.includes('_rsc='), js=x=>x.url.endsWith('.js'), css=x=>x.url.endsWith('.css'), doc=x=>x.type==='document';
  console.log(`${r.padEnd(34)} doc=${S(doc)}KB js=${S(js)}KB(${N(js)}) css=${S(css)}KB prefetchRSC=${S(rsc)}KB(${N(rsc)}req) TOTAL=${S(()=>true)}KB em ${req.length} req`);
  await ctx.close();
}
await b.close();
