import type { LoadedCase } from '../cases/registry';
import { GAME_SUBTITLE, GAME_TITLE, SEQUENTIAL_CASES } from '../config';
import { h } from '../dom';
import { isCaseSolved, loadProgress } from '../engine/progress';

/** Menu principal : la liste des affaires de la campagne. */
export function renderMenu(root: HTMLElement, cases: LoadedCase[], onOpen: (c: LoadedCase) => void): void {
  let previousSolved = true;
  const items = cases.map((c, i) => {
    const progress = loadProgress(c);
    const solved = isCaseSolved(c, progress);
    const started = progress.introSeen || progress.collected.length > 0;
    const locked = SEQUENTIAL_CASES && !import.meta.env.DEV && !previousSolved;
    previousSolved = solved;

    const solvedPages = c.pages.filter((p) => progress.solved.includes(p.id)).length;
    const status = locked
      ? 'Verrouillée'
      : solved
        ? 'Résolue'
        : started
          ? `En cours · ${solvedPages}/${c.pages.length}`
          : 'Nouvelle';
    const statusClass = locked ? 'locked' : solved ? 'solved' : started ? 'started' : 'new';

    return h(
      'li',
      {},
      h(
        'button',
        { class: `case-card ${statusClass}`, disabled: locked, onClick: () => onOpen(c) },
        h('span', { class: 'case-num' }, `Affaire ${i + 1}`),
        h('strong', { class: 'case-name' }, locked ? '???' : c.title),
        h('span', { class: `case-status ${statusClass}` }, status),
      ),
    );
  });

  root.replaceChildren(
    h(
      'div',
      { class: 'menu' },
      h('h1', { class: 'game-title' }, GAME_TITLE),
      h('p', { class: 'game-subtitle' }, GAME_SUBTITLE),
      cases.length
        ? h('ol', { class: 'case-list' }, items)
        : h('p', { class: 'bank-empty' }, 'Aucune affaire trouvée dans src/cases.'),
    ),
  );
}
