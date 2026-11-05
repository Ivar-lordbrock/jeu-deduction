import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkCase } from '../src/engine/checkCase';
import type { CaseData } from '../src/types';

// Vérifie toutes les affaires de src/cases : lancer « npm test » après chaque modification.
const files = import.meta.glob<CaseData>('../src/cases/*/case.json', { eager: true, import: 'default' });

describe('affaires', () => {
  it('au moins une affaire existe', () => {
    expect(Object.keys(files).length).toBeGreaterThan(0);
  });

  for (const [path, data] of Object.entries(files)) {
    const folder = path.split('/').at(-2);
    describe(folder ?? path, () => {
      // Un brouillon peut être incomplet : il n'est pas montré aux joueurs.
      it.skipIf(data.draft)('est cohérente (chaque réponse peut être trouvée dans la scène)', () => {
        expect(checkCase(data).errors).toEqual([]);
      });

      it('a son image de scène', () => {
        expect(existsSync(new URL(`../src/cases/${folder}/${data.scene.image}`, import.meta.url))).toBe(true);
      });
    });
  }

  it('les identifiants d\'affaires sont uniques', () => {
    const ids = Object.values(files).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
