// WCAG 2.x relative luminance and contrast ratio. Used by /styleguide and tests/tokens.spec.ts.
export function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const full =
    v.length === 3
      ? v
          .split('')
          .map((c) => c + c)
          .join('')
      : v;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}
/** Parse `--name: #hex;` custom properties from a CSS string. */
export function hexTokens(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{3,8})\b/gi)) if (m[1] && m[2]) out[m[1]] = m[2].toLowerCase();
  return out;
}
/** Text/background pairs that must hold. min: 4.5 body text, 3 large text and UI boundaries. */
export const PAIRS: { fg: string; bg: string; min: number; use: string }[] = [
  { fg: 'ink', bg: 'bg', min: 4.5, use: 'headings, key text' },
  { fg: 'ink', bg: 'surface', min: 4.5, use: 'text on panels, hover rows' },
  { fg: 'ink', bg: 'surface-2', min: 4.5, use: 'text on pressed rows' },
  { fg: 'soft', bg: 'bg', min: 4.5, use: 'body text' },
  { fg: 'soft', bg: 'surface', min: 4.5, use: 'summaries on hover rows' },
  { fg: 'muted', bg: 'bg', min: 4.5, use: 'marginalia, meta' },
  { fg: 'muted', bg: 'surface', min: 4.5, use: 'marginalia on hover rows' },
  { fg: 'accent', bg: 'bg', min: 4.5, use: 'rubrics, positions (small mono)' },
  { fg: 'accent', bg: 'surface', min: 4.5, use: 'rubrics on hover rows' },
  { fg: 'on-accent', bg: 'accent', min: 4.5, use: 'text on vermilion fills (hovered doors)' },
  { fg: 'line-strong', bg: 'bg', min: 3, use: 'UI boundaries (doors, tags, TODO marks)' },
  { fg: 'accent', bg: 'bg', min: 3, use: 'focus ring' },
];
