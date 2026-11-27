import { FileSearch, BookOpen, ArrowRight } from 'lucide-react';
import { MapSection } from './ObjectMap';
import { Button } from '../../components/ui';
import { ReadingHeader } from '../../components/ReadingHeader';

export function OutlineOverview({selectedObject,setSelectedObject,go,onLearn}:{selectedObject:string;setSelectedObject:(id:string)=>void;go:(path:string)=>void;onLearn:(id:string)=>void}){
 return <main className="overview-main home-focused outline-overview reading-page" id="main" tabIndex={-1}><ReadingHeader chapter="第 1 章 · 调优技术总纲" title="调优总览" intro="先看清优化对象如何配合，再沿运行记录定位问题、判断方向。"/><section className="overview-map-section article-section" id="map"><h2>优化对象与关系</h2><p>模型与Harness协作，环境提供执行与安全条件。框外的改进支撑负责协同、适配和效果验证；悬浮预览，点击固定说明。</p><MapSection selected={selectedObject} setSelected={setSelectedObject} onLearn={onLearn}/></section><section className="get-started" id="start"><div className="get-started-copy"><h2>阅读与实操</h2><p>按章节建立方法，或带着实际案例开始。</p></div><div className="get-started-actions"><Button className="get-started-primary" onClick={()=>go('/learn/runtime')}><BookOpen size={17}/>开始阅读总纲<ArrowRight size={16}/></Button><Button variant="secondary" onClick={()=>go('/cases')}><FileSearch size={17}/>直接开始实操<ArrowRight size={15}/></Button></div></section><a className="outline-preface-link" href="#/preface?section=architecture">想先弄清 Agent 怎样运行？回看前言中的架构演示<ArrowRight size={14}/></a></main>;
}
