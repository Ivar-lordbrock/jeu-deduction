// Scène de l'affaire 3 (brouillon) : King's Row, le matin du jeudi 4 octobre 1888.
// La boutique du marchand de fruits Matthew Pickett, et à côté, le portail de la cour où l'inconnue
// a été retrouvée dimanche. Pickett brandit le journal ; le sergent Wade relit son carnet ; le
// détective Grant vient chercher le marchand pour la morgue.
// Même perspective que les autres scènes (tools/scene-outils.mjs) : la façade est le « mur du fond »
// (k = 1), le trottoir le sol ; à gauche, la rue s'enfonce dans le brouillard.
//
// Usage : node tools/scene-fruiterie.mjs   (après npm run persos si les silhouettes ont changé)
//   → src/cases/03-fruiterie/scene.svg et les rectangles des zones, à reporter dans case.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { AMBRE, F, TEAL, afficherCadres, creerPersos, echelle, num, pts, symbole } from './scene-outils.mjs';

const DOSSIER = new URL('../src/cases/03-fruiterie/', import.meta.url);

// ——— silhouettes d'Openclipart (CC0) : réverbère, passants ———
const SYMBOLES = Object.fromEntries(['reverbere', 'monsieur-3', 'gentleman'].map((n) => [n, symbole(n, 1)]));
const vbDe = (nom) => SYMBOLES[nom].match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
/** Pose une silhouette d'Openclipart : le point (ax, ay) du dessin va en (x, y), à l'échelle sc. */
function objet(nom, { ax, ay, x, y, sc, couleur = '#0b1211', opacite = 1 }) {
  const [vx, vy, vw, vh] = vbDe(nom);
  const T = `translate(${num(x)} ${num(y)}) scale(${sc}) translate(${-ax} ${-ay})`;
  return `<g transform="${T}" opacity="${opacite}"><use href="#s-${nom}" x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${couleur}"/></g>`;
}

const { perso, defs: defsPersos, cadres } = creerPersos();
const zones = {};
/** point (X, h) de la façade ramené à la profondeur k */
const P = (X, h, k) => [F.x + (X - F.x) * k, F.y + (h - F.y) * k];
const SOL = (k) => F.y + 310 * k;

// ——— la façade (k = 1) : 1 m = 200 px ———
const X0 = 380; // angle de la maison ; à gauche, la rue
const SOCLE = 540; // haut du soubassement
const fenetre = (x1, x2, y1, y2, allumee = false) => {
  const w = x2 - x1;
  return `<g>
    <rect x="${x1 - 14}" y="${y1 - 22}" width="${w + 28}" height="18" fill="#1b2422"/>
    <rect x="${x1 - 10}" y="${y2}" width="${w + 20}" height="12" fill="#3a4846"/>
    <rect x="${x1}" y="${y1}" width="${w}" height="${y2 - y1}" fill="${allumee ? 'url(#vitreAllumee)' : 'url(#vitre)'}"/>
    <g stroke="#141c1b" stroke-width="6"><path d="M${x1 + w / 2} ${y1} V${y2}"/><path d="M${x1} ${(y1 + y2) / 2} H${x2}"/></g>
    <rect x="${x1}" y="${y1}" width="${w}" height="${y2 - y1}" fill="none" stroke="#0f1615" stroke-width="5"/>
    ${allumee ? '' : `<path d="M${x1 + 8} ${y1 + 10} L${x1 + w / 2 - 10} ${y1 + 10} L${x1 + 14} ${y1 + 60} Z" fill="#cfe0dc" opacity="0.12"/>`}
  </g>`;
};

/** briques : rangs de 15 px, joints décalés */
const briques = (x1, x2, y1, y2) => {
  let d = '';
  for (let y = y1; y < y2; y += 15) d += `M${x1} ${y} H${x2} `;
  let rang = 0;
  for (let y = y1; y < y2; y += 15, rang++) for (let x = x1 + (rang % 2) * 22; x < x2; x += 44) d += `M${x} ${y} V${Math.min(y + 15, y2)} `;
  return d;
};

// ——— la boutique de Pickett ———
const B = { x1: 410, x2: 930 }; // la devanture, entre ses deux pilastres
const VITRINE = { x1: 452, x2: 790, y1: 214, y2: 468 };
const PORTE_B = { x1: 806, x2: 888, y1: 214 };
const ENSEIGNE = { y1: 112, y2: 198 };

