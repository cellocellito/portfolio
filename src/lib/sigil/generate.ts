// Deterministic sigil generator: an architecture graph in, a mirrored thorn glyph out.
// Same graph, same sigil. Output is a list of filled SVG path strings in a 200×300 viewBox.

export type NodeKind = 'trigger' | 'channel' | 'service' | 'model' | 'store' | 'ui';
export interface SigilNode {
  id: string;
  kind: NodeKind;
}
export interface SigilEdge {
  from: string;
  to: string;
}
export interface SigilGraph {
  nodes: SigilNode[];
  edges: SigilEdge[];
}
export interface Sigil {
  seed: number;
  paths: string[];
}
type Pt = [number, number];
type Cubic = [Pt, Pt, Pt, Pt];

export const VIEW_W = 200;
export const VIEW_H = 300;
export const MAX_NODES = 12; // denser graphs turn into a cluttered mass
export const MIN_NODES = 6;

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function bez(P: Cubic, t: number): Pt {
  const u = 1 - t,
    a = u * u * u,
    b = 3 * u * u * t,
    c = 3 * u * t * t,
    d = t * t * t;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
}
const f2 = (v: number): string => v.toFixed(2);
const thorn = (t: number): number => Math.pow(1 - t, 0.85);
const both = (t: number): number => Math.pow(Math.sin(Math.PI * t), 0.55);
const mirror = (P: Cubic): Cubic => P.map(([x, y]) => [VIEW_W - x, y] as Pt) as Cubic;

/** Filled tapered stroke along a cubic Bézier, width(t) = w0 · profile(t). */
export function taper(P: Cubic, w0: number, profile: (t: number) => number, n = 30): string {
  const L: Pt[] = [],
    R: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      a = bez(P, t),
      b = bez(P, Math.min(1, t + 0.002)),
      c = bez(P, Math.max(0, t - 0.002));
    const dx = b[0] - c[0],
      dy = b[1] - c[1],
      len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len,
      ny = dx / len,
      w = (w0 * profile(t)) / 2;
    L.push([a[0] + nx * w, a[1] + ny * w]);
    R.push([a[0] - nx * w, a[1] - ny * w]);
  }
  return (
    'M' +
    L.concat(R.reverse())
      .map((p) => `${f2(p[0])} ${f2(p[1])}`)
      .join('L') +
    'Z'
  );
}
export const profiles = { thorn, both };

/**
 * @param key  stable identity mixed into the seed (e.g. the case id), so two cases with the
 *             same shape still differ
 * @param wmul stroke-width multiplier (thicker for large renders, e.g. the WebGL texture)
 * @param opts.ribs re-render with the curl sign flipped back, as in the first generator: the thorns
 *             curl back toward the spine and the mirrored pairs read as a ribcage (B5 "What broke")
 */
