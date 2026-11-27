import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  GitBranch,
  Layers,
  Search,
  AlertTriangle,
} from "lucide-react";
import type {
  Investigation,
  PhaseNumber,
  PracticeState,
  StepCheck,
} from "../../domain/data";
import { phaseNames } from "../../domain/data";
import {
  associatedModels,
  emptyCheck,
  practiceState,
  resetDecisions,
  stepsFor,
} from "../../domain/practice";
import {
  useTrace,
  mappingFor,
  messagesOf,
  roleOf,
  contentText,
  recordText,
  type RealTrace,
} from "../../api/realData";
import {
  Badge,
  Button,
  Empty,
  Notice,
  VerdictOptions,
} from "../../components/ui";
import { RecordReader, type Reference } from "./RecordReader";
import { MappingEditor, RunTimeline } from "./RunTimeline";
import { Findings } from "./Workbench";
import { PracticeDecision } from "./PracticeDecision";
import { PracticeDrawer } from "./PracticeDrawer";
type Props = {
  inv: Investigation;
  update: (patch: Partial<Investigation>) => void;
  go: (path: string) => void;
  onLearn: (course: string) => void;
  saved: "saved" | "saving" | "error";
  notify: (message: string) => void;
};
export function Workbench(props: Props) {
  const { trace, error, retry } = useTrace(props.inv.traceId);
  if (props.inv.stage >= 4) return <Findings {...props} />;
  if (error)
    return (
      <main id="main" className="pt-cases">
        <Empty title="无法读取Trace">
          {error}
          <Button onClick={retry}>重试</Button>
        </Empty>
      </main>
    );
  if (!trace)
    return (
      <main id="main" className="pt-loading" role="status">
        <GitBranch className="pt-spin" />
        正在拆解当前 Trace，读取原始记录与父子关系…
      </main>
    );
  return <LoadedWorkbench {...props} trace={trace} />;
}
function TextBlock({
  title,
  value,
  role,
}: {
  title: string;
  value: unknown;
  role?: string;
}) {
  let display = value;
  if (role === "tool") {
    const messages = messagesOf(value);
    if (messages?.length)
      display = messages
        .map((m) =>
          contentText(
            m.content ??
              (m.kwargs as Record<string, unknown> | undefined)?.content,
          ),
        )
        .join("\n");
    if (typeof display === "string") {
      try {
        display = JSON.parse(display);
      } catch {
        /* Preserve non-JSON feedback as text. */
      }
    }
  }
  const text = typeof display === "string" ? display : recordText(display);
  const [open, setOpen] = useState(false);
  return (
    <article className="pt-message">
      <header>
        {role && <Badge>{role}</Badge>}
        <strong>{title}</strong>
      </header>
      <pre>{text ? (open ? text : text.slice(0, 1600)) : "未记录文本"}</pre>
      {text.length > 1600 && (
        <button onClick={() => setOpen(!open)}>
          {open
            ? "收起"
            : "展开完整内容（" + text.length.toLocaleString() + " 字）"}
        </button>
      )}
    </article>
  );
}
function LoadedWorkbench({
  trace,
  inv,
  update,
  go,
  saved,
  notify,
}: Props & { trace: RealTrace }) {
  const practice = practiceState(inv),
    steps = stepsFor(trace, inv),
    map = mappingFor(trace, inv);
  const [reader, setReader] = useState<{
    step: number;
    phase?: PhaseNumber;
    raw?: string;
    boundary?: "input" | "output";
  }>(() => ({
    step: inv.loop,
    ...(inv.observationId &&
    inv.references?.some((r) => r.observationId === inv.observationId)
      ? { raw: inv.observationId }
      : {}),
  }));
  const [expanded, setExpanded] = useState<number[]>([]),
    [mode, setMode] = useState("steps"),
    [mappingOpen, setMappingOpen] = useState(false),
    [error, setError] = useState("");
  const reading = steps.find((s) => s.loop.index === reader.step) ?? steps[0],
    checking = steps.find((s) => s.loop.index === inv.loop) ?? steps[0];
  const check = practice.stepChecks[inv.loop] ?? emptyCheck();
  const stale =
    !!inv.sourceFingerprint &&
    inv.sourceFingerprint !== trace.source.fingerprint;
  function setPractice(patch: Partial<PracticeState>) {
    update({ practice: { ...practice, ...patch } });
    setError("");
  }
  function setCheck(patch: Partial<StepCheck>) {
    setPractice({
      stepChecks: {
        ...practice.stepChecks,
        [inv.loop]: { ...check, ...patch },
      },
    });
  }
  function selectStep(index: number) {
    setReader({ step: index });
    setError("");
    if (practice.pane === "inspect" && inv.stage < 2) {
      const changed = index !== inv.loop && !!inv.modelObservationId;
      update({
        ...(changed ? resetDecisions(inv, "切换定位步骤") : {}),
        loop: index,
        phase: 3,
        observationId: undefined,
        ...(changed ? { modelObservationId: undefined } : {}),
        practice: {
          ...practice,
          scope: "step",
          ...(changed
            ? {
                rootSubmitted: false,
                drafts: {},
                draftNotes: {},
                criteriaDraft: undefined,
                criteriaNotes: undefined,
              }
            : {}),
        },
      });
    }
  }
  function refer(ref: Reference) {
    if (!(inv.references ?? []).some((r) => r.path === ref.path))
      update({ references: [...(inv.references ?? []), ref] });
    notify("已添加原文引用");
  }
  function locating() {
    const range =
      practice.scope === "step"
        ? steps.filter((s) => s.loop.index === inv.loop)
        : steps;
    let first = range[0];
    if (inv.method === "keyword") {
      const keyword = inv.keyword.trim().toLowerCase();
      if (!keyword) {
        setError("先输入用于定位的关键词。");
        return;
      }
      first = range.find((s) =>
        s.records.some((o) =>
          recordText({
            name: o.name,
            input: o.input,
            output: o.output,
            status: o.statusMessage,
          })
            .toLowerCase()
            .includes(keyword),
        ),
      )!;
      if (!first) {
        setError("当前范围没有命中，换词或改用顺序核对。");
        return;
      }
    }
    if (inv.method === "status") {
      first = range.find((s) => s.errors.length)!;
      if (!first) {
        setError(
          "当前步骤中没有 ERROR 候选。未记录 ERROR 不代表业务正常，请改用关键词或顺序核对。",
        );
        return;
      }
    }
    if (!first) {
      setError("当前没有主步骤，请先查看原始树并补充映射。");
      return;
    }
    update({
      ...resetDecisions(inv, "重新开始步骤定位"),
      modelObservationId: undefined,
      stage: 1,
      loop: first.loop.index,
      phase: 3,
      observationId: undefined,
      mappingConfirmed: true,
      reviewRequired: false,
      sourceVersion: trace.source.version,
      sourceFingerprint: trace.source.fingerprint,
      practice: { ...practice, pane: "expected" },
    });
    setReader({ step: first.loop.index });
    setError("");
  }
  function nextStep() {
    const index = steps.findIndex((s) => s.loop.index === inv.loop);
    const next = steps[index + 1];
    if (next) {
      update({
        loop: next.loop.index,
        practice: { ...practice, pane: "expected" },
      });
      setReader({ step: next.loop.index });
    } else {
      update({
        ...resetDecisions(inv, "完成步骤核对，尚未发现明确偏差"),
        noIssue: true,
        stage: 4,
      });
      go("/findings/" + inv.id);
    }
  }
  function acceptSource() {
    update({
      ...resetDecisions(inv, "本地导出内容已改变，重新核对"),
      stage: 0,
      mappingConfirmed: false,
      reviewRequired: false,
      modelObservationId: undefined,
      sourceFingerprint: trace.source.fingerprint,
      sourceVersion: trace.source.version,
      practice: { pane: "inspect", scope: "all", stepChecks: {} },
    });
  }
  const options = associatedModels(trace, inv),
    chosen =
      options.find((o) => o.model.id === inv.modelObservationId) ?? options[0];
  function confirm() {
    if (
      !chosen ||
      check.verdict !== "no" ||
      !check.expected.trim() ||
      !check.note.trim()
    ) {
      setError("请先记录本步预期与偏差，再确认候选步骤。");
      return;
    }
    update({
      ...resetDecisions(inv, "确认步骤 " + inv.loop + "，开始优化方向排查"),
      stage: 2,
      mappingConfirmed: true,
      reviewRequired: false,
      modelObservationId: chosen.model.id,
      observationId: chosen.model.id,
      expected: check.expected,
      symptom: check.note,
      practice: {
        ...practice,
        rootSubmitted: false,
        drafts: {},
        draftNotes: {},
        criteriaDraft: undefined,
        criteriaNotes: undefined,
      },
    });
    setError("");
  }
  const actualModel = reading?.model;
  const inputMessages = reading?.messages ?? [],
    lastUser = [...inputMessages].reverse().find((m) => roleOf(m) === "user"),
    lastFeedback = reading?.feedback.at(-1);
  const outMessages = messagesOf(actualModel?.output) ?? [];
  const outMessage =
    outMessages.find((m) => roleOf(m) === "assistant") ??
    (actualModel?.output as Record<string, unknown> | undefined);
  const outputContent = outMessage
    ? contentText(
        outMessage.content ??
          (outMessage.kwargs as Record<string, unknown> | undefined)?.content,
      )
    : "";
  const calls =
    outMessage?.tool_calls ??
    (outMessage?.kwargs as Record<string, unknown> | undefined)?.tool_calls;
  const rawRecord = trace.observations.find((o) => o.id === reader.raw);
  const sessionPath =
    "/cases?" +
    new URLSearchParams(
      trace.sessionId
        ? { session: trace.sessionId, trace: trace.id }
        : { trace: trace.id },
    );
  return (
    <main id="main" tabIndex={-1} className="pt-work">
      <nav className="pt-work-nav" aria-label="实操流程">
        <a href={"#" + sessionPath}>
          <ArrowLeft size={13} />
          会话与Trace
        </a>
        <span>/</span>
        <button
          className={inv.stage < 2 ? "current" : ""}
          onClick={() =>
            update({
              stage: 1,
              practice: {
                ...practice,
                pane: check.verdict === "no" ? "confirm" : "inspect",
              },
            })
          }
        >
          运行拆解与定位
        </button>
        <ChevronRight size={13} />
        <button
          disabled={!inv.modelObservationId}
          className={inv.stage >= 2 ? "current" : ""}
          onClick={() => update({ stage: practice.rootSubmitted ? 3 : 2 })}
        >
          优化方向排查
        </button>
        <span className="pt-save-state">
          {saved === "error" ? "保存失败" : "已保存到本机"}
        </span>
      </nav>
      {stale ? (
        <Notice tone="warning">
          本地导出内容已变化，之前的判断需要重新核对。
          <Button variant="secondary" onClick={acceptSource}>
            保留历史，重新核对
          </Button>
        </Notice>
      ) : inv.stage >= 2 && !inv.reviewRequired ? (
        <PracticeDecision
          trace={trace}
          inv={inv}
          update={update}
          go={go}
          notify={notify}
        />
      ) : (
        <>
          <header className="pt-work-title">
            <div>
              <h1>运行拆解与定位</h1>
              <p>{trace.input || trace.name}</p>
            </div>
            <div>
              <Badge>{steps.length} 个步骤</Badge>
              <Badge>{trace.observations.length} 条记录</Badge>
              <button
                className="pt-text-button"
                onClick={() => setMappingOpen(true)}
              >
                拆解依据
              </button>
            </div>
          </header>
          {inv.reviewRequired && (
            <Notice tone="warning">
              映射已修正，原判断已归档。核对新的步骤后再开始定位。
            </Notice>
          )}
          <div className="pt-trace-workspace">
            <aside className="pt-step-tree">
              <header>
                <strong>运行步骤</strong>
                <Layers size={15} />
              </header>
              <div className="pt-tabs">
                <button
                  className={mode === "steps" ? "selected" : ""}
                  onClick={() => setMode("steps")}
                >
                  步骤
                </button>
                <button
                  className={mode === "raw" ? "selected" : ""}
                  onClick={() => setMode("raw")}
                >
                  原始记录
                </button>
              </div>
              <div className="pt-tree-scroll">
                {mode === "raw" ? (
                  <RunTimeline
                    key="raw"
                    defaultMode="raw"
                    trace={trace}
                    inv={{ ...inv, observationId: reader.raw }}
                    update={update}
                    onPick={(id) =>
                      setReader({
                        ...reader,
                        raw: id,
                        boundary: undefined,
                        phase: undefined,
                      })
                    }
                  />
                ) : (
                  <>
                    <button
                      className={`pt-trace-root ${reader.boundary ? "selected" : ""}`}
                      onClick={() =>
                        setReader({ step: reader.step, boundary: "input" })
                      }
                    >
                      <GitBranch size={15} />
                      <span>
                        <strong>Trace · {trace.name}</strong>
                        <small>{steps.length} 个步骤</small>
                      </span>
                    </button>
                    {steps.map((step) => (
                      <div className="pt-step-entry" key={step.loop.id}>
                        <button
                          className={`pt-step-select ${reading?.loop.index === step.loop.index && !reader.raw && !reader.boundary ? "selected" : ""}`}
                          onClick={() => selectStep(step.loop.index)}
                          aria-current={
                            reading?.loop.index === step.loop.index
                              ? "step"
                              : undefined
                          }
                        >
                          <span className="pt-step-number">
                            {step.loop.index}
                          </span>
                          <span>
                            <strong>步骤 {step.loop.index}</strong>
                            <small>
                              {step.actions.length
                                ? "执行动作并接收反馈"
                                : "根据输入组织回复"}
                            </small>
                          </span>
                          {practice.stepChecks[step.loop.index]?.verdict ===
                          "yes" ? (
                            <Check size={14} />
                          ) : practice.stepChecks[step.loop.index]?.verdict ===
                            "no" ? (
                            <AlertTriangle size={14} />
                          ) : null}
                        </button>
                        {expanded.includes(step.loop.index) && (
                          <div className="pt-phase-list">
                            {([2, 3, 4, 5] as PhaseNumber[]).map((phase) => (
                              <button
                                key={phase}
                                className={
                                  reader.step === step.loop.index &&
                                  reader.phase === phase
                                    ? "selected"
                                    : ""
                                }
                                onClick={() =>
                                  setReader({ step: step.loop.index, phase })
                                }
                              >
                                {phaseNames[phase]}
                                <small>
                                  {step.loop.phaseRecords[phase]?.length ?? 0}{" "}
                                  条记录
                                </small>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <details className="pt-boundaries">
                      <summary>请求准备 / 输出交付</summary>
                      <button
                        onClick={() =>
                          setReader({ step: 1, boundary: "input" })
                        }
                      >
                        请求准备 · {map.requestIds.length} 条记录
                      </button>
                      <button
                        onClick={() =>
                          setReader({ step: steps.length, boundary: "output" })
                        }
                      >
                        输出交付 · {map.deliveryIds.length} 条记录
                      </button>
                    </details>
                  </>
                )}
              </div>
              <footer>原始父子关系与输入输出完整保留</footer>
            </aside>
            <section className="pt-step-inspector">
              {practice.pane === "confirm" ? (
                <section className="pt-confirmation">
                  <Badge tone="amber">候选步骤 · 待确认</Badge>
                  <h2>定位到：步骤 {inv.loop}</h2>
                  <p>对照实际输入、产出与预期，记录到以下偏差。</p>
                  <div className="pt-confirmation-grid">
                    <div>
                      <h3>本步预期</h3>
                      <p>{check.expected}</p>
                      <h3>记录的偏差</h3>
                      <p>{check.note}</p>
                      <Button
                        variant="ghost"
                        onClick={() => setPractice({ pane: "judge" })}
                      >
                        回看本步输入与输出
                      </Button>
                    </div>
                    <div>
                      <h3>进入优化方向排查</h3>
                      <p>
                        定位到步骤为止；接下来检查关联模型输入，沿决策路线查找候选优化对象。
                      </p>
                      <label className="pt-field">
                        核对的模型调用
                        <select
                          aria-label="选择待核对模型调用"
                          value={chosen?.model.id ?? ""}
                          onChange={(e) =>
                            update({ modelObservationId: e.target.value })
                          }
                        >
                          {options.map((option) => (
                            <option
                              key={option.model.id}
                              value={option.model.id}
                            >
                              步骤 {option.step} ·{" "}
                              {option.own
                                ? "本步调用"
                                : "接收本步动作反馈的后续调用"}{" "}
                              · {option.model.id}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!chosen && (
                        <Notice tone="warning">
                          没有可关联的模型调用，请回查映射后继续。
                        </Notice>
                      )}
                    </div>
                  </div>
                  {error && (
                    <p role="alert" className="pt-inline-error">
                      {error}
                    </p>
                  )}
                  <footer>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        update({
                          stage: 1,
                          practice: { ...practice, pane: "inspect" },
                        });
                        setReader({ step: inv.loop });
                      }}
                    >
                      调整定位步骤
                    </Button>
                    <Button
                      disabled={!chosen || check.verdict !== "no"}
                      onClick={confirm}
                    >
                      确认步骤，进入方向排查
                      <ArrowRight size={14} />
                    </Button>
                  </footer>
                </section>
              ) : (
                <>
                  <section className="pt-step-reader">
                    <header>
                      <div>
                        <h2>
                          {reader.raw
                            ? rawRecord?.name
                            : reader.boundary
                              ? reader.boundary === "input"
                                ? "Trace · 请求准备"
                                : "Trace · 输出交付"
                              : `步骤 ${reading?.loop.index ?? "—"} · 输入与输出`}
                        </h2>
                        <span>
                          {reader.raw
                            ? rawRecord?.id
                            : reader.boundary
                              ? "主循环之外的准备与交付记录"
                              : (actualModel?.model ?? "实际记录")}
                        </span>
                      </div>
                      <div>
                        {practice.pane !== "inspect" &&
                          reading?.loop.index !== inv.loop && (
                            <button
                              className="pt-text-button"
                              onClick={() => setReader({ step: inv.loop })}
                            >
                              返回正在核对的步骤 {inv.loop}
                            </button>
                          )}
                        {reading && !reader.raw && !reader.boundary && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setExpanded(
                                expanded.includes(reading.loop.index)
                                  ? expanded.filter(
                                      (i) => i !== reading.loop.index,
                                    )
                                  : [...expanded, reading.loop.index],
                              );
                              setReader({ step: reading.loop.index });
                            }}
                          >
                            {expanded.includes(reading.loop.index)
                              ? "收起内部拆解"
                              : "查看内部拆解"}
                          </Button>
                        )}
                      </div>
                    </header>
                    <div
                      className="pt-record-scroll"
                      key={
                        (reader.raw ?? reader.boundary ?? reader.step) +
                        ":" +
                        (reader.phase ?? "")
                      }
                    >
                      {reader.raw ? (
                        <>
                          <RecordReader
                            key={reader.raw}
                            record={rawRecord}
                            traceId={trace.id}
                            onReference={refer}
                            notify={notify}
                          />
                          <MappingEditor
                            trace={trace}
                            inv={inv}
                            recordId={reader.raw}
                            update={(patch) => {
                              update({
                                ...patch,
                                stage: 0,
                                practice: {
                                  pane: "inspect",
                                  scope: "all",
                                  stepChecks: {},
                                },
                              });
                              setError("");
                            }}
                          />
                        </>
                      ) : reader.boundary ? (
                        <>
                          <RecordReader
                            boundary={{
                              field: reader.boundary,
                              value:
                                reader.boundary === "input"
                                  ? trace.rawInput
                                  : trace.rawOutput,
                            }}
                            traceId={trace.id}
                            onReference={refer}
                            notify={notify}
                          />
                          {(reader.boundary === "input"
                            ? map.requestIds
                            : map.deliveryIds
                          ).map((id) => {
                            const o = trace.observations.find(
                              (o) => o.id === id,
                            );
                            return (
                              <details className="pt-internal-record" key={id}>
                                <summary>
                                  {o?.name} · {id}
                                </summary>
                                <RecordReader
                                  record={o}
                                  traceId={trace.id}
                                  onReference={refer}
                                  notify={notify}
                                />
                              </details>
                            );
                          })}
                        </>
                      ) : reading ? (
                        <>
                          <div className="pt-step-io">
                            <section>
                              <header>
                                <h3>本步输入</h3>
                                <span>调用前实际收到的信息</span>
                              </header>
                              {lastUser ? (
                                <TextBlock
                                  title="用户任务"
                                  role="user"
                                  value={contentText(
                                    lastUser.content ??
                                      (
                                        lastUser.kwargs as
                                          | Record<string, unknown>
                                          | undefined
                                      )?.content,
                                  )}
                                />
                              ) : (
                                <p>未提取到用户任务，请查看完整输入。</p>
                              )}
                              {lastFeedback && (
                                <TextBlock
                                  title="前序动作反馈"
                                  role="tool"
                                  value={contentText(
                                    lastFeedback.content ??
                                      (
                                        lastFeedback.kwargs as
                                          | Record<string, unknown>
                                          | undefined
                                      )?.content,
                                  )}
                                />
                              )}
                              <details className="pt-full-input">
                                <summary>
                                  查看完整模型输入 · {inputMessages.length}{" "}
                                  条消息
                                </summary>
                                {reading.models.length > 1 && (
                                  <p>
                                    本步有 {reading.models.length}{" "}
                                    次模型调用，以下逐条保留。
                                  </p>
                                )}
                                {reading.models.length ? (
                                  reading.models.map((model) => (
                                    <RecordReader
                                      key={model.id}
                                      record={model}
                                      traceId={trace.id}
                                      onReference={refer}
                                      notify={notify}
                                    />
                                  ))
                                ) : (
                                  <Notice tone="warning">
                                    没有关联模型调用，原始记录仍可从左侧查看。
                                  </Notice>
                                )}
                              </details>
                            </section>
                            <section>
                              <header>
                                <h3>本步输出</h3>
                                <span>模型产出与本步动作结果</span>
                              </header>
                              <TextBlock
                                key={actualModel?.id}
                                title="模型输出"
                                role="assistant"
                                value={
                                  outputContent ||
                                  (!calls
                                    ? "未记录文本输出，请回查完整记录。"
                                    : "")
                                }
                              />
                              {calls != null && (
                                <TextBlock
                                  title="动作请求 · tool_calls"
                                  value={calls}
                                />
                              )}{" "}
                              {reading.actions.map((action) => (
                                <TextBlock
                                  key={action.id}
                                  title={"动作结果 · " + action.name}
                                  role="tool"
                                  value={action.output}
                                />
                              ))}
                              {!reading.actions.length && (
                                <p className="pt-muted">
                                  {calls
                                    ? "没有独立记录的动作结果，请回查原始记录。"
                                    : "本步没有独立记录的工具调用。"}
                                </p>
                              )}
                            </section>
                          </div>
                          {reader.phase && (
                            <section className="pt-internals">
                              <header>
                                <h3>内部拆解 · {phaseNames[reader.phase]}</h3>
                                <button
                                  className="pt-text-button"
                                  onClick={() =>
                                    setReader({ step: reader.step })
                                  }
                                >
                                  返回步骤概览
                                </button>
                              </header>
                              {(reading.loop.phaseRecords[reader.phase] ?? [])
                                .length ? (
                                (
                                  reading.loop.phaseRecords[reader.phase] ?? []
                                ).map((id) => (
                                  <details
                                    className="pt-internal-record"
                                    key={id}
                                  >
                                    <summary>
                                      {
                                        trace.observations.find(
                                          (o) => o.id === id,
                                        )?.name
                                      }{" "}
                                      · {id}
                                    </summary>
                                    <RecordReader
                                      record={trace.observations.find(
                                        (o) => o.id === id,
                                      )}
                                      traceId={trace.id}
                                      onReference={refer}
                                      notify={notify}
                                    />
                                  </details>
                                ))
                              ) : (
                                <p>此环节未独立记录，可通过关联原文回查。</p>
                              )}
                            </section>
                          )}
                        </>
                      ) : (
                        <Empty title="未识别到主步骤">
                          切换原始记录，检查并补充教学映射。
                        </Empty>
                      )}
                    </div>
                  </section>
                  <section className="pt-task-dock">
                    {practice.pane === "inspect" ? (
                      <>
                        <header>
                          <h2>定位异常步骤</h2>
                          <span>
                            {practice.scope === "step"
                              ? "仅核对步骤 " + inv.loop
                              : "在所有步骤中查找"}{" "}
                            {practice.scope === "step" && (
                              <button
                                className="pt-text-button"
                                onClick={() => setPractice({ scope: "all" })}
                              >
                                改为全部步骤
                              </button>
                            )}
                          </span>
                        </header>
                        <div
                          className="pt-methods"
                          role="radiogroup"
                          aria-label="定位入口"
                        >
                          {[
                            ["keyword", "关键词定位"],
                            ["status", "ERROR 状态"],
                            ["compare", "顺序核对"],
                          ].map(([value, title]) => (
                            <label
                              className={inv.method === value ? "selected" : ""}
                              key={value}
                            >
                              <input
                                type="radio"
                                name="locate-method"
                                checked={inv.method === value}
                                onChange={() =>
                                  update({
                                    method: value as Investigation["method"],
                                  })
                                }
                              />
                              {title}
                            </label>
                          ))}
                        </div>
                        <div className="pt-dock-action">
                          {inv.method === "keyword" ? (
                            <label className="pt-keyword">
                              <Search size={15} />
                              <input
                                aria-label="定位关键词"
                                value={inv.keyword}
                                onChange={(e) =>
                                  update({ keyword: e.target.value })
                                }
                                placeholder="输入请求、工具或结果中的关键词"
                              />
                            </label>
                          ) : (
                            <p>
                              {inv.method === "status"
                                ? "从实际ERROR记录提取候选，不自动判定根因。"
                                : "逐步比较实际输入、产出与期望。"}
                            </p>
                          )}
                          <Button onClick={locating}>
                            确认拆解并开始核对
                            <ArrowRight size={14} />
                          </Button>
                        </div>
                      </>
                    ) : practice.pane === "expected" ? (
                      <>
                        <header>
                          <h2>步骤 {inv.loop} · 确认本步预期</h2>
                          <span>先写清应得到的结果，再比较实际产出。</span>
                        </header>
                        <label className="pt-field">
                          本步预期
                          <textarea
                            aria-label="本步预期"
                            value={check.expected}
                            onChange={(e) =>
                              setCheck({ expected: e.target.value })
                            }
                            placeholder="本步应得到什么信息、采取什么动作或返回什么结果？"
                          />
                        </label>
                        <div className="pt-dock-action">
                          <Button
                            variant="ghost"
                            onClick={() => setPractice({ pane: "inspect" })}
                          >
                            调整范围
                          </Button>
                          <Button
                            onClick={() => {
                              if (!check.expected.trim()) {
                                setError("请先填写本步应产生的结果。");
                                return;
                              }
                              setPractice({ pane: "judge" });
                            }}
                          >
                            开始判断本步
                            <ArrowRight size={14} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <header>
                          <h2>步骤 {inv.loop} · 输入与输出符合预期吗？</h2>
                          <span>
                            正在核对 {checking?.model?.id ?? "本步记录"}
                          </span>
                        </header>
                        <p className="pt-expectation">
                          预期：{check.expected}
                          <button
                            className="pt-text-button"
                            onClick={() => setPractice({ pane: "expected" })}
                          >
                            修改
                          </button>
                        </p>
                        <VerdictOptions
                          label="步骤判断"
                          labels={["符合预期", "存在偏差", "资料不足"]}
                          value={check.verdict}
                          onChange={(value) => setCheck({ verdict: value })}
                        />
                        {check.verdict === "no" && (
                          <label className="pt-field">
                            记录偏差
                            <textarea
                              aria-label="记录偏差"
                              value={check.note}
                              onChange={(e) =>
                                setCheck({ note: e.target.value })
                              }
                              placeholder="实际产出与预期有哪些差异？"
                            />
                          </label>
                        )}
                        {check.verdict === "unknown" && (
                          <label className="pt-field">
                            待补充的信息
                            <textarea
                              aria-label="待补充的信息"
                              value={check.missing}
                              onChange={(e) =>
                                setCheck({ missing: e.target.value })
                              }
                              placeholder="还缺什么记录或用户信息？"
                            />
                          </label>
                        )}
                        <div className="pt-dock-action">
                          <Button
                            variant="ghost"
                            onClick={() => setPractice({ pane: "inspect" })}
                          >
                            调整定位范围
                          </Button>
                          {check.verdict === "no" ? (
                            <Button
                              disabled={!check.note.trim()}
                              onClick={() => {
                                update({
                                  expected: check.expected,
                                  symptom: check.note,
                                  practice: { ...practice, pane: "confirm" },
                                });
                                setReader({ step: inv.loop });
                              }}
                            >
                              定位到步骤 {inv.loop}
                              <ArrowRight size={14} />
                            </Button>
                          ) : check.verdict === "yes" ? (
                            <Button onClick={nextStep}>
                              {steps.at(-1)?.loop.index === inv.loop
                                ? "核对完成，保存记录"
                                : "核对下一步骤"}
                              <ArrowRight size={14} />
                            </Button>
                          ) : check.verdict === "unknown" ? (
                            <Button
                              disabled={!check.missing.trim()}
                              variant="secondary"
                              onClick={() => {
                                update({
                                  pending: check.missing,
                                  expected: check.expected,
                                  stage: 4,
                                });
                                go("/findings/" + inv.id);
                              }}
                            >
                              保存待补，稍后继续
                            </Button>
                          ) : (
                            <span>选择判断后继续</span>
                          )}
                        </div>
                      </>
                    )}
                    {error && (
                      <p role="alert" className="pt-inline-error">
                        {error}
                      </p>
                    )}
                  </section>
                </>
              )}
            </section>
          </div>
        </>
      )}
      <PracticeDrawer
        title="Trace 拆解依据"
        description="本站生成的阅读映射，需要人工核对。不会改写原始数据。"
        open={mappingOpen}
        onClose={() => setMappingOpen(false)}
      >
        <h3>Trace → 主循环步骤 → 内部环节</h3>
        <p>
          每个步骤以实际 model
          节点及其子记录为边界。上下文组装、模型调用、动作执行与状态更新可在循环中重复；请求准备和输出交付位于循环之外。
        </p>
        {trace.mapping.warnings.map((w) => (
          <p key={w}>{w}</p>
        ))}
        <p>来源：{trace.sources.join("、")}</p>
        <code className="pt-ref">{trace.source.fingerprint}</code>
        <p>
          若归属有误，可在原始记录中修正教学映射，已有判断会进入待复核状态。
        </p>
        <p>当前仅使用本地只读导出，非实时 Langfuse 查询。</p>
      </PracticeDrawer>
    </main>
  );
}
