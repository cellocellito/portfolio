// The record's mark (src/components/Mark.astro): pointing at a ray (or tapping it) lights that track's rays
// and names the track; clicking it (a second tap on touch) opens the case. The lit state reaches the WebGL
// renderer through a 'mark:lit' event on the drawing. Works with or without motion.
export function initMark(): void {
  const box = document.querySelector<HTMLElement>('.mark');
  const svg = box?.querySelector<SVGSVGElement>('svg.is-mark');
  const hit = box?.querySelector<SVGSVGElement>('svg.mark-hit');
  const tip = box?.querySelector<HTMLElement>('.mark-tip');
  if (!box || !svg || !hit || !tip) return;

  let cur: SVGGElement | null = null;
  let tapped: SVGGElement | null = null;
  const light = (g: SVGGElement | null): void => {
    if (cur === g) return;
    const prev = cur?.dataset.key;
    if (prev) for (const p of svg.querySelectorAll(`path[data-key="${prev}"]`)) p.classList.remove('on');
    cur = g;
    const key = g?.dataset.key;
    if (key) for (const p of svg.querySelectorAll(`path[data-key="${key}"]`)) p.classList.add('on');
    tip.textContent = g?.dataset.label ?? '';
    tip.classList.toggle('on', Boolean(g));
    svg.dispatchEvent(new CustomEvent('mark:lit', { detail: key ?? null }));
  };
  const moveTip = (e: PointerEvent | MouseEvent): void => {
    const r = box.getBoundingClientRect();
    tip.style.left = `${e.clientX - r.left}px`;
    tip.style.top = `${e.clientY - r.top}px`;
  };
  for (const g of hit.querySelectorAll<SVGGElement>('g[data-key]')) {
    g.addEventListener('pointerenter', (e) => {
      moveTip(e);
      light(g);
    });
    g.addEventListener('pointermove', moveTip);
    g.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') light(null);
    });
    g.addEventListener('click', (e) => {
      // touch: the first tap names the ray, a second tap on the same ray opens it
      const pe = e as PointerEvent;
      if (pe.pointerType && pe.pointerType !== 'mouse' && tapped !== g) {
        tapped = g;
        moveTip(e);
        light(g);
        return;
      }
      if (!g.classList.contains('here') && g.dataset.href) location.href = g.dataset.href;
    });
  }
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' && !hit.contains(e.target as Node)) {
      tapped = null;
      light(null);
    }
  });
}
