// Every built page, as a URL path. dist/ must exist (run `npm run build` first).
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export const DIST = join(process.cwd(), 'dist');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [],
  );
}

export const htmlFiles = (): string[] => walk(DIST);

/** "/work/x" for dist/work/x.html, "/" for index.html, "/pt" for pt.html. */
export function toRoute(file: string): string {
  const rel =
    '/' +
    relative(DIST, file)
      .replaceAll('\\', '/')
      .replace(/\.html$/, '');
  if (rel === '/index') return '/';
  return rel.replace(/\/index$/, '');
}

export const routes = (): string[] =>
  htmlFiles()
    .map(toRoute)
    .filter((r) => r !== '/404')
    .sort();
export const isPt = (route: string): boolean => route === '/pt' || route.startsWith('/pt/');
