import { chapterIndex } from '../cases/registry';
import { GAME_TITLE, story } from '../config';
import { h } from '../dom';
import { nextCase, type CaseStatus } from '../engine/campaign';
import type { CaseData } from '../types';

interface CasesActions {
  open(c: CaseData): void;
  menu(): void;
  /** Aide-mémoire des règles. */
  rules(): void;
}

const STATE_LABELS: Record<CaseStatus['state'], string> = {
  locked: 'Verrouillée',
  new: 'Nouvelle',
  started: 'En cours',
  solved: 'Résolue',
};

/** Liste des affaires, rangées par chapitre. L'affaire à reprendre est mise en avant. */
export function renderCases(root: HTMLElement, statuses: CaseStatus[], a: CasesActions): void {
  const next = nextCase(statuses);

  const card = (st: CaseStatus) => {
    const c = st.data;
    const locked = st.state === 'locked';
    const isNext = st === next;
    const action = locked ? null : st.state === 'solved' ? 'Revoir' : st.state === 'started' ? 'Continuer' : 'Commencer';
    return h(
      'li',
      {},
      h(
        'button',
        {
          class: `case-card ${st.state}${isNext ? ' next' : ''}`,
          disabled: locked,
          onClick: () => a.open(c),
          'aria-label': locked ? `Affaire ${st.number} verrouillée` : `${c.title}, ${STATE_LABELS[st.state]}`,
        },
        h('span', { class: 'case-num' }, st.number ?? '✎'),
        h(
          'span',
          { class: 'case-info' },
          h(
            'span',
            { class: 'case-meta' },
            c.draft ? 'Brouillon' : `Affaire ${st.number}`,
            isNext ? h('span', { class: 'next-tag' }, 'À suivre') : null,
          ),
          h('strong', { class: 'case-name' }, locked ? 'Affaire verrouillée' : c.title),
          locked
            ? h('span', { class: 'case-status' }, 'Résolvez l\'affaire précédente pour l\'ouvrir.')
            : h(
                'span',
                { class: `case-status ${st.state}` },
                STATE_LABELS[st.state],
                c.pages.length
                  ? h(
                      'span',
                      { class: 'case-pages', 'aria-label': `${st.solvedPages} pages sur ${c.pages.length}` },
                      c.pages.map((_, i) => h('i', { class: i < st.solvedPages ? 'on' : '' })),
                    )
                  : null,
              ),
        ),
        action ? h('span', { class: 'case-go' }, `${action} →`) : h('span', { class: 'case-lock', 'aria-hidden': 'true' }, '🔒'),
      ),
    );
  };

  // Regroupement par chapitre, dans l'ordre de l'histoire ; les affaires sans chapitre à la fin.
  const groups = [...story.chapters, { id: undefined, title: 'Autres affaires', summary: '' }]
    .map((ch, i) => ({ chapter: ch, index: i, items: statuses.filter((st) => chapterIndex(st.data.chapter) === i) }))
    .filter((g) => g.items.length > 0);
  const showHeadings = story.chapters.length > 0;

  root.replaceChildren(
    h(
      'div',
      { class: 'cases-screen' },
      h(
        'header',
        { class: 'screen-head' },
        h('button', { class: 'btn ghost', onClick: () => a.menu() }, '← Menu'),
        h('div', { class: 'screen-titles' }, h('p', { class: 'kicker' }, GAME_TITLE), h('h1', {}, 'Les affaires')),
        h('button', { class: 'btn ghost', onClick: () => a.rules() }, 'Comment jouer'),
      ),
      h(
        'div',
        { class: 'cases-body' },
        statuses.length
          ? groups.map((g) =>
              h(
                'section',
                { class: 'chapter' },
                showHeadings
                  ? h(
                      'header',
                      { class: 'chapter-head' },
                      g.chapter.id ? h('span', { class: 'chapter-num' }, `Chapitre ${g.index + 1}`) : null,
                      h('h2', { class: 'chapter-title' }, g.chapter.title),
                      g.chapter.summary ? h('p', { class: 'chapter-summary' }, g.chapter.summary) : null,
                    )
                  : null,
                h('ol', { class: 'case-list' }, g.items.map(card)),
              ),
            )
          : h('p', { class: 'empty' }, 'Aucune affaire pour l\'instant.'),
      ),
    ),
  );
  root.querySelector<HTMLButtonElement>('.case-card.next')?.focus({ preventScroll: true });
}
