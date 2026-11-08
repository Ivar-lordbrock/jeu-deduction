// Scènes de l'affaire 6 : Miller's Court.
//   scene.svg : la cour de Miller's Court, Dorset Street, vendredi 9 novembre 1888, 13 h 25. Dehors, en plein jour,
//               dans le brouillard : la porte de la chambre 13 est fermée, un vieux manteau bouche le carreau cassé.
//               On ne voit jamais l'intérieur de la chambre.
//   poste.svg : le poste de police de Commercial Street, lundi 12 novembre 1888, 18 h 05, au gaz.
// Même perspective que les autres affaires (voir scene-outils.mjs). Les papiers (indices) restent clairs.
// Tout est dessiné ici : aucune image extérieure.
//
// Usage : node tools/scene-millers.mjs   (après npm run persos si les silhouettes ont changé)
//   → src/cases/06-millers-court/scene.svg et poste.svg
//   et affiche les rectangles des personnages pour les zones de case.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { AMBRE, F, TEAL, afficherCadres, creerPersos, echelle, num, pts, quadMur, reperes, ym } from './scene-outils.mjs';

const DOSSIER = new URL('../src/cases/06-millers-court/', import.meta.url);
mkdirSync(DOSSIER, { recursive: true });

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
    const fin = x + largeur * (l === lignes - 1 ? 0.55 : 0.88 + r() * 0.12);
    const cy = y + l * pas;
    while (cx < fin) {
      const mot = 2 + Math.floor(r() * 5);
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

/** des briques : rangs de joints clairs sur un fond sombre, dans un rectangle */
function briques(x, y, w, h, graine, pasY = 9, pasX = 22) {
  const r = hasard(graine);
  let d = '';
  for (let yy = y + pasY; yy < y + h; yy += pasY) {
    d += `M${num(x)} ${num(yy)} H${num(x + w)} `;
    const dec = ((yy - y) / pasY) % 2 ? pasX / 2 : 0;
    for (let xx = x + dec + r() * 3; xx < x + w; xx += pasX) d += `M${num(xx)} ${num(yy - pasY)} V${num(yy)} `;
  }
  return d;
}

const VIGNETTE = `<radialGradient id="vignette" cx="0.5" cy="0.45" r="0.78">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.82"/>
    </radialGradient>`;
const FILTRES = `<filter id="taches" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.011" numOctaves="3" seed="61"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.07  0 0 0 0 0.07  0 0 0 -2.4 1.36"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.8  0 0 0 0.5 -0.18"/>
    </filter>
    <filter id="flou" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>`;
const SOL = `<clipPath id="sol"><polygon points="0,${num(ym(0, 640))} 260,640 1340,640 1600,${num(ym(1600, 640))} 1600,900 0,900"/></clipPath>`;

/** la lampe à gaz suspendue : abat-jour, bec de laiton, flamme nue (Z-Image y met une ampoule : on la recolle) */
const lampe = (x, y) => `<g id="lampe-gaz"><path d="M${x} 0 V${y - 26}" stroke="#0b1211" stroke-width="3"/>
    <path d="M${x - 6} ${y - 26} h12 l-2 10 h-8 Z" fill="#0b1211"/>
    <path d="M${x - 44} ${y} C${x - 40} ${y - 14} ${x - 20} ${y - 18} ${x - 8} ${y - 18} L${x + 8} ${y - 18} C${x + 20} ${y - 18} ${x + 40} ${y - 14} ${x + 44} ${y} Z" fill="#26302b"/>
    <ellipse cx="${x}" cy="${y + 1}" rx="44" ry="4.5" fill="#ffe2a0"/>
    <rect x="${x - 1.5}" y="${y + 1}" width="3" height="22" fill="#6a5a34"/>
    <path d="M${x - 5} ${y + 22} h10 l-2 5 h-6 Z" fill="#8a7440"/>
    <circle cx="${x}" cy="${y + 12}" r="16" fill="#ffd27a" opacity="0.25"/>
    <path d="M${x} ${y + 22} C${x - 6} ${y + 18} ${x - 5} ${y + 10} ${x} ${y + 2} C${x + 5} ${y + 10} ${x + 6} ${y + 18} ${x} ${y + 22} Z" fill="#ffc64a"/>
    <path d="M${x} ${y + 21} C${x - 3} ${y + 18} ${x - 2.5} ${y + 13} ${x} ${y + 8} C${x + 2.5} ${y + 13} ${x + 3} ${y + 18} ${x} ${y + 21} Z" fill="#fff4d0"/></g>`;

function ecrire(nom, contenu, titre) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- ${titre} Généré par tools/scene-millers.mjs : ne pas modifier à la main.
       Décor et personnages dessinés pour le jeu (personnages : src/assets/silhouettes/persos). Les positions suivent les zones de case.json. -->
${contenu}
</svg>
`;
  if (/href="(?!#|data:image\/)/.test(svg)) throw new Error('la scène doit rester autonome');
  writeFileSync(new URL(nom, DOSSIER), svg);
  console.log(`${nom} : ${(svg.length / 1024).toFixed(0)} Ko`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Scène 1 : la cour de Miller's Court, 13 h 25
// ═══════════════════════════════════════════════════════════════════════════════════════
{
  const { perso, defs: defsPersos, cadres } = creerPersos();
  const hollis = { x: 300, y: 800, s: echelle(800) }; // l'inspecteur, à gauche, relit le billet d'Arden
  const cullen = { x: 125, y: 722, s: echelle(722) }; // la veuve, sur le seuil du n° 5
  const tim = { x: 464, y: 640, s: echelle(640) }; // Tim, au bout du passage, qui veut entrer
  const agent = { x: 558, y: 648, s: echelle(648) }; // l'agent qui le retient
  const mcallister = { x: 1170, y: 760, s: echelle(760) }; // le logeur, devant sa boutique, le cahier des loyers
  const boyd = { x: 1470, y: 852, s: echelle(852) }; // le vieux soldat, assis sur une caisse
  const porter = { x: 836, y: 484, s: 0.6 }; // la locataire du dessus, penchée à sa fenêtre (seul le haut se voit)
  const FENETRE_HAUT = { x1: 770, x2: 890, y1: 112, y2: 252 };
  const PORTE = { x1: 610, x2: 700, y1: 270, y2: 640 };
  const VITRE_A = { x1: 740, x2: 880, y1: 360, y2: 520 }; // la fenêtre cassée, la plus proche de la porte
  const VITRE_B = { x1: 910, x2: 1050, y1: 360, y2: 520 };
  const ARCHE = { x1: 450, x2: 580, y: 640, haut: 330 };

  // le ciel de brouillard au-dessus des toits, et les cheminées
  const ciel = `<rect width="1600" height="200" fill="url(#ciel)"/>
    <g fill="#3a4140">
      <rect x="380" y="38" width="46" height="56"/><rect x="384" y="28" width="9" height="12"/><rect x="408" y="24" width="9" height="16"/>
      <rect x="860" y="30" width="58" height="64"/><rect x="866" y="18" width="10" height="14"/><rect x="884" y="16" width="10" height="16"/><rect x="902" y="20" width="10" height="12"/>
      <rect x="1196" y="44" width="40" height="50"/><rect x="1204" y="34" width="9" height="12"/>
    </g>
    <path d="M394 24 C390 10 404 -4 420 -6 M890 12 C884 -2 900 -14 918 -14" stroke="#9fb0ad" stroke-width="10" opacity="0.18" fill="none" filter="url(#flou)"/>`;

  // la façade du fond : briques noircies en haut, badigeon sale en bas
  const facade = `<rect x="260" y="88" width="1080" height="552" fill="#2c2a26"/>
    <path d="${briques(260, 88, 1080, 390, 11)}" stroke="#4a463e" stroke-width="1" opacity="0.5"/>
    <rect x="260" y="470" width="1080" height="170" fill="url(#badigeon)"/>
    <path d="M260 470 H1340" stroke="#1a1a17" stroke-width="3" opacity="0.6"/>
    <rect x="260" y="82" width="1080" height="10" fill="#1d1e1b"/>
    <!-- la gouttière et la descente -->
    <path d="M300 92 V640" stroke="#1a1c1a" stroke-width="7"/><path d="M296 630 h12 v10 h-12 Z" fill="#1a1c1a"/>`;

  // fenêtres de l'étage (fermées), et celle de la locataire, ouverte
  const fenetresHaut = `<g fill="#172020" stroke="#2a2a26" stroke-width="6">
      <rect x="320" y="120" width="96" height="128"/><rect x="980" y="120" width="96" height="128"/><rect x="1180" y="120" width="96" height="128"/>
    </g>
    <g stroke="#2a2a26" stroke-width="3"><path d="M368 120 V248 M320 184 H416 M1028 120 V248 M980 184 H1076 M1228 120 V248 M1180 184 H1276"/></g>
    <g fill="#9fbcb7" opacity="0.12"><rect x="322" y="122" width="44" height="60"/><rect x="982" y="122" width="44" height="60"/><rect x="1182" y="122" width="44" height="60"/></g>
    <!-- la fenêtre de la locataire : le châssis du bas est relevé -->
    <rect x="${FENETRE_HAUT.x1}" y="${FENETRE_HAUT.y1}" width="${FENETRE_HAUT.x2 - FENETRE_HAUT.x1}" height="${FENETRE_HAUT.y2 - FENETRE_HAUT.y1}" fill="#0b1010"/>
    <rect x="${FENETRE_HAUT.x1}" y="${FENETRE_HAUT.y1}" width="${FENETRE_HAUT.x2 - FENETRE_HAUT.x1}" height="50" fill="#1c2626" stroke="#2a2a26" stroke-width="5"/>
    <path d="M${(FENETRE_HAUT.x1 + FENETRE_HAUT.x2) / 2} ${FENETRE_HAUT.y1} V${FENETRE_HAUT.y1 + 50}" stroke="#2a2a26" stroke-width="3"/>`;

  // le passage voûté vers Dorset Street : au bout, la rue en plein jour, le garni de Crossingham en face
  const { x1: ax1, x2: ax2, y: ay, haut } = ARCHE;
  const rayon = (ax2 - ax1) / 2;
  const voute = `M${ax1} ${ay} V${haut + rayon} A${rayon} ${rayon} 0 0 1 ${ax2} ${haut + rayon} V${ay} Z`;
  const passage = `<g id="passage-rue">
    <path d="${voute}" fill="#070b0b"/>
    <clipPath id="voute"><path d="${voute}"/></clipPath>
    <g clip-path="url(#voute)">
      <path d="${voute}" fill="url(#tunnel)"/>
      <!-- au bout du passage : Dorset Street -->
      <rect x="486" y="430" width="58" height="170" fill="#7d8e8b"/>
      <rect x="486" y="430" width="58" height="96" fill="#3e4544"/>
      <g fill="#c7b47a" opacity="0.55"><rect x="494" y="446" width="10" height="14"/><rect x="514" y="446" width="10" height="14"/><rect x="532" y="446" width="8" height="14"/><rect x="494" y="476" width="10" height="14"/><rect x="532" y="476" width="8" height="14"/></g>
      <path d="M536 528 V572 M530 528 h12" stroke="#1a1e1d" stroke-width="2.4"/>
      <path d="M531 520 h10 l-1 8 h-8 Z" fill="#1a1e1d"/>
      <!-- des curieux, que la police tient à distance -->
      <g fill="#1f2524">
        <circle cx="496" cy="560" r="5"/><circle cx="508" cy="556" r="5.5"/><circle cx="520" cy="562" r="5"/><circle cx="541" cy="558" r="5"/>
        <path d="M488 600 C488 572 504 566 512 568 C522 566 548 568 548 600 Z"/>
      </g>
      <rect x="486" y="430" width="58" height="170" fill="#c9d6d0" opacity="0.18"/>
    </g>
    <path d="${voute}" fill="none" stroke="#1d1e1b" stroke-width="8"/>
  </g>`;

  // la porte de la chambre 13 : pas de serrure à clé dehors, seulement un loquet à ressort
  const { x1: px1, x2: px2, y1: py1, y2: py2 } = PORTE;
  const porte = `<g id="porte13">
    <rect x="${px1 - 8}" y="${py1 - 8}" width="${px2 - px1 + 16}" height="${py2 - py1 + 8}" fill="#1d1e1b"/>
    <rect x="${px1}" y="${py1}" width="${px2 - px1}" height="${py2 - py1}" fill="#2a221a"/>
    <g fill="none" stroke="#17120d" stroke-width="3">
      <rect x="${px1 + 10}" y="${py1 + 14}" width="${px2 - px1 - 20}" height="130"/><rect x="${px1 + 10}" y="${py1 + 164}" width="${px2 - px1 - 20}" height="${py2 - py1 - 184}"/>
    </g>
    <path d="M${px1 + 14} ${py1 + 40} L${px2 - 20} ${py1 + 120} M${px1 + 30} ${py1 + 220} L${px2 - 14} ${py1 + 300}" stroke="#4a3c2c" stroke-width="1.4" opacity="0.6"/>
    <text x="${(px1 + px2) / 2}" y="${py1 + 52}" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#b9ad8a" text-anchor="middle" opacity="0.8">13</text>
    <!-- le loquet à ressort, côté passage, et la poignée -->
    <rect x="${px1 + 8}" y="${py1 + 186}" width="16" height="22" rx="2" fill="#6a5a34"/>
    <circle cx="${px1 + 16}" cy="${py1 + 202}" r="3.4" fill="#2a2216"/>
    <circle cx="${px1 + 18}" cy="${py1 + 226}" r="5" fill="#8a7440"/>
    <path d="M${px1} ${py2 - 4} H${px2}" stroke="#0d0a07" stroke-width="5"/>
  </g>`;

  // la pioche du logeur, posée contre le mur
  const pioche = `<g id="pioche">
    <path d="M716 518 L728 640" stroke="#5a4630" stroke-width="7" stroke-linecap="round"/>
    <path d="M688 524 C700 512 724 508 750 516 L748 522 C726 516 704 518 692 530 Z" fill="#30332f"/>
    <rect x="711" y="510" width="14" height="16" rx="2" fill="#262824"/>
  </g>`;

  // une fenêtre de la chambre 13 : six carreaux ; casse = la fenêtre la plus proche de la porte, avec deux trous
  const fenetre = ({ x1, x2, y1, y2 }, casse, id) => {
    const w = (x2 - x1) / 3;
    const h = (y2 - y1) / 2;
    let carreaux = '';
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) {
        const x = x1 + i * w;
        const y = y1 + j * h;
        const trou = casse && j === 1 && i < 2;
        carreaux += trou
          ? `<rect x="${num(x + 3)}" y="${num(y + 3)}" width="${num(w - 6)}" height="${num(h - 6)}" fill="#050707"/>`
          : `<rect x="${num(x + 3)}" y="${num(y + 3)}" width="${num(w - 6)}" height="${num(h - 6)}" fill="#3a4645"/><rect x="${num(x + 3)}" y="${num(y + 3)}" width="${num(w - 6)}" height="${num(h - 6)}" fill="#cfcdbb" opacity="0.32"/>`;
      }
    // les éclats de verre restés dans le cadre des deux carreaux cassés
    const eclats = casse
      ? `<g fill="#9fb0ad" opacity="0.55">
        <path d="M${num(x1 + 3)} ${num(y1 + h + 3)} L${num(x1 + 24)} ${num(y1 + h + 3)} L${num(x1 + 6)} ${num(y1 + h + 30)} Z"/>
        <path d="M${num(x1 + w - 3)} ${num(y2 - 3)} L${num(x1 + w - 20)} ${num(y2 - 3)} L${num(x1 + w - 4)} ${num(y2 - 26)} Z"/>
        <path d="M${num(x1 + w + 3)} ${num(y1 + h + 3)} L${num(x1 + w + 30)} ${num(y1 + h + 3)} L${num(x1 + w + 4)} ${num(y1 + h + 18)} Z"/>
      </g>
      <!-- le vieux manteau qui bouche le premier trou ; un coin a été écarté -->
      <path d="M${num(x1 + 6)} ${num(y1 + h + 6)} L${num(x1 + w - 6)} ${num(y1 + h + 4)} C${num(x1 + w - 10)} ${num(y1 + h + 20)} ${num(x1 + w - 18)} ${num(y1 + h + 30)} ${num(x1 + w - 30)} ${num(y1 + h + 36)} L${num(x1 + w - 4)} ${num(y2 - 6)} L${num(x1 + 6)} ${num(y2 - 6)} Z" fill="#26221d"/>
      <path d="M${num(x1 + 14)} ${num(y1 + h + 10)} C${num(x1 + 18)} ${num(y1 + h + 30)} ${num(x1 + 14)} ${num(y1 + h + 50)} ${num(x1 + 20)} ${num(y2 - 8)} M${num(x1 + 30)} ${num(y1 + h + 8)} C${num(x1 + 34)} ${num(y1 + h + 34)} ${num(x1 + 30)} ${num(y1 + h + 52)} ${num(x1 + 34)} ${num(y2 - 8)}" stroke="#3d362d" stroke-width="2" fill="none"/>
      <circle cx="${num(x1 + 22)}" cy="${num(y1 + h + 24)}" r="2.6" fill="#5a4a30"/>`
      : '';
    return `<g id="${id}">
      <rect x="${x1 - 10}" y="${y1 - 10}" width="${x2 - x1 + 20}" height="${y2 - y1 + 20}" fill="#1d1e1b"/>
      ${carreaux}
      <g stroke="#262722" stroke-width="5"><path d="M${num(x1 + w)} ${y1} V${y2} M${num(x1 + 2 * w)} ${y1} V${y2} M${x1} ${num(y1 + h)} H${x2}"/></g>
      ${eclats}
      <rect x="${x1 - 14}" y="${y2 + 6}" width="${x2 - x1 + 28}" height="9" fill="#3a3a34"/>
    </g>`;
  };

  // la porte de derrière de la boutique du logeur, ouverte, et la lumière de la boutique
  const boutique = `<rect x="1140" y="262" width="110" height="378" fill="#1d1e1b"/>
    <rect x="1150" y="272" width="90" height="368" fill="#3a2a18"/>
    <rect x="1150" y="272" width="90" height="368" fill="url(#lueurBoutique)"/>
    <g fill="#120d08"><rect x="1158" y="420" width="74" height="10"/><rect x="1162" y="350" width="24" height="70"/><rect x="1196" y="370" width="30" height="50"/></g>
    <polygon points="1240,272 1272,284 1272,640 1240,640" fill="#2a221a"/>
    <polygon points="1150,640 1240,640 1300,720 1110,720" fill="#e8b452" opacity="0.07"/>`;

  // le robinet de la cour et son seau
  const robinet = `<path d="M1306 470 V600 M1306 600 h16 v8" stroke="#2a2d2a" stroke-width="6" fill="none"/>
    <path d="M1300 640 L1304 612 L1336 612 L1340 640 Z" fill="#30332f"/><path d="M1304 612 C1308 600 1332 600 1336 612" stroke="#30332f" stroke-width="2" fill="none"/>`;

  // la poubelle de la cour, au pied de la descente
  const poubelle = `<path d="M318 640 L322 586 L374 586 L378 640 Z" fill="#232624"/><rect x="316" y="580" width="64" height="8" rx="2" fill="#2e312e"/>`;

  // le mur de gauche : le n° 5, où vit la veuve, porte ouverte sur le noir
  const murGauche = `<polygon points="0,${num(ym(0, -200))} 260,-200 260,640 0,${num(ym(0, 640))}" fill="url(#murGauche)"/>
    <polygon points="${quadMur(0, 260, 470, 640)}" fill="url(#badigeonGauche)"/>
    <polygon points="${quadMur(52, 196, 214, 640)}" fill="#141615"/>
    <polygon points="${quadMur(62, 186, 226, 640)}" fill="#050707"/>
    <polygon points="${quadMur(186, 214, 226, 640)}" fill="#2a2a24"/>
    <text id="numero5" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#b9ad8a" opacity="0.75" transform="translate(206 ${num(ym(206, 200))}) skewY(-30)">5</text>`;

  // le mur de droite, et la caisse du vieux soldat
  const murDroit = `<polygon points="1340,-200 1600,${num(ym(1600, -200))} 1600,${num(ym(1600, 640))} 1340,640" fill="url(#murDroit)"/>
    <polygon points="${quadMur(1340, 1600, 470, 640)}" fill="url(#badigeonDroit)"/>
    <polygon points="${quadMur(1390, 1520, 160, 400)}" fill="#141818"/>
    <polygon points="${quadMur(1402, 1508, 172, 388)}" fill="#2e3a3a"/>
    <polygon points="${quadMur(1402, 1508, 172, 388)}" fill="#cfcdbb" opacity="0.2"/>`;
  const assise = Math.round(boyd.y + boyd.s * reperes['soldat-assis'].assise);
  const caisse = `<g fill="#2a241b"><rect x="${boyd.x - 50}" y="${assise}" width="96" height="${boyd.y - assise}"/></g>
    <path d="M${boyd.x - 50} ${assise} h96 M${boyd.x - 50} ${num((assise + boyd.y) / 2)} h96" stroke="#3e352a" stroke-width="3"/>
    <path d="M${boyd.x - 50} ${assise} l14 -10 h96 l-14 10 Z" fill="#3a3226"/>`;

  // le petit tonneau contre le mur, sous la seconde fenêtre, et The Morning Courier plié dessus
  const tonneau = `<path d="M952 640 C948 614 948 588 952 562 L1006 562 C1010 588 1010 614 1006 640 Z" fill="#2c241a"/>
    <path d="M950 580 H1008 M950 624 H1008" stroke="#16120c" stroke-width="4"/>
    <ellipse cx="979" cy="562" rx="27" ry="5" fill="#3a3024"/>
    <g id="journal" transform="rotate(-3 979 578)">
      <path d="M944 556 L1014 556 L1016 604 L946 604 Z" fill="#cfc6a8"/>
      <path d="M944 556 L1014 556 L1012 561 L946 561 Z" fill="#a89f84"/>
      <text x="980" y="572" font-family="Georgia, serif" font-weight="bold" font-size="7.4" fill="#2a241c" text-anchor="middle">MORNING COURIER</text>
      <path d="M950 575 H1010" stroke="#2a241c" stroke-width="0.7"/>
      <text x="980" y="585" font-family="Georgia, serif" font-weight="bold" font-size="6" fill="#2a241c" text-anchor="middle">CHIEF OF POLICE</text>
      <text x="980" y="593" font-family="Georgia, serif" font-weight="bold" font-size="6" fill="#2a241c" text-anchor="middle">RESIGNS</text>
      <path d="${lignesImprimees(952, 598, 56, 2, 3, 23)}" stroke="#6d6550" stroke-width="0.9"/>
    </g>`;

  // le chaton de la locataire, sur l'appui de sa fenêtre
  const chaton = `<path id="chaton" d="M858 252 C856 240 862 232 870 232 L872 226 L876 232 L880 226 L881 234 C886 238 886 246 884 252 Z M884 250 C894 250 898 244 896 238" fill="#0b0e0e" stroke="#0b0e0e" stroke-width="1.5"/>`;

  // le sol : des pavés mouillés et la rigole qui descend du passage
  const sol = `<g clip-path="url(#sol)">
    <rect y="500" width="1600" height="400" fill="url(#pave)"/>
    <path d="${(() => {
      let d = '';
      for (let x = -1400; x <= 3000; x += 54) d += `M${num(x)} 640 L${num(F.x + (x - F.x) * (570 / 310))} 900 `;
      for (const y of [652, 668, 688, 714, 746, 786, 834, 892]) d += `M0 ${y} H1600 `;
      return d;
    })()}" stroke="#0e1211" stroke-width="2" opacity="0.7"/>
    <path d="M515 640 L700 900" stroke="#0a0d0c" stroke-width="16" opacity="0.7"/>
    <path d="M515 640 L700 900" stroke="#9fbcb7" stroke-width="2" opacity="0.25"/>
    <ellipse cx="760" cy="760" rx="300" ry="40" fill="#9fbcb7" opacity="0.08"/>
    <ellipse cx="420" cy="860" rx="160" ry="18" fill="#9fbcb7" opacity="0.07"/>
  </g>
  <path d="M0 ${num(ym(0, 640))} L260 640 H1340 L1600 ${num(ym(1600, 640))}" fill="none" stroke="#3d5753" stroke-width="1.2" opacity="0.35"/>`;

  const personnages = {
    cullen: perso('veuve-chale', { ...cullen, reflets: [[-2.5, -2, TEAL, 0.6]], nom: 'cullen' }),
    tim: perso('journaliste-carnet', { ...tim, reflets: [[-2, -1.5, TEAL, 0.5]], nom: 'tim' }),
    agent: perso('agent-halte', { ...agent, miroir: true, reflets: [[2, -1.5, TEAL, 0.45]], nom: 'agent' }),
    porter: perso('locataire-fenetre', { ...porter, miroir: true, reflets: [[-2, -1.5, TEAL, 0.5]], nom: 'porter' }),
    hollis: perso('inspecteur-billet', { ...hollis, reflets: [[-3, -2, TEAL, 0.7], [2.5, -1.5, '#c9d6d0', 0.25]], nom: 'hollis' }),
    mcallister: perso('logeur-cahier', { ...mcallister, miroir: true, reflets: [[3, -1.5, AMBRE, 0.45], [-2.5, -2, TEAL, 0.55]], nom: 'mcallister' }),
    boyd: perso('soldat-assis', { ...boyd, miroir: true, reflets: [[-2.5, -2, TEAL, 0.6]], nom: 'boyd' }),
  };

  const contenu = `  <defs>
    <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9c6c2"/><stop offset="1" stop-color="#8a9c99"/>
    </linearGradient>
    <linearGradient id="badigeon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7c817a"/><stop offset="1" stop-color="#4f5550"/>
    </linearGradient>
    <linearGradient id="badigeonGauche" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#6b716b"/><stop offset="1" stop-color="#3c423e"/>
    </linearGradient>
    <linearGradient id="badigeonDroit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5f6560"/><stop offset="1" stop-color="#323834"/>
    </linearGradient>
    <linearGradient id="murGauche" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#2e2c28"/><stop offset="1" stop-color="#171715"/>
    </linearGradient>
    <linearGradient id="murDroit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a2925"/><stop offset="1" stop-color="#121211"/>
    </linearGradient>
    <linearGradient id="pave" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3c4442"/><stop offset="1" stop-color="#121615"/>
    </linearGradient>
    <linearGradient id="tunnel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0e0e"/><stop offset="1" stop-color="#1a201f"/>
    </linearGradient>
    <linearGradient id="brumeSol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a9bcb8" stop-opacity="0"/><stop offset="1" stop-color="#a9bcb8" stop-opacity="0.16"/>
    </linearGradient>
    <linearGradient id="brumeHaut" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9d6d0" stop-opacity="0.3"/><stop offset="1" stop-color="#c9d6d0" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="lueurBoutique" cx="0.5" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#e8b452" stop-opacity="0.55"/><stop offset="1" stop-color="#e8b452" stop-opacity="0"/>
    </radialGradient>
    ${VIGNETTE}
    ${FILTRES}
    ${SOL}
    <clipPath id="fenetreHaut"><rect x="${FENETRE_HAUT.x1 + 3}" y="${FENETRE_HAUT.y1 + 50}" width="${FENETRE_HAUT.x2 - FENETRE_HAUT.x1 - 6}" height="${FENETRE_HAUT.y2 - FENETRE_HAUT.y1 - 50}"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>

  <!-- ═══ Plan 1 : le ciel, la façade du fond ═══ -->
  ${ciel}
  ${facade}
  ${fenetresHaut}
  <!-- La locataire de la chambre du dessus, penchée à sa fenêtre, et son chaton -->
  <g id="porter-fenetre" clip-path="url(#fenetreHaut)">${personnages.porter}</g>
  <rect x="${FENETRE_HAUT.x1 - 12}" y="${FENETRE_HAUT.y2}" width="${FENETRE_HAUT.x2 - FENETRE_HAUT.x1 + 24}" height="9" fill="#3a3a34"/>
  ${chaton}

  <!-- Le passage voûté vers Dorset Street -->
  ${passage}
  <!-- La porte de la chambre 13, la pioche, les deux fenêtres -->
  ${porte}
  ${pioche}
  ${fenetre(VITRE_A, true, 'fenetre13')}
  ${fenetre(VITRE_B, false, 'fenetre13b')}
  ${boutique}
  ${robinet}
  ${poubelle}
  <!-- Le tonneau et The Morning Courier -->
  ${tonneau}

  <!-- ═══ Plan 2 : les murs de la cour, le sol ═══ -->
  ${murGauche}
  ${murDroit}
  <g clip-path="url(#sol)"><rect width="1600" height="900" filter="url(#taches)" opacity="0.35"/></g>
  ${sol}

  <!-- ═══ Plan 3 : les personnages ═══ -->
  <!-- Tim Bradford, au bout du passage, et l'agent qui le retient -->
  <ellipse cx="${tim.x}" cy="${tim.y}" rx="44" ry="5" fill="#000" opacity="0.4"/>
  ${personnages.tim}
  <ellipse cx="${agent.x}" cy="${agent.y}" rx="40" ry="5" fill="#000" opacity="0.4"/>
  ${personnages.agent}

  <!-- La veuve du n° 5, sur son seuil -->
  <ellipse cx="${cullen.x + 6}" cy="${cullen.y}" rx="60" ry="7" fill="#000" opacity="0.45"/>
  ${personnages.cullen}

  <!-- Le logeur, devant sa boutique, le cahier des loyers serré contre lui -->
  <ellipse cx="${mcallister.x - 8}" cy="${mcallister.y}" rx="80" ry="9" fill="#000" opacity="0.5"/>
  ${personnages.mcallister}

  <!-- L'inspecteur Hollis relit le billet du surintendant -->
  <ellipse cx="${hollis.x + 10}" cy="${hollis.y}" rx="90" ry="10" fill="#000" opacity="0.5"/>
  ${personnages.hollis}

  <!-- Le vieux soldat, assis sur une caisse, la tête basse -->
  <ellipse cx="${boyd.x - 10}" cy="${boyd.y}" rx="100" ry="11" fill="#000" opacity="0.5"/>
  ${caisse}
  ${personnages.boyd}

  <!-- ═══ Plan 4 : le jour gris, le brouillard ═══ -->
  <rect width="1600" height="400" fill="url(#brumeHaut)"/>
  <rect y="560" width="1600" height="340" fill="url(#brumeSol)"/>
  <rect width="1600" height="900" filter="url(#grain)" opacity="0.18"/>
  <rect width="1600" height="900" fill="url(#vignette)"/>`;

  ecrire('scene.svg', contenu, "La cour de Miller's Court, Dorset Street, Spitalfields, vendredi 9 novembre 1888, 13 h 25.");
  afficherCadres(cadres);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Scène 2 : le poste de Commercial Street, lundi 12 novembre, 18 h 05
// ═══════════════════════════════════════════════════════════════════════════════════════
{
  const { perso, defs: defsPersos, cadres } = creerPersos();
  const baird = { x: 1110, y: 700, s: echelle(700) }; // le sergent, derrière le comptoir, la déposition sous les mains
  const hutchings = { x: 700, y: 812, s: echelle(812) }; // l'ouvrier, devant le comptoir, qui raconte
  const tim = { x: 150, y: 600, s: 0.5 }; // Tim, dehors, derrière la vitre
  // le dessus du comptoir, à la hauteur des mains posées du sergent
  const PLATEAU = Math.round(baird.y + baird.s * reperes['agent-sergent'].mains.proche[1]) + 4;
  const mainsBaird = reperes['agent-sergent'].mains.proche.map((v, i) => (i ? baird.y + baird.s * v : baird.x - baird.s * v));
  const COMPTOIR = { x1: 760, x2: 1340, front: PLATEAU, sol: 724 };

  const poutres = [420, 610, 800, 990, 1180]
    .map((x) => {
      const loin = (dx) => num(F.x + (x + dx - F.x) * (330 / 280));
      return `<polygon points="${num(x - 10)},50 ${num(x + 10)},50 ${loin(16)},0 ${loin(-16)},0"/>`;
    })
    .join('');
  const piece = `<polygon points="163.6,0 260,50 1340,50 1436.4,0" fill="#0a100f"/>
  <g fill="#060a09">${poutres}</g>
  <rect x="260" y="50" width="1080" height="590" fill="url(#murFond)"/>
  <polygon points="0,${num(ym(0, 50))} 260,50 260,640 0,${num(ym(0, 640))}" fill="url(#murGauche)"/>
  <polygon points="1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640" fill="url(#murDroit)"/>
  <g clip-path="url(#murs)"><rect width="1600" height="640" filter="url(#taches)" opacity="0.6"/><rect width="1600" height="640" filter="url(#grain)" opacity="0.3"/></g>
  <polygon points="${quadMur(0, 260, 470, 640)}" fill="url(#boiserie)"/>
  <rect x="260" y="470" width="1080" height="170" fill="url(#boiserie)"/>
  <polygon points="${quadMur(1340, 1600, 470, 640)}" fill="url(#boiserie)"/>
  <g fill="#0a0f0e"><rect x="260" y="466" width="1080" height="6"/><rect x="260" y="622" width="1080" height="18"/><polygon points="${quadMur(0, 260, 622, 640)}"/><polygon points="${quadMur(1340, 1600, 622, 640)}"/></g>`;

  // la fenêtre du mur gauche : Commercial Street la nuit, un bec de gaz, et Tim derrière la vitre
  const fenetre = { a: [56, ym(56, 104)], b: [228, ym(228, 104)], c: [228, ym(228, 440)], d: [56, ym(56, 440)] };
  const rue = `<rect x="40" y="0" width="210" height="520" fill="url(#nuit)"/>
    <path d="M40 330 L120 316 L120 300 L180 300 L180 318 L250 326 L250 520 L40 520 Z" fill="#141f24"/>
    <g fill="#c9a24a" opacity="0.45"><rect x="70" y="340" width="6" height="9"/><rect x="204" y="344" width="5" height="9"/></g>
    <path d="M216 200 V470" stroke="#0e1416" stroke-width="5"/>
    <path d="M206 180 h20 l-3 22 h-14 Z" fill="#0e1416"/>
    <circle cx="216" cy="192" r="44" fill="url(#lueurRue)"/>`;

  // le tableau d'affichage : l'affiche de la grâce, la note sur Bennett, deux avis
  const tableau = `<rect x="296" y="186" width="290" height="246" fill="#2a2016"/>
    <rect x="304" y="194" width="274" height="230" fill="#4a3a28"/>
    <g id="affiche-grace">
      <rect x="314" y="202" width="122" height="196" fill="#cfc4a3"/>
      <text x="375" y="224" font-family="Georgia, serif" font-weight="bold" font-size="15" letter-spacing="1" fill="#2a241c" text-anchor="middle">MURDER</text>
      <path d="M326 231 H424" stroke="#2a241c" stroke-width="1"/>
      <text x="375" y="250" font-family="Georgia, serif" font-weight="bold" font-size="16" letter-spacing="1.5" fill="#2a241c" text-anchor="middle">PARDON</text>
      <path d="${lignesImprimees(324, 266, 102, 14, 7, 31)}" stroke="#4a4235" stroke-width="1.4"/>
      <text x="375" y="380" font-family="Georgia, serif" font-size="7" fill="#2a241c" text-anchor="middle">10th November, 1888.</text>
      <text x="375" y="391" font-family="Georgia, serif" font-size="6.4" font-style="italic" fill="#2a241c" text-anchor="middle">Whitehall</text>
      <circle cx="318" cy="206" r="2" fill="#2a2a24"/><circle cx="432" cy="206" r="2" fill="#2a2a24"/>
    </g>
    <g id="note-bennett" transform="rotate(3 498 262)">
      <rect x="452" y="214" width="96" height="104" fill="#ddd3b4"/>
      <path d="${ecriture(460, 232, 80, 8, 10, 41)}" fill="none" stroke="#1d1814" stroke-width="0.8"/>
      <circle cx="500" cy="218" r="2.4" fill="#a8322a"/>
    </g>
    <g fill="#bdb294"><rect x="456" y="336" width="54" height="74"/><rect x="520" y="344" width="50" height="62"/></g>
    <path d="${lignesImprimees(462, 350, 42, 7, 7, 43)}${lignesImprimees(526, 356, 38, 6, 7, 47)}" stroke="#5a5244" stroke-width="1.2"/>`;

  // l'horloge du poste : six heures cinq
  const horloge = (() => {
    const cx = 1240;
    const cy = 150;
    const aiguille = (deg, l) => `M${cx} ${cy} L${num(cx + l * Math.sin((deg * Math.PI) / 180))} ${num(cy - l * Math.cos((deg * Math.PI) / 180))}`;
    let marques = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      marques += `M${num(cx + 26 * Math.sin(a))} ${num(cy - 26 * Math.cos(a))} L${num(cx + 31 * Math.sin(a))} ${num(cy - 31 * Math.cos(a))} `;
    }
    return `<g id="horloge"><circle cx="${cx}" cy="${cy}" r="42" fill="#2a2016"/><circle cx="${cx}" cy="${cy}" r="35" fill="#d8cfb2"/>
      <path d="${marques}" stroke="#2a241c" stroke-width="2"/>
      <path d="${aiguille(182.5, 18)}" stroke="#14110c" stroke-width="3.4" stroke-linecap="round"/>
      <path d="${aiguille(30, 27)}" stroke="#14110c" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="2.6" fill="#14110c"/></g>`;
  })();

  // la porte des cellules, sur le mur droit, et le banc
  const porte = `<polygon points="${quadMur(1380, 1500, 150, 640)}" fill="#0a0f0e"/>
    <polygon points="${quadMur(1390, 1490, 164, 640)}" fill="#1a2220"/>
    <polygon points="${quadMur(1410, 1470, 230, 330)}" fill="#050707"/>
    <g stroke="#3a4442" stroke-width="3">${[1422, 1434, 1446, 1458].map((x) => `<path d="M${x} ${num(ym(x, 230))} L${x} ${num(ym(x, 330))}"/>`).join('')}</g>
    <circle cx="1484" cy="${num(ym(1484, 420))}" r="5" fill="#8a7440"/>`;
  const banc = `<rect x="606" y="560" width="140" height="10" fill="#2a2016"/><rect x="612" y="570" width="8" height="66" fill="#1a140e"/><rect x="732" y="570" width="8" height="66" fill="#1a140e"/>`;

  // le comptoir : le dessus, la façade à panneaux, la déposition, l'encrier, et le chapeau de l'ouvrier
  const comptoir = (() => {
    const { x1, x2, front, sol } = COMPTOIR;
    const [mx, my] = mainsBaird;
    return `<polygon points="${x1 + 16},${front - 26} ${x2},${front - 26} ${x2},${front} ${x1},${front}" fill="#4a3826"/>
      <rect x="${x1 - 4}" y="${front}" width="${x2 - x1 + 8}" height="12" fill="#2e2216"/>
      <path d="M${x1 - 4} ${front} H${x2 + 4}" stroke="#c9a46a" stroke-width="1.4" opacity="0.5"/>
      <rect x="${x1}" y="${front + 12}" width="${x2 - x1}" height="${sol - front - 12}" fill="#211810"/>
      <g fill="none" stroke="#120d08" stroke-width="3">${[0, 1, 2, 3, 4].map((i) => { const w = (x2 - x1 - 60) / 5; return `<rect x="${num(x1 + 20 + i * (w + 5))}" y="${front + 26}" width="${num(w)}" height="${sol - front - 44}"/>`; }).join('')}</g>
      <!-- la déposition, sous les mains du sergent -->
      <g id="deposition"><path d="M${num(mx - 70)} ${front - 4} L${num(mx - 18)} ${front - 4} L${num(mx - 10)} ${front - 22} L${num(mx - 60)} ${front - 22} Z" fill="#ddd3b4"/>
      <path d="M${num(mx - 64)} ${front - 8} L${num(mx - 22)} ${front - 8} M${num(mx - 62)} ${front - 12} L${num(mx - 20)} ${front - 12} M${num(mx - 60)} ${front - 16} L${num(mx - 18)} ${front - 16}" stroke="#3a3228" stroke-width="0.9"/>
      <path d="M${num(mx - 120)} ${front - 4} L${num(mx - 76)} ${front - 4} L${num(mx - 70)} ${front - 18} L${num(mx - 112)} ${front - 18} Z" fill="#cfc4a3"/></g>
      <!-- l'encrier et la plume -->
      <g id="encrier"><rect x="${num(mx + 14)}" y="${front - 16}" width="16" height="12" fill="#14110c"/><path d="M${num(mx + 22)} ${front - 16} L${num(mx + 34)} ${front - 40}" stroke="#2a241c" stroke-width="1.6"/></g>
      <!-- le chapeau de l'ouvrier, posé sur le comptoir : un chapeau mou noir à larges bords -->
      <g id="chapeau"><ellipse cx="1240" cy="${front - 7}" rx="40" ry="8" fill="#0b0d0d"/>
      <path d="M1216 ${front - 9} C1214 ${front - 30} 1224 ${front - 38} 1240 ${front - 38} C1256 ${front - 38} 1266 ${front - 30} 1264 ${front - 9} Z" fill="#101313"/>
      <path d="M1217 ${front - 16} C1230 ${front - 13} 1250 ${front - 13} 1263 ${front - 16}" stroke="#2c3433" stroke-width="3"/>
      <path d="M1202 ${front - 8} C1214 ${front - 4} 1266 ${front - 4} 1278 ${front - 8}" stroke="${TEAL}" stroke-width="1" opacity="0.4" fill="none"/></g>`;
  })();

  // la table de l'inspecteur, au premier plan : le dossier de l'enquête et le rapport du docteur
  const table = `<ellipse cx="400" cy="836" rx="200" ry="14" fill="#000" opacity="0.55"/>
    <polygon points="250,700 560,700 590,742 220,742" fill="#3a2c1e"/>
    <rect x="216" y="742" width="378" height="14" fill="#241a10"/>
    <g fill="#140e08"><rect x="232" y="756" width="16" height="80"/><rect x="562" y="756" width="16" height="80"/></g>
    <g id="dossier">
      <path d="M268 734 L376 734 L366 708 L272 708 Z" fill="#6a5434"/>
      <path d="M276 730 L322 730 L316 710 L280 710 Z" fill="#ddd3b4"/>
      <path d="M326 730 L372 730 L364 710 L322 710 Z" fill="#e2d8bc"/>
      <path d="M282 716 H312 M281 721 H314 M280 726 H316 M330 716 H360 M331 721 H362 M332 726 H364" stroke="#3a3228" stroke-width="0.8"/>
    </g>
    <g id="rapport" transform="rotate(-6 470 722)">
      <path d="M430 734 L508 734 L502 708 L436 708 Z" fill="#e2d8bc"/>
      <path d="M440 714 H498 M440 719 H500 M439 724 H500 M438 729 H480" stroke="#3a3228" stroke-width="0.8"/>
      <circle cx="494" cy="728" r="3.6" fill="#a8322a"/>
    </g>`;
  const chaise = `<path d="M600 770 L606 650 L616 650 L612 770 Z M590 770 L590 718 L660 718 L660 770 Z M594 770 V840 M656 770 V840" fill="#140e08" stroke="#140e08" stroke-width="6"/>`;

  const personnages = {
    tim: perso('journaliste-carnet', { ...tim, reflets: [[-2, -1.5, AMBRE, 0.5]], nom: 'tim' }),
    baird: perso('agent-sergent', { ...baird, miroir: true, reflets: [[-2.5, -2.5, AMBRE, 0.7], [2.5, -1.5, TEAL, 0.35]], nom: 'baird' }),
    hutchings: perso('ouvrier-explique', { ...hutchings, reflets: [[-3, -2, AMBRE, 0.6], [2.5, -1.5, TEAL, 0.4]], nom: 'hutchings' }),
  };

  const contenu = `  <defs>
    <linearGradient id="murFond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#26332f"/><stop offset="0.7" stop-color="#1e2b28"/><stop offset="1" stop-color="#172321"/>
    </linearGradient>
    <linearGradient id="murGauche" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#22302d"/><stop offset="1" stop-color="#121c1b"/>
    </linearGradient>
    <linearGradient id="murDroit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1f2d2a"/><stop offset="1" stop-color="#0d1615"/>
    </linearGradient>
    <linearGradient id="boiserie" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e1912"/><stop offset="1" stop-color="#120e0a"/>
    </linearGradient>
    <linearGradient id="plancher" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c211d"/><stop offset="1" stop-color="#060808"/>
    </linearGradient>
    <linearGradient id="nuit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c2b33"/><stop offset="0.6" stop-color="#2e4247"/><stop offset="1" stop-color="#3c5052"/>
    </linearGradient>
    <linearGradient id="brumeSol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7f9995" stop-opacity="0"/><stop offset="1" stop-color="#7f9995" stop-opacity="0.12"/>
    </linearGradient>
    <radialGradient id="gaz">
      <stop offset="0" stop-color="#ffd27a" stop-opacity="0.34"/><stop offset="0.45" stop-color="#f0b45a" stop-opacity="0.1"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lueurRue">
      <stop offset="0" stop-color="#f3d58e" stop-opacity="0.75"/><stop offset="0.3" stop-color="#d9b56a" stop-opacity="0.25"/><stop offset="1" stop-color="#9fbcb7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="flaque">
      <stop offset="0" stop-color="#e8b45a" stop-opacity="0.2"/><stop offset="1" stop-color="#e8b45a" stop-opacity="0"/>
    </radialGradient>
    ${VIGNETTE}
    ${FILTRES}
    <clipPath id="murs"><polygon points="0,${num(ym(0, 50))} 260,50 1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640 260,640 0,${num(ym(0, 640))}"/></clipPath>
    ${SOL}
    <clipPath id="fenetreClip"><polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}"/></clipPath>
    <clipPath id="derriereComptoir"><rect x="0" y="0" width="1600" height="${PLATEAU + 3}"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>

  <!-- ═══ Plan 1 : le poste, au gaz ═══ -->
  ${piece}

  <!-- La fenêtre : Commercial Street la nuit, et Tim Bradford derrière la vitre -->
  <g clip-path="url(#fenetreClip)">${rue}<g id="tim-vitre">${personnages.tim}</g><rect x="40" y="0" width="210" height="520" fill="#8fa9a5" opacity="0.1"/></g>
  <g fill="none" stroke="#0a0f0e">
    <polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}" stroke-width="12"/>
    <path d="M142 ${num(ym(142, 104))} L142 ${num(ym(142, 440))}" stroke-width="6"/>
    <path d="M56 ${num(ym(56, 272))} L228 ${num(ym(228, 272))}" stroke-width="6"/>
  </g>
  <polygon points="${quadMur(42, 242, 440, 454)}" fill="#141c1a"/>

  <!-- Le tableau d'affichage, l'horloge, le banc, la porte des cellules -->
  ${tableau}
  ${horloge}
  ${banc}
  ${porte}

  <!-- ═══ Plan 2 : le plancher ═══ -->
  <g clip-path="url(#sol)">
    <rect y="500" width="1600" height="400" fill="url(#plancher)"/>
    <path d="${(() => { let d = ''; for (let x = -1400; x <= 3000; x += 42) d += `M${num(x)} 640 L${num(F.x + (x - F.x) * (570 / 310))} 900 `; return d; })()}" stroke="#070b0a" stroke-width="2" opacity="0.85"/>
    <ellipse cx="1000" cy="770" rx="420" ry="100" fill="url(#flaque)"/>
  </g>

  <!-- ═══ Plan 3 : le comptoir, le sergent, l'ouvrier, la table ═══ -->
  <!-- Le sergent Baird écrit la déposition, derrière le comptoir -->
  <g clip-path="url(#derriereComptoir)">${personnages.baird}</g>
  ${comptoir}

  <!-- George Hutchings raconte, la main ouverte -->
  <ellipse cx="${hutchings.x + 10}" cy="${hutchings.y}" rx="80" ry="10" fill="#000" opacity="0.5"/>
  ${personnages.hutchings}

  <!-- La table de l'inspecteur : le dossier de l'enquête, le rapport du docteur -->
  ${chaise}
  ${table}

  <!-- La lampe à gaz au-dessus du comptoir -->
  ${lampe(1000, 110)}

  <!-- ═══ Plan 4 : lumière, brouillard ═══ -->
  <circle cx="1000" cy="110" r="480" fill="url(#gaz)"/>
  <rect y="600" width="1600" height="300" fill="url(#brumeSol)"/>
  <rect width="1600" height="900" fill="url(#vignette)"/>`;

  ecrire('poste.svg', contenu, 'Le poste de police de Commercial Street, Spitalfields, lundi 12 novembre 1888, 18 h 05.');
  console.log(`— poste — dessus du comptoir en y = ${PLATEAU}, mains du sergent en ${mainsBaird.map(Math.round)}`);
  afficherCadres(cadres);
}
