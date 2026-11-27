import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { transformWithOxc } from '../../web/node_modules/vite/dist/node/index.js';

// Use the web build's transformer, including on supported Node 20.
const source = await fs.readFile(new URL('../../web/src/domain/data.ts', import.meta.url), 'utf8');
const { code: compiled } = await transformWithOxc(source, 'data.ts');
const { deriveDecision, decisionTarget, decisionBranches } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
);
const complete = { complete: 'yes', precise: 'yes', consistent: 'yes' };
const incomplete = { ...complete, complete: 'no' };

test('三项输入都明确满足才进入模型分支', () => {
  for (const input of [{}, { complete: 'yes', precise: 'yes' }, { ...complete, consistent: '' }]) {
    const result = deriveDecision(input, { D2: 'no' });
    assert.equal(result.candidate, null);
    assert.equal(result.pending, true);
  }
  assert.equal(deriveDecision(complete, {}).current, 'D2');
  assert.equal(deriveDecision({ ...complete, extra: 'no' }, {}).current, 'D2');
});

test('任一不满足可核对Harness，同时保留未决项', () => {
  const result = deriveDecision({ complete: 'no', precise: '', consistent: 'unknown' }, {});
  assert.equal(result.current, 'H1');
  assert.equal(result.candidate, null);
});

test('八条终点路线遵循同一份分支规则', () => {
  const cases = [
    [incomplete, { H1: 'no' }, 'memory'],
    [incomplete, { H1: 'yes', H2: 'no' }, 'prompt'],
    [incomplete, { H1: 'yes', H2: 'yes', H3: 'no' }, 'skill'],
    [incomplete, { H1: 'yes', H2: 'yes', H3: 'yes', H4: 'no' }, 'tool'],
    [incomplete, { H1: 'yes', H2: 'yes', H3: 'yes', H4: 'yes' }, 'architecture'],
    [complete, { D2: 'no' }, 'model'],
    [complete, { D2: 'yes', E1: 'no' }, 'environment'],
    [complete, { D2: 'yes', E1: 'yes' }, 'architecture'],
  ];
  for (const [input, answers, candidate] of cases) {
    const result = deriveDecision(input, answers);
    assert.equal(result.candidate, candidate);
    for (let index = 0; index < result.path.length; index++) {
      const item = result.path[index];
      const expected = result.path[index + 1]?.id ?? '@' + candidate;
      assert.equal(decisionTarget(item.id, item.answer), expected);
    }
  }
  assert.equal(decisionBranches.length * 2, 14);
});

test('证据不足停止，旧分支答案不改变当前路线', () => {
  const result = deriveDecision(complete, { D2: 'unknown', E1: 'yes', H1: 'no' });
  assert.equal(result.pending, true);
  assert.equal(result.candidate, null);
  assert.deepEqual(result.path.map(item => item.id), ['D1', 'D2']);
});

test('不适用只对声明过该条件的机制生效', () => {
  assert.equal(deriveDecision(incomplete, { H1: 'na', H2: 'no' }).candidate, 'prompt');
  const invalid = deriveDecision(complete, { D2: 'na', E1: 'yes' });
  assert.equal(invalid.candidate, null);
  assert.equal(invalid.pending, true);
  assert.equal(decisionTarget('missing', 'yes'), null);
});
