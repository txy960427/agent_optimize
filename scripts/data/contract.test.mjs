import assert from 'node:assert/strict';
import test from 'node:test';
import { manifestFields } from '../../shared/local-data-fields.mjs';

const required = ['version', 'traceCount', 'sessionCount', 'tracesWithoutSession', 'observationCount', 'errorCount', 'earliest', 'latest', 'caseCount', 'sources', 'conflicts', 'mode'];

test('清单字段与前端类型使用同一份名单', () => {
  assert.deepEqual([...manifestFields], required);
});
