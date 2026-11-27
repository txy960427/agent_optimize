import { chromium } from '../../web/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const output=process.argv[2]||path.resolve('test-results/home-sop');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1040},reducedMotion:'no-preference'});
page.setDefaultTimeout(15000);
const errors=[];const requests=[];page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>requests.push(request.url()));
const go=route=>page.goto('http://127.0.0.1:4173/#'+route,{waitUntil:'networkidle'});
const canvas=page.locator('.home-sop-preview');const stages=['problem','locate','improve','verify','iterate'];
const names=['发现问题','定位对象','专项改进','对照验证','沉淀与更新'];
const stageButton=index=>page.getByRole('navigation',{name:'完整调优SOP'}).getByRole('button',{name:new RegExp(names[index])});
async function select(index){await stageButton(index).click();await page.waitForFunction(id=>document.querySelector('.home-sop-preview')?.getAttribute('data-step')===id,stages[index]);}
async function shot(name,fullPage=false){await page.evaluate(()=>{document.activeElement?.blur?.();scrollTo({top:0,behavior:'instant'})});await page.mouse.move(0,0);await page.waitForTimeout(100);await page.screenshot({path:path.join(output,name),fullPage});}
async function checkLayout(width){
 assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),'Document overflow at '+width);
 for(const selector of ['.guide-reading-spread','.sop-case-page','.sop-method-index','.home-hero-message h1'])assert(!await page.locator(selector).evaluate(el=>el.scrollWidth>el.clientWidth+2),selector+' overflows at '+width);
}
try{
 await go('/?home=1');await canvas.waitFor();await page.waitForFunction(()=>document.querySelector('.home-sop-preview')?.classList.contains('preview-playing'));
 assert.equal(await stageButton(0).getAttribute('aria-current'),'step');
 assert.equal(await page.getByRole('navigation',{name:'完整调优SOP'}).locator('ol>li').count(),5);
 assert((await canvas.innerText()).includes('情境示例'));assert((await canvas.innerText()).includes('CT-02'));assert((await canvas.innerText()).includes('请先提供设备号'));
 for(const removed of ['Viewer','open_app','内部导出','交付能力，由三层共同形成'])assert(!(await canvas.innerText()).includes(removed),'Old case or positioning remains: '+removed);
 assert(!requests.some(url=>url.includes('/guide-example')),'The illustrative scenario still requests the unrelated real case');
 await page.getByRole('button',{name:'暂停调优流程',exact:true}).click();await shot('home1-desktop.png');await shot('home1-full.png',true);
 await page.clock.install();
 await page.getByRole('button',{name:'重新播放调优流程',exact:true}).click();
 const autoSequence=[];
 for(const [index,duration]of [6500,7500,7500,7000,7500].entries()){
   await page.clock.runFor(duration+100);await page.waitForFunction(id=>document.querySelector('.home-sop-preview')?.getAttribute('data-step')===id,stages[(index+1)%5]);
   autoSequence.push(await canvas.getAttribute('data-step'));
   assert(await page.locator('.sop-scene-active').evaluate(el=>[el,...el.querySelectorAll('.sop-scene,.sop-reveal-first,.sop-reveal-second,.sop-reveal-third')].every(node=>getComputedStyle(node).visibility==='visible'&&Number(getComputedStyle(node).opacity)===1)),'Automatic scene becomes blank during transition');
 }
 assert.deepEqual(autoSequence,['locate','improve','verify','iterate','problem']);
 await page.getByRole('button',{name:'暂停调优流程',exact:true}).click();const paused=await canvas.getAttribute('data-step');await page.clock.runFor(20000);assert.equal(await canvas.getAttribute('data-step'),paused,'Pause did not freeze the workflow');
 const heights=[];
 for(let index=0;index<5;index++){
   await select(index);assert.equal(await stageButton(index).getAttribute('aria-current'),'step');assert(await page.getByRole('button',{name:'播放调优流程',exact:true}).isVisible());
   const text=await page.locator('#home-sop-panel').innerText();
   if(index===1){assert(text.includes('输入中没有')&&text.includes('输入中已有'));assert(text.includes('候选对象'));}
   if(index===2){assert(text.includes('若已确认'));assert(text.includes('技术方法')&&text.includes('同类实践案例'));assert(text.includes('待补充'));assert.equal(await canvas.locator('a[href*="/learn/harness"]').count(),0);}
   if(index===3){for(const criterion of ['不重复索要','不沿用旧设备号','正常追问','验证不通过'])assert(text.includes(criterion));assert(!text.includes('验证通过'));}
   if(index===4){for(const action of ['归档案例','持续测评','更新技术方法与指南','负责人复盘'])assert(text.includes(action));}
   heights.push((await page.locator('.guide-reading-spread').boundingBox()).height);await shot('sop-'+(index+1)+'-'+stages[index]+'.png');
 }
 assert(Math.max(...heights)-Math.min(...heights)<3,'The hero jumps in height while playing: '+heights);
 await page.getByRole('button',{name:'回到问题发现',exact:true}).click();assert.equal(await canvas.getAttribute('data-step'),'problem');
 await stageButton(3).focus();await page.keyboard.press('Enter');assert.equal(await canvas.getAttribute('data-step'),'verify');
 await select(2);const before=page.url();await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'浏览专项目录',exact:true}).click();assert.equal(page.url(),before);assert((await page.locator('#chapters').boundingBox()).y<600,'Specialist catalog did not scroll into view');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await select(1);await page.getByRole('link',{name:'阅读总纲',exact:true}).click();await page.locator('.map-experience').waitFor();
 await go('/?home=1');await select(4);await page.getByRole('link',{name:'查看维护机制',exact:true}).click();await page.locator('#maintenance').waitFor();assert((await page.locator('#maintenance').innerText()).includes('回归集'));
 await go('/?home=1');assert.equal(await page.locator('.stage-chapter').count(),7);assert.equal(await page.locator('.chapter-planned a').count(),0);assert((await page.locator('.home-aim-strip').innerText()).includes('责任团队与流转路径'));
 await page.getByRole('button',{name:'开始排查',exact:true}).click();
 await page.waitForFunction(()=>location.hash.startsWith('#/cases')&&document.querySelector('.pt-cases,.real-cases'));
 await go('/?home=2');assert(await page.locator('.guide-cover-scene').isVisible());assert.equal(await page.locator('.guide-chapter').count(),7);await shot('home2-desktop.png');
 for(const width of [1920,1440,1268,1024,768,390,320]){
   await page.setViewportSize({width,height:width===1268?600:width<500?844:1040});
   for(const home of [1,2]){
     await go('/?home='+home);if(home===1){await select(0);await checkLayout(width);const spreadHeights=[];for(let index=0;index<5;index++){await select(index);await checkLayout(width);spreadHeights.push((await page.locator('.guide-reading-spread').boundingBox()).height);}assert(Math.max(...spreadHeights)-Math.min(...spreadHeights)<3,'Scene height changes at '+width+': '+spreadHeights);await select(0);}
     else assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),'Book homepage overflow at '+width);
     if(width===390||width===1268)await shot('home'+home+'-'+width+'.png',width===390);
   }
 }
 await page.emulateMedia({reducedMotion:'reduce'});await go('/guide');await go('/?home=1');await canvas.waitFor();assert(await page.getByRole('button',{name:'播放调优流程',exact:true}).isDisabled());await page.clock.runFor(40000);assert.equal(await canvas.getAttribute('data-step'),'problem');await select(4);assert.equal(await page.locator('.sop-scene-active').evaluate(el=>getComputedStyle(el).animationName),'none');
 const root=path.resolve('..');const manifest=JSON.parse(await fs.readFile(path.join(root,'design/sources/preface-source-manifest.json'),'utf8'));const bytes=await fs.readFile(path.join(root,manifest.sources[0].path));assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sources[0].sha256);const notes=await fs.readFile(path.join(root,'docs/product/PREFACE-READING-NOTES.md'),'utf8');assert(notes.includes('用户后续澄清')&&notes.includes('页面转述')&&notes.includes('未找到对应文本'));
 assert.equal(errors.length,0,errors.join('\n'));
 const result={passed:true,homepages:2,wholeGuideSop:true,steps:stages,autoSequence,pauseAndResume:true,manualSelectionAndKeyboard:true,noAutomaticRootCause:true,scenarioClearlyLabeled:true,noFakeTraceAssociation:true,specialistStatusHonest:true,verificationAndFeedbackLoop:true,stablePanelHeight:true,chapterNavigation:true,reducedMotion:true,sourceArchiveHashVerified:true,widths:[1920,1440,1268,1024,768,390,320],browserErrors:errors};await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});console.error(error);process.exitCode=1}finally{await browser.close()}
