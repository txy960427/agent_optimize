import { useState } from "react";
import { ReadingHeader } from "../../components/ReadingHeader";
import { AgentLoop } from "./AgentLoop";
import * as Accordion from "@radix-ui/react-accordion";
import {
  ArrowRight,
  ChevronDown,
  FlaskConical,
  CornerUpLeft,
  CheckCircle2,
} from "lucide-react";
import { DecisionExplorer } from "./DecisionExplorer";
import { Button, Segments } from "../../components/ui";
import { lessons } from "../../domain/lessons";

function MethodFigure() {
  const [method, setMethod] = useState("keyword");
  const texts: Record<string, [string, string]> = {
    keyword: [
      "从名字或关键词进入",
      "先查工具、技能、实体和动作，再检查命中的循环及相关环节。",
    ],
    status: [
      "从报错或重试进入",
      "选与问题相关的异常记录，再核对参数与上下游，不把状态当作根因。",
    ],
    compare: [
      "从任务预期进入",
      "把预期说清楚，从头检查实际表现，找到第一处可见偏差。",
    ],
  };
  return (
    <div className="method-figure">
      <Segments
        value={method}
        onChange={setMethod}
        label="定位方法"
        items={[
          { id: "keyword", label: "关键词" },
          { id: "status", label: "异常状态" },
          { id: "compare", label: "从头对比" },
        ]}
      />
      <h3>{texts[method][0]}</h3>
      <p>{texts[method][1]}</p>
      <div className="compare-chain">
        <span>找到起点</span>
        <span>核对实际与预期</span>
        <span>回查关联上下游</span>
        <span>记录候选位置</span>
      </div>
    </div>
  );
}

export function Course({
  id,
  go,
  returnTo,
  sectionId,
}: {
  sectionId?: string;
  id: string;
  go: (path: string) => void;
  returnTo: string | null;
}) {
  const lesson = lessons.find((l) => l.id === id) ?? lessons[0];
  const index = lessons.indexOf(lesson);
  const [answer, setAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div
      className={`course-layout reading-layout ${lesson.id === "decisions" ? "decision-course-layout" : ""}`}
    >
      <main className="course-main reading-page" id="main" tabIndex={-1}>
        <ReadingHeader
          chapter={id === "model" ? "第 3 章 · 模型调优" : "第 1 章 · 调优总纲"}
          title={lesson.title}
          intro={lesson.intro}
          actions={
            returnTo && (
              <Button
                variant="ghost"
                className="course-return"
                onClick={() => go(returnTo)}
              >
                <CornerUpLeft size={14} />
                返回当前排查
              </Button>
            )
          }
        />
        {lesson.sections.map((section) => (
          <section className="article-section" id={section.id} key={section.id}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            {lesson.id === "runtime" && section.id === "cycle" && <AgentLoop />}
            {lesson.id === "locate" && section.id === "entry" && (
              <MethodFigure />
            )}
            {lesson.id === "context" && section.id === "criteria" && (
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>标准</th>
                    <th>这次要核对什么</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>齐全</th>
                    <td>决策需要的信息，是否实际进来了？</td>
                  </tr>
                  <tr>
                    <th>精准</th>
                    <td>是否正确、相关，且没有不必要干扰？</td>
                  </tr>
                  <tr>
                    <th>一致</th>
                    <td>事实、规则、状态是否衔接？</td>
                  </tr>
                </tbody>
              </table>
            )}
            {lesson.id === "decisions" && section.id === "route" && (
              <DecisionExplorer onLearn={(course) => go(`/learn/${course}`)} />
            )}
            {lesson.id === "verify" && section.id === "plan" && (
              <ul className="verification-list">
                {[
                  "写出候选与待验证假设",
                  "明确改动和保持不变的条件",
                  "检查当前步骤与完整任务",
                  "检查新异常并记录实际结果",
                ].map((s) => (
                  <li key={s}>
                    <CheckCircle2 size={17} />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <Accordion.Root type="single" collapsible className="reading-extra">
          <Accordion.Item value="terms">
            <Accordion.Header>
              <Accordion.Trigger>
                补充：几个容易混淆的名称
                <ChevronDown size={16} />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <p>
                交互轮次是用户对话的轮次；循环是一次运行内部的迭代；环节是职责分类；Observation
                是平台记录。它们不是一一对应关系。
              </p>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
        <section className="quiz">
          <div className="quiz-heading">
            <FlaskConical size={19} />
            <h2>试着判断</h2>
          </div>
          <p>{lesson.quiz.question}</p>
          <div
            className="quiz-options"
            role="radiogroup"
            aria-label={lesson.quiz.question}
          >
            {lesson.quiz.options.map((option, i) => (
              <label key={option} className={answer === i ? "selected" : ""}>
                <input
                  type="radio"
                  checked={answer === i}
                  onChange={() => {
                    setAnswer(i);
                    setSubmitted(false);
                  }}
                  name="lesson-quiz"
                />
                {option}
              </label>
            ))}
          </div>
          <Button
            variant="secondary"
            disabled={answer === null}
            onClick={() => setSubmitted(true)}
          >
            查看解释
          </Button>
          {submitted && (
            <div className="quiz-feedback" role="status">
              <strong>
                {answer === lesson.quiz.correct
                  ? "判断有依据"
                  : "再核对一下判断依据"}
              </strong>
              <p>{lesson.quiz.explanation}</p>
            </div>
          )}
        </section>
        <footer className="preface-next">
          <div>
            <h2>{index < lessons.length - 2 ? lessons[index + 1].title : "用真实记录练习"}</h2>
            <p>
              {index < lessons.length - 2
                ? lessons[index + 1].intro
                : "课程情境用于讲解方法。实际工作台读取本地导出，判断与验证以实际记录为依据。"}
            </p>
          </div>
          <Button
            onClick={() =>
              go(index < lessons.length - 2 ? `/learn/${lessons[index + 1].id}` : returnTo ?? "/cases")
            }
          >
            {index < lessons.length - 2 ? `下一节：${lessons[index + 1].title}` : returnTo ? "返回当前排查" : "进入案例练习"}
            <ArrowRight size={16} />
          </Button>
        </footer>
      </main>
      <aside className="article-toc">
        <p>本节内容</p>
        {lesson.sections.map((s) => (
          <a
            key={s.id}
            href={`#/learn/${lesson.id}?section=${s.id}`}
            aria-current={sectionId === s.id ? "location" : undefined}
          >
            {s.title}
          </a>
        ))}
      </aside>
    </div>
  );
}
