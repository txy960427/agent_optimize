import { chromium } from '../../web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const output=process.argv[2]||path.resolve('test-results/guide');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1040},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const go=route=>page.goto('http://127.0.0.1:4173/#'+route,{waitUntil:'networkidle'});
const navLinks=()=>page.locator('.app-sidebar nav a').evaluateAll(links=>links.map(a=>[a.getAttribute('href'),a.textContent]));
async function shot(name){await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();scrollTo({top:0,behavior:'instant'})});await page.waitForTimeout(100);await page.screenshot({path:path.join(output,name),fullPage:true});}
async function next(count){for(let i=0;i<count;i++)await page.getByRole('button',{name:'下一步演示',exact:true}).click();}
try{
 await go('/');
 await page.getByRole('heading',{level:1,name:/医疗设备智能体的\s*调优方法与实践。/}).waitFor();
 assert(await page.locator('.stage-chapter').count()===7,'The full seven-chapter guide is missing');
 assert(await page.locator('.chapter-planned a').count()===0,'An unwritten chapter has a dead navigation link');
 assert(await page.locator('.guide-home .map-experience').count()===0,'The tuning map still occupies the guide homepage');
 assert(await page.locator('.app-sidebar .sidebar-chapter').count()===7,'The sidebar does not match the complete guide');
 const originalNav=await navLinks();
 await shot('01-guide-home-desktop.png');
 await page.getByRole('button',{name:'浏览全书目录',exact:true}).click();
 await page.waitForFunction(()=>scrollY>0&&document.getElementById('chapters').getBoundingClientRect().top<innerHeight/2);
 assert(await page.locator('#chapters').evaluate(e=>e.getBoundingClientRect().top)<520,'Browse chapters did not reach the catalog');
 await page.getByRole('button',{name:'从前言开始',exact:true}).click();
 await page.getByRole('heading',{name:'前言',level:1,exact:true}).waitFor();
 assert(JSON.stringify(await navLinks())===JSON.stringify(originalNav),'The global chapter tree changed on entering the foreword');
 await page.locator('.architecture-lab').waitFor();
 await shot('02-preface-default-desktop.png');
 assert(await page.locator('.architecture-lab .react-flow__node').count()===11,'Architecture components are missing');
 await page.getByRole('button',{name:'信息齐全，调用工具',exact:false}).click();
 await next(5);
 await page.locator('.lab-current-step>strong').filter({hasText:'工具执行'}).waitFor();
 assert((await page.locator('.lab-record>p').innerText()).includes('成功'),'The complete-input example did not execute its tool');
 await page.locator('.react-flow__node[data-id="memory"]').click();
 await page.locator('.lab-current-step>strong').filter({hasText:'记忆与历史'}).waitFor();
 await page.getByRole('button',{name:'返回当前步骤',exact:true}).click();
 await page.getByRole('checkbox',{name:'显示记忆与 Skills',exact:true}).uncheck();
 assert(await page.locator('.architecture-lab .react-flow__node[data-id="memory"]').count()===0,'Support components did not hide');
 await page.getByRole('checkbox',{name:'显示记忆与 Skills',exact:true}).check();
 await page.getByRole('button',{name:'缺少上下文，先追问',exact:false}).click();
 await next(6);
 assert((await page.locator('.lab-record>p').innerText()).includes('请问你要查询哪台设备'),'Missing context should finish with a question');
 assert(await page.getByRole('button',{name:'下一步演示',exact:true}).isDisabled(),'The completed teaching flow can advance beyond its end');
 await page.getByRole('button',{name:'工具超时，处理反馈',exact:false}).click();
 await next(5);
 assert((await page.locator('.lab-record>p').innerText()).includes('TIMEOUT'),'Timeout feedback is missing');
 await next(6);
 assert((await page.locator('.lab-record>p').innerText()).includes('暂未完成'),'The timeout example should not claim a successful answer');
 await page.getByRole('button',{name:'重置架构演示',exact:true}).click();
 await page.getByRole('button',{name:'播放运行',exact:true}).click();
 await page.waitForTimeout(1750);
 await page.getByRole('button',{name:'暂停运行',exact:true}).click();
 assert((await page.locator('.lab-current-step>span').innerText()).includes('2 /'),'Playback did not advance');
 await page.locator('.react-flow__node[data-id="model"]').focus();
 await page.keyboard.press('Enter');
 await page.locator('.lab-current-step>strong').filter({hasText:'LLM 推理'}).waitFor();
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await shot('02-preface-desktop.png');
 await page.getByRole('button',{name:'进入第 1 章：调优总纲',exact:true}).click();
 await page.locator('.outline-overview .map-experience').waitFor();
 assert(JSON.stringify(await navLinks())===JSON.stringify(originalNav),'The chapter tree changed on entering the tuning outline');
 await page.getByRole('button',{name:'开始阅读总纲',exact:true}).click();
 await page.getByRole('heading',{name:'看懂一次运行',exact:true}).waitFor();
 const loopBackground=await page.locator('.course-main .loop-experience').evaluate(e=>getComputedStyle(e).backgroundColor);
 assert(loopBackground==='rgb(241, 245, 252)','The dark teaching canvas still appears in the tuning chapter');
 await go('/preface?section=architecture');
 const architectureTop=await page.locator('#architecture').evaluate(e=>e.getBoundingClientRect().top);
 assert(architectureTop>=56&&architectureTop<160,'The direct foreword anchor was not restored: '+architectureTop);
 await shot('03-architecture-desktop.png');
 for(const width of [1024,768,390]){
  await page.setViewportSize({width,height:width===390?844:1040});
  for(const route of ['/','/preface','/guide','/learn/runtime','/learn/model']){
   await go(route);
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),'Page overflow at '+width+' '+route);
   if(width===390&&['/','/preface','/guide'].includes(route))await shot('mobile-'+(route==='/'?'home':route.slice(1))+'.png');
  }
 }
 await go('/');
 await page.getByRole('button',{name:'打开导航',exact:true}).click();
 await page.locator('.app-sidebar a[href="#/preface"]').click();
 await page.getByRole('heading',{name:'前言',level:1,exact:true}).waitFor();
 assert(await page.locator('.app-sidebar').evaluate(e=>getComputedStyle(e).visibility==='hidden'),'Mobile sidebar remained open');
 assert(errors.length===0,errors.join('\n'));
 console.log(JSON.stringify({passed:true,chapters:7,homepageAndOutlineSeparated:true,stableNavigation:true,prefaceScenarios:['tool success','ask for missing context','timeout feedback'],playPauseStepReset:true,keyboardInspection:true,deepLink:true,widthsChecked:[1440,1024,768,390],browserErrors:errors,output},null,2));
}catch(error){await page.screenshot({path:path.join(output,'guide-failure.png'),fullPage:true});console.error(error);process.exitCode=1}finally{await browser.close()}
