import { chromium } from '../../web/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const output=process.argv[2]||path.resolve('test-results/outline-core');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];
page.on('pageerror',error=>errors.push(String(error)));page.setDefaultTimeout(15000);
const go=route=>page.goto('http://127.0.0.1:4173/#'+route,{waitUntil:'networkidle'});
const graph=page.locator('.decision-explorer');const panel=graph.locator('.decision-inspector');const node=id=>page.locator(`.outline-object-map .map-primary .react-flow__node[data-id="${id}"]`);
async function shot(name,locator){await page.mouse.move(0,0);await page.waitForTimeout(150);if(locator)await locator.screenshot({path:path.join(output,name)});else await page.screenshot({path:path.join(output,name),fullPage:false});}
async function answer(value){await panel.locator('.decision-answer-buttons').getByRole('button',{name:value,exact:true}).click();}
async function candidate(name){assert((await panel.innerText()).includes('候选方向：'+name));}
async function reset(){await graph.getByRole('button',{name:'重新判断',exact:true}).click();}
async function noOverflow(label){assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),'Document overflow: '+label);}
try{
 await go('/guide');await page.getByRole('heading',{level:1,name:'调优总览',exact:true}).waitFor();await node('evaluation').waitFor();await page.waitForTimeout(200);
 const nav=page.getByRole('navigation',{name:'固定课程导航'});assert.equal(await nav.locator('a[href^="#/learn/objects"]').count(),0);assert.equal(await nav.getByRole('link',{name:'优化对象',exact:true}).count(),0);
 const overview=nav.getByRole('link',{name:'总览',exact:true});const runtime=nav.getByRole('link',{name:'看懂一次运行',exact:true});assert.equal(await overview.evaluate(e=>e.getBoundingClientRect().left),await runtime.evaluate(e=>e.getBoundingClientRect().left));
 const bounds=await page.locator('.map-primary>.map-canvas').boundingBox();for(const id of ['model','harness','environment','support','collaboration','evaluation']){const box=await node(id).boundingBox();assert(box.x>=bounds.x-1&&box.y>=bounds.y-1&&box.x+box.width<=bounds.x+bounds.width+1&&box.y+box.height<=bounds.y+bounds.height+1,'Map clips '+id+': '+JSON.stringify({box,bounds}));}
 await shot('01-overview.png');await shot('02-object-map.png',page.locator('.outline-object-map'));
 for(const id of ['collaboration','personalization','evaluation']){await node(id).click();assert(await page.getByRole('button',{name:'继续动画',exact:false}).isDisabled());const related=await page.locator('.map-primary>.map-canvas').getAttribute('data-related');assert(related.includes('model')&&related.includes('harness'),'Missing relation for '+id);assert(await page.locator('.map-primary .react-flow__edge[id*="feedback-"]').count()>0||await page.locator('.map-primary .react-flow__edge[data-id*="feedback-"]').count()>0);await page.getByRole('button',{name:'关闭对象说明',exact:true}).click();}
 await node('evaluation').click();await page.getByRole('button',{name:'关闭对象说明',exact:true}).click();await shot('03-support-linked.png',page.locator('.outline-object-map'));
 await node('memory').click();assert(await page.getByRole('button',{name:'对应内容待开放',exact:true}).isDisabled());await page.getByRole('button',{name:'关闭对象说明',exact:true}).click();await node('model').focus();await page.keyboard.press('Enter');assert(await page.getByRole('button',{name:'进入模型优化',exact:true}).isEnabled());await page.getByRole('button',{name:'关闭对象说明',exact:true}).click();
 await go('/learn/objects?section=principles');await page.getByRole('heading',{name:'调优总览',exact:true}).waitFor();assert.equal(new URL(page.url()).hash,'#/guide?section=map');
 await go('/learn/decisions?section=route');await graph.waitFor();assert.equal(await graph.locator('.decision-question').count(),7);assert.equal(await graph.locator('.decision-outcome').count(),7);assert.equal(await page.locator('.article-toc:visible').count(),0);await shot('04-decision-whole.png',graph);await graph.locator('.react-flow__node[data-id="model"]').click();assert((await panel.innerText()).includes('对象说明：模型'));assert.equal(await graph.locator('.decision-path-candidate').count(),0);await reset();
 await answer('否');await answer('否');await candidate('记忆');await shot('05-memory-route.png',graph);
 await reset();await answer('否');await answer('是');await answer('否');await candidate('Prompt');
 await reset();await answer('否');await answer('是');await answer('是');await answer('否');await candidate('Skill');
 await reset();await answer('否');await answer('是');await answer('是');await answer('是');await answer('否');await candidate('工具');
 await reset();await answer('否');await answer('是');await answer('是');await answer('是');await answer('是');await candidate('架构设计');
 await reset();await answer('是');await answer('否');await candidate('模型');assert.equal(await panel.locator('.decision-model-directions>div').count(),3);
 await reset();await answer('是');await answer('是');await answer('否');await candidate('运行环境与安全监测');
 await reset();await answer('是');await answer('是');await answer('是');await candidate('架构设计');
 await reset();await answer('证据不足');assert((await panel.innerText()).includes('当前不生成候选对象'));assert.equal(await graph.locator('.decision-path-candidate').count(),0);await shot('06-evidence-gap.png',panel);
 await reset();await answer('否');await answer('本任务不适用');assert((await panel.innerText()).includes('Skill 说明'));await answer('否');await candidate('Prompt');
 await graph.locator('.decision-path-history>button').first().click();await answer('是');assert.equal(await graph.locator('.decision-path-history>button').count(),1,'Stale downstream answers survived an upstream change');assert((await panel.innerText()).includes('模型的判断'));
 await graph.getByRole('button',{name:'退回上一项',exact:true}).click();assert.equal(await graph.locator('.decision-path-history>button').count(),0);
 await graph.locator('.react-flow__node[data-id="H4"]').click();assert((await panel.innerText()).includes('工具请求参数'));assert(await panel.getByRole('button',{name:'是',exact:true}).isDisabled());await panel.getByRole('button',{name:'回到当前判断',exact:true}).click();
 await graph.locator('.react-flow__node[data-id="H1"]').focus();await page.keyboard.press('Enter');assert((await panel.innerText()).includes('记忆取回请求'));await reset();
 await page.emulateMedia({reducedMotion:'no-preference'});await go('/guide');await page.locator('.map-primary').scrollIntoViewIfNeeded();await page.waitForTimeout(400);assert(await page.locator('.map-primary animateMotion').count()>0);await page.getByRole('button',{name:'暂停动画',exact:false}).click();assert.equal(await page.locator('.map-primary animateMotion').count(),0);
 await go('/learn/decisions?section=route');await page.clock.install();await graph.getByLabel('设备号示例情境').selectOption('model');await graph.getByRole('button',{name:'演示这条路线',exact:true}).click();await page.clock.runFor(2800);assert.equal(await graph.locator('.decision-path-history>button').count(),1);assert(await graph.locator('.react-flow__edge.animated').count()>0);await graph.getByRole('button',{name:'暂停示例',exact:true}).click();await page.clock.runFor(8000);assert.equal(await graph.locator('.decision-path-history>button').count(),1);assert.equal(await graph.locator('.react-flow__edge.animated').count(),0);await graph.getByRole('button',{name:'继续示例',exact:true}).click();await page.clock.runFor(2800);await candidate('模型');assert.equal(await graph.locator('.react-flow__edge.animated').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1920,1440,1268,1024,768,390,320]){
  await page.setViewportSize({width,height:width===1268?700:width<500?844:1000});
  await go('/guide');await node('evaluation').waitFor();await noOverflow(width+' overview');if(width===390||width===1268)await shot('overview-'+width+'.png');
  await go('/learn/decisions?section=route');await graph.waitFor();await noOverflow(width+' decisions');if(width<1100)assert(await graph.locator('.decision-graph-scroll').evaluate(e=>e.scrollWidth>e.clientWidth),'Narrow graph should scroll instead of shrinking text');if(width===390||width===1268)await shot('decisions-'+width+'.png');
 }
 assert.equal(errors.length,0,errors.join('\n'));const result={passed:true,duplicateObjectsRemoved:true,overviewAligned:true,mapFullyVisible:true,crossObjectInteraction:true,decisionRoutes:8,insufficientEvidence:true,notApplicable:true,upstreamInvalidation:true,keyboard:true,animatedExample:true,reducedMotion:true,widths:[1920,1440,1268,1024,768,390,320],browserErrors:errors};await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),fullPage:false});console.error(error);process.exitCode=1}finally{await browser.close()}
