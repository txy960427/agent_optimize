export function normalizeReadingRoute(route:string){
  return route.split('?')[0]==='/learn/objects'?'/guide?section=map':route;
}

export function isReadingRoute(route: string) {
  const pathname = route.split('?')[0];
  return pathname === '/preface' || pathname === '/guide' || pathname.startsWith('/learn/');
}

/** Called after the destination is rendered, including repeated clicks on the same link. */
export function locateReadingRoute(route: string) {
  const section = new URLSearchParams(route.split('?')[1] ?? '').get('section');
  const main = document.getElementById('main');
  const target = section ? main?.querySelector<HTMLElement>(`[id="${CSS.escape(section)}"]`) : null;
  const heading = target?.querySelector<HTMLElement>('h2, h3') ?? main?.querySelector<HTMLElement>('h1');
  const clearance = (document.querySelector('.site-header')?.getBoundingClientRect().height ?? 60) + 24;
  const top = target ? window.scrollY + (heading ?? target).getBoundingClientRect().top - clearance : 0;
  window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
