import { describe, expect, it } from 'vitest';
import { tutorialZones, zoneWords } from '../src/ui/guide';
import type { CaseData } from '../src/types';

const files = import.meta.glob<CaseData>('../src/cases/*/case.json', { eager: true, import: 'default' });
const all = Object.values(files);
const tutorials = all.filter((c) => c.tutorial && !c.draft);

describe('tutoriel', () => {
  it('une seule affaire tutoriel, la première de la campagne', () => {
    expect(tutorials.map((c) => c.id)).toEqual(['leman-street']);
    expect(tutorials[0].order).toBe(1);
  });

  it('s\'appuie sur un témoin puis sur un document qui contiennent des mots', () => {
    const c = tutorials[0];
    const { first, doc } = tutorialZones(c.zones, c.words);
    expect(first?.id).toBe('temoin');
    expect(doc?.id).toBe('registre');
    expect(zoneWords(first!).length).toBeGreaterThan(1);
    expect(zoneWords(doc!).length).toBeGreaterThan(1);
  });

  it('compte les mots des gros plans d\'une zone', () => {
    const zone = {
      id: 'z',
      kind: 'person' as const,
      label: 'Z',
      rect: { x: 0, y: 0, w: 1, h: 1 },
      text: 'Un [[a]] et un [[b|B]].',
      details: [{ label: 'Poche', text: 'Encore [[a]] et [[c]].' }],
    };
    expect(zoneWords(zone)).toEqual(['a', 'b', 'c']);
  });
});
