import { chromium, expect } from '../../web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output=path.resolve(process.argv[2]||'test-results/preface-content');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
const go=route=>page.goto('http://127.0.0.1:4173/#'+route,{waitUntil:'networkidle'});
const shot=name=>page.screenshot({path:path.join(output,name)});
try{
 await go('/preface');
 assert.deepEqual(await page.locator('.preface-document > section > h2').allTextContents(),['编写背景','编写目标与核心章节','适用范围与使用方式','编写、评审与维护机制','引用','补充：Agent 怎样运行']);
 assert.equal(await page.locator('#background > section').count(),4);
 assert.equal(await page.locator('#role-map tbody tr').count(),7);
 await expect(page.locator('#role-map tbody')).toContainText('后续未显示');
 assert.equal(await page.locator('#chapter-guide tbody tr').count(),7);
 assert.equal(await page.locator('#supplement .architecture-lab').count(),1);
 assert.equal(await page.locator('#supplement #basics').count(),1);
 assert.equal(await page.locator('#supplement #loop').count(),1);
 assert.equal(await page.locator('.preface-document > .preface-architecture').count(),0);
 await page.locator('.preface-history summary').click();
 await expect(page.locator('.preface-history tbody')).toContainText('评审中');
 await page.getByRole('button',{name:'展开编写背景',exact:true}).click();
 await page.locator('.preface-directory a[href="#/preface?section=medical"]').click();
 await expect(page.locator('#medical h3')).toBeFocused();
 await expect(page.locator('.preface-directory a[href="#/preface?section=medical"]')).toHaveAttribute('aria-current','location');
 await shot('01-background-subsection.png');
 await go('/preface?section=collaboration');
 await expect(page.locator('.collaboration-flow .react-flow__node')).toHaveCount(25);
 await shot('02-collaboration-figure.png');
 await page.getByRole('button',{name:'查看原图',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('dialog').getByAltText('内部协作SOP原图')).toBeVisible();
 await shot('03-original-image-dialog.png');
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'查看原图',exact:true})).toBeFocused();
 await go('/preface?section=architecture');
 await expect(page.locator('#architecture > .preface-section-heading h3')).toBeFocused();
 assert.equal(await page.locator('.architecture-lab .react-flow__node').count(),11);
 await shot('04-retained-running-demo.png');
 await page.setViewportSize({width:390,height:844});
 for(const section of ['internal','chapter-guide','role-map','collaboration','architecture']){
  await go('/preface?section='+section);
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Mobile page overflow: '+section);
  if(section==='chapter-guide')assert(await page.locator('#chapter-guide .preface-table-region').evaluate(el=>el.scrollWidth>el.clientWidth),'Chapter table should scroll locally on a narrow screen');
  if(section!=='architecture')await shot('mobile-'+section+'.png');
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,sourceHierarchy:true,backgroundSubsections:4,roles:7,chapters:7,unknownCellsMarked:true,interactiveFlow:true,originalFigureRetained:true,imageZoomAndFocusReturn:true,singleRunningSupplement:true,mobileTablesAndFigure:true,browserErrors:errors},null,2));
}catch(error){await shot('failure.png');console.error(error);process.exitCode=1}finally{await browser.close()}
