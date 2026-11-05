import type { LoadedCase } from '../cases/registry';
import { h } from '../dom';
import { clearProgress, emptyProgress, isCaseSolved, loadProgress, saveProgress } from '../engine/progress';
import { currentOrder, evaluatePage, expectedSlots } from '../engine/validation';
import type { Page } from '../types';
import { renderExplore } from './explore';
import type { Actions, Session } from './session';
import { renderThink } from './think';
import { renderWordBank } from './wordBank';

/** Écran d'une affaire : en-tête, scène ou pages de réflexion, banque de mots. */
export function openCase(root: HTMLElement, data: LoadedCase, onExit: () => void): void {
  const s: Session = {
    data,
    progress: loadProgress(data),
    mode: 'explore',
    openZone: null,
    showZones: false,
    activePage: data.pages[0].id,
    selectedSlot: null,
    armedWord: null,
    lastCollected: null,
    showEpilogue: false,
  };

  // L'image est créée une seule fois et réutilisée à chaque rendu (pas de rechargement).
  const sceneImg = h('img', { class: 'scene-img', src: data.sceneUrl, alt: '', draggable: 'false' });

  const pageById = (id: string): Page | undefined => data.pages.find((p) => p.id === id);
  const save = () => saveProgress(data.id, s.progress);

  /** À appeler après toute modification d'une page : valide, sauvegarde. */
  function afterPageChange(page: Page) {
    const ev = evaluatePage(data, page, s.progress);
    if (ev.verdict === 'solved' && !s.progress.solved.includes(page.id)) {
      s.progress.solved.push(page.id);
      s.selectedSlot = null;
      if (isCaseSolved(data, s.progress)) s.showEpilogue = true;
    }
    save();
  }

  function fill(pageId: string, index: number, wordId: string | null) {
    const page = pageById(pageId);
    if (!page || s.progress.solved.includes(pageId)) return;
    const count = expectedSlots(page).length;
    const slots = s.progress.slots[pageId] ?? [];
    const next = Array.from({ length: count }, (_, i) => slots[i] ?? null);
    next[index] = wordId;
    s.progress.slots[pageId] = next;
    afterPageChange(page);
  }

  /** Après avoir rempli une case, on sélectionne la prochaine case vide de la page. */
  function selectNextEmpty(pageId: string, from: number) {
    if (s.progress.solved.includes(pageId)) return (s.selectedSlot = null);
    const slots = s.progress.slots[pageId] ?? [];
    const page = pageById(pageId);
    const count = page ? expectedSlots(page).length : 0;
    for (let k = 1; k <= count; k++) {
      const i = (from + k) % count;
      if (!slots[i]) return (s.selectedSlot = { page: pageId, index: i });
    }
    s.selectedSlot = null;
  }

  const a: Actions = {
    collect(wordId) {
      if (!s.progress.collected.includes(wordId)) {
        s.progress.collected.push(wordId);
        s.lastCollected = wordId;
        save();
      }
      render();
    },
    openZone(zoneId) {
      s.openZone = zoneId;
      if (!s.progress.seenZones.includes(zoneId)) {
        s.progress.seenZones.push(zoneId);
        save();
      }
      render();
    },
    closeZone() {
      s.openZone = null;
      render();
    },
    toggleZones() {
      s.showZones = !s.showZones;
      render();
    },
    setMode(mode) {
      s.mode = mode;
      s.selectedSlot = null;
      s.armedWord = null;
      render();
    },
    setPage(pageId) {
      s.activePage = pageId;
      s.selectedSlot = null;
      render();
    },
    selectSlot(pageId, index) {
      if (s.progress.solved.includes(pageId)) return;
      if (s.armedWord) {
        fill(pageId, index, s.armedWord);
        s.armedWord = null;
        s.selectedSlot = null;
      } else {
        const same = s.selectedSlot?.page === pageId && s.selectedSlot.index === index;
        s.selectedSlot = same ? null : { page: pageId, index };
      }
      render();
    },
    pickWord(wordId) {
      const sel = s.selectedSlot;
      if (sel) {
        fill(sel.page, sel.index, wordId);
        selectNextEmpty(sel.page, sel.index);
      } else {
        s.armedWord = s.armedWord === wordId ? null : wordId;
      }
      render();
    },
    dropWord(pageId, index, wordId) {
      if (!s.progress.collected.includes(wordId)) return;
      fill(pageId, index, wordId);
      s.selectedSlot = null;
      s.armedWord = null;
      render();
    },
    clearSlot(pageId, index) {
      fill(pageId, index, null);
      render();
    },
    moveEvent(pageId, from, to) {
      const page = pageById(pageId);
      if (!page || page.kind !== 'chronology' || s.progress.solved.includes(pageId)) return;
      const order = [...currentOrder(page, s.progress)];
      if (to < 0 || to >= order.length) return;
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
      s.progress.orders[pageId] = order;
      afterPageChange(page);
      render();
    },
    revealHint(pageId) {
      s.progress.hints[pageId] = (s.progress.hints[pageId] ?? 0) + 1;
      save();
      render();
    },
    dismissIntro() {
      s.progress.introSeen = true;
      save();
      render();
    },
    closeEpilogue() {
      s.showEpilogue = false;
      render();
    },
    reset() {
      if (!confirm('Recommencer cette affaire depuis le début ? Votre progression sera effacée.')) return;
      clearProgress(data.id);
      s.progress = emptyProgress(data);
      Object.assign(s, { mode: 'explore', openZone: null, selectedSlot: null, armedWord: null, showEpilogue: false });
      s.activePage = data.pages[0].id;
      render();
    },
    exit() {
      document.removeEventListener('keydown', onKey);
      onExit();
    },
  };

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (s.showEpilogue) a.closeEpilogue();
    else if (s.openZone) a.closeZone();
    else if (s.selectedSlot || s.armedWord) {
      s.selectedSlot = null;
      s.armedWord = null;
      render();
    }
  }
  document.addEventListener('keydown', onKey);

  let lastMode = s.mode;
  function render() {
    const prevMain = root.querySelector<HTMLElement>('.case-main');
    const scroll = lastMode === s.mode ? (prevMain?.scrollTop ?? 0) : 0;
    lastMode = s.mode;

    const overlay = renderOverlay(s, a);
    root.replaceChildren(
      renderHeader(s, a),
      h(
        'main',
        { class: `case-main mode-${s.mode}` },
        s.mode === 'explore' ? renderExplore(s, a, sceneImg) : renderThink(s, a),
      ),
      renderWordBank(s, a),
      ...(overlay ? [overlay] : []),
    );

    const main = root.querySelector<HTMLElement>('.case-main');
    if (main) main.scrollTop = scroll;
    s.lastCollected = null;
  }

  render();
}

