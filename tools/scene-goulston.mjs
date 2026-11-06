// Scène de l'affaire 3 (brouillon) : Goulston Street, au petit jour du 30 septembre 1888.
// L'entrée 108-119 des Wentworth Model Dwellings, un immeuble ouvrier : le jambage de briques noires
// est encore mouillé, le message à la craie vient d'être effacé, le seau traîne sur le trottoir.
// Même perspective que les autres scènes (tools/scene-outils.mjs) : la façade est le « mur du fond »
// (k = 1), le trottoir le sol ; à gauche, la rue s'enfonce dans le brouillard.
//
// Usage : node tools/scene-goulston.mjs   (après npm run persos si les silhouettes ont changé)
//   → src/cases/03-goulston-street/scene.svg et les rectangles des zones, à reporter dans case.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { AMBRE, F, TEAL, afficherCadres, creerPersos, echelle, num, pts, symbole } from './scene-outils.mjs';

const DOSSIER = new URL('../src/cases/03-goulston-street/', import.meta.url);

// ——— silhouettes d'Openclipart (CC0) : réverbère, lanterne murale, passants ———
const SYMBOLES = Object.fromEntries(['reverbere', 'lanterne-murale', 'monsieur-3', 'gentleman'].map((n) => [n, symbole(n, 1)]));
const vbDe = (nom) => SYMBOLES[nom].match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
/** Pose une silhouette d'Openclipart : le point (ax, ay) du dessin va en (x, y), à l'échelle sc. */
function objet(nom, { ax, ay, x, y, sc, couleur = '#0b1211', reflet = null, opacite = 1 }) {
  const [vx, vy, vw, vh] = vbDe(nom);
  const T = `translate(${num(x)} ${num(y)}) scale(${sc}) translate(${-ax} ${-ay})`;
  const use = (fill) => `<use href="#s-${nom}" x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${fill}"/>`;
  let s = '';
  if (reflet) s += `<g opacity="${reflet[3]}" transform="translate(${reflet[0]} ${reflet[1]}) ${T}">${use(reflet[2])}</g>`;
  s += `<g transform="${T}" opacity="${opacite}">${use(couleur)}</g>`;
  return s;
}

const { perso, defs: defsPersos, cadres } = creerPersos();
const zones = {};
/** point (X, h) de la façade ramené à la profondeur k */
const P = (X, h, k) => [F.x + (X - F.x) * k, F.y + (h - F.y) * k];
const SOL = (k) => F.y + 310 * k;

