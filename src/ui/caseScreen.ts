import type { LoadedCase } from '../cases/registry';
import { h } from '../dom';
import { clearProgress, emptyProgress, isCaseSolved, loadFlags, loadProgress, saveProgress, setFlag } from '../engine/progress';
import { currentOrder, evaluatePage, expectedSlots } from '../engine/validation';
import type { Page } from '../types';
import { icon } from './art';
import { renderScene } from './explore';
import { renderGazette } from './gazette';
import { createGuide, type Guide } from './guide';
import { renderNotebook } from './notebook';
import { openRules } from './rules';
import type { Actions, Session } from './session';
import { playSound, soundButton } from './sound';

export interface CaseScreenOptions {
  /** Ligne au-dessus du titre : « Affaire 1 · Chapitre 1 — … ». */
  kicker: string;
  exit(): void;
  /** Affaire suivante, proposée à la fin (absente pour la dernière). */
  next?: () => void;
}

// Hauteur de la gazette choisie par le joueur (barre de redimensionnement), et repli.
// Par défaut, la gazette est repliée : la scène prend toute la place.
const GAZETTE_KEY = 'jeu-deduction:v1:@gazette';
const MIN_GAZETTE = 120;
const MIN_SCENE = 200;

function loadGazettePref(): { height: number | null; folded: boolean } {
  try {
    const p = JSON.parse(localStorage.getItem(GAZETTE_KEY) ?? '{}');
    return { height: typeof p.height === 'number' ? p.height : null, folded: p.folded !== false };
  } catch {
    return { height: null, folded: true };
  }
}

function saveGazettePref(height: number | null, folded: boolean) {
  try {
    localStorage.setItem(GAZETTE_KEY, JSON.stringify({ height, folded }));
  } catch {
    // Stockage indisponible : la préférence ne sera pas retenue.
  }
}

/**
 * Écran d'une affaire, tout sur un seul écran : en-tête, carnet à gauche,
 * gazette (reconstitution des faits) au-dessus de la scène.
 * Renvoie la fonction de nettoyage, appelée quand on quitte l'écran.
 */
