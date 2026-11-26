import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { chapters } from './curriculum';
import { guideGoals } from './guidePositioning';

const aimDetails=['准入条件与方法边界','责任团队与流转路径','内部案例与原始轨迹','回归样本、判据与经验'];
export function GuideAims(){return <ul className="home-aim-strip" aria-label="指南的四项目标">{guideGoals.map((goal,index)=><li key={goal.title}><strong>{goal.title}</strong><span>{aimDetails[index]}</span></li>)}</ul>}
const summaries:Record<string,string>={preface:'背景、目标、适用范围与阅读方法。',outline:'三层职责、问题定位与调优决策。',harness:'上下文、记忆、工具、Skill、编排与护栏。',model:'从模型能力与性能基线，进入模型侧调优。',environment:'界定归因边界；具体环境工程优化从略。',evaluation:'评估口径、对照实验、回归与数据资产。',conclusion:'核心原则、落地路径与持续改进。'};
export function GuideCatalog({cards=false}:{cards?:boolean}){
 return <section className={`home-chapter-index ${cards?'chapter-index-cards':'chapter-index-rows'}`} id="chapters"><header><div><h2>从前言开始，逐章深入。</h2><p>先了解范围与方法，再按问题进入专项内容。</p></div><a href="#/guide">直接阅读调优总纲<ArrowUpRight size={15}/></a></header><ol>{chapters.map(chapter=><li className={`home-chapter ${cards?'guide-chapter':'stage-chapter'} ${chapter.href?'chapter-available':'chapter-planned'}`} data-chapter={chapter.id} key={chapter.id}><span className="home-chapter-number">{String(chapter.number).padStart(2,'0')}</span><div className="home-chapter-title"><h3>{chapter.href?<a href={`#${chapter.href}`}>{chapter.title}</a>:chapter.title}</h3><p>{summaries[chapter.id]}</p></div><span className={`home-chapter-state state-${chapter.status}`}>{chapter.status==='planned'?'待补充':chapter.status==='intro'?'基础内容':'可阅读'}</span>{chapter.href?<a href={`#${chapter.href}`} className="home-chapter-link" aria-label={`阅读${chapter.title}`}><ArrowUpRight size={19}/></a>:<span/>}</li>)}</ol></section>;
}
export function jumpToChapters(){document.getElementById('chapters')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}
export function CatalogJump(){return <button className="home-directory-jump" onClick={jumpToChapters}>浏览全书目录<ArrowDown size={15}/></button>}
