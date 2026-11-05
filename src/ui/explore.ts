import { h } from '../dom';
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

/** La scène figée, ses zones cliquables, et la fiche de la zone ouverte par-dessus. */
export function renderScene(s: Session, a: Actions, sceneImg: HTMLImageElement): HTMLElement {
  const { width, height } = s.data.scene;

  const zones = s.data.zones.map((z) =>
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
  // La fiche s'ouvre du côté opposé à la zone, pour ne pas la cacher.
  const side = zone && zone.rect.x + zone.rect.w / 2 > width / 2 ? 'left' : 'right';

  return h(
    'div',
    { class: 'scene-area' },
    h(
      'div',
      { class: `scene-wrap${s.showZones ? ' show-zones' : ''}` },
      h('div', { class: 'scene', style: { '--ar': String(width / height) } }, sceneImg, fogLayer('scene-fog'), zones),
    ),
    zone ? renderZonePanel(zone, side, s, a) : null,
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
