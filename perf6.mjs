import { chromium } from '@playwright/test';
const BASE='http://localhost:4611';
const b=await chromium.launch();
for(const [rate,lat,dl,label] of [[4,150,1.6,'Slow-4G + CPU 4x'],[1,0,100,'sem throttle']]){
const ctx=await b.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
const cdp=await ctx.newCDPSession(page);
await cdp.send('Network.enable');
if(lat) await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:lat,downloadThroughput:dl*1024*1024/8,uploadThroughput:750*1024/8});
await cdp.send('Emulation.setCPUThrottlingRate',{rate});
const t0=Date.now();
await page.goto(BASE+'/topicos/big-o/',{waitUntil:'commit'});
await page.waitForSelector('.viz-btn',{state:'attached'});
const tHtml=Date.now()-t0;
let t=null;
for(let i=0;i<300;i++){
  const changed=await page.evaluate(()=>{
    const fig=document.querySelector('.viz-fit')||document.body;
    const btn=[...fig.querySelectorAll('button')].find(x=>/Próximo/.test(x.textContent));
    if(!btn) return 'nobtn';
    const before=fig.innerText;
    btn.click();
    return fig.innerText!==before;
  });
  if(changed===true){ t=Date.now()-t0; break; }
  await page.waitForTimeout(80);
}
console.log(`${label}: HTML pintável em ${tHtml} ms | "Próximo" passa a funcionar em ${t} ms`);
await ctx.close();
}
await b.close();
