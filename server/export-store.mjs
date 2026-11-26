import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const defaultDataDirectory=fileURLToPath(new URL('../data/',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const str=value=>typeof value==='string'?value:JSON.stringify(value)??'';
const clip=(value,max=900)=>value.length>max?value.slice(0,max)+'…':value;
export function roleOf(message){const role=message?.role??message?.type??message?.kwargs?.type??'';if(['user','human','HumanMessage'].includes(role)||message?.id?.at?.(-1)==='HumanMessage')return 'user';if(['assistant','ai','AIMessage'].includes(role)||message?.id?.at?.(-1)==='AIMessage')return 'assistant';return role;}
export function contentText(value){
 if(value==null)return '';if(typeof value==='string')return value;
 if(Array.isArray(value))return value.map(contentText).filter(Boolean).join('\n');
 if(typeof value==='object'){
  if(value.kwargs&&'content'in value.kwargs)return contentText(value.kwargs.content);
  if(value.data&&'content'in value.data)return contentText(value.data.content);
  if('text'in value)return contentText(value.text);
  if('content'in value)return contentText(value.content);
  return str(value);
 }return String(value);
}
export function messagesOf(value){return Array.isArray(value)?value:Array.isArray(value?.messages)?value.messages:[];}
function latest(value,role){const messages=messagesOf(value);for(let i=messages.length-1;i>=0;i--){const m=messages[i];if(roleOf(m)===role){const text=contentText(m.content??m.kwargs?.content??m.data?.content);if(text.trim())return text.trim();const calls=m.tool_calls??m.kwargs?.tool_calls;if(calls?.length)return '工具调用：'+calls.map(c=>c.name??c.function?.name??'未命名').join('、');}}return typeof value==='string'?value:'';}
function timestamp(o){return new Date(o.startTime??0).getTime()||0;}
export function mapTrace(trace){
 const observations=trace.observations??[];const byId=new Map(observations.map(o=>[o.id,o]));
 const ordered=[...observations].sort((a,b)=>timestamp(a)-timestamp(b)||String(a.id).localeCompare(String(b.id)));
 const anchors=ordered.filter(o=>o.type==='CHAIN'&&o.name==='model');
 const descendants=id=>{const found=[];for(const o of ordered){let current=o;const seen=new Set();while(current&&!seen.has(current.id)){seen.add(current.id);if(current.id===id){found.push(o);break;}current=byId.get(current.parentObservationId);}}return found;};
 const loops=anchors.map((o,index)=>({id:'mapped-loop:'+o.id,index:index+1,title:'模型决策 '+(index+1),summary:'以实际model节点及其子记录为边界；环节归类为待核对草稿。',anchorId:o.id,owner:byId.get(o.parentObservationId)?.name??'父记录未包含在导出中',startTime:o.startTime,endTime:o.endTime,modelIds:descendants(o.id).filter(r=>r.type==='GENERATION').map(r=>r.id),phaseRecords:{2:[],3:[],4:[],5:[]}}));
 const assigned=new Set();const requestIds=[];const deliveryIds=[];const containerIds=ordered.filter(o=>!o.parentObservationId).map(o=>o.id);
 function assign(records,target){for(const record of records)if(!assigned.has(record.id)&&!containerIds.includes(record.id)){assigned.add(record.id);target.push(record.id);}}
 loops.forEach((loop,index)=>assign(descendants(anchors[index].id),loop.phaseRecords[3]));
 for(const record of ordered){
  if(assigned.has(record.id)||containerIds.includes(record.id))continue;
  if(record.name?.endsWith('.before_agent')){assign(descendants(record.id),requestIds);continue;}
  if(record.name?.endsWith('.after_agent')){assign(descendants(record.id),deliveryIds);continue;}
  const siblings=anchors.map((anchor,index)=>({anchor,loop:loops[index]})).filter(x=>x.anchor.parentObservationId===record.parentObservationId);
  if(record.name?.endsWith('.before_model')){const next=siblings.find(x=>timestamp(x.anchor)>=timestamp(record));if(next)assign(descendants(record.id),next.loop.phaseRecords[2]);}
  else if(record.name?.endsWith('.after_model')||record.name==='tools'){
   const previous=siblings.filter(x=>timestamp(x.anchor)<=timestamp(record)).at(-1);
   if(previous)assign(descendants(record.id),previous.loop.phaseRecords[record.name==='tools'?4:3]);
  }
 }
 const unclassifiedIds=ordered.filter(o=>!assigned.has(o.id)&&!containerIds.includes(o.id)).map(o=>o.id);
 return {loops,requestIds,deliveryIds,containerIds,unclassifiedIds,version:'langgraph-export-mapping-v1',confirmed:false,warnings:[
  '循环来自实际model节点及其父子关系，编号用于阅读，不证明并行分支之间的因果关系。',
  'before_agent中的辅助模型调用归于接收/准备记录，不计入主Agent循环。',
  'after_model回调归于③模型处理；未单独记录的⑤不补造，可回查④输出与下一次②输入。',
  ...(loops.length?[]:['当前记录没有识别到主model节点，请使用原始树或人工补充映射。']),
  ...(unclassifiedIds.length?[`${unclassifiedIds.length}条记录暂未映射，保留在原始树中。`]:[]),
 ]};
}
export function createExportStore(dataDirectory=defaultDataDirectory){
 let cached;let pending;let signature='';
 async function load(){
  const names=(await fs.readdir(dataDirectory)).filter(n=>n.endsWith('.json')).sort((a,b)=>a==='traces.json'?-1:b==='traces.json'?1:a.localeCompare(b));
  if(!names.length)throw new Error('data目录中没有JSON导出文件。');
  const sources=await Promise.all(names.map(async name=>{const stat=await fs.stat(path.join(dataDirectory,name));return {name,bytes:stat.size,modifiedAt:stat.mtime.toISOString()};}));
  const nextSignature=hash(JSON.stringify(sources));
  if(cached&&signature===nextSignature)return cached;if(pending)return pending;
  pending=(async()=>{
   const records=new Map();const cases=[];const conflicts=[];
   for(const source of sources){
    const parsed=JSON.parse(await fs.readFile(path.join(dataDirectory,source.name),'utf8'));const traces=Array.isArray(parsed)?parsed:parsed.traces;
    if(!Array.isArray(traces))throw new Error(source.name+'不是可识别的Trace数组。');
    if(!Array.isArray(parsed)&&parsed.anomaly_id)cases.push({id:parsed.anomaly_id,file:source.name,summary:parsed.summary??'',traceIds:traces.map(t=>t.id),analysis:parsed.sop_conclusion??null});
    for(const [index,trace]of traces.entries()){
     if(!trace.id||!Array.isArray(trace.observations))throw new Error(source.name+'中存在缺少id或observations的Trace。');
     const serialized=JSON.stringify(trace);const fingerprint=hash(serialized);const previous=records.get(trace.id);
     if(previous){if(previous.fingerprint!==fingerprint)conflicts.push({id:trace.id,kept:previous.origins[0].file,alternative:source.name});previous.origins.push({file:source.name,index,fingerprint});continue;}
     records.set(trace.id,{raw:trace,fingerprint,origins:[{file:source.name,index,fingerprint}],mapping:mapTrace(trace)});
    }
   }
   const summaries=[...records.values()].map(entry=>{
    const t=entry.raw;const input=latest(t.input,'user');const output=latest(t.output,'assistant');const errors=t.observations.filter(o=>o.level==='ERROR').length;const warnings=t.observations.filter(o=>o.level==='WARNING').length;
    return {id:t.id,sessionId:t.sessionId??'',name:t.name??'',startTime:t.timestamp??t.observations[0]?.startTime??'',duration:Number.isFinite(t.latency)?t.latency:null,input:clip(input),output:clip(output),inputSummaryTruncated:input.length>900,outputSummaryTruncated:output.length>900,observationCount:t.observations.length,loopCount:entry.mapping.loops.length,generationCount:t.observations.filter(o=>o.type==='GENERATION').length,errorCount:errors,warningCount:warnings,caseIds:cases.filter(c=>c.traceIds.includes(t.id)).map(c=>c.id),sources:entry.origins.map(o=>o.file)};
   }).sort((a,b)=>b.startTime.localeCompare(a.startTime));
   const manifest={version:nextSignature,traceCount:records.size,sessionCount:new Set(summaries.map(t=>t.sessionId).filter(Boolean)).size,tracesWithoutSession:summaries.filter(t=>!t.sessionId).length,observationCount:[...records.values()].reduce((n,t)=>n+t.raw.observations.length,0),errorCount:summaries.reduce((n,t)=>n+t.errorCount,0),earliest:summaries.at(-1)?.startTime,latest:summaries[0]?.startTime,sources,conflicts,caseCount:cases.length,mode:'local-export'};
   cached={records,summaries,cases,manifest};signature=nextSignature;return cached;
  })();try{return await pending}finally{pending=undefined}
 }
 async function list(query){
  const store=await load();const q=(query.get('q')??'').trim().toLowerCase();const mode=query.get('mode')??'keyword';const scope=query.get('scope')??'summary';const selectedCase=query.get('case');const from=query.get('from');const to=query.get('to');const status=query.get('status');let hits=new Map();
  const items=store.summaries.filter(summary=>{
   if(selectedCase&&!summary.caseIds.includes(selectedCase))return false;
   if(status==='error'&&!summary.errorCount)return false;
   const localDay=new Date(new Date(summary.startTime).getTime()+8*3600000).toISOString().slice(0,10);if(from&&localDay<from||to&&localDay>to)return false;
   if(!q)return true;
   if(mode==='session')return summary.sessionId.toLowerCase()===q||summary.id.toLowerCase()===q;
   const raw=store.records.get(summary.id).raw;
   const fields=[['trace.id',raw.id],['trace.name',raw.name],['trace.input',raw.input],['trace.output',raw.output]];
   if(scope==='all')for(const o of raw.observations)fields.push([`observation:${o.id}.name`,o.name],[`observation:${o.id}.input`,o.input],[`observation:${o.id}.output`,o.output],[`observation:${o.id}.statusMessage`,o.statusMessage]);
   for(const [field,value]of fields){const text=str(value);const index=text.toLowerCase().indexOf(q);if(index>=0){hits.set(summary.id,{field,snippet:(index>60?'…':'')+text.slice(Math.max(0,index-60),index+q.length+100)+(index+q.length+100<text.length?'…':'')});return true;}}return false;
  });
  const finite=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Math.floor(Number(value)):fallback;const pageSize=Math.min(30,finite(query.get('pageSize'),15));const pages=Math.max(1,Math.ceil(items.length/pageSize));const page=Math.min(pages,finite(query.get('page'),1));
  return {items:items.slice((page-1)*pageSize,page*pageSize).map(t=>({...t,match:hits.get(t.id)})),total:items.length,page,pageSize,pages,manifest:store.manifest,cases:store.cases.map(({analysis,...c})=>c),coverage:{scope:scope==='all'?'Trace与全部Observation的名称、输入、输出和状态信息':'Trace的名称、原始输入与原始输出',scanned:store.summaries.length,timezone:'Asia/Shanghai'}};
 }
 async function detail(id){const store=await load();const entry=store.records.get(id);if(!entry)return null;const t=entry.raw;const summary=store.summaries.find(x=>x.id===id);return {...summary,rawInput:t.input,rawOutput:t.output,observations:t.observations,loops:entry.mapping.loops,requestId:entry.mapping.requestIds[0]??entry.mapping.containerIds[0]??'',deliveryId:entry.mapping.deliveryIds.at(-1)??entry.mapping.containerIds[0]??'',mapping:entry.mapping,source:{version:store.manifest.version,fingerprint:entry.fingerprint,origins:entry.origins,observationCount:t.observationCount??null,platform:'Langfuse JSON导出'},related:summary.sessionId?store.summaries.filter(x=>x.sessionId===summary.sessionId&&x.id!==id):[],caseReferences:store.cases.filter(c=>c.traceIds.includes(id))};}
 async function guideExample(){
  const store=await load();const c=store.cases.find(item=>item.file.includes('tool-arg-mismatch'));
  if(!c)return null;
  for(const id of c.traceIds){const entry=store.records.get(id);if(!entry)continue;
   for(const o of entry.raw.observations){const calls=o.type==='GENERATION'&&Array.isArray(o.output?.tool_calls)?o.output.tool_calls:[];
    const index=calls.findIndex(call=>call.name==='open_app'&&call.args?.appName!=null);if(index<0)continue;const call=calls[index];
    return {caseId:c.id,traceId:id,observationId:o.id,toolName:call.name,argumentKey:'appName',argumentValue:call.args.appName,fieldPath:`observation:${o.id}.output.tool_calls[${index}].args.appName`,sourceFile:entry.origins[0].file,caseFile:c.file};
   }
  }return null;
 }
 return {load,list,detail,guideExample};
}
