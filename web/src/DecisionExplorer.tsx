import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Controls, Handle, Position, MarkerType, BaseEdge, EdgeLabelRenderer, type EdgeProps, type Node, type NodeProps, type Edge } from '@xyflow/react';
import { useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, Check, CircleHelp, Database, FileText, GitBranch, Layers3, Network, Pause, Play, RotateCcw, ShieldCheck, Wrench } from 'lucide-react';
import { decisionNodes, deriveDecision, objectById, type Answer, type Criterion, type Verdict } from './data';

const questionLabels:Record<string,string>={D1:'模型输入齐全、精准、一致？',H1:'所需历史信息取回正确？',H2:'规则与Skill说明\n组装正确？',H3:'Skill选择、顺序\n与步骤正确？',H4:'工具执行与返回\n符合约定？',D2:'模型判断与性能满足要求？',E1:'环境与安全监测正常？'};
const questionIcons:Record<string,typeof BrainCircuit>={D1:FileText,H1:Database,H2:FileText,H3:Layers3,H4:Wrench,D2:BrainCircuit,E1:ShieldCheck};
const outcomeIds=['memory','prompt','skill','tool','model','environment','architecture'];
const positions:Record<string,{x:number;y:number;w:number;h:number}>={
 D1:{x:350,y:20,w:255,h:78},H1:{x:28,y:155,w:230,h:72},H2:{x:28,y:275,w:230,h:72},H3:{x:28,y:395,w:230,h:72},H4:{x:28,y:515,w:230,h:72},
 memory:{x:285,y:167,w:152,h:52},prompt:{x:285,y:287,w:152,h:52},skill:{x:285,y:407,w:152,h:52},tool:{x:285,y:527,w:152,h:52},
 D2:{x:500,y:155,w:238,h:72},model:{x:500,y:287,w:225,h:62},E1:{x:755,y:287,w:225,h:72},environment:{x:755,y:435,w:225,h:62},architecture:{x:490,y:610,w:260,h:58},
};
const pairs=[
 ['D1','H1','否','no','t'],['D1','D2','是','yes','t'],
 ['H1','memory','否','r','l'],['H1','H2','是','b','t'],['H2','prompt','否','r','l'],['H2','H3','是','b','t'],['H3','skill','否','r','l'],['H3','H4','是','b','t'],['H4','tool','否','r','l'],['H4','architecture','是','b','l'],
 ['D2','model','否','b','t'],['D2','E1','是','r','t'],['E1','environment','否','b','t'],['E1','architecture','是','l','t'],
];
const evidence:Record<string,string[]>={
 D1:['本次模型调用的完整实际输入，保留角色、顺序与版本。','对照任务要求，逐项核对齐全、精准、一致；历史中存在不等于本次已经收到。'],
 H1:['该步骤需要跨轮次使用哪些历史信息？','核对记忆取回请求、返回原文与实际输入；已取回后丢失，继续查组装与状态传递。'],
 H2:['核对任务要求、规则、Skill说明原文和适用版本。','说明是否清楚、完整并进入本次输入，不能只看配置页或摘要。'],
 H3:['对照Skill的适用条件、步骤与实际调用记录。','检查选择、顺序与覆盖范围；没有调用不自动等于调用错误。'],
 H4:['核对工具请求参数、执行过程、返回结果和异常反馈。','检查约定是否清楚，以及反馈是否正确进入后续处理。'],
 D2:['在输入已核对的条件下，对照模型输出、动作选择与业务标准。','观察可重复表现、时延和资源要求；一次失败不足以决定训练或换模型。'],
 E1:['检查环境配置、资源监控、运行日志与告警。','资源是否可用、状态是否可见、安全约束是否按要求执行；没有记录不等于正常。'],
};
const names:Record<Answer,string>={yes:'是',no:'否',unknown:'证据不足',na:'不适用'};
type DiagramData={label:string;outcome:boolean;current:boolean;visited:boolean;inspected:boolean;tone:string};
type DiagramNode=Node<DiagramData>;
function DiagramNodeView({id,data}:NodeProps<DiagramNode>){
 const Icon=data.outcome?({model:BrainCircuit,environment:ShieldCheck,memory:Database,prompt:FileText,skill:Layers3,tool:Wrench}[id]??Network):questionIcons[id]??CircleHelp;
 return <div className={`decision-card ${data.outcome?'decision-outcome':'decision-question'} decision-tone-${data.tone} ${data.current?'is-current':''} ${data.visited?'is-visited':''} ${data.inspected?'is-inspected':''}`}>
   <Icon size={17}/><div><strong>{data.label}</strong>{data.outcome&&<span>候选 · 待验证</span>}</div>{data.visited&&!data.outcome&&<Check className="decision-card-check" size={13}/>}
   <Handle type="target" position={Position.Top} id="t"/><Handle type="target" position={Position.Left} id="l"/>
   {!data.outcome&&<><Handle type="source" position={Position.Bottom} id="b"/><Handle type="source" position={Position.Right} id="r"/><Handle type="source" position={Position.Left} id="l"/><Handle type="source" position={Position.Bottom} id="no" style={{left:'30%'}}/><Handle type="source" position={Position.Bottom} id="yes" style={{left:'70%'}}/></>}
 </div>;
}
const nodeTypes={decision:DiagramNodeView};
function ArchitectureReturnEdge(props:EdgeProps){
 const channel=props.sourceX-15;const bottom=props.targetY-28;const path=`M ${props.sourceX} ${props.sourceY} H ${channel} V ${bottom} H ${props.targetX} V ${props.targetY}`;
 return <><BaseEdge id={props.id} path={path} style={props.style} markerEnd={props.markerEnd}/><EdgeLabelRenderer><span className="decision-return-label" style={{transform:`translate(-50%,-50%) translate(${channel}px,${bottom-36}px)`}}>是</span></EdgeLabelRenderer></>;
}
const edgeTypes={architectureReturn:ArchitectureReturnEdge};
type DiagramProps={current?:string;selected?:string[];onPick?:(id:string)=>void;answers?:Record<string,Answer>;candidate?:string|null;inspected?:string};
export function DecisionDiagram({current,selected=[],onPick,answers={},candidate,inspected}:DiagramProps){
 const reduced=useReducedMotion();
 const nodes:DiagramNode[]=useMemo(()=>Object.entries(positions).map(([id,s])=>({id,type:'decision',position:{x:s.x,y:s.y},style:{width:s.w,height:s.h},data:{label:questionLabels[id]??objectById(id).name,outcome:outcomeIds.includes(id),current:id===current||id===candidate,visited:selected.includes(id),inspected:inspected===id,tone:id==='D1'||id==='D2'||id==='model'?'violet':id==='E1'||id==='environment'?'teal':'blue'},draggable:false,connectable:false,ariaLabel:`${outcomeIds.includes(id)?'候选对象':'判断问题'}：${questionLabels[id]??objectById(id).name}，查看说明`})),[current,selected.join('|'),candidate,inspected]);
 const edges:Edge[]=useMemo(()=>pairs.map(([source,target,label,sourceHandle,targetHandle])=>{
   const node=decisionNodes.find(item=>item.id===source);const answer=answers[source];const next=source==='D1'?(answer==='yes'?'D2':answer==='no'?'H1':null):answer==='na'?node?.na:answer==='yes'?node?.yes:answer==='no'?node?.no:null;
   const active=next===target||next==='@'+target||!answer&&selected.includes(source)&&(selected.includes(target)||candidate===target);
   return {id:`${source}-${target}`,source,target,sourceHandle,targetHandle,label:answer==='na'&&active?'不适用':label,type:source==='E1'&&target==='architecture'?'architectureReturn':'smoothstep',animated:active&&!reduced,markerEnd:{type:MarkerType.ArrowClosed,color:active?'#526ec0':'#aab8cc',width:16,height:16},style:{stroke:active?'#526ec0':'#acb9cc',strokeWidth:active?2.6:1.4,opacity:active?1:.8},labelStyle:{fontSize:13,fill:active?'#324f9c':'#556982',fontWeight:active?600:400},labelBgStyle:{fill:active?'#eaf0ff':'#f7f9fd'},labelBgPadding:[5,3],labelBgBorderRadius:3,pathOptions:{borderRadius:8,offset:18}};
 }),[answers,selected.join('|'),candidate,reduced]);
 return <div className="decision-graph-scroll" aria-label="优化方向完整决策图"><div className="decision-canvas decision-canvas-core" onKeyDownCapture={event=>{if(!['Enter',' '].includes(event.key))return;const id=(event.target as HTMLElement).closest<HTMLElement>('.react-flow__node')?.dataset.id;if(id){event.preventDefault();onPick?.(id)}}}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodeClick={(_,node)=>onPick?.(node.id)} fitView fitViewOptions={{padding:.025,maxZoom:1,minZoom:.88}} minZoom={.6} maxZoom={1.7} autoPanOnNodeFocus={false} nodesDraggable={false} nodesConnectable={false} edgesFocusable={false} zoomOnScroll={false} panOnScroll={false} zoomOnDoubleClick={false} preventScrolling={false}><Controls showInteractive={false}/></ReactFlow></div></div>;
}

