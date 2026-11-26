import { useState } from 'react';
import { ReadingHeader } from './ReadingHeader';
import { AgentLoop } from './AgentLoop';
import * as Accordion from '@radix-ui/react-accordion';
import { BookOpen, ChevronDown, FlaskConical, CornerUpLeft, CheckCircle2 } from 'lucide-react';
import { DecisionExplorer } from './DecisionExplorer';
export { DecisionDiagram } from './DecisionExplorer';
import { Button, Badge, Notice, Segments, Breadcrumb } from './ui';

type Section={id:string;title:string;paragraphs:string[];bullets?:string[]};
type Lesson={id:string;title:string;intro:string;sections:Section[];quiz:{question:string;options:string[];correct:number;explanation:string}};
export const lessons:Lesson[]=[
 {id:'runtime',title:'看懂一次运行',intro:'一次交互中，智能体可能多次准备上下文、调用模型、执行动作和处理结果。先看清这些循环，再检查问题出现在哪个环节。',sections:[
  {id:'boundaries',title:'先分清交互与内部循环',paragraphs:['会话（Session）可以关联多次交互的 Trace。Trace 将一次请求或操作中的执行记录组织起来；在交互型案例中，我们通常用它观察一轮用户请求。实际边界仍由应用埋点决定。','一条 Trace 内部可能有多次 Agent Loop。一次循环先准备输入，再调用模型，按需执行动作，处理结果并更新状态。若任务未结束，结果进入下一次循环。']},
  {id:'cycle',title:'四个环节在循环里重复',paragraphs:['①请求接收与⑥输出交付位于外层；②上下文、③模型、④动作、⑤结果与状态构成循环中的职责。点击图中环节，查看具体说明。']},
  {id:'observations',title:'原始记录与阅读层级相互对应',paragraphs:['执行记录（Observation）可以表示模型调用、工具调用、检索或其他过程，并保留父子关系。循环与六环节是我们的排查视图，不是平台必然存在的原生字段。','先按循环缩小范围，再展开相关环节。一项环节可能有多条记录；容器可以跨多个环节。未记录与未发生要分开，不能为了凑齐结构补造过程。']},
 ],quiz:{question:'没有调用工具，能说明这次循环出错了吗？',options:['能，每次循环都必须执行工具','不能，需要结合任务和模型实际输出判断','能，工具未调用就属于运行错误'],correct:1,explanation:'④动作执行是按需发生的。模型可以直接回答或追问，是否正确需要对照当前任务与完整输入。'}},
 {id:'locate',title:'定位异常出现的位置',intro:'先找到值得检查的循环，再核对具体环节。三个方法的入口不同，之后共用同一套“实际与预期”核对过程。',sections:[
  {id:'entry',title:'选择适合当前材料的入口',paragraphs:['问题提到具体工具、实体或动作时，可以从关键词进入；记录中有报错、超时或重试时，可以从异常状态进入；只有笼统反馈时，先明确预期，再从头对比。']},
  {id:'compare',title:'看实际，也要说清预期',paragraphs:['一次执行“成功”只说明某个技术动作按约定完成，不代表业务选择一定正确。相反，工具报错也可能是上游参数或状态导致的。','核对当前循环的输入、输出和相关环节。如果偏差已从上游传来，就沿有关联的记录回查；发现不符合预期的位置后，再看下游受到了什么影响。']},
  {id:'roles',title:'区分关键位置与受影响位置',paragraphs:['候选关键位置是需要进一步解释的偏差发生处，受影响位置是它的后续表现。可以有多个候选，不必过早收敛到一个根因。','LLM可以协助理解记录和寻找可见偏差，但预期需要用户确认，建议必须能回到原始记录。无法判断时，保留待补项。']},
 ],quiz:{question:'工具调用超时，是否足以直接认定“工具就是根因”？',options:['是，ERROR 状态已经给出了根因','否，还需检查参数、重试、上下游和运行环境','只需要再调用一次模型'],correct:1,explanation:'异常状态提供排查起点。工具可能按约定反馈了上游问题或环境异常，需要继续核对。'}},
 {id:'context',title:'核对模型实际收到的输入',intro:'判断模型之前，先确认本次调用到底看到了什么。页面上的问答、历史记录或某个摘要，都不能自动等同于完整模型输入。',sections:[
  {id:'actual',title:'以本次调用为边界',paragraphs:['模型输入是组装后的实际材料：系统规则、用户任务、技能说明、历史与状态、检索信息和工具反馈等。每次调用按需加载，不保证六类材料都必须出现。','查看时保留消息的角色和顺序。分类标签帮助找到来源，但不能改写原文、调整顺序或把上一轮可见的信息当作本轮一定可见。']},
  {id:'criteria',title:'逐项检查齐全、精准、一致',paragraphs:['齐全：当前决策需要的要求、约束、历史、状态与反馈，是否实际进入输入。','精准：内容是否正确、相关且精简，是否存在无关、重复、失效或干扰材料。','一致：事实、规则和状态是否前后衔接，后续调用是否使用更新后的有效信息。']},
  {id:'memory',title:'“取回来”与“传进去”是两件事',paragraphs:['如果历史中有设备号，却没有正确取回，先检查记忆机制；如果已经取回，随后在压缩、组装或状态传递中丢失，还需要检查组件之间的组织与控制。','即使本次输入明确包含正确设备号，也不能立刻断言模型有问题。还要核对冲突、任务要求以及模型输出与动作的实际表现。']},
 ],quiz:{question:'历史数据库中存在设备号，可以据此认定本次模型输入齐全吗？',options:['可以，记忆系统里有就等于模型能看到','不可以，需要查看本次调用实际收到的输入','只要本次调用返回成功就可以'],correct:1,explanation:'存在、取回、组装进输入是不同的环节。要以具体调用的原始输入为证据。'}},
 {id:'decisions',title:'沿判断路线找到优化方向',intro:'从关键步骤的实际输入开始，逐项核对条件，再确定优先检查的对象。同一个问题现象，可以因为运行记录不同而走向不同分支。',sections:[
  {id:'split',title:'从输入三标准开始分流',paragraphs:['先核对本次模型输入是否齐全、精准、一致。任一项不满足，就沿Harness分支依次核对历史取回、规则与Skill说明的组装、Skill选择与步骤、工具执行与返回；这些检查均符合约定后，继续检查组件之间的组织与控制。','三项都满足时，再核对模型判断、动作选择与性能。模型表现不满足要求，形成模型侧候选；表现满足要求，则继续检查运行环境与安全监测。环境正常仍无法解释时，再查架构设计。']},
  {id:'route',title:'按依据走完整条判断路线',paragraphs:['点击节点查看要核对的材料，再为当前问题选择答案。证据不足时先补材料；只有已确认本任务无需某机制时，才选择不适用。缺少记录不能当作机制不适用。','设备号的三个教学情境来自总纲第6页：历史未取回、取回后传递丢失、完整输入仍被忽略。它们分别说明不同条件如何通向记忆、架构或模型；实际案例仍需核对原文，不能套用示例答案。']},
  {id:'candidate',title:'候选对象还需要验证',paragraphs:['一条路径落到某个对象，代表形成了优先核查方向。它不是改动已经有效的证明，也不排除其他独立因素。','多个候选时先看证据充分程度，再考虑收益、成本、影响范围和可回退性。']},
 ],quiz:{question:'模型输入三项都通过，下一步应该怎么做？',options:['立即给出“更换模型”的结论','继续核对模型的输出、动作选择与性能','直接跳过环境与执行记录'],correct:1,explanation:'输入通过只是排除了当前可见的输入问题，不能直接证明模型侧存在能力缺口。'}},
 {id:'verify',title:'验证改动与建设性需求',intro:'定位的价值是帮助选择可验证的改动。把候选、计划和实际结果分开，才能知道这次优化是否有效。',sections:[
  {id:'control',title:'保持其他条件稳定',paragraphs:['尽量一次只改一个对象。固定任务和关键条件，分别检查出错位置、完整任务以及是否引入了新异常。','没有改善时重新核查归因；只改善局部时，继续检查其他因素。不要把一次顺利运行当作所有场景都已解决。']},
  {id:'plan',title:'把下一步写成可以检查的动作',paragraphs:['说明准备改什么、保持什么不变、预期出现什么变化，以及用哪些任务观察回归。验证计划与实际验证结果分开记录。']},
  {id:'build',title:'已有机制失效，还是确实缺少能力',paragraphs:['现有机制明确存在但未生效，先沿问题定位路线处理。确认所需能力确实不存在时，再讨论新工具、流程、记忆或模型能力的建设。','接口读不到、记录缺失不等于能力不存在。先把材料缺口写清楚。']},
 ],quiz:{question:'同时改Prompt、换模型、加记忆后效果改善，能清楚判断收益来自哪里吗？',options:['能，改动越多说明证据越充分','通常不能，需要控制变量和对照','只看最终回复是否好看就够了'],correct:1,explanation:'多个变量同时改变会增加归因和回退难度。先形成能验证单个假设的对照。'}},
 {id:'case',title:'把一条案例完整走一遍',intro:'以第二轮再次询问设备号的现象串联方法。以下是阅读与核对顺序；进入工作台后，再用实际导出确认每一步的事实。',sections:[
  {id:'scope',title:'先确认反馈对应的运行',paragraphs:['对照第一轮“CT-02 今天有什么排班”和第二轮“那明天呢”，确认问题所指的两轮交互与任务预期。确认它们属于同一相关会话，再选取主Trace和需要对照的轮次。']},
  {id:'evidence',title:'沿记录找到信息变化的位置',paragraphs:['依次比较前轮原文、历史取回结果和本次模型实际输入。区分没有取回、取回后传递丢失，以及输入完整却未正确使用三种条件，不从最终追问直接反推根因。','材料中的设备号实例存在实际输入与归因文字不一致的待核对处。学习判断方法时保留这个缺口；在真实工作台以具体调用原文为准，不把示例结论预填成标准答案。']},
  {id:'practice',title:'带着问题进入工作台',paragraphs:['把以上情境作为方法练习；进入实际工作台后，查询并选取导出中的真实轨迹，再提交自己的判断。材料不足时保留待补项。当前没有配置LLM辅助，不提供预设建议。']},
 ],quiz:{question:'要判断设备号是否在取回后丢失，最应先对照哪两份内容？',options:['最终回复和执行耗时','历史取回结果与模型实际输入','工具名称与页面颜色'],correct:1,explanation:'原文对照可以说明信息是否在取回后进入了本次输入，而不是只凭最终回复推断。'}},
 {id:'model',title:'模型优化：先建立共同基线',intro:'当证据指向模型侧时，再区分是基础能力、业务适配，还是速度与部署成本的问题。',sections:[
  {id:'selection',title:'选型与替换',paragraphs:['用相同的代表性任务、上下文和评价口径比较候选模型，观察质量、延迟和资源约束。先确认现有模型的基础能力是否匹配任务。']},
  {id:'training',title:'训练与业务适配',paragraphs:['基础能力具备但业务判断习惯未对齐时，再评估数据与训练方案。先明确需要改变的行为、可获得的数据和验证任务。','训练方式的选择应基于问题类型和资源条件，不从一个失败案例直接推出微调。']},
  {id:'quantization',title:'量化与效果验证',paragraphs:['若主要问题是推理资源或响应成本，量化压缩可能成为候选。压缩后仍需在相同任务和约束下检查质量、延迟与回归。']},
 ],quiz:{question:'一次模型输出不符合预期，是否可以直接决定开展业务训练？',options:['可以，训练总能解决输入问题','不可以，应先核对完整输入、能力基线与可重复表现','可以，只要增加训练轮数'],correct:1,explanation:'先定位问题并建立稳定基线，才能判断参数调整是否有必要、收益能否验证。'}},
];
function MethodFigure(){const [method,setMethod]=useState('keyword');const texts:Record<string,[string,string]>={keyword:['从名字或关键词进入','先查工具、技能、实体和动作，再检查命中的循环及相关环节。'],status:['从报错或重试进入','选与问题相关的异常记录，再核对参数与上下游，不把状态当作根因。'],compare:['从任务预期进入','把预期说清楚，从头检查实际表现，找到第一处可见偏差。']};return <div className="method-figure"><Segments value={method} onChange={setMethod} label="定位方法" items={[{id:'keyword',label:'关键词'},{id:'status',label:'异常状态'},{id:'compare',label:'从头对比'}]}/><h3>{texts[method][0]}</h3><p>{texts[method][1]}</p><div className="compare-chain"><span>找到起点</span><span>核对实际与预期</span><span>回查关联上下游</span><span>记录候选位置</span></div></div>}

