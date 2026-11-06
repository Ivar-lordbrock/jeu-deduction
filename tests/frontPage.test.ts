import { describe, expect, it } from 'vitest';
import type { LoadedCase } from '../src/cases/registry';
import { emptyProgress } from '../src/engine/progress';
import { caseDate, formatDuration, inspectorReport } from '../src/ui/frontPage';

describe('Rapport de l\'inspecteur', () => {
  it('écrit le temps d\'enquête simplement', () => {
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(20_000)).toBe('moins d\'une minute');
    expect(formatDuration(754_000)).toBe('13 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05');
  });

  it('donne une appréciation selon les indices et les erreurs', () => {
    const p = emptyProgress({ startingWords: [] } as unknown as LoadedCase);
    expect(inspectorReport(p).verdict).toBe('Digne de Scotland Yard');
    expect(inspectorReport({ ...p, hints: { quoi: 1 }, mistakes: 2 })).toMatchObject({ hints: 1, mistakes: 2, verdict: 'Fin limier' });
    expect(inspectorReport({ ...p, hints: { a: 2, b: 1 }, mistakes: 4 }).verdict).toBe('Bon reporter');
    expect(inspectorReport({ ...p, hints: { a: 3, b: 2 } }).verdict).toBe('Apprenti détective');
  });
});

describe('La une', () => {
  it('date l\'édition d\'après l\'introduction de l\'affaire, jour de la semaine compris', () => {
    const c = (intro: string, moment?: string) => ({ intro, notes: { moment } }) as unknown as LoadedCase;
    expect(caseDate(c('Londres, dimanche 30 septembre 1888, sept heures du matin.'))).toBe('Dimanche 30 septembre 1888');
    expect(caseDate(c('À la morgue, le 30 septembre 1888, au matin.'))).toBe('Dimanche 30 septembre 1888');
    expect(caseDate(c('Un soir de brouillard.', 'Vendredi 9 novembre 1888, 10 h 45.'))).toBe('Vendredi 9 novembre 1888');
    expect(caseDate(c('Un soir de brouillard.'))).toBe('Londres, automne 1888');
  });
});
