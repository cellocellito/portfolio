// Architecture diagram layout, computed at build time from the case frontmatter (zero JS).
// Columns come from `col`, rows from `row`. Edges must join neighbouring columns, so every edge is a
// short orthogonal run through the gap between two columns and never crosses a box.

export type NodeKind = 'trigger' | 'channel' | 'service' | 'model' | 'store' | 'ui';
export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
  col: number;
  row: number;
}
export interface DiagramEdge {
  from: string;
  to: string;
  label?: string | undefined;
}

export interface Box {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  sub?: string | undefined;
  hub: boolean;
}
export interface Layout {
  width: number;
  height: number;
  boxes: Box[];
  paths: string[];
  /** size bucket, used by container queries to decide when the SVG gets too small to read */
  size: 's' | 'm' | 'l';
}

// Departure Mono advance is about 0.64em (measured against Consolas in fonts.css, +15.7%).
const FONT = 13;
const CHAR = FONT * 0.64;
const LINE = 17;
const PAD_X = 14;
const PAD_TOP = 26; // room for the kind label
const PAD_BOTTOM = 12;
const GAP_X = 64;
const GAP_Y = 18;
const WRAP = 18;
const RADIUS = 6;

/** "Router agent (GPT-5-mini)" → main lines ["Router agent"], sub "GPT-5-mini". */
export function splitLabel(label: string): { lines: string[]; sub?: string | undefined } {
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(label);
  const main = (m?.[1] ?? label).trim();
  const sub = m?.[2]?.trim();
  const words = main.split(/\s+/);
  if (main.length <= WRAP || words.length < 2) return { lines: [main], sub };
  // Two balanced lines ("REST + SQL" / "back office", not "REST + SQL back" / "office").
  let best = { at: 1, worst: Infinity };
  for (let at = 1; at < words.length; at++) {
    const worst = Math.max(words.slice(0, at).join(' ').length, words.slice(at).join(' ').length);
    if (worst < best.worst) best = { at, worst };
  }
  return { lines: [words.slice(0, best.at).join(' '), words.slice(best.at).join(' ')], sub };
}

export function layoutDiagram(nodes: DiagramNode[], edges: DiagramEdge[], key: string): Layout {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const a = byId.get(e.from),
      b = byId.get(e.to);
    if (!a || !b) throw new Error(`diagram ${key}: edge ${e.from} → ${e.to} names a missing node`);
    if (b.col !== a.col + 1)
      throw new Error(`diagram ${key}: edge ${e.from} → ${e.to} must join neighbouring columns (col ${a.col} → ${b.col})`);
  }
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  const maxDeg = Math.max(...degree.values());

  const labels = new Map(nodes.map((n) => [n.id, splitLabel(n.label)]));
  const lineCount = (id: string): number => {
    const l = labels.get(id);
    return (l?.lines.length ?? 1) + (l?.sub ? 1 : 0);
  };
  const boxH = PAD_TOP + Math.max(...nodes.map((n) => lineCount(n.id))) * LINE + PAD_BOTTOM;
  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...nodes.map((n) => n.row)) + 1;

  const colW: number[] = [];
  for (let c = 0; c < cols; c++) {
    const inCol = nodes.filter((n) => n.col === c);
    const chars = Math.max(
      8,
      ...inCol.map((n) => {
        const l = labels.get(n.id);
        return Math.max(...(l?.lines ?? ['']).map((x) => x.length), l?.sub?.length ?? 0, n.kind.length + 2);
      }),
    );
    colW.push(Math.ceil(chars * CHAR + PAD_X * 2));
  }
  const colX: number[] = [];
  colW.reduce((x, w, i) => {
    colX[i] = x;
    return x + w + GAP_X;
  }, 1);

  const boxes: Box[] = nodes.map((n) => {
    const l = labels.get(n.id);
    return {
      id: n.id,
      kind: n.kind,
      x: colX[n.col] ?? 0,
      y: 1 + n.row * (boxH + GAP_Y),
      w: colW[n.col] ?? 0,
      h: boxH,
      lines: l?.lines ?? [n.label],
      sub: l?.sub,
      hub: (degree.get(n.id) ?? 0) === maxDeg && maxDeg >= 3,
    };
  });
  const box = new Map(boxes.map((b) => [b.id, b]));

  const paths = edges.map((e) => {
    const a = box.get(e.from),
      b = box.get(e.to);
    if (!a || !b) return '';
    const x1 = a.x + a.w,
      y1 = a.y + a.h / 2,
      x2 = b.x - 3, // leave room for the arrowhead
      y2 = b.y + b.h / 2;
    if (Math.abs(y1 - y2) < 0.5) return `M${x1} ${y1}H${x2}`;
    const xm = x1 + GAP_X / 2,
      dir = y2 > y1 ? 1 : -1,
      r = Math.min(RADIUS, Math.abs(y2 - y1) / 2);
    return [
      `M${x1} ${y1}`,
      `H${xm - r}`,
      `Q${xm} ${y1} ${xm} ${y1 + dir * r}`,
      `V${y2 - dir * r}`,
      `Q${xm} ${y2} ${xm + r} ${y2}`,
      `H${x2}`,
    ].join('');
  });

  const width = (colX[cols - 1] ?? 0) + (colW[cols - 1] ?? 0) + 1;
  const height = rows * (boxH + GAP_Y) - GAP_Y + 2;
  const size = width <= 560 ? 's' : width <= 760 ? 'm' : 'l';
  return { width, height, boxes, paths, size };
}

export interface TreeItem {
  id: string;
  label: string;
  kind: NodeKind;
  /** already shown earlier in the tree (a node with two inputs) */
  ref: boolean;
  children: TreeItem[];
}

/** The same graph as an outline: roots are nodes with no input, children are the nodes they feed. */
export function diagramTree(nodes: DiagramNode[], edges: DiagramEdge[]): TreeItem[] {
  const order = (a: DiagramNode, b: DiagramNode): number => a.col - b.col || a.row - b.row;
  const out = new Map<string, DiagramNode[]>();
  for (const e of edges) {
    const to = nodes.find((n) => n.id === e.to);
    if (to) out.set(e.from, [...(out.get(e.from) ?? []), to]);
  }
  const hasInput = new Set(edges.map((e) => e.to));
  const seen = new Set<string>();
  const visit = (n: DiagramNode): TreeItem => {
    if (seen.has(n.id)) return { id: n.id, label: n.label, kind: n.kind, ref: true, children: [] };
    seen.add(n.id);
    const kids = [...(out.get(n.id) ?? [])].sort(order);
    return { id: n.id, label: n.label, kind: n.kind, ref: false, children: kids.map(visit) };
  };
  return [...nodes]
    .filter((n) => !hasInput.has(n.id))
    .sort(order)
    .map(visit);
}