const examples=[
 {id:'retrieval',title:'历史未取回',detail:'前文有设备号，本轮需要时没有取回。',answers:[['D1','no'],['H1','no']]},
 {id:'transfer',title:'取回后传递丢失',detail:'取回结果有设备号；后续传递丢失，其他检查未见异常。',answers:[['D1','no'],['H1','yes'],['H2','yes'],['H3','yes'],['H4','yes']]},
 {id:'model',title:'完整输入仍被忽略',detail:'正确设备号已经进入输入，模型在同类任务中仍反复忽略。',answers:[['D1','yes'],['D2','no']]},
] as const;
function routeFor(answers:Record<string,Answer>){
 if(!answers.D1)return {path:[] as {id:string;answer:Answer}[],current:'D1' as string|null,candidate:null as string|null,pending:false};
 const verdict:Verdict=answers.D1==='yes'?'yes':answers.D1==='no'?'no':'unknown';
 return deriveDecision({complete:verdict,precise:verdict,consistent:verdict} as Record<Criterion,Verdict>,answers);
}

export function DecisionExplorer({onLearn}:{onLearn:(id:string)=>void}){
 const reduced=useReducedMotion();const [answers,setAnswers]=useState<Record<string,Answer>>({});const [inspected,setInspected]=useState('D1');const [exampleId,setExampleId]=useState('retrieval');const [playing,setPlaying]=useState(false);
 const route=useMemo(()=>routeFor(answers),[answers]);const example=examples.find(item=>item.id===exampleId)!;const selected=route.path.map(item=>item.id);const currentNode=decisionNodes.find(item=>item.id===inspected);const isOutcome=outcomeIds.includes(inspected);const object=objectById(inspected);const canAnswer=inspected===route.current||selected.includes(inspected);const pendingId=route.pending?route.path.at(-1)?.id:undefined;
 useEffect(()=>{if(!playing||reduced)return;let index=0;const timer=window.setInterval(()=>{const [id,answer]=example.answers[index];const next=Object.fromEntries(example.answers.slice(0,index+1)) as Record<string,Answer>;setAnswers(next);const derived=routeFor(next);setInspected(derived.current??derived.candidate??id);index++;if(index>=example.answers.length)setPlaying(false)},2700);return()=>window.clearInterval(timer)},[playing,exampleId,reduced]);
 useEffect(()=>{if(reduced)setPlaying(false)},[reduced]);
 function reset(){setPlaying(false);setAnswers({});setInspected('D1')}
 function inspect(id:string){setPlaying(false);setInspected(id)}
 function answerAt(id:string,answer:Answer){const index=route.path.findIndex(item=>item.id===id);const keep=index>=0?route.path.slice(0,index):route.path;const next={...Object.fromEntries(keep.map(item=>[item.id,item.answer])),[id]:answer};setPlaying(false);setAnswers(next);const derived=routeFor(next);setInspected(derived.current??derived.candidate??id)}
 function back(){const previous=route.path.at(-1);if(!previous)return;setPlaying(false);setAnswers(Object.fromEntries(route.path.slice(0,-1).map(item=>[item.id,item.answer])));setInspected(previous.id)}
 return <div className="decision-explorer">
   <div className="decision-explorer-toolbar"><div><GitBranch size={17}/><strong>优化方向决策图</strong><span>点击节点查依据，按答案走分支</span></div><button onClick={reset}><RotateCcw size={14}/>重新判断</button></div>
   <div className="decision-example-bar"><label>设备号情境<select aria-label="设备号示例情境" value={exampleId} onChange={event=>{reset();setExampleId(event.target.value)}}>{examples.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><p>{example.detail}</p><button disabled={!!reduced} onClick={()=>{if(playing){setPlaying(false);return}setAnswers({});setInspected('D1');setPlaying(true)}} aria-pressed={playing}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'暂停示例':'演示这条路线'}</button></div>
   <DecisionDiagram current={route.current??undefined} selected={selected} answers={answers} candidate={route.candidate} inspected={inspected} onPick={inspect}/>
   <div className="decision-path-history" aria-label="本次教学判断路线"><span>当前路线</span>{!route.path.length?<p>从输入三标准开始，每个答案决定下一分支。</p>:route.path.map(item=><button key={item.id} onClick={()=>inspect(item.id)}><span>{questionLabels[item.id]}</span><strong>{names[item.answer]}</strong><ArrowRight size={12}/></button>)}{route.candidate&&<button onClick={()=>inspect(route.candidate!)} className="decision-path-candidate">候选：{objectById(route.candidate).name}</button>}</div>
   <section className={`decision-inspector ${isOutcome?'inspector-outcome':''}`} aria-label="决策节点说明与判断" aria-live="polite">
     <div className="decision-inspector-main"><div className="decision-inspector-heading">{isOutcome?<Network size={22}/>:<CircleHelp size={22}/>}<h3>{isOutcome?`${route.candidate===inspected?'候选方向':'对象说明'}：${object.name}`:inspected==='D1'?'本次模型输入是否齐全、精准、一致？':currentNode?.title}</h3></div>
       {isOutcome?<><p>{object.purpose}</p><p>{route.candidate===inspected?'它是优先核查方向，改动效果还需要对照与回归验证。':'沿对应判断分支可到达此对象；查看节点不会改变当前判断。'}</p>{inspected==='model'&&<dl className="decision-model-directions"><div><dt>基础能力不满足</dt><dd>比较模型选型与替换。</dd></div><div><dt>有能力，业务判断未对齐</dt><dd>评估业务训练与数据条件。</dd></div><div><dt>判断正确，资源成本受限</dt><dd>评估量化压缩并验证效果。</dd></div></dl>}<div className="decision-inspector-actions">{inspected==='model'&&<button onClick={()=>onLearn('model')}><BookOpen size={14}/>进入模型优化<ArrowUpRight size={13}/></button>}<a href="#/guide?section=map">查看对象地图<ArrowUpRight size={13}/></a></div></>:<><p>{inspected==='D1'?'三项都满足才走“是”；任一不满足走“否”；材料不足可以先停下补充。':currentNode?.description}</p><div className="decision-answer-buttons">{(['yes','no','unknown'] as Answer[]).map(answer=><button key={answer} disabled={!canAnswer} aria-pressed={answers[inspected]===answer} onClick={()=>answerAt(inspected,answer)}>{answer==='yes'?<Check size={15}/>:answer==='unknown'?<CircleHelp size={15}/>:<GitBranch size={15}/>}<span>{names[answer]}</span></button>)}{currentNode?.na&&<button disabled={!canAnswer} onClick={()=>answerAt(inspected,'na')} aria-pressed={answers[inspected]==='na'}>本任务不适用</button>}</div>{!canAnswer&&<button className="decision-return-current" onClick={()=>setInspected(route.current??pendingId??'D1')}>回到当前判断<ArrowRight size={13}/></button>}</>}
       {pendingId===inspected&&<p className="decision-evidence-gap" role="status">证据不足：先补齐本项材料，再继续。当前不生成候选对象。</p>}
     </div><aside className="decision-evidence"><h4>{isOutcome?'下一步验证':'需要核对的材料'}</h4><ul>{(isOutcome?['尽量固定其他条件，验证当前步骤和完整任务。','检查新异常；无改善时回查归因，记录实际结果。']:evidence[inspected]??[]).map(item=><li key={item}>{item}</li>)}</ul></aside>
   </section>
   <div className="decision-explorer-footer"><button onClick={back} disabled={!route.path.length}><ArrowLeft size={14}/>退回上一项</button><p>教学试走 · 情境取自总纲第6页；实际排查时，每个判断需有对应记录。</p></div>
   <details className="decision-text-routes"><summary>查看文字判断路线</summary><table className="simple-table"><thead><tr><th>判断问题</th><th>是</th><th>否</th></tr></thead><tbody>{['D1',...decisionNodes.map(item=>item.id)].map(id=>{const node=decisionNodes.find(item=>item.id===id);const targetName=(target:string)=>questionLabels[target]??objectById(target.replace('@','')).name;return <tr key={id}><th>{questionLabels[id]}</th><td>{targetName(node?.yes??'D2')}</td><td>{targetName(node?.no??'H1')}</td></tr>})}</tbody></table></details>
 </div>;
}
