import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../../web/node_modules/@playwright/test/index.mjs';

const output = path.resolve(process.argv[2] || 'test-results/layout-audit');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const pages = [
  ['home1', '/?home=1'], ['home2', '/?home=2'],
  ['preface', '/preface?section=internal'], ['course', '/learn/context'], ['cases', '/cases'],
  ['outline', '/guide'], ['decision', '/learn/decisions?section=route'],
];
const reports = [];
try {
for (const size of [{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768},{width:1280,height:720},{width:1268,height:550},{width:1100,height:600},{width:1024,height:768},{width:900,height:700},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]) {
  await page.setViewportSize(size);
  for (const [name, route] of pages) {
    await page.goto('http://127.0.0.1:4173/#' + route);
    await page.locator('#main').waitFor();
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(() => {
      const box = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom), display: s.display, visibility: s.visibility, transform: s.transform, font: s.fontSize, color: s.color, background: s.backgroundColor };
      };
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1,
        header: box('.site-header'), sidebar: box('.app-sidebar'), main: box('#main'),
        hero: box('.home-split-hero, .home-book-hero'), copy: box('.home-hero-message'),
        actions: box('.home-entry-actions'), jump: box('.catalog-jump'),
        preview: box('.home-sop-preview, .guide-cover-scene'), spread: box('.guide-reading-spread'),
        prose: box('#internal > p'), table: box('#internal .preface-table-region'),
      };
    });
    reports.push({name, ...size, ...metrics});
    if ([1440,1268,390].includes(size.width)) await page.screenshot({path:path.join(output, `${name}-${size.width}.png`)});
  }
}
await fs.writeFile(path.join(output,'metrics.json'), JSON.stringify(reports,null,2));
if (process.argv.includes('--verify')) {
  for (const report of reports) {
    const key = `${report.name} ${report.width}×${report.height}`;
    assert(!report.overflow, `${key}: document overflow`);
    if (report.name.startsWith('home')) {
      assert(report.actions.bottom <= report.height, `${key}: entry below fold`);
      if (report.width >= 1100) {
        assert(report.hero.bottom <= report.height - 4, `${key}: hero cut off`);
        assert(report.preview.bottom <= report.height - 4, `${key}: illustration cut off`);
      }
    }
    if (report.name === 'preface') {
      assert(Math.abs(report.prose.x-report.table.x) <= 1, `${key}: table and prose have different left edges`);
      assert(Math.abs(report.prose.width-report.table.width) <= 1, `${key}: table extends outside reading column`);
    }
    if (report.width >= 1100 && !['home1','home2','cases'].includes(report.name)) {
      assert(report.sidebar.width >= 224 && report.sidebar.width <= 240, `${key}: desktop reading sidebar width`);
    } else assert(report.sidebar.visibility === 'hidden', `${key}: sidebar occupies home, investigation or small screen`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/#/preface?section=chapter-guide');
  const table=page.getByRole('region',{name:'章节导读表，可横向滚动'});
  await table.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  assert(await table.evaluate(el=>el.scrollLeft>0),'Mobile table cannot be scrolled using keyboard');
  const menu=page.locator('.mobile-menu');
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'),'true');
  const dialog=page.getByRole('dialog',{name:'全书目录与实操'});
  assert(await dialog.isVisible());
  await dialog.getByRole('button',{name:'关闭目录',exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  assert(await dialog.evaluate(el=>el.contains(document.activeElement)),'Drawer focus escaped');
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'),'false');
  assert(await menu.evaluate(el=>el===document.activeElement),'Drawer did not restore focus');
  await menu.click();
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.app-content').getAttribute('inert'),null,'Desktop content remains inert after resize');
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:width===1440?900:844});
    for(const route of ['/?home=1','/?home=2','/cases']) {
      await page.goto('http://127.0.0.1:4173/#'+route);
      const peek=page.getByRole('button',{name:'展开全书目录',exact:true});
      await peek.waitFor();
      assert.equal(await page.locator('.app-sidebar').evaluate(el=>getComputedStyle(el).visibility),'hidden');
      const before=await page.locator('.app-content').boundingBox();
      await peek.click();
      const directory=page.getByRole('dialog',{name:'全书目录与实操'});
      await directory.waitFor();
      const after=await page.locator('.app-content').boundingBox();
      assert.equal(after.x,before.x,'Opening directory shifted the content');
      assert.equal(after.width,before.width,'Opening directory resized the canvas');
      await page.keyboard.press('Escape');
      assert(await peek.evaluate(el=>el===document.activeElement),'Directory did not restore focus to edge handle');
      await peek.click();
      await directory.getByRole('link',{name:'前言',exact:true}).click();
      await page.locator('.preface-document').waitFor();
      assert.equal(await page.locator('.navigation-peek').count(),0,'Reading still uses hidden directory mode');
      const visible=await page.locator('.app-sidebar').evaluate(el=>getComputedStyle(el).visibility);
      assert.equal(visible,width>=1100?'visible':'hidden','Reading directory did not follow viewport');
      await page.goBack();
      await page.getByRole('button',{name:'展开全书目录',exact:true}).waitFor();
      assert.equal(await page.locator('.app-sidebar').evaluate(el=>getComputedStyle(el).visibility),'hidden','Returning to home or investigation did not collapse directory');
    }
  }
  await page.goto('http://127.0.0.1:4173/#/cases');
  const investigation=await page.evaluate(async()=>{
    const {newInvestigation}=await import('/src/domain/data.ts');
    return newInvestigation('57c4084a5554aa917049a6be681df62a',[],'目录检查：保留当前排查记录','目录开关不改变输入');
  });
  const workspace=await browser.newPage({reducedMotion:'reduce',storageState:{cookies:[],origins:[{
    origin:'http://127.0.0.1:4173',
    localStorage:[{name:'agent-tuning-real-export-v1',value:JSON.stringify({investigations:[investigation],selectedObject:'system',returnTo:'/work/'+investigation.id,positions:{}})}],
  }]}});
  try {
  for(const width of [1440,390]) {
    await workspace.setViewportSize({width,height:width===1440?900:844});
    for(const name of ['work','findings']) {
      await workspace.goto(`http://127.0.0.1:4173/#/${name}/${investigation.id}`,{waitUntil:'networkidle'});
      await workspace.locator(name==='work'?'main.pt-work,main.real-workspace':'main.real-findings').waitFor();
      assert.equal(await workspace.locator('.not-found').count(),0,'Stored investigation did not load');
      const peek=workspace.getByRole('button',{name:'展开全书目录',exact:true});
      await peek.waitFor();
      assert.equal(await workspace.locator('.app-sidebar').evaluate(el=>getComputedStyle(el).visibility),'hidden');
      const recordBefore=await workspace.evaluate(()=>JSON.parse(localStorage.getItem('agent-tuning-real-export-v1')).investigations[0]);
      assert.equal(recordBefore.id,investigation.id,'Active record is missing');
      const before=await workspace.locator('.app-content').boundingBox();
      await peek.click();
      await workspace.getByRole('dialog',{name:'全书目录与实操'}).waitFor();
      const after=await workspace.locator('.app-content').boundingBox();
      assert.equal(after.width,before.width,'Opening directory resized actual investigation');
      await workspace.keyboard.press('Escape');
      const recordAfter=await workspace.evaluate(()=>JSON.parse(localStorage.getItem('agent-tuning-real-export-v1')).investigations[0]);
      assert.deepEqual(recordAfter,recordBefore,'Directory changed the actual investigation record');
      if(width===1440)await workspace.screenshot({path:path.join(output,name+'-directory-collapsed.png')});
    }
  }
  } finally { await workspace.close(); }
  const colors = await page.evaluate(()=>{
    const s=getComputedStyle(document.documentElement);
    return Object.fromEntries(['primary','panel','ink','muted','teal-ink','teal-wash','amber-ink','amber-wash'].map(key=>[key,s.getPropertyValue('--'+key).trim()]));
  });
  const luminance = hex => {
    const rgb=hex.replace('#','').match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  const contrast = (a,b) => {const x=luminance(colors[a]),y=luminance(colors[b]);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const contrasts=Object.fromEntries([['primary','panel'],['ink','panel'],['muted','panel'],['teal-ink','teal-wash'],['amber-ink','amber-wash']].map(([a,b])=>[a+'/'+b,+contrast(a,b).toFixed(2)]));
  for(const [name,ratio] of Object.entries(contrasts)) assert(ratio>=4.5,`${name}: contrast ${ratio}`);
  const result={passed:true,viewports:reports.length/pages.length,pages:pages.map(([name])=>name),desktopHeroesFit:true,entriesAboveFold:true,readingTableAlignment:true,keyboardTableScroll:true,drawerFocusAndResize:true,homeAndPracticeDefaultCollapsed:true,overlayWithoutCanvasShift:true,readingAndBackNavigation:true,actualInvestigationPreserved:true,contrasts};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} else console.log(`Recorded ${reports.length} page/viewports in ${output}`);
} finally {
  await browser.close();
}
