import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, BaseEdge, getSmoothStepPath, type Node, type NodeProps, type Edge, type EdgeProps, type ReactFlowInstance } from '@xyflow/react';
import { BrainCircuit, Database, FileText, GitBranch, MessageSquareText, Play, Pause, RotateCcw, ShieldCheck, SkipForward, Wrench, RefreshCw, Send, Maximize2 } from 'lucide-react';

type ScenarioId='complete'|'missing'|'timeout';
type Frame={node:string;explanation:string;record:string};
type LabData={label:string;caption:string;active:boolean;muted:boolean;support:boolean;tone:string};
type LabNode=Node<LabData>;
const scenarios:{id:ScenarioId;title:string;description:string;history:string}[]=[
 {id:'complete',title:'信息齐全，调用工具',description:'历史中保留设备号，查询后组织回答。',history:'上一轮已确认设备 CT-02。'},
 {id:'missing',title:'缺少上下文，先追问',description:'本轮不知道设备号，先补齐必要信息。',history:'本次输入未带入设备号。'},
 {id:'timeout',title:'工具超时，处理反馈',description:'执行返回错误，后续判断需要看到反馈。',history:'上一轮已确认设备 CT-02。'},
];
const nodeDefinitions:Record<string,{label:string;caption:string;definition:string;icon:typeof BrainCircuit;tone:string}>={
 user:{label:'用户输入',caption:'本轮任务',definition:'接收用户这次提出的要求。省略的信息可能需要从历史补充，或向用户追问。',icon:MessageSquareText,tone:'blue'},
 inputGuard:{label:'输入护栏',caption:'校验与约束',definition:'按系统约定检查输入及访问边界。护栏可以有不同实现，并非每个系统都有相同流程。',icon:ShieldCheck,tone:'teal'},
 context:{label:'上下文组装',caption:'实际送入模型的信息',definition:'把本次需要的任务、规则、历史和反馈组织成模型实际收到的输入。',icon:FileText,tone:'blue'},
 model:{label:'LLM 推理',caption:'回答或提出动作',definition:'模型根据本次输入生成回答、追问或动作建议；它看不到没有进入本次输入的信息。',icon:BrainCircuit,tone:'violet'},
 decision:{label:'决策路由',caption:'继续执行或交付',definition:'执行机制解释模型返回，决定调度动作、继续循环，还是整理并交付输出。',icon:GitBranch,tone:'violet'},
 tool:{label:'工具执行',caption:'调用外部能力',definition:'校验并执行具体动作。结果可能是业务数据，也可能是超时等运行反馈。',icon:Wrench,tone:'amber'},
 observation:{label:'观察与更新',caption:'处理结果，维护状态',definition:'保留执行结果或错误，更新任务状态，再把相关反馈交给下一次上下文准备。',icon:RefreshCw,tone:'teal'},
 outputGuard:{label:'输出护栏',caption:'交付前检查',definition:'按实际系统约定核对输出格式、权限与其他约束，再决定是否交付。',icon:ShieldCheck,tone:'teal'},
 answer:{label:'最终输出',caption:'向用户交付',definition:'把这次任务的回答或需要用户补充的问题交付出去，不把缺失结果编造成成功。',icon:Send,tone:'blue'},
 memory:{label:'记忆与历史',caption:'跨轮次的信息',definition:'为后续交互保存和取回历史信息。存在于存储中的内容，还需要实际取回并进入本次输入。',icon:Database,tone:'teal'},
 skill:{label:'Skills',caption:'任务方法与工具说明',definition:'提供当前任务需要的规则、操作方法或工具约定，按需组装进模型输入。',icon:FileText,tone:'violet'},
};
const positions:{id:string;x:number;y:number;support?:boolean}[]=[
 {id:'user',x:0,y:180},{id:'inputGuard',x:166,y:24},{id:'context',x:166,y:180},
 {id:'model',x:332,y:180},{id:'decision',x:498,y:180},{id:'tool',x:664,y:24},
 {id:'observation',x:664,y:336},{id:'outputGuard',x:830,y:24},{id:'answer',x:830,y:180},
 {id:'memory',x:166,y:336,support:true},{id:'skill',x:332,y:336,support:true},
];
function framesFor(id:ScenarioId):Frame[]{
 const missing=id==='missing';
 const frames:Frame[]=[
  {node:'user',explanation:'用户追问“那明天呢？”。这句话本身没有给出设备号。',record:'用户：那明天呢？'},
  {node:'inputGuard',explanation:'先按当前系统的输入规则检查请求。这个例子允许继续处理排班查询。',record:'示例检查：请求符合当前演示任务范围。'},
  {node:'context',explanation:missing?'组装实际输入时没有设备号。历史存储中有没有，并不能替代本次模型输入。':'将历史设备号 CT-02、用户追问和查询规则一起组装进实际输入。',record:missing?'任务：查询明天排班。\n设备号：未提供。\n规则：设备号不明确时先追问。':'历史：设备 CT-02。\n任务：查询明天排班。\n规则：设备号明确后调用排班工具。'},
  {node:'model',explanation:missing?'模型缺少必填设备号，因此选择先向用户追问。':'模型根据本次输入提出排班查询动作，明确传入设备号。',record:missing?'建议：先询问设备号，不猜测查询参数。':'建议：调用 query-device-schedule。\n参数：device_id = CT-02，日期 = 明天。'},
  {node:'decision',explanation:missing?'本次返回是追问，直接进入交付分支，不必经过工具。':'执行机制识别到工具请求，准备校验并调度动作。',record:missing?'路由：交付追问。\n本轮未调用工具。':'路由：调用排班查询工具。'},
 ];
 if(!missing)frames.push(
  {node:'tool',explanation:id==='timeout'?'工具在这个教学情境中返回超时。运行错误是反馈，还需要后续处理。':'工具返回 CT-02 的排班结果，交由执行机制继续处理。',record:id==='timeout'?'query-device-schedule → TIMEOUT\n本次没有获得排班数据。':'query-device-schedule → 成功\n示例结果：CT-02 明天有 2 项排班。'},
  {node:'observation',explanation:'保留实际返回，更新状态。随后重新准备上下文，让模型看到执行结果。',record:id==='timeout'?'状态：查询未完成。\n保留：超时反馈与原查询条件。':'状态：已获得排班。\n保留：设备号、日期和工具结果。'},
  {node:'context',explanation:'开始下一次内部循环。输入包含原任务和新的工具反馈，而不是重复第一次输入。',record:id==='timeout'?'原任务：CT-02 明天排班。\n新增反馈：工具超时，未获得数据。':'原任务：CT-02 明天排班。\n新增反馈：成功，2 项排班。'},
  {node:'model',explanation:id==='timeout'?'模型根据失败反馈组织说明，不应虚构排班结果。':'模型根据工具结果组织面向用户的回复。',record:id==='timeout'?'建议：说明本次查询未完成，可稍后重试。':'建议：用已获得的数据回答 CT-02 明天的排班。'},
  {node:'decision',explanation:'本次返回可以交付，结束内部循环。',record:'路由：检查并交付回复。'},
 );
 frames.push(
  {node:'outputGuard',explanation:'按约定检查即将交付的内容。工具没有成功时，不能把任务写成已完成。',record:'示例检查：输出与当前可见信息及执行状态一致。'},
  {node:'answer',explanation:missing?'信息不足也可以形成有效的下一步：向用户提问。':id==='timeout'?'把当前未完成的情况告诉用户。识别根因和调优需要另行查看证据。':'一次工具执行和两次模型调用，共同完成了这一轮用户交互。',record:missing?'请问你要查询哪台设备的排班？':id==='timeout'?'CT-02 的排班查询暂未完成，请稍后重试。':'CT-02 明天有 2 项排班。'},
 );
 return frames;
}
function ArchitectureNode({data}:NodeProps<LabNode>){
 const Icon=nodeDefinitions[data.caption]?.icon??BrainCircuit;
 return <div className={`lab-node lab-tone-${data.tone} ${data.active?'lab-node-active':''} ${data.muted?'lab-node-muted':''} ${data.support?'lab-node-support':''}`}><Icon size={19}/><strong>{data.label}</strong><small>{nodeDefinitions[data.caption]?.caption}</small>{(['t','r','b','l'] as const).flatMap((side,index)=>[<Handle key={side+'s'} id={side+'-s'} type="source" position={[Position.Top,Position.Right,Position.Bottom,Position.Left][index]}/>,<Handle key={side+'t'} id={side+'-t'} type="target" position={[Position.Top,Position.Right,Position.Bottom,Position.Left][index]}/>])}</div>;
}
function ArchitectureEdge(props:EdgeProps){
 let [path,labelX,labelY]=getSmoothStepPath(props);
 if(props.id==='observation-context'){
  const floor=props.sourceY+55;const left=props.targetX-22;
  path=`M${props.sourceX} ${props.sourceY} V${floor-16} Q${props.sourceX} ${floor} ${props.sourceX-16} ${floor} H${left+16} Q${left} ${floor} ${left} ${floor-16} V${props.targetY+16} Q${left} ${props.targetY} ${left+16} ${props.targetY} H${props.targetX}`;
  labelX=(props.sourceX+props.targetX)/2;labelY=floor;
 }
 if(props.id==='decision-outputGuard'){
  const ceiling=props.targetY-58;
  path=`M${props.sourceX} ${props.sourceY} V${ceiling+16} Q${props.sourceX} ${ceiling} ${props.sourceX+16} ${ceiling} H${props.targetX-16} Q${props.targetX} ${ceiling} ${props.targetX} ${ceiling+16} V${props.targetY}`;
  labelX=(props.sourceX+props.targetX)/2;labelY=ceiling;
 }
 return <><BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} label={props.label} labelX={labelX} labelY={labelY} labelStyle={props.labelStyle} labelBgStyle={props.labelBgStyle} labelBgPadding={[5,4]}/>{props.data?.moving&&<circle className="lab-signal" r="3.5" fill="#6de0c8"><animateMotion dur="1s" repeatCount="indefinite" path={path}/></circle>}</>;
}
const nodeTypes={architecture:ArchitectureNode};const edgeTypes={architecture:ArchitectureEdge};
const links=[
 ['user','inputGuard','r','l',''],['inputGuard','context','b','t','通过'],['context','model','r','l','输入'],['model','decision','r','l','建议'],
 ['decision','tool','t','l','动作'],['tool','observation','b','t','结果'],['observation','context','b','l','反馈进入下一次循环'],
 ['decision','outputGuard','t','t','结束或追问'],['outputGuard','answer','b','t','交付'],
 ['memory','context','t','b','历史'],['skill','context','t','b','说明'],
];

