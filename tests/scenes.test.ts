import { describe, expect, it } from 'vitest';
import { addScene, moveZoneToScene, newSceneId, newZone, removeScene, scaleCase } from '../src/editor/model';
import { checkCase } from '../src/engine/checkCase';
import { caseScenes, MAIN_SCENE, MAIN_SCENE_TITLE, sceneZones, zoneScene } from '../src/engine/scenes';
import type { CaseData } from '../src/types';

/** Une affaire en deux pièces : la boutique (première scène) et l'arrière-boutique. */
function twoRooms(): CaseData {
  return {
    id: 'deux-pieces',
    order: 1,
    title: 'Deux pièces',
    intro: 'Intro',
    epilogue: 'Fin',
    scene: { image: 'scene.svg', width: 1600, height: 900, title: 'La boutique' },
    scenes: [{ id: 'arriere', title: "L'arrière-boutique", image: 'arriere.png', width: 800, height: 600 }],
    words: {
      margot: { label: 'Margot', category: 'person' },
      arsenic: { label: 'arsenic', category: 'object' },
    },
    zones: [
      { id: 'femme', kind: 'person', label: 'Femme', rect: { x: 100, y: 50, w: 200, h: 300 }, text: 'Voici [[margot]].' },
      { id: 'fiole', kind: 'object', label: 'Fiole', scene: 'arriere', rect: { x: 400, y: 100, w: 50, h: 80 }, text: "De l'[[arsenic]]." },
    ],
    pages: [{ id: 'quoi', kind: 'sentences', title: 'Quoi', sentences: ["{margot} a versé de l'{arsenic}."] }],
  };
}

describe('plusieurs scènes par affaire', () => {
  it('liste les scènes dans l\'ordre des onglets, et range chaque zone dans la sienne', () => {
    const c = twoRooms();
    expect(caseScenes(c).map((s) => [s.id, s.title])).toEqual([
      [MAIN_SCENE, 'La boutique'],
      ['arriere', "L'arrière-boutique"],
    ]);
    expect(sceneZones(c.zones, MAIN_SCENE).map((z) => z.id)).toEqual(['femme']);
    expect(sceneZones(c.zones, 'arriere').map((z) => z.id)).toEqual(['fiole']);
    expect(zoneScene(c, c.zones[1]).width).toBe(800);
    delete c.scene.title;
    expect(caseScenes(c)[0].title).toBe(MAIN_SCENE_TITLE);
  });

  it('une affaire à une seule scène ne change pas', () => {
    const c = twoRooms();
    delete c.scenes;
    delete c.zones[1].scene;
    expect(caseScenes(c)).toHaveLength(1);
    expect(checkCase(c).errors).toEqual([]);
  });

  it('les réponses peuvent se trouver dans n\'importe quelle scène', () => {
    expect(checkCase(twoRooms()).errors).toEqual([]);
  });

  it('mesure chaque zone sur l\'image de sa scène', () => {
    const c = twoRooms();
    c.zones[1].rect = { x: 700, y: 100, w: 200, h: 80 }; // dépasse les 800 px de l'arrière-boutique
    expect(checkCase(c).errors.join()).toContain("rect sort de l'image (800×600)");
  });

  it('signale une scène inconnue, un id en double, une scène vide', () => {
    const c = twoRooms();
    c.zones[1].scene = 'cave';
    c.scenes!.push({ id: 'arriere', title: 'Bis', image: 'bis.png', width: 10, height: 10 });
    const report = checkCase(c);
    expect(report.errors.join()).toContain('la scène « cave » n\'existe pas');
    expect(report.errors.join()).toContain('id en double');
    expect(report.warnings.join()).toContain('la scène « arriere » n\'a aucune zone');
  });

  it('dans l\'éditeur : ajouter une scène, y tracer une zone, la déplacer, supprimer la scène', () => {
    const c = twoRooms();
    const id = newSceneId(c);
    expect(id).toBe('scene-3');
    addScene(c, { id, title: 'Scène 3', image: `${id}.png`, width: 400, height: 300 });
    const z = newZone(c, 'object', { x: 10, y: 10, w: 50, h: 50 }, id);
    expect(z.scene).toBe(id);
    expect(newZone(c, 'object', { x: 10, y: 10, w: 50, h: 50 }).scene).toBeUndefined();

    // ranger la grande zone de la boutique dans la petite scène : elle reste dans l'image
    moveZoneToScene(c, 'femme', id);
    expect(c.zones[0].scene).toBe(id);
    expect(c.zones[0].rect).toEqual({ x: 100, y: 0, w: 200, h: 300 });
    moveZoneToScene(c, 'femme', MAIN_SCENE);
    expect(c.zones[0].scene).toBeUndefined();

    // changer l'image d'une scène n'adapte que ses zones
    scaleCase(c, 2, 2, 'arriere');
    expect(c.zones.find((x) => x.id === 'fiole')!.rect).toEqual({ x: 800, y: 200, w: 100, h: 160 });
    expect(c.zones[0].rect).toEqual({ x: 100, y: 0, w: 200, h: 300 });

    removeScene(c, id);
    expect(c.zones.some((x) => x.scene === id)).toBe(false);
    removeScene(c, 'arriere');
    expect(c.scenes).toBeUndefined();
    // la zone tracée dans la scène 3 est partie avec elle ; celle de la boutique reste
    expect(c.zones.map((x) => x.id)).toEqual(['femme', 'objet-2']);
  });
});
