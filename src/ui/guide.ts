import { h } from '../dom';
import { wordIdsIn } from '../engine/markup';
import { MAIN_SCENE, sceneZones } from '../engine/scenes';
import { DEFAULT_TOLERANCE, expectedSlots } from '../engine/validation';
import type { Zone } from '../types';
import type { Session } from './session';

/**
 * Le tutoriel guidé, joué dans la première affaire (celle marquée « tutorial » dans
 * case.json). Une bulle met en lumière un élément de l'écran et donne une consigne ;
 * les étapes « à faire » avancent seules quand le joueur a réussi.
 *
 * Les étapes sont calculées à partir des données de l'affaire (premier témoin,
 * premier document, pages présentes) : modifier l'affaire dans l'éditeur ne casse
 * pas le tutoriel.
 */

/** État de départ d'une étape, pour savoir si le joueur a agi depuis. */
interface Snapshot {
  filled: number;
  orders: string;
}

interface Step {
  title: string;
  text: string;
  /** Consigne d'une étape à faire soi-même. */
  task?: (s: Session) => string;
  /** L'étape est réussie : on passe à la suivante après un court instant. */
  done?: (s: Session, base: Snapshot) => boolean;
  /** Élément mis en lumière ; sans cible, la bulle s'affiche au centre. */
  target?: () => Element | null;
  /** Le joueur explore librement : l'anneau ne voile pas le reste de l'écran (le carnet se remplit). */
  free?: boolean;
  /** Texte du bouton principal (« Suivant → » par défaut). */
  button?: string;
  enter?: () => void;
}

export interface GuideHooks {
  /** Déplie la gazette si le joueur l'a repliée. */
  showGazette(): void;
  /** Fin du tutoriel (terminé ou passé). */
  end(): void;
}

export interface Guide {
  /** À appeler après chaque rendu de l'écran : vérifie l'étape, redessine la bulle. */
  sync(): void;
  /** Recalcule seulement la position (redimensionnement…). */
  reposition(): void;
  dispose(): void;
}

/** Mots collectables d'une zone (texte principal et gros plans). */
export function zoneWords(z: Zone): string[] {
  return [...new Set([z.text, ...(z.details ?? []).map((d) => d.text)].flatMap((t) => (typeof t === 'string' ? wordIdsIn(t) : [])))];
}

/** Les zones sur lesquelles le tutoriel s'appuie : un premier témoin, puis un document. */
export function tutorialZones(zones: Zone[], words: Record<string, unknown>): { first?: Zone; doc?: Zone } {
  const withWords = zones.filter((z) => zoneWords(z).some((w) => words[w]));
  const first = withWords.find((z) => z.kind === 'person') ?? withWords[0];
  const doc = withWords.find((z) => z.kind === 'document' && z !== first);
  return { first, doc };
}

