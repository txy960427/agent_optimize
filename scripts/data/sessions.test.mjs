import test from "node:test";
import assert from "node:assert/strict";
import { createExportStore } from "../../server/export-store.mjs";
const store = createExportStore();
test("默认聚合真实Session，缺失Session的Trace独立保留", async () => {
  const list = await store.sessions(
    new URLSearchParams("group=sessions&pageSize=30"),
  );
  assert.equal(list.total, 34);
  assert(list.items.every((s) => s.sessionId));
  const missing = await store.sessions(new URLSearchParams("group=unassigned"));
  assert.equal(missing.total, 7);
  assert(missing.items.every((s) => !s.sessionId && s.traceCount === 1));
});
test("案例过滤和关键词命中保留Session的完整上下文", async () => {
  const result = await store.sessions(
    new URLSearchParams(
      "group=sessions&case=anomaly-1-selection-state-mismatch",
    ),
  );
  assert.equal(result.total, 1);
  assert.equal(result.items[0].traceCount, 5);
  const session = await store.session(result.items[0].sessionId);
  assert.equal(session.traces.length, 5);
  assert.deepEqual(
    session.traces.map((t) => t.startTime),
    session.traces.map((t) => t.startTime).sort(),
  );
});
test("自动识别完整Trace ID，包含未关联Session的运行", async () => {
  const all = await store.load();
  const missing = all.summaries.find((t) => !t.sessionId);
  const result = await store.sessions(
    new URLSearchParams({ group: "sessions", mode: "auto", q: missing.id }),
  );
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, missing.id);
  const detail = await store.detail(missing.id);
  assert.equal(detail.observations.length, missing.observationCount);
});
test("Session精确查询不截断为单条Trace，页码为整数", async () => {
  const result = await store.sessions(
    new URLSearchParams(
      "q=f4344da8-b0c3-4bd3-81b4-0d6443a0e010&mode=auto&page=1.8&pageSize=2.7",
    ),
  );
  assert.equal(result.total, 1);
  assert.equal(result.items[0].traceCount, 5);
  assert.equal(result.page, 1);
});
