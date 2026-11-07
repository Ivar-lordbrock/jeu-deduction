import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { editorApi } from './tools/editorApi.ts';

/**
 * Commit du build, joint aux signalements des testeurs (« inconnu » hors d'un dépôt git).
 * Lu dans .git plutôt que demandé à git : le serveur de dev n'a pas toujours git sous la main.
 */
function commit(): string {
  const git = (f: string) => readFileSync(new URL(`.git/${f}`, import.meta.url), 'utf8');
  try {
    const head = git('HEAD').trim();
    if (!head.startsWith('ref: ')) return head.slice(0, 7);
    const ref = head.slice(5);
    try {
      return git(ref).trim().slice(0, 7);
    } catch {
      return git('packed-refs').split('\n').find((l) => l.endsWith(` ${ref}`))?.slice(0, 7) ?? 'inconnu';
    }
  } catch {
    return 'inconnu';
  }
}

export default defineConfig({
  define: { __BUILD__: JSON.stringify(`${commit()} du ${new Date().toISOString().slice(0, 10)}`) },
  // Chemins relatifs : le build fonctionne sur n'importe quel hébergeur statique
  // (GitHub Pages, itch.io) et dans une appli de bureau.
  base: './',
  server: { port: 5180, strictPort: true },
  // L'éditeur (editeur.html) n'existe qu'en développement : le build ne contient que le jeu.
  plugins: [editorApi()],
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  optimizeDeps: { include: ['preact', 'preact/hooks', 'preact/jsx-runtime'] },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
