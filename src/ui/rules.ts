import { h } from '../dom';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../types';
import { icon } from './art';

interface RulesOptions {
  /** Dans l'affaire tutoriel : relance le guide pas à pas. */
  replayTutorial?: () => void;
  onClose?: () => void;
}

/** Aide-mémoire des règles, par-dessus n'importe quel écran. */
export function openRules(opts: RulesOptions = {}): void {
  document.querySelector('.rules-overlay')?.remove();

  const close = () => {
    window.removeEventListener('keydown', onKey, true);
    overlay.remove();
    opts.onClose?.();
  };
  // Phase de capture : Échap ferme l'aide-mémoire sans atteindre l'écran en dessous.
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    close();
  }
  window.addEventListener('keydown', onKey, true);

  const RULE_ICONS: Record<string, string> = { '1': 'magnifying-glass', '2': 'notebook', '3': 'quill-ink', '4': 'newspaper' };
  const rule = (num: string, title: string, ...body: (Node | string)[]) =>
    h(
      'section',
      { class: 'rule' },
      h('span', { class: 'rule-num' }, num),
      h('h3', {}, RULE_ICONS[num] ? icon(RULE_ICONS[num]) : null, title),
      h('p', {}, ...body),
    );

  const overlay = h(
    'div',
    {
      class: 'overlay rules-overlay',
      onClick: (e: MouseEvent) => {
        if (e.target === overlay) close();
      },
    },
    h(
      'div',
      { class: 'modal rules', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Comment jouer' },
      h('span', { class: 'modal-kicker' }, 'Aide-mémoire'),
      h('h2', {}, 'Comment jouer'),
      h(
        'div',
        { class: 'rules-grid' },
        rule(
          '1',
          'Observer',
          'Chaque affaire est une scène figée. Cliquez ce qui s\'éclaire au survol : personnages, objets, documents. « Montrer les zones » entoure tout ce qui peut être examiné.',
        ),
        rule(
          '2',
          'Noter',
          'Les mots soulignés des fiches sont des indices : cliquez-les, ils s\'inscrivent dans le carnet, à gauche, rangés par catégorie. Certains ne servent à rien.',
        ),
        rule(
          '3',
          'Reconstituer',
          'Dans la gazette, au-dessus de la scène : cliquez une case puis un mot du carnet, ou glissez le mot dans la case. Clic droit pour vider une case. ▲ ▼ pour remettre les événements dans l\'ordre.',
        ),
        rule(
          '4',
          'Valider',
          'Un article complet est jugé : « ✓ Validé », « N erreurs ou moins » ou « Quelque chose ne colle pas ». Jamais où sont les erreurs. Bloqué ? Les indices se révèlent un par un.',
        ),
      ),
      h(
        'div',
        { class: 'rules-legend' },
        h('span', {}, 'Catégories :'),
        CATEGORY_ORDER.map((c) => h('span', { class: `chip cat-${c}` }, CATEGORY_LABELS[c])),
        h('span', { class: 'rules-keys' }, h('kbd', {}, 'Échap'), ' ferme une fiche ou annule une sélection'),
      ),
      h(
        'div',
        { class: 'modal-actions' },
        opts.replayTutorial
          ? h(
              'button',
              {
                class: 'btn ghost',
                onClick: () => {
                  const replay = opts.replayTutorial;
                  close();
                  replay?.();
                },
              },
              'Revoir le tutoriel',
            )
          : null,
        h('button', { class: 'btn primary', onClick: close }, 'Compris'),
      ),
    ),
  );
  document.body.append(overlay);
  overlay.querySelector<HTMLButtonElement>('.btn.primary')?.focus();
}
