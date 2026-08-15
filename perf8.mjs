import { chromium } from '@playwright/test';
const BASE='http://localhost:4612';
const b=await chromium.launch();
for(const delay of [0,300,600,1200]){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  await page.route('https://fonts.googleapis.com/**', async r=>{ await new Promise(s=>setTimeout(s,delay)); await r.continue(); });
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(BASE+'/sobre/',{waitUntil:'load'});
  await page.waitForTimeout(2500);
  const fcp=await page.evaluate(()=>Math.round(performance.getEntriesByName('first-contentful-paint')[0].startTime));
  console.log(`atraso extra em fonts.googleapis.com = ${delay} ms  ->  FCP = ${fcp} ms`);
  await ctx.close();
}
await b.close();
