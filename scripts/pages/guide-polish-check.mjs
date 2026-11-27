import {chromium,expect} from '../../web/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve('test-results/visual-polish');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1040},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
const go=route=>page.goto('http://127.0.0.1:4173/#'+route,{waitUntil:'networkidle'});
const shot=name=>page.screenshot({path:path.join(output,name)});
async function matchesBackgroundToken(locator,token){
 const colors=await locator.evaluate((el,name)=>{
  const probe=document.createElement('span');probe.style.color=`var(${name})`;el.append(probe);
  const expected=getComputedStyle(probe).color;probe.remove();
  return {actual:getComputedStyle(el).backgroundColor,expected};
 },token);
 assert.equal(colors.actual,colors.expected);
}
try{
 await go('/');
 await expect(page.locator('link[rel=icon]')).toHaveAttribute('href','/guide-mark.svg');
 assert.equal((await page.request.get('http://127.0.0.1:4173/guide-mark.svg')).status(),200);
 await page.keyboard.press('Control+k');
 await expect(page.getByRole('textbox',{name:'章节关键词',exact:true})).toBeFocused();
 await page.getByRole('textbox',{name:'章节关键词',exact:true}).fill('上下文');
 await expect(page.locator('.guide-search-results')).toContainText('核对模型实际收到的输入');
 await shot('search-after.png');
 await page.getByRole('textbox',{name:'章节关键词',exact:true}).fill('分角色阅读地图');
 await page.keyboard.press('Enter');
 await expect(page.locator('#role-map h3')).toBeFocused();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'查找章节',exact:true}).click();
 await page.getByRole('textbox',{name:'章节关键词',exact:true}).fill('一个不存在的章节xyz');
 await expect(page.locator('.guide-search-empty')).toBeVisible();
 await page.getByRole('textbox',{name:'章节关键词',exact:true}).fill('Harness调优技术');
 await expect(page.locator('.guide-search-results button').filter({hasText:'Harness 调优技术'})).toBeDisabled();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'查找章节',exact:true})).toBeFocused();
 await go('/preface');
 const breadcrumb=page.getByRole('navigation',{name:'当前位置',exact:true});
 await expect(breadcrumb.locator('[aria-current=page]')).toContainText('第 0 章');
 await matchesBackgroundToken(breadcrumb,'--primary-wash');
 await shot('preface-after.png');
 await go('/preface?section=chapter-guide');
 await matchesBackgroundToken(page.locator('#chapter-guide thead th').first(),'--table-heading');
 await shot('table-after.png');
 await go('/cases');await page.locator('.rc-table tbody tr').first().waitFor();
 await matchesBackgroundToken(page.locator('.rc-table thead th').first(),'--table-heading');
 await expect(page.locator('.rc-table tr.is-selected')).toHaveCount(1);
 await shot('cases-after.png');
 // Call the application's print command without opening an interactive system dialog.
 await page.evaluate(()=>{window.print=()=>{window.__printed=true}});
 await page.getByRole('button',{name:'打印本页',exact:true}).click();
 assert(await page.evaluate(()=>window.__printed),'The print command did not invoke browser printing');
 await go('/preface');
 assert(!await page.locator('.sop-text-alternative').evaluate(el=>el.open));
 await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));
 assert(await page.locator('.sop-text-alternative').evaluate(el=>el.open));
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.site-header')).toBeHidden();
 await expect(page.locator('.app-sidebar')).toBeHidden();
 await expect(page.locator('.sop-text-alternative table')).toBeVisible();
 await page.pdf({path:path.join(output,'preface-print.pdf'),format:'A4',printBackground:true});
 await page.emulateMedia({media:'screen'});
 await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 assert(!await page.locator('.sop-text-alternative').evaluate(el=>el.open));
 for(const width of [1920,1440,1268,1024,768,390,320]){
  await page.setViewportSize({width,height:width<500?844:1040});
  for(const route of ['/','/?home=1','/preface','/preface?section=chapter-guide','/learn/context','/cases']){
   await go(route);
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Horizontal overflow at '+width+route);
   assert(!await page.locator('.site-header').evaluate(el=>el.scrollWidth>el.clientWidth+1),'Header overflows at '+width);
   if(width===390&&route==='/')await shot('home-mobile.png');
  }
  if(width===390){await page.getByRole('button',{name:'查找章节',exact:true}).click();await page.getByRole('textbox',{name:'章节关键词',exact:true}).fill('齐全');await shot('search-mobile.png');await page.keyboard.press('Escape')}
 }
 await page.setViewportSize({width:1440,height:1040});await go('/');await shot('home-after.png');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,brandAndFavicon:true,chapterSearchAndShortcut:true,subsectionNavigation:true,pendingAndEmptySearch:true,printCommandAndLayout:true,chapterBreadcrumbs:true,sharedTableTheme:true,selectedTracePreserved:true,widths:[1920,1440,1268,1024,768,390,320],browserErrors:errors},null,2));
}catch(error){await shot('failure.png');console.error(error);process.exitCode=1}finally{await browser.close()}
