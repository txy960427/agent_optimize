import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Database, BrainCircuit, Wrench, RefreshCw, Play, Pause, SkipForward, RotateCcw, ArrowRight, LogIn, Send } from 'lucide-react';

const steps=[
 {id:2,title:'准备上下文',icon:Database,color:'teal',detail:'整理任务、规则、历史与反馈，形成这次实际送入模型的输入。',example:'用户追问“那明天呢？”＋设备号 CT-02＋日期与工具说明',label:'信息准备'},
 {id:3,title:'模型判断',icon:BrainCircuit,color:'violet',detail:'模型根据这次输入决定回答、追问，或提出下一步动作。',example:'选择查询工具，给出 device_id=CT-02 和查询日期',label:'推理与选择'},
 {id:4,title:'执行动作',icon:Wrench,color:'amber',detail:'按需校验参数、调度并执行工具，再返回结果或错误。没有动作不一定是异常。',example:'query-device-schedule → 返回设备排班或明确错误',label:'按需执行'},
 {id:5,title:'处理与更新',icon:RefreshCw,color:'blue',detail:'检查结果、更新任务状态；还要继续时，把最新信息交给下一次上下文准备。',example:'保留查询结果与设备号 → 进入下一次循环组织回复',label:'反馈与状态'},
];

export function AgentLoop(){
 const [active,setActive]=useState(0);const [round,setRound]=useState(1);const [playing,setPlaying]=useState(false);const reduced=useReducedMotion();
 useEffect(()=>{if(!playing)return;const timer=setTimeout(()=>{if(active===3){if(round>=2)setPlaying(false);else{setRound(round+1);setActive(0)}}else setActive(active+1)},1450);return()=>clearTimeout(timer)},[playing,active,round]);
 const step=steps[active];
 function next(){setPlaying(false);if(active===3){setActive(0);setRound(r=>r+1)}else setActive(a=>a+1)}
 return <figure className="loop-experience"><header className="loop-experience-header"><div><span className="loop-symbol"><RefreshCw size={19}/></span><strong>Agent Loop</strong><span className="loop-round">第 {round} 次循环</span></div><div className="loop-controls"><button onClick={()=>{if(round>=2){setRound(1);setActive(0)}setPlaying(!playing)}} aria-label={playing?'暂停循环演示':'播放循环演示'}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>{playing?'暂停':'播放'}</span></button><button onClick={next} aria-label="下一环节"><SkipForward size={15}/></button><button onClick={()=>{setPlaying(false);setActive(0);setRound(1)}} aria-label="重置循环演示"><RotateCcw size={14}/></button></div></header>
 <div className="loop-boundaries"><span><LogIn size={14}/>① 请求接收</span><div>一次交互可以经历多次循环</div><span>⑥ 输出交付<Send size={13}/></span></div>
 <div className={`loop-board phase-${step.color}`}><svg className="loop-path" viewBox="0 0 640 310" aria-hidden="true" preserveAspectRatio="none"><defs><marker id="cycle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7291a8"/></marker></defs><path d="M180 78 H460 V232 H180 V78" fill="none" stroke="#3a536c" strokeWidth="2" strokeDasharray="4 6"/><path d="M300 78 H340 M460 145 V170 M340 232 H300 M180 170 V145" fill="none" stroke="#a5bdcf" strokeWidth="2" markerEnd="url(#cycle-arrow)"/>{playing&&!reduced&&<circle r="5" fill="#7dd6c3"><animateMotion dur="5.8s" repeatCount="indefinite" path="M180 78 H460 V232 H180 V78"/></circle>}</svg><div className="loop-step-grid">{steps.map((item,index)=>{const Icon=item.icon;return <motion.button key={item.id} className={`loop-step loop-step-${item.color} ${active===index?'active':''}`} onClick={()=>{setActive(index);setPlaying(false)}} aria-pressed={active===index} animate={{scale:active===index&&!reduced?1.025:1}} transition={{duration:.22}} style={{gridArea:({2:'a',3:'b',4:'c',5:'d'} as Record<number,string>)[item.id]}}><div className="loop-step-top"><span className="loop-step-icon"><Icon size={22}/></span><span className="phase-number">{['②','③','④','⑤'][index]}</span></div><strong>{item.title}</strong><small>{item.label}</small>{active===index&&<motion.span layoutId="loop-active-dot" className="loop-active-dot"/>}</motion.button>})}</div></div>
 <AnimatePresence mode="wait"><motion.figcaption key={step.id} className={`loop-explanation tone-${step.color}`} initial={reduced?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.16}}><div><strong>{['②','③','④','⑤'][active]} {step.title}</strong><p>{step.detail}</p></div><div className="loop-example"><span>例如</span><p>{step.example}</p></div></motion.figcaption></AnimatePresence>
 <div className="loop-return"><RefreshCw size={14}/><span>⑤ 的最新结果与状态，进入下一次 ②。</span><ArrowRight size={14}/><span>任务结束后，再交付输出。</span></div>
 </figure>;
}
