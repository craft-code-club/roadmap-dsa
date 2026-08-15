import { chromium } from '@playwright/test';
const BASE='http://localhost:4611';
const b=await chromium.launch();
for (const r of ['/sobre/','/topicos/hash-table/','/']){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  await page.coverage.startCSSCoverage();
  await page.goto(BASE+r,{waitUntil:'networkidle'});
  const cov=await page.coverage.stopCSSCoverage();
  let tot=0,used=0;
  for(const e of cov){ tot+=e.text.length; for(const rg of e.ranges) used+=rg.end-rg.start; }
  console.log(`${r.padEnd(24)} CSS total=${(tot/1024).toFixed(0)}KB usado=${(used/1024).toFixed(0)}KB (${(100*used/tot).toFixed(0)}%)`);
  await ctx.close();
}
await b.close();
