// Scènes de l'affaire 2 : la morgue, au lendemain du double meurtre, en deux salles.
//   · la salle de dépôt (scene.svg) : le corps n° 1 sous son drap, ses effets, sa patère, l'agent à la porte ;
//   · la salle d'autopsie (autopsie.svg) : le corps n° 2, ses effets, le docteur penché sur elle, son journal.
// Même pièce en perspective que le commissariat (tools/scene-outils.mjs), en « silhouettes en couches » :
// carrelage blanc et chaux au fond, une table de dissection par salle, une étiquette au pied du corps.
// Les deux salles se répondent (table au centre, plateau des effets au premier plan à gauche) : le joueur compare.
// Les corps sont traités avec respect : couverts, seuls un visage de profil et les pieds dépassent du drap ;
// les blessures se lisent dans les fiches, jamais dans l'image.
//
// Usage : node tools/scene-morgue.mjs   (après npm run persos si les silhouettes ont changé)
//   → src/cases/02-morgue/scene.svg et autopsie.svg, et les rectangles des zones, à reporter dans case.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AMBRE, F, TEAL, creerPersos, echelle, gx, gy, num, portrait, pts, quadMur, symbole, ym } from './scene-outils.mjs';

const ICI = new URL('./scene-morgue/', import.meta.url);
const DOSSIER = new URL('../src/cases/02-morgue/', import.meta.url);
// planche anatomique au mur : « Anatomical Man Line Art » de GDJ (Openclipart 326032, CC0), en PNG 400 px
const ecorche = readFileSync(new URL('ecorche.png', ICI)).toString('base64');

// ——— silhouettes d'Openclipart (CC0) : pupitre, porte-manteau ———
const SYMBOLES = Object.fromEntries(['pupitre', 'porte-manteau'].map((n) => [n, symbole(n, 1)]));
const vbDe = (nom) => SYMBOLES[nom].match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
/**
 * Pose une silhouette d'Openclipart : le point (ax, ay) du dessin d'origine va en (x, y), à l'échelle sc.
 * plein : rayon (px) qui rebouche les traits d'une gravure pour en faire une silhouette pleine ;
 * traits : couleur des traits de la gravure, redessinés par-dessus en léger relief ;
 * reflet : [dx, dy, couleur, opacité] derrière ; dessus : dessin en plus, dans le repère du dessin d'origine.
 */
function objet(nom, { ax, ay, x, y, sc, couleur = '#0b1211', plein = 0, traits = null, reflet = null, dessus = '' }) {
  const [vx, vy, vw, vh] = vbDe(nom);
  const T = `translate(${num(x)} ${num(y)}) scale(${sc}) translate(${-ax} ${-ay})`;
  const use = (fill, extra = '') => `<use href="#s-${nom}" x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${fill}"${extra}/>`;
  const f = plein ? ` filter="url(#plein${plein})"` : '';
  let s = '';
  if (reflet) s += `<g${f} opacity="${reflet[3]}"><g transform="translate(${reflet[0]} ${reflet[1]}) ${T}">${use(reflet[2])}</g></g>`;
  s += `<g${f}><g transform="${T}">${use(couleur)}</g></g>`;
  if (traits || dessus) s += `<g transform="${T}">${traits ? use(traits, ' opacity="0.5"') : ''}${dessus}</g>`;
  return s;
}

/** un objet parallèle au mur du fond, à la profondeur k, se dessine en coordonnées du mur du fond */
const plan = (k, contenu, attrs = '') => `<g transform="translate(${F.x} ${F.y}) scale(${k}) translate(${-F.x} ${-F.y})"${attrs}>${contenu}</g>`;
/** point (X, h) du mur du fond ramené à la profondeur k */
const P = (X, h, k) => [F.x + (X - F.x) * k, F.y + (h - F.y) * k];
/** rectangle d'un objet de plan k, dans la scène */
const versScene = (k, x, y, w, h) => {
  const [x1, y1] = P(x, y, k);
  return { x: Math.round(x1), y: Math.round(y1), w: Math.round(w * k), h: Math.round(h * k) };
};

// ——— les tables et les corps ———
const HT = 448; // dessus des tables (hauteur « du mur du fond »)
const DRAP = '#93a5a0';

/** profil d'un corps couvert d'un drap, la tête à gauche (dx, hauteur au-dessus de la table) */
const SILHOUETTE_DRAP = (visage) =>
  (visage
    ? 'M 54 0 L 54 -22 C 62 -28 70 -38 76 -42 '
    : 'M -6 0 C -8 -22 6 -40 22 -42 C 30 -44 34 -54 38 -52 C 42 -50 44 -42 50 -38 C 56 -34 62 -34 70 -40 ') +
  'C 90 -58 120 -62 150 -60 C 165 -64 180 -62 190 -56 C 210 -50 230 -52 245 -50 C 265 -44 285 -38 300 -40 C 312 -44 322 -42 332 -36 C 345 -30 352 -28 356 -30 L 358 0 Z';
const PLIS_DRAP = 'M 96 -52 C 104 -36 106 -18 104 0 M 178 -58 C 182 -40 180 -20 184 0 M 246 -48 C 250 -30 248 -14 252 0 M 318 -40 C 322 -24 320 -10 324 0';
/** tête de profil, couchée, le visage vers le plafond ; les cheveux s'étalent sur la table */
const TETE = 'M 8 0 C -2 -4 -4 -20 4 -30 C 8 -36 14 -38 20 -37 C 23 -37 24 -38 25 -41 C 26 -43 28 -44 29 -42 C 30 -40 30 -38 32 -37 C 34 -38 35 -36 36 -35 C 38 -36 41 -35 42 -32 C 44 -27 48 -24 58 -23 L 58 0 Z';
const VISAGE = 'M 12 -37 C 16 -38 20 -37 22 -37 C 24 -38 25 -41 26 -43 C 28 -44 29 -42 29 -41 M 32 -37 C 34 -38 35 -36 36 -35 C 38 -36 41 -35 42 -32 C 44 -28 47 -25 52 -24';
/** le chignon défait, sous la nuque */
const CHEVEUX = 'M 4 -2 C -8 0 -14 -10 -10 -17 C -6 -23 2 -22 4 -15 Z';
/** l'ourlet du drap, rabattu sous les épaules */
const OURLET = 'M 52 0 L 52 -21 C 58 -26 64 -31 70 -35 L 76 -31 C 70 -27 64 -22 61 0 Z';
/** pieds nus qui dépassent du drap, orteils vers le haut */
const PIED = 'M 350 -4 C 350 -20 355 -38 361 -47 C 366 -51 371 -46 370 -38 C 369 -26 367 -12 365 0 Z';

