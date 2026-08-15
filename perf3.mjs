import { chromium } from '@playwright/test';
const BASE='http://localhost:4611';
const b=await chromium.launch();
for (const block of [false,true]){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  if(block) await page.route('**fonts.g**',r=>r.abort());
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.addInitScript(()=>{window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});});
  await page.goto(BASE+'/sobre/',{waitUntil:'load'});
  await page.waitForTimeout(6000);
  const m=await page.evaluate(()=>({cls:+window.__cls.toFixed(4), fcp:Math.round(performance.getEntriesByName('first-contentful-paint')[0].startTime)}));
  console.log(`fonts ${block?'BLOQUEADAS':'normais'}: CLS=${m.cls} FCP=${m.fcp}ms`);
  await ctx.close();
}
await b.close();
