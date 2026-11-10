// Motion. Runs only when public/head.js
// set html.mo (no prefers-reduced-motion); without it every block is simply visible and nothing moves.
// - arrivals: blocks below the fold rise in as they scroll into view (titles word by word, track rows one
//   after another, the footer address letter by letter); figures keep the 8x8 Bayer dither sweep
// - the spine is a scroll progress bar with a diamond on its end; section nodes light as it passes; a case's
//   contents mark the section being read
// - doors lean toward the pointer
// - the WebGL mark (hero-gl.ts) and the live band (band.ts) load after the first move or 2.5 s of quiet;
//   the pointer dust (dust.ts) on a fine pointer
// What is already on screen at load is never prepared, so nothing the visitor sees can blink.
import { initDust } from './dust';

const root = document.documentElement;
const motion = root.classList.contains('mo');
const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document): T[] => [...el.querySelectorAll<T>(s)];
const below = (el: Element): boolean => el.getBoundingClientRect().top > innerHeight * 0.95;
const setI = (el: HTMLElement, i: number): void => el.style.setProperty('--i', String(i));

// ---------------------------------------------------------------- the figures' dither sweep
const B8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43,
  1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const CELL = 3; // px per dither cell
const DUR = 1100;

function background(el: Element): [number, number, number] {
  for (let e: Element | null = el; e; e = e.parentElement) {
    const c = getComputedStyle(e).backgroundColor;
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c);
    if (m && m[4] !== '0') return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  return [8, 7, 7];
}
function sweep(el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  const cols = Math.max(1, Math.ceil((r.width + 4) / CELL)),
    rows = Math.max(1, Math.ceil((r.height + 4) / CELL));
  const cv = document.createElement('canvas');
  cv.className = 'rv-cover';
  cv.setAttribute('aria-hidden', 'true');
  cv.width = cols;
  cv.height = rows;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const rgb = background(el);
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < img.data.length; i += 4) [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]] = [...rgb, 255];
  el.classList.add('rv-host');
  el.append(cv);
  ctx.putImageData(img, 0, 0);
  const play = (): void => {
    const t0 = performance.now();
    const step = (now: number): void => {
      const p = Math.min(1, (now - t0) / DUR);
      const e = 1 - (1 - p) * (1 - p);
      for (let y = 0; y < rows; y++) {
        const s = e * 1.35 - (y / rows) * 0.35; // top rows clear first, like ink settling
        for (let x = 0; x < cols; x++) img.data[(y * cols + x) * 4 + 3] = s < ((B8[(y % 8) * 8 + (x % 8)] ?? 0) + 0.5) / 64 ? 255 : 0;
      }
      ctx.putImageData(img, 0, 0);
      if (p < 1) requestAnimationFrame(step);
      else {
        cv.remove();
        el.classList.remove('rv-host');
      }
    };
    requestAnimationFrame(step);
  };
  // start a little before the figure enters, so it has mostly arrived by the time it is looked at
  const io = new IntersectionObserver(
    (en) => {
      if (!en.some((e) => e.isIntersecting)) return;
      io.disconnect();
      play();
    },
    { rootMargin: '0px 0px 15% 0px' },
  );
  io.observe(el);
}

// ---------------------------------------------------------------- arrivals
// words rise out of a slot, one after another (headings only; body copy fades up)
function splitWords(el: HTMLElement): void {
  let i = 0;
  const walk = (node: Node): void => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === Node.TEXT_NODE) {
        const parts = (ch.textContent ?? '').split(/([ \t\n\r]+)/);
        if (!parts.some((p) => p.trim())) continue;
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (!part.trim()) {
            frag.append(part);
            continue;
          }
          const w = document.createElement('span');
          w.className = 'mo-w';
          const wi = document.createElement('span');
          wi.className = 'mo-wi';
          setI(wi, i++);
          wi.textContent = part;
          w.append(wi);
          frag.append(w);
        }
        ch.replaceWith(frag);
      } else if (ch instanceof Element && !ch.matches('.sr-only, .arrow, mark, svg, br, wbr')) walk(ch);
    }
  };
  walk(el);
}
function splitChars(el: HTMLElement): void {
  let i = 0;
  const walk = (node: Node): void => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const c of ch.textContent ?? '') {
          if (c === ' ') {
            frag.append(' ');
            continue;
          }
          const s = document.createElement('span');
          s.className = 'mo-ch';
          setI(s, i++);
          s.textContent = c;
          frag.append(s);
        }
        ch.replaceWith(frag);
      } else if (ch instanceof Element && ch.tagName !== 'WBR') walk(ch);
    }
  };
  walk(el);
}

