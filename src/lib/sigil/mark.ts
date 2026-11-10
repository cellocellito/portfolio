// The record's mark, "Halo": one tattoo-grade sigil for the
// whole site, drawn at build time from the published tracklist. A thorned sunburst around an eye, inside an
// open crown ring, with needles above and below. The data: each track owns one mirrored pair of rays, Side A
// across the upper half and Side B across the lower half, in track order; long and short rays alternate.
// The eye, ring, needles and crossguards are the frame, not data. Seeded by each track's slug, so the same
// tracklist always draws the same mark. Shapes are filled outlines; the eye's path holds a hole (draw with
// fill-rule evenodd).

export interface MarkTrack {
  pos: string; // "A1"
  slug: string;
  name: string;
  href: string;
}
export interface MarkItem extends MarkTrack {
  /** filled outlines (both sides), one path each */
  shapes: string[];
  /** centrelines (both sides), for the pointer's hit strokes */
  hit: string[];
}
export interface Mark {
  base: string[];
  items: MarkItem[];
}

type Pt = { x: number; y: number; tx: number; ty: number; u: number };
type P2 = [number, number];
type Poly = P2[];
type Seg = [P2, P2, P2, P2];

export const MARK_W = 200;
export const MARK_H = 300;
const CX = 100;

const rng = (str: string): (() => number) => {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const cub = (s: Seg, t: number): P2 => {
  const u = 1 - t;
  const f = (k: 0 | 1): number => u * u * u * s[0][k] + 3 * u * u * t * s[1][k] + 3 * u * t * t * s[2][k] + t * t * t * s[3][k];
  return [f(0), f(1)];
};
const dcub = (s: Seg, t: number): P2 => {
  const u = 1 - t;
  const f = (k: 0 | 1): number => 3 * u * u * (s[1][k] - s[0][k]) + 6 * u * t * (s[2][k] - s[1][k]) + 3 * t * t * (s[3][k] - s[2][k]);
  return [f(0), f(1)];
};
// a chain of cubic segments, sampled, with unit tangents and an arc-length parameter u in 0..1
const sample = (segs: Seg[], n = 36): Pt[] => {
  const raw: { x: number; y: number; tx: number; ty: number }[] = [];
  segs.forEach((s, k) => {
    for (let i = k ? 1 : 0; i <= n; i++) {
      const [x, y] = cub(s, i / n);
      const [dx, dy] = dcub(s, i / n);
      const L = Math.hypot(dx, dy) || 1;
      raw.push({ x, y, tx: dx / L, ty: dy / L });
    }
  });
  const s = [0];
  for (let i = 1; i < raw.length; i++) s.push((s[i - 1] ?? 0) + Math.hypot(raw[i]!.x - raw[i - 1]!.x, raw[i]!.y - raw[i - 1]!.y));
  const total = s[s.length - 1] || 1;
  return raw.map((p, i) => ({ ...p, u: (s[i] ?? 0) / total }));
};
// a filled stroke of varying width along sampled points (left normal: -ty, tx)
const ribbon = (pts: Pt[], wf: (u: number) => number): Poly => {
  const L: Poly = [],
    R: Poly = [];
  for (const p of pts) {
    const w = wf(p.u) / 2;
    L.push([p.x - p.ty * w, p.y + p.tx * w]);
    R.push([p.x + p.ty * w, p.y - p.tx * w]);
  }
  return L.concat(R.reverse());
};
const at = (pts: Pt[], u: number): Pt => pts[Math.round(Math.min(1, Math.max(0, u)) * (pts.length - 1))]!;
const sideToward = (pts: Pt[], u: number, dx: number, dy: number): number => {
  const p = at(pts, u);
  return -p.ty * dx + p.tx * dy >= 0 ? 1 : -1;
};
// a heavy body swelling a third of the way out, then a long needle taper
const body =
  (W: number) =>
  (u: number): number =>
    u < 0.3 ? W * (0.34 + 0.66 * Math.sin(((Math.PI / 2) * u) / 0.3)) : W * Math.pow((1 - u) / 0.7, 1.6);
const needle =
  (W: number, p = 1.3) =>
  (u: number): number =>
    W * Math.pow(1 - u, p);
// a curved spike from a base point: angle in degrees (0 right, -90 up), length, base width, sideways bend
const spike = (x: number, y: number, deg: number, len: number, w: number, bend = 0): Poly => {
  const a = (deg * Math.PI) / 180,
    dx = Math.cos(a),
    dy = Math.sin(a),
    nx = -dy,
    ny = dx;
  const seg: Seg = [
    [x, y],
    [x + dx * len * 0.33 + nx * bend * 0.4, y + dy * len * 0.33 + ny * bend * 0.4],
    [x + dx * len * 0.66 + nx * bend * 0.9, y + dy * len * 0.66 + ny * bend * 0.9],
    [x + dx * len + nx * bend * 0.4, y + dy * len + ny * bend * 0.4],
  ];
  return ribbon(sample([seg], 9), needle(w));
};
// a thorn standing on a stroke's edge at u, leaning toward the stroke's tip
const thorn = (pts: Pt[], wf: (u: number) => number, u: number, side: number, len: number, lean = 0.75): Poly => {
  const p = at(pts, u);
  const w = wf(p.u) / 2;
  const nx = -p.ty * side,
    ny = p.tx * side;
  const bx = p.x + nx * w * 0.6,
    by = p.y + ny * w * 0.6;
  const deg = (Math.atan2(p.ty * lean + ny * (1 - lean * 0.45), p.tx * lean + nx * (1 - lean * 0.45)) * 180) / Math.PI;
  return spike(bx, by, deg, len, Math.max(1.4, w * 1.1), len * 0.18 * side * (p.tx * ny - p.ty * nx > 0 ? -1 : 1));
};
// a pointed oval (vesica)
const almond = (cx: number, cy: number, rx: number, ry: number, n = 32): Poly => {
  const pts: Poly = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI,
      s = Math.sin(t);
    pts.push([cx + rx * Math.sign(s) * Math.pow(Math.abs(s), 1.4), cy - ry * Math.cos(t)]);
  }
  return pts;
};
// one decimal: 0.1 viewBox unit is about 0.3 px at cover size, and the mark is inline on every page
const f2 = (n: number): string => n.toFixed(1);
const sub = (poly: Poly): string => 'M' + poly.map(([x, y]) => `${f2(x)} ${f2(y)}`).join('L') + 'Z';
const lineD = (pts: Pt[]): string => 'M' + pts.map((p) => `${f2(p.x)} ${f2(p.y)}`).join('L');
const mirror = (poly: Poly): Poly => poly.map(([x, y]) => [2 * CX - x, y]);
const mirrorPts = (pts: Pt[]): Pt[] => pts.map((p) => ({ ...p, x: 2 * CX - p.x }));
const pair = (poly: Poly): string[] => [sub(poly), sub(mirror(poly))];
const placeAt = (segs: Seg[], bx: number, by: number, deg: number): Seg[] => {
  const a = (deg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return segs.map((seg) => seg.map(([x, h]) => [bx + x * c + h * s, by - x * s + h * c]) as Seg);
};
const fits = (segs: Seg[]): boolean => sample(segs, 12).every((p) => p.x < 190 && p.y > 6 && p.y < 290);
// shrink a shape until it fits inside the mark
const fit = (make: (L: number) => Seg[], L: number): Seg[] => {
  for (let k = 0; k < 30; k++, L *= 0.94) {
    const segs = make(L);
    if (fits(segs)) return segs;
  }
  return make(L);
};

export function halo(tracks: MarkTrack[]): Mark {
  const base: string[] = [];
  const items: MarkItem[] = [];
  const EYE = 150,
    rx = 16,
    ry = 23;
  // the needles above and below the eye, thick where they meet it
  base.push(
    sub(
      ribbon(
        sample(
          [
            [
              [CX, 3],
              [CX, 40],
              [CX, 90],
              [CX, EYE - ry + 4],
            ],
          ],
          14,
        ),
        (u) => 4.4 * Math.pow(u, 0.55),
      ),
    ),
  );
  base.push(
    sub(
      ribbon(
        sample(
          [
            [
              [CX, EYE + ry - 4],
              [CX, 210],
              [CX, 260],
              [CX, 297],
            ],
          ],
          14,
        ),
        (u) => 4.4 * Math.pow(1 - u, 0.55),
      ),
    ),
  );
  // the eye: a pointed ring (one path, its hole a second subpath) and a pupil
  base.push(sub(almond(CX, EYE, rx, ry)) + sub(almond(CX, EYE, rx * 0.51, ry * 0.62).reverse()));
  base.push(sub(almond(CX, EYE, rx * 0.19, ry * 0.32)));
  // the needles' crossguards, the bottom a mirror of the top
  for (const s of [1, -1]) {
    base.push(...pair(spike(CX + 1, EYE - s * 118, -12 * s, 10, 2.3, -2.5 * s)));
    base.push(...pair(spike(CX + 1, EYE - s * 100, -36 * s, 7, 2, -2 * s)));
  }
  // the crown: a hairline ring around the eye, open at the top and bottom, with spikes on its rim
  const RR = 74;
  const arc: P2[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = ((80 - (160 * i) / 48) * Math.PI) / 180;
    arc.push([CX + RR * Math.cos(a), EYE - RR * 1.08 * Math.sin(a)]);
  }
  const arcPts: Pt[] = arc.map(([x, y], i) => {
    const [x2, y2] = arc[Math.min(48, i + 1)]!,
      [x1, y1] = arc[Math.max(0, i - 1)]!;
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    return { x, y, tx: (x2 - x1) / L, ty: (y2 - y1) / L, u: i / 48 };
  });
  base.push(...pair(ribbon(arcPts, (u) => 1.8 * Math.pow(Math.sin(Math.PI * u), 0.35))));
  for (const d of [62, 30, -30, -62]) {
    const a = (d * Math.PI) / 180;
    base.push(...pair(spike(CX + RR * Math.cos(a), EYE - RR * 1.08 * Math.sin(a), -d, 8, 2.2)));
  }
  // the rays: Side A across the upper half, Side B across the lower, all leaning the same way
  const A = tracks.filter((t) => t.pos.startsWith('A')),
    B = tracks.filter((t) => t.pos.startsWith('B'));
  const angs = [...A.map((_, i) => 72 - i * 22), ...B.map((_, i) => 4 - i * 19)];
  [...A, ...B].forEach((t, k) => {
    const r = rng(t.slug);
    const deg = (angs[k] ?? 0) + (r() - 0.5) * 4;
    const a = (deg * Math.PI) / 180;
    const bx = CX + (rx - 2.5) * Math.cos(a),
      by = EYE - (ry - 4) * Math.sin(a);
    const long = k % 2 === 0;
    const ray = (L: number): Seg[] => [
      [
        [0, 0],
        [0.34 * L, 0],
        [0.68 * L, 0.02 * L],
        [L, 0.07 * L],
      ],
    ];
    const segs = fit((L) => placeAt(ray(L), bx, by, deg), (long ? 88 : 52) + r() * 6);
    // the ray, thorns on its trailing edge and one under it
    const pts = sample(segs);
    const hp = sample(segs, 8);
    const wf = body(long ? 6.6 : 4.8);
    const polys: Poly[] = [ribbon(sample(segs, 18), wf)]; // a lighter outline; thorns sit on the fine samples
    const side = sideToward(pts, 0.4, Math.sin(a), Math.cos(a));
    const us = long ? [0.3, 0.56] : [0.42];
    us.forEach((u, j) => polys.push(thorn(pts, wf, u + (r() - 0.5) * 0.05, side, (j ? 7 : 10) + r() * 3)));
    polys.push(thorn(pts, wf, 0.48 + r() * 0.06, -side, 5 + r() * 2, 0.85));
    items.push({ ...t, shapes: polys.flatMap(pair), hit: [lineD(hp), lineD(mirrorPts(hp))] });
  });
  return { base, items };
}
