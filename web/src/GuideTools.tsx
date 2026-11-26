import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,BookOpen,FileSearch,Printer,Search} from 'lucide-react';
import {chapters,prefaceSections} from './curriculum';
import {lessons} from './Course';
import {Modal} from './ui';

const normalized=(value:string)=>value.toLocaleLowerCase().replace(/\s+/g,'');
type Entry={id:string;title:string;location:string;terms:string;href?:string};
const lessonAliases:Record<string,string>={context:'上下文 Context 输入 Prompt 记忆',runtime:'Agent Loop Trace Observation 循环',locate:'定位 排障 异常 错误',decisions:'决策 归因 优化方向',model:'模型 训练 微调 量化 蒸馏'};
const entries:Entry[]=[
  {id:'outline-overview',title:'总览：优化对象与关系',location:'调优总纲',terms:'对象地图 模型 Harness 运行环境 跨对象改进 协同 个性化 测评 数据飞轮',href:'/guide?section=map'},
  ...chapters.map(chapter=>({id:'chapter-'+chapter.id,title:chapter.title,location:'第'+chapter.number+'章',terms:chapter.description+' '+chapter.topics.join(' '),href:chapter.href})),
  ...prefaceSections.flatMap(section=>[section,...(section.children??[])].map(item=>({id:'preface-'+item.id,title:item.title,location:'前言',terms:section.title,href:'/preface?section='+item.id}))),
  ...lessons.flatMap(lesson=>[{id:'lesson-'+lesson.id,title:lesson.title,location:lesson.id==='model'?'模型调优':'调优总纲',terms:lesson.intro+' '+(lessonAliases[lesson.id]??''),href:'/learn/'+lesson.id},...lesson.sections.map(section=>({id:lesson.id+'-'+section.id,title:section.title,location:lesson.title,terms:section.paragraphs.join(' ')+' '+(lessonAliases[lesson.id]??''),href:'/learn/'+lesson.id+'?section='+section.id}))]),
  {id:'practice',title:'排查工作台',location:'实际案例',terms:'Langfuse Session Trace 真实排查 工作台',href:'/cases'},
  {id:'saved',title:'我的排查记录',location:'实际案例',terms:'保存 继续 笔记',href:'/cases?view=saved'},
];

export function GuideTools({go}:{go:(path:string)=>void}){
  const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const field=useRef<HTMLInputElement>(null);const destination=useRef<string|null>(null);
  const results=useMemo(()=>{const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);return entries.filter(item=>terms.every(term=>normalized(item.title+' '+item.location+' '+item.terms).includes(normalized(term)))).sort((a,b)=>{if(!terms.length)return 0;const score=(item:Entry)=>terms.reduce((total,term)=>total+(normalized(item.title).includes(normalized(term))?5:0),item.href?1:0);return score(b)-score(a)}).slice(0,14)},[query]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setOpen(value=>!value)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
  useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>field.current?.focus());return()=>cancelAnimationFrame(frame)},[open]);
  useEffect(()=>{const expanded=new Map<HTMLDetailsElement,boolean>();const before=()=>{for(const item of document.querySelectorAll<HTMLDetailsElement>('.sop-text-alternative')){if(!expanded.has(item))expanded.set(item,item.open);item.open=true}};const after=()=>{expanded.forEach((value,item)=>{item.open=value});expanded.clear()};window.addEventListener('beforeprint',before);window.addEventListener('afterprint',after);return()=>{window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after)}},[]);
  function choose(entry:Entry){if(!entry.href)return;destination.current=entry.href;setOpen(false);setQuery('')}
  return <div className="guide-tools">
    <Modal open={open} onOpenChange={setOpen} onCloseAutoFocus={event=>{if(destination.current){event.preventDefault();const href=destination.current;destination.current=null;go(href)}}} title="查找章节" description="按章节名、主题或课程关键词定位，未补齐章节会标明状态。" trigger={<button className="guide-search-trigger" aria-label="查找章节"><Search size={16}/><span>查找章节</span><kbd>Ctrl K</kbd></button>}>
      <div className="guide-search-body"><label className="guide-search-field"><Search size={18}/><input ref={field} value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索章节、主题或关键词" aria-label="章节关键词" onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();const first=results.find(item=>item.href);if(first)choose(first)}if(event.key==='ArrowDown'){event.preventDefault();document.querySelector<HTMLButtonElement>('.guide-search-results button:not(:disabled)')?.focus()}}}/></label><div className="guide-search-results" aria-label="章节搜索结果">{results.length?results.map(entry=><button key={entry.id} disabled={!entry.href} onClick={()=>choose(entry)}><span className="guide-search-result-icon">{entry.location==='实际案例'?<FileSearch size={17}/>:<BookOpen size={17}/>}</span><span><strong>{entry.title}</strong><small>{entry.location}</small></span>{entry.href?<ArrowUpRight size={14}/>:<small className="guide-search-pending">待补充</small>}</button>):<p className="guide-search-empty">没有找到相关章节，试试更短的关键词。</p>}</div><p className="guide-search-help">Enter 打开首个可阅读结果 · Esc 关闭</p></div>
    </Modal>
    <button className="guide-print-button" onClick={()=>window.print()} aria-label="打印本页"><Printer size={16}/><span>打印本页</span></button>
  </div>;
}
