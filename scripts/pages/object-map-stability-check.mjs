import {chromium,expect} from '../../web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
const out='.impeccable/review/object-map-stability';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100}});
page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const go=async path=>{await page.goto('http://127.0.0.1:4173/#'+path);await page.locator('.outline-object-map').scrollIntoViewIfNeeded();};
const target=id=>page.locator('.outline-object-map .map-primary [data-id="'+id+'"]').locator(['model','harness','environment','support'].includes(id)?'.group-title':'.object-node');
const state=()=>page.locator('.outline-object-map .map-canvas').evaluate(c=>({viewport:c.querySelector('.react-flow__viewport').style.transform,nodes:[...c.querySelectorAll('.react-flow__node')].map(n=>({id:n.dataset.id,visible:getComputedStyle(n).visibility!=='hidden',transform:n.style.transform}))}));
const loops=[];
try{
 await go('/guide');
 for(let i=0;i<12;i++){
  await page.mouse.move(1,1);const before=await state();
  expect(before.nodes.length).toBe(19);expect(before.nodes.every(n=>n.visible)).toBe(true);
  for(const id of ['model','harness','memory','evaluation']){
   await target(id).click();await expect(page.locator('.object-inspector.is-pinned')).toBeVisible();
   const after=await state();expect(after.viewport).toBe(before.viewport);expect(after.nodes).toEqual(before.nodes);
   await page.keyboard.press('Escape');await expect(page.locator('.object-inspector')).toHaveCount(0);
  }
  loops.push(await state());
  await page.evaluate(()=>location.hash='/preface');await page.waitForTimeout(80);await page.evaluate(()=>location.hash='/guide');
  await page.locator('.outline-object-map').scrollIntoViewIfNeeded();
  await expect.poll(async()=> (await state()).nodes.filter(n=>n.visible).length).toBe(19);
 }
 await page.mouse.move(1,1);await target('model').hover();await page.keyboard.press('Escape');await page.waitForTimeout(220);await expect(page.locator('.object-inspector')).toHaveCount(0);await page.mouse.move(1,1);await target('model').hover();await expect(page.locator('.object-inspector.is-preview')).toBeVisible();
 const hover=await page.locator('.object-inspector').boundingBox();await target('model').click();const pinned=await page.locator('.object-inspector').boundingBox();
 expect(pinned.x).toBe(hover.x);expect(pinned.y).toBe(hover.y);
 const frames=await page.evaluate(async()=>{const result=[];for(let i=0;i<24;i++){await new Promise(requestAnimationFrame);result.push(document.querySelector('.outline-object-map .react-flow__viewport').style.transform);}return result;});expect(new Set(frames).size).toBe(1);
 await page.screenshot({path:out+'/pinned-model-1600.png'});
 await page.getByRole('button',{name:'进入模型优化',exact:true}).click();await expect(page).toHaveURL(/#\/learn\/model/);
 await go('/guide');await target('memory').click();await expect(page.locator('.object-inspector')).toContainText('章节内容待补充');await expect(page.locator('.object-inspector .object-inspector-action')).toHaveCount(0);await page.keyboard.press('Escape');
 await target('personalization').click();expect(await page.locator('.map-canvas').getAttribute('data-related')).not.toContain('environment');
 await page.keyboard.press('Escape');await target('evaluation').click();await expect(page.locator('.react-flow__edge[data-id="feedback-evaluation-system"]')).toHaveCount(1);
 await page.mouse.move(1,1);await page.keyboard.press('Escape');await page.locator('.outline-object-map').screenshot({path:out+'/system-map-1600.png'});
 await page.getByRole('button',{name:'展开地图',exact:true}).click();await expect(page.locator('.expanded-map .react-flow__node')).toHaveCount(19);await page.locator('.expanded-map [data-id="memory"] .object-node').click();await expect(page.locator('.expanded-map-caption')).toContainText('章节内容待补充');await expect(page.locator('.expanded-map-caption button:disabled')).toHaveCount(0);await page.locator('.expanded-map [data-id="model"]').focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog').locator('.expanded-map-caption')).toContainText('模型');await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});const widths=[];
 for(const width of [1920,1440,1024,768,390,320]){
  await page.setViewportSize({width,height:1000});await go('/guide');await page.waitForTimeout(120);
  const current=await state();expect(current.nodes.every(n=>n.visible)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
  await page.locator('.map-primary').evaluate(e=>e.scrollLeft=e.scrollWidth);await target('evaluation').click();await expect(page.locator('.object-inspector.is-pinned')).toBeVisible();
  const box=await page.locator('.object-inspector').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
  widths.push({width,visible:current.nodes.length,viewport:current.viewport,popup:box});if(width===390)await page.screenshot({path:out+'/mobile-selected-390.png'});
  await page.keyboard.press('Escape');await expect(page.locator('.map-primary animateMotion')).toHaveCount(0);
 }
 expect(errors).toEqual([]);
 await fs.writeFile(out+'/stress.json',JSON.stringify({passed:true,pageReturns:12,clicks:48,loops,hover,pinned,viewportFrames:frames.length,widths,realModelRoute:true,noDisabledCallToAction:true,systemFeedback:true,personalizationScope:true,expandedKeyboard:true,reducedMotion:true,errors},null,2));
 console.log('PASS: 12 returns/48 real clicks; 19 nodes stay visible; no viewport or node movement; hover pins in place; scope/routes/keyboard/reduced/six widths.');
} catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}
finally{await browser.close();}
