import { h } from '../dom';
import { parseSentence } from '../engine/markup';
import { zoneScene } from '../engine/scenes';
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
  const scene = zoneScene(s.data, zone);
  const { width, height } = scene;
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
      backgroundImage: `url("${s.data.sceneUrls[scene.id] ?? s.data.sceneUrl}")`,
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
  const list = h('ol', { class: `chronology${locked ? '' : ' sortable'}` });
  order.forEach((eventIndex, pos) => {
    const li = h(
      'li',
      { title: locked ? undefined : 'Glissez pour déplacer' },
      locked ? null : h('span', { class: 'chrono-grip', 'aria-hidden': 'true' }),
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
    );
    if (!locked) li.addEventListener('pointerdown', (e) => dragEvent(e, list, li, pos, (to) => a.moveEvent(page.id, pos, to)));
    list.append(li);
  });
  return list;
}

/** Près du bord de l'article (px), la liste défile toute seule pendant qu'on glisse. */
const AUTO_SCROLL_EDGE = 32;

/**
 * Glisser un événement de la chronologie : il suit le pointeur, les autres s'écartent
 * pour lui faire place, et il prend sa nouvelle place quand on le lâche.
 * À la souris, on le saisit n'importe où ; au doigt, par sa poignée (le reste fait défiler).
 */
function dragEvent(e: PointerEvent, list: HTMLElement, li: HTMLElement, from: number, drop: (to: number) => void) {
  const target = e.target as Element;
  if (e.button !== 0 || target.closest('button')) return;
  if (e.pointerType !== 'mouse' && !target.closest('.chrono-grip')) return;
  e.preventDefault();

  const items = [...list.children] as HTMLElement[];
  const rects = items.map((el) => el.getBoundingClientRect());
  const mids = rects.map((r) => r.top + r.height / 2);
  const gap = items.length > 1 ? rects[1].top - rects[0].bottom : 0;
  const room = rects[from].height + gap;
  const scroller = list.closest<HTMLElement>('.gz-body');
  const startY = e.clientY;
  const startScroll = scroller?.scrollTop ?? 0;
  let pointerY = startY;
  let to = from;
  let active = false;
  let frame = 0;

  const layout = () => {
    // décalage dans la liste, défilement de l'article compris
    const dy = pointerY - startY + (scroller?.scrollTop ?? 0) - startScroll;
    const center = mids[from] + dy;
    li.style.transform = `translateY(${dy}px)`;
    to = from;
    items.forEach((el, i) => {
      let shift = 0;
      if (i < from && center < mids[i]) {
        shift = room;
        to--;
      } else if (i > from && center > mids[i]) {
        shift = -room;
        to++;
      }
      if (i !== from) el.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };

  const autoScroll = () => {
    frame = 0;
    if (!active || !scroller) return;
    const r = scroller.getBoundingClientRect();
    const speed =
      pointerY < r.top + AUTO_SCROLL_EDGE
        ? -Math.ceil((r.top + AUTO_SCROLL_EDGE - pointerY) / 3)
        : pointerY > r.bottom - AUTO_SCROLL_EDGE
          ? Math.ceil((pointerY - r.bottom + AUTO_SCROLL_EDGE) / 3)
          : 0;
    if (!speed) return;
    const before = scroller.scrollTop;
    scroller.scrollTop += speed;
    if (scroller.scrollTop !== before) layout();
    frame = requestAnimationFrame(autoScroll);
  };

  const move = (ev: PointerEvent) => {
    pointerY = ev.clientY;
    if (!active) {
      if (Math.abs(pointerY - startY) < 4) return;
      active = true;
      li.classList.add('dragging');
      list.classList.add('reordering');
    }
    layout();
    if (!frame) frame = requestAnimationFrame(autoScroll);
  };

  const end = (ev: PointerEvent) => {
    li.removeEventListener('pointermove', move);
    li.removeEventListener('pointerup', end);
    li.removeEventListener('pointercancel', end);
    cancelAnimationFrame(frame);
    const wasActive = active;
    active = false;
    if (wasActive && ev.type === 'pointerup' && to !== from) return drop(to);
    list.classList.remove('reordering');
    li.classList.remove('dragging');
    items.forEach((el) => (el.style.transform = ''));
  };

  li.setPointerCapture(e.pointerId);
  li.addEventListener('pointermove', move);
  li.addEventListener('pointerup', end);
  li.addEventListener('pointercancel', end);
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
