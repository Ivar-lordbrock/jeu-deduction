import { describe, expect, it } from 'vitest';
import { campaignStatus, hasProgress, nextCase } from '../src/engine/campaign';
import { emptyProgress, type CaseProgress } from '../src/engine/progress';
import type { CaseData } from '../src/types';

const make = (id: string, extra: Partial<CaseData> = {}): CaseData => ({
  id,
  order: 1,
  title: id,
  intro: '',
  epilogue: '',
  scene: { image: 'scene.svg', width: 100, height: 100 },
  words: {},
  zones: [],
  pages: [{ id: 'p1', kind: 'chronology', title: 'Ordre', events: ['a', 'b'] }],
  ...extra,
});

describe('campagne', () => {
  const a = make('a');
  const draft = make('brouillon', { draft: true });
  const b = make('b');
  const all = [a, draft, b];

  it('verrouille une affaire tant que la précédente n\'est pas résolue (hors brouillons)', () => {
    const progress = new Map<string, CaseProgress>();
    const st = campaignStatus(all, (c) => progress.get(c.id) ?? emptyProgress(c), true);
    expect(st.map((s) => s.state)).toEqual(['new', 'new', 'locked']);
    expect(st.map((s) => s.number)).toEqual([1, null, 2]);
    expect(nextCase(st)?.data.id).toBe('a');
    expect(hasProgress(st)).toBe(false);
  });

  it('propose l\'affaire suivante une fois la première résolue', () => {
    const solved = { ...emptyProgress(a), introSeen: true, solved: ['p1'] };
    const st = campaignStatus(all, (c) => (c.id === 'a' ? solved : emptyProgress(c)), true);
    expect(st.map((s) => s.state)).toEqual(['solved', 'new', 'new']);
    expect(st[0].solvedPages).toBe(1);
    expect(nextCase(st)?.data.id).toBe('b');
    expect(hasProgress(st)).toBe(true);
  });

  it('ne verrouille rien sans enchaînement imposé', () => {
    const st = campaignStatus(all, emptyProgress, false);
    expect(st.every((s) => s.state !== 'locked')).toBe(true);
  });
});