function arrivals(): void {
  const io = new IntersectionObserver(
    (en) => {
      for (const e of en) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('mo-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  );
  const watch = (el: HTMLElement, cls: string): void => {
    el.classList.add(cls);
    io.observe(el);
  };
  // decide everything first (one layout read), then write
  const heads = $$('main .section-head').filter(below);
  const h2s = $$('.prose > h2').filter(below);
  const rows = $$('.tracks > li');
  const ups = $$(
    ['main .leaf:not(.section-head):not(.track)', '.prose > :not(h2):not([data-reveal="dither"])', '.track-nav'].join(', '),
  ).filter((el) => !el.closest('.tracks, .title-page') && below(el));
  const rowsBelow = rows.filter(below);
  const foot = document.querySelector<HTMLElement>('.site-footer');
  const footBelow = foot ? below(foot) : false;

  for (const h of heads) {
    const t = h.querySelector<HTMLElement>('.title');
    if (t) splitWords(t);
    watch(h, 'mo-head');
  }
  for (const h of h2s) {
    splitWords(h);
    watch(h, 'mo-words');
  }
  for (const list of $$('.tracks')) $$(':scope > li', list).forEach((r, i) => setI(r, i));
  for (const r of rowsBelow) watch(r, 'mo-row');
  for (const el of ups) watch(el, 'mo-up');
  const mail = foot?.querySelector<HTMLElement>('.mail a');
  if (foot && mail) {
    mail.setAttribute('aria-label', (mail.textContent ?? '').replace(/\s+/g, ''));
    splitChars(mail);
    if (footBelow) watch(foot, 'mo-foot');
    else foot.classList.add('mo-in');
  }
  for (const el of $$('[data-reveal="dither"]').filter(below)) sweep(el);
}

// ---------------------------------------------------------------- the spine, nodes and contents
function scrollWork(): void {
  const seg = document.querySelector<HTMLElement>('.has-spine .spine-seg');
  const heads = $$('.spine-seg .section-head, .spine-seg .leaf:has(> .margin > .mh), .site-footer .foot-grid, .has-spine .prose > h2');
  let bar: HTMLElement | null = null,
    dot: HTMLElement | null = null;
  if (seg) {
    bar = document.createElement('div');
    bar.className = 'spine-bar';
    dot = document.createElement('div');
    dot.className = 'spine-head';
    for (const el of [bar, dot]) {
      el.setAttribute('aria-hidden', 'true');
      document.body.append(el);
    }
  }
  const toc = $$<HTMLAnchorElement>('.toc a[href^="#"]')
    .map((a) => ({ a, t: document.getElementById(decodeURIComponent(a.hash.slice(1))) }))
    .filter((x): x is { a: HTMLAnchorElement; t: HTMLElement } => Boolean(x.t));
  const measure = (): void => {
    if (!seg || !bar || !dot) return;
    const left = parseFloat(getComputedStyle(seg, '::before').left);
    const x = Number.isFinite(left) ? seg.getBoundingClientRect().left + left : -100;
    bar.style.left = dot.style.left = `${x}px`;
  };
  let ticking = false;
  const onScroll = (): void => {
    ticking = false;
    const max = root.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const y = p * innerHeight;
    if (bar && dot) {
      bar.style.transform = `scaleY(${p})`;
      dot.style.transform = `translateY(${y}px)`;
      dot.classList.toggle('on', p > 0.004);
    }
    for (const h of heads) h.classList.toggle('lit', h.getBoundingClientRect().top < y);
    if (toc.length) {
      let cur: (typeof toc)[number] | null = null;
      for (const x of toc) if (x.t.getBoundingClientRect().top < innerHeight * 0.45) cur = x;
      for (const x of toc) x.a.classList.toggle('is-current', x === cur);
    }
  };
  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(onScroll);
    },
    { passive: true },
  );
  addEventListener('resize', () => {
    measure();
    onScroll();
  });
  addEventListener('load', () => {
    measure();
    onScroll();
  });
  measure();
  onScroll();
}

// ---------------------------------------------------------------- doors lean toward the pointer
function doors(): void {
  for (const d of $$('.door')) {
    d.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = d.getBoundingClientRect();
      d.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(1)}px`);
      d.style.setProperty('--my', `${(((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(1)}px`);
    });
    d.addEventListener('pointerleave', () => {
      d.style.setProperty('--mx', '0px');
      d.style.setProperty('--my', '0px');
    });
  }
}

// ---------------------------------------------------------------- WebGL: the mark and the band
// Creating a WebGL context blocks the main thread for a moment (about 160 ms here, 660 ms under Lighthouse's
// 4x CPU throttle; starting both at load cost about 2 s of blocking time). So they wait for the visitor's
// first move, touch, scroll or key, or 2.5 s of quiet after load, and then for an idle slot.
function webgl(): void {
  const svg = document.querySelector<SVGSVGElement>('svg[data-gl]');
  const band = document.querySelector('.dband');
  if (!svg && !band) return;
  if (!root.classList.contains('gl-pending') && svg) return; // Save-Data, or no WebGL2: the drawing stays
  const go = (): void => {
    if (svg) import('./hero-gl').then((m) => m.start(svg)).catch(() => root.classList.remove('gl-pending'));
    if (band)
      import('./band')
        .then((m) => m.startBand())
        .catch(() => {
          /* the printed band stays */
        });
  };
  const idle = (): void => {
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 });
    else setTimeout(go, 300);
  };
  const signals = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll'] as const;
  let armed = true;
  const wake = (): void => {
    if (!armed) return;
    armed = false;
    for (const s of signals) removeEventListener(s, wake);
    idle();
  };
  const arm = (): void => {
    for (const s of signals) addEventListener(s, wake, { passive: true });
    setTimeout(wake, 2500);
  };
  if (document.readyState === 'complete') arm();
  else addEventListener('load', arm, { once: true });
}

if (motion) {
  arrivals();
  scrollWork();
  doors();
  webgl();
  initDust();
} else {
  // reduced motion: no metal, so the drawing must show (head.js never set gl-pending; this is a guard)
  root.classList.remove('gl-pending');
}
