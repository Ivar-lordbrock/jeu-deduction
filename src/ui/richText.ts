import { h } from '../dom';
import { parseRich } from '../engine/markup';
import type { Actions, Session } from './session';

/** Affiche un texte enrichi : les [[mots]] deviennent des boutons à collecter. */
export function renderRich(text: string, s: Session, a: Actions): HTMLElement {
  return h(
    'p',
    { class: 'rich' },
    parseRich(text).map((seg) => {
      if (seg.type === 'text') return seg.text;
      const word = s.data.words[seg.id];
      if (!word) return seg.text ?? seg.id;
      const collected = s.progress.collected.includes(seg.id);
      return h(
        'button',
        {
          class: `word cat-${word.category}${collected ? ' collected' : ''}`,
          title: collected ? 'Déjà noté' : `Noter « ${word.label} »`,
          onClick: () => a.collect(seg.id),
        },
        seg.text ?? word.label,
      );
    }),
  );
}
