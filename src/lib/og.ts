// Open Graph images, rendered at build time: satori turns the layout and the text
// into SVG paths with our own font files, sharp turns that into a PNG. No network, no browser.
// Each image: the page's sigil, a kicker, the headline, and the name. Same palette as the site.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { generateSigil, type SigilGraph } from './sigil/generate';

import { OG_H, OG_W } from './og-path';

// satori reads TTF, OTF and WOFF (not WOFF2), so the OG fonts come from the Fontsource WOFF files.
const font = (pkg: string, file: string): Buffer => readFileSync(join(process.cwd(), 'node_modules', pkg, 'files', file));
let fonts: { name: string; data: Buffer; weight: 400 | 500; style: 'normal' | 'italic' }[] | undefined;
const loadFonts = (): NonNullable<typeof fonts> =>
  (fonts ??= [
    { name: 'Jacquard 24', data: font('@fontsource/jacquard-24', 'jacquard-24-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Newsreader', data: font('@fontsource/newsreader', 'newsreader-latin-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'Newsreader', data: font('@fontsource/newsreader', 'newsreader-latin-400-italic.woff'), weight: 400, style: 'italic' },
  ]);

const BG = '#080707';
const INK = '#ece6dc';
const SOFT = '#bdb4a8';
const ACCENT = '#ff3b21';
const LINE = '#2b2623';

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

// a type alias, not an interface: Astro's getStaticPaths props need an index-signature-compatible type
export type OgInput = {
  kicker: string;
  title: string;
  graph: SigilGraph;
  seedKey: string;
  name: string;
  nickname: string;
  /** the position on the record (A2, B4) or the note id (N2), set like the case pages' vermilion numeral */
  numeral?: string | undefined;
  /** About shows the 1-bit portrait instead of a sigil */
  portrait?: boolean | undefined;
  /** a smaller second line under a short title (the notes index), so the card has no empty band */
  sub?: string | undefined;
};

/** The headline's last two words stay together, so no line ends on a single word. */
const keepTogether = (title: string): string => {
  // (a non-breaking hyphen would be safer, but the Newsreader latin subset has no glyph for U+2011)
  const words = title.split(' ');
  if (words.length > 2) words.splice(-2, 2, `${words.at(-2)}\u00a0${words.at(-1)}`);
  return words.join(' ');
};

let portraitUri: string | undefined;
const portrait = (): string =>
  (portraitUri ??= `data:image/png;base64,${readFileSync(join(process.cwd(), 'src/assets/portrait/generated/portrait-bone.png')).toString('base64')}`);

export async function renderOg(input: OgInput): Promise<Buffer> {
  const { paths } = generateSigil(input.graph, input.seedKey, 1.6);
  const sigil = input.portrait
    ? { type: 'img', props: { src: portrait(), width: 300, height: 380, style: { objectFit: 'contain' } } }
    : el(
        'svg',
        { display: 'flex' },
        paths.map((d) => ({ type: 'path', props: { d, fill: INK } })),
        { width: 300, height: 450, viewBox: '0 0 200 300' },
      );
  const n = input.title.length;
  const size = (n > 110 ? 40 : n > 80 ? 46 : n > 50 ? 54 : n > 25 ? 64 : 84) - (input.numeral && n > 80 ? 4 : 0);
  // Explicit boxes: satori adds padding outside a declared size, which pushed the name row off the canvas.
  const PAD_X = 72,
    PAD_Y = 60,
    SIGIL_W = 330,
    GAP = 56;
  const innerW = OG_W - 2 * PAD_X,
    innerH = OG_H - 2 * PAD_Y,
    textW = innerW - SIGIL_W - GAP;
  const tree = el('div', { width: OG_W, height: OG_H, display: 'flex', background: BG, fontFamily: 'Newsreader' }, [
    el('div', { display: 'flex', width: innerW, height: innerH, margin: `${PAD_Y}px ${PAD_X}px` }, [
      el(
        'div',
        {
          display: 'flex',
          width: SIGIL_W,
          height: innerH,
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: `1px solid ${LINE}`,
        },
        [sigil],
      ),
      el(
        'div',
        { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: textW, height: innerH, marginLeft: GAP },
        [
          el('div', { display: 'flex', flexDirection: 'column', width: textW }, [
            ...(input.numeral
              ? [el('div', { color: ACCENT, fontSize: 76, fontStyle: 'italic', lineHeight: 0.9, marginBottom: 14 }, input.numeral)]
              : []),
            el('div', { color: ACCENT, fontSize: 22, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase' }, input.kicker),
            el(
              'div',
              { color: INK, fontSize: size, fontWeight: 500, lineHeight: 1.12, marginTop: 22, width: textW, textWrap: 'balance' },
              keepTogether(input.title),
            ),
            ...(input.sub
              ? [
                  el(
                    'div',
                    { color: SOFT, fontSize: 32, fontStyle: 'italic', lineHeight: 1.3, marginTop: 24, width: textW, textWrap: 'balance' },
                    keepTogether(input.sub),
                  ),
                ]
              : []),
          ]),
          el('div', { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: textW }, [
            el('div', { fontFamily: 'Jacquard 24', fontSize: 96, color: INK, lineHeight: 1 }, input.nickname),
            el('div', { color: SOFT, fontSize: 26, fontStyle: 'italic', paddingBottom: 10 }, input.name),
          ]),
        ],
      ),
    ]),
  ]);
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: OG_W, height: OG_H, fonts: loadFonts() });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
