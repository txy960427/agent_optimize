import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Check,
  FileSearch,
  GitBranch,
  Layers3,
  Pause,
  Play,
  Route,
  ScanSearch,
} from "lucide-react";
import {
  usePlaybackVisibility,
  useReducedMotionPreference,
} from "../../components/usePlaybackVisibility";
import {
  guideHeroDescription,
  guideHeroTitle,
} from "../../domain/guidePositioning";
import { GuideAims, GuideCatalog, jumpToChapters } from "./GuideHomeSections";
import { HeroConcepts } from "./HeroConcepts";

type TopicId = "outline" | "harness" | "model" | "case" | "evaluation";
const topics: Record<
  TopicId,
  {
    title: string;
    description: string;
    action: string;
    href?: string;
    chapter?: string;
  }
> = {
  outline: {
    title: "定位与归因",
    description: "从运行记录找到异常步骤，再判断应该改什么。",
    action: "阅读调优总纲",
    href: "/guide",
  },
  harness: {
    title: "Harness 工程方法",
    description: "围绕上下文、记忆、工具与 Skill，查找适用的工程方法。",
    action: "查看章节规划",
    chapter: "harness",
  },
  model: {
    title: "模型能力与调优",
    description: "先明确能力缺口，再选择训练、适配与压缩方法。",
    action: "阅读模型基础",
    href: "/learn/model",
  },
  case: {
    title: "内部案例与实操",
    description: "沿着实际运行记录，核对现象、判断依据与候选改进方向。",
    action: "打开案例实操",
    href: "/cases",
  },
  evaluation: {
    title: "测评与经验复用",
    description: "以同条件对照和回归验证改进，沉淀样本、判据与失败模式。",
    action: "查看章节规划",
    chapter: "evaluation",
  },
};
const connections = [
  {
    id: "outline-harness",
    from: "outline",
    to: "harness",
    path: "M330 135V151Q330 166 314 166H170Q155 166 155 182V198",
  },
  {
    id: "outline-model",
    from: "outline",
    to: "model",
    path: "M330 135V151Q330 166 346 166H480Q495 166 495 182V198",
  },
  {
    id: "harness-case",
    from: "harness",
    to: "case",
    path: "M155 324V350Q155 366 173 366H184V386",
  },
  {
    id: "model-case",
    from: "model",
    to: "case",
    path: "M495 324V341Q495 357 477 357H215Q200 357 200 373V386",
  },
  {
    id: "case-evaluation",
    from: "case",
    to: "evaluation",
    path: "M314 439H357",
  },
  {
    id: "evaluation-outline",
    from: "evaluation",
    to: "outline",
    path: "M606 439H622Q640 439 640 421V89Q640 71 622 71H453",
  },
];
const compactPaths = [
  "M180 122V132Q180 145 167 145H100Q87 145 87 158V177",
  "M180 122V132Q180 145 193 145H257Q270 145 270 158V177",
  "M87 322V380",
  "M270 322V336Q270 350 256 350H128Q114 350 114 364V380",
  "M174 440H190",
  "M350 440Q358 440 358 427V83Q358 70 345 70H290",
];
function openChapter(chapter: string) {
  const row = document.querySelector<HTMLElement>(
    `#chapters [data-chapter="${chapter}"]`,
  );
  row?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
    block: "center",
  });
  if (row) {
    row.tabIndex = -1;
    row.focus({ preventScroll: true });
  }
}

