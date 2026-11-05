/**
 * Mini-langage des textes :
 *   - texte enrichi : [[motId]] ou [[motId|texte affiché]] → mot collectable
 *   - phrase à trous : {motId} ou {motA/motB} → case à remplir
 */

export type RichSegment =
  | { type: 'text'; text: string }
  | { type: 'word'; id: string; text: string | null };

export type SentenceSegment =
  | { type: 'text'; text: string }
  | { type: 'blank'; answers: string[] };

const WORD_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const BLANK_RE = /\{([^}]+)\}/g;

export function parseRich(text: string): RichSegment[] {
  const out: RichSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: 'text', text: text.slice(last, start) });
    out.push({ type: 'word', id: m[1].trim(), text: m[2]?.trim() ?? null });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

export function wordIdsIn(text: string): string[] {
  return parseRich(text).flatMap((s) => (s.type === 'word' ? [s.id] : []));
}

export function splitAlternatives(s: string): string[] {
  return s
    .split('/')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseSentence(text: string): SentenceSegment[] {
  const out: SentenceSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(BLANK_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: 'text', text: text.slice(last, start) });
    out.push({ type: 'blank', answers: splitAlternatives(m[1]) });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}
