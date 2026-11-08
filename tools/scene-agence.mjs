// Scène de l'affaire 4 : la salle de rédaction de l'agence Mercury, New Bridge Street, vendredi 5 octobre 1888, midi.
// Même pièce en perspective que le poste de Leman Street (voir scene-outils.mjs), même style de « silhouettes en
// couches » : le mur du fond clair dans le brouillard, les meubles plus sombres, les personnages presque noirs,
// liserés par le jour de la fenêtre (vert-bleu) et par le gaz des lampes (ambre). Les papiers (indices) restent clairs.
// Tout est dessiné ici : aucune image extérieure.
//
// Usage : node tools/scene-agence.mjs   (après npm run persos si les silhouettes ont changé)
//   → src/cases/04-agence-mercury/scene.svg
//   et affiche les rectangles des personnages pour les zones de case.json.

import { writeFileSync } from 'node:fs';
import { AMBRE, F, TEAL, afficherCadres, creerPersos, echelle, gy, num, pts, quadMur, reperes, ym } from './scene-outils.mjs';

const SORTIE = new URL('../src/cases/04-agence-mercury/scene.svg', import.meta.url);

const { perso, defs: defsPersos, cadres } = creerPersos();

// ——— placements ———
const moorland = { x: 760, y: 815, s: echelle(815) }; // devant la porte de son bureau, tourné vers la gauche
const pike = { x: 1478, y: 806, s: echelle(806) }; // devant la porte d'entrée, sur le mur droit
// Tim Bradford, du Comet (affaire 1) : devant la fenêtre, penché par-dessus le comptoir, il lit le registre du courrier en douce
const tim = { x: 215, y: 700, s: echelle(700) };
// Tom corrige une dépêche, debout et penché sur son bureau : ses mains reposent sur le plateau
const tom = { x: 1300, y: 760, s: echelle(760) };
const PLATEAU = Math.round(tom.y + tom.s * reperes['reporter-penche'].mains.proche[1]) + 6; // bord avant du plateau
const BUREAU = { x1: 950, x2: 1340, fond: PLATEAU - 20, sol: 778 };

// ——— petits outils de dessin ———
/** générateur pseudo-aléatoire (toujours le même dessin) */
const hasard = (graine) => () => {
  graine = (graine * 16807) % 2147483647;
  return (graine - 1) / 2147483646;
};

/** une écriture à la main illisible : des boucles penchées, des mots, des lignes */
function ecriture(x, y, largeur, lignes, pas, graine, retrait = 0) {
  const r = hasard(graine);
  let d = '';
  for (let l = 0; l < lignes; l++) {
    let cx = x + (l === 0 ? retrait : 0);
    const fin = x + largeur * (l === lignes - 1 ? 0.55 : 0.92 + r() * 0.08);
    const cy = y + l * pas;
    while (cx < fin) {
      const mot = 3 + Math.floor(r() * 5);
      d += `M${num(cx)} ${num(cy)}`;
      for (let i = 0; i < mot && cx < fin; i++) {
        const h = 2.2 + r() * 2.6 + (r() < 0.15 ? 3 : 0);
        const w = 2.6 + r() * 1.6;
        d += ` q${num(w * 0.2)} ${num(-h * 1.4)} ${num(w * 0.7)} ${num(-h)} q${num(w * 0.3)} ${num(h * 0.9)} ${num(w * 0.3)} ${num(h)}`;
        cx += w;
      }
      cx += 3 + r() * 2;
    }
  }
  return d;
}

/** des lignes de texte imprimé : de petits traits gris */
function lignesImprimees(x, y, largeur, n, pas, graine) {
  const r = hasard(graine);
  let d = '';
  for (let i = 0; i < n; i++) d += `M${num(x)} ${num(y + i * pas)} h${num(largeur * (i === n - 1 ? 0.5 : 0.85 + r() * 0.15))} `;
  return d;
}

// ——— la pièce ———
const lignesPlancher = () => {
  let d = '';
  for (let x = -1400; x <= 3000; x += 42) d += `M${num(x)} 640 L${num(F.x + (x - F.x) * (570 / 310))} 900 `;
  return d;
};
const joints = () => {
  let d = '';
  [1.05, 1.13, 1.23, 1.35, 1.49, 1.66, 1.84].forEach((k, j) => {
    const y = F.y + 310 * k;
    for (let n = -34; n <= 70; n++) {
      if ((n + j * 2) % 3) continue;
      const x1 = F.x + (-1400 + n * 42 - F.x) * k;
      d += `M${num(x1)} ${num(y)} L${num(x1 + 42 * k)} ${num(y)} `;
    }
  });
  return d;
};
const poutres = [420, 610, 800, 990, 1180]
  .map((x) => {
    const loin = (dx) => num(F.x + (x + dx - F.x) * (330 / 280));
    return `<polygon points="${num(x - 10)},50 ${num(x + 10)},50 ${loin(16)},0 ${loin(-16)},0"/>`;
  })
  .join('');
const panneaux = [[640, 690], [700, 770], [780, 822], [850, 950], [960, 1050], [1060, 1150], [1160, 1250], [1260, 1330]]
  .map(([a, b]) => `<rect x="${a}" y="484" width="${b - a}" height="118"/>`)
  .join('');
const panneauxGauche = [[10, 86], [100, 168], [182, 250]].map(([a, b]) => `<polygon points="${quadMur(a, b, 484, 602)}"/>`).join('');

