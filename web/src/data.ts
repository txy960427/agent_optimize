export type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type Verdict = '' | 'yes' | 'no' | 'unknown';
export type Answer = Exclude<Verdict, ''> | 'na';
export type Criterion = 'complete' | 'precise' | 'consistent';
export type Message = { role: string; content: string };
export interface ObjectDef { id: string; name: string; definition: string; purpose: string; course: string; group?: boolean }
export const objects: ObjectDef[] = [
  {id:'system', name:'智能体系统', definition:'由模型、组织与执行机制及运行环境共同构成的任务系统。', purpose:'把用户请求转化为可执行的任务，并根据执行反馈完成交付。',course:'runtime',group:true},
  {id:'model',name:'模型',definition:'根据实际收到的上下文，生成判断、回答或动作建议的模型。',purpose:'理解任务、选择下一步，并组织输出。',course:'model',group:true},
  {id:'selection',name:'选型与替换',definition:'在统一任务和约束下比较候选模型。',purpose:'找到基础能力、响应速度和部署成本合适的模型。',course:'model'},
  {id:'training',name:'训练与能力提升',definition:'通过训练调整模型参数，适配任务能力或业务判断习惯。',purpose:'在基础能力已确认的前提下，改善特定任务表现。',course:'model'},
  {id:'quantization',name:'量化压缩',definition:'通过降低数值精度或压缩模型降低推理资源需求。',purpose:'在可接受的效果范围内改善速度、内存和部署成本。',course:'model'},
  {id:'harness',name:'Harness',definition:'围绕模型组织信息、调度动作并管理任务状态的机制。',purpose:'准备输入、校验和执行动作，把结果反馈给后续调用。',course:'context',group:true},
  {id:'prompt',name:'Prompt',definition:'为当前任务提供的角色、规则、约束和指令。',purpose:'让模型清楚任务要求及行为边界。',course:'context'},
  {id:'skill',name:'Skill',definition:'具有适用条件、操作步骤和所需资源的任务说明。',purpose:'把业务流程组织成可以选择和执行的工作方法。',course:'decisions'},
  {id:'tool',name:'工具',definition:'供智能体调用的接口、函数或执行能力。',purpose:'查询信息、执行操作，并返回可核对的结果或错误。',course:'locate'},
  {id:'memory',name:'记忆',definition:'管理可在后续交互中使用的信息的机制。',purpose:'保存和取回任务历史、关键信息或偏好，为后续任务提供所需信息。',course:'context'},
  {id:'architecture',name:'架构设计',definition:'组件之间的信息组织、状态传递和执行控制方式。',purpose:'协调上下文组装、任务编排、重试与结束条件。',course:'runtime'},
  {id:'environment',name:'运行环境与安全监测',definition:'任务执行所依赖的资源、环境和监测机制。',purpose:'提供执行条件，观察异常，并在需要时预警或拦截。',course:'decisions',group:true},
  {id:'sandbox',name:'仿真与沙箱',definition:'可控制条件的运行与验证环境。',purpose:'隔离影响、复现行为，检验资源与配置。',course:'verify'},
  {id:'monitoring',name:'运行状态观测',definition:'对执行过程、资源和异常状态的记录与展示。',purpose:'让过程可见、异常可追溯。',course:'runtime'},
  {id:'safety',name:'安全监督',definition:'针对风险行为的监测、校验、预警与拦截机制。',purpose:'使高风险动作遵守既定边界并留下可查记录。',course:'decisions'},
  {id:'support',name:'跨对象改进与支撑',definition:'为多个优化对象提供联合调整、适配与验证的支撑机制。',purpose:'使跨对象改动、反馈适配与效果验证形成可检查的改进过程。',course:'verify',group:true},
  {id:'collaboration',name:'协同优化',definition:'对多个组件配合方式进行有计划的联合调整。',purpose:'在单侧优化遇到瓶颈后，验证协同改进的收益。',course:'verify'},
  {id:'personalization',name:'个性化与自进化',definition:'利用反馈与用户差异持续适配行为的机制。',purpose:'使偏好、纠正和业务变化转化为可验证的改进。',course:'verify'},
  {id:'evaluation',name:'测评与数据飞轮',definition:'用任务、指标和反馈数据验证并推动改进的体系。',purpose:'知道改动是否有效，积累下一轮优化所需数据。',course:'verify'},
];
export const objectById = (id: string) => objects.find(o=>o.id===id) ?? objects[0];
export const phaseNames: Record<PhaseNumber,string> = {1:'请求接收与任务状态读取',2:'上下文准备与组装',3:'模型调用与返回',4:'动作校验、调度与执行',5:'结果处理与状态更新',6:'输出处理与交付'};
export const numerals: Record<PhaseNumber,string> = {1:'①',2:'②',3:'③',4:'④',5:'⑤',6:'⑥'};

