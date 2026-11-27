import { ArrowDown, ArrowRight, BookOpen, ScanSearch } from "lucide-react";
import { guideHeroDescription, guideHeroTitle } from "../../domain/guidePositioning";
import { GuideAims, GuideCatalog, jumpToChapters } from "./GuideHomeSections";
import { HeroConcepts } from "./HeroConcepts";

export function HomeAtlas({go}: {go: (path: string) => void}) {
  return (
    <main id="main" tabIndex={-1} className="guide-home home-revision home-v3">
      <section className="atlas-hero" aria-label="指南介绍与内容导览">
        <div className="atlas-message">
          <h1>
            {guideHeroTitle[0]}
            <br />
            {guideHeroTitle[1]}
          </h1>
          <p>{guideHeroDescription}</p>
          <div className="atlas-actions">
            <a className="atlas-primary" href="#/preface">
              <BookOpen size={18} />
              从前言开始
              <ArrowRight size={17} />
            </a>
            <a className="atlas-secondary" href="#/cases">
              <ScanSearch size={18} />
              开始排查
            </a>
          </div>
          <button className="atlas-catalog-jump" onClick={jumpToChapters}>
            浏览全书目录
            <ArrowDown size={15} />
          </button>
        </div>
        <HeroConcepts go={go} />
      </section>
      <GuideAims />
      <GuideCatalog cards />
      <footer className="atlas-page-end">
        <BookOpen size={17} />
        <p>
          智能体调优技术指南<span>归因有依据，改进有方法，结果可验证。</span>
        </p>
        <a href="#/preface">
          从前言开始
          <ArrowRight size={14} />
        </a>
      </footer>
    </main>
  );
}
