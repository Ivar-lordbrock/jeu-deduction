import { h } from '../dom';
import { parseSentence } from '../engine/markup';
import { currentOrder, DEFAULT_TOLERANCE, evaluatePage, type Evaluation } from '../engine/validation';
import type { ChronologyPage, IdentitiesPage, Page, Rect, SentencesPage, Zone } from '../types';
import { icon } from './art';
import type { Actions, Session } from './session';

/**
 * La gazette, au-dessus de la scène : chaque page de l'affaire devient un article
 * à compléter avec les mots du carnet. Tout est visible d'un coup, sans changer d'écran.
 */
export function renderGazette(s: Session, a: Actions): HTMLElement {
  const pages = s.data.pages;
  const solvedCount = pages.filter((p) => s.progress.solved.includes(p.id)).length;
  const allSolved = pages.length > 0 && solvedCount === pages.length;

  return h(
    'section',
    { class: `gazette${s.gazetteFolded ? ' folded' : ''}`, 'aria-label': 'Gazette : reconstitution des faits' },
    h(
      'header',
      { class: 'gz-mast' },
      h('span', { class: 'gz-edition' }, 'Édition spéciale'),
      h('h2', { class: 'gz-name' }, icon('lantern-flame'), 'The Whitechapel Lantern', icon('lantern-flame')),
      h(
        'span',
        { class: 'gz-right' },
        pages.length
          ? h(
              'span',
              { class: `gz-progress${allSolved ? ' done' : ''}` },
              `${solvedCount} / ${pages.length} article${pages.length > 1 ? 's' : ''} validé${solvedCount > 1 ? 's' : ''}`,
            )
          : null,
        h(
          'button',
          {
            class: 'gz-fold',
            'aria-expanded': String(!s.gazetteFolded),
            title: s.gazetteFolded ? 'Déplier la gazette' : 'Replier la gazette pour agrandir la scène',
            onClick: () => a.toggleGazette(),
          },
          icon('newspaper'),
          s.gazetteFolded ? 'Déplier ▾' : 'Replier ▴',
        ),
      ),
    ),
    s.gazetteFolded
      ? null
      : h(
          'div',
          { class: 'gz-cols', 'data-scroll': 'gz-cols' },
          pages.length ? pages.map((p) => renderArticle(p, s, a)) : h('p', { class: 'gz-empty' }, 'Aucun article pour le moment.'),
        ),
  );
}

function renderArticle(page: Page, s: Session, a: Actions): HTMLElement {
  const solved = s.progress.solved.includes(page.id);
  const body =
    page.kind === 'sentences'
      ? renderSentences(page, s, a, solved)
      : page.kind === 'identities'
        ? renderIdentities(page, s, a, solved)
        : renderChronology(page, s, a, solved);
  const hints = page.hints ?? [];
  const shown = Math.min(s.progress.hints[page.id] ?? 0, hints.length);

  return h(
    'article',
    {
      class: ['gz-article', `kind-${page.kind}`, solved && 'solved', s.justSolved === page.id && 'just-solved'].filter(Boolean).join(' '),
      'data-page': page.id,
      'data-kind': page.kind,
    },
    h('header', { class: 'gz-head' }, h('h3', {}, page.title), solved ? h('span', { class: 'gz-stamp' }, 'Validé') : null),
    h(
      'div',
      { class: 'gz-body', 'data-scroll': `gz-${page.id}` },
      body,
      shown ? h('div', { class: 'gz-hints' }, hints.slice(0, shown).map((t, i) => h('p', { class: 'hint' }, h('b', {}, `Indice ${i + 1}. `), t))) : null,
    ),
    h(
      'footer',
      { class: 'gz-foot' },
      renderVerdict(evaluatePage(s.data, page, s.progress), s.data.tolerance ?? DEFAULT_TOLERANCE, page),
      !solved && shown < hints.length
        ? h(
            'button',
            { class: 'gz-hint-btn', title: 'Révéler un indice', onClick: () => a.revealHint(page.id) },
            icon('lantern-flame'),
            `Indice ${shown + 1}/${hints.length}`,
          )
        : null,
    ),
  );
}

function renderBlank(pageId: string, index: number, s: Session, a: Actions, locked: boolean): HTMLElement {
  const value = s.progress.slots[pageId]?.[index] ?? null;
  const word = value ? s.data.words[value] : null;
  const selected = s.selectedSlot?.page === pageId && s.selectedSlot.index === index;
  const btn = h(
    'button',
    {
      class: ['blank', word && `filled cat-${word.category}`, selected && 'selected', s.armedWord && !locked && 'awaiting']
        .filter(Boolean)
        .join(' '),
      disabled: locked,
      'data-slot': `${pageId}:${index}`,
      'aria-label': word ? `Case ${index + 1} : ${word.label}` : `Case ${index + 1} vide`,
      title: locked ? undefined : word ? 'Clic droit pour vider la case' : 'Cliquez, puis choisissez un mot dans le carnet',
      onClick: () => a.selectSlot(pageId, index),
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault();
        if (!locked) a.clearSlot(pageId, index);
      },
      onDragOver: (e: DragEvent) => {
        if (locked) return;
        e.preventDefault();
        btn.classList.add('drop-target');
      },
      onDragLeave: () => btn.classList.remove('drop-target'),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        const id = e.dataTransfer?.getData('text/plain');
        if (id && !locked) a.dropWord(pageId, index, id);
      },
    },
    word ? word.label : '…',
  );
  return btn;
}