// Fenêtre sur le mur gauche : Ludgate Hill dans le brouillard, et le dôme de Saint-Paul
const fenetre = { a: [56, ym(56, 92)], b: [236, ym(236, 92)], c: [236, ym(236, 430)], d: [56, ym(56, 430)] };
const saintPaul = (() => {
  const cx = 150;
  const base = 250;
  return `<g fill="#7f9893">
      <rect x="${cx - 38}" y="${base - 46}" width="76" height="46"/>
      <path d="M${cx - 34} ${base - 46} C${cx - 34} ${base - 100} ${cx + 34} ${base - 100} ${cx + 34} ${base - 46} Z"/>
      <rect x="${cx - 7}" y="${base - 116}" width="14" height="22"/>
      <path d="M${cx - 8} ${base - 116} C${cx - 8} ${base - 128} ${cx + 8} ${base - 128} ${cx + 8} ${base - 116} Z"/>
      <rect x="${cx - 1.2}" y="${base - 140}" width="2.4" height="16"/><rect x="${cx - 5}" y="${base - 134}" width="10" height="2.2"/>
    </g>
    <g fill="none" stroke="#9db3ae" stroke-width="1.4" opacity="0.7">
      <path d="M${cx - 30} ${base - 40} V${base} M${cx - 18} ${base - 40} V${base} M${cx - 6} ${base - 40} V${base} M${cx + 6} ${base - 40} V${base} M${cx + 18} ${base - 40} V${base} M${cx + 30} ${base - 40} V${base}"/>
    </g>
    <g fill="#6f8984">
      <rect x="${cx - 78}" y="${base - 58}" width="22" height="70"/><path d="M${cx - 80} ${base - 58} L${cx - 67} ${base - 84} L${cx - 54} ${base - 58} Z"/>
      <rect x="${cx + 56}" y="${base - 58}" width="22" height="70"/><path d="M${cx + 54} ${base - 58} L${cx + 67} ${base - 84} L${cx + 80} ${base - 58} Z"/>
      <rect x="${cx - 90}" y="${base}" width="180" height="40"/>
    </g>`;
})();
const toits = `<g fill="#5b746f">
    <path d="M40 330 L40 300 L70 286 L100 300 L100 292 L112 292 L112 300 L150 300 L150 284 L160 284 L160 300 L196 306 L230 296 L250 300 L250 470 L40 470 Z"/>
  </g>
  <g fill="#4d6661"><rect x="76" y="270" width="8" height="18"/><rect x="88" y="274" width="6" height="14"/><rect x="204" y="282" width="9" height="16"/></g>
  <g fill="#e9d79c" opacity="0.55"><rect x="62" y="318" width="6" height="8"/><rect x="128" y="322" width="6" height="8"/><rect x="214" y="324" width="5" height="8"/></g>`;

// Casiers des abonnés, au-dessus du comptoir du courrier
const casiers = (() => {
  const x0 = 288;
  const y0 = 150;
  const cols = 6;
  const rows = 5;
  const w = 52;
  const h = 50;
  const r = hasard(7);
  let cases = '';
  let papiers = '';
  let plaques = '';
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = x0 + i * w;
      const y = y0 + j * h;
      cases += `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 12}"/>`;
      plaques += `<rect x="${x + w / 2 - 8}" y="${y + h - 7}" width="16" height="4"/>`;
      if (r() < 0.7) {
        const hp = 8 + r() * 18;
        papiers += `<rect x="${num(x + 7 + r() * 4)}" y="${num(y + h - 8 - hp)}" width="${num(w - 18 - r() * 8)}" height="${num(hp)}" transform="rotate(${num(r() * 6 - 3)} ${x + w / 2} ${y + h - 8})"/>`;
      }
    }
  }
  return `<rect x="${x0 - 6}" y="${y0 - 26}" width="${cols * w + 12}" height="${rows * h + 30}" fill="#132120"/>
    <text x="${x0 + (cols * w) / 2}" y="${y0 - 8}" font-family="Georgia, serif" font-size="12" letter-spacing="3" fill="#c9a24a" text-anchor="middle" opacity="0.8" id="enseigne">DESPATCHES</text>
    <g fill="#0a1211">${cases}</g>
    <g fill="#b3a98a" opacity="0.8">${papiers}</g>
    <g fill="#b08a45" opacity="0.55">${plaques}</g>`;
})();

// Comptoir du courrier, contre le mur du fond, et le registre ouvert sur son pupitre
const comptoir = (() => {
  const k = 1.08;
  const haut = 432;
  const xa = 282;
  const xb = 612;
  const avant = (x) => num(F.x + (x - F.x) * k);
  return `<polygon points="${xa},${haut} ${xb},${haut} ${avant(xb)},${num(gy(haut, k))} ${avant(xa)},${num(gy(haut, k))}" fill="#1f302d"/>
    <rect x="${avant(xa)}" y="${num(gy(haut, k))}" width="${num(+avant(xb) - +avant(xa))}" height="${num(gy(640, k) - gy(haut, k))}" fill="#132120"/>
    <g fill="none" stroke="#0a1312" stroke-width="3">
      <rect x="${num(+avant(xa) + 14)}" y="${num(gy(haut, k) + 22)}" width="148" height="150"/><rect x="${num(+avant(xa) + 178)}" y="${num(gy(haut, k) + 22)}" width="148" height="150"/>
    </g>
    <path d="M${avant(xa)} ${num(gy(haut, k))} H${avant(xb)}" stroke="#c99a4e" stroke-width="2" opacity="0.6"/>`;
})();
const registre = `<g id="registre"><polygon points="338,436 478,436 470,408 346,408" fill="#0e1716"/>
  <path d="M352 410 L408 404 L410 432 L346 434 Z" fill="#e2d8bc"/>
  <path d="M408 404 L462 410 L468 434 L410 432 Z" fill="#d6cbad"/>
  <line x1="408.5" y1="404" x2="410" y2="432" stroke="#8a7a60" stroke-width="2"/>
  <g stroke="#5c5040" stroke-width="1"><path d="${lignesImprimees(354, 412, 48, 5, 4.4, 3)}"/></g>
  <g stroke="#7a2a22" stroke-width="1.1" opacity="0.8"><path d="M414 413 h40 M415 418 h44 M416 423 h30"/></g>
  <path d="M352 410 L346 434" stroke="#8a2a22" stroke-width="3"/></g>`;

