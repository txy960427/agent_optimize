import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, FileText, MessageCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { jumpToChapters } from './GuideHomeSections';

export const homeSopSteps = [
  {id:'problem',title:'发现问题',detail:'记录现象与预期',chapter:'问题记录 · 前言',duration:6500},
  {id:'locate',title:'定位对象',detail:'按总纲核对归因',chapter:'第1章 · 调优技术总纲',duration:7500},
  {id:'improve',title:'专项改进',detail:'查技术方法与案例',chapter:'第2、3章 · 专项调优',duration:7500},
  {id:'verify',title:'对照验证',detail:'自检、对照与回归',chapter:'第5章 · 测评技术',duration:7000},
  {id:'iterate',title:'沉淀与更新',detail:'案例、测评与指南',chapter:'数据飞轮 · 贯穿全文',duration:7500},
] as const;

function ProblemScene(){
  return <div className="sop-scene sop-problem-scene">
    <div className="sop-conversation" aria-label="设备号重复追问的情境示例">
      <div className="sop-dialogue-line sop-reveal-first"><span>前文 · 用户</span><p>设备号是 <mark>CT-02</mark>。</p></div>
      <div className="sop-dialogue-line sop-reveal-second"><span>本轮 · 用户</span><p>它今天有哪些排班？</p></div>
      <div className="sop-dialogue-line sop-dialogue-question sop-reveal-third"><span>智能体</span><p>请先提供<em>设备号</em>。</p></div>
    </div>
    <p className="sop-scene-takeaway"><MessageCircle size={14}/><span>预期：沿用已明确的设备号，继续处理任务。</span></p>
  </div>;
}

function LocateScene(){
  return <div className="sop-scene sop-locate-scene">
    <div className="sop-evidence-path" aria-label="定位时需要核对的运行记录"><span>会话与前文</span><ArrowRight size={14}/><span>异常步骤</span><ArrowRight size={14}/><strong>实际模型输入</strong></div>
    <h4>先看实际输入，再确定优化对象。</h4>
    <dl className="sop-input-checks">
      <div className="sop-reveal-first"><dt>输入中没有</dt><dd>核对历史注入、状态传递与压缩。</dd></div>
      <div className="sop-reveal-second"><dt>输入中已有</dt><dd>继续核对指令、工具约定和模型表现。</dd></div>
    </dl>
    <p className="sop-scene-takeaway">先环境，再 Harness，后模型；由证据确认候选对象。</p>
  </div>;
}

function ImproveScene(){
  return <div className="sop-scene sop-improve-scene">
    <p className="sop-conditional">若已确认设备号未进入本轮模型输入</p>
    <h4>进入对应章节，把方向变成具体改法。</h4>
    <div className="sop-method-reference sop-reveal-first"><BookOpen size={17}/><div><strong>上下文与记忆</strong><p>核对历史注入、状态传递的技术方法与准入条件。</p></div></div>
    <div className="sop-method-reference sop-reveal-second"><FileText size={17}/><div><strong>同类实践案例</strong><p>对照现象、改动和验证过程，再选择本次方案。</p></div></div>
    <p className="sop-chapter-status">第2章相关正文与案例待补充</p>
  </div>;
}

function VerifyScene(){
  return <div className="sop-scene sop-verify-scene">
    <h4>改过之后，按同一口径重新验证。</h4>
    <p className="sop-verify-basis">固定任务集、评估口径与版本，保留改前和改后的记录。</p>
    <ul className="sop-criteria" aria-label="这个场景的示例验证标准">
      <li className="sop-reveal-first"><span>判据</span>不重复索要已明确的设备号</li>
      <li className="sop-reveal-second"><span>回归</span>切换设备时，不沿用旧设备号</li>
      <li className="sop-reveal-third"><span>边界</span>设备号确实缺失时，正常追问</li>
    </ul>
    <p className="sop-scene-takeaway">验证不通过，回到归因或调整改进方案。</p>
  </div>;
}

function IterateScene(){
  return <div className="sop-scene sop-iterate-scene">
    <h4>让一次修复，成为下次调优的起点。</h4>
    <ol className="sop-asset-loop" aria-label="修复后的沉淀与更新">
      <li className="sop-reveal-first"><FileText size={17}/><div><strong>归档案例</strong><span>现象、轨迹、改动、责任与验证记录</span></div></li>
      <li className="sop-reveal-second"><ArrowDown size={17}/><div><strong>纳入回归，持续测评</strong><span>保留多轮样本、判据和版本</span></div></li>
      <li className="sop-reveal-third"><RotateCcw size={17}/><div><strong>更新技术方法与指南</strong><span>负责人复盘，经评审发布修订</span></div></li>
    </ol>
    <p className="sop-scene-takeaway"><RotateCcw size={14}/><span>测评发现新问题，再进入下一轮调优。</span></p>
  </div>;
}

