import { h } from '../dom';
import type { PrologueScreen } from '../types';
import { engravingLayer, fogLayer } from './art';

interface PrologueActions {
  /** Fin du prologue (ou « Passer ») : on enchaîne sur l'enquête. */
  done(): void;
  menu(): void;
}

/** Introduction de l'univers, un écran après l'autre. Renvoie la fonction de nettoyage. */
export function renderPrologue(root: HTMLElement, screens: PrologueScreen[], a: PrologueActions): () => void {
  let index = 0;

  const stop = () => document.removeEventListener('keydown', onKey);
  const finish = () => {
    stop();
    a.done();
  };

  const go = (i: number) => {
    if (i >= screens.length) return finish();
    index = Math.max(0, i);
    render();
  };

  function onKey(e: KeyboardEvent) {
    if (document.querySelector('.overlay')) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      if ((e.target as HTMLElement).tagName === 'BUTTON' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      go(index + 1);
    } else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'Escape') finish();
  }
  document.addEventListener('keydown', onKey);

  function render() {
    const screen = screens[index];
    const last = index === screens.length - 1;
    root.replaceChildren(
      h(
        'div',
        { class: 'prologue' },
        engravingLayer(screen?.image, 'prologue-art'),
        fogLayer(),
        h(
          'header',
          { class: 'prologue-top' },
          h('button', { class: 'btn ghost small', onClick: () => a.menu() }, '← Menu'),
          h('button', { class: 'btn ghost small', onClick: finish }, 'Passer l\'introduction'),
        ),
        screen
          ? h(
              'section',
              { class: 'prologue-screen', 'aria-live': 'polite' },
              h('p', { class: 'prologue-num' }, `${index + 1} / ${screens.length}`),
              h('h1', { class: 'prologue-heading' }, screen.heading),
              h('p', { class: 'prologue-text' }, screen.text),
            )
          : null,
        h(
          'footer',
          { class: 'prologue-nav' },
          h('button', { class: 'btn ghost', disabled: index === 0, onClick: () => go(index - 1) }, '← Précédent'),
          h(
            'div',
            { class: 'dots', 'aria-hidden': 'true' },
            screens.map((_, i) => h('span', { class: i === index ? 'on' : i < index ? 'done' : '' })),
          ),
          h('button', { class: 'btn primary', onClick: () => go(index + 1) }, last ? 'Commencer l\'enquête' : 'Suivant →'),
        ),
      ),
    );
    root.querySelector<HTMLButtonElement>('.prologue-nav .btn.primary')?.focus({ preventScroll: true });
  }

  if (!screens.length) finish();
  else render();
  return stop;
}