/** tache irrégulière (sang séché qui a traversé le drap), toujours la même pour une même graine */
function tache(cx, cy, r, graine, ex = 1, ey = 1) {
  let g = graine * 9301 + 49297;
  const hasard = () => ((g = (g * 9301 + 49297) % 233280) / 233280);
  const n = 10;
  const ps = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.65 + 0.6 * hasard());
    return [cx + Math.cos(a) * rr * ex, cy + Math.sin(a) * rr * ey];
  });
  const mil = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M ${pts(mil(ps[n - 1], ps[0]))}`;
  for (let i = 0; i < n; i++) d += ` Q ${pts(ps[i])} ${pts(mil(ps[i], ps[(i + 1) % n]))}`;
  return d + ' Z';
}
/** le sang séché qui a bu le drap : une auréole brune et floue, un cœur plus sombre, décentré */
const sang = (cx, cy, r, graine, ex = 1, ey = 1) =>
  `<path d="${tache(cx, cy, r * 1.3, graine, ex, ey)}" fill="#5c261c" opacity="0.3" filter="url(#bord)"/>` +
  `<path d="${tache(cx - r * 0.1, cy, r, graine + 7, ex, ey)}" fill="#531a12" opacity="0.45" filter="url(#bordFin)"/>` +
  `<path d="${tache(cx + r * 0.25 * ex, cy - r * 0.15, r * 0.5, graine + 13, ex, ey)}" fill="#33110c" opacity="0.45" filter="url(#bordFin)"/>`;
/** où le sang a traversé : le cou et le ventre (repère du corps, la tête à gauche) */
const TACHES = {
  1: [[64, -30, 9, 3, 1.2, 1], [192, -32, 14, 5, 1.6, 1], [150, -46, 3.5, 11]],
  2: [[63, -17, 8, 2, 1, 1.4], [188, -34, 13, 8, 1.6, 1], [232, -42, 3.5, 17]],
};

/** la table, le corps sous son drap et l'étiquette au pied ; range ses zones dans « zones » */
function table({ a, b, kf, kb, kc, numero, visage }, zones) {
  const top = (k) => [P(a, HT, k), P(b, HT, k)];
  const [fa, fb] = top(kf);
  const [ba, bb] = top(kb);
  const CHANT = 22; // épaisseur du plateau (bois doublé de zinc)
  const pied = (x) => `<rect x="${x}" y="${HT + CHANT}" width="24" height="${640 - HT - CHANT}"/>`;
  const x0 = a + 22; // la tête
  const etiquette = [x0 + 372, HT - 30];
  const sol = (X, k) => P(X, 640, k);
  /** barre qui relie un pied avant à un pied arrière (vue presque de profil) */
  const traverse = (X, h1, h2) => `<polygon points="${pts(P(X, h1, kb), P(X, h1, kf), P(X, h2, kf), P(X, h2, kb))}"/>`;
  let s = '';
  // l'ombre de la table sur les dalles : c'est elle qui la pose au sol
  s += `<polygon points="${pts(sol(a - 14, kb - 0.02), sol(b + 14, kb - 0.02), sol(b + 14, kf + 0.03), sol(a - 14, kf + 0.03))}" fill="#000" opacity="0.5" filter="url(#flou)"/>`;
  s += [kb, kf].map((k) => [a + 20, b - 44].map((X) => { const [x, y] = sol(X + 12, k); return `<ellipse cx="${num(x)}" cy="${num(y)}" rx="${num(20 * k)}" ry="${num(4 * k)}" fill="#000" opacity="0.6"/>`; }).join('')).join('');
  // pieds du fond, traverses du fond et des côtés
  s += plan(kb, `<g fill="#0d1615">${pied(a + 20)}${pied(b - 44)}<rect x="${a + 20}" y="586" width="${b - a - 40}" height="12"/></g>`);
  s += `<g fill="#0c1413">${traverse(a + 32, 586, 598)}${traverse(b - 32, 586, 598)}</g>`;
  // le plateau : dessus, puis le bout tourné vers le centre de la pièce
  s += `<polygon points="${pts(ba, bb, fb, fa)}" fill="#26312f"/>`;
  if (a > F.x) s += `<polygon points="${pts(P(a, HT, kb), P(a, HT, kf), P(a, HT + CHANT, kf), P(a, HT + CHANT, kb))}" fill="#141d1c"/>`;
  if (b < F.x) s += `<polygon points="${pts(P(b, HT, kb), P(b, HT, kf), P(b, HT + CHANT, kf), P(b, HT + CHANT, kb))}" fill="#141d1c"/>`;
  s += `<path d="M${pts(ba, bb).replace(' ', ' L')}" stroke="#4d625e" stroke-width="1.5" opacity="0.6"/>`;
  // le corps sous le drap
  const corps = [
    visage ? `<path d="${CHEVEUX}" fill="#0b1111"/><path d="${TETE}" fill="#0b1111"/>` : '',
    `<path d="${SILHOUETTE_DRAP(visage)}" fill="url(#drap)"/>`,
    `<path d="${PLIS_DRAP}" fill="none" stroke="#6f817c" stroke-width="2" opacity="0.7"/>`,
    `<path d="${SILHOUETTE_DRAP(visage).replace(/ L 358 0 Z$/, '')}" fill="none" stroke="${AMBRE}" stroke-width="1.6" opacity="0.45"/>`,
    `<path d="${PIED}" fill="#0b1111" transform="translate(5 2)"/><path d="${PIED}" fill="#0b1111"/>`,
    `<path d="M 361 -47 C 366 -51 371 -46 370 -38" fill="none" stroke="${TEAL}" stroke-width="1.4" opacity="0.6"/>`,
    visage ? `<path d="${VISAGE}" fill="none" stroke="${TEAL}" stroke-width="1.3" opacity="0.6"/><path d="${OURLET}" fill="#b9c6bf"/>` : '',
    // le sang qui a traversé le drap, au cou et au ventre (les blessures elles-mêmes restent dans les fiches)
    `<clipPath id="drap-${numero}"><path d="${SILHOUETTE_DRAP(visage)}"/>${visage ? `<path d="${OURLET}"/>` : ''}</clipPath>`,
    `<g clip-path="url(#drap-${numero})">${TACHES[numero].map((t) => sang(...t)).join('')}</g>`,
    // l'étiquette nouée au gros orteil
    `<path d="M 366 -46 C 372 -40 374 -36 ${etiquette[0] - x0 - 4} ${etiquette[1] - HT + 4}" fill="none" stroke="#c9bd98" stroke-width="1.2"/>`,
    `<g transform="translate(${etiquette[0] - x0} ${etiquette[1] - HT}) rotate(18)"><path d="M -4 0 L 18 0 L 22 6 L 18 12 L -4 12 Z" fill="#ddd2b0"/><circle cx="17" cy="6" r="1.6" fill="#5a5040"/><text x="1" y="9" font-family="Georgia, serif" font-size="7" fill="#3a3226">N° ${numero}</text></g>`,
  ].join('');
  s += plan(kc, `<g transform="translate(${x0} ${HT})">${corps}</g>`);
  // chant avant, pieds avant, traverse avant
  s += plan(kf, `<rect x="${a}" y="${HT}" width="${b - a}" height="${CHANT}" fill="#1a2423"/><rect x="${a}" y="${HT + CHANT - 4}" width="${b - a}" height="4" fill="#111a19"/><g fill="#0a1110">${pied(a + 20)}${pied(b - 44)}<rect x="${a + 20}" y="586" width="${b - a - 40}" height="12"/></g>`);
  // le drap retombe par-dessus le bord avant de la table
  const RETOMBE = `M ${a + 8} ${HT} L ${b - 36} ${HT} L ${b - 36} ${HT + 26} C ${b - 70} ${HT + 36} ${b - 110} ${HT + 24} ${b - 150} ${HT + 34} C ${a + 160} ${HT + 40} ${a + 90} ${HT + 26} ${a + 8} ${HT + 36} Z`;
  // sous le ventre, le sang a coulé jusqu'au pan du drap qui retombe
  const xVentre = F.x + (x0 + 192 - F.x) * (kc / kf);
  s += plan(kf, `<path d="${RETOMBE}" fill="#7d8f8a"/><clipPath id="retombe-${numero}"><path d="${RETOMBE}"/></clipPath><g clip-path="url(#retombe-${numero})">${sang(xVentre, HT + 6, 7, numero * 5 + 1, 1.2, 1.6)}</g>`);
  s += plan(kf, `<path d="M ${a} ${HT} H ${b}" stroke="${AMBRE}" stroke-width="1.4" opacity="0.35"/>`);
  // zones : le corps (drap, tête et pieds), l'étiquette, et le portrait de la gazette
  // (le visage pour le corps découvert, les pieds et l'étiquette pour le corps entièrement couvert)
  zones[`corps-${numero}`] = versScene(kc, x0 - 30, HT - 66, 405, 70);
  zones[`etiquette-${numero}`] = versScene(kc, etiquette[0] - 8, etiquette[1] - 6, 36, 28);
  zones[`portrait-${numero}`] = visage ? versScene(kc, x0 - 22, HT - 72, 66, 88) : versScene(kc, x0 + 318, HT - 80, 72, 96);
  return s;
}

/** le neck (cou) d'un corps : là où se penche le docteur, en coordonnées de scène */
const cou = (T) => P(T.a + 22 + 64, HT - 20, T.kc);
/** le bout des pieds d'un corps : là où le joueur tient sa loupe */
const orteils = (T) => P(T.a + 22 + 361, HT - 47, T.kc);

// ——— le plateau des effets, sur un tabouret au premier plan à gauche (le même dans les deux salles) ———
const TAB = { k: 1.74, x1: 360, x2: 520, h: 500, loupe: 1.35 }; // loupe : les effets, grossis pour se lire // en coordonnées du mur du fond, au plan k
function tabouret(effets, numero) {
  const { k, x1, x2, h } = TAB;
  const sol = 640;
  const pied = (x) => `<rect x="${x}" y="${h + 10}" width="9" height="${sol - h - 10}"/>`;
  let s = '';
  s += `<ellipse cx="${num(P((x1 + x2) / 2, sol, k)[0])}" cy="${num(P(0, sol, k)[1])}" rx="${num(80 * k)}" ry="${num(6 * k)}" fill="#000" opacity="0.6" filter="url(#flou)"/>`;
  // le dessus du plateau de zinc, vu d'un peu haut, puis son bord, puis les pieds du tabouret
  const dessus = pts(P(x1 - 4, h, k - 0.05), P(x2 + 4, h, k - 0.05), P(x2 + 6, h, k + 0.03), P(x1 - 6, h, k + 0.03));
  s += plan(k, `<g fill="#070c0c">${pied(x1 + 8)}${pied(x2 - 17)}<rect x="${x1 + 8}" y="${sol - 46}" width="${x2 - x1 - 16}" height="6"/></g><rect x="${x1 - 2}" y="${h + 2}" width="${x2 - x1 + 4}" height="10" fill="#0b1211"/>`);
  // le dessus du plateau, son carton numéroté et les effets : un groupe, que la passe IA recolle tel quel
  const carton = `<g transform="translate(${x1 + 2} ${h + 3}) rotate(-4)"><rect width="20" height="10" fill="#ddd2b0"/><text x="10" y="7.6" font-family="Georgia, serif" font-size="7" text-anchor="middle" fill="#3a3226">N° ${numero}</text></g>`;
  s += `<g id="plateau"><polygon points="${dessus}" fill="#55625f"/>`;
  s += plan(k, `<rect x="${x1 - 6}" y="${h}" width="${x2 - x1 + 12}" height="4" fill="#2c3634"/><path d="M ${x1 - 6} ${h} H ${x2 + 6}" stroke="${TEAL}" stroke-width="1" opacity="0.7"/>${carton}`);
  s += plan(k, `<g transform="translate(440 ${h}) scale(${TAB.loupe}) translate(-440 ${-h})">${effets}</g>`);
  return s + '</g>';
}

/** les effets de l'inconnue : un miroir à main, un pot de fard, trois sous, un ticket de garni jamais poinçonné */
const EFFETS_1 = (() => {
  const h = TAB.h;
  return [
    // le miroir à main, à plat, le manche vers l'avant
    `<path d="M 408 ${h - 1} L 424 ${h + 1}" stroke="#2a2018" stroke-width="3" stroke-linecap="round"/>`,
    `<ellipse cx="400" cy="${h - 3}" rx="13" ry="4.5" fill="#1e1712"/><ellipse cx="400" cy="${h - 3.4}" rx="10.5" ry="3.3" fill="#a9bdb8"/>`,
    `<path d="M 393 ${h - 4.5} Q 399 ${h - 6} 405 ${h - 4.8}" stroke="#eef5f2" stroke-width="1" fill="none" opacity="0.8"/>`,
    // le pot de fard, couvercle ouvert
    `<rect x="432" y="${h - 7}" width="11" height="6" rx="1" fill="#2a1b17"/><ellipse cx="437.5" cy="${h - 7}" rx="5.5" ry="1.8" fill="#8f2f2a"/>`,
    `<ellipse cx="447" cy="${h - 1.5}" rx="5" ry="1.6" fill="#3b2a22"/>`,
    // trois sous de cuivre
    `<ellipse cx="456" cy="${h - 1}" rx="3.4" ry="1.3" fill="#9a6a3a"/><ellipse cx="462" cy="${h}" rx="3.4" ry="1.3" fill="#8a5d33"/><ellipse cx="459" cy="${h - 2.2}" rx="3.4" ry="1.3" fill="#b07a44"/>`,
    // le ticket du garni, appuyé contre le pot
    `<g transform="translate(470 ${h - 14}) rotate(-10)"><rect width="24" height="13" fill="#ddd2b0"/><rect x="1" y="1" width="22" height="11" fill="none" stroke="#6a5d44" stroke-width="0.5"/><text x="12" y="5.4" font-family="Georgia, serif" font-size="3.6" text-anchor="middle" fill="#3a3226">LODGING</text><text x="12" y="10.6" font-family="Georgia, serif" font-size="5.2" text-anchor="middle" fill="#3a3226">4d</text></g>`,
  ].join('');
})();

/** les effets de Margaret Jenkins : un ouvrage commencé, un dé, une pelote d'épingles, des bobines, un ruban à mesurer */
const EFFETS_2 = (() => {
  const h = TAB.h;
  const epingles = [[-5, -9], [-1, -11], [3, -10], [6, -7]]
    .map(([dx, dy]) => `<path d="M ${427 + dx * 0.4} ${h - 6} L ${427 + dx} ${h - 6 + dy * 0.5}" stroke="#c9c9bd" stroke-width="0.6"/><circle cx="${427 + dx}" cy="${h - 6 + dy * 0.5}" r="0.9" fill="#d9d2b0"/>`)
    .join('');
  const bobine = (x) =>
    `<rect x="${x - 4}" y="${h - 9}" width="8" height="9" fill="#141414"/><rect x="${x - 5}" y="${h - 10}" width="10" height="1.6" fill="#a88a5c"/><rect x="${x - 5}" y="${h - 1.6}" width="10" height="1.6" fill="#a88a5c"/><path d="M ${x - 4} ${h - 7} H ${x + 4} M ${x - 4} ${h - 5} H ${x + 4} M ${x - 4} ${h - 3} H ${x + 4}" stroke="#2c2c2c" stroke-width="0.5"/>`;
  return [
    // l'ouvrage plié, l'ourlet faufilé au fil blanc, l'aiguille encore piquée
    `<path d="M 386 ${h} L 390 ${h - 6} L 418 ${h - 7} L 416 ${h} Z" fill="#2f3a4a"/><path d="M 389 ${h - 3} L 415 ${h - 3.6}" stroke="#d8d4c4" stroke-width="0.7" stroke-dasharray="2 1.6"/>`,
    `<path d="M 404 ${h - 7.5} L 414 ${h - 1.5}" stroke="#d8dcd8" stroke-width="0.7"/>`,
    // la pelote d'épingles, rouge
    `<path d="M 419 ${h} C 419 ${h - 8} 435 ${h - 8} 435 ${h} Z" fill="#7a2a2a"/><path d="M 421 ${h - 3} C 424 ${h - 6} 430 ${h - 6} 433 ${h - 3}" stroke="#a04a3a" stroke-width="0.7" fill="none"/>${epingles}`,
    // le dé à coudre en laiton
    `<path d="M 440 ${h} L 441 ${h - 7} C 441 ${h - 9.5} 447 ${h - 9.5} 447 ${h - 7} L 448 ${h} Z" fill="#b5874a"/><path d="M 441.5 ${h - 4} H 447.5 M 441.2 ${h - 2} H 447.8" stroke="#6e4f26" stroke-width="0.5" stroke-dasharray="0.6 0.6"/><path d="M 442 ${h - 7.5} L 442 ${h - 0.5}" stroke="#f0d08a" stroke-width="0.6" opacity="0.8"/>`,
    // deux bobines de fil noir
    bobine(456),
    bobine(467),
    // le ruban à mesurer, roulé, sa langue qui pend par-dessus le bord du plateau
    `<ellipse cx="483" cy="${h - 2}" rx="8" ry="2.6" fill="#c9bb8a"/><ellipse cx="483" cy="${h - 2}" rx="4.5" ry="1.4" fill="none" stroke="#7a6c48" stroke-width="0.6"/>`,
    `<path d="M 489 ${h - 1} C 494 ${h} 497 ${h + 4} 496 ${h + 16} L 492 ${h + 16} C 493 ${h + 6} 491 ${h + 2} 487 ${h}" fill="#c9bb8a"/><path d="M 492.5 ${h + 6} H 495.6 M 492.4 ${h + 9} H 495.8 M 492.3 ${h + 12} H 495.9" stroke="#5a4c32" stroke-width="0.5"/>`,
  ].join('');
})();
/** zone des effets : le plateau et ce qui dépasse au-dessus */
const zoneEffets = () => versScene(TAB.k, TAB.x1 - 10, TAB.h - 30, TAB.x2 - TAB.x1 + 20, 56);

// ——— décor commun aux deux salles ———
const poutres = [420, 610, 800, 990, 1180]
  .map((x) => {
    const loin = (dx) => num(F.x + (x + dx - F.x) * (330 / 280));
    return `<polygon points="${num(x - 10)},50 ${num(x + 10)},50 ${loin(16)},0 ${loin(-16)},0"/>`;
  })
  .join('');

// carrelage blanc jusqu'à hauteur d'homme (h 236), chaux au-dessus
const HC = 236;
const carreaux = () => {
  let d = '';
  for (let h = HC + 17; h < 640; h += 17) d += `M260 ${h} H1340 `;
  let rang = 0;
  for (let h = HC; h < 640; h += 17, rang++) for (let x = 260 + (rang % 2) * 17; x < 1340; x += 34) d += `M${x} ${h} V${Math.min(h + 17, 640)} `;
  for (const x0 of [0, 1340]) {
    for (let h = HC + 17; h < 640; h += 17) d += `M${x0 === 0 ? 0 : 1340} ${num(ym(x0 === 0 ? 0 : 1340, h))} L${x0 === 0 ? 260 : 1600} ${num(ym(x0 === 0 ? 260 : 1600, h))} `;
  }
  return d;
};

const fenetreHaute = (x) => {
  const w = 110;
  const y1 = 76;
  const y2 = 190;
  return `<g>
    <path d="M${x - 8} ${y2 + 8} V${y1 + 20} Q${x + w / 2} ${y1 - 30} ${x + w + 8} ${y1 + 20} V${y2 + 8} Z" fill="#1c2c2a"/>
    <path d="M${x} ${y2} V${y1 + 24} Q${x + w / 2} ${y1 - 18} ${x + w} ${y1 + 24} V${y2} Z" fill="url(#jourVitre)"/>
    <g stroke="#1c2c2a" stroke-width="4">${[1, 2, 3].map((i) => `<path d="M${x + (w * i) / 4} ${y1 + 6} V${y2}"/>`).join('')}<path d="M${x} ${(y1 + y2) / 2 + 10} H${x + w}"/></g>
    <rect x="${x - 12}" y="${y2 + 6}" width="${w + 24}" height="8" fill="#2a3d3a"/>
  </g>`;
};

const dalles = () => {
  let d = '';
  for (let x = 260; x <= 1340; x += 72) d += `M${num(x)} 640 L${num(F.x + (x - F.x) * (570 / 310))} 900 `;
  for (const k of [1.07, 1.17, 1.3, 1.46, 1.65]) {
    const y = F.y + 310 * k;
    d += `M0 ${num(y)} H1600 `;
  }
  return d;
};

// étagères et bocaux sur le mur gauche
const etagere = (h, k1, k2, bocaux) => {
  const planche = `<polygon points="${pts([gx(0, k1), gy(h, k1)], [gx(0, k2), gy(h, k2)], [gx(34, k2), gy(h, k2)], [gx(34, k1), gy(h, k1)])}" fill="#1a2725"/>`;
  const pots = bocaux
    .map(([k, hauteur, large, teinte]) => {
      const x = gx(14, k);
      const y = gy(h, k);
      const w = large * k;
      const hh = hauteur * k;
      return `<rect x="${num(x - w / 2)}" y="${num(y - hh)}" width="${num(w)}" height="${num(hh)}" rx="${num(3 * k)}" fill="${teinte}"/><rect x="${num(x - w / 2 + 2 * k)}" y="${num(y - hh * 0.62)}" width="${num(w - 4 * k)}" height="${num(hh * 0.26)}" fill="#cfc4a4" opacity="0.8"/><rect x="${num(x - w / 2 + w * 0.15)}" y="${num(y - hh - 4 * k)}" width="${num(w * 0.7)}" height="${num(4 * k)}" fill="#0b1211"/>`;
    })
    .join('');
  return planche + pots;
};

/** ombre au sol sous les pieds d'un personnage */
const ombrePieds = ({ x, y, s }, dx = 0) => `<ellipse cx="${num(x + dx * s)}" cy="${num(y)}" rx="${num(80 * s)}" ry="${num(9 * s)}" fill="#000" opacity="0.5" filter="url(#flou)"/>`;

/** lampe à gaz suspendue au-dessus d'une table */
const lampe = (X, k) => {
  const [x, y] = P(X, 300, k);
  return `<path d="M${num(x)} 0 V${num(y - 22)}" stroke="#0b1211" stroke-width="3"/>
  <path d="M${num(x - 34)} ${num(y)} L${num(x + 34)} ${num(y)} L${num(x + 12)} ${num(y - 22)} L${num(x - 12)} ${num(y - 22)} Z" fill="#101a19"/>
  <path d="M${num(x - 34)} ${num(y)} L${num(x + 34)} ${num(y)}" stroke="${AMBRE}" stroke-width="2" opacity="0.8"/>
  <ellipse cx="${num(x)}" cy="${num(y + 3)}" rx="10" ry="4" fill="#fff2c4"/>
  <path d="M${num(x - 34)} ${num(y + 2)} L${num(x - 150)} ${num(y + 220)} L${num(x + 150)} ${num(y + 220)} L${num(x + 34)} ${num(y + 2)} Z" fill="#f0c05a" opacity="0.05"/>
  <circle cx="${num(x)}" cy="${num(y + 20)}" r="260" fill="url(#gaz)"/>`;
};

/** la porte, sur le mur droit (c'est par elle qu'on passe d'une salle à l'autre) */
const porte = () => `
  <polygon points="${quadMur(1380, 1560, 156, 640)}" fill="#0c1514"/>
  <polygon points="${quadMur(1392, 1548, 170, 640)}" fill="#131f1e"/>
  <polygon points="${quadMur(1430, 1510, 210, 300)}" fill="url(#jourVitre)" opacity="0.8"/>
  <g stroke="#0c1514" stroke-width="3">${[1450, 1470, 1490].map((x) => `<path d="M${x} ${num(ym(x, 210))} L${x} ${num(ym(x, 300))}"/>`).join('')}</g>
  <g fill="none" stroke="#0b1413" stroke-width="4"><polygon points="${quadMur(1396, 1544, 420, 520)}"/><polygon points="${quadMur(1396, 1544, 534, 624)}"/></g>
  <circle cx="1538" cy="${num(ym(1538, 430))}" r="7" fill="#c9a24a"/>`;

const DEFS = (defsPersos) => `<defs>
    <linearGradient id="chaux" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f4542"/><stop offset="1" stop-color="#3d5753"/></linearGradient>
    <linearGradient id="carrelage" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c8a85"/><stop offset="0.6" stop-color="#5a7772"/><stop offset="1" stop-color="#46605c"/></linearGradient>
    <linearGradient id="murGauche" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#4f6b67"/><stop offset="1" stop-color="#2a3f3c"/></linearGradient>
    <linearGradient id="murDroit" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a6561"/><stop offset="1" stop-color="#22353a"/></linearGradient>
    <linearGradient id="plafond" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#22312f"/><stop offset="1" stop-color="#0e1716"/></linearGradient>
    <linearGradient id="sol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3634"/><stop offset="1" stop-color="#0b1111"/></linearGradient>
    <linearGradient id="jourVitre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d8d3"/><stop offset="1" stop-color="#90a7a2"/></linearGradient>
    <linearGradient id="drap" x1="0" y1="-64" x2="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b3c0b9"/><stop offset="0.5" stop-color="${DRAP}"/><stop offset="1" stop-color="#6f817c"/></linearGradient>
    <linearGradient id="rayon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7e6e2" stop-opacity="0.13"/><stop offset="1" stop-color="#d7e6e2" stop-opacity="0"/></linearGradient>
    <linearGradient id="brumeSol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa9a5" stop-opacity="0"/><stop offset="1" stop-color="#8fa9a5" stop-opacity="0.16"/></linearGradient>
    <linearGradient id="velours" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2430"/><stop offset="0.45" stop-color="#0d0b10"/><stop offset="1" stop-color="#050406"/></linearGradient>
    <radialGradient id="gaz"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.32"/><stop offset="0.45" stop-color="#f0b45a" stop-opacity="0.1"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/></radialGradient>
    <radialGradient id="flaque"><stop offset="0" stop-color="#e8b45a" stop-opacity="0.2"/><stop offset="1" stop-color="#e8b45a" stop-opacity="0"/></radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.8"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.74"/></radialGradient>
    <filter id="taches" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.011" numOctaves="3" seed="23"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.07  0 0 0 0 0.12  0 0 0 0 0.11  0 0 0 -2.4 1.32"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.8  0 0 0 0.5 -0.18"/>
    </filter>
    <filter id="flou" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="bord" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="bordFin" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.7"/></filter>
    <filter id="plein2" x="-5%" y="-5%" width="110%" height="110%"><feMorphology operator="dilate" radius="2"/><feMorphology operator="erode" radius="2"/></filter>
    <filter id="plein3" x="-5%" y="-5%" width="110%" height="110%"><feMorphology operator="dilate" radius="3"/><feMorphology operator="erode" radius="3"/></filter>
    <filter id="encre" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.14  0 0 0 0 0.11  0 0 0 0.85 0"/></filter>
    <clipPath id="pagesPupitre"><polygon points="961,416 1089,461 1235,497 1178,716 1015,701 853,653"/></clipPath>
    ${Object.values(SYMBOLES).join('\n    ')}
    <clipPath id="murs"><polygon points="0,${num(ym(0, 50))} 260,50 1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640 260,640 0,${num(ym(0, 640))}"/></clipPath>
    <clipPath id="solClip"><polygon points="0,${num(ym(0, 640))} 260,640 1340,640 1600,${num(ym(1600, 640))} 1600,900 0,900"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>`;

/** la pièce nue : plafond, murs carrelés, fenêtres hautes et leurs rayons, sol de dalles */
const piece = (flaques) => `
  <polygon points="163.6,0 260,50 1340,50 1436.4,0" fill="url(#plafond)"/>
  <g fill="#0f1918">${poutres}</g>
  <rect x="260" y="50" width="1080" height="${HC - 50}" fill="url(#chaux)"/>
  <rect x="260" y="${HC}" width="1080" height="${640 - HC}" fill="url(#carrelage)"/>
  <polygon points="0,${num(ym(0, 50))} 260,50 260,640 0,${num(ym(0, 640))}" fill="url(#murGauche)"/>
  <polygon points="1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640" fill="url(#murDroit)"/>
  <polygon points="${quadMur(0, 260, 50, HC)}" fill="#223633" opacity="0.5"/>
  <polygon points="${quadMur(1340, 1600, 50, HC)}" fill="#1b2b29" opacity="0.5"/>
  <g clip-path="url(#murs)">
    <path d="${carreaux()}" stroke="#3f5754" stroke-width="1.2" opacity="0.55"/>
    <rect width="1600" height="640" filter="url(#taches)" opacity="0.5"/>
    <rect width="1600" height="640" filter="url(#grain)" opacity="0.3"/>
  </g>
  <rect x="260" y="${HC - 8}" width="1080" height="10" fill="#2b4240"/>
  <polygon points="${quadMur(0, 260, HC - 8, HC + 2)}" fill="#2b4240"/><polygon points="${quadMur(1340, 1600, HC - 8, HC + 2)}" fill="#2b4240"/>
  <rect x="260" y="50" width="1080" height="12" fill="#1f3331"/>
  <path d="M261 62 V640" stroke="#1a2b29" stroke-width="6" opacity="0.6"/>
  <path d="M1339 62 V640" stroke="#4b6763" stroke-width="2" opacity="0.35"/>
  ${[330, 745, 1160].map(fenetreHaute).join('\n  ')}
  <g fill="url(#rayon)">
    <polygon points="330,196 440,196 560,640 380,640"/><polygon points="745,196 855,196 980,640 800,640"/><polygon points="1160,196 1270,196 1400,640 1220,640"/>
  </g>
  ${porte()}
  <g clip-path="url(#solClip)">
    <rect y="500" width="1600" height="400" fill="url(#sol)"/>
    <path d="${dalles()}" stroke="#0a1110" stroke-width="2" opacity="0.7"/>
    ${flaques.map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#flaque)"/>`).join('')}
  </g>
  <path d="M0 ${num(ym(0, 640))} L260 640 H1340 L1600 ${num(ym(1600, 640))}" fill="none" stroke="#4b6763" stroke-width="1.2" opacity="0.35"/>`;

const finition = `
  <rect x="0" y="0" width="1600" height="20" fill="#060b0b"/>
  <path d="M0 20 H1600" stroke="#1d2e2c" stroke-width="2"/>
  <rect y="600" width="1600" height="300" fill="url(#brumeSol)"/>
  <rect width="1600" height="900" fill="url(#vignette)"/>`;

const enTete = (titre) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- ${titre}. Généré par tools/scene-morgue.mjs : ne pas modifier à la main.
       Décor dessiné pour le jeu, en perspective ; personnages : src/assets/silhouettes/persos (dessinés pour le jeu).
       Les zones de case.json suivent les positions données par le script. -->`;

// Profondeurs : le mur du fond est en k = 1, le bas de l'image vers k = 1,84. Rien ne doit passer derrière k = 1.

// ═══════════ Salle 1 : la salle de dépôt ═══════════
function salleDepot() {
  const { perso, defs, cadres } = creerPersos();
  const zones = {};
  const T1 = { a: 440, b: 850, kf: 1.62, kb: 1.42, kc: 1.52, numero: 1, visage: false };
  // le joueur, derrière la table, la loupe au-dessus des pieds
  const kJ = 1.3;
  const sJ = echelle(F.y + 310 * kJ);
  const joueur = { x: orteils(T1)[0] - sJ * 218.8, y: F.y + 310 * kJ, s: sJ };
  // l'agent, devant la porte
  const kA = 1.3;
  const agent = { x: 1440, y: F.y + 310 * kA, s: echelle(F.y + 310 * kA) };

  // la patère du mur du fond : le châle de laine reprisé, le bonnet de velours neuf ; au pied, les bottines percées
  const patere = `<g id="patere">
  <rect x="1078" y="246" width="196" height="12" fill="#1c2422"/><rect x="1078" y="257" width="196" height="2" fill="#0b1110"/>
  ${[1112, 1176, 1240].map((x) => `<path d="M ${x} 252 v 10 q 0 5 6 6" stroke="#0a0f0f" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('')}
  <!-- le châle, plié en pointe sur la première patère, la frange en bas -->
  <path d="M 1100 264 C 1108 262 1122 262 1130 266 C 1136 300 1142 340 1146 372 L 1116 404 L 1090 370 C 1092 336 1096 298 1100 264 Z" fill="#3e2420"/>
  <path d="M 1104 280 C 1108 320 1112 350 1116 396 M 1124 278 C 1126 316 1130 348 1134 384" stroke="#2a1714" stroke-width="2" fill="none"/>
  <path d="M 1098 300 L 1138 298 M 1095 336 L 1142 334" stroke="#5a3a2c" stroke-width="1.4" opacity="0.8" stroke-dasharray="4 3"/>
  <path d="${Array.from({ length: 11 }, (_, i) => { const t = i / 10; const x = 1090 + t * 56; const y = t < 0.46 ? 370 + t * 74 : 404 - (t - 0.46) * 63; return `M ${num(x)} ${num(y)} l ${num((t - 0.5) * 3)} 9`; }).join(' ')}" stroke="#4a2b24" stroke-width="1.3"/>
  <path d="M 1130 266 C 1136 300 1142 340 1146 372" stroke="${AMBRE}" stroke-width="1.2" opacity="0.4" fill="none"/>
  <!-- le bonnet de velours noir, tout neuf, pendu à la patère par ses rubans noués -->
  <path d="M 1246 268 C 1238 282 1228 300 1224 318 M 1246 268 C 1254 282 1264 300 1268 318" stroke="#2a2030" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M 1245 268 c -3 6 -1 12 -4 18 M 1247 268 c 3 6 2 11 5 16" stroke="#2a2030" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="1246" cy="268" r="2.6" fill="#2a2030"/>
  <g transform="translate(0 26)">
    <path d="M 1222 290 C 1218 272 1228 258 1246 258 C 1264 258 1272 272 1268 292 C 1262 300 1230 300 1222 290 Z" fill="url(#velours)"/>
    <path d="M 1218 292 C 1230 304 1262 304 1272 292 C 1270 298 1262 306 1246 306 C 1230 306 1222 300 1218 292 Z" fill="#0a080c"/>
    <path d="M 1226 270 C 1232 262 1242 260 1250 261" stroke="#6d6478" stroke-width="2" fill="none" opacity="0.8"/>
    <circle cx="1262" cy="272" r="5" fill="#6b2f45"/><circle cx="1258" cy="268" r="3" fill="#8a4a5e"/><path d="M 1255 276 l -6 4 M 1266 277 l 4 5" stroke="#2a3a2a" stroke-width="1.6"/>
    <path d="M 1268 292 C 1270 280 1268 268 1262 262" stroke="${AMBRE}" stroke-width="1.2" opacity="0.5" fill="none"/>
  </g>
  <!-- les bottines, l'une debout, l'autre couchée, la semelle percée -->
  ${plan(1.08, `<g transform="translate(1190 640) scale(1.3) translate(-1190 -640)">
    <path d="M 1150 640 L 1150 612 C 1150 606 1160 604 1164 608 L 1166 626 C 1176 628 1186 632 1188 640 Z" fill="#0e0d0c"/>
    <path d="M 1152 614 L 1162 612 M 1152 620 L 1162 618 M 1152 626 L 1163 624" stroke="#2c2620" stroke-width="1.2"/>
    <path d="M 1196 640 C 1196 632 1206 628 1222 630 L 1236 626 C 1240 626 1242 630 1240 634 L 1236 640 Z" fill="#141210"/>
    <path d="M 1194 642 C 1206 646 1228 646 1240 638" stroke="#4a4036" stroke-width="3" fill="none"/>
    <ellipse cx="1214" cy="643.4" rx="4" ry="1.4" fill="#8a7a62"/>
    <path d="M 1150 612 C 1150 606 1160 604 1164 608" stroke="${AMBRE}" stroke-width="1" opacity="0.5" fill="none"/></g>`)}</g>`;
  const zonePatere = { x: 1080, y: 248, w: 215, h: 425 };

  // le banc des familles, contre le mur gauche, où l'on vient reconnaître les morts
  const BANC = [1.1, 1.36];
  const banc = `
  <polygon points="${pts([gx(0, BANC[0]), gy(500, BANC[0])], [gx(0, BANC[1]), gy(500, BANC[1])], [gx(52, BANC[1]), gy(500, BANC[1])], [gx(52, BANC[0]), gy(500, BANC[0])])}" fill="#22302d"/>
  <polygon points="${pts([gx(52, BANC[0]), gy(500, BANC[0])], [gx(52, BANC[1]), gy(500, BANC[1])], [gx(52, BANC[1]), gy(512, BANC[1])], [gx(52, BANC[0]), gy(512, BANC[0])])}" fill="#121b1a"/>
  ${[BANC[0] + 0.03, BANC[1] - 0.03].map((k) => `<polygon points="${pts([gx(44, k), gy(512, k)], [gx(50, k), gy(512, k)], [gx(50, k), gy(640, k)], [gx(44, k), gy(640, k)])}" fill="#0b1211"/>`).join('')}
  <path d="M${num(gx(52, BANC[0]))} ${num(gy(500, BANC[0]))} L${num(gx(52, BANC[1]))} ${num(gy(500, BANC[1]))}" stroke="${TEAL}" stroke-width="1.4" opacity="0.5"/>`;

  const personnages = {
    joueur: perso('joueur-loupe', { ...joueur, reflets: [[-2.5, -2, TEAL, 0.5], [2.5, -2.5, AMBRE, 0.65]], nom: 'joueur' }),
    agent: perso('agent-debout', { ...agent, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.5], [2.5, -2, TEAL, 0.55]], nom: 'davis' }),
  };
  const corpsDessin = table(T1, zones);
  const svg = `${enTete('La morgue, la salle de dépôt : le corps n° 1')}
  ${DEFS(defs)}
  ${piece([[600, 790, 360, 80]])}
  <!-- écriteau peint au-dessus de la porte -->
  <g transform="translate(1470 ${num(ym(1470, 118))}) skewY(-11)" font-family="Georgia, serif" text-anchor="middle">
    <rect x="-70" y="-17" width="140" height="26" fill="#1a2725"/>
    <text font-size="15" letter-spacing="3" fill="#c9c3a8" opacity="0.85">MORTUARY</text>
  </g>
  ${banc}
  ${patere}
  ${ombrePieds(joueur, 20)}
  ${personnages.joueur}
  ${corpsDessin}
  <ellipse cx="${num(agent.x - 10)}" cy="${num(agent.y)}" rx="60" ry="7" fill="#000" opacity="0.5"/>
  ${personnages.agent}
  ${tabouret(EFFETS_1, 1)}
  ${lampe((T1.a + T1.b) / 2 - 70, T1.kc)}
  ${finition}
</svg>
`;
  zones['effets-1'] = zoneEffets();
  zones['patere-1'] = zonePatere;
  return { svg, zones, cadres };
}

// ═══════════ Salle 2 : la salle d'autopsie ═══════════
function salleAutopsie() {
  const { perso, defs, cadres } = creerPersos();
  const zones = {};
  const T2 = { a: 470, b: 880, kf: 1.58, kb: 1.38, kc: 1.48, numero: 2, visage: true };
  // le docteur, derrière la table, penché sur le cou, la sonde au-dessus de la gorge
  const kD = 1.3;
  const sD = echelle(F.y + 310 * kD);
  const docteur = { x: cou(T2)[0] + sD * 252.9, y: F.y + 310 * kD, s: sD };
  // le pupitre du docteur et son journal, à droite de la table
  const PU = (() => { const k = 1.3, sc = (1.0 * 200 * k) / 1377; return { x: 1030 + (1182 - 696) * sc, y: F.y + 310 * k, sc }; })();
  // le porte-manteau près de la porte, au premier plan, coupé par le cadre
  const PM = (() => { const k = 1.45, y = F.y + 310 * k, sc = (1.8 * 200 * k) / 580; return { x: 1572, y, sc, haut: y - 580 * sc, f: k / 1.04 }; })();
  const REDINGOTE = (() => {
    const x = PM.x, y = PM.haut + 60 * PM.f;
    const p = (dx, dy) => `${num(x + dx * PM.f)} ${num(y + dy * PM.f)}`;
    return `M ${p(0, -4)} C ${p(10, -4)} ${p(22, 0)} ${p(28, 12)} C ${p(34, 26)} ${p(34, 50)} ${p(32, 90)} C ${p(30, 150)} ${p(34, 200)} ${p(40, 246)} L ${p(18, 240)} L ${p(2, 250)} L ${p(-16, 240)} L ${p(-38, 246)} C ${p(-32, 200)} ${p(-28, 150)} ${p(-30, 90)} C ${p(-32, 50)} ${p(-32, 26)} ${p(-26, 12)} C ${p(-20, 0)} ${p(-10, -4)} ${p(0, -4)} Z`;
  })();
  const EV = [1.08, 1.32, 1.12]; // l'évier sur le mur gauche : de k, à k, le robinet

  const personnages = {
    docteur: perso('docteur-examine', { ...docteur, miroir: true, reflets: [[2.5, -2, TEAL, 0.5], [-2.5, -2.5, AMBRE, 0.7]], nom: 'jefferson' }),
  };
  const corpsDessin = table(T2, zones);
  const svg = `${enTete('La morgue, la salle d\'autopsie : le corps n° 2')}
  ${DEFS(defs)}
  ${piece([[640, 770, 340, 80]])}
  <!-- planche anatomique punaisée au mur du fond, entre les deux premières fenêtres -->
  <g transform="rotate(-1.5 596 154)">
    <rect x="556" y="88" width="80" height="132" fill="#8d8a72"/>
    <rect x="556" y="88" width="80" height="132" fill="none" stroke="#3a3a2e" stroke-width="1.5"/>
    <image href="data:image/png;base64,${ecorche}" x="565" y="96" width="62" height="112" filter="url(#encre)"/>
    <text x="596" y="216" font-family="Georgia, serif" font-size="6.5" letter-spacing="1" fill="#2a2a22" text-anchor="middle">TAB. VII</text>
    <circle cx="560" cy="92" r="2" fill="#5b2a22"/><circle cx="632" cy="92" r="2" fill="#5b2a22"/>
  </g>
  <rect x="556" y="88" width="80" height="132" fill="#0e1a19" opacity="0.28" transform="rotate(-1.5 596 154)"/>
  <!-- mur gauche : étagères de bocaux, évier de pierre et robinet de cuivre -->
  ${etagere(300, 1.18, 1.52, [[1.22, 40, 22, '#203a35'], [1.3, 52, 26, '#3a3424'], [1.38, 36, 20, '#1d302d'], [1.46, 46, 24, '#2e2a1e']])}
  ${etagere(380, 1.18, 1.52, [[1.24, 34, 30, '#2a2620'], [1.34, 44, 22, '#1c2f2b'], [1.44, 30, 34, '#232c2a']])}
  <polygon points="${pts([gx(0, EV[0]), gy(440, EV[0])], [gx(0, EV[1]), gy(440, EV[1])], [gx(48, EV[1]), gy(440, EV[1])], [gx(48, EV[0]), gy(440, EV[0])])}" fill="#596b67"/>
  <polygon points="${pts([gx(48, EV[0]), gy(440, EV[0])], [gx(48, EV[1]), gy(440, EV[1])], [gx(48, EV[1]), gy(476, EV[1])], [gx(48, EV[0]), gy(476, EV[0])])}" fill="#3a4a47"/>
  <polygon points="${pts([gx(8, EV[0] + 0.04), gy(442, EV[0] + 0.04)], [gx(8, EV[1] - 0.04), gy(442, EV[1] - 0.04)], [gx(40, EV[1] - 0.04), gy(442, EV[1] - 0.04)], [gx(40, EV[0] + 0.04), gy(442, EV[0] + 0.04)])}" fill="#1c2726"/>
  <polygon points="${pts([gx(14, EV[0] + 0.04), gy(476, EV[0] + 0.04)], [gx(14, EV[1] - 0.04), gy(476, EV[1] - 0.04)], [gx(40, EV[1] - 0.04), gy(476, EV[1] - 0.04)], [gx(40, EV[0] + 0.04), gy(476, EV[0] + 0.04)], [gx(40, EV[0] + 0.04), gy(640, EV[0] + 0.04)], [gx(40, EV[1] - 0.04), gy(640, EV[1] - 0.04)], [gx(14, EV[1] - 0.04), gy(640, EV[1] - 0.04)])}" fill="#16211f"/>
  <polyline points="${pts([gx(0, EV[2]), gy(402, EV[2])], [gx(26, EV[2]), gy(402, EV[2])], [gx(28, EV[2]), gy(416, EV[2])])}" fill="none" stroke="#b5874a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M${num(gx(10, EV[2]))} ${num(gy(392, EV[2]))} V${num(gy(402, EV[2]))} M${num(gx(5, EV[2]))} ${num(gy(392, EV[2]))} H${num(gx(15, EV[2]))}" stroke="#b5874a" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M${num(gx(48, EV[0]))} ${num(gy(440, EV[0]))} L${num(gx(48, EV[1]))} ${num(gy(440, EV[1]))}" stroke="${TEAL}" stroke-width="1.5" opacity="0.5"/>
  <!-- la grille d'évacuation, sous la table -->
  <g transform="translate(700 812)"><ellipse rx="34" ry="9" fill="#050909"/><path d="M -24 0 H 24 M -16 -5 L -16 5 M 0 -7 L 0 7 M 16 -5 L 16 5" stroke="#1c2826" stroke-width="2"/></g>
  <!-- le pupitre et le journal du docteur -->
  <ellipse cx="${num(PU.x)}" cy="${num(PU.y)}" rx="64" ry="7" fill="#000" opacity="0.55" filter="url(#flou)"/>
  ${objet('pupitre', { ax: 1182, ay: 1584, x: PU.x, y: PU.y, sc: PU.sc, couleur: '#0d1615', plein: 3, traits: '#33473f', reflet: [-2, -1.5, AMBRE, 0.35],
    dessus: `<polygon points="961,416 1089,461 1235,497 1178,716 1015,701 853,653" fill="#c8bf9f"/><g clip-path="url(#pagesPupitre)"><use href="#s-pupitre" x="${vbDe('pupitre')[0]}" y="${vbDe('pupitre')[1]}" width="${vbDe('pupitre')[2]}" height="${vbDe('pupitre')[3]}" fill="#3a3226"/></g><polygon points="961,416 1089,461 1235,497 1178,716 1015,701 853,653" fill="#0e1a19" opacity="0.18"/>` })}
  ${ombrePieds(docteur, -20)}
  ${personnages.docteur}
  ${corpsDessin}
  <!-- le porte-manteau, la redingote et le haut-de-forme du docteur -->
  <ellipse cx="${PM.x}" cy="${num(PM.y)}" rx="${num(62 * PM.f)}" ry="${num(7 * PM.f)}" fill="#000" opacity="0.5" filter="url(#flou)"/>
  ${objet('porte-manteau', { ax: 94, ay: 580, x: PM.x, y: PM.y, sc: PM.sc, couleur: '#0b1211', reflet: [-3, -1.5, AMBRE, 0.75] })}
  <path d="${REDINGOTE}" fill="#0e1716"/>
  <path d="${REDINGOTE.split(' L ')[0]}" fill="none" stroke="${AMBRE}" stroke-width="2" opacity="0.6" transform="translate(-1 0)"/>
  <path d="M ${PM.x} ${num(PM.haut + 56 * PM.f)} V ${num(PM.haut + 150 * PM.f)}" stroke="#1d2b29" stroke-width="3"/>
  <g transform="translate(${PM.x} ${num(PM.haut + 4 * PM.f)}) scale(${num(PM.f * 100) / 100})"><path d="M -14 0 L -12 -32 C -12 -36 12 -36 12 -32 L 14 0 Z" fill="#0b1211"/><path d="M -23 0 C -23 4 23 4 23 0 C 23 -3 -23 -3 -23 0 Z" fill="#0b1211"/><path d="M -13 -8 H 13" stroke="#2a3d3a" stroke-width="2.5"/><path d="M -12 -32 L -14 0" stroke="${AMBRE}" stroke-width="1" opacity="0.45"/></g>
  ${tabouret(EFFETS_2, 2)}
  ${lampe(T2.a + 300, T2.kc)}
  ${finition}
</svg>
`;
  // le journal ouvert sur le pupitre : les pages du dessin d'origine, ramenées dans la scène
  const coins = [[961, 416], [1089, 461], [1235, 497], [1178, 716], [1015, 701], [853, 653]].map(([X, Y]) => [PU.x + (X - 1182) * PU.sc, PU.y + (Y - 1584) * PU.sc]);
  const xs = coins.map((c) => c[0]), ys = coins.map((c) => c[1]);
  const m = 8;
  zones.journal = { x: Math.round(Math.min(...xs) - m), y: Math.round(Math.min(...ys) - m), w: Math.round(Math.max(...xs) - Math.min(...xs) + 2 * m), h: Math.round(Math.max(...ys) - Math.min(...ys) + 2 * m) };
  zones['effets-2'] = zoneEffets();
  return { svg, zones, cadres };
}

mkdirSync(DOSSIER, { recursive: true });
for (const [fichier, salle] of [['scene.svg', salleDepot()], ['autopsie.svg', salleAutopsie()]]) {
  if (/href="(?!#|data:image\/)/.test(salle.svg)) throw new Error('la scène doit rester autonome');
  writeFileSync(new URL(fichier, DOSSIER), salle.svg);
  console.log(`\n${fichier} : ${(salle.svg.length / 1024).toFixed(0)} Ko`);
  for (const [nom, c] of Object.entries(salle.cadres)) console.log(nom.padEnd(13), 'corps', JSON.stringify(c.corps), ' portrait', JSON.stringify(portrait(c.tete)));
  for (const [id, z] of Object.entries(salle.zones)) console.log(id.padEnd(13), JSON.stringify(z));
}
