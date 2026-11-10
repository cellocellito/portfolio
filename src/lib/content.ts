import { getCollection, type CollectionEntry } from 'astro:content';
import { splitId, type Locale } from '../i18n';

export type Work = CollectionEntry<'work'>;
export type Note = CollectionEntry<'notes'>;

/**
 * Field notes are unpublished: one note alone read as a blog that stopped.
 * The content stays in src/content/notes. To publish again: set this to true and rename src/pages/_notes and
 * src/pages/pt/_notes back to notes (the underscore keeps Astro from building them).
 */
export const NOTES_PUBLISHED = false;

export const slugOf = (entry: { id: string }): string => splitId(entry.id).slug;

/** Display position on the record, e.g. "A1", "B4". Comes from `order`, not from the id. */
export const position = (entry: Work): string => `${entry.data.side}${entry.data.order}`;

/**
 * The status sentence to print next to the status tag, or '' when it would only repeat the tag
 *.
 */
export function statusDetail(kindLabel: string, label: string): string {
  const norm = (x: string): string =>
    x
      .toLowerCase()
      .replace(/[.,:;!]+$/g, '')
      .trim();
  return norm(label) === norm(kindLabel) ? '' : label;
}

/** Published cases for a locale, in record order: Side A then Side B, by position. */
export async function works(locale: Locale): Promise<Work[]> {
  const all = await getCollection('work', (e) => !e.data.draft && splitId(e.id).locale === locale);
  return all.sort((a, b) => a.data.side.localeCompare(b.data.side) || a.data.order - b.data.order);
}

/** Published field notes for a locale, newest id first. */
export async function notes(locale: Locale): Promise<Note[]> {
  const all = await getCollection('notes', (e) => !e.data.draft && splitId(e.id).locale === locale);
  return all.sort((a, b) => Number(b.data.id.slice(1)) - Number(a.data.id.slice(1)));
}
