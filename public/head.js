// Runs in <head>, before the first paint (a file, not inline: the CSP is script-src 'self').
// 1. html.mo: motion is welcome (no prefers-reduced-motion). Every arrival, the intro, the page transition
//    and the hover motion in motion.css hang on it, so nothing animates without it.
// 2. html.gl-pending: the WebGL mark will run, so its plain drawing stays hidden and the mark appears only as
//    the metal pours (design pass 3). hero-gl.ts removes it if WebGL cannot start, and the drawing shows.
// 3. Page to page: the transition's direction (forward or back) and which title morphs into which.
(() => {
  const root = document.documentElement;
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!motion) return;
  root.classList.add('mo');
  if ('WebGL2RenderingContext' in window && !(navigator.connection && navigator.connection.saveData)) root.classList.add('gl-pending');

  const norm = (u) =>
    new URL(u, location.href).pathname
      .replace(/\.html$/, '')
      .replace(/\/index$/, '')
      .replace(/\/$/, '') || '/';
  const isHome = (p) => p === '/' || p === '/pt';
  const isCase = (p) => /^(\/pt)?\/work\/[^/]+$/.test(p);
  const name = (el) => {
    if (el) el.style.viewTransitionName = 'vt-title';
  };
  // on the home page, the headline of the row that links to a given case
  const rowFor = (p) => {
    for (const a of document.querySelectorAll('.track .headline a')) if (norm(a.href) === p) return a.closest('.headline');
    return null;
  };
  const clear = () => {
    for (const el of document.querySelectorAll('[style*="view-transition-name"]')) el.style.viewTransitionName = '';
  };

  addEventListener('pageswap', (e) => {
    if (!e.viewTransition) return;
    const act = e.activation;
    const to = act && act.entry && act.entry.url ? norm(act.entry.url) : '';
    const here = norm(location.href);
    const cur = window.navigation && navigation.currentEntry;
    const back = act && act.navigationType === 'traverse' && act.entry && cur && act.entry.index < cur.index;
    e.viewTransition.types.add(back ? 'back' : 'forward');
    if (isHome(here) && isCase(to)) name(rowFor(to));
    else if (isCase(here) && (isCase(to) || isHome(to))) name(document.querySelector('.case .head h1'));
  });

  addEventListener('pagereveal', (e) => {
    clear(); // a page restored from the back-forward cache may still carry a name from when it left
    if (!e.viewTransition) return;
    root.classList.add('mo-arrived'); // the header was already on screen: no intro for it
    const act = window.navigation && navigation.activation;
    const back = act && act.navigationType === 'traverse' && act.from && act.entry && act.entry.index < act.from.index;
    e.viewTransition.types.add(back ? 'back' : 'forward');
    const from = act && act.from && act.from.url ? norm(act.from.url) : '';
    const here = norm(location.href);
    if (isCase(here) && (isHome(from) || isCase(from))) {
      name(document.querySelector('.case .head h1'));
      root.classList.add('mo-morphed'); // the title arrives by morph, so it skips its own intro
    } else if (isHome(here) && isCase(from)) name(rowFor(from));
    e.viewTransition.finished.finally(clear); // names are only for the transition
  });
})();
