import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Expandable project logs. All content ships open in the HTML (SEO / no-JS);
 * JS collapses entries 2..n and wires accessible toggles.
 */
export function initWork(reduced: boolean): void {
  document.querySelectorAll<HTMLElement>('.project').forEach((project, i) => {
    const btn = project.querySelector<HTMLButtonElement>('.project__toggle');
    const body = project.querySelector<HTMLElement>('.project__body');
    if (!btn || !body) return;

    const open = i === 0;
    project.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (!open) gsap.set(body, { height: 0 });

    btn.addEventListener('click', () => toggle(project, btn, body, reduced));
  });
}

function toggle(project: HTMLElement, btn: HTMLButtonElement, body: HTMLElement, reduced: boolean): void {
  const isOpen = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!isOpen));
  project.classList.toggle('is-open', !isOpen);

  const done = (): void => { ScrollTrigger.refresh(); };

  if (reduced) {
    body.style.height = isOpen ? '0px' : 'auto';
    done();
    return;
  }

  gsap.killTweensOf(body);
  if (isOpen) {
    gsap.to(body, { height: 0, duration: 0.45, ease: 'power2.inOut', onComplete: done });
  } else {
    const inner = body.querySelector('.project__inner');
    if (inner) gsap.fromTo(inner, { autoAlpha: 0.25 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' });
    gsap.to(body, {
      height: 'auto',
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: () => { gsap.set(body, { clearProps: 'height' }); done(); },
    });
  }
}