function devanture() {
  const { x1, x2, y1, y2 } = VITRINE;
  let s = '';
  // boiseries de la devanture, peintes en vert sombre
  s += `<rect x="${B.x1}" y="${ENSEIGNE.y1 - 10}" width="${B.x2 - B.x1}" height="${640 - ENSEIGNE.y1 + 10}" fill="#1c2b25"/>`;
  s += `<rect x="${B.x1}" y="${ENSEIGNE.y1 - 10}" width="${B.x2 - B.x1}" height="10" fill="#2f4239"/>`;
  for (const x of [B.x1, B.x2 - 30]) {
    s += `<rect x="${x}" y="${ENSEIGNE.y1 - 10}" width="30" height="${650 - ENSEIGNE.y1}" fill="#22332c"/><path d="M${x + 4} ${ENSEIGNE.y2 + 10} V632 M${x + 26} ${ENSEIGNE.y2 + 10} V632" stroke="#101a16" stroke-width="2"/>`;
  }
  s += `<path d="M${B.x1 + 1} ${ENSEIGNE.y1 - 10} V640" stroke="${TEAL}" stroke-width="1.6" opacity="0.4"/>`;
  // l'enseigne
  s += `<rect x="${B.x1 + 30}" y="${ENSEIGNE.y1}" width="${B.x2 - B.x1 - 60}" height="${ENSEIGNE.y2 - ENSEIGNE.y1}" fill="#15211c"/>
  <rect x="${B.x1 + 38}" y="${ENSEIGNE.y1 + 8}" width="${B.x2 - B.x1 - 76}" height="${ENSEIGNE.y2 - ENSEIGNE.y1 - 16}" fill="none" stroke="#8a7444" stroke-width="1.5" opacity="0.8"/>
  <g font-family="Georgia, serif" text-anchor="middle" fill="#c9a96a">
    <text x="${(B.x1 + B.x2) / 2}" y="${ENSEIGNE.y1 + 50}" font-size="38" letter-spacing="7">M. PICKETT</text>
    <text x="${(B.x1 + B.x2) / 2}" y="${ENSEIGNE.y1 + 72}" font-size="14" letter-spacing="3">FRUITERER · GREENGROCER</text>
  </g>`;
  zones.enseigne = { x: B.x1 + 30, y: ENSEIGNE.y1, w: B.x2 - B.x1 - 60, h: ENSEIGNE.y2 - ENSEIGNE.y1 };
  // la vitrine : l'intérieur de la boutique, à peine éclairé
  s += `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="url(#boutique)"/>`;
  // étagères et cageots, dans la pénombre
  s += `<g fill="#0d1311" opacity="0.85">
    <rect x="${x1}" y="${y1 + 92}" width="${x2 - x1}" height="6"/><rect x="${x1}" y="${y1 + 172}" width="${x2 - x1}" height="6"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${x1 + 14 + i * 54}" y="${y1 + 64 + (i % 2) * 6}" width="44" height="${28 - (i % 2) * 6}"/>`).join('')}
    ${[0, 1, 2, 3, 4].map((i) => `<path d="M${x1 + 22 + i * 64} ${y1 + 172} C${x1 + 22 + i * 64} ${y1 + 146} ${x1 + 70 + i * 64} ${y1 + 146} ${x1 + 70 + i * 64} ${y1 + 172} Z"/>`).join('')}
  </g>`;
  // petits carreaux de la vitrine
  s += `<g stroke="#101915" stroke-width="7"><path d="M${x1 + (x2 - x1) / 3} ${y1} V${y2} M${x1 + (2 * (x2 - x1)) / 3} ${y1} V${y2}"/></g>
  <g stroke="#101915" stroke-width="3"><path d="M${x1} ${y1 + 60} H${x2}"/></g>
  <rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="none" stroke="#0e1613" stroke-width="6"/>
  <path d="M${x1 + 10} ${y1 + 70} L${x1 + 70} ${y1 + 70} L${x1 + 16} ${y1 + 170} Z" fill="#cfe0dc" opacity="0.08"/>
  <path d="M${x1 + 130} ${y1 + 70} L${x1 + 170} ${y1 + 70} L${x1 + 134} ${y1 + 150} Z" fill="#cfe0dc" opacity="0.06"/>`;
  // la porte de la boutique, une vitre en haut, la sonnette
  const p = PORTE_B;
  s += `<rect x="${p.x1}" y="${p.y1}" width="${p.x2 - p.x1}" height="${640 - p.y1}" fill="#17231e"/>
  <rect x="${p.x1 + 10}" y="${p.y1 + 12}" width="${p.x2 - p.x1 - 20}" height="150" fill="url(#boutique)" opacity="0.8"/>
  <path d="M${(p.x1 + p.x2) / 2} ${p.y1 + 12} V${p.y1 + 162}" stroke="#101915" stroke-width="4"/>
  <rect x="${p.x1 + 10}" y="${p.y1 + 182}" width="${p.x2 - p.x1 - 20}" height="${640 - p.y1 - 200}" fill="none" stroke="#0e1613" stroke-width="3"/>
  <circle cx="${p.x2 - 14}" cy="${p.y1 + 200}" r="4" fill="${AMBRE}" opacity="0.7"/>`;
  return s;
}

// ——— l'étal, devant la vitrine : paniers de raisin noir, pommes, oignons ———
const KE = 1.06; // profondeur du bord de l'étal
function etal() {
  const xa = VITRINE.x1;
  const xb = VITRINE.x2;
  let s = '';
  // dessus incliné, de la vitrine (k = 1) au bord (k = KE)
  s += `<polygon points="${pts([xa, 474], [xb, 474], P(xb, 500, KE), P(xa, 500, KE))}" fill="#3a3326"/>`;
  // face avant et pieds
  s += `<polygon points="${pts(P(xa, 500, KE), P(xb, 500, KE), P(xb, 530, KE), P(xa, 530, KE))}" fill="#221d15"/>`;
  s += `<path d="M${pts(P(xa, 500, KE))} L${pts(P(xb, 500, KE))}" stroke="${AMBRE}" stroke-width="1.4" opacity="0.4"/>`;
  for (const X of [xa + 14, xb - 14]) {
    const [x, y] = P(X, 530, KE);
    s += `<rect x="${num(x - 5)}" y="${num(y)}" width="10" height="${num(SOL(KE) - y)}" fill="#16120d"/>`;
  }
  // les paniers
  const panier = (cx, contenu) => {
    const w = 74;
    let g = `<path d="M${cx - w / 2} 486 L${cx + w / 2} 486 L${cx + w / 2 - 6} 506 L${cx - w / 2 + 6} 506 Z" fill="#4a3a22"/>`;
    g += `<path d="M${cx - w / 2 + 4} 494 H${cx + w / 2 - 4} M${cx - w / 2 + 6} 500 H${cx + w / 2 - 6}" stroke="#2d2314" stroke-width="1.5"/>`;
    g += contenu;
    g += `<ellipse cx="${cx}" cy="486" rx="${w / 2}" ry="4" fill="none" stroke="#6b5532" stroke-width="2.4"/>`;
    return g;
  };
  // une grappe de raisin noir, couchée dans le panier
  const grappe = (cx, cy, r, rot) => {
    let g = `<g transform="rotate(${rot} ${cx} ${cy})">`;
    [5, 5, 4, 3, 2].forEach((n, i) => {
      for (let j = 0; j < n; j++) {
        const x = cx + (j - (n - 1) / 2) * r * 1.7;
        const y = cy + i * r * 1.4;
        g += `<circle cx="${num(x)}" cy="${num(y)}" r="${r}" fill="#24152b"/><circle cx="${num(x - r * 0.35)}" cy="${num(y - r * 0.4)}" r="${num(r * 0.32)}" fill="#9c8fb0" opacity="0.45"/>`;
      }
    });
    g += `<path d="M${cx} ${cy - r} q3 -7 9 -8" stroke="#4b3d24" stroke-width="1.8" fill="none"/></g>`;
    return g;
  };
  const tas = (cx, couleur, reflet, r) => {
    let g = '';
    [[-24, 2], [-8, 3], [8, 2], [24, 3], [-16, -6], [0, -7], [16, -6], [-6, -14], [8, -14]].forEach(([dx, dy]) => {
      g += `<circle cx="${cx + dx}" cy="${482 + dy}" r="${r}" fill="${couleur}"/><circle cx="${cx + dx - r * 0.35}" cy="${482 + dy - r * 0.4}" r="${num(r * 0.3)}" fill="${reflet}" opacity="0.5"/>`;
    });
    return g;
  };
  s += panier(492, grappe(476, 466, 4.4, -18) + grappe(500, 470, 4.4, 14) + grappe(488, 478, 4.2, 70));
  s += panier(576, grappe(560, 470, 4.4, 22) + grappe(588, 468, 4.4, -10));
  s += panier(660, tas(660, '#5e2a20', '#d0846a', 8));
  s += panier(744, tas(744, '#6f5a33', '#d8c08a', 7.5));
  // l'étiquette à la craie, piquée dans le panier de raisin
  s += `<path d="M622 488 L622 452" stroke="#2d2314" stroke-width="2"/>
  <g transform="rotate(-4 622 440)">
    <rect x="596" y="426" width="56" height="30" fill="#1c1c18"/>
    <rect x="598" y="428" width="52" height="26" fill="none" stroke="#5a5446" stroke-width="1"/>
    <g font-family="Georgia, serif" font-style="italic" fill="#e4e2d6" text-anchor="middle" opacity="0.9">
      <text x="624" y="439" font-size="8.5">Black grapes</text>
      <text x="624" y="451" font-size="10">6d lb</text>
    </g>
  </g>`;
  zones.vitrine = { x: xa - 4, y: 420, w: 196, h: 116 };
  return s;
}

// ——— le portail de la cour ———
const PORTAIL = { x1: 1062, x2: 1290, haut: 150 };
const BATTANT = 1176; // bord du battant fermé
function portail() {
  const { x1, x2, haut } = PORTAIL;
  let s = '';
  // l'ouverture, la cour dans l'ombre
  s += `<rect x="${x1}" y="${haut}" width="${x2 - x1}" height="${640 - haut}" fill="url(#cour)"/>`;
  // le fond de la cour : un mur à peine visible, des pavés mouillés
  const [fx1, fy1] = P(x1, haut, 0.55);
  const [fx2, fy2] = P(x2, 640, 0.55);
  s += `<rect x="${num(fx1)}" y="${num(fy1)}" width="${num(fx2 - fx1)}" height="${num(fy2 - fy1)}" fill="#0b100f"/>`;
  s += `<rect x="${num(fx1 + 30)}" y="${num(fy1 + 60)}" width="22" height="34" fill="#25302c" opacity="0.7"/>`;
  s += `<polygon points="${pts([x1, 640], [x2, 640], [fx2, fy2], [fx1, fy2])}" fill="url(#pavesCour)"/>`;
  // le battant ouvert, rabattu dans la cour (vu de biais)
  const kb = 0.82;
  const ouvert = [[x2, haut], P(x2, haut, kb), P(x2, 640, kb), [x2, 640]];
  s += `<polygon points="${pts(...ouvert)}" fill="url(#bois)"/>`;
  let planches = '';
  for (let t = 0.2; t < 1; t += 0.2) {
    const k = 1 - (1 - kb) * t;
    const [a, b] = [P(x2, haut, k), P(x2, 640, k)];
    planches += `M${num(a[0])} ${num(a[1])} L${num(b[0])} ${num(b[1])} `;
  }
  s += `<path d="${planches}" stroke="#121512" stroke-width="1.5" opacity="0.8"/>`;
  s += `<polygon points="${pts(...ouvert)}" fill="#000" opacity="0.35"/>`;
  // le battant fermé : planches verticales, traverses, écharpe
  s += `<rect x="${x1}" y="${haut}" width="${BATTANT - x1}" height="${640 - haut}" fill="url(#bois)"/>`;
  let d = '';
  for (let x = x1 + 16; x < BATTANT; x += 16) d += `M${x} ${haut} V640 `;
  s += `<path d="${d}" stroke="#141712" stroke-width="1.6" opacity="0.8"/>`;
  s += `<g fill="#2c2b22"><rect x="${x1}" y="${haut + 70}" width="${BATTANT - x1}" height="16"/><rect x="${x1}" y="${haut + 300}" width="${BATTANT - x1}" height="16"/><rect x="${x1}" y="600" width="${BATTANT - x1}" height="16"/></g>`;
  s += `<path d="M${x1 + 6} ${haut + 300} L${BATTANT - 6} ${haut + 90}" stroke="#2c2b22" stroke-width="13"/>`;
  s += `<path d="M${BATTANT} ${haut} V640" stroke="#0a0c0a" stroke-width="3"/><path d="M${x1 + 1} ${haut} V640" stroke="${TEAL}" stroke-width="1.4" opacity="0.4"/>`;
  // poutre du linteau et piliers de briques
  s += `<rect x="${x1 - 26}" y="${haut - 16}" width="${x2 - x1 + 52}" height="16" fill="#1d1a14"/>`;
  s += `<rect x="${x1 - 26}" y="${haut - 16}" width="${x2 - x1 + 52}" height="2" fill="${AMBRE}" opacity="0.25"/>`;
  zones.cour = { x: x1, y: haut, w: x2 - x1, h: 640 - haut };
  return s;
}

// ——— la rigole : de la cour au caniveau, à travers le trottoir ———
const KB = 1.62; // le bord du trottoir
function rigole() {
  const a = BATTANT + 2;
  const b = BATTANT + 22;
  const quad = [P(a, 640, 1), P(b, 640, 1), P(b, 640, KB), P(a, 640, KB)];
  let s = `<polygon points="${pts(...quad)}" fill="#0c1110"/>`;
  s += `<polygon points="${pts(P(a + 5, 640, 1), P(b - 5, 640, 1), P(b - 5, 640, KB), P(a + 5, 640, KB))}" fill="url(#eauRigole)"/>`;
  s += `<path d="M${pts(P(a, 640, 1))} L${pts(P(a, 640, KB))} M${pts(P(b, 640, 1))} L${pts(P(b, 640, KB))}" stroke="#4c5a56" stroke-width="2" opacity="0.7"/>`;
  return s;
}

// ——— quelques fleurs fanées, posées contre le mur, au pied du portail ———
function fleurs() {
  const x = PORTAIL.x1 - 16;
  let s = `<g opacity="0.85">`;
  s += `<path d="M${x} 640 L${x - 8} 596 M${x + 2} 640 L${x + 4} 592 M${x + 4} 640 L${x + 14} 600 M${x} 640 L${x - 2} 588" stroke="#3a4a33" stroke-width="2" fill="none"/>`;
  for (const [dx, dy, c] of [[-8, 594, '#b9a8a0'], [4, 590, '#8f5b5b'], [14, 598, '#cfc39a'], [-2, 586, '#a77a72'], [-12, 600, '#8f5b5b']]) {
    s += `<circle cx="${x + dx}" cy="${dy}" r="5" fill="${c}"/><circle cx="${x + dx}" cy="${dy}" r="1.8" fill="#3a2e22"/>`;
  }
  s += `<path d="M${x - 6} 626 C${x} 620 ${x + 8} 620 ${x + 12} 626 L${x + 6} 640 L${x - 2} 640 Z" fill="#6b6650"/></g>`;
  return s;
}

// ——— l'affiche du comité de vigilance ———
const AF = { x: 1322, y: 268, w: 112, h: 160 };
const AFFICHE = `<g transform="rotate(0.8 ${AF.x + AF.w / 2} ${AF.y + AF.h / 2})">
  <rect x="${AF.x}" y="${AF.y}" width="${AF.w}" height="${AF.h}" fill="#cbc19e"/>
  <g font-family="Georgia, serif" fill="#2a2620" text-anchor="middle">
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 18}" font-size="10" letter-spacing="1">WHITECHAPEL</text>
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 31}" font-size="9" letter-spacing="1">VIGILANCE COMMITTEE</text>
    <path d="M${AF.x + 10} ${AF.y + 38} H${AF.x + AF.w - 10}" stroke="#2a2620" stroke-width="1"/>
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 70}" font-size="22" font-weight="bold">REWARD</text>
    <path d="M${AF.x + 14} ${AF.y + 84} H${AF.x + AF.w - 14} M${AF.x + 20} ${AF.y + 93} H${AF.x + AF.w - 20} M${AF.x + 14} ${AF.y + 102} H${AF.x + AF.w - 24}" stroke="#2a2620" stroke-width="2" opacity="0.5"/>
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 124}" font-size="9" font-style="italic">1st October 1888</text>
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 144}" font-size="8.5">J. LARKIN, President</text>
  </g>
  <rect x="${AF.x}" y="${AF.y}" width="${AF.w}" height="${AF.h}" fill="#0d1817" opacity="0.18"/>
