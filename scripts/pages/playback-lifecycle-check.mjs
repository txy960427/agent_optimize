import { chromium, expect } from '../../web/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const go = route => page.goto('http://127.0.0.1:4173/#' + route, { waitUntil: 'networkidle' });
async function hidden(value) {
  await page.evaluate(value => {
    if (value) Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    else Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  }, value);
}

try {
  await go('/guide');
  const node = page.locator('.map-primary .react-flow__node[data-id="collaboration"]');
  await node.scrollIntoViewIfNeeded();
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  assert.equal(await page.locator('.map-primary .object-active').count(), 0);
  await page.mouse.move(box.x + box.width / 2 + 35, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  assert.equal(await page.locator('.map-primary .object-active').count(), 0, 'Dragging selected an object');
  await node.click();
  await expect(node.locator('.object-active')).toHaveCount(1);
  await page.getByRole('button', { name: '关闭对象说明', exact: true }).click();

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: '继续动画', exact: false })).toBeEnabled();
  await page.getByRole('button', { name: '从头演示对象协作', exact: true }).click();
  await expect(page.locator('.map-primary animateMotion').first()).toBeAttached();
  await page.clock.install();
  const caption = page.locator('.map-stage-caption strong');
  const before = await caption.innerText();
  await hidden(true);
  await page.clock.runFor(9000);
  assert.equal(await caption.innerText(), before);
  assert.equal(await page.locator('.map-primary animateMotion').count(), 0);
  await hidden(false);
  await page.clock.runFor(2900);
  assert.notEqual(await caption.innerText(), before);

  await go('/learn/decisions?section=route');
  const explorer = page.locator('.decision-explorer');
  const history = explorer.locator('.decision-path-history>button');
  await explorer.getByRole('button', { name: '演示这条路线', exact: true }).click();
  await page.clock.runFor(2800);
  await expect(history).toHaveCount(1);
  await hidden(true);
  await page.clock.runFor(9000);
  await expect(history).toHaveCount(1);
  assert.equal(await explorer.locator('.react-flow__edge.animated').count(), 0);
  await hidden(false);
  await page.clock.runFor(2800);
  await expect(explorer.locator('.decision-inspector h3')).toContainText('候选方向：记忆');

  await explorer.getByRole('button', { name: '重新判断', exact: true }).click();
  await explorer.getByRole('button', { name: '演示这条路线', exact: true }).click();
  await page.clock.runFor(2800);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(explorer.getByRole('button', { name: '继续示例', exact: true })).toBeDisabled();
  await page.clock.runFor(9000);
  await expect(history).toHaveCount(1);
  assert.equal(await explorer.locator('.react-flow__edge.animated').count(), 0);
  console.log(JSON.stringify({ passed: true, selectOnRelease: true, dragDoesNotSelect: true, hiddenPagePausesBoth: true, visiblePageResumes: true, liveReducedMotion: true }));
} finally {
  await browser.close();
}
