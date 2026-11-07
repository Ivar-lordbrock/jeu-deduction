import type { CaseData, SceneImage, Zone } from '../types';

/**
 * Les scènes d'une affaire : la première (champ « scene »), puis les autres
 * (champ « scenes ») : d'autres pièces, ou le même lieu à un autre moment.
 * Chaque zone dit dans quelle scène elle se trouve ; sans rien, la première.
 */

/** Identifiant de la première scène, celle des zones sans champ « scene ». */
export const MAIN_SCENE = '';

/** Titre de la première scène quand l'auteur ne lui en a pas donné. */
export const MAIN_SCENE_TITLE = 'Première scène';

export interface SceneInfo extends SceneImage {
  id: string;
  title: string;
}

type WithScenes = Pick<CaseData, 'scene' | 'scenes'>;

/** Toutes les scènes, dans l'ordre des onglets. */
export function caseScenes(c: WithScenes): SceneInfo[] {
  const { image, width, height } = c.scene;
  return [
    { id: MAIN_SCENE, title: c.scene.title?.trim() || MAIN_SCENE_TITLE, image, width, height },
    ...(Array.isArray(c.scenes) ? c.scenes : []).map((s) => ({ id: s.id, title: s.title, image: s.image, width: s.width, height: s.height })),
  ];
}

export function zoneSceneId(z: Zone): string {
  return z.scene || MAIN_SCENE;
}

/** La scène d'une zone (la première si son champ « scene » ne correspond à rien). */
export function zoneScene(c: WithScenes, z: Zone): SceneInfo {
  const all = caseScenes(c);
  return all.find((s) => s.id === zoneSceneId(z)) ?? all[0];
}

export function sceneById(c: WithScenes, id: string): SceneInfo {
  const all = caseScenes(c);
  return all.find((s) => s.id === id) ?? all[0];
}

export function sceneZones<Z extends Zone>(zones: Z[], sceneId: string): Z[] {
  return zones.filter((z) => zoneSceneId(z) === sceneId);
}
