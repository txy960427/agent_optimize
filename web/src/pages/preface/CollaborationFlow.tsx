import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { BaseEdge, Handle, Position, ReactFlow, getSmoothStepPath, type Edge, type EdgeProps, type Node, type NodeProps } from '@xyflow/react';
import { Maximize2, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Modal } from '../../components/ui';

type Origin='developer'|'reviewer'|'tester';
type RouteId='environment'|'application'|'framework'|'plugin'|'llm'|'speech'|'embedding'|'specialist';
type FlowData={label:string;caption:string;tone:string;chosen:boolean;current:boolean;onPick:()=>void};
type FlowNode=Node<FlowData>;
type FlowEdge=Edge<{chosen:boolean;current:boolean;playing:boolean;kind?:'feedback'|'return'}>;
const origins:Record<Origin,{label:string;caption:string;report:string;material:string}>={
  developer:{label:'智能体开发者',caption:'平台应用 / BU应用',report:'调试发现异常',material:'问题描述 + Langfuse追踪码'},
  reviewer:{label:'智能体评审者',caption:'AIC / PO',report:'评审发现问题',material:'产品 / 架构评审问题清单'},
  tester:{label:'智能体测试者',caption:'测试团队',report:'测试发现问题',material:'测试报告 + Badcase记录'},
};
const routes:{id:RouteId;layer:string;category:string;label:string;caption:string;owner:string;explanation:string}[]=[
  {id:'environment',layer:'运行环境问题',category:'env',label:'容器 / 沙箱 / 工作流',caption:'运行环境',owner:'engineering',explanation:'运行承载与工程环境问题，分配给工程开发团队处理。'},
  {id:'application',layer:'运行环境问题',category:'env',label:'Skills挂载 / MCP工具',caption:'API等应用接入',owner:'application-team',explanation:'Skills挂载、MCP工具和API等接入问题，分配给应用开发团队处理。'},
  {id:'framework',layer:'Harness问题',category:'harness',label:'基线框架',caption:'运行支撑框架',owner:'framework-team',explanation:'Harness基线框架问题，分配给智能体框架团队处理。'},
  {id:'plugin',layer:'Harness问题',category:'harness',label:'算法特性插件',caption:'安全护栏 / 个性化',owner:'agent-plugin',explanation:'安全护栏、个性化等算法特性插件问题，分配给AIC智能体团队处理。'},
  {id:'llm',layer:'模型问题',category:'model',label:'LLM基座模型',caption:'模型基础能力',owner:'model-team',explanation:'LLM基座模型问题，分配给AIC大模型团队处理。'},
  {id:'speech',layer:'模型问题',category:'model',label:'ASR / TTS',caption:'语音小模型',owner:'model-team',explanation:'ASR/TTS语音小模型问题，分配给AIC大模型团队处理。'},
  {id:'embedding',layer:'模型问题',category:'model',label:'Embedding模型',caption:'向量表示模型',owner:'model-team',explanation:'Embedding模型问题，分配给AIC大模型团队处理。'},
  {id:'specialist',layer:'模型问题',category:'model',label:'专用小模型',caption:'意图 / 快速决策',owner:'agent-specialist',explanation:'意图、快速决策等专用小模型问题，分配给AIC智能体团队处理。'},
];
const ownerNames:Record<string,string>={engineering:'工程开发团队','application-team':'应用开发团队','framework-team':'智能体框架团队','agent-plugin':'AIC智能体团队','model-team':'AIC大模型团队','agent-specialist':'AIC智能体团队'};
const nodePositions:Record<string,[number,number,number,number]>={
  developer:[14,104,142,60],reviewer:[14,328,142,60],tester:[14,552,142,60],
  'report-developer':[192,104,146,60],'report-reviewer':[192,328,146,60],'report-tester':[192,552,146,60],
  analysis:[376,246,162,178],env:[574,87,108,56],harness:[574,263,108,56],model:[574,495,108,56],
  environment:[718,48,154,56],application:[718,124,154,56],framework:[718,224,154,56],plugin:[718,300,154,56],
  llm:[718,400,154,56],speech:[718,466,154,56],embedding:[718,532,154,56],specialist:[718,608,154,56],
  engineering:[914,48,148,56],'application-team':[914,124,148,56],'framework-team':[914,224,148,56],
  'agent-plugin':[914,300,148,56],'model-team':[914,466,148,56],'agent-specialist':[914,608,148,56],
  feedback:[390,716,220,34],
};

