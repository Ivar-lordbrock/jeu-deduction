import { h } from '../dom';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../types';
import type { Actions, Session } from './session';

/** Banque de mots : tous les mots collectés, rangés par catégorie. */
export function renderWordBank(s: Session, a: Actions): HTMLElement {
  const think = s.mode === 'think';
  const collected = s.progress.collected.filter((id) => s.data.words[id]);

  const sel = s.selectedSlot;
  const selectedValue = sel ? s.progress.slots[sel.page]?.[sel.index] : null;

  const groups = CATEGORY_ORDER.map((cat) => {
    const ids = collected.filter((id) => s.data.words[id].category === cat);
    if (!ids.length) return null;
    return h(
      'div',
      { class: 'bank-group' },
      h('span', { class: 'bank-cat' }, CATEGORY_LABELS[cat]),
      ids.map((id) => {
        const w = s.data.words[id];
        const cls = [
          'chip',
          `cat-${w.category}`,
          s.armedWord === id && 'armed',
          s.lastCollected === id && 'new',
        ]
          .filter(Boolean)
          .join(' ');
        if (!think) return h('span', { class: cls }, w.label);
        return h(
          'button',
          {
            class: cls,
            draggable: 'true',
            onDragStart: (e: DragEvent) => {
              e.dataTransfer?.setData('text/plain', id);
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
            },
            onClick: () => a.pickWord(id),
          },
          w.label,
        );
      }),
    );
  });

  const help = think
    ? 'Glissez un mot dans une case, ou cliquez une case puis un mot. Clic droit sur une case pour la vider.'
    : 'Cliquez les mots soulignés dans les textes pour les noter ici.';

  return h(
    'footer',
    { class: 'word-bank' },
    h(
      'div',
      { class: 'bank-head' },
      h('strong', {}, `Mots notés (${collected.length})`),
      h('span', { class: 'bank-help' }, help),
      think && sel && selectedValue
        ? h('button', { class: 'btn small', onClick: () => a.clearSlot(sel.page, sel.index) }, 'Vider la case')
        : null,
    ),
    collected.length ? h('div', { class: 'bank-words' }, groups) : h('p', { class: 'bank-empty' }, 'Aucun mot pour l\'instant.'),
  );
}
