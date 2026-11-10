# Marcelo "Cello" Ribeiro Lima · Portfolio

**Live:** [portfolio-marcelo-mocha.vercel.app](https://portfolio-marcelo-mocha.vercel.app)

My portfolio, in English and Portuguese. It is laid out like a record: Side A is automation and AI, Side B is full-stack and web. Each project has its own page with what I built, the decisions behind it and its status.

## Stack

- Astro 7, fully static, TypeScript in strict mode, content in MDX collections checked against a schema
- No UI framework and no runtime dependencies: plain TypeScript for the motion, raw WebGL2 for the mark
- The site's mark is generated at build time from the project list (`src/lib/sigil/mark.ts`), so adding a project redraws it
- Self-hosted fonts, a strict Content Security Policy (no inline scripts or styles) and no third-party requests
- Respects `prefers-reduced-motion`, Save-Data and devices without WebGL2
- Playwright tests for accessibility, the CSP, SEO, layout and both languages, plus Lighthouse budgets

## Run

Node 22.23.4 or later.

```bash
npm ci
npm run dev       # http://localhost:4321
npm run build     # content checks, typecheck, build
npm run preview   # serve dist/ on http://localhost:4321
```

Checks (with `npm run preview` running in another terminal for the last two):

```bash
npm run lint      # ESLint and Prettier
npm run copy      # banned words and em dashes in the built pages
npm run budgets   # JS, CSS and font sizes
npm test          # Playwright, on Microsoft Edge
npm run lh        # Lighthouse budgets on key pages
```

## Where things live

| Path | What |
|---|---|
| `src/content/work/{en,pt}/` | One MDX file per project and language |
| `src/data/profile.ts` | Bio, skills, timeline, links |
| `src/i18n/` | Interface text in both languages |
| `src/views/`, `src/components/`, `src/layouts/` | Pages and components |
| `src/lib/sigil/mark.ts` | The generated mark |
| `src/scripts/` | Motion, the WebGL mark, the dither band, the language toggle |
| `scripts/` | Build checks and the texture generators |
| `tests/` | Playwright tests |

## Editing a project

Change both files in `src/content/work/en/` and `src/content/work/pt/`, then `npm run build`.

- Headings, in this order: Context, What I built, Decisions, What broke, Status (Portuguese: Contexto, O que construí, Decisões, O que quebrou, Status). Decisions and What broke can be left out.
- Frontmatter: `id` (A1, B2... the letter matches `side`), `side`, `order`, `title`, `name`, `when`, `summary`, `status` (`kind` and the `label` shown on the stamp), `stack`. Optional: `org`, `role`, `links`, `diagram`, `brand`, `shot`, `mock`, `draft`.
- A new project needs both languages with the same `id` and file name; the file name is its URL. `draft: true` keeps it out of the build.
