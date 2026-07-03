import './styles/style.css';
import { initHud } from './modules/hud';
import { initWork } from './modules/work';
import { initFooter } from './modules/footer';
import { initI18n } from './modules/i18n';
import { initMotion, prefersReducedMotion } from './modules/motion';

initHud();
initWork(prefersReducedMotion);
initFooter(); // duplicates the ticker (clones keep data-i18n) — must precede i18n
initI18n();
initMotion();

const idle = (cb: () => void, timeout = 1800): void => {
  const ric: typeof window.requestIdleCallback | undefined = window.requestIdleCallback;
  if (ric) ric(() => cb(), { timeout });
  else window.setTimeout(cb, timeout);
};

// Heavy, non-critical layers load after everything else — they never block content.
window.addEventListener('load', () => {
  idle(() => {
    import('./modules/icons')
      .then((m) => m.initIcons(prefersReducedMotion))
      .catch(() => {/* pixel SVG fallbacks stay */});
  });
  if (!prefersReducedMotion) {
    idle(() => {
      import('./modules/hero-scene')
        .then((m) => m.initHeroScene())
        .catch(() => {/* static dither fallback stays */});
    }, 900);
  }
});
