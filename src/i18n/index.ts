import { en, type Strings } from './en';
import { pt } from './pt';

export type Locale = 'en' | 'pt';
export const locales: readonly Locale[] = ['en', 'pt'];
export const htmlLang: Record<Locale, string> = { en: 'en', pt: 'pt-BR' };

export function t(locale: Locale): Strings {
  return locale === 'en' ? en : pt;
}

/** Path for a locale. EN lives at the root, PT under /pt, same slugs and segments. */
export function localePath(locale: Locale, path: string): string {
  const clean = path === '' ? '/' : path;
  if (locale === 'en') return clean;
  return clean === '/' ? '/pt' : `/pt${clean}`;
}

/** The same page in the other locale (used by the toggle and hreflang). */
export function switchLocale(pathname: string, to: Locale): string {
  const noHtml = pathname.replace(/\.html$/, '').replace(/\/index$/, '') || '/';
  const base = noHtml === '/pt' ? '/' : noHtml.startsWith('/pt/') ? noHtml.slice(3) : noHtml;
  return localePath(to, base);
}

/** Entry ids from the glob loader look like "en/whatsapp-assistant". */
export function splitId(id: string): { locale: Locale; slug: string } {
  const [locale, ...rest] = id.split('/');
  return { locale: locale === 'pt' ? 'pt' : 'en', slug: rest.join('/') };
}
