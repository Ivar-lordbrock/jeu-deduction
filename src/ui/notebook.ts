import { h } from '../dom';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../types';
import { icon } from './art';
import type { Actions, Session } from './session';

/**
 * Le carnet, à gauche de l'écran : tous les mots notés, rangés par catégorie.
 * On y prend les mots (clic ou glisser-déposer) pour remplir les cases de la gazette.
 */
export function renderNotebook(s: Session, a: Actions): HTMLElement {
  const collected = s.progress.collected.filter((id) => s.data.words[id]);

  const sel = s.selectedSlot;
  const selectedValue = sel ? s.progress.slots[sel.page]?.[sel.index] : null;

  const groups = CATEGORY_ORDER.map((cat) => {
    const ids = collected.filter((id) => s.data.words[id].category === cat);
    if (!ids.length) return null;
    return h(
      'section',
      { class: `carnet-group cat-${cat}` },
      h('h3', {}, icon(`cat-${cat}`), CATEGORY_LABELS[cat], h('small', {}, String(ids.length))),
      h(
        'div',
        { class: 'carnet-words' },
        ids.map((id) => {
          const w = s.data.words[id];
          return h(
            'button',
            {
              class: ['chip', `cat-${w.category}`, s.armedWord === id && 'armed', s.lastCollected === id && 'new'].filter(Boolean).join(' '),
              draggable: 'true',
              'data-word': id,
              title: 'Cliquez puis choisissez une case de la gazette, ou glissez le mot dans une case',
              onDragStart: (e: DragEvent) => {
                e.dataTransfer?.setData('text/plain', id);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
              },
              onClick: () => a.pickWord(id),
            },
            w.label,
          );
        }),
      ),
    );
  });

  let help: string;
  if (!collected.length) {
    help = 'Cliquez sur ce qui vous intrigue dans la scène, puis sur les mots soulignés : ils s\'inscriront ici.';
  } else if (sel) {
    help = 'Choisissez le mot à placer dans la case sélectionnée.';
  } else if (s.armedWord) {
    help = `Cliquez la case de la gazette où placer « ${s.data.words[s.armedWord]?.label ?? ''} ».`;
  } else {
    help = 'Cliquez une case de la gazette, puis un mot. Ou glissez un mot jusqu\'à une case.';
  }

  return h(
    'aside',
    { class: 'carnet', 'aria-label': 'Carnet', 'data-scroll': 'carnet' },
    h(
      'div',
      { class: 'carnet-page' },
      h(
        'header',
        { class: 'carnet-head' },
        h('h2', {}, icon('notebook'), 'Carnet'),
        h('span', { class: 'carnet-count' }, `${collected.length} mot${collected.length > 1 ? 's' : ''}`),
      ),
      h('p', { class: 'carnet-help' }, help),
      sel && selectedValue
        ? h('button', { class: 'btn small carnet-clear', onClick: () => a.clearSlot(sel.page, sel.index) }, 'Vider la case')
        : null,
      collected.length ? groups : h('p', { class: 'carnet-empty' }, 'Aucun mot pour l\'instant.'),
    ),
  );
}