export function openCase(root: HTMLElement, data: LoadedCase, opts: CaseScreenOptions): () => void {
  const pref = loadGazettePref();
  let gazetteHeight = pref.height;

  const s: Session = {
    data,
    progress: loadProgress(data),
    openZone: null,
    showZones: false,
    selectedSlot: null,
    armedWord: null,
    lastCollected: null,
    justSolved: null,
    justHinted: null,
    gazetteFolded: pref.folded,
    showEpilogue: false,
  };

  // L'image est créée une seule fois et réutilisée à chaque rendu (pas de rechargement).
  const sceneImg = h('img', { class: 'scene-img', src: data.sceneUrl, alt: '', draggable: 'false' });

  const pageById = (id: string): Page | undefined => data.pages.find((p) => p.id === id);
  const save = () => saveProgress(data.id, s.progress);

  let guide: Guide | null = null;
  function startGuide() {
    guide?.dispose();
    guide = createGuide(root, s, {
      showGazette: () => {
        if (!s.gazetteFolded) return;
        s.gazetteFolded = false;
        saveGazettePref(gazetteHeight, false);
        render();
      },
      end: () => {
        guide = null;
        setFlag('tutorialDone');
      },
    });
    guide.sync();
  }

  /** À appeler après toute modification d'une page : valide, sauvegarde. */
  function afterPageChange(page: Page) {
    const ev = evaluatePage(data, page, s.progress);
    if (ev.verdict === 'solved' && !s.progress.solved.includes(page.id)) {
      playSound('stamp', 0.12);
      s.progress.solved.push(page.id);
      s.justSolved = page.id;
      s.selectedSlot = null;
      if (isCaseSolved(data, s.progress)) {
        playSound('victory', 1.1);
        s.showEpilogue = true;
        // L'affaire est résolue avant la fin du tutoriel : inutile de continuer.
        if (guide) {
          guide.dispose();
          guide = null;
          setFlag('tutorialDone');
        }
      }
    } else if (page.kind !== 'chronology' && (ev.verdict === 'close' || ev.verdict === 'wrong')) {
      // la chronologie se juge à chaque déplacement : on ne sonne que sa réussite
      playSound(ev.verdict, 0.15);
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
    playSound(wordId ? 'type' : 'untype');
    s.progress.slots[pageId] = next;
    afterPageChange(page);
  }

  /** Après avoir rempli une case, on sélectionne la prochaine case vide du même article. */
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
        playSound('pen');
        s.lastCollected = wordId;
        save();
      }
      render();
    },
    openZone(zoneId) {
      playSound(data.zones.find((z) => z.id === zoneId)?.kind === 'document' ? 'paper' : 'paperSoft');
      s.openZone = zoneId;
      if (!s.progress.seenZones.includes(zoneId)) {
        s.progress.seenZones.push(zoneId);
        save();
      }
      render();
    },
    closeZone() {
      if (s.openZone) playSound('paperSoft');
      s.openZone = null;
      render();
    },
    toggleZones() {
      playSound('click');
      s.showZones = !s.showZones;
      render();
    },
    toggleGazette() {
      playSound('paper');
      s.gazetteFolded = !s.gazetteFolded;
      saveGazettePref(gazetteHeight, s.gazetteFolded);
      render();
    },
    selectSlot(pageId, index) {
      if (s.progress.solved.includes(pageId)) return;
      if (s.armedWord) {
        fill(pageId, index, s.armedWord);
        s.armedWord = null;
        s.selectedSlot = null;
      } else {
        playSound('click');
        const same = s.selectedSlot?.page === pageId && s.selectedSlot.index === index;
        s.selectedSlot = same ? null : { page: pageId, index };
      }
      render();
    },
    pickWord(wordId) {
      // Prendre un mot dans le carnet, c'est vouloir le placer : on déplie la gazette.
      if (s.gazetteFolded) {
        s.gazetteFolded = false;
        saveGazettePref(gazetteHeight, false);
      }
      const sel = s.selectedSlot;
      if (sel) {
        fill(sel.page, sel.index, wordId);
        selectNextEmpty(sel.page, sel.index);
      } else {
        playSound('click');
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
      playSound('type');
      afterPageChange(page);
      render();
    },
    revealHint(pageId) {
      s.progress.hints[pageId] = (s.progress.hints[pageId] ?? 0) + 1;
      playSound('hint');
      s.justHinted = pageId;
      save();
      render();
    },
    dismissIntro() {
      playSound('paper');
      s.progress.introSeen = true;
      save();
      render();
    },
    closeEpilogue() {
      playSound('click');
      s.showEpilogue = false;
      render();
    },
    reset() {
      if (!confirm('Recommencer cette affaire depuis le début ? Votre progression sera effacée.')) return;
      playSound('paper');
      clearProgress(data.id);
      s.progress = emptyProgress(data);
      Object.assign(s, { openZone: null, selectedSlot: null, armedWord: null, showEpilogue: false });
      render();
    },
    exit() {
      playSound('click');
      opts.exit();
    },
    help() {
      playSound('paper');
      openRules({
        replayTutorial: data.tutorial ? startGuide : undefined,
        onClose: () => guide?.sync(),
      });
    },
    next: opts.next,
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

  /** Barre entre la gazette et la scène : on la tire pour partager la place. */
  function splitter(): HTMLElement {
    const bar = h('div', {
      class: 'gz-splitter',
      role: 'separator',
      'aria-orientation': 'horizontal',
      'aria-label': 'Partager la place entre la gazette et la scène',
      title: s.gazetteFolded ? 'Double-clic : déplier la gazette' : 'Glissez pour agrandir la gazette ou la scène · double-clic : replier',
      onDblClick: () => a.toggleGazette(),
      onPointerDown: (e: PointerEvent) => {
        if (s.gazetteFolded || e.button !== 0) return;
        const main = bar.parentElement as HTMLElement;
        const top = main.getBoundingClientRect().top;
        const max = main.clientHeight - MIN_SCENE;
        bar.setPointerCapture(e.pointerId);
        bar.classList.add('dragging');
        const move = (ev: PointerEvent) => {
          gazetteHeight = Math.round(Math.min(Math.max(ev.clientY - top - 6, MIN_GAZETTE), max));
          main.style.setProperty('--gz-h', `${gazetteHeight}px`);
          guide?.reposition();
        };
        const up = () => {
          bar.removeEventListener('pointermove', move);
          bar.removeEventListener('pointerup', up);
          bar.removeEventListener('pointercancel', up);
          bar.classList.remove('dragging');
          saveGazettePref(gazetteHeight, s.gazetteFolded);
        };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', up);
        bar.addEventListener('pointercancel', up);
        e.preventDefault();
      },
    });
    return bar;
  }

  function render() {
    // On garde la position de défilement de chaque zone qui défile (carnet, articles, fiche).
    const scrolls = new Map<string, [number, number]>();
    root.querySelectorAll<HTMLElement>('[data-scroll]').forEach((el) => scrolls.set(el.dataset.scroll ?? '', [el.scrollTop, el.scrollLeft]));

    const overlay = renderOverlay(s, a);
    root.replaceChildren(
      renderHeader(s, a, opts.kicker),
      h(
        'div',
        { class: 'case-body' },
        renderNotebook(s, a),
        h(
          'main',
          {
            class: `case-main${s.gazetteFolded ? ' folded' : ''}`,
            style: gazetteHeight ? { '--gz-h': `${gazetteHeight}px` } : {},
          },
          renderGazette(s, a),
          splitter(),
          renderScene(s, a, sceneImg),
        ),
      ),
      ...(overlay ? [overlay] : []),
    );

    root.querySelectorAll<HTMLElement>('[data-scroll]').forEach((el) => {
      const pos = scrolls.get(el.dataset.scroll ?? '');
      if (!pos) return;
      el.scrollTop = pos[0];
      el.scrollLeft = pos[1];
    });
    if (s.justHinted) {
      const body = root.querySelector<HTMLElement>(`.gz-article[data-page="${CSS.escape(s.justHinted)}"] .gz-body`);
      if (body) body.scrollTop = body.scrollHeight;
    }
    s.lastCollected = null;
    s.justSolved = null;
    s.justHinted = null;
    guide?.sync();
  }

  render();
  // Première partie : le tutoriel se joue dans l'affaire marquée « tutorial ».
  if (data.tutorial && !loadFlags().tutorialDone) startGuide();

  return () => {
    document.removeEventListener('keydown', onKey);
    guide?.dispose();
    guide = null;
  };
}