// ——— la façade (k = 1) : 1 m = 200 px ———
const X0 = 380; // angle de l'immeuble ; à gauche, la rue
const PORTE = { a: 860, b: 1120, haut: 150 }; // l'ouverture, cintrée
const JAMBAGE = 58; // les piliers de briques noires de chaque côté
const SOCLE = 520; // haut du soubassement noir
const fenetre = (x1, x2, y1, y2, allumee = false) => {
  const w = x2 - x1;
  return `<g>
    <rect x="${x1 - 14}" y="${y1 - 22}" width="${w + 28}" height="18" fill="#1b2422"/>
    <rect x="${x1 - 10}" y="${y2}" width="${w + 20}" height="12" fill="#3a4846"/>
    <rect x="${x1}" y="${y1}" width="${w}" height="${y2 - y1}" fill="${allumee ? 'url(#vitreAllumee)' : 'url(#vitre)'}"/>
    <g stroke="#141c1b" stroke-width="6"><path d="M${x1 + w / 2} ${y1} V${y2}"/><path d="M${x1} ${(y1 + y2) / 2} H${x2}"/></g>
    <g stroke="#141c1b" stroke-width="2.5">${[1, 2].map((i) => `<path d="M${x1} ${y1 + ((y2 - y1) / 2) * (i / 3)} H${x2}"/><path d="M${x1} ${(y1 + y2) / 2 + ((y2 - y1) / 2) * (i / 3)} H${x2}"/>`).join('')}</g>
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

// l'arc de la porte
const R = (PORTE.b - PORTE.a) / 2;
const CX = (PORTE.a + PORTE.b) / 2;
const RESSAUT = PORTE.haut + R; // naissance de l'arc
const ouverture = `M${PORTE.a} 640 V${RESSAUT} A${R} ${R} 0 0 1 ${PORTE.b} ${RESSAUT} V640 Z`;

// ——— le mur mouillé : traînées d'eau sur le jambage gauche, quelques lettres fantômes ———
const JG = { x1: PORTE.a - JAMBAGE, x2: PORTE.a };
function trainees() {
  let s = '';
  // la grande tache d'eau, là où la phrase était écrite (entre 1,1 et 1,8 m)
  s += `<path d="M${JG.x1 + 4} 300 C${JG.x1 + 20} 290 ${JG.x2 - 10} 296 ${JG.x2 - 2} 306 L${JG.x2 - 2} 420 C${JG.x2 - 16} 428 ${JG.x1 + 14} 426 ${JG.x1 + 4} 418 Z" fill="url(#mouille)" opacity="0.8"/>`;
  // les coulures jusqu'au trottoir
  let g = 7;
  const hasard = () => ((g = (g * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 9; i++) {
    const x = JG.x1 + 6 + hasard() * (JAMBAGE - 12);
    const y0 = 400 + hasard() * 30;
    const y1 = 560 + hasard() * 80;
    s += `<path d="M${num(x)} ${num(y0)} C${num(x + 2)} ${num((y0 + y1) / 2)} ${num(x - 2)} ${num((y0 + y1) / 2 + 20)} ${num(x + 1)} ${num(y1)}" stroke="#7d9893" stroke-width="${num(1.2 + hasard() * 1.6)}" opacity="${num(0.25 + hasard() * 0.3)}" fill="none"/>`;
  }
  // ce qu'on devine encore de la craie : « J… » et « …wes »
  s += `<g font-family="Georgia, serif" font-style="italic" fill="#e8efe9" filter="url(#delave)" opacity="0.32">
    <text x="${JG.x1 + 8}" y="338" font-size="22" transform="rotate(-3 ${JG.x1 + 8} 338)">J</text>
    <text x="${JG.x1 + 16}" y="372" font-size="15" transform="rotate(-2 ${JG.x1 + 16} 372)">wes</text>
  </g>`;
  return s;
}

// ——— le trottoir et la chaussée ———
const KB = 1.62; // le bord du trottoir
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

// ——— les personnages ———
const place = (x, k) => ({ x, y: SOL(k), s: echelle(SOL(k)) });
const lane = place(1236, 1.2);
const hurst = place(1452, 1.42);
const mendel = place(1010, 1.03);
const joueur = place(232, 1.5);
const ombre = ({ x, y, s }, dx = 0) => `<ellipse cx="${num(x + dx * s)}" cy="${num(y)}" rx="${num(80 * s)}" ry="${num(9 * s)}" fill="#000" opacity="0.5" filter="url(#flou)"/>`;
const personnages = {
  // Hannah Mendel, sur le seuil, dans la lumière de la cage d'escalier
  mendel: perso('temoin-debout', { ...mendel, miroir: true, reflets: [[2.5, -2, AMBRE, 0.7], [-2, -1.5, TEAL, 0.35]], nom: 'mendel' }),
  // l'agent Lane, qui garde l'entrée
  lane: perso('agent-debout', { ...lane, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.55], [2.5, -2, TEAL, 0.55]], nom: 'lane' }),
  // le détective Hurst, furieux, qui note tout
  hurst: perso('detective-note', { ...hurst, miroir: true, reflets: [[-3, -2, TEAL, 0.6], [2.5, -2.5, AMBRE, 0.45]], nom: 'hurst' }),
  // le joueur, arrivé par la rue
  joueur: perso('joueur-debout', { ...joueur, reflets: [[-2.5, -2, TEAL, 0.6], [2.5, -2.5, AMBRE, 0.4]], nom: 'joueur' }),
};

// ——— le seau et la serpillière, oubliés au pied du jambage ———
const kS = 1.1;
const [sx, sy] = P(PORTE.a + 34, 640, kS);
const SEAU = (() => {
  const w = 46 * kS;
  const h = 44 * kS;
  return `<g>
    <ellipse cx="${num(sx)}" cy="${num(sy + 2)}" rx="${num(w * 0.8)}" ry="${num(6 * kS)}" fill="#000" opacity="0.55" filter="url(#flou)"/>
    <path d="M${num(sx - w / 2)} ${num(sy - h)} L${num(sx + w / 2)} ${num(sy - h)} L${num(sx + w * 0.4)} ${num(sy)} L${num(sx - w * 0.4)} ${num(sy)} Z" fill="#1d2826"/>
    <path d="M${num(sx - w / 2)} ${num(sy - h)} L${num(sx - w * 0.4)} ${num(sy)}" stroke="${TEAL}" stroke-width="1.4" opacity="0.55"/>
    <path d="M${num(sx - w / 2)} ${num(sy - h + 10)} H${num(sx + w / 2)} M${num(sx - w * 0.46)} ${num(sy - 10)} H${num(sx + w * 0.46)}" stroke="#0e1615" stroke-width="2.5"/>
    <ellipse cx="${num(sx)}" cy="${num(sy - h)}" rx="${num(w / 2)}" ry="${num(5 * kS)}" fill="#8fa49f"/>
    <ellipse cx="${num(sx)}" cy="${num(sy - h + 1)}" rx="${num(w / 2 - 3)}" ry="${num(3.6 * kS)}" fill="#b9c4bc" opacity="0.8"/>
    <path d="M${num(sx - w / 2)} ${num(sy - h)} C${num(sx - w / 2)} ${num(sy - h - 30)} ${num(sx + w / 2)} ${num(sy - h - 30)} ${num(sx + w / 2)} ${num(sy - h)}" fill="none" stroke="#0e1615" stroke-width="2"/>
    <!-- la serpillière, appuyée contre le jambage -->
    <path d="M${num(sx - 50)} ${num(sy + 2)} L${num(JG.x2 - 12)} ${num(330)}" stroke="#2e2416" stroke-width="5" stroke-linecap="round"/>
    <path d="M${num(sx - 50)} ${num(sy + 2)} L${num(JG.x2 - 12)} ${num(330)}" stroke="${AMBRE}" stroke-width="1" opacity="0.35" transform="translate(1.5 0)"/>
    <path d="M${num(sx - 72)} ${num(sy + 4)} C${num(sx - 66)} ${num(sy - 26)} ${num(sx - 38)} ${num(sy - 30)} ${num(sx - 30)} ${num(sy + 4)} Z" fill="#5d6a63"/>
    <path d="M${num(sx - 66)} ${num(sy + 2)} L${num(sx - 60)} ${num(sy - 16)} M${num(sx - 52)} ${num(sy + 3)} L${num(sx - 50)} ${num(sy - 20)} M${num(sx - 40)} ${num(sy + 3)} L${num(sx - 42)} ${num(sy - 16)}" stroke="#3a4540" stroke-width="2"/>
    <!-- l'eau renversée -->
    <ellipse cx="${num(sx - 30)}" cy="${num(sy + 10)}" rx="80" ry="9" fill="url(#flaque)"/>
  </g>`;
})();
zones.seau = { x: Math.round(sx - 78), y: Math.round(sy - 82), w: Math.round(sx + 30 - (sx - 78)), h: 96 };
zones.message = { x: JG.x1 - 6, y: 284, w: JAMBAGE + 12, h: 160 };

// ——— l'affiche du Comet : « Tablier de cuir » relâché ———
const AF = { x: 650, y: 318, w: 116, h: 150 };
const AFFICHE = `<g transform="rotate(-1.2 ${AF.x + AF.w / 2} ${AF.y + AF.h / 2})">
  <rect x="${AF.x}" y="${AF.y}" width="${AF.w}" height="${AF.h}" fill="#bdb08c"/>
  <path d="M${AF.x} ${AF.y + AF.h} l14 -10 l16 10 l22 -6 l18 6 l24 -8 l22 8 V${AF.y + AF.h + 2} H${AF.x} Z" fill="#2a3533"/>
  <g font-family="Georgia, serif" fill="#2a2620" text-anchor="middle">
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 20}" font-size="11" letter-spacing="2">THE COMET</text>
    <path d="M${AF.x + 10} ${AF.y + 27} H${AF.x + AF.w - 10}" stroke="#2a2620" stroke-width="1"/>
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 54}" font-size="19" font-weight="bold">LEATHER</text>
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 76}" font-size="19" font-weight="bold">APRON</text>
    <text x="${AF.x + AF.w / 2}" y="${AF.y + 100}" font-size="13" letter-spacing="1">RELEASED</text>
    <path d="M${AF.x + 14} ${AF.y + 112} H${AF.x + AF.w - 14} M${AF.x + 20} ${AF.y + 121} H${AF.x + AF.w - 20} M${AF.x + 14} ${AF.y + 130} H${AF.x + AF.w - 24}" stroke="#2a2620" stroke-width="2" opacity="0.5"/>
  </g>
  <rect x="${AF.x}" y="${AF.y}" width="${AF.w}" height="${AF.h}" fill="#0d1817" opacity="0.3"/>
  <path d="M${AF.x + AF.w - 30} ${AF.y} L${AF.x + AF.w} ${AF.y} L${AF.x + AF.w} ${AF.y + 26} Z" fill="#2a3533"/>