</g>`;
zones.affiche = { x: AF.x - 4, y: AF.y - 4, w: AF.w + 8, h: AF.h + 10 };

// ——— le trottoir et la chaussée ———
const dalles = () => {
  let d = '';
  for (let x = -400; x <= 2000; x += 120) {
    const [xa, ya] = P(x, 640, 1);
    const [xb, yb] = P(x, 640, KB);
    d += `M${num(xa)} ${num(ya)} L${num(xb)} ${num(yb)} `;
  }
  for (const k of [1.08, 1.2, 1.34, 1.48]) d += `M0 ${num(SOL(k))} H1600 `;
  return d;
};
const paves = () => {
  let d = '';
  const y0 = SOL(KB) + 14;
  for (let y = y0, r = 0; y < 900; y += 13 + r * 2, r++) {
    d += `M0 ${num(y)} H1600 `;
    for (let x = (r % 2) * 20; x < 1600; x += 40 + r * 4) d += `M${x} ${num(y)} v${13 + r * 2} `;
  }
  return d;
};

// ——— la caisse de pommes et le journal du matin ———
const KC = 1.3;
const CAISSE = (() => {
  const [cx, cy] = P(500, 640, KC);
  const s = echelle(cy);
  const w = 104 * s;
  const h = 62 * s;
  const prof = 16 * s;
  let g = `<ellipse cx="${num(cx)}" cy="${num(cy + 2)}" rx="${num(w * 0.62)}" ry="${num(7 * s)}" fill="#000" opacity="0.55" filter="url(#flou)"/>`;
  // dessus (vu un peu d'en haut), face avant en planches
  g += `<polygon points="${pts([cx - w / 2, cy - h], [cx + w / 2, cy - h], [cx + w / 2 - prof * 0.4, cy - h - prof], [cx - w / 2 - prof * 0.4, cy - h - prof])}" fill="#3b3222"/>`;
  g += `<rect x="${num(cx - w / 2)}" y="${num(cy - h)}" width="${num(w)}" height="${num(h)}" fill="#2b2418"/>`;
  g += `<path d="M${num(cx - w / 2)} ${num(cy - h * 0.66)} H${num(cx + w / 2)} M${num(cx - w / 2)} ${num(cy - h * 0.33)} H${num(cx + w / 2)}" stroke="#15110b" stroke-width="2"/>`;
  g += `<path d="M${num(cx - w / 2)} ${num(cy - h)} V${num(cy)}" stroke="${TEAL}" stroke-width="1.2" opacity="0.4"/>`;
  // quelques pommes qui dépassent
  for (const dx of [-0.36, -0.2, 0.3]) g += `<circle cx="${num(cx + dx * w)}" cy="${num(cy - h - prof * 0.4)}" r="${num(8 * s)}" fill="#5e2a20"/>`;
  // le journal plié, posé de travers
  const jx = cx + 6 * s;
  const jy = cy - h - prof * 0.5;
  g += `<g transform="translate(${num(jx)} ${num(jy)}) rotate(-7) scale(${num(s)})">
    <polygon points="-40,-14 38,-18 42,8 -36,12" fill="#141a18" opacity="0.5" transform="translate(2 3)"/>
    <polygon points="-40,-14 38,-18 42,8 -36,12" fill="#cfc6a8"/>
    <text x="0" y="-6" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="8.4" fill="#2a241c">THE DAILY LEDGER</text>
    <path d="M-34 0 H-2 M2 -1 H36 M-34 5 H-4 M2 4 H34" stroke="#6d6550" stroke-width="1.3"/>
  </g>`;
  zones.journal = { x: Math.round(cx - w / 2 - 6), y: Math.round(cy - h - prof - 14), w: Math.round(w + 12), h: Math.round(h + prof + 18) };
  return g;
})();

// ——— les personnages ———
const place = (x, k) => ({ x, y: SOL(k), s: echelle(SOL(k)) });
const pickett = place(700, 1.16);
const wade = place(978, 1.24);
const grant = place(1500, 1.44);
const joueur = place(232, 1.5);
const ombre = ({ x, y, s }, dx = 0) => `<ellipse cx="${num(x + dx * s)}" cy="${num(y)}" rx="${num(80 * s)}" ry="${num(9 * s)}" fill="#000" opacity="0.5" filter="url(#flou)"/>`;
const personnages = {
  // Matthew Pickett, devant sa boutique, brandit The Comet
  pickett: perso('marchand-brandit', { ...pickett, reflets: [[-2.5, -2, TEAL, 0.55], [2.5, -2, AMBRE, 0.45]], nom: 'pickett' }),
  // le sergent Wade relit son carnet
  wade: perso('agent-carnet', { ...wade, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.4], [2.5, -2, TEAL, 0.55]], nom: 'wade' }),
  // le détective Grant, pressé de partir pour la morgue
  grant: perso('detective-explique', { ...grant, miroir: true, reflets: [[-3, -2, TEAL, 0.6], [2.5, -2.5, AMBRE, 0.4]], nom: 'grant' }),
  // le joueur, arrivé par la rue
  joueur: perso('joueur-debout', { ...joueur, reflets: [[-2.5, -2, TEAL, 0.6], [2.5, -2.5, AMBRE, 0.35]], nom: 'joueur' }),
};

// ——— la rue, à gauche : façades dans le brouillard, réverbères ———
function rueLointaine() {
  let s = '';
  const plans = [
    { k: 0.42, couleur: '#5d7471', toits: [[-20, 250], [70, 236], [150, 262], [230, 228], [320, 248], [400, 240]] },
    { k: 0.6, couleur: '#3d5452', toits: [[-20, 214], [90, 196], [190, 222], [270, 188], [380, 206]] },
    { k: 0.8, couleur: '#253735', toits: [[-20, 150], [120, 128], [250, 160], [380, 140]] },
  ];
  for (const { k, couleur, toits } of plans) {
    let d = `M-20 ${num(SOL(k))}`;
    toits.forEach(([x, y], i) => {
      const xn = toits[i + 1]?.[0] ?? X0 + 20;
      d += ` L${x} ${y} L${xn} ${y}`;
      d += ` L${xn - 30} ${y} L${xn - 30} ${y - 22 * k} L${xn - 18} ${y - 22 * k} L${xn - 18} ${y}`;
    });
    d += ` L${X0 + 20} ${num(SOL(k))} Z`;
    s += `<path d="${d}" fill="${couleur}"/>`;
    let g = Math.round(k * 100);
    const hasard = () => ((g = (g * 9301 + 49297) % 233280) / 233280);
    for (let x = 10; x < X0; x += 46 * k + 10) {
      for (let y = toits[0][1] + 30; y < SOL(k) - 40 * k; y += 70 * k) {
        const lit = hasard() < 0.08;
        s += `<rect x="${num(x)}" y="${num(y)}" width="${num(18 * k)}" height="${num(30 * k)}" fill="${lit ? '#e8b452' : '#000'}" opacity="${lit ? 0.45 : 0.18}"/>`;
      }
    }
    s += `<rect x="-20" y="0" width="${X0 + 40}" height="900" fill="url(#brumeRue)" opacity="${num(1.1 - k)}"/>`;
  }
  // les réverbères de la rue, éteints au matin
  for (const [x, k] of [[120, 0.62], [300, 0.86]]) {
    const sc = (3.4 * 200 * k) / 4228;
    s += objet('reverbere', { ax: 448, ay: 4228, x, y: SOL(k), sc, couleur: k < 0.7 ? '#2f4442' : '#16211f' });
  }
  // deux passants, au loin
  s += objet('gentleman', { ax: 28, ay: 218, x: 70, y: SOL(0.7), sc: (1.75 * 200 * 0.7) / 218, couleur: '#2a3d3b' });
  s += objet('monsieur-3', { ax: 67, ay: 386, x: 196, y: SOL(0.52), sc: (1.75 * 200 * 0.52) / 386, couleur: '#3e5452' });
  return s;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- King's Row, le matin du 4 octobre 1888. Généré par tools/scene-fruiterie.mjs : ne pas modifier à la main.
       Décor dessiné pour le jeu, en perspective ; personnages : src/assets/silhouettes/persos (dessinés pour le jeu) ;
       réverbère et passants : Openclipart (CC0). Les zones de case.json suivent les positions données par le script. -->
  <defs>
    <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26363a"/><stop offset="0.6" stop-color="#6f8783"/><stop offset="1" stop-color="#9aaea9"/></linearGradient>
    <linearGradient id="facade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3f4c46"/><stop offset="0.5" stop-color="#323e39"/><stop offset="1" stop-color="#222c29"/></linearGradient>
    <linearGradient id="vitre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c403e"/><stop offset="1" stop-color="#0d1514"/></linearGradient>
    <linearGradient id="vitreAllumee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9964a"/><stop offset="1" stop-color="#6e471c"/></linearGradient>
    <linearGradient id="boutique" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b4a2c"/><stop offset="0.55" stop-color="#2e2516"/><stop offset="1" stop-color="#15110a"/></linearGradient>
    <linearGradient id="cour" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020303"/><stop offset="0.8" stop-color="#070a09"/><stop offset="1" stop-color="#121816"/></linearGradient>
    <linearGradient id="pavesCour" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b100f"/><stop offset="1" stop-color="#25302d"/></linearGradient>
    <linearGradient id="bois" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a372b"/><stop offset="1" stop-color="#262419"/></linearGradient>
    <linearGradient id="eauRigole" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#40504c"/><stop offset="1" stop-color="#7d948f"/></linearGradient>
    <linearGradient id="trottoir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d4a47"/><stop offset="1" stop-color="#181f1e"/></linearGradient>
    <linearGradient id="chaussee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141b1a"/><stop offset="1" stop-color="#060909"/></linearGradient>
    <linearGradient id="brumeRue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9bfba" stop-opacity="0.15"/><stop offset="0.7" stop-color="#a9bfba" stop-opacity="0.45"/><stop offset="1" stop-color="#a9bfba" stop-opacity="0.3"/></linearGradient>
    <linearGradient id="solRue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d9590"/><stop offset="1" stop-color="#34433f"/></linearGradient>
    <linearGradient id="brumeSol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa9a5" stop-opacity="0"/><stop offset="1" stop-color="#8fa9a5" stop-opacity="0.2"/></linearGradient>
    <linearGradient id="brumeHaut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ab3ae" stop-opacity="0.32"/><stop offset="1" stop-color="#9ab3ae" stop-opacity="0"/></linearGradient>
    <radialGradient id="flaque"><stop offset="0" stop-color="#b9cdc8" stop-opacity="0.3"/><stop offset="1" stop-color="#b9cdc8" stop-opacity="0"/></radialGradient>
    <radialGradient id="lueur" cx="0.5" cy="1" r="0.9"><stop offset="0" stop-color="#e8b452" stop-opacity="0.22"/><stop offset="1" stop-color="#e8b452" stop-opacity="0"/></radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.8"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/></radialGradient>
    <filter id="taches" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="3" seed="44"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 -2.2 1.25"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="12"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.8  0 0 0 0.5 -0.18"/>
    </filter>
    <filter id="flou" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
    ${Object.values(SYMBOLES).join('\n    ')}
    <clipPath id="facadeClip"><rect x="${X0}" y="0" width="${1600 - X0}" height="640"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>

  <!-- ═══ Plan 1 : le ciel, la rue qui s'enfonce dans le brouillard ═══ -->
  <rect width="1600" height="900" fill="url(#ciel)"/>
  <rect x="-20" y="${num(SOL(0.42))}" width="${X0 + 40}" height="${num(SOL(1) - SOL(0.42) + 4)}" fill="url(#solRue)"/>
  ${rueLointaine()}

  <!-- ═══ Plan 2 : les façades de King's Row ═══ -->
  <rect x="${X0}" y="0" width="${1600 - X0}" height="640" fill="url(#facade)"/>
  <g clip-path="url(#facadeClip)">
    <path d="${briques(X0, 1600, 0, SOCLE)}" stroke="#18211f" stroke-width="1.3" opacity="0.6"/>
    <rect x="${X0}" y="0" width="${1600 - X0}" height="640" filter="url(#taches)" opacity="0.55"/>
    <rect x="${X0}" y="0" width="${1600 - X0}" height="640" filter="url(#grain)" opacity="0.25"/>
  </g>
  <rect x="${X0}" y="76" width="${1600 - X0}" height="14" fill="#4b5c58"/>
  <rect x="${X0}" y="90" width="${1600 - X0}" height="4" fill="#141c1b"/>
  <rect x="${X0}" y="0" width="30" height="640" fill="#26332f"/>
  <path d="M${X0 + 30} 0 V640" stroke="#121a19" stroke-width="3"/>
  <path d="M${X0 + 1} 0 V640" stroke="${TEAL}" stroke-width="2" opacity="0.4"/>
  <!-- fenêtres de l'étage (coupées en haut) et de la maison voisine -->
  ${fenetre(480, 640, -120, 50)}${fenetre(720, 880, -120, 50)}${fenetre(1110, 1250, -120, 50)}${fenetre(1470, 1630, -120, 50)}
  ${fenetre(1470, 1640, 232, 470, true)}
  <rect x="${X0 + 30}" y="${SOCLE}" width="${1600 - X0 - 30}" height="${640 - SOCLE}" fill="#151c1a"/>
  <path d="${briques(X0 + 30, 1600, SOCLE, 640)}" stroke="#26302e" stroke-width="1.2" opacity="0.7"/>

  <!-- la boutique de Matthew Pickett -->
  ${devanture()}
  <!-- le portail de la cour -->
  ${portail()}
  <!-- l'affiche du comité de vigilance -->
  ${AFFICHE}

  <!-- ═══ le trottoir mouillé et la chaussée pavée ═══ -->
  <polygon points="${pts([-20, SOL(1)], [1620, SOL(1)], [1620, SOL(KB)], [-20, SOL(KB)])}" fill="url(#trottoir)"/>
  <path d="${dalles()}" stroke="#0c1312" stroke-width="2" opacity="0.6"/>
  ${rigole()}
  <rect x="-20" y="${num(SOL(KB))}" width="1640" height="14" fill="#56625f"/>
  <rect x="-20" y="${num(SOL(KB) + 14)}" width="1640" height="${num(900 - SOL(KB) - 14)}" fill="url(#chaussee)"/>
  <path d="${paves()}" stroke="#1e2827" stroke-width="1.5" opacity="0.7"/>
  <ellipse cx="620" cy="${num(SOL(1.1))}" rx="240" ry="26" fill="url(#lueur)"/>
  <ellipse cx="1500" cy="${num(SOL(1.06))}" rx="120" ry="12" fill="url(#lueur)"/>
  <ellipse cx="900" cy="${num(SOL(1.3))}" rx="90" ry="9" fill="url(#flaque)"/>

  <!-- ═══ Plan 3 : l'étal, les fleurs ═══ -->
  ${etal()}
  ${fleurs()}

  <!-- ═══ Plan 4 : le marchand, le sergent, le détective, le joueur ═══ -->
  ${ombre(pickett)}
  ${personnages.pickett}
  ${ombre(wade, -10)}
  ${personnages.wade}
  ${CAISSE}
  ${ombre(joueur, 10)}
  ${personnages.joueur}
  ${ombre(grant, -10)}
  ${personnages.grant}

  <!-- ═══ premier plan : la brume du matin ═══ -->
  <rect y="0" width="1600" height="260" fill="url(#brumeHaut)"/>
  <rect y="560" width="1600" height="340" fill="url(#brumeSol)"/>
  <rect width="1600" height="900" fill="url(#vignette)"/>
</svg>
`;

if (/href="(?!#|data:image\/)/.test(svg)) throw new Error('la scène doit rester autonome');
mkdirSync(DOSSIER, { recursive: true });
writeFileSync(new URL('scene.svg', DOSSIER), svg);
console.log(`scène : ${(svg.length / 1024).toFixed(0)} Ko`);
afficherCadres(cadres);
for (const [id, z] of Object.entries(zones)) console.log(id.padEnd(13), JSON.stringify(z));
