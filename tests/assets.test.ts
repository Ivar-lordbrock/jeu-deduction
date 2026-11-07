import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

  it('chaque silhouette est créditée et reste une image sûre', () => {
    const credits = readFileSync(new URL('CREDITS.md', root), 'utf8');
    const dir = new URL('src/assets/silhouettes/', root);
    const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const svg = readFileSync(new URL(f, dir), 'utf8');
      // la ligne de crédit en tête du fichier donne le numéro Openclipart, que CREDITS.md doit citer
      const id = svg.match(/Openclipart (\d+)/)?.[1];
      expect(id, f).toBeDefined();
      expect(credits, f).toContain(`openclipart.org/detail/${id}`);
      expect(svg, f).not.toMatch(/<script|<foreignObject|\son[a-z]+=|href="(?:https?|javascript):/i);
    }
  });

  it('chaque personnage dessiné a ses poses, et chaque pose est une image sûre et autonome', () => {
    const dir = new URL('src/assets/silhouettes/persos/', root);
    const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
    for (const perso of ['commissaire', 'agent', 'journaliste', 'joueur', 'temoin', 'docteur']) {
      expect(files.filter((f) => f.startsWith(`${perso}-`)).length, perso).toBeGreaterThanOrEqual(4);
    }
    for (const f of files) {
      const svg = readFileSync(new URL(f, dir), 'utf8');
      expect(svg, f).toContain('Silhouette dessinée pour le jeu');
      // la forme seule porte le nom du fichier : la scène la réutilise pour les reflets
      expect(svg, f).toContain(`<g id="${f.replace('.svg', '')}">`);
      expect(svg, f).not.toMatch(/<script|<foreignObject|\son[a-z]+=/i);
      for (const m of svg.matchAll(/href="([^"]+)"/g)) expect(m[1], f).toMatch(/^#/);
    }
  });

  it('les scènes dessinées ne dépendent d’aucun fichier extérieur', () => {
    // la scène s'affiche en <img> : un lien vers un autre fichier y serait ignoré
    for (const fichier of ['01-leman-street/scene.svg', '02-morgue/scene.svg', '02-morgue/autopsie.svg']) {
      const scene = readFileSync(new URL(`src/cases/${fichier}`, root), 'utf8');
      for (const m of scene.matchAll(/href="([^"]+)"/g)) expect(m[1], `${fichier} ${m[1].slice(0, 40)}`).toMatch(/^(#|data:image\/)/);
    }
  });
});
