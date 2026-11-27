import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Search,
  SlidersHorizontal,
  GitBranch,
  Info,
  RefreshCw,
} from "lucide-react";
import type { Investigation } from "../../domain/data";
import {
  localTime,
  request,
  useTrace,
  type SessionPage,
  type SessionDetail,
} from "../../api/realData";
import { Badge, Button, Empty, Notice } from "../../components/ui";
type Props = {
  params: URLSearchParams;
  investigations: Investigation[];
  onStart: (
    id: string,
    contrast: string[],
    symptom: string,
    expected: string,
  ) => void;
  onResume: (id: string) => void;
  go: (path: string) => void;
};
export function Cases({ params, onStart, go }: Props) {
  const sessionId = params.get("session") ?? "",
    traceId = params.get("trace") ?? "",
    q = params.get("q") ?? "",
    group = params.get("group") ?? "sessions",
    caseId = params.get("case") ?? "";
  const [query, setQuery] = useState(q),
    [mode, setMode] = useState(params.get("mode") ?? "auto"),
    [filters, setFilters] = useState(false),
    [from, setFrom] = useState(params.get("from") ?? ""),
    [to, setTo] = useState(params.get("to") ?? ""),
    [status, setStatus] = useState(params.get("status") ?? "");
  const [data, setData] = useState<SessionPage>(),
    [session, setSession] = useState<SessionDetail>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);
  const searchKey = params.toString();
  useEffect(() => {
    setQuery(q);
    setMode(params.get("mode") ?? "auto");
    setFrom(params.get("from") ?? "");
    setTo(params.get("to") ?? "");
    setStatus(params.get("status") ?? "");
  }, [q, searchKey]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSession(undefined);
    const queryParams = new URLSearchParams(searchKey);
    if (!queryParams.has("group")) queryParams.set("group", "sessions");
    request<SessionPage | SessionDetail>(
      sessionId
        ? "sessions/" + encodeURIComponent(sessionId)
        : "sessions?" + queryParams,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if ("traces" in result) setSession(result);
        else setData(result);
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [searchKey, sessionId, attempt]);
  const selected = session
    ? (session.traces.find((t) => t.id === traceId)?.id ??
      session.traces[0]?.id ??
      "")
    : !sessionId
      ? traceId
      : "";
  const { trace, error: traceError, retry } = useTrace(selected),
    ready = trace?.id === selected && !traceError;
  function change(patch: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    go("/cases?" + next);
  }
  function search() {
    change({
      q: query.trim(),
      mode,
      from,
      to,
      status,
      page: "1",
      session: "",
      trace: "",
    });
  }
  function openRow(row: SessionPage["items"][number]) {
    change({
      session: row.sessionId ?? "",
      trace: row.matched[0]?.id ?? row.id,
    });
  }
  const viewing = !!sessionId || !!traceId;
  return (
    <main id="main" tabIndex={-1} className="pt-cases">
      {viewing ? (
        <>
          <header className="pt-breadcrumb">
            <Button
              variant="ghost"
              onClick={() => change({ session: "", trace: "" })}
            >
              <ArrowLeft size={14} />
              返回会话
            </Button>
            <span>/</span>
            <span>
              {sessionId
                ? "Session " + sessionId.slice(0, 18) + "…"
                : "未关联Session的运行"}
            </span>
          </header>
          <div className="pt-title">
            <h1>选择这次会话中的 Trace</h1>
            <p>
              {session
                ? `${session.traces.length} 条运行，按发生顺序查看。关联轮次保留用于后续核对。`
                : "选择一次运行，核对请求与回复后开始拆解。"}
            </p>
          </div>
          {error ? (
            <Notice tone="warning">
              {error}
              <Button
                variant="secondary"
                onClick={() => setAttempt((n) => n + 1)}
              >
                重试
              </Button>
            </Notice>
          ) : loading && sessionId ? (
            <div className="pt-loading" role="status">
              正在读取会话…
            </div>
          ) : (
            <div className="pt-session-detail">
              <section className="pt-turns">
                <header>
                  <strong>会话中的运行</strong>
                  <span>{session?.traces.length ?? 1} 条Trace</span>
                </header>
                <div>
                  {(session?.traces ?? (trace ? [trace] : [])).map((row, i) => (
                    <button
                      key={row.id}
                      className={`pt-turn ${selected === row.id ? "selected" : ""}`}
                      onClick={() => change({ trace: row.id })}
                    >
                      <span>{i + 1}</span>
                      <div>
                        <strong>{row.input || row.name}</strong>
                        <p>
                          {row.output.slice(0, 130) ||
                            "未提取到回复，请核对原始输出。"}
                        </p>
                        <small>
                          {localTime(row.startTime, true)}
                          <span>{row.observationCount} 条记录</span>
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
              <section className="pt-trace-preview">
                {traceError ? (
                  <Empty title="无法读取Trace">
                    {traceError}
                    <Button onClick={retry}>重新读取</Button>
                  </Empty>
                ) : !ready ? (
                  <div className="pt-loading" role="status">
                    正在读取所选Trace…
                  </div>
                ) : (
                  <>
                    <header>
                      <div>
                        <Badge>
                          {session
                            ? "Trace " +
                              (session.traces.findIndex(
                                (t) => t.id === selected,
                              ) +
                                1) +
                              " / " +
                              session.traces.length
                            : "独立Trace"}
                        </Badge>
                        <Badge tone={trace.errorCount ? "red" : "neutral"}>
                          {trace.errorCount
                            ? trace.errorCount + " 条ERROR"
                            : "未记录 ERROR"}
                        </Badge>
                      </div>
                      <h2>{trace.input || trace.name}</h2>
                      <code>{trace.id}</code>
                      <p>
                        {trace.name}
                        <span>
                          {trace.duration == null
                            ? "耗时未记录"
                            : trace.duration.toFixed(3) + " s"}
                        </span>
                        <span>{trace.observations.length} 条原始记录</span>
                      </p>
                    </header>
                    <div className="pt-preview-body">
                      <h3>用户请求</h3>
                      <p>{trace.input || "未提取到文本，原始输入仍然保留。"}</p>
                      <h3>最终回复 · 摘要</h3>
                      <p>
                        {trace.output ||
                          "没有可提取的最终回复，请核对原始输出与动作。"}
                      </p>
                      {trace.outputSummaryTruncated && (
                        <small>摘要已折叠，进入后可阅读完整原文。</small>
                      )}
                      <details>
                        <summary>来源与查询范围</summary>
                        <p>
                          本地导出，非实时查询。
                          {trace.source.origins.map((o) => o.file).join("、")}
                          。保留原始ID、父子关系与输入输出。
                        </p>
                      </details>
                    </div>
                    <footer>
                      <span>其他轮次仍可作为对照。</span>
                      <Button onClick={() => onStart(trace.id, [], "", "")}>
                        <GitBranch size={15} />
                        拆解这条 Trace
                      </Button>
                    </footer>
                  </>
                )}
              </section>
            </div>
          )}
        </>
      ) : (
        <>
          <header className="pt-title">
            <h1>调优定位实操—langfuse</h1>
            <p>先找到会话，再选择其中一次运行进行定位。</p>
          </header>
          <form
            className="pt-query"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <label className="sr-only" htmlFor="pt-query-input">
              查找会话或运行
            </label>
            <Search size={17} />
            <select
              aria-label="查询方式"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="auto">ID / 关键词</option>
              <option value="session">完整Session / Trace ID</option>
              <option value="keyword">关键词</option>
            </select>
            <input
              id="pt-query-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Session ID、Trace ID，或请求、回复与工具关键词"
            />
            <Button variant="secondary" type="submit" disabled={loading}>
              查询
            </Button>
            <button
              type="button"
              className="pt-filter-button"
              aria-expanded={filters}
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={15} />
              筛选
            </button>
          </form>
          {filters && (
            <div className="pt-filters">
              <label>
                起始日期
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                结束日期
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <label>
                执行状态
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">全部</option>
                  <option value="error">包含ERROR</option>
                </select>
              </label>
              <span>条件将在查询后应用。</span>
            </div>
          )}
          <div className="pt-list-tabs">
            <button
              className={group === "sessions" && !caseId ? "selected" : ""}
              onClick={() => change({ group: "sessions", case: "", page: "1" })}
            >
              会话 {data?.manifest.sessionCount ?? ""}
            </button>
            {data?.cases.map((c) => (
              <button
                key={c.id}
                className={caseId === c.id ? "selected" : ""}
                onClick={() =>
                  change({ case: c.id, group: "sessions", page: "1" })
                }
              >
                {c.id.includes("selection") ? "选中状态案例" : "工具参数案例"}
              </button>
            ))}
            <button
              className={group === "unassigned" ? "selected" : ""}
              onClick={() =>
                change({ group: "unassigned", case: "", page: "1" })
              }
            >
              未关联Session {data?.manifest.tracesWithoutSession ?? ""}
            </button>
            <span>
              {data?.manifest.traceCount ?? "—"} 条Trace · 当前导出范围
            </span>
          </div>
          {error ? (
            <Notice tone="warning">
              {error}
              <Button
                variant="secondary"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RefreshCw size={14} />
                重试
              </Button>
            </Notice>
          ) : loading ? (
            <div className="pt-loading" role="status">
              正在查找会话…
            </div>
          ) : data?.items.length ? (
            <section className="pt-session-list">
              <div className="pt-session-columns">
                <span>会话 / 请求摘要</span>
                <span>Trace数</span>
                <span>最近发生</span>
                <span />
              </div>
              {data.items.map((row) => (
                <button
                  className="pt-session-row"
                  key={row.id}
                  onClick={() => openRow(row)}
                >
                  <div>
                    <Database size={17} />
                    <span>
                      <strong>
                        {(q || caseId ? row.matched[0]?.input : row.input) ||
                          row.input ||
                          "没有可提取的请求"}
                      </strong>
                      <small>
                        <code>
                          {row.sessionId ?? "未记录Session · " + row.id}
                        </code>
                        {q && (
                          <span>
                            {row.matched.length} 条命中 · 保留完整会话
                          </span>
                        )}
                      </small>
                      {row.matched[0]?.match && (
                        <p className="pt-match">
                          {row.matched[0].match.field}：
                          {row.matched[0].match.snippet}
                        </p>
                      )}
                    </span>
                  </div>
                  <span>{row.traceCount} 条</span>
                  <span>{localTime(row.latest, true)}</span>
                  <span>
                    查看{row.sessionId ? "会话" : "运行"}
                    <ArrowRight size={13} />
                  </span>
                </button>
              ))}
            </section>
          ) : (
            <Empty title="没有找到匹配的会话或运行">
              核对ID、关键词或日期范围，或者清除筛选后重试。
            </Empty>
          )}
          <footer className="pt-pagination">
            <span>
              {data?.total ?? 0} 组结果 · 第 {data?.page ?? 1} /{" "}
              {data?.pages ?? 1} 页
            </span>
            <div>
              <Button
                variant="ghost"
                aria-label="上一页"
                disabled={loading || !data || data.page <= 1}
                onClick={() => change({ page: String((data?.page ?? 1) - 1) })}
              >
                <ArrowLeft size={14} />
              </Button>
              <Button
                variant="ghost"
                aria-label="下一页"
                disabled={loading || !data || data.page >= data.pages}
                onClick={() => change({ page: String((data?.page ?? 1) + 1) })}
              >
                <ArrowRight size={14} />
              </Button>
            </div>
          </footer>
          <p className="pt-coverage">
            <Info size={14} />
            检索覆盖当前导出的Trace与Observation名称、输入输出和状态信息。没有Session的运行独立保留；未记录ERROR不代表业务正常。
          </p>
        </>
      )}
    </main>
  );
}
