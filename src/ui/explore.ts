import { h } from '../dom';
import { caseScenes, sceneById, sceneZones } from '../engine/scenes';
import { maxZoom, panBy, viewX, zoomAt, type SceneView } from '../engine/view';
import type { Zone } from '../types';
import { fogLayer } from './art';
import { renderRich } from './richText';
import type { Actions, Session } from './session';

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

const KIND_LABELS: Record<Zone['kind'], string> = {
  person: 'Personnage',
  object: 'Objet',
  document: 'Document',
};

/** Au-delà de ce déplacement (px), un appui devient un glisser et n'ouvre plus la zone. */
const DRAG_THRESHOLD = 6;

/** La scène figée, ses zones cliquables, et la fiche de la zone ouverte par-dessus. */
export function renderScene(s: Session, a: Actions, sceneImg: HTMLImageElement): HTMLElement {
  const { width, height } = sceneById(s.data, s.sceneId);

  const zones = sceneZones(s.data.zones, s.sceneId).map((z) =>
    h(
      'button',
      {
        class: ['zone', `kind-${z.kind}`, s.progress.seenZones.includes(z.id) && 'seen', s.openZone === z.id && 'open']
          .filter(Boolean)
          .join(' '),
        style: {
          left: pct(z.rect.x / width),
          top: pct(z.rect.y / height),
          width: pct(z.rect.w / width),
          height: pct(z.rect.h / height),
        },
        'data-zone': z.id,
        'aria-label': z.label,
        onClick: () => (s.openZone === z.id ? a.closeZone() : a.openZone(z.id)),
      },
      h('span', { class: 'zone-label' }, z.label),
    ),
  );

  const zone = s.data.zones.find((z) => z.id === s.openZone);
  // La fiche s'ouvre du côté opposé à la zone (telle qu'on la voit, zoom compris), pour ne pas la cacher.
  const side = zone && viewX(s.view, (zone.rect.x + zone.rect.w / 2) / width) > 0.5 ? 'left' : 'right';

  const layer = h('div', { class: 'scene-layer' }, sceneImg, fogLayer('scene-fog'), zones);
  const level = h('button', { class: 'zoom-level', title: 'Revoir toute la scène (0)', onClick: () => a.zoom(null) });
  const max = maxZoom(width);
  const frame = h(
    'div',
    { class: 'scene', style: { '--ar': String(width / height) } },
    layer,
    h(
      'div',
      { class: 'scene-zoom', role: 'group', 'aria-label': 'Zoom' },
      h('button', { class: 'zoom-out', 'aria-label': 'Éloigner', title: 'Éloigner (−)', onClick: () => a.zoom(1 / 1.5) }, '−'),
      level,
      h('button', { class: 'zoom-in', 'aria-label': 'Rapprocher', title: 'Rapprocher (+)', onClick: () => a.zoom(1.5) }, '+'),
    ),
  );
  bindZoom(frame, s, max, () => applyView(frame, layer, level, s.view, max));
  applyView(frame, layer, level, s.view, max);

  return h(
    'div',
    { class: 'scene-area' },
    renderSceneTabs(s, a),
    h('div', { class: `scene-wrap${s.showZones ? ' show-zones' : ''}` }, frame),
    zone ? renderZonePanel(zone, side, s, a) : null,
  );
}

/**
 * Onglets des scènes, quand l'affaire en a plusieurs (pièces, moments).
 * Un point signale une scène où l'on n'a encore rien examiné.
 */
function renderSceneTabs(s: Session, a: Actions): HTMLElement | null {
  const scenes = caseScenes(s.data);
  if (scenes.length < 2) return null;
  return h(
    'nav',
    { class: 'scene-tabs', 'aria-label': 'Scènes de l\'affaire' },
    scenes.map((sc, i) => {
      const current = sc.id === s.sceneId;
      const untouched = !sceneZones(s.data.zones, sc.id).some((z) => s.progress.seenZones.includes(z.id));
      return h(
        'button',
        {
          class: ['scene-tab', current && 'current', untouched && 'untouched'].filter(Boolean).join(' '),
          'data-scene': sc.id,
          'aria-current': current ? 'true' : undefined,
          title: untouched ? 'Rien encore examiné ici' : undefined,
          onClick: () => a.showScene(sc.id),
        },
        h('span', { class: 'scene-tab-num' }, String(i + 1)),
        sc.title,
      );
    }),
  );
}

