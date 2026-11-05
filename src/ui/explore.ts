import { h } from '../dom';
import type { Zone } from '../types';
import { renderRich } from './richText';
import type { Actions, Session } from './session';

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

const KIND_LABELS: Record<Zone['kind'], string> = {
  person: 'Personnage',
  object: 'Objet',
  document: 'Document',
};

/** Mode Exploration : la scène figée et ses zones cliquables. */
export function renderExplore(s: Session, a: Actions, sceneImg: HTMLImageElement): HTMLElement {
  const { width, height } = s.data.scene;

  const zones = s.data.zones.map((z) =>
    h(
      'button',
      {
        class: [
          'zone',
          `kind-${z.kind}`,
          s.progress.seenZones.includes(z.id) && 'seen',
          s.openZone === z.id && 'open',
        ]
          .filter(Boolean)
          .join(' '),
        style: {
          left: pct(z.rect.x / width),
          top: pct(z.rect.y / height),
          width: pct(z.rect.w / width),
          height: pct(z.rect.h / height),
        },
        'aria-label': z.label,
        onClick: () => a.openZone(z.id),
      },
      h('span', { class: 'zone-label' }, z.label),
    ),
  );

  const zone = s.data.zones.find((z) => z.id === s.openZone);

  return h(
    'div',
    { class: 'explore' },
    h(
      'div',
      { class: `scene-wrap${s.showZones ? ' show-zones' : ''}` },
      h('div', { class: 'scene', style: { '--ar': String(width / height) } }, sceneImg, zones),
    ),
    zone ? renderZonePanel(zone, s, a) : null,
  );
}

function renderZonePanel(zone: Zone, s: Session, a: Actions): HTMLElement {
  return h(
    'aside',
    { class: `zone-panel kind-${zone.kind}`, 'aria-label': zone.label },
    h(
      'header',
      {},
      h('div', {}, h('span', { class: 'zone-kind' }, KIND_LABELS[zone.kind]), h('h2', {}, zone.label)),
      h('button', { class: 'icon-btn', 'aria-label': 'Fermer', onClick: () => a.closeZone() }, '×'),
    ),
    h('div', { class: zone.kind === 'document' ? 'paper' : 'zone-body' }, renderRich(zone.text, s, a)),
    zone.details?.map((d) =>
      h(
        'section',
        { class: 'zone-detail' },
        h('h3', {}, d.label),
        h('div', { class: 'paper' }, renderRich(d.text, s, a)),
      ),
    ),
  );
}
