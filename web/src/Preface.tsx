import { ArrowRight, BrainCircuit, Layers3, Wrench } from 'lucide-react';
import { ArchitectureLab } from './ArchitectureLab';
import { Button } from './ui';
import { CollaborationFlow } from './CollaborationFlow';
import { ReadingHeader } from './ReadingHeader';
import { chapters } from './curriculum';
import { guideGoals } from './guidePositioning';

const roles = [
  ['BU智能体开发者', '第0、1、2章；后续未显示'],
  ['AIC智能体团队', '全部章节'],
  ['AIC大模型团队', '第0、1、3章；后续未显示'],
  ['智能体框架团队', '第0、1章；后续未显示'],
  ['应用开发／工程开发团队', '第0、1、4章'],
  ['测试团队', '第0、5章'],
  ['产品／架构评审者（AIC/PO）', '第0、1、6章'],
];
const chapterFocus = [
  '背景、定位、范围、职责与使用方式。',
  '三层职责与归因框架、异常定位、优化方向与验证。',
  'Prompt、上下文与记忆、工具与Skill、多Agent编排和安全护栏。',
  '模型训练、蒸馏与压缩、端侧模型体系及端云协同。',
  '仅界定运行环境的归因边界，具体优化技术从略。',
  '统一评估口径、数据集与回归、对照实验和验证。',
  '核心原则、落地路径与持续改进。',
];

