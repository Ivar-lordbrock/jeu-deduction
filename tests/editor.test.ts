import { describe, expect, it } from 'vitest';
import { analyzeWords, findWordByText, removeWord, removeZone, scaleCase, wordStatus } from '../src/editor/model';
import { emptyProgress, isCaseSolved } from '../src/engine/progress';
import { slugify, uniqueId } from '../src/engine/slug';
import type { CaseData } from '../src/types';

function sampleCase(): CaseData {
  return {
    id: 'test',
    order: 1,
    title: 'Test',
    intro: '',
    epilogue: '',
    scene: { image: 'scene.svg', width: 1000, height: 500 },
    words: {
      margot: { label: 'Margot', category: 'person' },
      arsenic: { label: 'arsenic', category: 'object' },
      fenetre: { label: 'fenêtre', category: 'place' },
      ruban: { label: 'ruban', category: 'object' },
    },
    zones: [
      { id: 'femme', kind: 'person', label: 'Femme', rect: { x: 100, y: 50, w: 200, h: 300 }, text: 'Voici [[margot|Mlle Margot]].' },
      { id: 'fiole', kind: 'object', label: 'Fiole', rect: { x: 400, y: 100, w: 50, h: 80 }, text: 'De l\'[[arsenic]] et un [[ruban]].' },
    ],
    pages: [
      { id: 'quoi', kind: 'sentences', title: 'Quoi', sentences: ['{margot} a versé de l\'{arsenic} par la {fenetre}.'] },
      { id: 'qui', kind: 'identities', title: 'Qui', people: [{ zone: 'femme', answer: 'margot' }] },
    ],
  };
}

describe('identifiants', () => {
  it('tire un identifiant lisible d\'un titre', () => {
    expect(slugify('Le Dîner d\'Aldric')).toBe('le-diner-d-aldric');
    expect(slugify('Cœur brisé !')).toBe('coeur-brise');
    expect(slugify('   ')).toBe('');
  });

  it('évite les doublons', () => {
    expect(uniqueId('mot', [])).toBe('mot');
    expect(uniqueId('mot', ['mot', 'mot-2'])).toBe('mot-3');
    expect(uniqueId('', [], 'zone')).toBe('zone');
  });
});

describe('liste des mots de l\'éditeur', () => {
  it('classe chaque mot : réponse, introuvable, fausse piste', () => {
    const usage = analyzeWords(sampleCase());
    expect(wordStatus(usage.get('margot')!)).toBe('answer');
    expect(wordStatus(usage.get('arsenic')!)).toBe('answer');
    expect(wordStatus(usage.get('fenetre')!)).toBe('missing');
    expect(wordStatus(usage.get('ruban')!)).toBe('decoy');
    expect(usage.get('margot')!.answerIn.map((p) => p.id)).toEqual(['quoi', 'qui']);
  });

  it('retrouve un mot sans tenir compte des accents ni des majuscules', () => {
    expect(findWordByText(sampleCase(), 'FENETRE')).toBe('fenetre');
    expect(findWordByText(sampleCase(), 'poison')).toBeNull();
  });

  it('supprimer un mot le remet en texte normal dans la scène', () => {
    const c = sampleCase();
    removeWord(c, 'margot');
    expect(c.words.margot).toBeUndefined();
    expect(c.zones[0].text).toBe('Voici Mlle Margot.');
    removeWord(c, 'arsenic');
    expect(c.zones[1].text).toBe('De l\'arsenic et un [[ruban]].');
  });

  it('supprimer une zone retire aussi son portrait de « Qui est qui ? »', () => {
    const c = sampleCase();
    removeZone(c, 'femme');
    expect(c.zones.map((z) => z.id)).toEqual(['fiole']);
    expect(c.pages[1].kind === 'identities' && c.pages[1].people).toEqual([]);
  });

  it('adapte les zones quand l\'image change de taille', () => {
    const c = sampleCase();
    scaleCase(c, 2, 2);
    expect(c.zones[0].rect).toEqual({ x: 200, y: 100, w: 400, h: 600 });
  });
});

describe('affaire en cours d\'écriture', () => {
  it('une affaire sans page n\'est jamais résolue', () => {
    const c = { ...sampleCase(), pages: [] };
    expect(isCaseSolved(c, emptyProgress(c))).toBe(false);
  });
});