// La porte vitrée du directeur
const porteDirecteur = `<rect x="626" y="128" width="208" height="512" fill="#122019"/>
  <rect x="640" y="146" width="180" height="290" fill="url(#verreDepoli)"/>
  <circle cx="742" cy="300" r="120" fill="url(#lampeBureau)"/>
  <path d="M640 146 H820 V436 H640 Z M676 146 V436 M788 146 V436" fill="none" stroke="#0b1312" stroke-width="6"/>
  <path d="M676 146 V640 M788 146 V640" stroke="#0b1312" stroke-width="5"/>
  <rect x="640" y="452" width="180" height="170" fill="#16231f"/>
  <g fill="none" stroke="#0b1413" stroke-width="3"><rect x="684" y="470" width="96" height="136"/></g>
  <circle cx="780" cy="440" r="5" fill="#c9a24a"/>
  <g id="lettres-porte" font-family="Georgia, serif" text-anchor="middle" fill="#d6ad55">
    <text x="732" y="206" font-size="15" letter-spacing="1.5">J. MOORLAND</text>
    <text x="732" y="226" font-size="10" letter-spacing="3">DIRECTEUR</text>
  </g>
  <path d="M694 213 H770" stroke="#d6ad55" stroke-width="0.8" opacity="0.7"/>`;

// L'affiche de la police : le fac-similé de la lettre et de la carte postale
const affiche = `<g id="affiche" transform="rotate(-1.2 950 260)">
    <rect x="858" y="102" width="186" height="316" fill="#c9bf9e"/>
    <rect x="858" y="102" width="186" height="316" fill="url(#papierAffiche)" opacity="0.5"/>
    <text x="951" y="122" font-family="Georgia, serif" font-size="9" letter-spacing="2" fill="#2a241c" text-anchor="middle">METROPOLITAN</text>
    <text x="951" y="140" font-family="Georgia, serif" font-size="18" font-weight="bold" letter-spacing="3" fill="#2a241c" text-anchor="middle">POLICE</text>
    <path d="M870 147 H1032" stroke="#2a241c" stroke-width="1"/>
    <text x="951" y="157" font-family="Georgia, serif" font-size="6.4" letter-spacing="0.6" fill="#2a241c" text-anchor="middle">FACSIMILE OF LETTER AND POST CARD</text>
    <rect x="870" y="163" width="162" height="150" fill="#e4dcc3"/>
    <text x="878" y="180" font-family="'Segoe Print', 'Comic Sans MS', cursive" font-size="11" fill="#8f2a22">Dear Boss</text>
    <text x="996" y="174" font-family="'Segoe Print', 'Comic Sans MS', cursive" font-size="6.5" fill="#8f2a22">25 Sept. 1888</text>
    <path d="${ecriture(878, 194, 146, 9, 11.4, 11, 14)}" fill="none" stroke="#8f2820" stroke-width="0.85" stroke-linecap="round"/>
    <text x="960" y="306" font-family="'Segoe Print', 'Comic Sans MS', cursive" font-size="8" fill="#8f2a22">Jack the Ripper</text>
    <rect x="884" y="320" width="134" height="62" fill="#ddd3b6" transform="rotate(-2 951 351)"/>
    <g transform="rotate(-2 951 351)">
      <rect x="990" y="324" width="22" height="18" fill="none" stroke="#5c5040" stroke-width="0.8"/>
      <circle cx="996" cy="338" r="7" fill="none" stroke="#5c5040" stroke-width="0.8"/>
      <path d="${ecriture(890, 334, 92, 4, 11, 23)}" fill="none" stroke="#9a2c22" stroke-width="0.9" stroke-linecap="round"/>
    </g>
    <path d="${lignesImprimees(872, 394, 158, 3, 6, 5)}" stroke="#4a4235" stroke-width="1.6"/>
    <circle cx="864" cy="108" r="2.5" fill="#6e2a22"/><circle cx="1038" cy="108" r="2.5" fill="#6e2a22"/>
    <circle cx="864" cy="412" r="2.5" fill="#6e2a22"/><circle cx="1038" cy="412" r="2.5" fill="#6e2a22"/>
  </g>`;

// Le tableau noir des abonnés
const tableau = `<g id="tableau"><rect x="1072" y="108" width="248" height="186" fill="#3a2c1c"/>
  <rect x="1080" y="116" width="232" height="170" fill="#18211e"/>
  <rect x="1080" y="116" width="232" height="170" fill="url(#craieEffacee)"/>
  <g font-family="'Segoe Print', 'Comic Sans MS', cursive" fill="#dcd8c8" opacity="0.88">
    <text x="1196" y="142" font-size="15" text-anchor="middle" letter-spacing="1">SUBSCRIBERS</text>
    <text x="1100" y="176" font-size="14">Sept. 1st ...... 182</text>
    <text x="1100" y="206" font-size="14">Oct. 1st ........ 186</text>
    <text x="1100" y="240" font-size="17">Oct. 5th ...... 213 !</text>
  </g>
  <path d="M1100 150 H1292 M1196 250 C1230 256 1266 252 1294 246" fill="none" stroke="#dcd8c8" stroke-width="1.6" opacity="0.7"/>
  <rect x="1076" y="286" width="240" height="8" fill="#2c2116"/>
  <rect x="1250" y="282" width="16" height="5" fill="#e8e4d6"/></g>`;

