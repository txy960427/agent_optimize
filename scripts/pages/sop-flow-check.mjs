import {chromium,expect} from '../../web/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve('test-results/sop-flow');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'no-preference'});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
const go=route=>page.goto('http://127.0.0.1:4173/#'+route,{waitUntil:'networkidle'});
const current=()=>page.locator('.collaboration-flow .react-flow__node:has(.sop-node.is-current)').getAttribute('data-id');
try{
 await go('/preface?section=collaboration');
 const flow=page.locator('.collaboration-flow');
 await expect(flow.locator('.react-flow__node')).toHaveCount(25);
 await expect(page.getByRole('button',{name:'暂停协作路线',exact:true})).toBeVisible();
 const first=await current();await expect.poll(current,{timeout:4500}).not.toBe(first);
 assert(await flow.locator('.sop-flow-signal').count()>0,'Playing should animate an active connector');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);const outside=await current();await page.waitForTimeout(2000);assert.equal(await current(),outside,'An offscreen diagram should stop advancing');
 await page.getByRole('button',{name:'暂停协作路线',exact:true}).click();
 assert.equal(await flow.locator('.sop-flow-signal').count(),0);
 const mappings={environment:'engineering',application:'application-team',framework:'framework-team',plugin:'agent-plugin',llm:'model-team',speech:'model-team',embedding:'model-team',specialist:'agent-specialist'};
 for(const [route,owner]of Object.entries(mappings)){
  await page.getByLabel('分配路线',{exact:true}).selectOption(route);
  const chosen=await flow.locator('.react-flow__node:has(.sop-node.on-route)').evaluateAll(nodes=>nodes.map(node=>node.dataset.id));
  assert(chosen.includes(route)&&chosen.includes(owner),'Incorrect responsibility route: '+route+' '+chosen.join(','));
  assert.equal(chosen.length,7,'The chosen path must include source, report, analysis, category, object, owner and feedback');
 }
 for(const source of ['developer','reviewer','tester']){
  await page.getByLabel('问题来源',{exact:true}).selectOption(source);
  assert.equal(await current(),source);
  assert(await flow.locator('.react-flow__node[data-id="report-'+source+'"] .on-route').count()===1);
 }
 await page.getByLabel('分配路线',{exact:true}).selectOption('specialist');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'下一步协作',exact:true}).click();
 assert.equal(await current(),'feedback');
 await expect(flow.locator('.sop-current-step')).toContainText('小U主owner');
 await flow.screenshot({path:path.join(output,'route-specialist.png')});
 const embedding=flow.getByRole('button',{name:'Embedding模型：向量表示模型',exact:true});
 await embedding.focus();await page.keyboard.press('Enter');
 await expect(page.getByLabel('分配路线',{exact:true})).toHaveValue('embedding');
 await page.getByRole('button',{name:'查看原图',exact:true}).click();
 await expect(page.getByRole('dialog').getByAltText('内部协作SOP原图')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'查看原图',exact:true})).toBeFocused();
 await page.emulateMedia({reducedMotion:'reduce'});await go('/guide');await go('/preface?section=collaboration');
 await expect(page.getByRole('button',{name:'播放协作路线',exact:true})).toHaveAttribute('aria-pressed','false');
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const section of ['chapter-guide','role-map','internal','collaboration']){
   await go('/preface?section='+section);
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Page overflow: '+width+' '+section);
   const wrapped=await page.locator('.preface-document .simple-table th').evaluateAll(cells=>cells.some(cell=>getComputedStyle(cell).whiteSpace!=='nowrap'));
   assert(!wrapped,'A table heading or short row label can wrap');
   if(section==='chapter-guide'&&[1440,390].includes(width))await page.screenshot({path:path.join(output,'chapters-'+width+'.png')});
   if(section==='collaboration'&&width===390){await page.locator('.sop-scroll-region').evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:path.join(output,'route-mobile.png')})}
  }
 }
 await go('/preface');
 assert(!await page.locator('.preface-document h2,.preface-document h3,.preface-directory a').evaluateAll(elements=>elements.some(el=>/^\d+(\.\d+)?\.?\s/.test(el.textContent))),'Section numbering remains');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,routes:8,problemOrigins:3,responsibilityMapping:true,feedbackReturn:true,autoplayPauseAndStep:true,offscreenSuspension:true,keyboardSelection:true,reducedMotion:true,originalImage:true,singleLineHeaders:true,numberingRemoved:true,widths:[1440,1024,768,390,320],browserErrors:errors},null,2));
}catch(error){await page.screenshot({path:path.join(output,'failure.png')});console.error(error);process.exitCode=1}finally{await browser.close()}