function renderSentences(page: SentencesPage, s: Session, a: Actions, locked: boolean): HTMLElement {
  let index = 0;
  return h(
    'div',
    { class: 'sentences' },
    page.sentences.map((sentence) =>
      h(
        'p',
        { class: 'sentence' },
        parseSentence(sentence).map((seg) => (seg.type === 'text' ? seg.text : renderBlank(page.id, index++, s, a, locked))),
      ),
    ),
  );
}

const PORTRAIT_W = 72;
const PORTRAIT_H = 96;

/**
 * Cadrage du portrait dans la scène : le champ « portrait » de la zone s'il existe,
 * sinon un cadre 3:4 de la largeur de la zone, calé en haut pour un personnage
 * debout (le visage), centré pour une zone plus large que haute.
 */
export function portraitRect(zone: Zone): Rect {
  if (zone.portrait) return zone.portrait;
  const { x, y, w, h: zh } = zone.rect;
  const ph = (w * PORTRAIT_H) / PORTRAIT_W;
  return { x, y: ph <= zh ? y : y + zh / 2 - ph / 2, w, h: ph };
}

/** Portrait découpé dans l'image de la scène, comme une gravure de journal. */
function portrait(zone: Zone, s: Session): HTMLElement {
  const W = PORTRAIT_W;
  const H = PORTRAIT_H;
  const { width, height } = s.data.scene;
  const r = portraitRect(zone);
  const scale = Math.min(W / r.w, H / r.h);
  const x = r.x * scale - (W - r.w * scale) / 2;
  const y = r.y * scale - (H - r.h * scale) / 2;
  return h('div', {
    class: 'portrait',
    role: 'img',
    'aria-label': zone.label,
    style: {
      width: `${W}px`,
      height: `${H}px`,
      backgroundImage: `url("${s.data.sceneUrl}")`,
      backgroundSize: `${width * scale}px ${height * scale}px`,
      backgroundPosition: `${-x}px ${-y}px`,
    },
  });
}

function renderIdentities(page: IdentitiesPage, s: Session, a: Actions, locked: boolean): HTMLElement {
  return h(
    'div',
    { class: 'identities' },
    page.people.map((p, i) => {
      const zone = s.data.zones.find((z) => z.id === p.zone);
      return h(
        'figure',
        { class: 'identity' },
        zone ? portrait(zone, s) : h('div', { class: 'portrait missing' }, '?'),
        h('figcaption', {}, h('span', { class: 'identity-label' }, zone?.label ?? p.zone), renderBlank(page.id, i, s, a, locked)),
      );
    }),
  );
}

function renderChronology(page: ChronologyPage, s: Session, a: Actions, locked: boolean): HTMLElement {
  const order = currentOrder(page, s.progress);
  return h(
    'ol',
    { class: 'chronology' },
    order.map((eventIndex, pos) =>
      h(
        'li',
        {},
        h('span', { class: 'chrono-pos' }, String(pos + 1)),
        h('span', { class: 'chrono-text' }, page.events[eventIndex]),
        locked
          ? null
          : h(
              'span',
              { class: 'chrono-move' },
              h(
                'button',
                { class: 'icon-btn', 'aria-label': 'Monter', title: 'Monter', disabled: pos === 0, onClick: () => a.moveEvent(page.id, pos, pos - 1) },
                '▲',
              ),
              h(
                'button',
                {
                  class: 'icon-btn',
                  'aria-label': 'Descendre',
                  title: 'Descendre',
                  disabled: pos === order.length - 1,
                  onClick: () => a.moveEvent(page.id, pos, pos + 1),
                },
                '▼',
              ),
            ),
      ),
    ),
  );
}

function renderVerdict(ev: Evaluation, tolerance: number, page: Page): HTMLElement {
  const messages: Record<Evaluation['verdict'], string> = {
    incomplete: page.kind === 'chronology' ? 'Remettez les événements dans l\'ordre.' : 'Complétez toutes les cases.',
    solved: '✓ Validé',
    close: `Presque : ${tolerance} erreur${tolerance > 1 ? 's' : ''} ou moins.`,
    wrong: 'Quelque chose ne colle pas…',
  };
  return h('p', { class: `verdict ${ev.verdict}`, role: 'status' }, messages[ev.verdict]);
}
