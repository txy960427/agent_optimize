export type Chapter = {
  id: string;
  number: number;
  title: string;
  navTitle: string;
  description: string;
  topics: string[];
  href?: string;
  status: 'available' | 'intro' | 'planned';
};

export const chapters: Chapter[] = [
  {id:'preface',number:0,title:'前言',navTitle:'前言',description:'明确指南背景、目标、范围、职责与使用路径，建立团队的调优共识。',topics:['背景与目标','范围与职责','使用路径'],href:'/preface',status:'available'},
  {id:'outline',number:1,title:'Agent 调优技术总纲',navTitle:'调优技术总纲',description:'用三层职责与运行记录明确异常位置、归因依据和责任边界，再决定优化方向。',topics:['三层归因','定位方法','决策框架'],href:'/guide',status:'available'},
  {id:'harness',number:2,title:'Harness 调优技术',navTitle:'Harness 调优',description:'围绕提示词、上下文与记忆、工具与Skill、多Agent编排和安全护栏开展工程改进。',topics:['上下文与记忆','工具与Skill','编排与护栏'],status:'planned'},
  {id:'model',number:3,title:'模型调优技术',navTitle:'模型调优',description:'面向明确的能力缺口，逐步展开训练、蒸馏与端云协同；当前提供模型基础内容。',topics:['训练与适配','蒸馏与压缩','端云协同'],href:'/learn/model',status:'intro'},
  {id:'environment',number:4,title:'运行环境优化技术',navTitle:'运行环境优化',description:'界定运行环境、设备端工程与Harness、模型之间的归因边界，不展开具体环境工程优化。',topics:['归因边界','责任衔接','具体优化从略'],status:'planned'},
  {id:'evaluation',number:5,title:'测评技术',navTitle:'测评技术',description:'固定任务集、评估口径和版本，组织数据集、对照实验与回归验证，支撑数据飞轮。',topics:['统一口径','对照与回归','数据资产'],status:'planned'},
  {id:'conclusion',number:6,title:'总结',navTitle:'总结',description:'回顾核心原则、责任协作与落地路径，让调优经验持续沉淀并受控复用。',topics:['核心原则','落地路径','持续改进'],status:'planned'},
];

export type PrefaceSection = {id:string;title:string;children?:{id:string;title:string}[]};
export const prefaceSections:PrefaceSection[] = [
  {id:'background',title:'编写背景',children:[
    {id:'industry',title:'行业背景'},
    {id:'medical',title:'医疗场景的特殊性'},
    {id:'internal',title:'内部现状'},
    {id:'gaps',title:'四个不统一'},
  ]},
  {id:'principles',title:'编写目标与核心章节',children:[
    {id:'goals',title:'编写目标'},
    {id:'chapter-guide',title:'指南结构与章节导读'},
  ]},
  {id:'scope',title:'适用范围与使用方式',children:[
    {id:'applicability',title:'适用范围'},
    {id:'role-map',title:'分角色阅读地图'},
    {id:'reading',title:'三种使用路径'},
    {id:'collaboration',title:'内部协作 SOP（建议）'},
  ]},
  {id:'maintenance',title:'编写、评审与维护机制'},
  {id:'references',title:'引用'},
  {id:'supplement',title:'补充：Agent 怎样运行',children:[
    {id:'basics',title:'三层运行职责'},
    {id:'architecture',title:'架构教学演示'},
    {id:'loop',title:'理解运行循环'},
  ]},
];

export function chapterForPath(pathname:string){
  if(pathname.startsWith('/preface'))return 'preface';
  if(pathname==='/learn/model')return 'model';
  if(pathname==='/guide'||pathname.startsWith('/learn/'))return 'outline';
  return null;
}
