import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import story from '../src/story/story.json';
import type { StoryData } from '../src/types';

const root = new URL('../', import.meta.url);

describe('assets', () => {
  it('chaque gravure du prologue existe dans src/assets/engravings', () => {
    for (const screen of (story as StoryData).prologue ?? []) {
      if (!screen.image) continue;
      expect(existsSync(new URL(`src/assets/engravings/${screen.image}.jpg`, root)), screen.image).toBe(true);
    }
  });

  it('chaque fichier référencé par le CSS existe', () => {
    const css = readFileSync(new URL('src/style.css', root), 'utf8');
    const urls = [...css.matchAll(/url\('\.\/([^']+)'\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(10);
    for (const u of urls) expect(existsSync(new URL(`src/${u}`, root)), u).toBe(true);
  });

  it('les crédits citent chaque asset gardé', () => {
    const credits = readFileSync(new URL('CREDITS.md', root), 'utf8');
    for (const name of ['over-london-by-rail', 'bluegate-fields', 'dudley-street', 'bulls-eye', 'wentworth-street', 'whitechapel', 'Lorc', 'Delapouite', 'IM Fell English', 'UnifrakturMaguntia', 'Paper006', 'Kenney']) {
      expect(credits, name).toContain(name);
    }
  });
});
