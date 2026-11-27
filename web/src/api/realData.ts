import { useEffect, useState } from 'react';
import type { Loop, Observation, Investigation, PhaseNumber } from '../domain/data';
import { contentText as readContentText, messagesOf as readMessagesOf, recordText as readRecordText, roleOf as readRoleOf } from '../../../shared/read-message.mjs';
import type { Manifest } from '../../../shared/local-data';
import './contract';
export type { Manifest };
export type TraceSummary={id:string;sessionId:string;name:string;startTime:string;duration:number|null;input:string;output:string;inputSummaryTruncated:boolean;outputSummaryTruncated:boolean;observationCount:number;loopCount:number;generationCount:number;errorCount:number;warningCount:number;caseIds:string[];sources:string[];match?:{field:string;snippet:string}};
export type CaseReference={id:string;file:string;summary:string;traceIds:string[];analysis?:Record<string,unknown>|null};
export type RealTrace=TraceSummary&{rawInput:unknown;rawOutput:unknown;observations:Observation[];loops:Loop[];requestId:string;deliveryId:string;mapping:{requestIds:string[];deliveryIds:string[];containerIds:string[];unclassifiedIds:string[];version:string;confirmed:boolean;warnings:string[]};source:{version:string;fingerprint:string;platform:string;observationCount:number|null;origins:{file:string;index:number;fingerprint:string}[]};related:TraceSummary[];caseReferences:CaseReference[]};
export type TracePage={items:TraceSummary[];total:number;page:number;pages:number;pageSize:number;manifest:Manifest;cases:CaseReference[];coverage:{scope:string;scanned:number;timezone:string}};
export type SessionSummary={id:string;sessionId:string|null;traceCount:number;input:string;latest:string;errorCount:number;matched:{id:string;input:string;match?:{field:string;snippet:string}}[];caseIds:string[]};
export type SessionPage={items:SessionSummary[];total:number;page:number;pages:number;manifest:Manifest;cases:CaseReference[];coverage:TracePage['coverage']};
export type SessionDetail={id:string;traces:TraceSummary[];coverage:string};
const cache=new Map<string,RealTrace>();const pending=new Map<string,Promise<RealTrace>>();
export async function request<T>(path:string,signal?:AbortSignal):Promise<T>{const response=await fetch('/api/local-data/'+path,{signal});let data;try{data=await response.json()}catch{throw new Error('本地数据接口未返回JSON，请确认通过npm run dev或npm run preview启动。')}if(!response.ok)throw new Error(data.error??'读取导出数据失败');return data;}
export function cachedTrace(id:string){return cache.get(id)}
export function loadTrace(id:string,refresh=false):Promise<RealTrace>{if(!refresh&&cache.has(id))return Promise.resolve(cache.get(id)!);if(pending.has(id))return pending.get(id)!;const promise=request<RealTrace>('traces/'+encodeURIComponent(id)).then(trace=>{cache.set(id,trace);if(cache.size>8)cache.delete(cache.keys().next().value!);return trace}).finally(()=>pending.delete(id));pending.set(id,promise);return promise;}
export function useTrace(id:string){const [trace,setTrace]=useState<RealTrace|undefined>(()=>cache.get(id));const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);useEffect(()=>{let cancelled=false;setError('');setTrace(cache.get(id));if(!id)return;loadTrace(id,attempt>0).then(value=>{if(!cancelled)setTrace(value)}).catch(reason=>{if(!cancelled)setError(String(reason.message??reason))});return()=>{cancelled=true}},[id,attempt]);return {trace,error,retry:()=>setAttempt(n=>n+1)};}
export const recordText = (value: unknown) => readRecordText(value);
export const contentText = (value: unknown) => readContentText(value);
export const roleOf = (message: Record<string, unknown>) => readRoleOf(message);
export const messagesOf = (value: unknown) => readMessagesOf(value) as Record<string, unknown>[] | null;
export const localTime=(value:string,short=false)=>value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',...(short?{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}:{hour12:false})}):'未记录时间';
export function mappingFor(trace:RealTrace,inv:Investigation){
 const loops=[...trace.loops,...(inv.manualLoops??[])].map(l=>({...l,phaseRecords:Object.fromEntries(Object.entries(l.phaseRecords).map(([p,ids])=>[p,[...(ids??[])]])) as Loop['phaseRecords']}));
 const requestIds=[...trace.mapping.requestIds];const deliveryIds=[...trace.mapping.deliveryIds];let unclassifiedIds=[...trace.mapping.unclassifiedIds];
 for(const [id,assignment]of Object.entries(inv.mappingOverrides??{})){
  for(const list of [requestIds,deliveryIds,unclassifiedIds,...loops.flatMap(l=>Object.values(l.phaseRecords))]){if(!list)continue;const at=list.indexOf(id);if(at>=0)list.splice(at,1);}
  if(!assignment)unclassifiedIds.push(id);else if(assignment.phase===1)requestIds.push(id);else if(assignment.phase===6)deliveryIds.push(id);else{const loop=loops.find(l=>l.index===assignment.loop);if(loop)(loop.phaseRecords[assignment.phase]??=[]).push(id);else unclassifiedIds.push(id);}
 }
 for(const loop of loops)loop.modelIds=(loop.phaseRecords[3]??[]).filter(id=>trace.observations.some(o=>o.id===id&&o.type==='GENERATION'));
 return {loops,requestIds,deliveryIds,unclassifiedIds};
}
export function recordLocation(trace:RealTrace,inv:Investigation,id:string){const map=mappingFor(trace,inv);if(map.requestIds.includes(id))return {loop:1,phase:1 as PhaseNumber};if(map.deliveryIds.includes(id))return {loop:Math.max(1,map.loops.length),phase:6 as PhaseNumber};for(const l of map.loops)for(const [phase,ids]of Object.entries(l.phaseRecords))if(ids?.includes(id))return {loop:l.index,phase:Number(phase) as PhaseNumber};return null;}

export const contextGroups=[{id:'task',label:'任务与用户输入'},{id:'rules',label:'系统角色与规则'},{id:'tools',label:'工具与技能说明'},{id:'knowledge',label:'记忆与外部知识'},{id:'history',label:'会话历史与状态'},{id:'feedback',label:'工具调用与执行反馈'},{id:'unknown',label:'未分类或混合内容'}];
export function contextGroup(message:Record<string,unknown>,index:number,messages:Record<string,unknown>[]){
 const role=roleOf(message);let content=message.content??(message.kwargs as Record<string,unknown>|undefined)?.content;
 if(content&&typeof content==='object'&&!Array.isArray(content)){const c=content as Record<string,unknown>;if(c.type==='function'&&c.function||c.type==='tool'&&c.input_schema)return 'tools';}
 const name=String(message.name??'');if(/^(memory|retriev|knowledge)[._-]/i.test(name))return 'knowledge';
 if(role==='system')return 'rules';if(role==='user')return index===messages.map(roleOf).lastIndexOf('user')?'task':'history';
 const calls=message.tool_calls??(message.kwargs as Record<string,unknown>|undefined)?.tool_calls;if(role==='tool'||Array.isArray(calls)&&calls.length>0)return 'feedback';if(role==='assistant')return 'history';return 'unknown';
}
