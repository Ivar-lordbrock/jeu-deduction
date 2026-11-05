import { h } from '../dom';

/**
 * Assets graphiques du jeu (voir CREDITS.md pour les sources et licences).
 * Les gravures sont celles de Gustave Doré pour « London, a Pilgrimage » (1872), dans le domaine public.
 */
const ENGRAVINGS = import.meta.glob('../assets/engravings/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>;

/** Noms des gravures disponibles (sans extension), pour le champ « image » du prologue. */
export const ENGRAVING_NAMES = Object.keys(ENGRAVINGS).map((p) => p.replace(/^.*\/(.+)\.jpg$/, '$1'));

/** URL d'une gravure par son nom (« bulls-eye »), ou undefined si elle n'existe pas. */
export function engravingUrl(name: string | undefined): string | undefined {
  return name ? ENGRAVINGS[`../assets/engravings/${name}.jpg`] : undefined;
}

/**
 * Cadrage de chaque gravure en plein écran (les planches sont presque toutes en hauteur,
 * l'écran en largeur) : on vise la partie qui raconte quelque chose.
 */
const FOCUS: Record<string, string> = {
  'over-london-by-rail': 'center 35%',
  'bluegate-fields': 'center 55%',
  'dudley-street': 'center 60%',
  'bulls-eye': 'center 62%',
  'wentworth-street': 'center 55%',
  whitechapel: 'center 45%',
};

/** Calque de gravure plein cadre, teinté par le CSS pour se fondre dans le brouillard. */
export function engravingLayer(name: string | undefined, cls: string): HTMLElement | null {
  const url = engravingUrl(name);
  if (!url || !name) return null;
  return h('div', {
    class: `engraving ${cls}`,
    'aria-hidden': 'true',
    style: { backgroundImage: `url("${url}")`, backgroundPosition: FOCUS[name] ?? 'center' },
  });
}

/**
 * Icône en silhouette (game-icons.net), colorée par la couleur du texte.
 * Le dessin vient du CSS : classe .ico-<nom>.
 */
export function icon(name: string): HTMLElement {
  return h('span', { class: `ico ico-${name}`, 'aria-hidden': 'true' });
}

/**
 * Nappes de brouillard qui dérivent (sprites de fumée Kenney).
 * Les écrans sont reconstruits à chaque action : on cale la phase de l'animation sur l'horloge
 * de la page (délai négatif), pour que le brouillard continue sa course au lieu de repartir de zéro.
 */
export function fogLayer(cls = 'fog'): HTMLElement {
  const t = -(performance.now() / 1000);
  return h('div', { class: cls, 'aria-hidden': 'true', style: { '--fog-t': `${t.toFixed(2)}s` } }, h('span'), h('span'), h('span'));
}
