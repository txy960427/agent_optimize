import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (file) => fs.readFile(path.join(root, file), 'utf8');

const pages = [
  'web/src/app/App.tsx',
  'web/src/pages/home/HomeAtlas.tsx',
  'web/src/pages/preface/Preface.tsx',
  'web/src/pages/guide/OutlineOverview.tsx',
  'web/src/pages/learn/Course.tsx',
  'web/src/pages/cases/Cases.tsx',
  'web/src/pages/work/Workbench.tsx',
  'web/src/components/ui.tsx',
  'web/src/api/realData.ts',
  'web/src/styles/index.css',
];
const readable = [
  'web/src/pages/work/Workbench.tsx',
  'web/src/pages/preface/Preface.tsx',
  'web/src/pages/guide/ObjectMapCore.tsx',
  'web/src/pages/learn/DecisionExplorer.tsx',
  'web/src/pages/preface/ArchitectureLab.tsx',
  'web/src/pages/learn/Course.tsx',
];

test('页面、组件、接口和样式按目录分开', async () => {
  for (const file of pages) await fs.access(path.join(root, file));
  const main = await read('web/src/main.tsx');
  assert.match(main, /styles\/index\.css/);
  assert.doesNotMatch(main, /home-positioning|home-focus|home-sop/);
});

test('宽屏布局约定放在样式入口最后，现有页面和新组件共用', async () => {
  const index = await read('web/src/styles/index.css');
  const layout = await read('web/src/styles/layout.css');
  assert.match(index.trimEnd(), /@import '\.\/layout\.css';$/);
  for (const name of ['stack', 'cluster', 'switcher', 'with-sidebar', 'prose']) {
    assert.match(layout, new RegExp(`\\.${name}\\b`));
  }
  assert.match(layout, /container-name:\s*canvas/);
  assert.match(layout, /--layout-measure:\s*40rem/);
  for (const page of ['.preface-page', '.real-cases', '.reading-layout.course-layout']) {
    assert.match(layout, new RegExp(page.replace('.', '\\.')));
  }
  assert.match(await read('web/src/styles/home-focus.css'), /\.home-revision.guide-home/);
});

test('原先挤在长行里的页面可以按行阅读', async () => {
  for (const file of readable) {
    const lines = (await read(file)).split(/\r?\n/);
    const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
    assert.ok(lines.length > 40, `${file} 仍然只有 ${lines.length} 行`);
    assert.ok(longest < 500, `${file} 最长行有 ${longest} 个字符`);
  }
});