function renderHeader(s: Session, a: Actions, kicker: string): HTMLElement {
  return h(
    'header',
    { class: 'case-header' },
    h('button', { class: 'btn ghost back', onClick: () => a.exit() }, '← Affaires'),
    h('div', { class: 'case-titles' }, h('span', { class: 'kicker' }, kicker), h('h1', { class: 'case-title' }, s.data.title)),
    h(
      'div',
      { class: 'header-tools' },
      h(
        'button',
        {
          class: `btn ghost small${s.showZones ? ' active' : ''}`,
          'data-tool': 'zones',
          'aria-pressed': String(s.showZones),
          title: 'Entourer tout ce qui peut être examiné',
          onClick: () => a.toggleZones(),
        },
        icon('magnifying-glass'),
        s.showZones ? 'Masquer les zones' : 'Montrer les zones',
      ),
      h(
        'button',
        { class: 'btn ghost small', 'data-tool': 'reset', title: 'Effacer la progression de cette affaire', onClick: () => a.reset() },
        icon('cycle'),
        'Recommencer',
      ),
      h(
        'button',
        { class: 'btn ghost small help-btn', 'data-tool': 'help', title: 'Comment jouer', 'aria-label': 'Comment jouer', onClick: () => a.help() },
        '?',
      ),
      soundButton(),
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
        h('span', { class: 'modal-kicker' }, s.data.tutorial ? 'Première affaire · tutoriel' : 'Nouvelle affaire'),
        h('h2', {}, s.data.title),
        h('p', { class: 'story' }, s.data.intro),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn ghost', onClick: () => a.exit() }, '← Affaires'),
          h('button', { class: 'btn primary', onClick: () => a.dismissIntro() }, 'Examiner la scène'),
        ),
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
        h('span', { class: 'modal-kicker solved' }, 'Affaire résolue'),
        h('h2', {}, s.data.title),
        h('p', { class: 'story' }, s.data.epilogue),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn ghost', onClick: () => a.closeEpilogue() }, 'Revoir la scène'),
          a.next ? h('button', { class: 'btn ghost', onClick: () => a.exit() }, 'Retour aux affaires') : null,
          a.next
            ? h('button', { class: 'btn primary', onClick: () => a.next?.() }, 'Affaire suivante →')
            : h('button', { class: 'btn primary', onClick: () => a.exit() }, 'Retour aux affaires'),
        ),
      ),
    );
  }
  return null;
}
