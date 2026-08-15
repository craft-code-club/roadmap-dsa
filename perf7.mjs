import { chromium } from '@playwright/test';
const BASE='http://localhost:4611';
const b=await chromium.launch();
for(const [rate,lat,dl,label] of [[4,150,1.6,'Slow-4G + CPU 4x'],[1,0,0,'sem throttle']]){
const ctx=await b.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
const cdp=await ctx.newCDPSession(page);
await cdp.send('Network.enable');
if(lat) await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:lat,downloadThroughput:dl*1024*1024/8,uploadThroughput:750*1024/8});
await cdp.send('Emulation.setCPUThrottlingRate',{rate});
const t0=Date.now();
await page.goto(BASE+'/topicos/big-o/',{waitUntil:'commit'});
await page.waitForSelector('button',{state:'attached'});
const tHtml=Date.now()-t0;
let t=null, snap0=null;
for(let i=0;i<250;i++){
  const r=await page.evaluate(()=>{
    const fig=document.querySelector('.viz-fit');
    if(!fig) return {s:'nofig'};
    const btn=[...fig.querySelectorAll('button')].find(x=>/Próximo/.test(x.textContent));
    if(!btn) return {s:'nobtn'};
    btn.click();
    return {s:'clicked'};
  });
  await page.waitForTimeout(120);
  const snap=await page.evaluate(()=>{const f=document.querySelector('.viz-fit');return f?f.innerText:''});
  if(snap0===null) snap0=snap;
  else if(snap!==snap0){ t=Date.now()-t0; break; }
}
console.log(`${label}: primeiro botão no DOM em ${tHtml} ms | clique em "Próximo" surte efeito em ${t} ms`);
await ctx.close();
}
await b.close();