</g>`;
zones.affiche = { x: AF.x - 4, y: AF.y - 4, w: AF.w + 8, h: AF.h + 14 };
zones.plaque = { x: CX - 52, y: PORTE.haut - 40, w: 104, h: 34 };

// ——— la rue, à gauche : façades dans le brouillard, réverbères ———
function rueLointaine() {
  let s = '';
  // trois plans d'immeubles, de plus en plus clairs vers le fond
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
      // cheminées
      d += ` L${xn - 30} ${y} L${xn - 30} ${y - 22 * k} L${xn - 18} ${y - 22 * k} L${xn - 18} ${y}`;
    });
    d += ` L${X0 + 20} ${num(SOL(k))} Z`;
    s += `<path d="${d}" fill="${couleur}"/>`;
    // fenêtres, quelques-unes allumées
    let g = Math.round(k * 100);
    const hasard = () => ((g = (g * 9301 + 49297) % 233280) / 233280);
    for (let x = 10; x < X0; x += 46 * k + 10) {
      for (let y = toits[0][1] + 30; y < SOL(k) - 40 * k; y += 70 * k) {
        const lit = hasard() < 0.12;
        s += `<rect x="${num(x)}" y="${num(y)}" width="${num(18 * k)}" height="${num(30 * k)}" fill="${lit ? '#e8b452' : '#000'}" opacity="${lit ? 0.6 : 0.18}"/>`;
      }
    }
    s += `<rect x="-20" y="0" width="${X0 + 40}" height="900" fill="url(#brumeRue)" opacity="${num(1.1 - k)}"/>`;
  }
  // les réverbères de la rue, allumés dans le brouillard
  for (const [x, k] of [[120, 0.62], [300, 0.86]]) {
    const y = SOL(k);
    const sc = (3.4 * 200 * k) / 4228;
    s += objet('reverbere', { ax: 448, ay: 4228, x, y, sc, couleur: k < 0.7 ? '#2f4442' : '#16211f' });
    s += `<circle cx="${num(x)}" cy="${num(y - 3.05 * 200 * k)}" r="${num(130 * k)}" fill="url(#gaz)"/><circle cx="${num(x)}" cy="${num(y - 3.05 * 200 * k)}" r="${num(5 * k)}" fill="#fff0c0"/>`;
  }
  // deux passants, au loin
  s += objet('gentleman', { ax: 28, ay: 218, x: 70, y: SOL(0.7), sc: (1.75 * 200 * 0.7) / 218, couleur: '#2a3d3b' });
  s += objet('monsieur-3', { ax: 67, ay: 386, x: 196, y: SOL(0.52), sc: (1.75 * 200 * 0.52) / 386, couleur: '#3e5452' });
  return s;
}

// ——— la lanterne murale au-dessus de la porte ———
const LM = { x: CX, y: PORTE.haut - 52, sc: 120 / 1611 };

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- Goulston Street, au petit jour du 30 septembre 1888. Généré par tools/scene-goulston.mjs : ne pas modifier à la main.
       Décor dessiné pour le jeu, en perspective ; personnages : src/assets/silhouettes/persos (dessinés pour le jeu) ;
       réverbère, lanterne et passants : Openclipart (CC0). Les zones de case.json suivent les positions données par le script. -->
  <defs>
    <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2a2b"/><stop offset="0.6" stop-color="#5f7b77"/><stop offset="1" stop-color="#8aa29d"/></linearGradient>
    <linearGradient id="facade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3c4d49"/><stop offset="0.5" stop-color="#2f3e3b"/><stop offset="1" stop-color="#1f2b29"/></linearGradient>
    <linearGradient id="vitre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c403e"/><stop offset="1" stop-color="#0d1514"/></linearGradient>
    <linearGradient id="vitreAllumee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a24c"/><stop offset="1" stop-color="#7a4f1e"/></linearGradient>
    <linearGradient id="escalier" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020404"/><stop offset="0.7" stop-color="#0b0f0e"/><stop offset="1" stop-color="#1a1610"/></linearGradient>
    <linearGradient id="trottoir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4745"/><stop offset="1" stop-color="#161e1d"/></linearGradient>
    <linearGradient id="chaussee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121918"/><stop offset="1" stop-color="#050808"/></linearGradient>
    <linearGradient id="mouille" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f8b86" stop-opacity="0.35"/><stop offset="0.5" stop-color="#8aa6a0" stop-opacity="0.55"/><stop offset="1" stop-color="#6f8b86" stop-opacity="0.2"/></linearGradient>
    <linearGradient id="brumeRue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9bfba" stop-opacity="0.15"/><stop offset="0.7" stop-color="#a9bfba" stop-opacity="0.45"/><stop offset="1" stop-color="#a9bfba" stop-opacity="0.3"/></linearGradient>
    <linearGradient id="solRue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d9590"/><stop offset="1" stop-color="#34433f"/></linearGradient>
    <linearGradient id="brumeSol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa9a5" stop-opacity="0"/><stop offset="1" stop-color="#8fa9a5" stop-opacity="0.22"/></linearGradient>
    <linearGradient id="brumeHaut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ab3ae" stop-opacity="0.3"/><stop offset="1" stop-color="#9ab3ae" stop-opacity="0"/></linearGradient>
    <radialGradient id="gaz"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.38"/><stop offset="0.45" stop-color="#f0b45a" stop-opacity="0.12"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/></radialGradient>
    <radialGradient id="flaque"><stop offset="0" stop-color="#b9cdc8" stop-opacity="0.35"/><stop offset="1" stop-color="#b9cdc8" stop-opacity="0"/></radialGradient>
    <radialGradient id="seuil" cx="0.5" cy="1" r="0.9"><stop offset="0" stop-color="#e8b452" stop-opacity="0.3"/><stop offset="1" stop-color="#e8b452" stop-opacity="0"/></radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.8"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/></radialGradient>
    <filter id="taches" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="3" seed="31"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 -2.2 1.25"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="9"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.8  0 0 0 0.5 -0.18"/>
    </filter>
    <filter id="flou" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="delave" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4"/></filter>
    ${Object.values(SYMBOLES).join('\n    ')}
    <clipPath id="facadeClip"><rect x="${X0}" y="0" width="${1600 - X0}" height="640"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>

  <!-- ═══ Plan 1 : le ciel, la rue qui s'enfonce dans le brouillard ═══ -->
  <rect width="1600" height="900" fill="url(#ciel)"/>
  <!-- le sol de la rue, qui s'éclaircit dans le brouillard -->
  <rect x="-20" y="${num(SOL(0.42))}" width="${X0 + 40}" height="${num(SOL(1) - SOL(0.42) + 4)}" fill="url(#solRue)"/>
  ${rueLointaine()}

  <!-- ═══ Plan 2 : la façade des Wentworth Model Dwellings ═══ -->
  <rect x="${X0}" y="0" width="${1600 - X0}" height="640" fill="url(#facade)"/>
  <g clip-path="url(#facadeClip)">
    <path d="${briques(X0, 1600, 0, SOCLE)}" stroke="#18211f" stroke-width="1.3" opacity="0.6"/>
    <rect x="${X0}" y="0" width="${1600 - X0}" height="640" filter="url(#taches)" opacity="0.55"/>
    <rect x="${X0}" y="0" width="${1600 - X0}" height="640" filter="url(#grain)" opacity="0.25"/>
  </g>
  <!-- bandeau de pierre entre le rez-de-chaussée et l'étage, angle de l'immeuble -->
  <rect x="${X0}" y="56" width="${1600 - X0}" height="16" fill="#4b5c58"/>
  <rect x="${X0}" y="72" width="${1600 - X0}" height="4" fill="#141c1b"/>
  <rect x="${X0}" y="0" width="34" height="640" fill="#26332f"/>
  <path d="M${X0 + 34} 0 V640" stroke="#121a19" stroke-width="3"/>
  <path d="M${X0 + 1} 0 V640" stroke="${TEAL}" stroke-width="2" opacity="0.4"/>
  <!-- fenêtres du rez-de-chaussée, et celles de l'étage (coupées en haut) -->
  ${fenetre(440, 610, 220, 470)}
  ${fenetre(1250, 1420, 220, 470, true)}
  ${fenetre(1500, 1670, 220, 470)}
  ${fenetre(440, 610, -120, 30)}${fenetre(900, 1080, -120, 30)}${fenetre(1250, 1420, -120, 30)}
  <!-- soubassement de briques noires vernissées -->
  <rect x="${X0 + 34}" y="${SOCLE}" width="${1600 - X0 - 34}" height="${640 - SOCLE}" fill="#121918"/>
  <path d="${briques(X0 + 34, 1600, SOCLE, 640)}" stroke="#26302e" stroke-width="1.2" opacity="0.7"/>
  <rect x="${X0 + 34}" y="${SOCLE - 6}" width="${1600 - X0 - 34}" height="8" fill="#3e4c49"/>

  <!-- l'entrée 108-119 : piliers de briques noires, arc, cage d'escalier -->
  <rect x="${JG.x1}" y="${PORTE.haut - 20}" width="${PORTE.b - PORTE.a + 2 * JAMBAGE}" height="${640 - PORTE.haut + 20}" fill="#121918"/>
  <path d="${briques(JG.x1, PORTE.b + JAMBAGE, PORTE.haut - 20, 640)}" stroke="#2a3533" stroke-width="1.2" opacity="0.75"/>
  <path d="${ouverture}" fill="url(#escalier)"/>
  <g stroke="#2a2418" stroke-width="3" opacity="0.8">${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${PORTE.a + 40 + i * 26} ${560 - i * 34} H${PORTE.b - 20}"/>`).join('')}</g>
  <path d="${ouverture}" fill="url(#seuil)"/>
  <path d="M${PORTE.a} 640 V${RESSAUT} A${R} ${R} 0 0 1 ${PORTE.b} ${RESSAUT} V640" fill="none" stroke="#3e4c49" stroke-width="10"/>
  <path d="M${PORTE.a - 5} ${RESSAUT} A${R + 5} ${R + 5} 0 0 1 ${PORTE.b + 5} ${RESSAUT}" fill="none" stroke="${AMBRE}" stroke-width="1.5" opacity="0.35"/>
  <path d="M${JG.x1 + 1} ${PORTE.haut - 20} V640" stroke="${TEAL}" stroke-width="1.6" opacity="0.45"/>
  <!-- la plaque : 108 – 119 -->
  <g transform="translate(${CX} ${PORTE.haut - 23})">
    <rect x="-48" y="-15" width="96" height="26" rx="3" fill="#d8d2bd"/>
    <rect x="-44" y="-11" width="88" height="18" rx="2" fill="none" stroke="#2a2620" stroke-width="1"/>
    <text y="4.5" text-anchor="middle" font-family="Georgia, serif" font-size="14" letter-spacing="1" fill="#1d1a16">108 – 119</text>
  </g>
  <rect x="${CX - 48}" y="${PORTE.haut - 38}" width="96" height="26" rx="3" fill="#0d1817" opacity="0.25"/>
  ${trainees()}

  <!-- l'affiche du Comet, à gauche de l'entrée -->
  ${AFFICHE}

  <!-- la lanterne de l'entrée, encore allumée -->
  ${objet('lanterne-murale', { ax: 640, ay: 1611, x: LM.x, y: LM.y, sc: LM.sc, couleur: '#0d1514', reflet: [-2, -1, TEAL, 0.4] })}
  <circle cx="${LM.x}" cy="${num(LM.y - 60)}" r="170" fill="url(#gaz)"/>

  <!-- ═══ le trottoir mouillé et la chaussée pavée ═══ -->
  <polygon points="${pts([-20, SOL(1)], [1620, SOL(1)], [1620, SOL(KB)], [-20, SOL(KB)])}" fill="url(#trottoir)"/>
  <path d="${dalles()}" stroke="#0c1312" stroke-width="2" opacity="0.6"/>
  <rect x="-20" y="${num(SOL(KB))}" width="1640" height="14" fill="#56625f"/>
  <rect x="-20" y="${num(SOL(KB) + 14)}" width="1640" height="${num(900 - SOL(KB) - 14)}" fill="url(#chaussee)"/>
  <path d="${paves()}" stroke="#1e2827" stroke-width="1.5" opacity="0.7"/>
  <!-- reflets de la lumière sur les pavés mouillés -->
  <ellipse cx="${CX}" cy="${num(SOL(1.2))}" rx="260" ry="34" fill="url(#seuil)"/>
  <ellipse cx="300" cy="${num(SOL(KB) + 40)}" rx="160" ry="20" fill="url(#gaz)" opacity="0.6"/>
  <ellipse cx="${JG.x1 + 30}" cy="${num(SOL(1.04))}" rx="70" ry="8" fill="url(#flaque)"/>

  <!-- ═══ Plan 3 : sur le seuil, au pied de l'entrée ═══ -->
  ${ombre(mendel)}
  ${personnages.mendel}
  ${SEAU}

  <!-- ═══ Plan 4 : l'agent, le détective, le joueur ═══ -->
  ${ombre(lane, -10)}
  ${personnages.lane}
  ${ombre(joueur, 10)}
  ${personnages.joueur}
  ${ombre(hurst, -10)}
  ${personnages.hurst}

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
