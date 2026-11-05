import { describe, expect, it } from 'vitest';
import { parseRich, parseSentence, wordIdsIn } from '../src/engine/markup';
import { evaluateOrder, evaluateSlots, expectedSlots, initialOrder } from '../src/engine/validation';
import type { ChronologyPage, SentencesPage } from '../src/types';

describe('markup', () => {
  it('repère les mots collectables', () => {
    expect(parseRich('Une fiole d\'[[arsenic]] pour [[margot|Mlle Margot]].')).toEqual([
      { type: 'text', text: 'Une fiole d\'' },
      { type: 'word', id: 'arsenic', text: null },
      { type: 'text', text: ' pour ' },
      { type: 'word', id: 'margot', text: 'Mlle Margot' },
      { type: 'text', text: '.' },
    ]);
    expect(wordIdsIn('[[a]] et [[b|B]]')).toEqual(['a', 'b']);
  });

  it('repère les cases et leurs réponses alternatives', () => {
    expect(parseSentence('{margot} a versé du {poison/arsenic}.')).toEqual([
      { type: 'blank', answers: ['margot'] },
      { type: 'text', text: ' a versé du ' },
      { type: 'blank', answers: ['poison', 'arsenic'] },
      { type: 'text', text: '.' },
    ]);
  });
});

describe('validation', () => {
  const page: SentencesPage = {
    id: 'p',
    kind: 'sentences',
    title: 'T',
    sentences: ['{a} et {b}', '{c/d}'],
  };

  it('liste les réponses attendues, toutes phrases confondues', () => {
    expect(expectedSlots(page)).toEqual([['a'], ['b'], ['c', 'd']]);
  });

  it('ne juge pas une page incomplète', () => {
    expect(evaluateSlots(expectedSlots(page), ['a', null, 'c'], 2).verdict).toBe('incomplete');
  });

  it('valide une page juste, y compris avec une réponse alternative', () => {
    expect(evaluateSlots(expectedSlots(page), ['a', 'b', 'd'], 2)).toEqual({ verdict: 'solved', errors: 0 });
  });

  it('dit « N erreurs ou moins » sans dire où', () => {
    expect(evaluateSlots(expectedSlots(page), ['b', 'a', 'c'], 2).verdict).toBe('close');
    expect(evaluateSlots(expectedSlots(page), ['x', 'x', 'x'], 2).verdict).toBe('wrong');
  });

  it('compte les événements mal placés', () => {
    expect(evaluateOrder([0, 1, 2, 3], 2).verdict).toBe('solved');
    expect(evaluateOrder([1, 0, 2, 3], 2).verdict).toBe('close');
    expect(evaluateOrder([3, 2, 1, 0], 2).verdict).toBe('wrong');
  });

  it('mélange la chronologie de façon stable, jamais dans le bon ordre', () => {
    const chrono: ChronologyPage = { id: 'c', kind: 'chronology', title: 'T', events: ['1', '2', '3', '4'] };
    const order = initialOrder(chrono);
    expect(order).toEqual(initialOrder(chrono));
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(order).not.toEqual([0, 1, 2, 3]);
    expect(initialOrder({ ...chrono, events: ['1', '2'] })).toEqual([1, 0]);
  });
});
