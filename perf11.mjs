import { chromium } from '@playwright/test';
const BASE='http://localhost:4612';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
const got=[];
page.on('response',r=>{ if(r.url().includes('__PAGE__')) got.push([r.url().replace(BASE,'').split('?')[0], +(r.headers()['content-length']||0)]); });
await page.goto(BASE+'/roadmaps/fundamentos/hash-table/',{waitUntil:'load'});
const h=await page.evaluate(()=>document.body.scrollHeight);
for(let y=0;y<h;y+=500){ await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(30); }
await page.waitForTimeout(4000);
got.sort((a,b)=>b[1]-a[1]);
got.forEach(g=>console.log(`   ${(g[1]/1024).toFixed(1).padStart(6)} KB  ${g[0]}`));
await b.close();
