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
  /** Temps de jeu dans l'affaire, en millisecondes (arrêté quand elle est résolue). */
  elapsed: number;
  /** Articles complets jugés faux ou « presque » (pour le rapport de fin). */
  mistakes: number;
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
    elapsed: 0,
    mistakes: 0,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

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
      elapsed: count(p.elapsed),
      mistakes: count(p.mistakes),
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

/** Réglages du joueur, gardés quand il recommence le jeu (le son, la taille de la gazette, l'intro déjà vue). */
const SETTINGS = ['@son', '@gazette', '@intro'].map((k) => KEY_PREFIX + k);

/** Clés de la partie (les affaires, le prologue vu, le tutoriel fait), sans les réglages. */
function gameKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(KEY_PREFIX) && !SETTINGS.includes(k)) keys.push(k);
  }
  return keys;
}

/** Tout recommencer : efface la progression de toutes les affaires, le prologue vu, le tutoriel fait. */
export function clearAllProgress(): void {
  try {
    gameKeys().forEach((k) => localStorage.removeItem(k));
  } catch {
    // idem
  }
}

/** Toute la partie, pour le code de sauvegarde : { « leman-street » : {…}, « @jeu » : {…} }. */
export function exportProgress(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  try {
    for (const k of gameKeys()) {
      try {
        out[k.slice(KEY_PREFIX.length)] = JSON.parse(localStorage.getItem(k) ?? 'null');
      } catch {
        // entrée illisible : on ne la transmet pas
      }
    }
  } catch {
    // stockage indisponible : partie vide
  }
  return out;
}

/** Une clé de partie acceptable dans un code de sauvegarde (pas un réglage, rien d'étrange). */
export const isGameKey = (k: string): boolean => /^[@\w.-]{1,80}$/.test(k) && !SETTINGS.includes(KEY_PREFIX + k);

/** Remplace toute la partie par celle d'un code de sauvegarde (les réglages restent). */
export function importProgress(data: Record<string, unknown>): void {
  clearAllProgress();
  for (const [k, v] of Object.entries(data)) {
    if (!isGameKey(k)) continue;
    try {
      localStorage.setItem(KEY_PREFIX + k, JSON.stringify(v));
    } catch {
      // idem
    }
  }
}

export function isCaseSolved(c: CaseData, progress: CaseProgress): boolean {
  return c.pages.length > 0 && c.pages.every((p) => progress.solved.includes(p.id));
}

/** Ce que le joueur a déjà vu en dehors de la progression des affaires. */
export interface GameFlags {
  prologueSeen: boolean;
  /** Tutoriel guidé de la première affaire terminé (ou passé). */
  tutorialDone: boolean;
}

const FLAGS_KEY = 'jeu-deduction:v1:@jeu';

export function loadFlags(): GameFlags {
  try {
    const p: unknown = JSON.parse(localStorage.getItem(FLAGS_KEY) ?? '{}');
    if (isObject(p)) return { prologueSeen: p.prologueSeen === true, tutorialDone: p.tutorialDone === true };
  } catch {
    // Sauvegarde illisible ou stockage indisponible : on repart de zéro.
  }
  return { prologueSeen: false, tutorialDone: false };
}

export function setFlag(flag: keyof GameFlags): void {
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify({ ...loadFlags(), [flag]: true }));
  } catch {
    // idem
  }
}
