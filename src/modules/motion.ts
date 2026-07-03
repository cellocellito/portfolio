import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Motion system (design.md §4). Two dialects:
 *  - fluid (power4.out ≈ cubic-bezier(.22,1,.36,1)) for the glass layer
 *  - steps(n) for the pixel layer
 * Reduced motion: none of this runs — content is fully visible by default.
 */
export function initMotion(): void {
  navState();
  activeSection();
  if (prefersReducedMotion) return;

  const lenis = new Lenis({ lerp: 0.12 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  anchors(lenis);

  try {
    document.documentElement.classList.add('js-anim');
    heroSequence();
  } catch {
    // if anything in the intro fails, never leave the hero hidden
    document.documentElement.classList.remove('js-anim');
  }
  scrollReveals();
  heroParallax();
  sigils();
  workPin();
}

/* nav gains glass once the page moves */
function navState(): void {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = (): void => { nav.classList.toggle('nav--scrolled', window.scrollY > 24); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* amber square marks the section currently on screen */
function activeSection(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav__links a'));
  const byId = new Map(links.map((l) => [(l.getAttribute('href') ?? '').slice(1), l]));
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link || !entry.isIntersecting) return;
        links.forEach((l) => l.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'true');
      });
    },
    { rootMargin: '-35% 0px -55% 0px' },
  );
  byId.forEach((_link, id) => {
    const el = document.getElementById(id);
    if (el) obs.observe(el);
  });
}

function anchors(lenis: Lenis): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') ?? '';
      if (href.length < 2) return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
      history.replaceState(null, '', href);
    });
  });
}

/* Load sequence — hero only, once, ≤1.6s (design.md §4) */
function heroSequence(): void {
  gsap.set('.hero__content [data-load]', { y: 18 });

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  // 1 — kicker types on (terminal dialect)
  const typer = document.querySelector<HTMLElement>('[data-typer]');
  if (typer) {
    const full = typer.dataset.typer ?? '';
    const caret = typer.querySelector('.caret');
    const textNode = document.createTextNode('');
    typer.textContent = '';
    typer.append(textNode);
    if (caret) typer.append(caret);
    const state = { n: 0 };
    tl.to(state, {
      n: full.length,
      duration: Math.min(1.1, full.length * 0.028),
      ease: `steps(${Math.max(1, full.length)})`,
      onUpdate: () => { textNode.nodeValue = full.slice(0, Math.round(state.n)); },
    }, 0.15);
  }

  // 2 — wordmark snaps up on the pixel grid
  const wordmark = document.querySelector<HTMLElement>('[data-wordmark]');
  if (wordmark) {
    const split = new SplitText(wordmark, { type: 'chars' });
    tl.from(split.chars, {
      y: 32,
      autoAlpha: 0,
      duration: 0.5,
      ease: 'steps(4)',
      stagger: 0.055,
      immediateRender: true,
    }, 0.25);
  }

  // 3 — glass dialect: name, one-liner, CTAs, then HUD
  tl.to('.hero__content [data-load]', { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 }, 0.7)
    .to('.hero__hud [data-load], .hero__scroll', { opacity: 1, duration: 0.5, stagger: 0.06 }, 1.05);

  // Failsafe: mobile browsers throttle requestAnimationFrame during load, which
  // can leave the intro timeline unfinished and text stuck at opacity 0. This
  // wall-clock timer force-reveals everything regardless of rAF state; if the
  // timeline already finished, it's a harmless no-op.
  const reveal = (): void => {
    document.documentElement.classList.remove('js-anim');
    gsap.set(
      '.hero__content [data-load], .hero__hud [data-load], .hero__scroll, [data-wordmark], [data-wordmark] > *',
      { clearProps: 'opacity,visibility,transform' },
    );
  };
  tl.eventCallback('onComplete', reveal);
  window.setTimeout(reveal, 2600);
}

/* One-shot scroll reveals (once: true) */
function scrollReveals(): void {
  gsap.utils.toArray<HTMLElement>('main [data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 36,
      autoAlpha: 0,
      duration: 0.8,
      ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  gsap.utils.toArray<HTMLElement>('.chips').forEach((list) => {
    gsap.from(list.querySelectorAll('.chip'), {
      y: 12,
      autoAlpha: 0,
      duration: 0.45,
      ease: 'power3.out',
      stagger: 0.03,
      scrollTrigger: { trigger: list, start: 'top 90%', once: true },
    });
  });

  const email = document.querySelector<HTMLElement>('[data-email-reveal]');
  if (email) {
    // Split within each half only — the .e-part wrappers stay intact so the
    // address can never wrap mid-word (see .contact__email .e-part in CSS).
    const split = new SplitText('[data-email-reveal] .e-part', { type: 'chars' });
    gsap.from(split.chars, {
      yPercent: 60,
      autoAlpha: 0,
      duration: 0.6,
      ease: 'power4.out',
      stagger: 0.018,
      scrollTrigger: { trigger: email, start: 'top 85%', once: true },
    });
  }
}

/* The two scrubbed effects (design.md allows exactly these + the pin) */
function heroParallax(): void {
  gsap.to('.hero__content', {
    yPercent: -12,
    autoAlpha: 0.3,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__scene', {
    yPercent: 8,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__scroll', {
    autoAlpha: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '20% top', scrub: true },
  });
}

function sigils(): void {
  document.querySelectorAll<SVGGeometryElement>('[data-sigil]').forEach((el) => {
    const len = el.getTotalLength();
    gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(el, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: el.closest('.divider'),
        start: 'top 95%',
        end: 'top 45%',
        scrub: 0.6,
      },
    });
  });
}

/* The single pinned element: Selected Work rail, desktop only */
function workPin(): void {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    const section = document.getElementById('work');
    const rail = document.querySelector<HTMLElement>('[data-rail]');
    if (!section || !rail) return;
    const st = ScrollTrigger.create({
      trigger: rail,
      start: 'top 128px',
      endTrigger: section,
      end: () => `bottom ${128 + rail.offsetHeight + 40}px`,
      pin: rail,
      pinSpacing: false,
      invalidateOnRefresh: true,
    });
    return () => { st.kill(); };
  });
}
