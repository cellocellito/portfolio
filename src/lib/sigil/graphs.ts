// Which graph draws a case's sigil.
// Side A: the architecture diagram from the case file. Side B (no diagram): a star around the site
// itself, with one node per stack item and one per known detail (where, role, dates, live link, mock,
// status): the stack alone gave Side B 2 to 3 nodes, and their sigils looked alike.
// Node ids must not depend on the language, or the same case drew a different sigil in PT.
// So details enter as language-free ids ("org", "role", "when"), never as their translated text.
// Unknown facts (TODO) never become nodes.
import type { Note, Work } from '../content';
import type { NodeKind, SigilGraph } from './generate';
import { MAX_NODES } from './generate';

const STATUS_KIND: Record<Work['data']['status']['kind'], NodeKind | null> = {
  live: 'trigger',
  used: 'service',
  shipped: 'store',
  'past-role': 'model',
  'in-progress': 'service',
  shelved: 'ui',
  todo: null,
};

export function caseGraph(entry: Work): { graph: SigilGraph; source: 'diagram' | 'case' } {
  const data = entry.data;
  const d = data.diagram;
  if (d)
    return {
      graph: { nodes: d.nodes.map((n) => ({ id: n.id, kind: n.kind })), edges: d.edges.map((e) => ({ from: e.from, to: e.to })) },
      source: 'diagram',
    };
  const known = (s: string | undefined): s is string => Boolean(s) && !s?.includes('TODO');
  const status = STATUS_KIND[data.status.kind];
  const details: { id: string; kind: NodeKind }[] = [
    // stack names are product names, the same in both languages
    ...data.stack.filter(known).map((s) => ({ id: `stack:${s.toLowerCase()}`, kind: 'service' as const })),
    ...(known(data.org) ? [{ id: 'org', kind: 'channel' as const }] : []),
    ...(known(data.role) ? [{ id: 'role', kind: 'model' as const }] : []),
    ...(known(data.when) ? [{ id: 'when', kind: 'store' as const }] : []),
    ...(data.links.live ? [{ id: 'live', kind: 'trigger' as const }] : []),
    ...(data.mock ? [{ id: 'mock', kind: 'ui' as const }] : []),
    ...(status ? [{ id: `status:${data.status.kind}`, kind: status }] : []),
  ].slice(0, MAX_NODES - 1);
  return {
    graph: { nodes: [{ id: 'site', kind: 'ui' }, ...details], edges: details.map((n) => ({ from: 'site', to: n.id })) },
    source: 'case',
  };
}

const NOTE_STATUS: Record<Note['data']['status'], NodeKind> = { open: 'trigger', fixed: 'store', workaround: 'model' };

/** A field note's sigil: a star of its stack items and its status. */
export function noteGraph(note: Note): SigilGraph {
  const items = note.data.stack.filter((s) => !s.includes('TODO')).slice(0, MAX_NODES - 2);
  const nodes = [
    { id: 'note', kind: 'ui' as const },
    ...items.map((s) => ({ id: `stack:${s.toLowerCase()}`, kind: 'service' as const })),
    { id: `status:${note.data.status}`, kind: NOTE_STATUS[note.data.status] },
  ];
  return { nodes, edges: nodes.slice(1).map((n) => ({ from: 'note', to: n.id })) };
}
