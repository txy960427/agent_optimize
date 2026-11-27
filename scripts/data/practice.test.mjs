import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../../web/node_modules/vite/dist/node/index.js";
import { createExportStore } from "../../server/export-store.mjs";
const server = await createServer({
  root: new URL("../../web/", import.meta.url).pathname.replace(
    /^\/([A-Z]:)/i,
    "$1",
  ),
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { keepAnswersBefore, associatedModels, resetDecisions, practiceState } =
    await server.ssrLoadModule("/src/domain/practice.ts");
  const { newInvestigation } = await server.ssrLoadModule(
    "/src/domain/data.ts",
  );
  const trace = await createExportStore().detail(
    "57c4084a5554aa917049a6be681df62a",
  );
  test("提交新节点保留已走路径；改判先前节点清除后续答案", () => {
    const inv = newInvestigation(trace.id, [], "", "");
    inv.verdicts = { complete: "no", precise: "yes", consistent: "yes" };
    inv.answers = { H1: "na" };
    inv.decisionNotes = { H1: "当前无需历史" };
    assert.deepEqual(keepAnswersBefore(inv, "H2").answers, { H1: "na" });
    inv.answers = { H1: "na", H2: "yes", H3: "na", H4: "no" };
    assert.deepEqual(keepAnswersBefore(inv, "H2").answers, { H1: "na" });
    assert.deepEqual(keepAnswersBefore(inv, "H1").answers, {});
  });
  test("跨步骤模型关联依实际tool_call_id，辅助调用不混入主步骤", () => {
    const inv = newInvestigation(trace.id, [], "", "");
    assert.deepEqual(
      associatedModels(trace, inv).map((x) => [x.model.id, x.step]),
      [
        ["0ff59bea3601a125", 1],
        ["58c0bfb7499f9b0e", 2],
      ],
    );
    inv.loop = 2;
    assert.deepEqual(
      associatedModels(trace, inv).map((x) => x.model.id),
      ["58c0bfb7499f9b0e"],
    );
  });
  test("上游改变归档人工判断与验证结果，保留现有记录格式", () => {
    const inv = newInvestigation(trace.id, [], "现象", "预期");
    inv.answers = { H1: "no" };
    inv.verificationResult = "原验证";
    const reset = resetDecisions(inv, "改变关联调用");
    assert.deepEqual(reset.answers, {});
    assert.equal(reset.verificationResult, "");
    assert(reset.history[0].includes("原验证"));
    assert.equal(practiceState(inv).stepChecks[1].expected, "预期");
  });
} finally {
  await server.close();
}