export function HomeAtlas({
  go,
  concept,
  compare,
}: {
  go: (path: string) => void;
  concept?: string;
  compare?: boolean;
}) {
  return (
    <main id="main" tabIndex={-1} className="guide-home home-revision home-v3">
      <section className="atlas-hero" aria-label="指南介绍与内容导览">
        <div className="atlas-message">
          <h1>
            {guideHeroTitle[0]}
            <br />
            {guideHeroTitle[1]}
          </h1>
          <p>{guideHeroDescription}</p>
          <div className="atlas-actions">
            <a className="atlas-primary" href="/#/preface">
              <BookOpen size={18} />
              从前言开始
              <ArrowRight size={17} />
            </a>
            <a className="atlas-secondary" href="#/cases">
              <ScanSearch size={18} />
              开始排查
            </a>
          </div>
          <button className="atlas-catalog-jump" onClick={jumpToChapters}>
            浏览全书目录
            <ArrowDown size={15} />
          </button>
        </div>
        {concept === "original" ? (
          <GuideAtlas go={go} />
        ) : (
          <HeroConcepts
            key={concept ?? "map"}
            concept={concept}
            compare={compare}
            go={go}
          />
        )}
      </section>
      <GuideAims />
      <section className="atlas-samples" aria-labelledby="atlas-samples-title">
        <header>
          <h2 id="atlas-samples-title">读懂方法，也能沿着记录动手。</h2>
          <p>把判断依据写清楚，把每一次改进放回实际任务中核对。</p>
        </header>
        <div className="atlas-sample-spread">
          <article className="atlas-method-sample">
            <div className="atlas-sample-heading">
              <FileSearch size={19} />
              <h3>模型回答有偏差，先看它收到了什么。</h3>
            </div>
            <p>齐全、精准、一致，是核对实际模型输入的三个标准。</p>
            <dl>
              {[
                ["齐全", "任务、约束、历史和反馈是否进入输入"],
                ["精准", "内容是否正确、相关并保留必要细节"],
                ["一致", "事实、规则和状态是否相互衔接"],
              ].map(([name, description]) => (
                <div key={name}>
                  <dt>
                    <Check size={13} />
                    {name}
                  </dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
            <a href="#/learn/context">
              查看输入核对方法
              <ArrowUpRight size={15} />
            </a>
          </article>
          <article className="atlas-case-sample">
            <div className="atlas-sample-heading">
              <Route size={19} />
              <h3>用户已选中，工具为何说没有？</h3>
            </div>
            <p>选中状态案例 · 本地 Langfuse 实际导出</p>
            <div className="atlas-case-sequence">
              <div>
                <span />
                <strong>业务现象</strong>
                <p>用户反馈与工具返回的工作区状态存在冲突。</p>
              </div>
              <div>
                <span />
                <strong>检查运行</strong>
                <p>选定 Trace，拆成步骤，核对实际输入与动作结果。</p>
              </div>
              <div>
                <span />
                <strong>形成待验证方向</strong>
                <p>沿决策路径检查，记录依据与下一步验证计划。</p>
              </div>
            </div>
            <a href="#/cases?case=anomaly-1-selection-state-mismatch">
              打开这个案例
              <ArrowUpRight size={15} />
            </a>
          </article>
        </div>
      </section>
      <GuideCatalog />
      <footer className="atlas-page-end">
        <BookOpen size={17} />
        <p>
          智能体调优技术指南<span>归因有依据，改进有方法，结果可验证。</span>
        </p>
        <a href="#/preface">
          从前言开始
          <ArrowRight size={14} />
        </a>
      </footer>
    </main>
  );
}

function GuideAtlas({ go }: { go: (path: string) => void }) {
  const surface = useRef<HTMLDivElement>(null),
    drawing = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotionPreference(),
    visible = usePlaybackVisibility(surface);
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 600px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 600px)");
    const changed = () => setCompact(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  const [selected, setSelected] = useState<TopicId>("outline"),
    [preview, setPreview] = useState<TopicId | null>(null),
    [paused, setPaused] = useState(false),
    [pinned, setPinned] = useState(false);
  const active = preview ?? selected,
    playing = visible && !reduced && !paused && !preview && !pinned,
    topic = topics[active];
  useEffect(() => {
    if (playing) drawing.current?.unpauseAnimations();
    else drawing.current?.pauseAnimations();
  }, [playing]);
  function props(id: TopicId) {
    return {
      type: "button" as const,
      "aria-pressed": active === id,
      "aria-label": "了解" + topics[id].title,
      onPointerEnter: () => setPreview(id),
      onPointerLeave: () => setPreview(null),
      onFocus: () => setPreview(id),
      onBlur: () => setPreview(null),
      onClick: () => {
        setSelected(id);
        setPinned(true);
      },
      className: `atlas-topic atlas-topic-${id} ${active === id ? "is-active" : ""}`,
    };
  }
  return (
    <div
      className={`guide-atlas ${playing ? "is-playing" : ""}`}
      ref={surface}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setPreview(null);
          setPinned(false);
        }
      }}
    >
      <div
        className="atlas-drawing"
        aria-label="总纲、专项方法、案例与测评的内容关系"
      >
        <svg
          ref={drawing}
          viewBox={compact ? "0 0 360 500" : "0 0 660 510"}
          fill="none"
          aria-hidden="true"
          className="atlas-connections"
        >
          {connections.map((edge, index) => (
            <g
              key={edge.id}
              className={
                edge.from === active || edge.to === active ? "is-related" : ""
              }
            >
              <path
                d={compact ? compactPaths[index] : edge.path}
                className="atlas-connection"
              />
              {!reduced && (
                <circle r="3.2" className="atlas-traveler" opacity="0">
                  <set
                    attributeName="opacity"
                    to="0.85"
                    begin={`${index * 1.7}s`}
                  />
                  <animateMotion
                    path={compact ? compactPaths[index] : edge.path}
                    dur="12s"
                    begin={`${index * 1.7}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          ))}
          {!compact && (
            <text
              x="639"
              y="277"
              textAnchor="middle"
              transform="rotate(-90 639 277)"
              className="atlas-return-label"
            >
              经验回到方法
            </text>
          )}
        </svg>
        <button {...props("outline")}>
          <span className="atlas-topic-heading">
            <GitBranch size={19} />
            <strong>定位与归因</strong>
            <ArrowUpRight size={15} />
          </span>
          <span className="atlas-outline-question">从哪里改起？</span>
          <span className="atlas-topic-foot">调优技术总纲</span>
          <svg
            className="atlas-mini-branches"
            viewBox="0 0 70 42"
            fill="none"
            aria-hidden="true"
          >
            <path d="M8 21H31M31 21V7H61M31 21V35H61" />
            <circle cx="8" cy="21" r="3" />
            <circle cx="61" cy="7" r="3" />
            <circle cx="61" cy="35" r="3" />
          </svg>
        </button>
        <button {...props("harness")}>
          <span className="atlas-topic-heading">
            <Layers3 size={20} />
            <strong>工程方法</strong>
            <span>Harness</span>
          </span>
          <span className="atlas-methods">
            <span>上下文与记忆</span>
            <span>工具与 Skill</span>
            <span>编排与护栏</span>
          </span>
          <span className="atlas-topic-foot">组织信息，协调动作</span>
        </button>
        <button {...props("model")}>
          <span className="atlas-topic-heading">
            <BrainCircuit size={20} />
            <strong>模型调优</strong>
          </span>
          <span className="atlas-model-terms">能力 · 训练 · 适配</span>
          <svg
            viewBox="0 0 150 32"
            fill="none"
            className="atlas-model-lines"
            aria-hidden="true"
          >
            <path d="M2 26C26 26 16 14 41 14S66 25 82 13S102 5 148 4" />
            <path d="M2 29C30 29 35 23 58 25S105 17 148 18" />
          </svg>
        </button>
        <button {...props("case")}>
          <span className="atlas-topic-heading">
            <FileSearch size={19} />
            <strong>案例与实操</strong>
          </span>
          <span className="atlas-case-topics">
            现象
            <span />
            依据
            <span />
            改动
          </span>
          <span className="atlas-mini-trace" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        </button>
        <button {...props("evaluation")}>
          <span className="atlas-topic-heading">
            <Route size={19} />
            <strong>验证与复用</strong>
          </span>
          <span className="atlas-evaluation-terms">同条件对照，回归与沉淀</span>
          <span className="atlas-mini-checks" aria-hidden="true">
            <Check size={13} />
            <Check size={13} />
            <Check size={13} />
          </span>
        </button>
        <span className="atlas-branch-label atlas-branch-methods">
          专项方法
        </span>
        <span className="atlas-branch-label atlas-branch-practice">
          实践与验证
        </span>
      </div>
      <div
        className="atlas-topic-caption"
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <strong>{topic.title}</strong>
          <p>{topic.description}</p>
        </div>
        <button
          onClick={() =>
            topic.href ? go(topic.href) : openChapter(topic.chapter!)
          }
        >
          {topic.action}
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="atlas-canvas-footer">
        <span>选择主题，查看相关内容</span>
        {!reduced && (
          <button
            aria-label={playing ? "暂停关系动态" : "播放关系动态"}
            onClick={() => {
              if (playing) setPaused(true);
              else {
                setPaused(false);
                setPinned(false);
                setPreview(null);
              }
            }}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            <span>{playing ? "暂停动态" : "播放动态"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