function SopNode({id,data}:NodeProps<FlowNode>){
  return <div className={`sop-node sop-node-${data.tone} ${data.chosen?'on-route':''} ${data.current?'is-current':''}`}>
    {id==='analysis'?<><Handle type="target" position={Position.Left} id="developer" style={{top:'22%'}}/><Handle type="target" position={Position.Left} id="reviewer" style={{top:'50%'}}/><Handle type="target" position={Position.Left} id="tester" style={{top:'78%'}}/><Handle type="source" position={Position.Right} id="env" style={{top:'22%'}}/><Handle type="source" position={Position.Right} id="harness" style={{top:'50%'}}/><Handle type="source" position={Position.Right} id="model" style={{top:'78%'}}/><Handle type="target" position={Position.Bottom} id="return"/></>:id==='feedback'?<><Handle type="target" position={Position.Right}/><Handle type="source" position={Position.Top}/></>:<><Handle type="target" position={Position.Left}/><Handle type="source" position={Position.Right}/></>}
    <button onClick={data.onPick} aria-pressed={data.current} aria-label={data.label+(data.caption?'：'+data.caption:'')} title={data.label+' · '+data.caption}><strong>{data.label}</strong>{data.caption&&<span>{data.caption}</span>}</button>
  </div>;
}
function SopEdge({id,sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,markerEnd,data}:EdgeProps<FlowEdge>){
  let path=getSmoothStepPath({sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,borderRadius:8,offset:18})[0];
  if(data?.kind==='feedback')path=`M${sourceX} ${sourceY}H1084Q1092 ${sourceY} 1092 ${sourceY+8}V726Q1092 733 1084 733H${targetX}`;
  if(data?.kind==='return')path=`M${sourceX} ${sourceY}H457V${targetY}`;
  const ink=data?.current?'#3d70bf':data?.chosen?'#809ac1':'#cbd3df';
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} style={{stroke:ink,strokeWidth:data?.chosen?1.8:1.2}}/>{data?.current&&data.playing&&<circle className="sop-flow-signal" r={3.5} fill="#4263cf"><animateMotion path={path} dur="1.5s" repeatCount="indefinite"/></circle>}</>;
}
const nodeTypes={sop:SopNode};const edgeTypes={sop:SopEdge};

