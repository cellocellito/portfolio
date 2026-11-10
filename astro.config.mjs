// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import todoMarks from './integrations/todo-marks.mjs';

// The site's address: canonical links, hreflang, the sitemap and the share images follow it.
export default defineConfig({
  site: 'https://portfolio-marcelo-mocha.vercel.app',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'never',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    mdx(),
    // SEO: hreflang pairs in the sitemap; the styleguide and the 404 stay out of it
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', pt: 'pt-BR' } },
      filter: (page) => !/\/(styleguide|404)(\.html)?$/.test(page),
    }),
    todoMarks(),
  ],
  // CSP is script-src 'self': never inline a bundled script, however small (Astro inlines below this limit).
  vite: { build: { assetsInlineLimit: 0 } },
});
