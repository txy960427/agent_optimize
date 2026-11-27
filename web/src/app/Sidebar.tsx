import { useEffect, useRef, useState, type RefObject } from 'react';
import { ChevronRight, FileSearch, House, X } from 'lucide-react';
import { lessons } from '../domain/lessons';
import { chapters, chapterForPath, prefaceSections } from '../domain/curriculum';

const names:Record<string,string>={runtime:'看懂一次运行',locate:'定位异常',context:'核对模型输入',decisions:'判断优化方向',verify:'验证与建设',case:'完整案例'};
export function Sidebar({route,open,onClose,returnTo,triggerRef}:{route:string;open:boolean;onClose:()=>void;returnTo:string|null;triggerRef:RefObject<HTMLButtonElement|null>}){
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});const pathname=route.split('?')[0];const selectedSection=new URLSearchParams(route.split('?')[1]??'').get('section');const activeLesson=pathname==='/guide'?'overview':pathname.split('/')[2];const activeChapter=chapterForPath(pathname);
 const isExpanded=(id:string)=>expanded[id]??(activeChapter===id||activeLesson===id);
 const toggle=(id:string)=>setExpanded(previous=>({...previous,[id]:!isExpanded(id)}));
 const practice=pathname.startsWith('/cases')||pathname.startsWith('/work')||pathname.startsWith('/findings');
 const directory=useRef<HTMLElement>(null);
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(!open)return;
  const previous=triggerRef.current;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const focusable=()=>Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')??[])
   .filter(element=>element.getClientRects().length>0);
  focusable()[0]?.focus();
  const handleKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();return}
   if(event.key!=='Tab')return;
   const items=focusable(),first=items[0],last=items.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  };
  document.addEventListener('keydown',handleKey);
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',handleKey);if(previous?.isConnected)previous.focus()};
 },[open]);
 const prefaceGroupId=pathname==='/preface'?prefaceSections.find(section=>section.id===selectedSection||section.children?.some(child=>child.id===selectedSection))?.id:'';
 useEffect(()=>{setExpanded(previous=>{const next={...previous};for(const chapter of chapters)next[chapter.id]=chapter.id===activeChapter;for(const lesson of lessons)next[lesson.id]=lesson.id===activeLesson;next.overview=activeLesson==='overview';return next})},[activeChapter,activeLesson]);
 useEffect(()=>{setExpanded(previous=>{const next={...previous};for(const section of prefaceSections){if(section.children)next['preface-'+section.id]=section.id===prefaceGroupId}return next})},[prefaceGroupId]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{const nav=directory.current;const selected=nav?.querySelector<HTMLElement>('[aria-current="location"]')??nav?.querySelector<HTMLElement>('[aria-current="page"]');if(!nav||!selected)return;const bounds=nav.getBoundingClientRect();const item=selected.getBoundingClientRect();if(item.top<bounds.top)nav.scrollTop-=bounds.top-item.top+8;else if(item.bottom>bounds.bottom)nav.scrollTop+=item.bottom-bounds.bottom+8});return()=>cancelAnimationFrame(frame)},[route,expanded]);
 return <><button className={`app-nav-backdrop ${open?'visible':''}`} aria-label="关闭目录遮罩" onClick={onClose} tabIndex={open?0:-1}/><aside ref={panel} id="guide-sidebar" role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label="全书目录与实操" className={`app-sidebar ${open?'mobile-open':''}`}><div className="sidebar-mobile-title"><strong>全书目录与实操</strong><button className="icon-btn" aria-label="关闭目录" onClick={onClose}><X size={18}/></button></div><nav ref={directory} aria-label="固定课程导航"><a href="#/" className={`sidebar-link sidebar-home ${pathname==='/'?'active':''}`} aria-current={pathname==='/'?'page':undefined}><House size={15}/><span>首页</span></a><div className="sidebar-section-divider"/>{chapters.map(chapter=><div className={`sidebar-chapter ${activeChapter===chapter.id?'chapter-current':''}`} data-chapter={chapter.id} key={chapter.id}><div className="sidebar-chapter-row"><span aria-hidden="true" className="sidebar-chapter-number">{chapter.number}</span>{chapter.href?<a href={`#${chapter.href}`} aria-current={pathname===chapter.href&&!selectedSection&&chapter.id!=='outline'?'page':undefined}>{chapter.navTitle}</a>:<span className="sidebar-planned-title"><span>{chapter.navTitle}</span><small>待补充</small></span>}<button aria-label={`${isExpanded(chapter.id)?'收起':'展开'}${chapter.navTitle}`} aria-expanded={isExpanded(chapter.id)} onClick={()=>toggle(chapter.id)}><ChevronRight size={12}/></button></div><div className="sidebar-chapter-content" hidden={!isExpanded(chapter.id)}>
 {chapter.id==='preface'&&<div className="sidebar-children chapter-direct-children preface-directory">{prefaceSections.map(section=>{const selected=pathname==='/preface'&&selectedSection===section.id;const key='preface-'+section.id;const groupOpen=expanded[key]??(pathname==='/preface'&&section.children?.some(child=>child.id===selectedSection));return <div className="preface-directory-group" key={section.id}><div className="preface-directory-row"><a title={section.title} href={`#/preface?section=${section.id}`} aria-current={selected?'location':undefined} className={selected?'selected':''}>{section.title}</a>{section.children&&<button aria-label={`${groupOpen?'收起':'展开'}${section.title}`} aria-expanded={!!groupOpen} onClick={()=>setExpanded(previous=>({...previous,[key]:!groupOpen}))}><ChevronRight size={11}/></button>}</div>{section.children&&<div className="preface-directory-children" hidden={!groupOpen}>{section.children.map(child=><a key={child.id} title={child.title} href={`#/preface?section=${child.id}`} aria-current={pathname==='/preface'&&selectedSection===child.id?'location':undefined} className={pathname==='/preface'&&selectedSection===child.id?'selected':''}>{child.title}</a>)}</div>}</div>})}</div>}

 {chapter.id==='outline'&&[{id:'overview',title:'总览',href:'/guide',sections:[{id:'map',title:'优化对象与关系'},{id:'start',title:'阅读与实操'}]},...lessons.filter(lesson=>lesson.id!=='model').map(lesson=>({id:lesson.id,title:names[lesson.id],href:`/learn/${lesson.id}`,sections:lesson.sections}))].map(lesson=>{const isActive=pathname===lesson.href;const lessonOpen=isExpanded(lesson.id);return <div className="sidebar-lesson" key={lesson.id}><div className={`sidebar-lesson-row ${isActive?'active':''}`}><a href={`#${lesson.href}`} title={lesson.title} aria-current={isActive&&!selectedSection?'page':undefined}>{lesson.title}</a><button aria-label={`${lessonOpen?'收起':'展开'}${lesson.title}`} aria-expanded={lessonOpen} onClick={()=>toggle(lesson.id)}><ChevronRight size={12}/></button></div><div className="sidebar-children" hidden={!lessonOpen}>{lesson.sections.map(section=><a href={`#${lesson.href}?section=${section.id}`} key={section.id} title={section.title} aria-current={isActive&&selectedSection===section.id?'location':undefined} className={isActive&&selectedSection===section.id?'selected':''}>{section.title}</a>)}</div></div>})}
 {chapter.id==='model'&&<div className="sidebar-children chapter-direct-children">{lessons.find(l=>l.id==='model')!.sections.map(s=><a key={s.id} title={s.title} href={`#/learn/model?section=${s.id}`} aria-current={pathname==='/learn/model'&&selectedSection===s.id?'location':undefined} className={pathname==='/learn/model'&&selectedSection===s.id?'selected':''}>{s.title}</a>)}</div>}
 {chapter.status==='planned'&&<div className="sidebar-planned-topics">{chapter.topics.map(topic=><span key={topic}>{topic}</span>)}<small>章节内容待补充</small></div>}
 </div></div>)}<div className="sidebar-section-divider"/><a href="#/cases" className={`sidebar-link practice-link ${practice?'active':''}`} aria-current={practice?'page':undefined}><FileSearch size={15}/><span>调优定位实操—langfuse</span></a>{returnTo&&!practice&&<a href={`#${returnTo}`} className="sidebar-resume">继续当前排查<ChevronRight size={13}/></a>}</nav><div className="sidebar-footer"><span>AIC智能体优化技术指南</span></div></aside></>;
}

