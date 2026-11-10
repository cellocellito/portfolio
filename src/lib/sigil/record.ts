// The "record sigil": a graph of the record itself.
// One node per published track; an edge wherever two tracks share a stack item.
// Built from content data, so it changes when a case is added or removed.
import type { Work } from '../content';
import { position } from '../content';
import type { SigilGraph, NodeKind } from './generate';

const norm = (s: string): string | null => {
  if (s.includes('TODO')) return null; // unknown facts do not create connections
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
};

export interface RecordGraph extends SigilGraph {
  shared: { from: string; to: string; via: string[] }[];
}

export function recordGraph(tracks: Work[]): RecordGraph {
  const nodes = tracks.map((t) => ({ id: position(t), kind: (t.data.side === 'A' ? 'service' : 'ui') as NodeKind }));
  const stacks = tracks.map((t) => new Set(t.data.stack.map(norm).filter((x): x is string => x !== null)));
  const shared: RecordGraph['shared'] = [];
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      const a = stacks[i],
        b = stacks[j],
        ti = tracks[i],
        tj = tracks[j];
      if (!a || !b || !ti || !tj) continue;
      const via = [...a].filter((x) => b.has(x));
      if (via.length) shared.push({ from: position(ti), to: position(tj), via });
    }
  }
  return { nodes, edges: shared.map(({ from, to }) => ({ from, to })), shared };
}