export function Preface({go}:{go:(path:string)=>void}) {
  return <main className="preface-page reading-page preface-document" id="main" tabIndex={-1}>
    <ReadingHeader chapter="第 0 章 · 前言" title="前言" intro="面向医疗设备智能体，形成覆盖调优全链路的技术指南，统一团队方法论，让调优工作有章可循、有人负责、有案例可查、有资产可沉淀。"/>
    <details className="preface-history"><summary>变更历史<span>v1.0 · 评审中</span></summary><table className="simple-table"><caption className="sr-only">原稿变更历史</caption><thead><tr><th scope="col">版本</th><th scope="col">阶段</th></tr></thead><tbody><tr><td>v1.0</td><td>评审中</td></tr></tbody></table></details>

    <section className="preface-section" id="background">
      <h2>编写背景</h2>
      <section className="preface-subsection" id="industry">
        <h3>行业背景：从“框架搭建”进入“能力调优”</h3>
        <p>随着模型能力、开发框架和工具协议的成熟，搭建一个可运行的Agent框架已不再是主要瓶颈。当前真正决定智能体产品竞争力的，不再是能否调用工具、完成多步交互、接入业务系统，而是<strong>Agent能否在真实业务中反复、稳定、安全地把任务做好。</strong></p>
        <p>原稿以业务规则约束下的工具交互基准τ-bench为例：GPT-4o在零售任务上的单次执行成功率（pass¹）为61.2%，而要求同一任务连续八次执行全部成功的严格指标（pass⁸）低于25%<a className="preface-citation" href="#/preface?section=references">[1][5]</a>。一次做对与稳定交付之间存在差距，不能仅靠更换更强的模型自动弥合。完成大量中间步骤，也不等于交付完整结果。</p>
        <p>智能体的能力短板已经从单点模型能力，转向模型、运行支撑与执行环境协同形成的端到端交付能力。本指南建立在两个方法论共识之上：</p>
        <ol className="preface-prose-list">
          <li><strong>Agent的端到端能力由模型、Harness、执行环境三层共同形成。</strong>模型负责决策，Harness（运行支撑层）负责上下文、工具协议、状态、权限与运行控制，执行环境负责实际承载动作。任何一层失效都会表现为“Agent不好用”，但优化手段、成本与责任主体不同。</li>
          <li><strong>Harness Engineering已成为独立的工程学科。</strong>上下文架构、架构约束、自验证循环、上下文隔离、熵治理、可拆卸性等工程机制，系统性影响生产可靠性；提示词技巧不能替代这些机制。</li>
        </ol>
        <p>因此，调优需要方法论、流程、数据资产和组织分工共同支撑。本指南的编写正是对这一阶段的回应。</p>
      </section>

      <section className="preface-subsection" id="medical">
        <h3>医疗场景的特殊性：通用方法论需要医疗化改造</h3>
        <p>通用智能体调优方法不能直接套用于医疗场景。与影像设备、扫描协议和检查流程深度耦合的智能体，存在四类特殊约束：</p>
        <dl className="preface-definition-list">
          <div><dt>高风险性</dt><dd>扫描协议推荐、参数调整等输出直接影响检查质量与安全。错误的协议组合或参数不是体验问题；安全约束必须由系统强制实施，不能依赖模型自律，也不能用其他指标的高分抵消。</dd></div>
          <div><dt>强证据要求</dt><dd>输出需要回溯到影像依据、工具执行结果、知识库条目或指南条款。回答看起来合理不构成可信性；评估必须覆盖证据链，而非只评价最终文本。</dd></div>
          <div><dt>端侧部署约束</dt><dd>设备端侧的模型规格受算力制约。原稿记录端侧Qwen 9B/35B系列的初步选型；上下文窗口、时延和模型更新成本与云端不同，大模型堆叠、多模型反复复核等手段受到硬约束。</dd></div>
          <div><dt>证据成熟度的严格区分</dt><dd>仿真环境通过、回顾性数据评测、专家评审与前瞻性临床验证属于不同证据等级。离线Benchmark高分不证明临床收益，模拟控制台操作成功也不代表真实设备采集成功<a className="preface-citation" href="#/preface?section=references">[4]</a>。</dd></div>
        </dl>
        <p>指南中的方法应结合上述约束使用；涉及外部案例时，明确其证据与适用边界。</p>
      </section>

      <section className="preface-subsection" id="internal">
        <h3>内部现状：架构已成形，能力待调优</h3>
        <p><strong>平台小U</strong>已完成基本框架建设，形成清晰的分层架构。以下现状按本版原稿记录。</p>
        <div className="preface-table-region"><table className="simple-table"><caption>平台小U的分层架构</caption><thead><tr><th scope="col">层级／基础</th><th scope="col">组成与职责</th></tr></thead><tbody>
          <tr><th scope="row">交互层</th><td>uCopilot经AG-UI协议接入。</td></tr>
          <tr><th scope="row">编排层</th><td>Host Agent（Orchestrator）统一编排，挂接Planning Subagent与Classifier Subagent，通过A2A协议连接Remote Subagent与Local Subagent。</td></tr>
          <tr><th scope="row">模型层</th><td>外接模型服务；端侧LLM初步选型Qwen 9B/35B系列，ASR/TTS语音模型完成初步选型，意图／快速决策专用小模型选型待定。</td></tr>
          <tr><th scope="row">Harness组件</th><td>Context（Runtime Context静态配置）、State（短期记忆）、Store（长期记忆）、Prompts、Tools（经MCP接入Service）、Skills。</td></tr>
          <tr><th scope="row">可观测基础</th><td>已具备Langfuse追踪能力，问题上报可携带追踪码。</td></tr>
        </tbody></table></div>
        <p><strong>BU垂域智能体</strong>已形成覆盖CT、MR、MI、US、XR、RT等产品线的项目矩阵，各项目成熟度存在差异：</p>
        <ul className="preface-prose-list">
          <li>CT协议推荐智能体（81H2）已完成安全护栏一期（LLM版／纯规则版红区护栏）与基于知识库的个性化方案一期，二期多协议组合推荐推进中。</li>
          <li>CT扫描参数推荐智能体（81H3）处于护栏方案设计中；超声、RT技师智能体处于安全与个性化需求梳理阶段。</li>
          <li>DSA介入医生智能体已完成一体式／分体式架构决策；MR明确1.X采用规则式智能体方案。</li>
        </ul>
        <p><strong>问题已经开始暴露，并具有结构性特征。</strong>平台小U记录的问题包括：上下文理解能力弱、系统信息过度披露、UI组件调用失败、超出功能范围的输入识别不足、技能调用不完整、从知识建议到技能调用的链路缺失，以及对象级工作流操作、条件检索与批量归档的任务执行问题。</p>
        <p>具体表现包括：“创建任务清单”未按清单范式输出且追问无效；Skills参数与实现代码被完整输出；配置页面无法直达目标面板；部分超范围输入未被拦截；“修改配置”只打开界面而未执行修改。这些现象需要沿输入组织、信息披露、工具协议、护栏与动作链路分别核查。</p>
        <p>原稿的逐条初步归因指出，多数问题集中在Harness层：上下文组织、信息披露控制、工具协议粒度、护栏覆盖和动作链路完整性。对应本指南，先做Harness工程改进；模型训练必须以严格归因为前提，避免用高成本训练解决本可由工程机制解决的问题。</p>
      </section>

      <section className="preface-subsection" id="gaps">
        <h3>现状的本质：调优工作的“四个不统一”</h3>
        <p>当前核心障碍是缺少统一规范，具体表现为：</p>
        <ol className="preface-prose-list">
          <li><strong>归因不统一。</strong>同一问题可能分别被归因于模型、提示词或工具。缺少“先环境、再Harness、后模型”的统一归因纪律，会出现用训练弥补工程缺陷、用换模型掩盖协议含混的高成本低效路径。</li>
          <li><strong>方法不统一。</strong>改Prompt、加护栏、调工具、训模型之间缺乏准入条件与选择依据，优化动作依赖个人经验，无法沉淀为团队能力。</li>
          <li><strong>验证不统一。</strong>“跑几条例子感觉变好了”不能代替同条件对照实验与回归集验证。缺少固定任务集、评估口径和版本记录，就无法确认收益和发现退化。</li>
          <li><strong>资产不统一。</strong>Badcase散落在个人记录中，修复经验随人员流动流失；轨迹、判据和失败模式未成为可复用的数据资产，同类问题反复从零排查。</li>
        </ol>
        <p>指南以统一归因（第1章）、统一方法（第2、3章）、统一验证（第5章）和贯穿全文的数据飞轮与资产沉淀，回应这四个问题。</p>
      </section>
    </section>

    <section className="preface-section" id="principles">
      <h2>编写目标与核心章节</h2>
      <section className="preface-subsection" id="goals"><h3>编写目标</h3><p><strong>总目标：</strong>形成覆盖智能体调优全链路的技术指南，统一团队方法论，让调优工作有章可循、有人负责、有案例可查、有资产可沉淀。</p><div className="preface-table-region"><table className="simple-table"><caption className="sr-only">指南的四项目标</caption><thead><tr><th scope="col">目标</th><th scope="col">要求</th></tr></thead><tbody>{guideGoals.map(goal=><tr key={goal.title}><th scope="row">{goal.title}</th><td>{goal.description}</td></tr>)}</tbody></table></div></section>
      <section className="preface-subsection" id="chapter-guide"><h3>指南结构与章节导读</h3><div className="preface-table-region"><table className="simple-table preface-chapter-table"><caption className="sr-only">第0至6章的阅读重点与内容状态</caption><thead><tr><th scope="col">章节</th><th scope="col">阅读重点</th><th scope="col">内容状态</th></tr></thead><tbody>{chapters.map((chapter,index)=><tr key={chapter.id}><th scope="row">{chapter.href?<a href={'#'+chapter.href}>第{chapter.number}章 · {chapter.title}</a>:<>第{chapter.number}章 · {chapter.title}</>}</th><td>{chapterFocus[index]}</td><td>{chapter.status==='planned'?'待补充':chapter.status==='intro'?'基础内容':'可阅读'}</td></tr>)}</tbody></table></div></section>
    </section>

    <section className="preface-section" id="scope">
      <h2>适用范围与使用方式</h2>
      <section className="preface-subsection" id="applicability"><h3>适用范围</h3><ol className="preface-prose-list">
        <li><strong>Harness层优化：</strong>提示词、上下文与记忆、知识库、工具调用方式（MCP）、Skill、多Agent编排（Host Agent／Planning／Classifier／Remote、Local Subagent）、安全护栏和决策方式选择。</li>
        <li><strong>模型训练调优：</strong>SFT、Agentic RL、蒸馏，以及端侧部署约束下的模型体系设计与端云协同。</li>
        <li><strong>在线自进化：</strong>以受控方式将运行经验沉淀为可复用资产；候选生成不等于自动上线。</li>
        <li><strong>数据飞轮支撑：</strong>数据构造、模拟仿真与测评。</li>
      </ol><p><strong>不适用范围：</strong>运行环境（容器、沙箱、工作流运行环境、设备端工程实现）的具体优化技术。本指南仅界定其归因边界（第4章）。</p></section>

      <section className="preface-subsection" id="role-map"><h3>分角色阅读地图</h3><div className="preface-table-region"><table className="simple-table"><caption className="sr-only">不同角色的必读章节</caption><thead><tr><th scope="col">角色</th><th scope="col">必读章节</th></tr></thead><tbody>{roles.map(([role,reading])=><tr key={role}><th scope="row">{role}</th><td>{reading}</td></tr>)}</tbody></table></div><p className="preface-source-note">部分角色的必读章节在原图右侧被截断，“后续未显示”表示尚缺原文。</p></section>

      <section className="preface-subsection" id="reading"><h3>三种使用路径</h3><dl className="preface-paths">
        <div><dt>问题驱动路径（最常用）</dt><dd>遇到具体问题 → 携带Langfuse追踪码或Badcase记录 → 按第1章归因 → 进入第2或3章对应节 → 用章末检查清单自检 → 按第5章验证 → 修复后样本入回归集。</dd></div>
        <div><dt>系统建设路径</dt><dd>新建或重构智能体 → 按第1章建立目标体系与责任分工 → 按第2章设计Harness基线 → 按第5章建立数据集与门禁 → 视条件启动第3章训练。</dd></div>
        <div><dt>评审路径</dt><dd>评审调优方案或发布申请 → 使用原稿第1.8、5.9节检查清单 → 核对附录A模板完整性。</dd></div>
      </dl><p className="preface-source-note">以上为指南的使用路径。专项章节、检查清单与附录尚未全部补齐，页面中的可阅读入口以当前内容状态为准。</p></section>

      <section className="preface-subsection preface-collaboration" id="collaboration"><h3>内部协作 SOP（建议）</h3><p>开发者、评审者和测试者发现问题后，分别携带追踪码、评审问题清单或测试记录上报。小U主owner与AIC智能体团队共同分析界定，再按问题所属层级分配责任团队；解决后反馈并闭环。</p><CollaborationFlow/></section>
    </section>

    <section className="preface-section" id="maintenance"><h2>编写、评审与维护机制</h2><ol className="preface-prose-list">
      <li><strong>版本化。</strong>指南整体版本与各章版本统一管理；重大方法变更（归因流程、门禁原则、数据规范）升级主版本，案例补充与文字修订升级次版本。</li>
      <li><strong>反馈入口。</strong>使用者发现问题，汇报给小U主owner与AIC智能体团队，共同分析界定问题；AIC智能体团队负责修订与发布。</li>
      <li><strong>与实践同步。</strong>每轮调优实践结束时，负责人需要回答：指南哪条被验证有效、哪条需要修订、产生了什么新经验。记录与黄金集、回归集的版本变更同步归档。</li>
      <li><strong>指南自身演进。</strong>修订稿经评审后发布，历史版本可追溯，重大变更附迁移说明。</li>
    </ol></section>

    <section className="preface-section" id="references"><h2>引用</h2><ol className="preface-prose-list preface-references">
      <li>阿里云《AI Agent Handbook》：第18章“Agent调优总览”、第22章“Agent优化：Badcase”。</li>
      <li>阿里云《AI Agent Handbook》：第17章“模型调优综述”。</li>
      <li>《从零开始学Agent》：8.2“六大工程支柱”、8.6“结构化输出”、10.8“专为Agent的微调”、11.3“Agentic数据飞轮”、20.6“Agent专项评估框架”、20.7“A/B测试与回归测试自动化”。</li>
    </ol><p className="preface-source-note">引用条目按原稿保留。正文中的医疗证据综述与τ-bench资料标为[4]、[5]，截图未附完整书目信息，待补齐。</p></section>

    <section className="preface-section preface-supplement" id="supplement"><h2>补充：Agent 怎样运行</h2><p>以下保留原有的运行原理说明与交互演示，帮助理解模型、Harness和执行环境的分工。</p>
      <section className="preface-subsection" id="basics"><h3>三层运行职责</h3><p>模型提出回答或动作建议，周围的执行机制把建议组织成可控的过程，工具与环境承载具体行动。</p><dl className="preface-concepts"><div><dt><BrainCircuit size={18}/>模型</dt><dd>根据实际收到的上下文，生成回答、追问或动作建议。</dd></div><div><dt><Layers3 size={18}/>Harness</dt><dd>组织输入、调度执行、处理反馈，并维护任务的状态与边界。</dd></div><div><dt><Wrench size={18}/>工具与环境</dt><dd>提供外部信息和行动能力，返回结果、错误或其他运行反馈。</dd></div></dl></section>
      <section className="preface-subsection preface-architecture" id="architecture"><div className="preface-section-heading"><div><h3>跟着一个任务，看它怎样运行。</h3><p>切换情境，再播放或逐步查看。观察模型看到了什么，为什么会调用工具，结果又怎样进入下一次判断。</p></div></div><ArchitectureLab/></section>
      <section className="preface-subsection preface-loop-reading" id="loop"><h3>为什么一次回答，会调用多次模型？</h3><p>模型提出动作后，执行机制会调用工具、处理返回内容，再把新结果组织进下一次模型输入。任务没有结束时，这个过程会继续；信息不足时，也可以先追问用户。</p><div className="preface-loop-sequence"><span>准备上下文</span><ArrowRight size={16}/><span>模型判断</span><ArrowRight size={16}/><span>按需执行</span><ArrowRight size={16}/><span>处理与更新</span></div><p>历史记录、记忆和Skills都可能影响本次输入；护栏负责相应的校验与约束。具体系统可以采用不同架构，上面的图用于理解这些职责，不代表所有Agent都必须包含相同模块。</p></section>
    </section>

    <footer className="preface-next"><div><h2>进入调优方法</h2><p>从第1章开始，建立归因与优化决策框架。</p></div><Button onClick={()=>go('/guide')}>进入第 1 章：调优总纲<ArrowRight size={16}/></Button></footer>
  </main>;
}
