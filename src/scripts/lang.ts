// The language toggle, with the old site's behaviour, on static pages. The EN / BR links work without this file.
// 1. A click on EN or BR stores the choice (same key and values as the old site, so returning
//    visitors keep theirs).
// 2. First visit only: no stored choice, the EN home page, and a browser language starting with "pt"
//    sends the visitor once to /pt. The old site was a single page at "/", so this is where its
//    auto-switch happened; a deep link (a case page opened from the CV) is never redirected.
//    Crawlers send EN, so they are never redirected either.
const KEY = 'cello_lang';

const read = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage blocked: behave like a first visit, but see write()
  }
};
const write = (value: 'en' | 'pt'): boolean => {
  try {
    localStorage.setItem(KEY, value);
    return true;
  } catch {
    return false;
  }
};

for (const a of document.querySelectorAll<HTMLAnchorElement>('nav.lang a[hreflang]')) {
  a.addEventListener('click', () => write(a.hreflang.startsWith('pt') ? 'pt' : 'en'));
}

const mirror = document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="pt-BR"]');
const isHome = location.pathname === '/' || location.pathname === '/index.html';
const firstVisit = read() === null;
const wantsPt = (navigator.language || '').toLowerCase().startsWith('pt');
if (firstVisit && wantsPt && isHome && document.documentElement.lang === 'en' && mirror) {
  // Only redirect when the visit can be remembered; with blocked storage it would happen on every visit.
  if (write('pt')) {
    const target = new URL(mirror.href);
    location.replace(`${target.pathname}${location.search}${location.hash}`);
  }
}