function renderHeader(s: Session, a: Actions): HTMLElement {
  const solvedCount = s.data.pages.filter((p) => s.progress.solved.includes(p.id)).length;
  return h(
    'header',
    { class: 'case-header' },
    h('button', { class: 'btn ghost', onClick: () => a.exit() }, '← Affaires'),
    h('h1', { class: 'case-title' }, s.data.title),
    h(
      'div',
      { class: 'mode-tabs', role: 'tablist' },
      h(
        'button',
        {
          class: `mode-tab${s.mode === 'explore' ? ' active' : ''}`,
          role: 'tab',
          'aria-selected': String(s.mode === 'explore'),
          onClick: () => a.setMode('explore'),
        },
        'Explorer',
      ),
      h(
        'button',
        {
          class: `mode-tab${s.mode === 'think' ? ' active' : ''}`,
          role: 'tab',
          'aria-selected': String(s.mode === 'think'),
          onClick: () => a.setMode('think'),
        },
        `Réfléchir ${solvedCount}/${s.data.pages.length}`,
      ),
    ),
    h(
      'div',
      { class: 'header-tools' },
      s.mode === 'explore'
        ? h(
            'button',
            { class: `btn ghost small${s.showZones ? ' active' : ''}`, 'aria-pressed': String(s.showZones), onClick: () => a.toggleZones() },
            'Zones',
          )
        : null,
      h('button', { class: 'btn ghost small', onClick: () => a.reset() }, 'Recommencer'),
    ),
  );
}

function renderOverlay(s: Session, a: Actions): HTMLElement | null {
  if (!s.progress.introSeen) {
    return h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': s.data.title },
        h('h2', {}, s.data.title),
        h('p', { class: 'story' }, s.data.intro),
        h('button', { class: 'btn primary', onClick: () => a.dismissIntro() }, 'Commencer l\'enquête'),
      ),
    );
  }
  if (s.showEpilogue) {
    return h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Affaire résolue' },
        h('span', { class: 'modal-kicker' }, 'Affaire résolue'),
        h('h2', {}, s.data.title),
        h('p', { class: 'story' }, s.data.epilogue),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn ghost', onClick: () => a.closeEpilogue() }, 'Revoir la scène'),
          h('button', { class: 'btn primary', onClick: () => a.exit() }, 'Retour aux affaires'),
        ),
      ),
    );
  }
  return null;
}
