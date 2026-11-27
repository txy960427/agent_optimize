import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowUpRight, ChevronRight, Menu, X, CircleHelp, Check, Info } from 'lucide-react';
import { GuideMark } from '../components/GuideMark';
import { GuideTools } from './GuideTools';
import { HomeAtlas } from '../pages/home/HomeAtlas';
import { OutlineOverview } from '../pages/guide/OutlineOverview';
import { Preface } from '../pages/preface/Preface';
import { Sidebar } from './Sidebar';
import { Course } from '../pages/learn/Course';
import { Cases } from '../pages/cases/SessionCases';
import { Workbench } from '../pages/work/PracticeWorkbench';
import { PracticeHistory } from '../pages/work/PracticeDrawer';
import { Findings } from '../pages/work/Workbench';
import { type Investigation, newInvestigation } from '../domain/data';
import { cachedTrace } from '../api/realData';
import { activeReadingSection, READING_FOLLOW_SLACK, readingSectionMarkers } from './readingFollow';
import { isReadingRoute, locateReadingRoute, normalizeReadingRoute, readingFollowPaused } from './readingNavigation';
import { Button, Modal } from '../components/ui';

const STORE_KEY='agent-tuning-real-export-v1';
interface Stored {investigations:Investigation[];selectedObject:string;returnTo:string|null;positions:Record<string,number>}
function readStore():Stored{try{const data=JSON.parse(localStorage.getItem(STORE_KEY)??'null');if(data&&Array.isArray(data.investigations))return {positions:{},selectedObject:'system',returnTo:null,...data}}catch{/* Empty storage is a valid first visit. */}return {investigations:[],selectedObject:'system',returnTo:null,positions:{}}}
const initial=readStore();
export function App(){
 const [route,setRoute]=useState(normalizeReadingRoute(location.hash.slice(1)||'/'));const [investigations,setInvestigations]=useState(initial.investigations);const [selectedObject,setSelectedObject]=useState(initial.selectedObject);const [returnTo,setReturnTo]=useState(initial.returnTo);const [saved,setSaved]=useState<'saved'|'saving'|'error'>('saved');const [menu,setMenu]=useState(false);const [toast,setToast]=useState('');
 const [navigationRequest,setNavigationRequest]=useState(0);
 const currentPath=route.split('?')[0];
 const overlayNavigation=currentPath==='/'||/^\/(cases|work|findings)(\/|$)/.test(currentPath);
 const edgeTrigger=useRef<HTMLButtonElement>(null);
 const mobileTrigger=useRef<HTMLButtonElement>(null);
 const positions=useRef(initial.positions);const routeRef=useRef(route);const skipLocate=useRef(false);
 useEffect(()=>{
  const desktop=window.matchMedia('(min-width: 1100px)');
  const closeOnDesktop=()=>{if(desktop.matches)setMenu(false)};
  desktop.addEventListener('change',closeOnDesktop);
  return()=>desktop.removeEventListener('change',closeOnDesktop);
 },[]);
 useEffect(()=>{const canonical=normalizeReadingRoute(location.hash.slice(1)||'/');if(canonical!==(location.hash.slice(1)||'/'))history.replaceState(null,'','#'+canonical);const handler=()=>{positions.current[routeRef.current]=window.scrollY;const next=normalizeReadingRoute(location.hash.slice(1)||'/');if(next!==(location.hash.slice(1)||'/'))history.replaceState(null,'','#'+next);routeRef.current=next;setRoute(next);setMenu(false);};window.addEventListener('hashchange',handler);return()=>window.removeEventListener('hashchange',handler)},[]);
 useLayoutEffect(()=>{const skip=skipLocate.current;skipLocate.current=false;if(skip)return;const frame=requestAnimationFrame(()=>{const section=new URLSearchParams(route.split('?')[1]??'').get('section');if(isReadingRoute(route)||section)locateReadingRoute(route);else window.scrollTo({top:positions.current[route]??0,behavior:'instant'})});return()=>cancelAnimationFrame(frame)},[route,navigationRequest]);
 useEffect(()=>{const pathname=routeRef.current.split('?')[0];if(!isReadingRoute(pathname))return;let frame=0;const update=()=>{if(readingFollowPaused()){frame=requestAnimationFrame(update);return;}const main=document.getElementById('main');if(!main)return;const header=document.querySelector('.site-header')?.getBoundingClientRect().bottom??60;const atBottom=window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2;const id=activeReadingSection(readingSectionMarkers(main),header+READING_FOLLOW_SLACK,{atBottom,viewportBottom:window.innerHeight});const next=id?`${pathname}?section=${id}`:pathname;if(next===routeRef.current)return;skipLocate.current=true;history.replaceState(null,'','#'+next);routeRef.current=next;setRoute(next)};const onScroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update)};window.addEventListener('scroll',onScroll,{passive:true});return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',onScroll)}},[route.split('?')[0]]);
 useEffect(()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify({investigations,selectedObject,returnTo,positions:positions.current}));setSaved('saved')}catch{setSaved('error')}},[investigations,selectedObject,returnTo,route]);
 useEffect(()=>{const flush=()=>{positions.current[routeRef.current]=window.scrollY;try{localStorage.setItem(STORE_KEY,JSON.stringify({investigations,selectedObject,returnTo,positions:positions.current}))}catch{/* The visible save error keeps the current input available for export. */}};window.addEventListener('pagehide',flush);return()=>window.removeEventListener('pagehide',flush)},[investigations,selectedObject,returnTo]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer)},[toast]);
 function go(path:string){path=normalizeReadingRoute(path);if(path===route){positions.current[route]=0;setNavigationRequest(value=>value+1);return}positions.current[route]=window.scrollY;location.hash=path;}
 function repeatNavigation(event:MouseEvent<HTMLDivElement>){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[href^="#/"]');
  if(link&&link.getAttribute('href')===`#${route}`){event.preventDefault();setMenu(false);positions.current[route]=0;setNavigationRequest(value=>value+1)}
 }
 function update(id:string,patch:Partial<Investigation>){setInvestigations(prev=>prev.map(inv=>inv.id===id?{...inv,...patch,updatedAt:new Date().toISOString()}:inv))}
 function start(traceId:string,contrast:string[],symptom:string,expected:string){const inv=newInvestigation(traceId,contrast,symptom,expected);const trace=cachedTrace(traceId);inv.sourceVersion=trace?.source.version;inv.sourceFingerprint=trace?.source.fingerprint;setInvestigations(prev=>[inv,...prev]);setReturnTo(`/work/${inv.id}`);go(`/work/${inv.id}`)}
 function learn(course:string,inv?:Investigation){if(inv)setReturnTo(`/work/${inv.id}`);go(`/learn/${course}`)}
 const [pathname,query='']=route.split('?');const params=new URLSearchParams(query);const parts=pathname.split('/').filter(Boolean);const page=parts[0]??'home';const active=page==='cases'||page==='work'||page==='findings'?'cases':parts[1]==='model'?'model':'guide';const inv=investigations.find(i=>i.id===parts[1]);
 const isPractice=active==='cases';
 return <><a className="skip-link" href="#main" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus()}}>跳到正文</a><header className={`site-header ${overlayNavigation?'navigation-overlay':''} ${isPractice?'practice-header':''}`} inert={menu}><a href={isPractice?'#/cases':'#/'} className="brand" aria-label={isPractice?'调优定位实操首页':'AIC智能体优化技术指南首页'}><span className="brand-mark"><GuideMark/></span><span>{isPractice?'调优定位实操':'AIC智能体优化技术指南'}{isPractice&&<span className="brand-sub">langfuse</span>}</span></a><div className="header-right">{isPractice?<PracticeHistory initialOpen={params.get('view')==='saved'} investigations={investigations} onResume={id=>{setReturnTo(`/work/${id}`);go(`/work/${id}`)}}/>:<GuideTools go={go}/>}<Modal title="前端交互原型" description="工作台读取data目录中的实际Langfuse导出，当前不是实时查询。" trigger={<button className="prototype-tag"><span/>本地预览</button>}><div className="dialog-body"><p>实操工作台使用本地Langfuse JSON导出，保留原始ID、输入输出和父子关系。循环与六环节是本站生成的阅读映射草稿，需要人工核对。</p><p>判断与笔记保存在当前浏览器。课程原理图仍是教学演示。LLM辅助尚未配置，不展示预设建议。</p><div className="source-links"><a href="https://langfuse.com/docs/observability/data-model" target="_blank" rel="noreferrer">Langfuse 数据模型 <ArrowUpRight size={14}/></a><a href="https://langfuse.com/docs/observability/features/observation-types" target="_blank" rel="noreferrer">Observation 类型 <ArrowUpRight size={14}/></a></div></div></Modal><button ref={mobileTrigger} className="mobile-menu icon-btn" aria-controls="guide-sidebar" aria-expanded={menu} aria-label={menu?'关闭导航':'打开导航'} onClick={()=>setMenu(!menu)}>{menu?<X size={20}/>:<Menu size={20}/>}</button></div></header>
 <div onClick={repeatNavigation} className={`app-shell ${overlayNavigation?'navigation-overlay':''} ${isPractice?'practice-shell':''} ${menu?'nav-open':''}`}>
 {overlayNavigation&&<button ref={edgeTrigger} className="navigation-peek" hidden={menu} aria-label="展开全书目录" aria-controls="guide-sidebar" aria-expanded={menu} title="展开全书目录" onClick={()=>setMenu(true)}><ChevronRight size={17}/></button>}
 <Sidebar triggerRef={overlayNavigation?edgeTrigger:mobileTrigger} route={route} open={menu} onClose={()=>setMenu(false)} returnTo={returnTo}/><div className="app-content" inert={menu}>
 {page==='home'&&<HomeAtlas go={go}/>}
 {page==='preface'&&<Preface go={go}/>}
 {page==='guide'&&<OutlineOverview selectedObject={selectedObject} setSelectedObject={setSelectedObject} go={go} onLearn={learn}/>}
 {page==='learn'&&<Course key={parts[1]} id={parts[1]??'runtime'} sectionId={params.get('section')??undefined} go={go} returnTo={returnTo}/>}
 {page==='cases'&&<Cases go={go} params={params} investigations={investigations} onStart={start} onResume={id=>{setReturnTo(`/work/${id}`);go(`/work/${id}`)}}/>}
 {page==='work'&&inv&&<Workbench key={inv.id} inv={inv} update={patch=>update(inv.id,patch)} go={go} onLearn={course=>learn(course,inv)} saved={saved} notify={setToast}/>}
 {page==='findings'&&inv&&<Findings inv={inv} update={patch=>update(inv.id,patch)} go={go} onLearn={course=>learn(course,inv)} saved={saved} notify={setToast}/>}
 {(page==='work'||page==='findings')&&!inv&&<main id="main" className="not-found"><CircleHelp size={32}/><h1>没有找到这份排查记录</h1><p>记录可能来自其他浏览器，或尚未保存在本地。</p><Button onClick={()=>go('/cases')}>查找案例</Button></main>}
 </div></div>
 {toast&&<div className="toast" role="status"><Check size={17}/>{toast}</div>}
 {saved==='error'&&<div className="save-error" role="alert"><Info size={16}/>本地保存失败，当前输入仍保留在页面中。请先导出排查摘要。</div>}
 </>;
}

