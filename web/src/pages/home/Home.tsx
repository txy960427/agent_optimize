import { ArrowRight, BookOpen, FileSearch } from 'lucide-react';
import { HomeStagePreview } from './HomeStagePreview';
import { CatalogJump, GuideAims, GuideCatalog } from './GuideHomeSections';
import { Button } from '../../components/ui';
import { guideHeroTitle, guideHeroDescription } from '../../domain/guidePositioning';

export function Home({go}:{go:(path:string)=>void}){
 return <main className="guide-home home-revision home-v2" id="main" tabIndex={-1}><section className="home-split-hero"><div className="home-hero-message"><h1>{guideHeroTitle[0]}<br/>{guideHeroTitle[1]}</h1><p>{guideHeroDescription}</p><div className="home-entry-actions"><Button onClick={()=>go('/preface')}><BookOpen size={17}/>从前言开始<ArrowRight size={16}/></Button><Button variant="secondary" onClick={()=>go('/cases')}><FileSearch size={17}/>开始排查</Button></div><CatalogJump/></div><HomeStagePreview/></section><GuideAims/><GuideCatalog/></main>;
}
