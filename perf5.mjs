import { chromium } from '@playwright/test';
const BASE='http://localhost:4611';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
const cdp=await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
const t0=Date.now();
await page.goto(BASE+'/topicos/big-o/',{waitUntil:'commit'});
// espera o botão aparecer no HTML estático
await page.waitForSelector('.viz-btn',{state:'attached'});
const tHtml=Date.now()-t0;
// procura um botão de play
const btns=await page.$$eval('.viz-btn',es=>es.map(e=>e.textContent.trim().slice(0,20)));
// poll: clique repetido até o passo mudar
let interactive=null;
const stepSel='.viz-step';
const before=await page.$eval(stepSel,e=>e.textContent).catch(()=>null);
for(let i=0;i<200;i++){
  try{
    await page.$$eval('.viz-btn',es=>{const b=es.find(x=>/pr[oó]xim|play|▶|avan/i.test(x.textContent));if(b)b.click();});
    const now=await page.$eval(stepSel,e=>e.textContent).catch(()=>null);
    if(now!==before){ interactive=Date.now()-t0; break; }
  }catch(e){}
  await page.waitForTimeout(100);
}
console.log(`HTML com o botão visível: ${tHtml} ms`);
console.log(`botões do 1º visualizador: ${JSON.stringify(btns.slice(0,6))}`);
console.log(`passo "${before}" -> mudou em: ${interactive} ms depois do início da navegação`);
await b.close();
