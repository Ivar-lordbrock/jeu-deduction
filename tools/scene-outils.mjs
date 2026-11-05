// Outils communs aux scènes dessinées (tools/scene-*.mjs) : la perspective de la pièce,
// les silhouettes des personnages (src/assets/silhouettes/persos) et celles d'Openclipart.

import { readFileSync } from 'node:fs';

const PERSOS = new URL('../src/assets/silhouettes/persos/', import.meta.url);
const SILHOUETTES = new URL('../src/assets/silhouettes/', import.meta.url);

export const num = (n) => String(Math.round(n * 10) / 10);
export const pts = (...ps) => ps.map(([x, y]) => `${num(x)},${num(y)}`).join(' ');

// lumière des scènes : le jour dans le brouillard, le gaz
export const TEAL = '#9fbcb7';
export const AMBRE = '#e8b452';

// ——— perspective ———
// Mur du fond : x 260–1340, du plafond (h = 50) au sol (h = 640). Point de fuite F (800, 330).
// Un point d'un mur latéral à l'abscisse x, à la hauteur h « du mur du fond », est en (x, ym(x, h)).
// Un objet parallèle au mur gauche, à la distance d du mur et à la profondeur k (1 = mur du fond), est en (gx, gy).
export const F = { x: 800, y: 330 };
export const kx = (x) => Math.abs(x - F.x) / 540;
export const ym = (x, h) => F.y + (h - F.y) * kx(x);
export const gx = (d, k) => F.x - (540 - d) * k;
export const gy = (h, k) => F.y + (h - F.y) * k;
/** quadrilatère sur un mur latéral : de x1 à x2, de la hauteur h1 à h2 */
export const quadMur = (x1, x2, h1, h2) => pts([x1, ym(x1, h1)], [x2, ym(x2, h1)], [x2, ym(x2, h2)], [x1, ym(x1, h2)]);
/** échelle d'un personnage debout dont les pieds touchent le sol en y */
export const echelle = (y) => (y - F.y) / 470;
/** profondeur (1 = mur du fond) d'un point du sol en y */
export const profondeur = (y) => (y - F.y) / 310;

// ——— silhouettes d'Openclipart (CC0), en <symbol> sans couleur ———
export function symbole(nom, decimales = 2) {
  const src = readFileSync(new URL(`${nom}.svg`, SILHOUETTES), 'utf8');
  const racine = src.match(/<svg\b[^>]*>/)[0];
  const vb = racine.match(/viewBox="([^"]+)"/)[1];
  const arrondi = (s) =>
    s.replace(/-?\d*\.\d+(e-?\d+)?/g, (n) => ' ' + String(+(+n).toFixed(decimales))).replace(/ {2,}/g, ' ').replace(/=" /g, '="').replace(/\( /g, '(');
  let corps = src.slice(src.indexOf(racine) + racine.length, src.lastIndexOf('</svg>'));
  corps = corps
    .replace(/<title[\s\S]*?<\/title\s*>/g, '')
    .replace(/<desc[\s\S]*?<\/desc\s*>/g, '')
    .replace(/<defs\s*\/>/g, '')
    .replace(/\s(id|class|data-[a-z-]+)="[^"]*"/g, '')
    .replace(/\sfill="(?!none)[^"]*"/g, '')
    .replace(/\sstyle="([^"]*)"/g, (_, st) => {
      const garde = st.split(';').map((d) => d.trim()).filter((d) => d && !/^(fill|fill-opacity|opacity|stroke|stroke-width|stroke-opacity)\s*:/.test(d));
      return garde.length ? ` style="${garde.join(';')}"` : '';
    })
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim();
  return `<symbol id="s-${nom}" viewBox="${arrondi(vb)}">${arrondi(corps)}</symbol>`;
}

// ——— personnages : silhouettes de src/assets/silhouettes/persos ———
export const reperes = JSON.parse(readFileSync(new URL('reperes.json', PERSOS), 'utf8'));

/**
 * Les personnages d'une scène. perso() rend le dessin à poser dans la scène ; defs reçoit leurs
 * formes, cadres leurs rectangles (silhouette, tête) dans la scène, pour les zones et les portraits.
 */
export function creerPersos() {
  const defs = [];
  const cadres = {};
  /**
   * Place une silhouette : la hanche en x, le sol en y, à l'échelle s ; miroir = tournée vers la gauche.
   * reflets : [dx, dy, couleur, opacité] (copies décalées derrière le noir) ; ombre : une couleur seule.
   */
  function perso(id, { x, y, s, miroir = false, reflets = [], ombre = null, nom = id }) {
    const svg = readFileSync(new URL(`${id}.svg`, PERSOS), 'utf8');
    const nid = `sc-${nom}`;
    const renomme = (t) => t.replaceAll(`"${id}`, `"${nid}`).replaceAll(`#${id}`, `#${nid}`);
    defs.push(renomme(svg.slice(svg.indexOf('<defs>') + 6, svg.indexOf('</defs>'))));
    let corps = renomme(svg.slice(svg.indexOf('</defs>') + 7, svg.lastIndexOf('</svg>')).trim());
    // un titre de journal se lit toujours à l'endroit
    if (miroir) corps = corps.replace(/<text transform="translate\(([^)]*)\) rotate\(([-\d.]+)\)"/g, (_, t, r) => `<text text-anchor="end" transform="translate(${t}) scale(-1 1) rotate(${num(-r)})"`);
    const T = (dx = 0, dy = 0) => `translate(${num(x + dx)} ${num(y + dy)}) scale(${num(miroir ? -s : s)} ${num(s)})`;
    const r = reperes[id];
    const versScene = ([bx, by, bw, bh]) => {
      const xs = [x + (miroir ? -1 : 1) * s * bx, x + (miroir ? -1 : 1) * s * (bx + bw)];
      return { x: Math.round(Math.min(...xs)), y: Math.round(y + s * by), w: Math.round(s * bw), h: Math.round(s * bh) };
    };
    cadres[nom] = { corps: versScene(r.viewBox), tete: versScene(r.tete) };
    if (ombre) return `<use href="#${nid}" transform="${T()}" fill="${ombre}"/>`;
    const copies = reflets.map(([dx, dy, c, o]) => `<use href="#${nid}" transform="${T(dx, dy)}" fill="${c}" opacity="${o}"/>`).join('');
    return `${copies}<g transform="${T()}">${corps}</g>`;
  }
  return { perso, defs, cadres };
}

/** portrait de la gazette (3:4) autour d'une tête, en coordonnées de scène */
export function portrait(tete) {
  const w = Math.round(Math.max(tete.w, tete.h * 0.8) * 1.25);
  const h = Math.round((w * 4) / 3);
  return { x: Math.round(tete.x + tete.w / 2 - w / 2), y: Math.round(tete.y - 0.07 * h), w, h };
}

/** affiche les rectangles des personnages, à reporter dans case.json */
export function afficherCadres(cadres) {
  for (const [nom, c] of Object.entries(cadres)) {
    console.log(nom.padEnd(13), 'corps', JSON.stringify(c.corps), ' portrait', JSON.stringify(portrait(c.tete)));
  }
}
