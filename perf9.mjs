import { chromium } from '@playwright/test';
const BASE='http://localhost:4612';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
await page.goto(BASE+'/topicos/hash-table/',{waitUntil:'networkidle'});
const info=await page.evaluate(()=>{
  const side=document.querySelector('aside, .side, [class*=side]');
  return {
    dom: document.querySelectorAll('*').length,
    links: document.querySelectorAll('a[href^="/"]').length,
    aside: side? {cls:side.className, links: side.querySelectorAll('a').length, display:getComputedStyle(side).display, vis:getComputedStyle(side).visibility, w:side.getBoundingClientRect().width} : null,
    overflow: document.body.scrollWidth>window.innerWidth ? document.body.scrollWidth : 0,
    height: document.body.scrollHeight,
    imgs: [...document.images].map(i=>({s:i.currentSrc.slice(-40),w:i.width,h:i.height,loading:i.loading})),
  };
});
console.log(JSON.stringify(info,null,1).slice(0,2000));
await b.close();