const scenes=[ProblemScene,LocateScene,ImproveScene,VerifyScene,IterateScene];
function StageReference({index}: {index: number}) {
  if (index === 1) return <a href="#/guide">阅读总纲<ArrowUpRight size={12}/></a>;
  if (index === 2) return <button onClick={jumpToChapters}>浏览专项目录<ArrowUpRight size={12}/></button>;
  if (index === 4) return <a href="#/preface?section=maintenance">查看维护机制<ArrowUpRight size={12}/></a>;
  return <a href="#/preface?section=reading">查看完整路径<ArrowUpRight size={12}/></a>;
}

export function HomeStagePreview(){
  const reduced=useReducedMotion();
  const [playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playback,setPlayback]=useState({step:0,elapsed:0});
  const [visible,setVisible]=useState(()=>!document.hidden);
  const [inView,setInView]=useState(false);
  const preview=useRef<HTMLElement>(null);
  const step=homeSopSteps[playback.step];
  const running=playing&&!reduced&&visible&&inView;

  useEffect(()=>{if(reduced)setPlaying(false)},[reduced]);
  useEffect(()=>{
    const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);
    const observer=new IntersectionObserver(entries=>setInView(entries[0].isIntersecting),{threshold:.15});
    if(preview.current)observer.observe(preview.current);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update)};
  },[]);
  useEffect(()=>{
    if(!running)return;
    const timer=window.setInterval(()=>setPlayback(current=>{
      const elapsed=current.elapsed+100;
      return elapsed>=homeSopSteps[current.step].duration?{step:(current.step+1)%homeSopSteps.length,elapsed:0}:{...current,elapsed};
    }),100);
    return()=>window.clearInterval(timer);
  },[running]);
  function select(index:number){setPlayback({step:index,elapsed:0});setPlaying(false)}
  function replay(){setPlayback({step:0,elapsed:0});setPlaying(!reduced)}

  return (
    <section
      ref={preview}
      className={`home-guide-preview home-sop-preview ${running ? 'preview-playing' : ''}`}
      aria-labelledby="guide-preview-heading"
      data-step={step.id}
    >
      <header className="guide-preview-heading">
        <h2 id="guide-preview-heading">从一个问题，走完调优闭环。</h2>
        <div className="sop-play-controls">
          <button onClick={replay} aria-label="重新播放调优流程" title="从头播放">
            <RotateCcw size={15}/>
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            disabled={!!reduced}
            aria-pressed={playing && !reduced}
            aria-label={playing && !reduced ? '暂停调优流程' : '播放调优流程'}
            title={reduced ? '已减少动态效果，可手动查看各阶段' : playing ? '暂停流程' : '播放流程'}
          >
            {playing && !reduced ? <Pause size={16}/> : <Play size={16}/>}
          </button>
        </div>
      </header>
      <div className="guide-reading-spread">
        <nav className="guide-method-index sop-method-index" aria-label="完整调优SOP">
          <ol>
            {homeSopSteps.map((item, index) => (
              <li
                key={item.id}
                data-state={index === playback.step ? 'active' : index < playback.step ? 'visited' : 'upcoming'}
              >
                <button
                  onClick={() => select(index)}
                  aria-current={index === playback.step ? 'step' : undefined}
                  aria-controls="home-sop-panel"
                >
                  <span className="sop-step-marker" aria-hidden="true">
                    {index < playback.step ? <Check size={11}/> : index + 1}
                  </span>
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <article className="guide-case-page sop-case-page" id="home-sop-panel" aria-label={step.title} aria-live="off">
          <header>
            <span><MessageCircle size={14}/>设备号为何被重复追问？</span>
            <small>情境示例</small>
          </header>
          <div className="sop-scene-stack">
            {scenes.map((Scene, index) => (
              <div
                className={`sop-scene-content ${index === playback.step ? 'sop-scene-active' : ''} ${reduced ? '' : 'sop-scene-motion'}`}
                key={homeSopSteps[index].id}
                aria-hidden={index !== playback.step}
                inert={index !== playback.step}
              >
                <p className="sop-scene-stage">{homeSopSteps[index].chapter}</p>
                <Scene/>
              </div>
            ))}
          </div>
          <div className="sop-scene-footer">
            <div className="sop-reading-connection">
              <StageReference index={playback.step}/>
            </div>
            <div className="sop-playback-position">
              <span>{playback.step + 1} / {homeSopSteps.length}</span>
              <button
                onClick={() => select((playback.step + 1) % homeSopSteps.length)}
                aria-label={playback.step === 4 ? '回到问题发现' : '查看下一阶段'}
              >
                {playback.step === 4 ? '回到起点' : '下一阶段'}<ArrowRight size={13}/>
              </button>
            </div>
            <div className="sop-step-progress" aria-hidden="true">
              <span style={{transform: `scaleX(${playback.elapsed / step.duration})`}}/>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