function applyView(frame: HTMLElement, layer: HTMLElement, level: HTMLElement, v: SceneView, max: number) {
  layer.style.transform = `translate(${pct(v.x)}, ${pct(v.y)}) scale(${v.k})`;
  frame.style.setProperty('--k', String(v.k));
  frame.classList.toggle('zoomed', v.k > 1.001);
  level.textContent = `×${v.k.toFixed(1).replace('.0', '').replace('.', ',')}`;
  level.toggleAttribute('disabled', v.k <= 1.001);
  frame.querySelector<HTMLButtonElement>('.zoom-in')?.toggleAttribute('disabled', v.k >= max - 0.001);
  frame.querySelector<HTMLButtonElement>('.zoom-out')?.toggleAttribute('disabled', v.k <= 1.001);
}

/**
 * Molette : zoom autour du pointeur. Glisser (souris ou doigt) : déplacer l'image zoomée.
 * Deux doigts : pincer pour zoomer. Un glisser n'ouvre pas la zone où il a commencé.
 */
function bindZoom(frame: HTMLElement, s: Session, max: number, apply: () => void) {
  const frac = (x: number, y: number): [number, number] => {
    const r = frame.getBoundingClientRect();
    return [(x - r.left) / r.width, (y - r.top) / r.height];
  };

  frame.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      // Pincer sur un pavé tactile arrive comme une molette avec Ctrl, par petits pas.
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
      const f = Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0015));
      s.view = zoomAt(s.view, f, ...frac(e.clientX, e.clientY), max);
      apply();
    },
    { passive: false },
  );

  const pointers = new Map<number, { x: number; y: number }>();
  let last: { cx: number; cy: number; d: number } | null = null;
  let travel = 0;
  let dragging = false;
  let swallowClick = false;

  const gesture = () => {
    const pts = [...pointers.values()];
    const cx = pts.reduce((t, p) => t + p.x, 0) / pts.length;
    const cy = pts.reduce((t, p) => t + p.y, 0) / pts.length;
    const d = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    return { cx, cy, d };
  };

  frame.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('.scene-zoom')) return;
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      // Une souris relâchée hors de la scène n'a pas prévenu : on repart de zéro.
      pointers.clear();
      dragging = false;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last = gesture();
    if (pointers.size === 1) travel = 0;
  });

  frame.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p || !last) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) return release(e);
    p.x = e.clientX;
    p.y = e.clientY;
    const g = gesture();
    travel += Math.hypot(g.cx - last.cx, g.cy - last.cy) + Math.abs(g.d - last.d);
    if (!dragging && (travel > DRAG_THRESHOLD || pointers.size > 1)) {
      dragging = true;
      frame.classList.add('panning');
      // La capture ne commence qu'ici : un simple clic garde sa cible (la zone).
      for (const id of pointers.keys()) frame.setPointerCapture(id);
    }
    if (dragging) {
      const r = frame.getBoundingClientRect();
      let v = panBy(s.view, (g.cx - last.cx) / r.width, (g.cy - last.cy) / r.height, max);
      if (pointers.size > 1 && last.d > 0) v = zoomAt(v, g.d / last.d, ...frac(g.cx, g.cy), max);
      s.view = v;
      apply();
    }
    last = g;
  });

  const release = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    last = pointers.size ? gesture() : null;
    if (pointers.size === 0 && dragging) {
      dragging = false;
      frame.classList.remove('panning');
      swallowClick = true;
      // Si aucun clic ne suit (relâché hors de la scène), on n'en avale pas un plus tard.
      window.setTimeout(() => (swallowClick = false), 0);
    }
  };
  frame.addEventListener('pointerup', release);
  frame.addEventListener('pointercancel', release);
  frame.addEventListener(
    'click',
    (e) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
}

function renderZonePanel(zone: Zone, side: 'left' | 'right', s: Session, a: Actions): HTMLElement {
  return h(
    'aside',
    { class: `zone-panel ${side} kind-${zone.kind}`, 'aria-label': zone.label, 'data-scroll': `zone-${zone.id}` },
    h(
      'header',
      {},
      h('div', {}, h('span', { class: 'zone-kind' }, KIND_LABELS[zone.kind]), h('h2', {}, zone.label)),
      h('button', { class: 'icon-btn', 'aria-label': 'Fermer', title: 'Fermer (Échap)', onClick: () => a.closeZone() }, '×'),
    ),
    h('div', { class: zone.kind === 'document' ? 'paper' : 'zone-body' }, renderRich(zone.text, s, a)),
    zone.details?.map((d) =>
      h('section', { class: 'zone-detail' }, h('h3', {}, d.label), h('div', { class: 'paper' }, renderRich(d.text, s, a))),
    ),
  );
}
