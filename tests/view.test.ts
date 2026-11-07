import { describe, expect, it } from 'vitest';
import { clampView, FULL_VIEW, maxZoom, panBy, viewX, zoomAt } from '../src/engine/view';

describe('cadrage de la scène', () => {
  it('ne descend pas sous la scène entière et ne dépasse pas le zoom maximal', () => {
    expect(clampView({ k: 0.5, x: 0.3, y: -2 }, 3)).toEqual(FULL_VIEW);
    expect(clampView({ k: 9, x: 0, y: 0 }, 3).k).toBe(3);
    expect(maxZoom(1600)).toBe(3);
    expect(maxZoom(3200)).toBe(6);
  });

  it('garde immobile le point visé quand on zoome', () => {
    const v = zoomAt(FULL_VIEW, 2, 0.25, 0.75, 3);
    expect(v.k).toBe(2);
    // le point (0,25 ; 0,75) du cadre montre toujours le même point de la scène
    expect(viewX(v, 0.25)).toBeCloseTo(0.25);
    expect(v.y + v.k * 0.75).toBeCloseTo(0.75);
  });

  it("ne laisse jamais de vide autour de l'image", () => {
    const v = panBy({ k: 2, x: -0.5, y: -0.5 }, 5, -5, 3);
    expect(v).toEqual({ k: 2, x: 0, y: -1 });
    // en dézoomant au bord, l'image reste collée au cadre
    const back = zoomAt({ k: 3, x: -2, y: 0 }, 1 / 3, 0, 0, 3);
    expect(back).toEqual(FULL_VIEW);
  });
});
