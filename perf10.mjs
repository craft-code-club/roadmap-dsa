import { chromium } from '@playwright/test';
const BASE='http://localhost:4612';
const b=await chromium.launch();
for(const r of ['/topicos/','/roadmaps/fundamentos/hash-table/','/topicos/hash-table/']){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  let bytes=0,n=0,list=[];
  page.on('response',async resp=>{ if(resp.url().includes('_rsc=')){ const h=resp.headers(); const cl=+(h['content-length']||0); bytes+=cl; n++; if(resp.url().includes('__PAGE__')) list.push([resp.url().replace(BASE,'').split('?')[0].replace(/__next.*/,''),cl]); } });
  await page.goto(BASE+r,{waitUntil:'load'});
  const h=await page.evaluate(()=>document.body.scrollHeight);
  for(let y=0;y<h;y+=500){ await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(40); }
  await page.waitForTimeout(4000);
  console.log(`${r}  prefetch comprimido = ${(bytes/1024).toFixed(0)} KB em ${n} requisições`);
  console.log('   páginas prefetchadas:', list.length, list.slice(0,6).map(x=>x[0]+' '+(x[1]/1024).toFixed(0)+'KB').join(' | '));
  await ctx.close();
}
await b.close();