export function CollaborationFlow(){
  const [origin,setOrigin]=useState<Origin>('developer');const [routeId,setRouteId]=useState<RouteId>('environment');
  const [step,setStep]=useState(0);const reduced=useReducedMotion();
  const [playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const surface=useRef<HTMLElement>(null);const [visible,setVisible]=useState(false);
  const route=routes.find(item=>item.id===routeId)!;
  const path=[origin,'report-'+origin,'analysis',route.category,route.id,route.owner,'feedback'];
  useEffect(()=>{if(reduced)setPlaying(false)},[reduced]);
  useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'80px'});if(surface.current)observer.observe(surface.current);return()=>observer.disconnect()},[]);
  useEffect(()=>{if(!playing||!visible||reduced)return;const timer=setInterval(()=>setStep(value=>(value+1)%7),1800);return()=>clearInterval(timer)},[playing,visible,reduced]);
  function pickRoute(id:RouteId){setRouteId(id);setStep(3);setPlaying(false)}
  function pickOrigin(id:Origin){setOrigin(id);setStep(0);setPlaying(false)}
  const nodes=useMemo<FlowNode[]>(()=>Object.entries(nodePositions).map(([id,[x,y,width,height]])=>{
    let label='',caption='',tone='source';let onPick=()=>{setPlaying(false);setStep(path.indexOf(id))};
    if(id in origins){const item=origins[id as Origin];label=item.label;caption=item.caption;onPick=()=>pickOrigin(id as Origin)}
    else if(id.startsWith('report-')){const source=id.slice(7) as Origin;label=origins[source].report;caption=origins[source].material;tone='report';onPick=()=>{pickOrigin(source);setStep(1)}}
    else if(id==='analysis'){label='共同分析与界定';caption='小U主owner\n+ AIC智能体团队\n输出技术指南';tone='analysis'}
    else if(['env','harness','model'].includes(id)){label=id==='env'?'运行环境问题':id==='harness'?'Harness问题':'模型问题';tone='category';onPick=()=>pickRoute(routes.find(item=>item.category===id)!.id)}
    else if(id==='feedback'){label='问题情况反馈';caption='';tone='feedback'}
    else if(id in ownerNames){label=ownerNames[id];caption='责任团队';tone=id.startsWith('agent-')?'agent':'team';onPick=()=>{const selected=route.owner===id?route:routes.find(item=>item.owner===id)!;pickRoute(selected.id);setStep(5)}}
    else{const item=routes.find(item=>item.id===id)!;label=item.label;caption=item.caption;tone='branch';onPick=()=>{pickRoute(item.id);setStep(4)}}
    return {id,type:'sop',position:{x,y},style:{width,height},draggable:false,connectable:false,focusable:false,data:{label,caption,tone,chosen:path.includes(id),current:path[step]===id,onPick}};
  }),[origin,routeId,step]);
  const edges=useMemo<FlowEdge[]>(()=>{
    const links:{source:string;target:string;sourceHandle?:string;targetHandle?:string;kind?:'feedback'|'return'}[]=[];
    for(const source of Object.keys(origins)){links.push({source,target:'report-'+source},{source:'report-'+source,target:'analysis',targetHandle:source})}
    for(const category of ['env','harness','model'])links.push({source:'analysis',target:category,sourceHandle:category});
    for(const item of routes)links.push({source:item.category,target:item.id},{source:item.id,target:item.owner});
    for(const owner of Object.keys(ownerNames))links.push({source:owner,target:'feedback',kind:'feedback'});
    links.push({source:'feedback',target:'analysis',targetHandle:'return',kind:'return'});
    return links.map(link=>{
      const chosen=path.includes(link.source)&&path.includes(link.target);
      const current=chosen&&(path[step]===link.source||link.kind==='return'&&step===6);
      return {...link,id:link.source+'-'+link.target,type:'sop',zIndex:chosen?2:0,data:{chosen,current,playing:playing&&visible&&!reduced,kind:link.kind},markerEnd:{type:'arrowclosed' as const,width:14,height:14,color:chosen?'#809ac1':'#cbd3df'}};
    });
  },[origin,routeId,step,playing,visible,reduced]);
  const explanations=[
    `${origins[origin].label}在${origins[origin].caption}中发现问题。`,
    `上报时携带${origins[origin].material}，让问题能够被回查。`,
    '小U主owner与AIC智能体团队共同分析界定，明确问题所属层级，并输出技术指南。',
    `本条路线按“${route.layer}”进入定位与分配。`,
    `进一步区分为“${route.label}”：${route.explanation}`,
    `${ownerNames[route.owner]}负责处理所分配的问题。其他分支的职责仍可在图中查看。`,
    '解决情况反馈给小U主owner与AIC智能体团队，继续复核与闭环。',
  ];
  const stages=['发现问题','上报材料','共同分析','定位与分配','定位与分配','责任团队处理','解决与反馈'];
  return <figure ref={surface} className="collaboration-flow" aria-label="内部协作SOP交互流程图">
    <div className="sop-toolbar"><div className="sop-route-fields"><label>问题来源<select aria-label="问题来源" value={origin} onChange={event=>pickOrigin(event.target.value as Origin)}>{Object.entries(origins).map(([id,item])=><option key={id} value={id}>{item.label}</option>)}</select></label><label>分配路线<select aria-label="分配路线" value={routeId} onChange={event=>pickRoute(event.target.value as RouteId)}>{['运行环境问题','Harness问题','模型问题'].map(layer=><optgroup key={layer} label={layer}>{routes.filter(item=>item.layer===layer).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}</select></label></div><div className="sop-playback"><button onClick={()=>setPlaying(value=>!value)} aria-label={playing?'暂停协作路线':'播放协作路线'} aria-pressed={playing}>{playing?<Pause size={14}/>:<Play size={14}/>}<span>{playing?'暂停':'播放'}</span></button><button aria-label="下一步协作" onClick={()=>{setPlaying(false);setStep(value=>(value+1)%7)}}><SkipForward size={15}/></button><button aria-label="重置协作路线" onClick={()=>{setPlaying(false);setStep(0)}}><RotateCcw size={14}/></button></div></div>
    <div className="sop-scroll-hint">左右滑动查看完整流程，点击分支可切换路线。</div>
    <div className="sop-scroll-region" role="region" aria-label="协作路线画布" tabIndex={0}><div className="sop-canvas"><div className="sop-column-headings" aria-hidden="true"><span>问题的发现</span><span>问题的上报</span><span>分析与界定</span><span>定位与分配</span><span>解决与反馈</span></div><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultViewport={{x:0,y:0,zoom:1}} minZoom={1} maxZoom={1} nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} preventScrolling={false}/></div></div>
    <figcaption className="sop-current-step" aria-live={playing?'off':'polite'}><span>{stages[step]}</span><p>{explanations[step]}</p></figcaption>
    <div className="sop-footer"><span>协作路线示意 · 按原图职责分流</span><Modal title="内部协作 SOP（原图）" description="保留提供的原图，便于对照协作流程与责任分配。" trigger={<button className="preface-figure-open"><Maximize2 size={13}/>查看原图</button>}><div className="preface-image-detail"><img src="/images/internal-collaboration-sop.png" alt="内部协作SOP原图" width={1100} height={627}/></div></Modal></div>
    <details className="sop-text-alternative"><summary>查看责任分配文字版</summary><table className="simple-table"><thead><tr><th scope="col">问题层级</th><th scope="col">定位对象</th><th scope="col">责任团队</th></tr></thead><tbody>{routes.map(item=><tr key={item.id}><td>{item.layer}</td><td>{item.label}</td><td>{ownerNames[item.owner]}</td></tr>)}</tbody></table><p>各责任团队处理后，将问题情况反馈至小U主owner与AIC智能体团队。</p></details>
  </figure>;
}
