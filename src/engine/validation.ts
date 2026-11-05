import type { CaseData, ChronologyPage, Page } from '../types';
import { parseSentence, splitAlternatives } from './markup';
import type { CaseProgress } from './progress';

export type Verdict = 'incomplete' | 'solved' | 'close' | 'wrong';

export interface Evaluation {
  verdict: Verdict;
  /** Nombre d'erreurs, ou null tant que la page n'est pas complète. */
  errors: number | null;
}

export const DEFAULT_TOLERANCE = 2;

/** Réponses acceptées pour chaque case d'une page (phrases ou identités). */
export function expectedSlots(page: Page): string[][] {
  switch (page.kind) {
    case 'sentences':
      return page.sentences.flatMap((s) =>
        parseSentence(s).flatMap((seg) => (seg.type === 'blank' ? [seg.answers] : [])),
      );
    case 'identities':
      return page.people.map((p) => splitAlternatives(p.answer));
    case 'chronology':
      return [];
  }
}

function verdictFor(errors: number, tolerance: number): Evaluation {
  if (errors === 0) return { verdict: 'solved', errors };
  return { verdict: errors <= tolerance ? 'close' : 'wrong', errors };
}

/**
 * Règle centrale du genre : on ne vérifie qu'une page complète, et on dit
 * seulement « tout est juste » ou « N erreurs ou moins », jamais où sont les erreurs.
 */
export function evaluateSlots(
  expected: string[][],
  given: readonly (string | null | undefined)[],
  tolerance: number,
): Evaluation {
  if (expected.some((_, i) => !given[i])) return { verdict: 'incomplete', errors: null };
  const errors = expected.filter((answers, i) => !answers.includes(given[i] as string)).length;
  return verdictFor(errors, tolerance);
}

/** `order[i]` = index (dans l'ordre correct) de l'événement affiché en position i. */
export function evaluateOrder(order: readonly number[], tolerance: number): Evaluation {
  const errors = order.filter((v, i) => v !== i).length;
  return verdictFor(errors, tolerance);
}

function isPermutation(order: unknown, n: number): order is number[] {
  if (!Array.isArray(order) || order.length !== n) return false;
  const seen = new Set(order);
  return seen.size === n && order.every((v) => Number.isInteger(v) && v >= 0 && v < n);
}

function hash(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return x >>> 0;
}

/** Ordre de départ mélangé, toujours le même pour une page donnée, jamais déjà correct. */
export function initialOrder(page: ChronologyPage): number[] {
  const n = page.events.length;
  const order = [...Array(n).keys()];
  let seed = hash(page.id);
  for (let i = n - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (n > 1 && order.every((v, i) => v === i)) order.push(order.shift() as number);
  return order;
}

export function currentOrder(page: ChronologyPage, progress: CaseProgress): number[] {
  const stored = progress.orders[page.id];
  return isPermutation(stored, page.events.length) ? stored : initialOrder(page);
}

export function evaluatePage(c: CaseData, page: Page, progress: CaseProgress): Evaluation {
  const tolerance = c.tolerance ?? DEFAULT_TOLERANCE;
  if (page.kind === 'chronology') {
    // Tant que le joueur n'a rien déplacé, on ne juge pas l'ordre de départ.
    const stored = progress.orders[page.id];
    if (!isPermutation(stored, page.events.length)) return { verdict: 'incomplete', errors: null };
    return evaluateOrder(stored, tolerance);
  }
  return evaluateSlots(expectedSlots(page), progress.slots[page.id] ?? [], tolerance);
}