export function generateSigil(input: SigilGraph, key: string, wmul = 1, opts: { ribs?: boolean } = {}): Sigil {
  if (input.nodes.length > MAX_NODES) throw new Error(`sigil "${key}": ${input.nodes.length} nodes, max is ${MAX_NODES}`);
  // 1–2 node graphs drew a bare cross. Small graphs get ornamental thorns
  // (kind 'ui', no edges) so the glyph still reads as a sigil.
  const pad = Array.from({ length: Math.max(0, MIN_NODES - input.nodes.length) }, (_, k) => ({ id: `ornament-${k}`, kind: 'ui' as const }));
  const graph: SigilGraph = { nodes: [...input.nodes, ...pad], edges: input.edges };
  const ids = graph.nodes.map((n) => n.id);
  const seed = hashStr(`${key}:${ids.join('|')}:${graph.edges.map((e) => `${e.from}>${e.to}`).join('|')}`);
  const rnd = mulberry32(seed);
  const deg = new Map(ids.map((i) => [i, 0]));
  for (const e of graph.edges) {
    deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
    deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
  }

  const paths: string[] = [];
  const top = 14,
    bot = 286,
    n = graph.nodes.length;
  const joint = new Map<string, number>();
  const thornAt = new Map<string, Cubic>();
  const pair = (P: Cubic, w: number, prof: (t: number) => number, steps?: number): void => {
    paths.push(taper(P, w * wmul, prof, steps), taper(mirror(P), w * wmul, prof, steps));
  };

  paths.push(
    taper(
      [
        [100, top - 8],
        [100, 100],
        [100, 200],
        [100, bot + 8],
      ],
      3.4 * wmul,
      both,
      48,
    ),
  );

  graph.nodes.forEach((node, i) => {
    const y = top + 26 + ((bot - top - 52) * (i + 0.5)) / n;
    joint.set(node.id, y);
    const up = node.kind === 'trigger' || rnd() < 0.55;
    const ang = up ? -(0.3 + rnd() * 0.85) : 0.08 + rnd() * 0.62;
    const len = Math.min(94, 26 + (deg.get(node.id) ?? 0) * 7 + rnd() * 34);
    const curl = up ? 0.2 + rnd() * 0.5 : 0.35 + rnd() * 0.55; // up: hooks into horns, down: sweeps out flat
    const p0: Pt = [101.2, y];
    const p3: Pt = [100 + len * Math.cos(ang), y + len * Math.sin(ang)];
    // no thorn may read as a rib. A rib leaves the spine much flatter than its
    // chord and curls; a thorn follows its chord and bends at the tip. So the start stays near the chord, an
    // upward tail stops short of vertical (past it the tip curled back to the spine), and a downward thorn
    // ends pointing outward and down.
    const head = opts.ribs ? ang - curl : up ? Math.min(ang + curl * 0.6, -0.18) : ang + curl * 0.6;
    const p1: Pt = [p0[0] + len * 0.42 * Math.cos(head), p0[1] + len * 0.42 * Math.sin(head)];
    const tail = opts.ribs ? ang + curl * 0.9 : up ? Math.max(-1.2, ang - curl * 0.9) : Math.max(0.12, ang - curl * 0.6);
    const p2: Pt = [p3[0] - len * 0.34 * Math.cos(tail), p3[1] - len * 0.34 * Math.sin(tail)];
    const P: Cubic = [p0, p1, p2, p3];
    thornAt.set(node.id, P);
    const w0 = 2.2 + rnd() * 1.6;
    pair(P, w0, thorn);
    const barbs = 1 + (rnd() < 0.5 ? 1 : 0);
    for (let k = 0; k < barbs; k++) {
      const tb = 0.42 + rnd() * 0.38,
        s = bez(P, tb),
        s2 = bez(P, tb + 0.02);
      const ta = Math.atan2(s2[1] - s[1], s2[0] - s[0]);
      const ba = ta + (up ? -1 : 1) * (0.55 + rnd() * 0.5),
        bl = 8 + rnd() * 12;
      const e: Pt = [s[0] + bl * Math.cos(ba), s[1] + bl * Math.sin(ba)];
      pair(
        [
          s,
          [s[0] + bl * 0.4 * Math.cos(ba - 0.3), s[1] + bl * 0.4 * Math.sin(ba - 0.3)],
          [e[0] - bl * 0.3 * Math.cos(ba + 0.2), e[1] - bl * 0.3 * Math.sin(ba + 0.2)],
          e,
        ],
        w0 * 0.55,
        thorn,
        12,
      );
    }
    if (node.kind === 'store') {
      const s = 4.2 * Math.sqrt(wmul);
      paths.push(`M100 ${f2(y - s * 1.6)}L${f2(100 + s)} ${f2(y)}L100 ${f2(y + s * 1.6)}L${f2(100 - s)} ${f2(y)}Z`);
    }
    if (node.kind === 'model')
      paths.push(
        taper(
          [
            [86, y + 5],
            [95, y + 2],
            [105, y + 2],
            [114, y + 5],
          ],
          1.6 * wmul,
          both,
          16,
        ),
      );
  });

  graph.edges.forEach((edge, k) => {
    const P = thornAt.get(edge.from);
    const target = joint.get(edge.to);
    if (!P || target === undefined) return;
    const t = 0.32 + rnd() * 0.36,
      s = bez(P, t),
      dy = target - s[1];
    const ang = Math.atan2(dy, 60 + rnd() * 30) * 0.7 + (rnd() - 0.5) * 0.5,
      len = 14 + rnd() * 22;
    const e: Pt = [s[0] + len * Math.cos(ang), s[1] + len * Math.sin(ang)];
    const c1: Pt = [s[0] + len * 0.5 * Math.cos(ang - 0.6), s[1] + len * 0.5 * Math.sin(ang - 0.6)];
    const c2: Pt = [e[0] - len * 0.3 * Math.cos(ang + 0.5), e[1] - len * 0.3 * Math.sin(ang + 0.5)];
    const Q = [s, c1, c2, e].map(([x, y]) => [Math.max(4, Math.min(196, x)), y] as Pt) as Cubic;
    pair(Q, 1.3 + rnd() * 0.6, thorn, 18);
    if (k % 3 === 2) pair([e, [e[0] + 6, e[1] - 6], [e[0] + 2, e[1] - 12], [e[0] - 6, e[1] - 13]], 1.1, thorn, 10);
  });

  return { seed, paths };
}