export function Course({id,go,selectedObject,setSelectedObject,returnTo,sectionId}:{sectionId?:string;id:string;go:(path:string)=>void;selectedObject:string;setSelectedObject:(id:string)=>void;returnTo:string|null}){
 const lesson=lessons.find(l=>l.id===id)??lessons[0];const index=lessons.indexOf(lesson);const [answer,setAnswer]=useState<number|null>(null);const [submitted,setSubmitted]=useState(false);
 return <div className={`course-layout reading-layout ${lesson.id==='decisions'?'decision-course-layout':''}`}><main className="course-main reading-page" id="main" tabIndex={-1}><ReadingHeader chapter={id==='model'?'第 3 章 · 模型调优':'第 1 章 · 调优总纲'} title={lesson.title} intro={lesson.intro} actions={returnTo&&<Button variant="ghost" className="course-return" onClick={()=>go(returnTo)}><CornerUpLeft size={14}/>返回当前排查</Button>}/>{lesson.sections.map(section=><section className="article-section" id={section.id} key={section.id}><h2>{section.title}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}{section.bullets&&<ul>{section.bullets.map(b=><li key={b}>{b}</li>)}</ul>}{lesson.id==='runtime'&&section.id==='cycle'&&<AgentLoop/>}{lesson.id==='locate'&&section.id==='entry'&&<MethodFigure/>}{lesson.id==='context'&&section.id==='criteria'&&<table className="simple-table"><thead><tr><th>标准</th><th>这次要核对什么</th></tr></thead><tbody><tr><th>齐全</th><td>决策需要的信息，是否实际进来了？</td></tr><tr><th>精准</th><td>是否正确、相关，且没有不必要干扰？</td></tr><tr><th>一致</th><td>事实、规则、状态是否衔接？</td></tr></tbody></table>}{lesson.id==='decisions'&&section.id==='route'&&<DecisionExplorer onLearn={course=>go(`/learn/${course}`)}/>}{lesson.id==='verify'&&section.id==='plan'&&<ul className="verification-list">{['写出候选与待验证假设','明确改动和保持不变的条件','检查当前步骤与完整任务','检查新异常并记录实际结果'].map(s=><li key={s}><CheckCircle2 size={17}/>{s}</li>)}</ul>}</section>)}
 <Accordion.Root type="single" collapsible className="reading-extra"><Accordion.Item value="terms"><Accordion.Header><Accordion.Trigger>补充：几个容易混淆的名称<ChevronDown size={16}/></Accordion.Trigger></Accordion.Header><Accordion.Content><p>交互轮次是用户对话的轮次；循环是一次运行内部的迭代；环节是职责分类；Observation 是平台记录。它们不是一一对应关系。</p></Accordion.Content></Accordion.Item></Accordion.Root>
 <section className="quiz"><div className="quiz-heading"><FlaskConical size={19}/><h2>试着判断</h2></div><p>{lesson.quiz.question}</p><div className="quiz-options" role="radiogroup" aria-label={lesson.quiz.question}>{lesson.quiz.options.map((option,i)=><label key={option} className={answer===i?'selected':''}><input type="radio" checked={answer===i} onChange={()=>{setAnswer(i);setSubmitted(false)}} name="lesson-quiz"/>{option}</label>)}</div><Button variant="secondary" disabled={answer===null} onClick={()=>setSubmitted(true)}>查看解释</Button>{submitted&&<div className="quiz-feedback" role="status"><strong>{answer===lesson.quiz.correct?'判断有依据':'再核对一下判断依据'}</strong><p>{lesson.quiz.explanation}</p></div>}</section><footer className="article-footer"><div>{index<lessons.length-2?<Button onClick={()=>go(`/learn/${lessons[index+1].id}`)}>下一节：{lessons[index+1].title}</Button>:<Button onClick={()=>go('/cases')}>进入案例练习</Button>}<Button variant="secondary" onClick={()=>go(returnTo??'/cases')}>{returnTo?'返回当前排查':'用真实案例练习'}</Button></div><p>课程情境用于讲解方法；实际工作台读取本地导出，判断与验证以实际记录为依据。</p></footer></main><aside className="article-toc"><p>本节内容</p>{lesson.sections.map(s=><a key={s.id} href={`#/learn/${lesson.id}?section=${s.id}`} aria-current={sectionId===s.id?'location':undefined}>{s.title}</a>)}</aside></div>;
}
function BrainIcon(){return <BookOpen size={16}/>}
