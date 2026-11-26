import { chromium, expect } from '../../web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve(process.argv[2] || 'test-results/reading');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
const go = route => page.goto('http://127.0.0.1:4173/#' + route, { waitUntil: 'networkidle' });
const shot = name => page.screenshot({ path: path.join(output, name) });
const assert = (value, message) => { if (!value) throw new Error(message); };
async function atTop() {
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('.reading-header h1')).toBeInViewport();
}
async function atSection(id) {
  await expect.poll(() => page.locator(`[id="${id}"] :is(h2,h3)`).first().evaluate(el => {
    const top = el.getBoundingClientRect().top;
    const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
    return top >= header + 18 && top < innerHeight * .65;
  })).toBe(true);
  assert(await page.locator(`#${id} :is(h2,h3)`).first().evaluate(el => document.activeElement === el), 'Focus did not reach ' + id);
  await expect(page.locator('.app-sidebar a[aria-current="location"]')).toHaveAttribute('href', new RegExp('section=' + id + '$'));
}
async function sidebarDoesNotOverlap() {
  const geometry = await page.evaluate(() => {
    const nav = document.querySelector('.app-sidebar nav');
    const footer = document.querySelector('.sidebar-footer');
    return { bottom: nav.getBoundingClientRect().bottom, footerTop: footer.getBoundingClientRect().top, scrollHeight: nav.scrollHeight, height: nav.clientHeight };
  });
  assert(geometry.bottom <= geometry.footerTop - 8, 'Directory content overlaps its footer: ' + JSON.stringify(geometry));
  return geometry;
}
try {
  const routes = ['/preface', '/guide', ...['runtime','locate','context','decisions','verify','case','model'].map(id => '/learn/' + id)];
  const openings = [];
  for (const route of routes) {
    await go(route);
    await atTop();
    assert(await page.locator('main h1').count() === 1, 'Chapter must have exactly one page title: ' + route);
    openings.push(await page.locator('.reading-header').evaluate(el => {
      const h1 = el.querySelector('h1').getBoundingClientRect();
      const lead = el.querySelector('.reading-lead');
      return { left: h1.left, top: h1.top, titleSize: getComputedStyle(el.querySelector('h1')).fontSize, summarySize: getComputedStyle(lead).fontSize };
    }));
    if (['/preface','/learn/runtime','/guide'].includes(route)) await shot('desktop-' + route.split('/').pop() + '.png');
  }
  assert(openings.every(item => item.left === openings[0].left && item.top === openings[0].top && item.titleSize === openings[0].titleSize && item.summarySize === openings[0].summarySize), 'Chapter openings do not use the same alignment/type scale');

  await go('/preface');
  const sectionLinks = await page.locator('.app-sidebar a[href*="?section="]').evaluateAll(links => links.map(a => a.getAttribute('href')));
  for (const href of sectionLinks) {
    await go(href.slice(1));
    await atSection(new URLSearchParams(href.split('?')[1]).get('section'));
  }
  // A normal chapter click must ignore the old reading offset, even on the same route.
  await go('/preface?section=scope');
  await page.locator('.sidebar-chapter-row a[href="#/preface"]').click();
  await atTop();
  await page.evaluate(() => scrollTo(0, 600));
  await page.locator('.sidebar-chapter-row a[href="#/preface"]').click();
  await atTop();
  await page.locator('.sidebar-children a[href="#/preface?section=principles"]').click();
  await atSection('principles');
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('.sidebar-children a[href="#/preface?section=principles"]').click();
  await atSection('principles');
  await shot('desktop-subsection.png');
  await page.reload({ waitUntil: 'networkidle' });
  await atSection('principles');
  await go('/learn/runtime?section=cycle');
  await atSection('cycle');
  await page.locator('.article-toc a[href="#/learn/runtime?section=observations"]').click();
  await atSection('observations');
  await page.goBack({ waitUntil: 'networkidle' });
  await atSection('cycle');
  await go('/learn/context?section=missing-section');
  await atTop();

  // Expanding the whole tree in a short window reproduces the reported footer collision.
  await page.setViewportSize({ width: 1440, height: 650 });
  await go('/preface');
  await page.locator('.sidebar-chapter-row button[aria-expanded="false"]').evaluateAll(buttons => buttons.forEach(button => button.click()));
  await page.locator('.sidebar-lesson-row button[aria-expanded="false"]').evaluateAll(buttons => buttons.forEach(button => button.click()));
  const navGeometry = await sidebarDoesNotOverlap();
  assert(navGeometry.scrollHeight > navGeometry.height, 'The long directory did not become scrollable');
  await page.locator('.app-sidebar nav').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await shot('desktop-long-directory.png');
  await expect(page.locator('.sidebar-saved-link')).toBeInViewport();
  await sidebarDoesNotOverlap();

  for (const width of [1920, 1440, 1280, 1024, 900, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/preface','/guide','/learn/runtime','/learn/context','/learn/model']) {
      await go(route);
      await atTop();
      assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), 'Horizontal page overflow: ' + width + route);
      assert(!await page.locator('.reading-header, .reading-page > section > p, .reading-page dt, .reading-page dd').evaluateAll(elements => elements.some(el => el.scrollWidth > el.clientWidth + 2)), 'Reading text is clipped: ' + width + route);
    }
    if (width === 390) {
      await go('/preface');
      await shot('mobile-preface.png');
      await page.getByRole('button', { name: '打开导航', exact: true }).click();
      await sidebarDoesNotOverlap();
      await page.locator('.sidebar-children a[href="#/preface?section=scope"]').click();
      await atSection('scope');
      await expect(page.locator('.app-sidebar')).toHaveCSS('visibility', 'hidden');
      await shot('mobile-subsection.png');
    }
  }
  assert(errors.length === 0, errors.join('\n'));
  const result = { passed: true, chapters: routes.length, anchors: sectionLinks.length, consistentOpenings: true, repeatedNavigation: true, deepLinkReloadAndBack: true, sidebarScrollAndFooter: true, widths: [1920,1440,1280,1024,900,768,390,320], browserErrors: errors };
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await shot('failure.png');
  console.error(error);
  process.exitCode = 1;
} finally { await browser.close(); }
