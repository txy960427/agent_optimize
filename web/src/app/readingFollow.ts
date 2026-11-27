/** Sits just below the 24px anchor clearance, so a section opened from the directory stays current. */
export const READING_FOLLOW_SLACK = 40;

export type ReadingMarker = { id: string; top: number };

/** The last section whose heading has reached the reading line. At the page bottom, the last heading still on screen wins. */
export function activeReadingSection(
  sections: ReadingMarker[],
  line: number,
  edge?: { atBottom: boolean; viewportBottom: number },
) {
  let current: string | null = null;
  for (const section of sections) {
    if (section.top <= line) current = section.id;
  }
  const last = sections.at(-1);
  if (edge?.atBottom && last && last.top < edge.viewportBottom - 48) return last.id;
  return current;
}

const SECTION = '.preface-section, .preface-subsection, .article-section, .get-started';

export function readingSectionMarkers(root: ParentNode): ReadingMarker[] {
  return [...root.querySelectorAll<HTMLElement>(SECTION)].flatMap(section => {
    if (!section.id) return [];
    const heading = section.querySelector<HTMLElement>(':scope > h2, :scope > h3, :scope > .preface-section-heading h3, :scope > .get-started-copy h2');
    return [{ id: section.id, top: (heading ?? section).getBoundingClientRect().top }];
  });
}
