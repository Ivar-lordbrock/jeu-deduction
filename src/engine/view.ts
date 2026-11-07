/**
 * Cadrage de la scène : zoom et déplacement.
 * k est le facteur de zoom (1 = toute la scène visible). x et y sont le décalage
 * de l'image, en fraction de la taille du cadre (0 à 1 - k) : le cadrage reste
 * juste quand la fenêtre change de taille.
 */
export interface SceneView {
  k: number;
  x: number;
  y: number;
}

export const FULL_VIEW: SceneView = { k: 1, x: 0, y: 0 };

/** Zoom maximal : ×3 pour une scène de 1600 px de large, plus pour une scène plus grande. */
export function maxZoom(sceneWidth: number): number {
  return 3 * Math.max(1, sceneWidth / 1600);
}

/** Garde le zoom entre 1 et max, et l'image collée aux bords du cadre (jamais de vide). */
export function clampView(v: SceneView, max: number): SceneView {
  const k = Math.min(Math.max(v.k, 1), max);
  const clamp = (t: number) => Math.min(0, Math.max(1 - k, t));
  return { k, x: clamp(v.x), y: clamp(v.y) };
}

/** Zoome d'un facteur f en gardant immobile le point (px, py) du cadre (en fractions). */
export function zoomAt(v: SceneView, f: number, px: number, py: number, max: number): SceneView {
  const k = Math.min(Math.max(v.k * f, 1), max);
  const cx = (px - v.x) / v.k;
  const cy = (py - v.y) / v.k;
  return clampView({ k, x: px - cx * k, y: py - cy * k }, max);
}

/** Déplace l'image de (du, dv), en fractions du cadre. */
export function panBy(v: SceneView, du: number, dv: number, max: number): SceneView {
  return clampView({ k: v.k, x: v.x + du, y: v.y + dv }, max);
}

/** Position horizontale (fraction du cadre) d'un point de la scène, x en fraction de sa largeur. */
export function viewX(v: SceneView, sceneX: number): number {
  return v.x + v.k * sceneX;
}
