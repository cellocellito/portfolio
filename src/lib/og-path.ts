// Where a page's Open Graph image lives. Kept apart from og.ts so the layout does not load satori.
export const OG_W = 1200;
export const OG_H = 630;

/** "/" → "/og/home.png", "/pt/work/x" → "/og/pt/work/x.png". */
export function ogPath(pathname: string): string {
  // build.format 'file' renders the home page as "/index.html"
  const bare =
    pathname
      .replace(/\.html$/, '')
      .replace(/\/index$/, '')
      .replace(/\/$/, '') || '/';
  if (bare === '/') return '/og/home.png';
  if (bare === '/pt') return '/og/pt/home.png';
  return `/og${bare}.png`;
}
