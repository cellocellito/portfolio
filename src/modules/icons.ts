/**
 * useAnimations micro-interaction icons (https://useanimations.com/), rendered
 * with the light Lottie player. Lazy-loaded on idle; if anything fails, the
 * inline pixel-SVG fallbacks in the HTML simply remain.
 */
export async function initIcons(reduced: boolean): Promise<void> {
  const mounts = document.querySelectorAll<HTMLElement>('[data-anim-icon]');
  if (!mounts.length) return;

  const [{ default: lottie }, github, linkedin] = await Promise.all([
    import('lottie-web/build/player/lottie_light'),
    import('react-useanimations/lib/github'),
    import('react-useanimations/lib/linkedin'),
  ]);
  const data: Record<string, { animationData: unknown }> = {
    github: github.default,
    linkedin: linkedin.default,
  };

  mounts.forEach((mount) => {
    const icon = data[mount.dataset.animIcon ?? ''];
    if (!icon) return;

    const anim = lottie.loadAnimation({
      container: mount,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: icon.animationData,
    });

    anim.addEventListener('DOMLoaded', () => {
      mount.classList.add('icon-live');
      // baked black strokes -> currentColor (ink-on-amber, see .social__icon)
      mount
        .querySelectorAll<SVGElement>('path[stroke], line[stroke], circle[stroke], polyline[stroke]')
        .forEach((p) => p.setAttribute('stroke', 'currentColor'));
      mount
        .querySelectorAll<SVGElement>('path[fill]:not([fill="none"]), rect[fill]:not([fill="none"])')
        .forEach((p) => p.setAttribute('fill', 'currentColor'));
    });

    if (reduced) {
      anim.goToAndStop(0, true);
      return;
    }

    const host = mount.closest('a') ?? mount;
    const play = (): void => { anim.setDirection(1); anim.play(); };
    const rewind = (): void => { anim.setDirection(-1); anim.play(); };
    host.addEventListener('mouseenter', play);
    host.addEventListener('mouseleave', rewind);
    host.addEventListener('focus', play);
    host.addEventListener('blur', rewind);
  });
}
