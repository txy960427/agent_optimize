import type { ReactNode } from 'react';
import { Breadcrumb } from './ui';

/** Shared chapter opening: location, title, summary, then optional return action. */
export function ReadingHeader({ chapter, title, intro, actions }: {
  chapter: string;
  title: string;
  intro: string;
  actions?: ReactNode;
}) {
  return <header className="reading-header">
    <Breadcrumb items={['技术指南', chapter]} />
    <h1>{title}</h1>
    <p className="reading-lead">{intro}</p>
    {actions && <div className="reading-header-actions">{actions}</div>}
  </header>;
}
