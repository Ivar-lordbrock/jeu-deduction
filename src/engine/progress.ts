import type { CaseData } from '../types';

/** Progression d'une affaire, sauvegardée dans le navigateur. */
export interface CaseProgress {
  introSeen: boolean;
  /** Mots collectés, dans l'ordre de découverte. */
  collected: string[];
  seenZones: string[];
  /** Contenu des cases, par page. */
  slots: Record<string, (string | null)[]>;
  /** Ordre courant des pages de chronologie (absent tant que le joueur n'a rien déplacé). */
  orders: Record<string, number[]>;
  /** Pages validées. */
  solved: string[];
  /** Nombre d'indices révélés, par page. */
  hints: Record<string, number>;
}

const KEY_PREFIX = 'jeu-deduction:v1:';

export function emptyProgress(c: CaseData): CaseProgress {
  return {
    introSeen: false,
    collected: [...(c.startingWords ?? [])],
    seenZones: [],
    slots: {},
    orders: {},
    solved: [],
    hints: {},
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const stringArray = (v: unknown, fallback: string[]): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : fallback;

/** Relit une sauvegarde en ignorant tout champ abîmé plutôt que de planter. */
export function loadProgress(c: CaseData): CaseProgress {
  const empty = emptyProgress(c);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY_PREFIX + c.id);
  } catch {
    return empty;
  }
  if (!raw) return empty;
  try {
    const p: unknown = JSON.parse(raw);
    if (!isObject(p)) return empty;
    return {
      introSeen: p.introSeen === true,
      collected: stringArray(p.collected, empty.collected),
      seenZones: stringArray(p.seenZones, []),
      slots: isObject(p.slots) ? (p.slots as CaseProgress['slots']) : {},
      orders: isObject(p.orders) ? (p.orders as CaseProgress['orders']) : {},
      solved: stringArray(p.solved, []),
      hints: isObject(p.hints) ? (p.hints as CaseProgress['hints']) : {},
    };
  } catch {
    return empty;
  }
}

export function saveProgress(caseId: string, progress: CaseProgress): void {
  try {
    localStorage.setItem(KEY_PREFIX + caseId, JSON.stringify(progress));
  } catch {
    // Stockage indisponible (navigation privée…) : le jeu reste jouable, sans sauvegarde.
  }
}

export function clearProgress(caseId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + caseId);
  } catch {
    // idem
  }
}

export function isCaseSolved(c: CaseData, progress: CaseProgress): boolean {
  return c.pages.every((p) => progress.solved.includes(p.id));
}