// La porte d'entrée, sur le mur droit
const porte = { x1: 1392, x2: 1552 };
const vitre = quadMur(porte.x1 + 16, porte.x2 - 16, 190, 380);
const porteEntree = `<polygon points="${quadMur(1378, 1566, 150, 640)}" fill="#0c1514"/>
  <polygon points="${quadMur(porte.x1, porte.x2, 164, 640)}" fill="#121e1d"/>
  <polygon points="${vitre}" fill="url(#vitreEscalier)"/>
  <g id="mercury" clip-path="url(#vitreClip)">
    <text transform="translate(1480 ${num(ym(1480, 270))}) scale(-1 1) skewY(${num(-Math.atan((ym(1600, 270) - ym(1400, 270)) / 200) * 57.3)})" font-family="Georgia, serif" font-size="17" letter-spacing="2" fill="#c9a24a" opacity="0.6" text-anchor="middle">MERCURY</text>
  </g>
  <polygon points="${vitre}" fill="none" stroke="#0b1413" stroke-width="5"/>
  <g fill="none" stroke="#0b1413" stroke-width="4"><polygon points="${quadMur(porte.x1 + 6, porte.x2 - 6, 420, 620)}"/></g>
  <circle cx="1538" cy="${num(ym(1538, 430))}" r="7" fill="#c9a24a"/>
  <path d="M${porte.x1} ${num(ym(porte.x1, 164))} L${porte.x1} ${num(ym(porte.x1, 640))}" stroke="#56716c" stroke-width="1.5" opacity="0.45"/>`;

// Lampes à gaz suspendues, abat-jour de verre vert
const lampe = (x, y) => `<g id="lampe-${x}"><path d="M${x} 0 V${y - 26}" stroke="#0b1211" stroke-width="3"/>
  <path d="M${x - 6} ${y - 26} h12 l-2 10 h-8 Z" fill="#0b1211"/>
  <path d="M${x - 40} ${y} C${x - 36} ${y - 14} ${x - 18} ${y - 18} ${x - 8} ${y - 18} L${x + 8} ${y - 18} C${x + 18} ${y - 18} ${x + 36} ${y - 14} ${x + 40} ${y} Z" fill="#1f5a44"/>
  <path d="M${x - 40} ${y} C${x - 36} ${y - 14} ${x - 18} ${y - 18} ${x - 8} ${y - 18}" fill="none" stroke="#5fa184" stroke-width="1.5" opacity="0.7"/>
  <ellipse cx="${x}" cy="${y + 1}" rx="40" ry="4" fill="#ffe2a0"/>
  <rect x="${x - 1.5}" y="${y + 1}" width="3" height="20" fill="#6a5a34"/>
  <path d="M${x - 5} ${y + 20} h10 l-2 5 h-6 Z" fill="#8a7440"/>
  <circle cx="${x}" cy="${y + 11}" r="15" fill="#ffd27a" opacity="0.25"/>
  <path d="M${x} ${y + 20} C${x - 6} ${y + 16} ${x - 5} ${y + 9} ${x} ${y + 2} C${x + 5} ${y + 9} ${x + 6} ${y + 16} ${x} ${y + 20} Z" fill="#ffc64a"/>
  <path d="M${x} ${y + 19} C${x - 3} ${y + 16} ${x - 2.5} ${y + 12} ${x} ${y + 7} C${x + 2.5} ${y + 12} ${x + 3} ${y + 16} ${x} ${y + 19} Z" fill="#fff4d0"/></g>`;

// La presse à copier, sur son pied de fonte, au premier plan à gauche ; le copie-de-lettres ouvert en dessous
const presse = `<ellipse cx="146" cy="812" rx="128" ry="12" fill="#000" opacity="0.5"/>
  <g fill="#0b1312">
    <rect x="46" y="640" width="200" height="18"/>
    <path d="M56 658 L44 806 L56 806 L70 658 Z M236 658 L248 806 L236 806 L222 658 Z"/>
    <path d="M70 700 H222 V712 H70 Z"/>
    <rect x="60" y="612" width="172" height="28" rx="3"/>
    <path d="M78 612 V556 C78 540 92 532 108 532 H184 C200 532 214 540 214 556 V612 H202 V560 C202 550 196 546 186 546 H106 C96 546 90 550 90 560 V612 Z"/>
    <rect x="140" y="520" width="12" height="76"/>
    <rect x="96" y="594" width="100" height="14" rx="2"/>
    <rect x="62" y="514" width="168" height="8" rx="4"/>
    <circle cx="60" cy="518" r="10"/><circle cx="232" cy="518" r="10"/>
  </g>
  <path d="M60 612 H232 M96 594 H196 M64 514 H228" stroke="${AMBRE}" stroke-width="1.4" opacity="0.4"/>
  <path d="M78 600 L210 600" stroke="#cfc4a6" stroke-width="2.4" opacity="0.8"/>
  <g id="copie" transform="translate(0 2)">
    <path d="M86 698 L146 690 L148 706 L82 710 Z" fill="#d8ceb2"/>
    <path d="M146 690 L206 694 L212 708 L148 706 Z" fill="#cbbf9f"/>
    <path d="M146.5 690 L148 706" stroke="#7a6a50" stroke-width="1.6"/>
    <g stroke="#a8a08a" stroke-width="0.9" opacity="0.9"><path d="M90 696 h50 M90 700 h48 M152 696 h48 M153 700 h40"/></g>
  </g>`;

