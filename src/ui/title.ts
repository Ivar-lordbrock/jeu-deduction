import { GAME_SUBTITLE, GAME_TITLE, story } from '../config';
import { h } from '../dom';
import { hasProgress, nextCase, type CaseStatus } from '../engine/campaign';
import { loadFlags } from '../engine/progress';
import type { CaseData } from '../types';
import { engravingLayer, fogLayer } from './art';

interface TitleActions {
  start(): void;
  resume(c: CaseData): void;
  cases(): void;
  prologue(): void;
  /** Aide-mémoire des règles. */
  rules(): void;
}

/** Écran titre : un seul bouton principal, qui sait où le joueur en est. */
export function renderTitle(root: HTMLElement, statuses: CaseStatus[], a: TitleActions): void {
  const next = nextCase(statuses);
  const begun = hasProgress(statuses) || loadFlags().prologueSeen;
  const kicker = story.prologue?.[0]?.heading;

  let primary: HTMLElement;
  if (!begun) {
    primary = h('button', { class: 'btn primary big', onClick: () => a.start() }, 'Commencer l\'enquête');
  } else if (next) {
    primary = h(
      'button',
      { class: 'btn primary big', onClick: () => a.resume(next.data) },
      'Continuer l\'enquête',
      h('small', {}, next.number ? `Affaire ${next.number} · ${next.data.title}` : next.data.title),
    );
  } else {
    primary = h('button', { class: 'btn primary big', onClick: () => a.cases() }, 'Revoir les affaires', h('small', {}, 'Toutes les affaires sont résolues'));
  }

  root.replaceChildren(
    h(
      'div',
      { class: 'title-screen' },
      engravingLayer('whitechapel', 'title-art'),
      fogLayer(),
      h(
        'div',
        { class: 'title-block' },
        kicker ? h('p', { class: 'kicker' }, kicker) : null,
        h('h1', { class: 'game-title' }, GAME_TITLE),
        GAME_SUBTITLE ? h('p', { class: 'game-subtitle' }, GAME_SUBTITLE) : null,
        h(
          'nav',
          { class: 'title-actions', 'aria-label': 'Menu principal' },
          primary,
          h(
            'div',
            { class: 'title-secondary' },
            h('button', { class: 'btn ghost', onClick: () => a.cases() }, 'Les affaires'),
            story.prologue?.length ? h('button', { class: 'btn ghost', onClick: () => a.prologue() }, 'Prologue') : null,
            h('button', { class: 'btn ghost', onClick: () => a.rules() }, 'Comment jouer'),
          ),
        ),
        import.meta.env.DEV
          ? h('a', { class: 'editor-link', href: './editeur.html', target: '_blank' }, '✎ Ouvrir l\'éditeur')
          : null,
      ),
      h(
        'p',
        { class: 'title-credits' },
        'Gravures : Gustave Doré, « London, a Pilgrimage » (1872), domaine public · Icônes : Lorc et Delapouite, game-icons.net (CC BY 3.0) · Polices IM Fell et UnifrakturMaguntia (OFL) · Silhouettes : Openclipart (CC0) · Textures : ambientCG et Kenney (CC0) · Sons : Joseph Sardin, BigSoundBank.com (CC0)',
      ),
    ),
  );
}
