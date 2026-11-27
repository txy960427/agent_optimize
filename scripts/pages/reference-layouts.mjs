import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../web/node_modules/@playwright/test/index.mjs';

const output = path.resolve('../design/layout-references-20261126');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const references = [
  {name:'vitepress-home',url:'https://vitepress.dev/',selectors:['.VPHero','.VPHomeHero .container','.VPHero .main','.VPHero .image','.VPHero .actions','.VPFeatures']},
  {name:'vitepress-docs',url:'https://vitepress.dev/guide/what-is-vitepress',selectors:['.VPNav','.VPSidebar','.VPDoc .container','.VPDoc .content-container','.vp-doc','.VPDocAside']},
  {name:'fumadocs-docs',url:'https://www.fumadocs.dev/docs/ui/layouts/docs',selectors:['#nd-docs-layout','#nd-sidebar','#nd-page','#nd-toc']},
];
const reports = [];
for (const ref of references) {
  try {
    await page.goto(ref.url, { waitUntil:'domcontentloaded', timeout:40000 });
    await page.waitForTimeout(1200);
    const boxes = await page.evaluate(selectors=>selectors.map(selector=>{
      const el=document.querySelector(selector);if(!el)return {selector,missing:true};
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return {selector,x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),padding:s.padding,textAlign:s.textAlign,fontSize:s.fontSize};
    }),ref.selectors);
    await page.screenshot({path:path.join(output,ref.name+'.png')});
    reports.push({...ref,viewport:{width:1440,height:900},boxes});
  } catch(error) { reports.push({...ref,error:String(error)}); }
}
await fs.writeFile(path.join(output,'measurements.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports,null,2));
await browser.close();