// Les sacs de lettres, devant le comptoir, et les lettres renversées sur le plancher
const sacs = (() => {
  const r = hasard(41);
  const sac = (x, y, w, h, penche) => `<g transform="rotate(${penche} ${x} ${y})">
      <path d="M${x - w * 0.18} ${y - h} C${x - w * 0.22} ${y - h * 0.8} ${x - w * 0.5} ${y - h * 0.7} ${x - w * 0.5} ${y - h * 0.35} C${x - w * 0.52} ${y - h * 0.05} ${x - w * 0.3} ${y} ${x} ${y} C${x + w * 0.3} ${y} ${x + w * 0.52} ${y - h * 0.05} ${x + w * 0.5} ${y - h * 0.35} C${x + w * 0.5} ${y - h * 0.7} ${x + w * 0.22} ${y - h * 0.8} ${x + w * 0.18} ${y - h} Z" fill="#2c2b22"/>
      <path d="M${x - w * 0.44} ${y - h * 0.5} C${x - w * 0.3} ${y - h * 0.3} ${x - w * 0.3} ${y - h * 0.15} ${x - w * 0.36} ${y - h * 0.04} M${x + w * 0.2} ${y - h * 0.62} C${x + w * 0.3} ${y - h * 0.4} ${x + w * 0.32} ${y - h * 0.2} ${x + w * 0.26} ${y - h * 0.04}" fill="none" stroke="#14140f" stroke-width="2"/>
      <path d="M${x - w * 0.5} ${y - h * 0.35} C${x - w * 0.5} ${y - h * 0.7} ${x - w * 0.22} ${y - h * 0.8} ${x - w * 0.18} ${y - h}" fill="none" stroke="${TEAL}" stroke-width="1.6" opacity="0.35"/>
      <text x="${x}" y="${y - h * 0.38}" font-family="Georgia, serif" font-size="${num(w * 0.13)}" fill="#6a6450" text-anchor="middle" letter-spacing="1">G.P.O.</text>
    </g>`;
  let lettres = '';
  for (let i = 0; i < 26; i++) {
    const x = 300 + r() * 330;
    const y = 740 + r() * 66;
    const k = (y - F.y) / 420;
    const c = ['#d8cdaa', '#cfc4a3', '#e2d8bc', '#c3b896'][Math.floor(r() * 4)];
    lettres += `<rect x="${num(x)}" y="${num(y)}" width="${num(24 * k)}" height="${num(10 * k)}" fill="${c}" transform="rotate(${num(r() * 50 - 25)} ${num(x)} ${num(y)})"/>`;
    if (r() < 0.4) lettres += `<path d="M${num(x + 3)} ${num(y + 4 * k)} h${num(14 * k)}" stroke="#8f2a22" stroke-width="0.9" transform="rotate(${num(r() * 50 - 25)} ${num(x)} ${num(y)})" opacity="0.7"/>`;
  }
  return `<g id="sacs"><ellipse cx="470" cy="790" rx="190" ry="18" fill="#000" opacity="0.45"/>
    ${sac(360, 772, 110, 150, -6)}${sac(566, 778, 120, 160, 5)}
    <g fill="#d8cdaa"><rect x="420" y="676" width="40" height="18" transform="rotate(-20 440 685)"/><rect x="452" y="668" width="36" height="16" transform="rotate(14 470 676)"/></g>
    ${sac(462, 796, 130, 150, 2)}
    <g>${lettres}</g></g>`;
})();

