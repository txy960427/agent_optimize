import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Quote, Sparkles } from "lucide-react";
import {
  decisionNodes,
  deriveDecision,
  objectById,
  type Answer,
  type Criterion,
  type Investigation,
} from "../../domain/data";
import { practiceState, keepAnswersBefore } from "../../domain/practice";
import {
  messagesOf,
  contentText,
  roleOf,
  type RealTrace,
} from "../../api/realData";
import { Button, Badge, Notice, VerdictOptions } from "../../components/ui";
import { DecisionDiagram } from "../learn/DecisionExplorer";
import { RecordReader, type Reference } from "./RecordReader";
export const criteria: { id: Criterion; name: string; question: string }[] = [
  {
    id: "complete",
    name: "齐全",
    question: "本次决策需要的任务、约束、历史、状态与反馈，是否进入实际输入？",
  },
  {
    id: "precise",
    name: "精准",
    question: "内容是否正确、相关并保留必要细节？有无失效或干扰信息？",
  },
  {
    id: "consistent",
    name: "一致",
    question: "关键事实、规则和状态是否衔接，是否使用当前有效信息？",
  },
];
const labels: Record<string, string> = {
  yes: "符合",
  no: "不符合",
  unknown: "资料不足",
  na: "不适用",
};
export function PracticeDecision({
  trace,
  inv,
  update,
  go,
  notify,
}: {
  trace: RealTrace;
  inv: Investigation;
  update: (p: Partial<Investigation>) => void;
  go: (p: string) => void;
  notify: (s: string) => void;
}) {
  const practice = practiceState(inv),
    submitted = practice.rootSubmitted ?? inv.stage >= 3;
  const result = submitted
    ? deriveDecision(inv.verdicts, inv.answers)
    : { path: [], current: "D1", candidate: null, pending: false };
  const current =
    result.current ??
    (result.pending
      ? (result.path.at(-1)?.id ?? "D1")
      : (result.candidate ?? "D1"));
  const [inspected, setInspected] = useState(current),
    [tab, setTab] = useState("judge"),
    [error, setError] = useState(""),
    [animate, setAnimate] = useState(false);
  useEffect(() => {
    setInspected(current);
    setTab("judge");
  }, [current]);
  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setAnimate(false), 950);
    return () => clearTimeout(timer);
  }, [animate]);
  const node = decisionNodes.find((n) => n.id === inspected),
    isRoot = inspected === "D1",
    outcome = !isRoot && !node;
  const editable =
    inspected === current || result.path.some((p) => p.id === inspected);
  const model =
    trace.observations.find((o) => o.id === inv.modelObservationId) ??
    trace.observations.find(
      (o) => o.id === inv.observationId && o.type === "GENERATION",
    );
  const rootDraft = practice.criteriaDraft ?? inv.verdicts,
    rootNotes = practice.criteriaNotes ?? inv.notes;
  const draft = practice.drafts?.[inspected] ?? inv.answers[inspected];
  const note =
    practice.draftNotes?.[inspected] ?? inv.decisionNotes[inspected] ?? "";
  function pick(id: string) {
    setInspected(id);
    setTab("judge");
    setError("");
  }
  function refer(ref: Reference) {
    const references = inv.references ?? [];
    if (!references.some((r) => r.path === ref.path))
      update({ references: [...references, ref] });
    notify("已添加原文引用");
  }
  function submit() {
    if (!editable) return;
    if (isRoot) {
      if (criteria.some((c) => !rootDraft[c.id])) {
        setError("请先完成三个标准的判断。");
        return;
      }
      if (
        criteria.some(
          (c) =>
            (rootDraft[c.id] === "no" || rootDraft[c.id] === "unknown") &&
            !rootNotes[c.id].trim(),
        )
      ) {
        setError("请为不符合或资料不足的标准补充依据。");
        return;
      }
      const pending = criteria
        .filter((c) => rootDraft[c.id] === "unknown")
        .map((c) => c.name + "：" + rootNotes[c.id])
        .join("\n");
      update({
        stage: 3,
        verdicts: rootDraft,
        notes: rootNotes,
        answers: {},
        decisionNotes: {},
        pending,
        verificationResult: "",
        history: [
          ...inv.history,
          ...(submitted
            ? [
                "重新提交D1，清除后续判断；原路径：" +
                  JSON.stringify(result.path),
              ]
            : []),
        ],
        practice: {
          ...practice,
          rootSubmitted: true,
          drafts: {},
          draftNotes: {},
        },
      });
    } else {
      if (!draft) {
        setError("先选择判断结果。");
        return;
      }
      if (!note.trim()) {
        setError("请写下判断依据或需要补充的信息。");
        return;
      }
      const keep = keepAnswersBefore(inv, inspected);
      update({
        ...keep,
        stage: 3,
        answers: { ...keep.answers, [inspected]: draft },
        decisionNotes: { ...keep.decisionNotes, [inspected]: note },
        pending: [
          ...criteria
            .filter((c) => inv.verdicts[c.id] === "unknown")
            .map((c) => c.name + "：" + inv.notes[c.id]),
          ...(draft === "unknown" ? [note] : []),
        ].join("\n"),
        verificationResult: "",
        history: [
          ...inv.history,
          ...(inv.answers[inspected]
            ? ["修改" + inspected + "，原路径：" + JSON.stringify(result.path)]
            : []),
        ],
        practice: { ...practice, drafts: {}, draftNotes: {} },
      });
    }
    setError("");
    setAnimate(true);
  }
  const activeAnswers = Object.fromEntries(
    result.path.map((p) => [p.id, p.answer]),
  );
  const messages = messagesOf(model?.input) ?? [],
    task = [...messages].reverse().find((m) => roleOf(m) === "user");
  const relatedTools = trace.observations.filter((o) => o.name === "tools");
  return (
    <section className="pt-decision">
      <header className="pt-work-title">
        <div>
          <h1>优化方向排查</h1>
          <p>已定位步骤 {inv.loop} · 沿决策路径核对，形成待验证的优化对象。</p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            update({ stage: 1, practice: { ...practice, pane: "confirm" } })
          }
        >
          <ArrowLeft size={14} />
          回看定位步骤
        </Button>
      </header>
      <div className="pt-decision-layout">
        <section className="pt-map">
          <header>
            <h2>完整决策路径</h2>
            <span>
              <i />
              已走路径 <b />
              当前判断
            </span>
          </header>
          <DecisionDiagram
            current={current}
            selected={result.path.map((p) => p.id)}
            answers={activeAnswers}
            candidate={result.candidate}
            inspected={inspected}
            onPick={pick}
            animate={animate}
            compact
          />
          <footer>
            点击节点查看说明；提交判断后更新路径。
            <details>
              <summary>按节点查看</summary>
              <div className="pt-node-list">
                {["D1", ...decisionNodes.map((n) => n.id)].map((id) => (
                  <button
                    key={id}
                    onClick={() => pick(id)}
                    aria-current={current === id ? "step" : undefined}
                  >
                    {id}{" "}
                    {id === "D1"
                      ? "模型输入满足三个标准？"
                      : decisionNodes.find((n) => n.id === id)?.title}
                  </button>
                ))}
              </div>
            </details>
          </footer>
        </section>
        <aside className="pt-decision-inspector">
          <header>
            <Badge>{outcome ? "候选对象" : inspected}</Badge>
            <strong>
              {inspected === current
                ? "当前判断"
                : editable
                  ? "已走路径 · 可修改"
                  : "路线预览"}
            </strong>
          </header>
          <div className="pt-tabs" role="tablist" aria-label="决策信息">
            {[
              ["judge", "判断"],
              ["source", "原文与引用"],
              ["path", "已走路径"],
            ].map(([id, title]) => (
              <button
                role="tab"
                aria-selected={tab === id}
                key={id}
                onClick={() => setTab(id)}
              >
                {title}
              </button>
            ))}
          </div>
          <div className="pt-decision-scroll" role="tabpanel">
            {tab === "source" ? (
              <>
                <div className="pt-evidence-context">
                  <strong>当前核对的模型调用</strong>
                  <code>{model?.id ?? "未关联"}</code>
                  <p>
                    定位步骤 {inv.loop} · {messages.length} 条实际输入消息
                  </p>
                  <p>
                    {task
                      ? contentText(
                          task.content ??
                            (task.kwargs as Record<string, unknown> | undefined)
                              ?.content,
                        ).slice(0, 300)
                      : "未提取到用户任务，请查看原始结构。"}
                  </p>
                </div>
                <RecordReader
                  key={model?.id}
                  record={model}
                  traceId={trace.id}
                  onReference={refer}
                  notify={notify}
                />
                {inspected === "H4" && (
                  <section>
                    <h3>工具执行原文</h3>
                    {relatedTools.map((o) => (
                      <details key={o.id}>
                        <summary>
                          {o.name} · {o.id}
                        </summary>
                        <RecordReader
                          record={o}
                          traceId={trace.id}
                          onReference={refer}
                          notify={notify}
                        />
                      </details>
                    ))}
                  </section>
                )}
                <h3>已引用 {inv.references?.length ?? 0}</h3>
                {inv.references?.map((r) => (
                  <code className="pt-ref" key={r.path}>
                    <Quote size={12} />
                    {r.path}
                  </code>
                ))}
              </>
            ) : tab === "path" ? (
              <div className="pt-path-list">
                {result.path.length ? (
                  result.path.map((p, i) => (
                    <button key={p.id} onClick={() => pick(p.id)}>
                      <span>{i + 1}</span>
                      <div>
                        <strong>
                          {p.id} · {labels[p.answer]}
                        </strong>
                        <p>
                          {p.id === "D1"
                            ? "核对模型输入三标准"
                            : inv.decisionNotes[p.id]}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p>先提交D1的三标准判断。</p>
                )}
                {result.candidate && (
                  <strong>
                    候选：{objectById(result.candidate).name} · 尚待验证
                  </strong>
                )}
              </div>
            ) : outcome ? (
              <>
                <h2>{objectById(inspected).name}</h2>
                <p>{objectById(inspected).definition}</p>
                {result.candidate === inspected ? (
                  <>
                    <Notice>
                      这是基于当前人工判断形成的候选，需要验证后才能确认。
                    </Notice>
                    <label className="pt-field">
                      验证计划
                      <textarea
                        aria-label="验证计划"
                        value={inv.verification}
                        onChange={(e) =>
                          update({ verification: e.target.value })
                        }
                      />
                    </label>
                    <Button
                      onClick={() => {
                        update({ stage: 4 });
                        go("/findings/" + inv.id);
                      }}
                    >
                      保存记录，安排验证
                      <ArrowRight size={14} />
                    </Button>
                  </>
                ) : (
                  <Notice>
                    路线预览：请先完成当前节点 {current}，再确认能否进入此分支。
                  </Notice>
                )}
              </>
            ) : (
              <>
                <h2>{isRoot ? "模型输入满足三个标准吗？" : node?.title}</h2>
                <p>
                  {isRoot
                    ? "对照实际输入，逐项核对齐全、精准、一致。"
                    : node?.description}
                </p>
                {!editable && (
                  <Notice>此节点尚未到达。预览不会改变当前路线。</Notice>
                )}
                <div className="pt-evidence-strip">
                  <span>实际模型输入 · {messages.length} 条消息</span>
                  <button onClick={() => setTab("source")}>
                    查看原文与引用
                    <ArrowRight size={12} />
                  </button>
                </div>
                {isRoot ? (
                  criteria.map((c) => (
                    <fieldset
                      className="pt-criterion"
                      key={c.id}
                      disabled={!editable}
                    >
                      <legend>{c.name}</legend>
                      <p>{c.question}</p>
                      <VerdictOptions
                        value={rootDraft[c.id]}
                        label={c.name + "判断"}
                        onChange={(value) => {
                          update({
                            practice: {
                              ...practice,
                              criteriaDraft: { ...rootDraft, [c.id]: value },
                              criteriaNotes: rootNotes,
                            },
                          });
                          setError("");
                        }}
                      />
                      <textarea
                        aria-label={c.name + "依据"}
                        placeholder="判断依据，或还需要补充什么"
                        value={rootNotes[c.id]}
                        onChange={(e) =>
                          update({
                            practice: {
                              ...practice,
                              criteriaDraft: rootDraft,
                              criteriaNotes: {
                                ...rootNotes,
                                [c.id]: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </fieldset>
                  ))
                ) : (
                  <fieldset className="pt-node-question" disabled={!editable}>
                    <legend className="sr-only">{node?.title}</legend>
                    <div role="radiogroup" aria-label="节点判断">
                      {(
                        [
                          "yes",
                          "no",
                          ...(node?.na ? ["na"] : []),
                          "unknown",
                        ] as Answer[]
                      ).map((answer) => (
                        <label
                          key={answer}
                          className={draft === answer ? "chosen" : ""}
                        >
                          <input
                            type="radio"
                            name={"decision-" + inspected}
                            checked={draft === answer}
                            onChange={() => {
                              update({
                                practice: {
                                  ...practice,
                                  drafts: {
                                    ...practice.drafts,
                                    [inspected]: answer,
                                  },
                                },
                              });
                              setError("");
                            }}
                          />
                          {labels[answer]}
                        </label>
                      ))}
                    </div>
                    <label className="pt-field">
                      判断依据 / 待补信息
                      <textarea
                        aria-label="判断依据 / 待补信息"
                        value={note}
                        onChange={(e) =>
                          update({
                            practice: {
                              ...practice,
                              draftNotes: {
                                ...practice.draftNotes,
                                [inspected]: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </label>
                  </fieldset>
                )}
                {error && (
                  <p className="pt-inline-error" role="alert">
                    {error}
                  </p>
                )}
                {editable && (
                  <Button onClick={submit}>
                    提交判断，更新路径
                    <ArrowRight size={14} />
                  </Button>
                )}
                <p className="pt-llm">
                  <Sparkles size={13} />
                  LLM 辅助未接入，请根据原文判断。
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
