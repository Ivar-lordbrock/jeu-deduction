import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAllProgress, exportProgress, importProgress, loadFlags, loadProgress } from '../src/engine/progress';
import { decodeSave, encodeSave } from '../src/engine/saveCode';

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

describe('Temps et erreurs (rapport de fin)', () => {
  const c = { id: 'x', startingWords: [] } as unknown as Parameters<typeof loadProgress>[0];
  it('relit le temps et les erreurs, et ignore les valeurs abîmées', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'jeu-deduction:v1:x': '{"elapsed":125000,"mistakes":3}' }));
    expect(loadProgress(c)).toMatchObject({ elapsed: 125000, mistakes: 3 });
    vi.stubGlobal('localStorage', fakeStorage({ 'jeu-deduction:v1:x': '{"elapsed":"beaucoup","mistakes":-2}' }));
    expect(loadProgress(c)).toMatchObject({ elapsed: 0, mistakes: 0 });
  });
});

describe('Code de sauvegarde', () => {
  it('transporte toute la partie, sans les réglages', async () => {
    const here = fakeStorage({
      'jeu-deduction:v1:leman-street': '{"solved":["qui"],"elapsed":60000}',
      'jeu-deduction:v1:@jeu': '{"prologueSeen":true}',
      'jeu-deduction:v1:@son': '{"muted":true}',
    });
    vi.stubGlobal('localStorage', here);
    const code = await encodeSave(exportProgress());
    expect(code).toMatch(/^WL1\.[\w-]+$/);

    const there = fakeStorage({ 'jeu-deduction:v1:morgue': '{"solved":[]}', 'jeu-deduction:v1:@gazette': '{"height":300}' });
    vi.stubGlobal('localStorage', there);
    importProgress(await decodeSave(`  ${code.slice(0, 20)}\n${code.slice(20)} `));
    expect(there.keys()).toEqual(['jeu-deduction:v1:@gazette', 'jeu-deduction:v1:@jeu', 'jeu-deduction:v1:leman-street']);
    expect(JSON.parse(there.getItem('jeu-deduction:v1:leman-street')!)).toEqual({ solved: ['qui'], elapsed: 60000 });
  });

  it('refuse un code abîmé avec un message lisible', async () => {
    await expect(decodeSave('bonjour')).rejects.toThrow(/WL1/);
    const code = await encodeSave({ a: 1 });
    await expect(decodeSave(code.slice(0, -6))).rejects.toThrow(/abîmé/);
  });

  it('ignore les clés étranges et les réglages glissés dans un code', async () => {
    const code = await encodeSave({ '@son': { muted: false }, '../../x': 1, morgue: { solved: [] } });
    expect(Object.keys(await decodeSave(code))).toEqual(['morgue']);
  });
});