export function createGuide(root: HTMLElement, s: Session, hooks: GuideHooks): Guide {
  const data = s.data;
  const q = (sel: string) => root.querySelector(sel);
  // Le tutoriel guide dans la première scène (les zones des autres scènes ne sont pas affichées).
  const { first, doc } = tutorialZones(sceneZones(data.zones, MAIN_SCENE), data.words);
  const zoneEl = (z: Zone) => q(`.zone[data-zone="${CSS.escape(z.id)}"]`);
  const panelOr = (z: Zone) => (s.openZone === z.id ? q('.zone-panel') : zoneEl(z));
  // La scène et la fiche ouverte par-dessus : l'anneau les entoure ensemble, sans couper la fiche.
  const sceneArea = () => q('.scene-area');
  const wordsOf = (z: Zone) => zoneWords(z).filter((w) => data.words[w]);
  const got = (z: Zone) => wordsOf(z).filter((w) => s.progress.collected.includes(w)).length;
  const exploreGoal = Math.min(data.zones.length, 6);
  const tolerance = data.tolerance ?? DEFAULT_TOLERANCE;
  const has = (kind: string) => data.pages.some((p) => p.kind === kind);
  const article = (kind: string) => q(`.gz-article[data-kind="${kind}"]`);

  /** Case visée par l'étape « Remplir » : de préférence une case dont le joueur a déjà le mot. */
  let fillTarget: string | null = null;
  function chooseBlank(): string | null {
    let fallback: string | null = null;
    for (const p of data.pages) {
      if (p.kind === 'chronology' || s.progress.solved.includes(p.id)) continue;
      const expected = expectedSlots(p);
      const slots = s.progress.slots[p.id] ?? [];
      for (let i = 0; i < expected.length; i++) {
        if (slots[i]) continue;
        const key = `${p.id}:${i}`;
        fallback ??= key;
        if (expected[i].some((w) => s.progress.collected.includes(w))) return key;
      }
    }
    return fallback;
  }

  const snapshot = (): Snapshot => ({
    filled: Object.values(s.progress.slots)
      .flat()
      .filter(Boolean).length,
    orders: JSON.stringify(s.progress.orders),
  });

  const maybe = (cond: unknown, step: Step): Step[] => (cond ? [step] : []);

  const steps: Step[] = [
    {
      title: 'Votre première enquête',
      text: 'Reporter le jour, détective dans l\'âme : cette affaire sert de tutoriel. Je vais vous montrer, pas à pas, comment mener l\'enquête. Vous pouvez passer une étape, ou tout le tutoriel, à tout moment.',
      button: 'C\'est parti',
    },
    {
      title: 'La scène',
      text: 'Voici l\'instant figé de l\'affaire. Tout ce qui s\'éclaire au survol de la souris peut être examiné : personnages, objets, documents.',
      target: sceneArea,
    },
    ...maybe(first, {
      title: 'Examiner',
      text: first?.kind === 'person' ? 'Commençons par un témoin : écoutez son récit.' : 'Commençons par ici.',
      task: () => `Cliquez sur « ${first!.label} ».`,
      done: () => s.openZone === first!.id,
      target: () => zoneEl(first!),
    }),
    ...maybe(first, {
      title: 'Noter les indices',
      text: 'Les mots soulignés sont des indices ; leur couleur indique leur catégorie. Lisez la fiche jusqu\'en bas : certaines ont un gros plan, comme une convocation ou le contenu d\'une poche.',
      task: () => `Cliquez les mots soulignés de cette fiche (${got(first!)}/${wordsOf(first!).length}).`,
      done: () => got(first!) === wordsOf(first!).length,
      target: () => panelOr(first!),
    }),
    {
      title: 'Le carnet',
      text: 'Chaque mot noté s\'inscrit ici, rangé par catégorie : personnes, actions, objets, lieux, divers. C\'est votre réserve : vous y piocherez pour reconstituer les faits.',
      target: () => q('.carnet'),
    },
    ...maybe(doc, {
      title: 'Lire les documents',
      text: 'Les documents se lisent comme de vrais papiers : ils regorgent de noms, de lieux et d\'heures. Fermez une fiche avec × ou la touche Échap.',
      task: () => `Ouvrez « ${doc!.label} » et notez ses mots soulignés (${got(doc!)}/${wordsOf(doc!).length}).`,
      done: () => got(doc!) === wordsOf(doc!).length,
      target: () => panelOr(doc!),
    }),
    {
      title: 'Montrer les zones',
      text: 'Vous ne savez plus où chercher ? Ce bouton entoure tout ce qui peut être examiné. Ce que vous avez déjà vu apparaît en pointillés.',
      task: () => 'Cliquez « Montrer les zones ».',
      done: () => s.showZones,
      target: () => q('[data-tool="zones"]'),
    },
    {
      title: 'Fouiller la scène',
      text: 'Examinez le reste de la scène et notez tout ce qui vous semble important. Certains mots ne servent à rien : à vous de faire le tri.',
      task: () => `Examinez au moins ${exploreGoal} éléments (${Math.min(s.progress.seenZones.length, exploreGoal)}/${exploreGoal}).`,
      done: () => s.progress.seenZones.length >= exploreGoal,
      target: sceneArea,
      free: true,
    },
    ...maybe(data.pages.length, {
      title: 'La gazette',
      text: 'Au-dessus de la scène, votre gazette : c\'est ici que vous écrivez ce qui s\'est passé, sans quitter la scène des yeux. Chaque article se complète avec les mots du carnet. Repliée, elle laisse toute la place à la scène ; elle se déplie dès que vous prenez un mot. Tirez la barre pour l\'agrandir.',
      target: () => q('.gazette'),
      enter: () => hooks.showGazette(),
    }),
    ...maybe(has('sentences') || has('identities'), {
      title: 'Remplir une case',
      text: 'Cliquez une case vide, puis un mot du carnet. Vous pouvez aussi glisser un mot jusqu\'à la case, ou choisir le mot d\'abord, puis la case.',
      task: () => (s.selectedSlot ? 'Choisissez maintenant un mot dans le carnet.' : 'Placez un mot dans une case de la gazette.'),
      done: (_, base) => snapshot().filled > base.filled,
      target: () => (s.selectedSlot ? q('.carnet') : (fillTarget && q(`[data-slot="${CSS.escape(fillTarget)}"]`)) || q('.gazette')),
      enter: () => {
        hooks.showGazette();
        fillTarget = chooseBlank();
      },
    }),
    ...maybe(has('sentences') || has('identities'), {
      title: 'Corriger',
      text: 'Changé d\'avis ? Un clic droit sur une case la vide. Vous pouvez aussi cliquer une case remplie, puis un autre mot pour le remplacer.',
      target: () => q('.gazette .blank.filled') ?? q('.gazette'),
    }),
    ...maybe(has('identities'), {
      title: 'Qui est qui ?',
      text: 'Chaque portrait attend un nom. Les noms se cachent dans les textes de la scène : documents, conversations, poches…',
      target: () => article('identities'),
      enter: () => hooks.showGazette(),
    }),
    ...maybe(has('chronology'), {
      title: 'Dans quel ordre ?',
      text: 'Remettez les événements dans l\'ordre où ils se sont produits. Les dates et les heures des documents vous aideront.',
      task: () => 'Glissez un événement à sa place (ou utilisez ▲ ▼).',
      done: (_, base) => JSON.stringify(s.progress.orders) !== base.orders,
      target: () => article('chronology'),
      enter: () => hooks.showGazette(),
    }),
    ...maybe(data.pages.length, {
      title: 'Le verdict',
      text: `Dès qu'un article est complet, la gazette le juge : « ✓ Validé », « Presque : ${tolerance} erreur${tolerance > 1 ? 's' : ''} ou moins », ou « Quelque chose ne colle pas… ». Elle ne dit jamais où sont les erreurs : à vous de trouver.`,
      // De préférence un article déjà jugé, pour montrer un vrai verdict.
      target: () => q('.gz-article .verdict:not(.incomplete)') ?? q('.gz-article .verdict'),
      enter: () => hooks.showGazette(),
    }),
    ...maybe(
      data.pages.some((p) => p.hints?.length),
      {
        title: 'Les indices',
        text: 'Bloqué ? Chaque article a quelques indices, révélés un par un, du plus vague au plus précis.',
        target: () => q('.gz-hint-btn'),
        enter: () => hooks.showGazette(),
      },
    ),
    {
      title: 'À vous de jouer',
      text: 'Validez tous les articles de la gazette pour résoudre l\'affaire. Le bouton « ? », en haut à droite, rappelle les règles et permet de revoir ce tutoriel.',
      button: 'Terminer le tutoriel',
    },
  ];

  let index = 0;
  let base = snapshot();
  let timer: number | undefined;
  let scrolledFor = -1;
  let alive = true;
  const layer = h('div', { class: 'guide' });
  document.body.append(layer);

  let frame = 0;
  const onMove = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(position);
  };
  window.addEventListener('resize', onMove);
  document.addEventListener('scroll', onMove, true);

  function go(i: number) {
    clearTimeout(timer);
    timer = undefined;
    if (i >= steps.length) return finish();
    index = Math.max(0, i);
    base = snapshot();
    steps[index].enter?.();
    sync();
  }

  function finish() {
    dispose();
    hooks.end();
  }

  function sync() {
    if (!alive) return;
    const step = steps[index];
    // Une fenêtre (introduction, aide-mémoire, épilogue) est ouverte : on s'efface.
    const blocked = !!document.querySelector('.overlay');
    layer.hidden = blocked;
    if (blocked) return;

    const done = step.done?.(s, base) ?? false;
    if (done && timer === undefined) timer = window.setTimeout(() => go(index + 1), 900);

    const target = step.target?.() ?? null;
    if (target && scrolledFor !== index) {
      scrolledFor = index;
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    const last = index === steps.length - 1;
    layer.replaceChildren(
      h('div', { class: target ? `guide-ring${step.free ? ' free' : ''}` : 'guide-dim' }),
      h(
        'div',
        { class: `guide-bubble${target ? '' : ' center'}`, role: 'dialog', 'aria-label': 'Tutoriel', 'aria-live': 'polite' },
        h(
          'div',
          { class: 'guide-top' },
          h('span', { class: 'guide-count' }, `Tutoriel · ${index + 1} / ${steps.length}`),
          last ? null : h('button', { class: 'guide-skip', onClick: finish }, 'Passer le tutoriel'),
        ),
        h('h3', {}, step.title),
        h('p', { class: 'guide-text' }, step.text),
        step.task ? h('p', { class: `guide-task${done ? ' done' : ''}` }, done ? '✓ Bien joué !' : `→ ${step.task(s)}`) : null,
        h(
          'div',
          { class: 'guide-actions' },
          index > 0 ? h('button', { class: 'btn ghost small', onClick: () => go(index - 1) }, '← Retour') : h('span'),
          step.task && !done
            ? h('button', { class: 'btn ghost small', onClick: () => go(index + 1) }, 'Passer l\'étape')
            : h('button', { class: 'btn primary small', onClick: () => go(index + 1) }, step.button ?? (last ? 'Terminer' : 'Suivant →')),
        ),
      ),
    );
    position();
  }

  /** Place l'anneau sur la cible et la bulle à côté : dessous, à droite, à gauche, puis dessus. */
  function position() {
    if (!alive || layer.hidden) return;
    const ring = layer.querySelector<HTMLElement>('.guide-ring');
    const bubble = layer.querySelector<HTMLElement>('.guide-bubble');
    const target = steps[index].target?.() ?? null;
    if (!ring || !bubble || !target) return;

    const r = target.getBoundingClientRect();
    const pad = 6;
    Object.assign(ring.style, {
      left: `${r.left - pad}px`,
      top: `${r.top - pad}px`,
      width: `${r.width + pad * 2}px`,
      height: `${r.height + pad * 2}px`,
    });

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = pad + 14;
    const m = 12;
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const clampX = (x: number) => Math.min(Math.max(x, m), vw - bw - m);
    const clampY = (y: number) => Math.min(Math.max(y, m), vh - bh - m);
    let x: number;
    let y: number;
    if (r.bottom + gap + bh <= vh - m) {
      x = clampX(r.left + r.width / 2 - bw / 2);
      y = r.bottom + gap;
    } else if (r.right + gap + bw <= vw - m) {
      x = r.right + gap;
      y = clampY(r.top + r.height / 2 - bh / 2);
    } else if (r.left - gap - bw >= m) {
      x = r.left - gap - bw;
      y = clampY(r.top + r.height / 2 - bh / 2);
    } else if (r.top - gap - bh >= m) {
      x = clampX(r.left + r.width / 2 - bw / 2);
      y = r.top - gap - bh;
    } else {
      // Cible immense (la scène entière…) : la bulle se pose dans le coin qui cache le moins de choses.
      ({ x, y } = bestCorner(r, bw, bh, clampX, clampY));
    }
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
  }

  /** Coin de la cible où la bulle cache le moins : surtout pas la fiche ouverte, puis le moins de zones à voir. */
  function bestCorner(r: DOMRect, bw: number, bh: number, clampX: (x: number) => number, clampY: (y: number) => number) {
    const inset = 16;
    const corners = [
      { x: r.right - bw - inset, y: r.bottom - bh - inset },
      { x: r.left + inset, y: r.bottom - bh - inset },
      { x: r.right - bw - inset, y: r.top + inset },
      { x: r.left + inset, y: r.top + inset },
    ].map((c) => ({ x: clampX(c.x), y: clampY(c.y) }));
    const covered = (c: { x: number; y: number }, el: Element) => {
      const b = el.getBoundingClientRect();
      const w = Math.max(0, Math.min(c.x + bw, b.right) - Math.max(c.x, b.left));
      const hh = Math.max(0, Math.min(c.y + bh, b.bottom) - Math.max(c.y, b.top));
      return w * hh;
    };
    const panel = root.querySelector('.zone-panel');
    const zones = [...root.querySelectorAll('.zone')];
    const cost = (c: { x: number; y: number }) =>
      (panel ? 10 * covered(c, panel) : 0) + zones.reduce((n, z) => n + covered(c, z) * (z.classList.contains('seen') ? 0.3 : 1), 0);
    return corners.reduce((best, c) => (cost(c) < cost(best) ? c : best));
  }

  function dispose() {
    if (!alive) return;
    alive = false;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', onMove);
    document.removeEventListener('scroll', onMove, true);
    layer.remove();
  }

  return { sync, reposition: onMove, dispose };
}