// Le bureau de Tom : plateau, caissons, la pique à dépêches, les deux encriers, les dépêches corrigées
const bureau = (() => {
  const { x1, x2, fond, sol } = BUREAU;
  const av = PLATEAU;
  const ep = 14; // épaisseur du plateau
  return `<ellipse cx="${(x1 + x2) / 2}" cy="${sol + 4}" rx="${(x2 - x1) / 2 + 30}" ry="12" fill="#000" opacity="0.5"/>
    <polygon points="${x1 + 14},${fond} ${x2 - 14},${fond} ${x2},${av} ${x1},${av}" fill="#203230"/>
    <rect x="${x1 - 4}" y="${av}" width="${x2 - x1 + 8}" height="${ep}" fill="#182826"/>
    <path d="M${x1 - 4} ${av} H${x2 + 4}" stroke="#c99a4e" stroke-width="2" opacity="0.7"/>
    <rect x="${x1 + 6}" y="${av + ep}" width="128" height="${sol - av - ep}" fill="#111d1c"/>
    <rect x="${x2 - 134}" y="${av + ep}" width="128" height="${sol - av - ep}" fill="#111d1c"/>
    <rect x="${x1 + 134}" y="${av + ep}" width="${x2 - x1 - 268}" height="40" fill="#0f1a19"/>
    <g fill="none" stroke="#0a1312" stroke-width="3">
      ${[0, 1, 2].map((i) => `<rect x="${x1 + 16}" y="${av + ep + 12 + i * 70}" width="108" height="58"/><rect x="${x2 - 124}" y="${av + ep + 12 + i * 70}" width="108" height="58"/>`).join('')}
    </g>
    <g fill="#b08a45" opacity="0.7">
      ${[0, 1, 2].map((i) => `<rect x="${x1 + 62}" y="${av + ep + 38 + i * 70}" width="16" height="5" rx="2"/><rect x="${x2 - 78}" y="${av + ep + 38 + i * 70}" width="16" height="5" rx="2"/>`).join('')}
    </g>
    <!-- la pique à dépêches -->
    <g id="pique">
    <ellipse cx="984" cy="${av - 7}" rx="16" ry="4.5" fill="#070b0b"/>
    <rect x="982.6" y="${av - 92}" width="2.8" height="86" fill="#1a2220"/>
    <path d="M984 ${av - 92} l0 -8" stroke="#a3b4b1" stroke-width="1.6"/>
    <g>
      <rect x="962" y="${av - 30}" width="46" height="22" fill="#cfc4a6" transform="rotate(-6 985 ${av - 19})"/>
      <rect x="964" y="${av - 52}" width="42" height="22" fill="#d8cdaa" transform="rotate(5 985 ${av - 41})"/>
      <rect x="961" y="${av - 76}" width="46" height="24" fill="#e2d8bc" transform="rotate(-3 984 ${av - 64})"/>
      <text x="984" y="${av - 66}" font-family="Georgia, serif" font-size="5.6" font-weight="bold" fill="#2a241c" text-anchor="middle" transform="rotate(-3 984 ${av - 64})">DOUBLE EVENT</text>
      <path d="${lignesImprimees(966, av - 61, 36, 2, 4, 9)}" stroke="#6d6550" stroke-width="1" transform="rotate(-3 984 ${av - 64})"/>
      <path d="${lignesImprimees(968, av - 45, 32, 3, 4, 13)}" stroke="#6d6550" stroke-width="1" transform="rotate(5 985 ${av - 41})"/>
    </g>
    </g>
    <g id="encriers">
    <!-- les deux encriers : le rouge presque vide, le noir plein -->
    <rect x="1024" y="${av - 22}" width="20" height="16" rx="2" fill="#0d1413"/>
    <rect x="1026" y="${av - 12}" width="16" height="5" fill="#a8322a"/>
    <path d="M1026 ${av - 21} h16" stroke="#c4d6d2" stroke-width="1" opacity="0.5"/>
    <rect x="1050" y="${av - 22}" width="20" height="16" rx="2" fill="#0d1413"/>
    <rect x="1052" y="${av - 20}" width="16" height="13" fill="#05080a"/>
    <path d="M1052 ${av - 21} h16" stroke="#c4d6d2" stroke-width="1" opacity="0.5"/>
    <!-- le mot pour le patron, appuyé contre les encriers -->
    <g transform="rotate(-8 1048 ${av - 30})">
      <rect x="1026" y="${av - 44}" width="40" height="22" fill="#e9e0c6"/>
      <text x="1030" y="${av - 34}" font-family="'Segoe Print', 'Comic Sans MS', cursive" font-size="6" fill="#2a241c">Dear Boss</text>
      <path d="M1031 ${av - 29} h28 M1031 ${av - 25} h18" stroke="#4a4235" stroke-width="0.8"/>
    </g>
    <!-- les dépêches corrigées à l'encre rouge -->
    <g transform="rotate(3 1120 ${av - 8})">
      <rect x="1076" y="${av - 16}" width="84" height="12" fill="#d6cbad"/>
      <rect x="1086" y="${av - 18}" width="86" height="12" fill="#e2d8bc"/>
      <path d="M1092 ${av - 14} h70 M1092 ${av - 10} h60" stroke="#6d6550" stroke-width="0.9"/>
      <path d="M1100 ${av - 14} l14 4 M1130 ${av - 11} q8 -4 16 0" stroke="#a8322a" stroke-width="1.3" fill="none"/>
    </g>
    </g>
    <path d="M${x1 + 14} ${fond} H${x2 - 14}" stroke="${TEAL}" stroke-width="1" opacity="0.3"/>`;
})();

