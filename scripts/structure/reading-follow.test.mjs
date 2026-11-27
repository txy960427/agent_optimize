import assert from 'node:assert/strict';
import test from 'node:test';
import { activeReadingSection } from '../../web/src/app/readingFollow.ts';

test('阅读线以上的最后一节才是当前节', () => {
  const sections = [
    { id: 'background', top: -420 },
    { id: 'reading', top: 20 },
    { id: 'collaboration', top: 380 },
  ];
  assert.equal(activeReadingSection(sections, 100), 'reading');
  assert.equal(activeReadingSection(sections, 10), 'background');
  assert.equal(activeReadingSection([{ id: 'background', top: 180 }], 100), null);
  const tail = [{ id: 'architecture', top: -200 }, { id: 'loop', top: 420 }];
  assert.equal(activeReadingSection(tail, 100), 'architecture');
  assert.equal(activeReadingSection(tail, 100, { atBottom: true, viewportBottom: 900 }), 'loop');
  assert.equal(activeReadingSection(tail, 100, { atBottom: true, viewportBottom: 400 }), 'architecture');
});
