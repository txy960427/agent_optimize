import assert from 'node:assert/strict';
import test from 'node:test';
import { contentText as summaryText, messagesOf as summaryMessages, roleOf as summaryRole } from '../../server/message-text.mjs';
import { contentText as readText, messagesOf as readMessages, roleOf as readRole } from '../../shared/read-message.mjs';

test('摘要解析保持服务端现有规则', () => {
  assert.equal(summaryRole({ role: 'human' }), 'user');
  assert.equal(summaryRole({ role: 'user' }), 'user');
  assert.equal(summaryRole({ type: 'ai' }), 'assistant');
  assert.equal(summaryRole({ id: ['langchain', 'HumanMessage'] }), 'user');
  assert.equal(summaryRole({ kwargs: { type: 'AIMessage' } }), 'assistant');
  assert.equal(summaryRole({ role: 'tool' }), 'tool');
  assert.equal(summaryRole({}), '');
  assert.equal(summaryText(null), '');
  assert.equal(summaryText(['a', '', 'b']), 'a\nb');
  assert.equal(summaryText({ text: 'hi' }), 'hi');
  assert.equal(summaryText({ kwargs: { content: 'from-kwargs' } }), 'from-kwargs');
  assert.equal(summaryText({ data: { content: 'from-data' } }), 'from-data');
  assert.equal(summaryText({ unknown: 1 }), JSON.stringify({ unknown: 1 }));
  assert.deepEqual(summaryMessages([{ role: 'user' }]), [{ role: 'user' }]);
  assert.deepEqual(summaryMessages({ messages: [{ role: 'user' }] }), [{ role: 'user' }]);
  assert.deepEqual(summaryMessages({}), []);
});

test('阅读解析保持前端现有规则，并且不并进摘要解析', () => {
  assert.equal(readRole({ role: 'human' }), 'user');
  assert.equal(readRole({ role: 'user' }), 'user');
  assert.equal(readRole({ role: 'ai' }), 'assistant');
  assert.equal(readRole({ id: ['langchain', 'HumanMessage'] }), 'user');
  assert.equal(readRole({}), '未分类');
  assert.equal(readRole({ kwargs: { type: 'AIMessage' } }), '未分类');
  assert.equal(readText(['a', '', 'b']), 'a\n\nb');
  assert.equal(readText({ unknown: 1 }), JSON.stringify({ unknown: 1 }, null, 2));
  assert.equal(readMessages({ messages: [{ role: 'user' }] })?.[0].role, 'user');
  assert.equal(readMessages({ messages: ['plain'] }), null);
  assert.equal(readMessages({}), null);
  assert.notEqual(summaryRole({}), readRole({}));
  assert.notEqual(summaryText(['a', '', 'b']), readText(['a', '', 'b']));
});
