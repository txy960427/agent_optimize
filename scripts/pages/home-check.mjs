import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '../../web/node_modules/@playwright/test/index.mjs';

const output = path.resolve(process.argv[2] || 'test-results/home-current');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
const go = route => page.goto('http://127.0.0.1:4173/#' + route, { waitUntil: 'networkidle' });
try {
  for (const route of ['/', '/?home=1', '/?home=2', '/?home=3', '/?version=v06', '/?home=3&compare=1&concept=original']) {
    await go(route);
    await expect(page.locator('.hero-concepts')).toHaveAttribute('data-concept', 'map');
    assert.equal(new URL(page.url()).hash, '#/', 'Legacy homepage URL was not canonicalized');
    assert.equal(await page.locator('.atlas-samples,.home-sop-preview,.guide-cover-scene').count(), 0);
    assert.equal(await page.locator('.hc-concept-tabs').count(), 0);
    assert.equal(await page.locator('#chapters.chapter-index-cards .guide-chapter').count(), 7);
    assert.equal(await page.locator('#chapters .chapter-planned a').count(), 0);
  }
  await page.getByRole('button', { name: '展开全书目录', exact: true }).click();
  const directory = page.getByRole('navigation', { name: '固定课程导航', exact: true });
  await expect(directory.getByRole('link', { name: '首页', exact: true })).toBeVisible();
  assert.equal(await directory.getByRole('link', { name: /^首页[123]$/ }).count(), 0);
  assert.equal(await page.locator('.sidebar-home').count(), 1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '浏览全书目录', exact: true }).click();
  await expect(page.locator('#chapters > header')).toBeInViewport();
  await page.locator('#chapters [data-chapter=outline] h3 a').click();
  await page.locator('.outline-overview').waitFor();
  await directory.getByRole('link', { name: '首页', exact: true }).click();
  await page.locator('.hc-map-stage').waitFor();
  assert.equal(new URL(page.url()).hash, '#/');
  await page.getByRole('button', { name: '地图选择Harness 调优技术', exact: true }).click();
  await expect(page.locator('.hc-map-chapter-heading h2')).toHaveText('Harness 调优技术');
  await page.getByRole('button', { name: '查看章节规划', exact: true }).click();
  await expect(page.locator('#chapters [data-chapter=harness]')).toBeFocused();
  await page.evaluate(() => scrollTo(0, 0));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: '重新演示', exact: true }).click();
  await page.mouse.move(0, 0);
  await page.locator('.atlas-message h1').click();
  await page.waitForTimeout(250);
  const position = () => page.locator('.hc-map-traveler').evaluate(el => [el.getAttribute('cx'), el.getAttribute('cy')].join(','));
  const before = await position();
  await page.waitForTimeout(1000);
  assert.notEqual(await position(), before, 'Chapter map no longer plays automatically');
  await page.getByRole('button', { name: '暂停自动演示', exact: true }).click();
  const paused = await position();
  await page.waitForTimeout(350);
  assert.equal(await position(), paused, 'Chapter map pause failed');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1920, 1440, 1268, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await go('/');
    await page.evaluate(() => {document.activeElement?.blur?.();scrollTo({top:0,behavior:'instant'});});
    await page.waitForTimeout(160);
    assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), 'Page overflow at ' + width);
    const columns = await page.locator('.chapter-index-cards > ol').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width <= 560 ? 1 : width <= 848 ? 2 : 3, 'Chapter card column count at ' + width);
    const actions = await page.locator('.atlas-actions').boundingBox();
    assert(actions.y + actions.height <= page.viewportSize().height,'Homepage entries below fold at '+width);
    await page.locator('#chapters').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `chapters-${width}.png`) });
    await page.evaluate(() => scrollTo(0, 0));
    if ([1440, 390].includes(width)) await page.screenshot({ path: path.join(output, `home-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  const result = { passed: true, singleHome: true, legacyUrlsCanonical: true, samplesRemoved: true, chapterCards: 7, plannedStatusPreserved: true, mapPlaybackAndPause: true, chapterNavigation: true, responsiveWidths: [1920,1440,1268,1024,768,390,320], browserErrors: errors };
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  throw error;
} finally { await browser.close(); }
