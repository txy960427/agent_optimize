import {
  chromium,
  expect,
} from "../../web/node_modules/@playwright/test/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const root = "http://127.0.0.1:4173",
  out = "test-results/practice-integration";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
  acceptDownloads: true,
});
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
const requests = [];
page.on("request", (request) => requests.push(request.url()));
const trace = "57c4084a5554aa917049a6be681df62a",
  session = "f4344da8-b0c3-4bd3-81b4-0d6443a0e010";
const shot = (name) =>
  page.screenshot({ path: out + "/" + name + ".png", fullPage: true });
const go = async (route) => {
  await page.goto(root + "/#" + route);
  await page.waitForLoadState("networkidle");
};
const overflow = async (label) =>
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
    label + " overflow",
  );
const input = (label) => page.getByLabel(label, { exact: true });
try {
  await go("/cases");
  await expect(page.locator(".pt-session-row").first()).toBeVisible();
  await shot("01-sessions");
  await overflow("sessions");
  await page.getByRole("button", { name: "选中状态案例", exact: true }).click();
  await expect(page.locator(".pt-session-row")).toHaveCount(1);
  await page.locator(".pt-session-row").click();
  await expect(page.locator(".pt-turn")).toHaveCount(5);
  await go("/cases?session=" + session + "&trace=" + trace);
  await expect(page.locator(".pt-trace-preview h2")).toContainText(
    "打开当前选中患者",
  );
  await shot("02-session-traces");
  await page
    .getByRole("button", { name: "拆解这条 Trace", exact: true })
    .click();
  await expect(page.locator(".pt-step-select")).toHaveCount(2);
  const workRoute = await page.evaluate(() => location.hash.slice(1));
  assert.equal(await page.locator(".pt-phase-list").count(), 0);
  await page.locator(".pt-step-select").nth(1).click();
  assert.equal(await page.locator(".pt-phase-list").count(), 0);
  await expect(page.locator(".pt-step-reader h2")).toContainText("步骤 2");
  await page.locator(".pt-step-select").first().click();
  await page.getByRole("button", { name: "查看内部拆解", exact: true }).click();
  await expect(page.locator(".pt-phase-list")).toHaveCount(1);
  await page.locator(".pt-phase-list button").first().click();
  await expect(page.locator(".pt-internals")).toBeVisible();
  await page.getByRole("button", { name: "返回步骤概览", exact: true }).click();
  await page.getByRole("button", { name: "收起内部拆解", exact: true }).click();
  await shot("03-step-input-output");
  await page.getByLabel("顺序核对", { exact: true }).check();
  await page
    .getByRole("button", { name: "确认拆解并开始核对", exact: true })
    .click();
  await page.getByRole("button", { name: "开始判断本步", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("请先填写");
  await input("本步预期").fill(
    "应查询工作区状态，拿到与已选中患者一致的信息。",
  );
  await page.getByRole("button", { name: "开始判断本步", exact: true }).click();
  await page.locator(".pt-step-select").nth(1).click();
  await expect(page.locator(".pt-task-dock h2")).toContainText("步骤 1");
  await page
    .getByRole("button", { name: "返回正在核对的步骤 1", exact: true })
    .click();
  await page
    .getByRole("radiogroup", { name: "步骤判断", exact: true })
    .getByLabel("资料不足", { exact: true })
    .check();
  assert.equal(
    await page
      .getByRole("button", { name: "定位到步骤 1", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("radiogroup", { name: "步骤判断", exact: true })
    .getByLabel("存在偏差", { exact: true })
    .check();
  await input("记录偏差").fill(
    "工具返回未选中，但用户反馈前端已选中，需要继续核对同步链路。",
  );
  await shot("04-step-check");
  await page.getByRole("button", { name: "定位到步骤 1", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "定位到：步骤 1", exact: true }),
  ).toBeVisible();
  await input("选择待核对模型调用").selectOption("58c0bfb7499f9b0e");
  await page
    .getByRole("button", { name: "确认步骤，进入方向排查", exact: true })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(14);
  await expect(page.locator(".pt-decision-inspector h2")).toContainText(
    "三个标准",
  );
  await page.locator('.react-flow__node[data-id="H4"]').click();
  await expect(page.locator(".pt-decision-scroll")).toContainText(
    "此节点尚未到达",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "提交判断，更新路径", exact: true })
      .count(),
    0,
  );
  await page.locator('.react-flow__node[data-id="D1"]').click();
  await page.getByRole("tab", { name: "原文与引用", exact: true }).click();
  await expect(page.locator(".rr-message")).toHaveCount(35);
  await input("过滤上下文来源分组").selectOption("feedback");
  await input("过滤消息角色").selectOption("tool");
  await expect(page.locator(".rr-message")).toHaveCount(1);
  await page.locator(".rr-message header button").first().click();
  await page.getByRole("tab", { name: "判断", exact: true }).click();
  for (const [name, choice] of [
    ["齐全", "满足"],
    ["精准", "不满足"],
    ["一致", "不满足"],
  ]) {
    await page
      .getByRole("radiogroup", { name: name + "判断", exact: true })
      .getByLabel(choice, { exact: true })
      .check();
    if (choice !== "满足")
      await input(name + "依据").fill(
        "实际状态与用户反馈存在冲突，待核对来源与同步。",
      );
  }
  await page
    .getByRole("button", { name: "提交判断，更新路径", exact: true })
    .click();
  await expect(page.locator(".pt-decision-inspector>header strong")).toHaveText(
    "当前判断",
  );
  for (const id of ["H1", "H2", "H3"]) {
    await expect(
      page.locator(".pt-decision-inspector>header .badge"),
    ).toHaveText(id);
    await page
      .getByRole("radiogroup", { name: "节点判断", exact: true })
      .getByLabel("不适用", { exact: true })
      .check();
    await input("判断依据 / 待补信息").fill(
      "当前核对工具状态反馈，未发现本机制涉及本次状态冲突。",
    );
    await page
      .getByRole("button", { name: "提交判断，更新路径", exact: true })
      .click();
  }
  await expect(page.locator(".pt-decision-inspector>header .badge")).toHaveText(
    "H4",
  );
  await page
    .getByRole("radiogroup", { name: "节点判断", exact: true })
    .getByLabel("不符合", { exact: true })
    .check();
  await input("判断依据 / 待补信息").fill(
    "返回状态与用户反馈冲突，工具方向为待验证候选。",
  );
  await shot("05-decision-map");
  await page
    .getByRole("button", { name: "提交判断，更新路径", exact: true })
    .click();
  await expect(page.locator(".pt-decision-inspector h2")).toHaveText("工具");
  await page
    .getByRole("button", { name: "保存记录，安排验证", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "记录与验证", exact: true }),
  ).toBeVisible();
  assert.equal(await input("实际验证结果").inputValue(), "");
  await input("验证计划").fill(
    "固定版本与条件，对比前端选中状态和工具返回，补充同步日志后验证。",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出摘要", exact: true }).click();
  const file = await download;
  await file.saveAs(out + "/analysis.md");
  const md = await fs.readFile(out + "/analysis.md", "utf8");
  assert(md.includes(trace) && md.includes("58c0bfb7499f9b0e"));
  assert(/^## 原文引用$/m.test(md));
  assert(md.split("\n").length > 20);
  await shot("06-record");
  await page.reload({ waitUntil: "networkidle" });
  await expect(input("验证计划")).toHaveValue(/固定版本/);
  await page.getByRole("button", { name: "返回核对", exact: true }).click();
  await expect(page.locator(".pt-decision-layout")).toBeVisible();
  // Changing an earlier decision must remove the previous candidate and later answers.
  await page.locator('.react-flow__node[data-id="H1"]').click();
  await page
    .getByRole("radiogroup", { name: "节点判断", exact: true })
    .getByLabel("资料不足", { exact: true })
    .check();
  await input("判断依据 / 待补信息").fill("需要补充历史取回记录。");
  await page
    .getByRole("button", { name: "提交判断，更新路径", exact: true })
    .click();
  const stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("agent-tuning-real-export-v1"))
        .investigations[0],
  );
  assert.deepEqual(Object.keys(stored.answers), ["H1"]);
  assert.equal(stored.answers.H1, "unknown");
  assert(stored.history.length > 0);
  assert.equal(
    await page
      .getByRole("button", { name: "保存记录，安排验证", exact: true })
      .count(),
    0,
  );
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await overflow("decision " + width);
    if (width === 390) await shot("mobile-decision");
    await go("/cases");
    await expect(page.locator(".pt-session-row").first()).toBeVisible();
    await overflow("cases " + width);
    await go(workRoute);
    await expect(page.locator(".pt-decision-layout")).toBeVisible();
    await page
      .getByRole("button", { name: "回看定位步骤", exact: true })
      .click();
    await page
      .getByRole("button", { name: "调整定位步骤", exact: true })
      .click();
    await expect(page.locator(".pt-step-select")).toHaveCount(2);
    await overflow("steps " + width);
    if (width === 390) await shot("mobile-steps");
    await page
      .getByRole("button", { name: "优化方向排查", exact: true })
      .click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go(workRoute);
  await page.getByRole("button", { name: "回看定位步骤", exact: true }).click();
  await page.getByRole("button", { name: "调整定位步骤", exact: true }).click();
  await page.getByRole("button", { name: "原始记录", exact: true }).click();
  await expect(page.locator(".rt-raw-record")).toHaveCount(20);
  await page
    .locator(".rt-raw-record")
    .filter({ hasText: "ChatOpenAI" })
    .first()
    .click();
  await page.getByText("修正此记录的教学映射", { exact: true }).click();
  await page.getByRole("button", { name: "保存映射修正", exact: true }).click();
  await expect(page.locator(".pt-work")).toContainText("映射已修正");
  assert.equal(await page.locator(".rt-raw-record").count(), 20);
  await page.getByRole("button", { name: "历史记录", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "关闭侧栏", exact: true }).click();
  await page.getByRole("button", { name: "展开全书目录", exact: true }).click();
  await expect(page.locator("#guide-sidebar")).toBeVisible();
  await page.keyboard.press("Escape");
  // Each step keeps its own expectation; insufficient evidence can only be saved pending.
  await go("/cases?session=" + session + "&trace=" + trace);
  await page
    .getByRole("button", { name: "拆解这条 Trace", exact: true })
    .click();
  await page.getByLabel("顺序核对", { exact: true }).check();
  await page
    .getByRole("button", { name: "确认拆解并开始核对", exact: true })
    .click();
  await input("本步预期").fill("本步查询工作区状态");
  await page.getByRole("button", { name: "开始判断本步", exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "步骤判断", exact: true })
    .getByLabel("符合预期", { exact: true })
    .check();
  await page.getByRole("button", { name: "核对下一步骤", exact: true }).click();
  await expect(input("本步预期")).toHaveValue("");
  await expect(page.locator(".pt-task-dock h2")).toContainText("步骤 2");
  await input("本步预期").fill("根据查询状态组织准确回复");
  await page.getByRole("button", { name: "开始判断本步", exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "步骤判断", exact: true })
    .getByLabel("资料不足", { exact: true })
    .check();
  await input("待补充的信息").fill("补充前端选中状态和同步日志");
  await page
    .getByRole("button", { name: "保存待补，稍后继续", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "记录与验证", exact: true }),
  ).toBeVisible();
  assert.equal(await input("实际验证结果").inputValue(), "");
  await page.getByRole("button", { name: "历史记录", exact: true }).click();
  await page
    .getByRole("button", { name: "继续这次分析", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "记录与验证", exact: true }),
  ).toBeVisible();
  await go("/cases?q=no-such-session-unique-893251");
  await expect(
    page.getByRole("heading", {
      name: "没有找到匹配的会话或运行",
      exact: true,
    }),
  ).toBeVisible();
  await go("/preface");
  await expect(page.locator(".reading-page")).toBeVisible();
  await overflow("guide unaffected");
  assert.deepEqual(errors, []);
  assert(!requests.some((url) => /flow-data|api\/.*llm/i.test(url)));
  console.log(
    "PASS production Session → Trace → step checks → complete decision map → citations → findings, persistence, invalidation, raw mapping, responsive and guide isolation.",
  );
} catch (error) {
  await shot("failure");
  throw error;
} finally {
  await browser.close();
}
