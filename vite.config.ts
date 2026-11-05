import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Chemins relatifs : le build fonctionne sur n'importe quel hébergeur statique
  // (GitHub Pages, itch.io) et dans une appli de bureau.
  base: './',
  server: { port: 5180, strictPort: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
