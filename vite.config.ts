import { defineConfig } from 'vitest/config';
import { editorApi } from './tools/editorApi.ts';

export default defineConfig({
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