const personnages = {
  moorland: perso('directeur-brandit', { ...moorland, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.65], [2.5, -2, TEAL, 0.5]], nom: 'moorland' }),
  tom: perso('reporter-penche', { ...tom, miroir: true, reflets: [[-2.5, -2.5, AMBRE, 0.75], [2.5, -1.5, TEAL, 0.4]], nom: 'tom' }),
  pike: perso('agent-sac', { ...pike, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.5], [2.5, -2, TEAL, 0.5]], nom: 'pike' }),
  tim: perso('journaliste-interroge', { ...tim, reflets: [[-3, -1.5, TEAL, 0.6], [2.5, -2, AMBRE, 0.5]], nom: 'tim' }),
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- Agence Mercury, New Bridge Street, vendredi 5 octobre 1888, midi. Généré par tools/scene-agence.mjs : ne pas modifier à la main.
       Décor et personnages dessinés pour le jeu (personnages : src/assets/silhouettes/persos). Les positions suivent les zones de case.json. -->
  <defs>
    <linearGradient id="murFond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3f5c58"/><stop offset="0.7" stop-color="#2f4845"/><stop offset="1" stop-color="#253c39"/>
    </linearGradient>
    <linearGradient id="murGauche" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#33504c"/><stop offset="1" stop-color="#1f3432"/>
    </linearGradient>
    <linearGradient id="murDroit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2f4a47"/><stop offset="1" stop-color="#18292a"/>
    </linearGradient>
    <linearGradient id="boiserie" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d2b27"/><stop offset="1" stop-color="#121c1a"/>
    </linearGradient>
    <linearGradient id="plancher" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e2a27"/><stop offset="1" stop-color="#070c0c"/>
    </linearGradient>
    <linearGradient id="plafond" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#22312f"/><stop offset="1" stop-color="#0e1716"/>
    </linearGradient>
    <linearGradient id="brouillard" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b8c8c3"/><stop offset="1" stop-color="#8aa29d"/>
    </linearGradient>
    <linearGradient id="voile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c2d1cc" stop-opacity="0.35"/><stop offset="1" stop-color="#a9bcb7" stop-opacity="0.15"/>
    </linearGradient>
    <linearGradient id="verreDepoli" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8ea6a0"/><stop offset="1" stop-color="#5f7a75"/>
    </linearGradient>
    <linearGradient id="vitreEscalier" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7e958f"/><stop offset="1" stop-color="#4d6460"/>
    </linearGradient>
    <linearGradient id="brumeSol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fa9a5" stop-opacity="0"/><stop offset="1" stop-color="#8fa9a5" stop-opacity="0.16"/>
    </linearGradient>
    <linearGradient id="rayonFenetre" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d7e6e2" stop-opacity="0.15"/><stop offset="1" stop-color="#d7e6e2" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="coneLampe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd27a" stop-opacity="0.16"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="gaz">
      <stop offset="0" stop-color="#ffd27a" stop-opacity="0.3"/><stop offset="0.45" stop-color="#f0b45a" stop-opacity="0.1"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lampeBureau">
      <stop offset="0" stop-color="#ffd890" stop-opacity="0.55"/><stop offset="0.5" stop-color="#e8b45a" stop-opacity="0.18"/><stop offset="1" stop-color="#e8b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="flaque">
      <stop offset="0" stop-color="#e8b45a" stop-opacity="0.16"/><stop offset="1" stop-color="#e8b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.8">
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/>
    </radialGradient>
    <radialGradient id="craieEffacee" cx="0.55" cy="0.5" r="0.7">
      <stop offset="0" stop-color="#c9c8bc" stop-opacity="0.08"/><stop offset="1" stop-color="#c9c8bc" stop-opacity="0.02"/>
    </radialGradient>
    <filter id="taches" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.011" numOctaves="3" seed="17"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.07  0 0 0 0 0.12  0 0 0 0 0.11  0 0 0 -2.4 1.32"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.8  0 0 0 0.5 -0.18"/>
    </filter>
    <pattern id="papierAffiche" patternUnits="userSpaceOnUse" width="6" height="6"><path d="M0 6 L6 0" stroke="#8d8468" stroke-width="0.4" opacity="0.5"/></pattern>
    <filter id="flou" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <clipPath id="murs"><polygon points="0,${num(ym(0, 50))} 260,50 1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640 260,640 0,${num(ym(0, 640))}"/></clipPath>
    <clipPath id="sol"><polygon points="0,${num(ym(0, 640))} 260,640 1340,640 1600,${num(ym(1600, 640))} 1600,900 0,900"/></clipPath>
    <clipPath id="fenetreClip"><polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}"/></clipPath>
    <clipPath id="vitreClip"><polygon points="${vitre}"/></clipPath>
    <clipPath id="derriereBureau"><rect x="0" y="0" width="1600" height="${PLATEAU + 3}"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>

  <!-- ═══ Plan 1 : la pièce, claire dans le brouillard ═══ -->
  <polygon points="163.6,0 260,50 1340,50 1436.4,0" fill="url(#plafond)"/>
  <g fill="#0f1918">${poutres}</g>
  <rect x="260" y="50" width="1080" height="590" fill="url(#murFond)"/>
  <polygon points="0,${num(ym(0, 50))} 260,50 260,640 0,${num(ym(0, 640))}" fill="url(#murGauche)"/>
  <polygon points="1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640" fill="url(#murDroit)"/>
  <g clip-path="url(#murs)">
    <rect width="1600" height="640" filter="url(#taches)" opacity="0.55"/>
    <rect width="1600" height="640" filter="url(#grain)" opacity="0.35"/>
  </g>
  <g fill="#1f3331">
    <rect x="260" y="50" width="1080" height="12"/>
    <polygon points="${quadMur(0, 260, 50, 62)}"/><polygon points="${quadMur(1340, 1600, 50, 62)}"/>
  </g>
  <path d="M260 50 V640 M1340 50 V640" stroke="#162523" stroke-width="3" opacity="0.7"/>
  <path d="M261 62 V640" stroke="#1a2b29" stroke-width="6" opacity="0.6"/>
  <path d="M1339 62 V640" stroke="#4b6763" stroke-width="2" opacity="0.35"/>

  <!-- Fenêtre sur le mur gauche : les toits de Ludgate Hill et le dôme de Saint-Paul, dans le brouillard de midi -->
  <g clip-path="url(#fenetreClip)">
    <rect x="40" y="0" width="210" height="480" fill="url(#brouillard)"/>
    ${saintPaul}
    <rect x="40" y="0" width="210" height="480" fill="url(#voile)"/>
    ${toits}
    <rect x="40" y="300" width="210" height="60" fill="#c8d6d2" opacity="0.18"/>
    <polygon points="${pts(fenetre.a, [146, ym(146, 92)], [56, ym(56, 260)])}" fill="#fff" opacity="0.06"/>
  </g>
  <g fill="none" stroke="#0c1514">
    <polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}" stroke-width="14"/>
    <path d="M146 ${num(ym(146, 92))} L146 ${num(ym(146, 430))}" stroke-width="8"/>
    <path d="M56 ${num(ym(56, 250))} L236 ${num(ym(236, 250))}" stroke-width="8"/>
  </g>
  <polygon points="${quadMur(40, 250, 430, 446)}" fill="#142120"/>
  <path d="M40 ${num(ym(40, 430))} L250 ${num(ym(250, 430))}" stroke="#8fa9a5" stroke-width="1.5" opacity="0.5"/>

  <!-- Les casiers des journaux abonnés et le comptoir du courrier -->
  ${casiers}

  <!-- La porte vitrée du bureau du directeur -->
  ${porteDirecteur}

  <!-- L'affiche de la police, collée le 3 octobre -->
  ${affiche}

  <!-- Le tableau noir des abonnés -->
  ${tableau}

  <!-- La porte d'entrée de l'agence, sur le mur droit -->
  ${porteEntree}

  <!-- ═══ Plan 2 : boiseries et plancher ═══ -->
  <rect x="826" y="470" width="514" height="170" fill="url(#boiserie)"/>
  <polygon points="${quadMur(0, 260, 470, 640)}" fill="url(#boiserie)"/>
  <polygon points="${quadMur(1340, porte.x1 - 14, 470, 640)}" fill="url(#boiserie)"/>
  <polygon points="${quadMur(porte.x2 + 14, 1600, 470, 640)}" fill="url(#boiserie)"/>
  <g fill="none" stroke="#0e1816" stroke-width="3">${panneaux}${panneauxGauche}</g>
  <g fill="#22332f">
    <rect x="826" y="462" width="514" height="9"/>
    <polygon points="${quadMur(0, 260, 462, 471)}"/>
    <polygon points="${quadMur(1340, porte.x1 - 14, 462, 471)}"/><polygon points="${quadMur(porte.x2 + 14, 1600, 462, 471)}"/>
  </g>
  <path d="M826 462 H1340" stroke="#b08a45" stroke-width="1.5" opacity="0.35"/>
  <g fill="#0c1413">
    <rect x="260" y="622" width="1080" height="18"/>
    <polygon points="${quadMur(0, 260, 622, 640)}"/>
    <polygon points="${quadMur(1340, porte.x1 - 14, 622, 640)}"/><polygon points="${quadMur(porte.x2 + 14, 1600, 622, 640)}"/>
  </g>
  <g clip-path="url(#sol)">
    <rect y="500" width="1600" height="400" fill="url(#plancher)"/>
    <path d="${lignesPlancher()}" stroke="#0a1110" stroke-width="2" opacity="0.85"/>
    <path d="${joints()}" stroke="#0a1110" stroke-width="1.5" opacity="0.7"/>
    <ellipse cx="760" cy="760" rx="420" ry="110" fill="url(#flaque)"/>
    <ellipse cx="1150" cy="790" rx="260" ry="70" fill="url(#flaque)"/>
  </g>
  <path d="M0 ${num(ym(0, 640))} L260 640 H1340 L1600 ${num(ym(1600, 640))}" fill="none" stroke="#4b6763" stroke-width="1.2" opacity="0.35"/>

  <!-- Le comptoir du courrier et le registre ouvert -->
  ${comptoir}
  ${registre}

  <!-- Le jour de la fenêtre et la lumière des lampes -->
  <polygon points="${pts([236, 92], [236, 440], [560, 900], [1000, 900])}" fill="url(#rayonFenetre)"/>
  <path d="M500 96 L380 900 L700 900 Z M1180 84 L1000 900 L1360 900 Z" fill="url(#coneLampe)"/>

  <!-- ═══ Plan 3 : meubles et personnages ═══ -->
  <!-- Tim Bradford, du Comet : manteau à carreaux, melon, crayon sur l'oreille ; il lit le registre par-dessus le comptoir -->
  <ellipse cx="${num(tim.x + 20)}" cy="${tim.y}" rx="70" ry="8" fill="#000" opacity="0.5"/>
  ${personnages.tim}

  <!-- Les sacs de lettres signées Jack -->
  ${sacs}

  <!-- John Moorland, le directeur : favoris, cigare, redingote ouverte, The Morning Courier brandi -->
  <ellipse cx="${num(moorland.x + 10)}" cy="${moorland.y}" rx="100" ry="11" fill="#000" opacity="0.55"/>
  ${personnages.moorland}

  <!-- L'agent Henry Pike, de Scotland Yard, devant la porte, un sac de lettres à la main -->
  <ellipse cx="${num(pike.x + 6)}" cy="${pike.y}" rx="70" ry="9" fill="#000" opacity="0.5"/>
  ${personnages.pike}

  <!-- Tom Bellamy corrige sa dépêche, penché sur son bureau : visière verte, bras de chemise -->
  <g clip-path="url(#derriereBureau)">${personnages.tom}</g>
  ${bureau}

  <!-- La presse à copier, au premier plan -->
  ${presse}

  <!-- Lampes à gaz suspendues -->
  ${lampe(500, 96)}
  ${lampe(1180, 84)}

  <!-- ═══ Plan 4 : lumière, poussière, brouillard ═══ -->
  <circle cx="500" cy="96" r="420" fill="url(#gaz)"/>
  <circle cx="1180" cy="84" r="420" fill="url(#gaz)"/>
  <g fill="#f6dc9a" opacity="0.45">
    <circle cx="470" cy="180" r="1.4"/><circle cx="540" cy="240" r="1.1"/><circle cx="1150" cy="200" r="1.6"/><circle cx="1210" cy="160" r="1.2"/>
    <circle cx="610" cy="300" r="1.1"/><circle cx="1240" cy="310" r="1.4"/><circle cx="1110" cy="360" r="1"/><circle cx="430" cy="330" r="1.1"/>
  </g>
  <rect y="600" width="1600" height="300" fill="url(#brumeSol)"/>
  <rect width="1600" height="900" fill="url(#vignette)"/>
</svg>
`;

if (/href="(?!#|data:image\/)/.test(svg)) throw new Error('la scène doit rester autonome');
writeFileSync(SORTIE, svg);
console.log(`scène : ${(svg.length / 1024).toFixed(0)} Ko ; plateau du bureau en y = ${PLATEAU}`);
afficherCadres(cadres);