// Source observations stay unchanged; loops and phase assignments are a separate reading map.
export interface Observation { id:string; traceId:string; parentObservationId:string|null; type:string; name:string; startTime:string; endTime:string|null; level:string; input:unknown; output:unknown; model?:string; statusMessage?:string|null; metadata:Record<string,unknown>; [key:string]:unknown }
export interface Loop {id:string;index:number;title:string;summary:string;phaseRecords:Partial<Record<PhaseNumber,string[]>>;anchorId?:string;owner?:string;modelIds?:string[];startTime?:string;endTime?:string|null}

export interface DecisionNode {id:string;title:string;description:string;yes:string;no:string;na?:string}
export const decisionNodes:DecisionNode[]=[
 {id:'H1',title:'本步需要的历史信息，正确取回来了吗？',description:'对照历史取回记录和结果。已取回后又在组装中丢失，需要继续检查传递过程。',yes:'H2',no:'@memory',na:'H2'},
 {id:'H2',title:'所需规则与 Skill 说明，正确组装进输入了吗？',description:'核对本次实际输入中的说明原文及适用版本。',yes:'H3',no:'@prompt',na:'H3'},
 {id:'H3',title:'Skill 的选择、调用顺序和步骤正确吗？',description:'结合适用条件与动作记录，不把“没有调用”直接等同于调用错误。',yes:'H4',no:'@skill',na:'H4'},
 {id:'H4',title:'工具执行过程和返回结果符合约定吗？',description:'检查参数、执行、结果以及异常反馈；若均符合，进一步检查组件间组织与控制。',yes:'@architecture',no:'@tool',na:'@architecture'},
 {id:'D2',title:'模型的判断、动作选择和性能满足要求吗？',description:'输入检查通过后，还需对照任务要求检查输出与动作，不能直接判模型有问题。',yes:'E1',no:'@model'},
 {id:'E1',title:'运行环境与安全监测正常吗？',description:'查看资源、配置、监控和约束执行情况。信息不足时保留待补，不自动通过。',yes:'@architecture',no:'@environment'},
];
export function deriveDecision(verdicts:Record<Criterion,Verdict>,answers:Record<string,Answer>) {
 const values=Object.values(verdicts); const input=values.includes('no')?'no':values.every(v=>v==='yes')?'yes':'unknown';
 const path:{id:string;answer:Answer}[]=[{id:'D1',answer:input}];
 if(input==='unknown')return {path,current:null,candidate:null,pending:true};
 let current=input==='yes'?'D2':'H1';
 for(let i=0;i<10;i++){
  if(current.startsWith('@'))return {path,current:null,candidate:current.slice(1),pending:false};
  const node=decisionNodes.find(n=>n.id===current)!;
  const answer=answers[current]; if(!answer)return {path,current,candidate:null,pending:false};
  path.push({id:current,answer});
  if(answer==='unknown')return {path,current:null,candidate:null,pending:true};
  current=answer==='na'?(node.na??node.yes):node[answer];
 }
 return {path,current:null,candidate:null,pending:true};
}

export interface Investigation {sourceVersion?:string;sourceFingerprint?:string;modelObservationId?:string;mappingConfirmed?:boolean;mappingOverrides?:Record<string,{loop:number;phase:PhaseNumber}|null>;manualLoops?:Loop[];references?:{observationId:string;field:string;path:string}[];id:string;traceId:string;contrastIds:string[];createdAt:string;updatedAt:string;stage:number;loop:number;phase:PhaseNumber;observationId?:string;method:'keyword'|'status'|'compare';keyword:string;symptom:string;expected:string;checks:Record<string,{verdict:Verdict;note:string}>;verdicts:Record<Criterion,Verdict>;notes:Record<Criterion,string>;answers:Record<string,Answer>;decisionNotes:Record<string,string>;pending:string;candidateLoops:number[];reviewRequired:boolean;verification:string;verificationResult:string;noIssue:boolean;history:string[]}
export function newInvestigation(traceId:string,contrastIds:string[],symptom:string,expected:string):Investigation {
 const now=new Date().toISOString();return {id:`inv-${crypto.randomUUID()}`,traceId,contrastIds,createdAt:now,updatedAt:now,stage:0,loop:1,phase:3,method:'keyword',keyword:'',symptom,expected,checks:{},verdicts:{complete:'',precise:'',consistent:''},notes:{complete:'',precise:'',consistent:''},answers:{},decisionNotes:{},pending:'',candidateLoops:[],reviewRequired:false,verification:'固定任务、模型和其他设置，只改一个候选对象；对比当前步骤与完整任务，并检查新异常。',verificationResult:'',noIssue:false,history:[]};
}
