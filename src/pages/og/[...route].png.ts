// One Open Graph PNG per indexable page, both languages, built once at build time.
import type { APIRoute, GetStaticPaths } from 'astro';
import { profile } from '../../data/profile';
import { t, type Locale } from '../../i18n';
import { NOTES_PUBLISHED, notes, position, slugOf, works } from '../../lib/content';
import { renderOg, type OgInput } from '../../lib/og';
import { caseGraph, noteGraph } from '../../lib/sigil/graphs';
import { recordGraph } from '../../lib/sigil/record';

export const getStaticPaths: GetStaticPaths = async () => {
  const out: { params: { route: string }; props: OgInput }[] = [];
  for (const locale of ['en', 'pt'] as Locale[]) {
    const s = t(locale);
    const p = profile(locale);
    const pre = locale === 'pt' ? 'pt/' : '';
    const cases = await works(locale);
    const record = recordGraph(cases);
    const base = { name: p.name, nickname: p.nickname };
    out.push({
      params: { route: `${pre}home` },
      props: { ...base, kicker: `${s.kicker.sideA} · ${s.kicker.sideB}`, title: s.hero.lede, graph: record, seedKey: 'record' },
    });
    out.push({
      params: { route: `${pre}about` },
      props: {
        ...base,
        kicker: s.kicker.about,
        title: `${p.name}, ${p.nickname}. ${p.location}. ${p.remote}.`,
        graph: record,
        seedKey: 'record',
        portrait: true,
      },
    });
    if (NOTES_PUBLISHED)
      out.push({
        params: { route: `${pre}notes` },
        props: { ...base, kicker: s.kicker.notes, title: s.notes.title, sub: s.notes.intro, graph: record, seedKey: 'record' },
      });
    for (const e of cases) {
      const kicker = `${e.data.side === 'A' ? s.kicker.sideA : s.kicker.sideB} · ${s.sides[e.data.side]}`; // the position is the numeral
      out.push({
        params: { route: `${pre}work/${slugOf(e)}` },
        props: { ...base, kicker, title: e.data.title, graph: caseGraph(e).graph, seedKey: e.data.id, numeral: position(e) },
      });
    }
    for (const n of NOTES_PUBLISHED ? await notes(locale) : []) {
      out.push({
        params: { route: `${pre}notes/${slugOf(n)}` },
        props: {
          ...base,
          kicker: s.kicker.notes,
          title: n.data.title,
          graph: noteGraph(n),
          seedKey: n.data.id,
          numeral: n.data.id,
        },
      });
    }
  }
  return out;
};

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await renderOg(props as OgInput)), { headers: { 'Content-Type': 'image/png' } });