export function ArchitectureLab(){
 const [scenarioId,setScenarioId]=useState<ScenarioId>('complete');const [step,setStep]=useState(0);const [playing,setPlaying]=useState(false);const [showSources,setShowSources]=useState(true);const [inspected,setInspected]=useState<string|null>(null);const reduced=useReducedMotion();
 const flowRef=useRef<ReactFlowInstance<LabNode>>(null);
 function fitDiagram(){void flowRef.current?.fitBounds({x:-40,y:-64,width:1052,height:575},{padding:.04,duration:0})}
 const frames=useMemo(()=>framesFor(scenarioId),[scenarioId]);const frame=frames[step];const scenario=scenarios.find(s=>s.id===scenarioId)!;const selected=inspected??frame.node;const finished=step===frames.length-1;
 useEffect(()=>{if(!playing)return;const timer=setTimeout(()=>{if(step>=frames.length-1)setPlaying(false);else setStep(value=>value+1)},1550);return()=>clearTimeout(timer)},[playing,step,frames.length]);
 function choose(id:ScenarioId){setScenarioId(id);setStep(0);setPlaying(false);setInspected(null)}
 function inspect(id:string){setInspected(id);setPlaying(false)}
 const nodes:LabNode[]=useMemo(()=>positions.filter(p=>showSources||!p.support).map(p=>({id:p.id,type:'architecture',position:{x:p.x,y:p.y},style:{width:142,height:82},data:{label:nodeDefinitions[p.id].label,caption:p.id,active:p.id===selected,muted:scenarioId==='missing'&&p.id==='memory',support:!!p.support,tone:nodeDefinitions[p.id].tone},draggable:false,connectable:false,ariaLabel:`${nodeDefinitions[p.id].label}，查看作用`})),[selected,scenarioId,showSources]);
 const edges:Edge[]=useMemo(()=>links.filter(([source])=>showSources||!['memory','skill'].includes(source)).map(([source,target,from,to,label])=>{const active=step>0&&frames[step-1].node===source&&frame.node===target;return {id:source+'-'+target,type:'architecture',source,target,sourceHandle:from+'-s',targetHandle:to+'-t',label,data:{moving:playing&&active&&!reduced},style:{stroke:active?'#6de0c8':'#4a617c',strokeWidth:active?2.4:1.3,strokeDasharray:['memory','skill'].includes(source)?'5 5':undefined},markerEnd:{type:MarkerType.ArrowClosed,color:active?'#6de0c8':'#6a819b'},labelStyle:{fill:'#acc0d8',fontSize:12},labelBgStyle:{fill:'#111e31'}}}),[step,frame.node,frames,showSources,playing,reduced]);
 return <figure className="architecture-lab"><header className="lab-heading"><div><span className="lab-heading-indicator"/><strong>Agent 架构演示</strong></div><span>教学情境 · 示例数据</span></header><div className="lab-layout"><aside className="lab-scenarios"><h3>选择一个情境</h3><div className="lab-scenario-list">{scenarios.map(s=><button key={s.id} aria-pressed={scenarioId===s.id} onClick={()=>choose(s.id)}><strong>{s.title}</strong><span>{s.description}</span></button>)}</div><div className="lab-request"><h4>本轮用户输入</h4><p>那明天呢？</p><h4>可用的历史信息</h4><p>{scenario.history}</p></div><label className="lab-source-toggle"><input type="checkbox" checked={showSources} onChange={e=>setShowSources(e.target.checked)}/>显示记忆与 Skills</label><div className="lab-controls"><button className="lab-play" onClick={()=>{setInspected(null);if(finished)setStep(0);setPlaying(!playing)}}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'暂停运行':finished?'重新播放':'播放运行'}</button><div><button aria-label="下一步演示" disabled={finished} onClick={()=>{setPlaying(false);setInspected(null);setStep(n=>Math.min(n+1,frames.length-1))}}><SkipForward size={16}/>下一步</button><button aria-label="重置架构演示" onClick={()=>{setStep(0);setPlaying(false);setInspected(null)}}><RotateCcw size={15}/>重置</button></div></div></aside><div className="lab-main"><div className="lab-canvas-scroll"><div className="lab-flow" onKeyDownCapture={event=>{if(event.key!=='Enter'&&event.key!==' ')return;const id=(event.target as HTMLElement).closest<HTMLElement>('.react-flow__node')?.dataset.id;if(id){event.preventDefault();inspect(id)}}}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onInit={instance=>{flowRef.current=instance;requestAnimationFrame(fitDiagram)}} autoPanOnNodeFocus={false} minZoom={.5} maxZoom={1.4} onNodeClick={(_,node)=>inspect(node.id)} nodesDraggable={false} nodesConnectable={false} edgesFocusable={false} zoomOnScroll={false} zoomOnDoubleClick={false} preventScrolling={false} className="dark"><Background color="#26364d" gap={24} size={1}/><Controls showInteractive={false} showFitView={false}/></ReactFlow><button className="lab-fit-button" aria-label="恢复完整架构图" onClick={fitDiagram}><Maximize2 size={14}/>完整结构</button></div></div><div className="lab-current-step"><span>{inspected?'查看组件':`第 ${step+1} / ${frames.length} 步`}</span><strong>{nodeDefinitions[selected].label}</strong>{inspected&&<button onClick={()=>setInspected(null)}>返回当前步骤</button>}<p>{inspected?nodeDefinitions[selected].definition:frame.explanation}</p></div></div></div><figcaption className="lab-record"><span>{inspected?'组件作用':'当前示例记录'}</span><p>{inspected?nodeDefinitions[selected].definition:frame.record}</p><span className="lab-mobile-hint">可在图内左右滑动</span></figcaption></figure>;
}
