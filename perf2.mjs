import { chromium } from '@playwright/test';
const BASE='http://localhost:4611';
const routes=process.argv.slice(2);
const b=await chromium.launch();
for (const r of routes){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  const page=await ctx.newPage();
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.addInitScript(()=>{
    window.__cls=0; window.__shifts=[];
    new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput){window.__cls+=e.value;window.__shifts.push({v:+e.value.toFixed(4),t:Math.round(e.startTime),n:e.sources?e.sources.map(s=>s.node&&s.node.nodeName+'.'+(s.node.className||'')).slice(0,2):[]})}}}).observe({type:'layout-shift',buffered:true});
    window.__lcp=0;
    new PerformanceObserver(l=>{const es=l.getEntries();window.__lcp=Math.round(es[es.length-1].startTime)}).observe({type:'largest-contentful-paint',buffered:true});
    window.__lt=[];
    new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt.push(Math.round(e.duration))}).observe({type:'longtask',buffered:true});
  });
  const t0=Date.now();
  await page.goto(BASE+r,{waitUntil:'load'});
  await page.waitForTimeout(6000);
  const m=await page.evaluate(()=>{
    const fcp=performance.getEntriesByName('first-contentful-paint')[0];
    const nav=performance.getEntriesByType('navigation')[0];
    const tbt=window.__lt.reduce((a,d)=>a+Math.max(0,d-50),0);
    return {fcp:fcp?Math.round(fcp.startTime):null, lcp:window.__lcp, cls:+window.__cls.toFixed(4), shifts:window.__shifts.slice(0,5), longtasks:window.__lt.length, tbt, dcl:Math.round(nav.domContentLoadedEventEnd)};
  });
  console.log(r, JSON.stringify(m));
  await ctx.close();
}
await b.close();
