import type { CaseData } from '../types';
import { isCaseSolved, type CaseProgress } from './progress';

export type CaseState = 'locked' | 'new' | 'started' | 'solved';

export interface CaseStatus<C extends CaseData = CaseData> {
  data: C;
  /** Numéro dans la campagne (les brouillons n'en ont pas). */
  number: number | null;
  state: CaseState;
  solvedPages: number;
}

/**
 * État de chaque affaire de la campagne. Avec `sequential`, une affaire reste verrouillée
 * tant que la précédente n'est pas résolue ; les brouillons ne comptent pas dans l'enchaînement.
 */
export function campaignStatus<C extends CaseData>(
  cases: C[],
  progressOf: (c: C) => CaseProgress,
  sequential: boolean,
): CaseStatus<C>[] {
  let previousSolved = true;
  let number = 0;
  return cases.map((c) => {
    const progress = progressOf(c);
    const solved = isCaseSolved(c, progress);
    const started = progress.introSeen || progress.collected.length > (c.startingWords?.length ?? 0);
    const locked = !c.draft && sequential && !previousSolved;
    if (!c.draft) previousSolved = solved;
    return {
      data: c,
      number: c.draft ? null : ++number,
      state: locked ? 'locked' : solved ? 'solved' : started ? 'started' : 'new',
      solvedPages: c.pages.filter((p) => progress.solved.includes(p.id)).length,
    };
  });
}

/** L'affaire à reprendre : la première ouverte et non résolue (hors brouillons). */
export function nextCase<C extends CaseData>(statuses: CaseStatus<C>[]): CaseStatus<C> | null {
  return statuses.find((s) => !s.data.draft && (s.state === 'started' || s.state === 'new')) ?? null;
}

/** Le joueur a-t-il déjà commencé la campagne ? */
export function hasProgress(statuses: CaseStatus[]): boolean {
  return statuses.some((s) => s.state === 'started' || s.state === 'solved');
}
