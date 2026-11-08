import { chapterIndex } from '../cases/registry';
import { GAME_TITLE, story } from '../config';
import { h } from '../dom';
import { nextCase, type CaseStatus } from '../engine/campaign';
import type { CaseData } from '../types';
import boothMap from '../assets/maps/booth-whitechapel.jpg';

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

/**
 * Où se passe chaque affaire sur la carte de Booth, en pixels de l'image (1600 × 1150).
 * Gardé ici plutôt que dans case.json, que l'éditeur réécrit.
 */
export const MAP_W = 1600;
export const MAP_H = 1150;
export const MAP_PINS: Record<string, { x: number; y: number; place: string }> = {
  'leman-street': { x: 280, y: 1060, place: 'Poste de police de Leman Street' },
  morgue: { x: 500, y: 690, place: 'Morgue de Whitechapel, Old Montague Street' },
  fruiterie: { x: 602, y: 1037, place: "King's Row, la boutique du marchand de fruits" },
  // hors du plan : l'agence est à l'ouest, près de Fleet Street ; l'épingle est au bord, sur la route d'Aldgate
  'agence-mercury': { x: 36, y: 958, place: 'Agence Mercury, New Bridge Street, près de Fleet Street' },
  // Alderney Road est au nord de Mile End Road, un peu à l'est du bord du plan : l'épingle est au bord, sur Mile End Road
  'colis-mile-end': { x: 1560, y: 330, place: 'Chez Joseph Larkin, Alderney Road, Mile End' },
  // Dorset Street part de Commercial Street, en face de Christ Church, vers l'ouest
  'millers-court': { x: 100, y: 660, place: "Miller's Court, Dorset Street, Spitalfields" },
  // Swift Gardens passe sous les arches du chemin de fer, au sud de Chamber Street : juste sous le bord du plan,
  // un peu à l'ouest du poste de Leman Street ; l'affaire se joue au poste, l'épingle marque le crime
  'pas-lui': { x: 220, y: 1128, place: 'Swift Gardens, sous les arches du chemin de fer, près de Leman Street' },
};

/** Les couleurs de Booth, de la misère à l'aisance. */
const BOOTH_LEGEND: [string, string][] = [
  ['#1d1b1a', 'misère'],
  ['#2f4f8f', 'très pauvres'],
  ['#7c9cc7', 'pauvres'],
  ['#8a6a9a', 'mêlés'],
  ['#d98c8c', 'aisés'],
  ['#b8322f', 'classe moyenne'],
];

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * La carte de la pauvreté de Charles Booth (1887), une épingle par affaire, reliées par le fil
 * rouge dans l'ordre de l'enquête. Survoler une épingle éclaire sa fiche, et inversement.
 */
function caseMap(statuses: CaseStatus[], next: CaseStatus | null, open: (c: CaseData) => void): HTMLElement | null {
  const pinned = statuses.filter((st) => MAP_PINS[st.data.id]);
  if (!pinned.length) return null;
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;

  // le fil rouge : de l'affaire 1 à la dernière ouverte
  const thread = pinned.filter((st) => st.state !== 'locked' && !st.data.draft).map((st) => MAP_PINS[st.data.id]);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  if (thread.length > 1) {
    const line = document.createElementNS(SVG_NS, 'polyline');
    line.setAttribute('points', thread.map((p) => `${p.x},${p.y}`).join(' '));
    line.setAttribute('class', 'map-thread');
    svg.append(line);
  }

  const pins = pinned.map((st) => {
    const p = MAP_PINS[st.data.id];
    const locked = st.state === 'locked';
    return h(
      'button',
      {
        class: `map-pin ${st.state}${st === next ? ' next' : ''}`,
        'data-case': st.data.id,
        style: { left: pct(p.x, MAP_W), top: pct(p.y, MAP_H) },
        disabled: locked,
        title: locked ? 'Affaire verrouillée' : `${p.place} — ${st.data.title}`,
        'aria-label': locked ? `Affaire ${st.number} verrouillée` : `${st.data.title} (${p.place})`,
        onClick: () => open(st.data),
      },
      h('span', { class: 'map-pin-head' }, st.number ?? '✎'),
    );
  });

  return h(
    'figure',
    { class: 'case-map' },
    h(
      'div',
      { class: 'map-frame' },
      h('img', { src: boothMap, alt: 'Whitechapel sur la carte de la pauvreté de Charles Booth, 1887', draggable: 'false' }),
      svg,
      pins,
    ),
    h(
      'figcaption',
      {},
      h('span', { class: 'map-legend' }, BOOTH_LEGEND.map(([color, label]) => h('span', {}, h('i', { style: { background: color } }), label))),
      h('span', { class: 'map-credit' }, 'Charles Booth, carte de la pauvreté de l\'East End, 1887 (domaine public)'),
    ),
  );
}

/** Lie chaque épingle à sa fiche : survoler l'une éclaire l'autre. */
function linkPins(root: HTMLElement) {
  const all = [...root.querySelectorAll<HTMLElement>('[data-case]')];
  for (const el of all) {
    const light = (on: boolean) => () => all.filter((x) => x.dataset.case === el.dataset.case).forEach((x) => x.classList.toggle('hot', on));
    el.addEventListener('pointerenter', light(true));
    el.addEventListener('pointerleave', light(false));
    el.addEventListener('focus', light(true));
    el.addEventListener('blur', light(false));
  }
}

/** Liste des affaires, rangées par chapitre, à côté de la carte. L'affaire à reprendre est mise en avant. */
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
          'data-case': c.id,
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
  const map = caseMap(statuses, next, a.open);

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
        { class: `cases-body${map ? ' with-map' : ''}` },
        map,
        h(
          'div',
          { class: 'cases-list' },
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
    ),
  );
  linkPins(root);
  root.querySelector<HTMLButtonElement>('.case-card.next')?.focus({ preventScroll: true });
}
