import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Diagram graph: the same data draws the readable SVG diagram and the sigil.
const node = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['trigger', 'channel', 'service', 'model', 'store', 'ui']),
  col: z.number().int().min(0),
  row: z.number().int().min(0),
  note: z.string().optional(),
});
const edge = z.object({ from: z.string(), to: z.string(), label: z.string().optional() });
const diagram = z
  .object({ nodes: z.array(node).min(2).max(12), edges: z.array(edge).min(1), confirmed: z.boolean().default(false) })
  .refine((d) => d.edges.every((e) => d.nodes.some((n) => n.id === e.from) && d.nodes.some((n) => n.id === e.to)), {
    message: 'every edge must point at existing node ids',
  });

const work = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),
  schema: ({ image }) =>
    z
      .object({
        id: z.string().regex(/^[AB]\d$/), // A1..B6: side letter and number
        side: z.enum(['A', 'B']),
        order: z.number().int().min(1), // display position on its side, not the id
        title: z.string().max(160), // one-line headline, concrete, no adjectives
        name: z.string(),
        org: z.string().optional(),
        role: z.string().optional(),
        when: z.string(), // display dates, may hold a TODO marker
        summary: z.string().max(240), // the one-sentence tracklist line
        status: z.object({
          kind: z.enum(['live', 'used', 'shipped', 'past-role', 'in-progress', 'shelved', 'todo']),
          label: z.string(),
        }),
        stack: z.array(z.string()).min(1),
        links: z.object({ repo: z.url().optional(), live: z.url().optional(), video: z.url().optional() }).default({}),
        diagram: diagram.optional(),
        mock: z.boolean().default(false), // true: UI mock recreated with fake data (B3, B6)
        brand: z.object({ logo: image(), alt: z.string() }).optional(), // only B1, B2
        // a capture of the owner's own live site (B1, B2); caption says where and when it was taken
        shot: z.object({ src: image(), mobile: image().optional(), alt: z.string(), caption: z.string() }).optional(),
        draft: z.boolean().default(false),
      })
      .refine((d) => d.side === d.id[0], { message: 'side must match the first letter of id' }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/notes' }),
  schema: z.object({
    id: z.string().regex(/^N\d+$/),
    title: z.string().max(140),
    date: z.string().optional(), // ISO yyyy-mm or yyyy-mm-dd when known
    status: z.enum(['fixed', 'open', 'workaround']),
    stack: z.array(z.string()).min(1),
    summary: z.string().max(240),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work, notes };
