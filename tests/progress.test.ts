import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAllProgress, loadFlags } from '../src/engine/progress';

/** Un localStorage en mémoire (les tests tournent sous Node, sans navigateur). */
function fakeStorage(entries: Record<string, string>) {
  const m = new Map(Object.entries(entries));
  return {
    get length() {
      return m.size;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    keys: () => [...m.keys()].sort(),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('Tout recommencer', () => {
  it('efface les affaires et le prologue vu, garde le son, la gazette et le reste du site', () => {
    const s = fakeStorage({
      'jeu-deduction:v1:leman-street': '{"solved":["qui"]}',
      'jeu-deduction:v1:morgue': '{"collected":["King\'s Row"]}',
      'jeu-deduction:v1:@jeu': '{"prologueSeen":true,"tutorialDone":true}',
      'jeu-deduction:v1:@son': '{"muted":true}',
      'jeu-deduction:v1:@gazette': '{"height":300}',
      'autre-site': 'x',
    });
    vi.stubGlobal('localStorage', s);
    clearAllProgress();
    expect(s.keys()).toEqual(['autre-site', 'jeu-deduction:v1:@gazette', 'jeu-deduction:v1:@son']);
    expect(loadFlags()).toEqual({ prologueSeen: false, tutorialDone: false });
  });

  it('ne plante pas sans stockage (navigation privée)', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => clearAllProgress()).not.toThrow();
  });
});
