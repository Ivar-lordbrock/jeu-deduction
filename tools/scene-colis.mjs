// Scènes de l'affaire 5 : le colis « From hell ».
//   scene.svg : le salon de Joseph Larkin, Alderney Road, Mile End, jeudi 18 octobre 1888, 19 h.
//   musee.svg : le musée d'anatomie pathologique du London Hospital, vendredi 19 octobre 1888, 21 h.
// Même pièce en perspective que les autres affaires (voir scene-outils.mjs), même style de « silhouettes en
// couches », mais de nuit : le brouillard bleu-noir aux fenêtres, la lampe à pétrole et le gaz pour seules lumières.
// Les papiers (indices) restent clairs. Tout est dessiné ici : aucune image extérieure.
//
// Usage : node tools/scene-colis.mjs   (après npm run persos si les silhouettes ont changé)
//   → src/cases/05-colis-mile-end/scene.svg et musee.svg
//   et affiche les rectangles des personnages pour les zones de case.json.

import { writeFileSync } from 'node:fs';
import { AMBRE, F, TEAL, afficherCadres, creerPersos, echelle, num, pts, quadMur, reperes, ym } from './scene-outils.mjs';

const DOSSIER = new URL('../src/cases/05-colis-mile-end/', import.meta.url);

// ——— petits outils de dessin ———
/** générateur pseudo-aléatoire (toujours le même dessin) */
const hasard = (graine) => () => {
  graine = (graine * 16807) % 2147483647;
  return (graine - 1) / 2147483646;
};

/** une écriture à la main illisible : des boucles penchées, des mots, des lignes ; tremble = main maladroite */
function ecriture(x, y, largeur, lignes, pas, graine, retrait = 0, tremble = 0) {
  const r = hasard(graine);
  let d = '';
  for (let l = 0; l < lignes; l++) {
    let cx = x + (l === 0 ? retrait : 0);
    const fin = x + largeur * (l === lignes - 1 ? 0.55 : 0.88 + r() * 0.12);
    const cy0 = y + l * pas;
    while (cx < fin) {
      const mot = 2 + Math.floor(r() * 5);
      let cy = cy0 + (r() - 0.5) * tremble * 2;
      d += `M${num(cx)} ${num(cy)}`;
      for (let i = 0; i < mot && cx < fin; i++) {
        const h = 2.2 + r() * 2.6 + (r() < 0.15 ? 3 : 0) + r() * tremble;
        const w = 2.6 + r() * 1.6 + r() * tremble;
        d += ` q${num(w * 0.2)} ${num(-h * 1.4)} ${num(w * 0.7)} ${num(-h)} q${num(w * 0.3)} ${num(h * 0.9)} ${num(w * 0.3)} ${num(h + (r() - 0.5) * tremble)}`;
        cx += w;
      }
      cx += 3 + r() * 2 + tremble;
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

const lignesPlancher = () => {
  let d = '';
  for (let x = -1400; x <= 3000; x += 42) d += `M${num(x)} 640 L${num(F.x + (x - F.x) * (570 / 310))} 900 `;
  return d;
};
const poutres = [420, 610, 800, 990, 1180]
  .map((x) => {
    const loin = (dx) => num(F.x + (x + dx - F.x) * (330 / 280));
    return `<polygon points="${num(x - 10)},50 ${num(x + 10)},50 ${loin(16)},0 ${loin(-16)},0"/>`;
  })
  .join('');

/** la pièce nue : plafond, murs, plinthes ; couleurs de nuit */
const piece = (murs) => `<polygon points="163.6,0 260,50 1340,50 1436.4,0" fill="url(#plafond)"/>
  <g fill="#0b1312">${poutres}</g>
  <rect x="260" y="50" width="1080" height="590" fill="url(#murFond)"/>
  <polygon points="0,${num(ym(0, 50))} 260,50 260,640 0,${num(ym(0, 640))}" fill="url(#murGauche)"/>
  <polygon points="1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640" fill="url(#murDroit)"/>
  ${murs}
  <g clip-path="url(#murs)">
    <rect width="1600" height="640" filter="url(#taches)" opacity="0.6"/>
    <rect width="1600" height="640" filter="url(#grain)" opacity="0.3"/>
  </g>
  <g fill="#15211f">
    <rect x="260" y="50" width="1080" height="12"/>
    <polygon points="${quadMur(0, 260, 50, 62)}"/><polygon points="${quadMur(1340, 1600, 50, 62)}"/>
  </g>
  <path d="M260 50 V640 M1340 50 V640" stroke="#0f1a19" stroke-width="3" opacity="0.7"/>
  <path d="M1339 62 V640" stroke="#3d5753" stroke-width="2" opacity="0.3"/>`;

const DEFS_COMMUNES = `
    <linearGradient id="plafond" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#18231f"/><stop offset="1" stop-color="#080d0c"/>
    </linearGradient>
    <linearGradient id="plancher" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#18201d"/><stop offset="1" stop-color="#050808"/>
    </linearGradient>
    <linearGradient id="boiserie" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a211c"/><stop offset="1" stop-color="#0e1412"/>
    </linearGradient>
    <linearGradient id="nuit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c2b33"/><stop offset="0.6" stop-color="#2e4247"/><stop offset="1" stop-color="#3c5052"/>
    </linearGradient>
    <linearGradient id="brumeSol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7f9995" stop-opacity="0"/><stop offset="1" stop-color="#7f9995" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="coneLampe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd27a" stop-opacity="0.2"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/>
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
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.78">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.82"/>
    </radialGradient>
    <filter id="taches" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.011" numOctaves="3" seed="29"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.08  0 0 0 0 0.08  0 0 0 -2.4 1.36"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.8  0 0 0 0.5 -0.18"/>
    </filter>
    <filter id="flou" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <clipPath id="murs"><polygon points="0,${num(ym(0, 50))} 260,50 1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640 260,640 0,${num(ym(0, 640))}"/></clipPath>
    <clipPath id="sol"><polygon points="0,${num(ym(0, 640))} 260,640 1340,640 1600,${num(ym(1600, 640))} 1600,900 0,900"/></clipPath>`;

const plancher = (flaques) => `<g clip-path="url(#sol)">
    <rect y="500" width="1600" height="400" fill="url(#plancher)"/>
    <path d="${lignesPlancher()}" stroke="#070b0a" stroke-width="2" opacity="0.85"/>
    ${flaques}
  </g>
  <path d="M0 ${num(ym(0, 640))} L260 640 H1340 L1600 ${num(ym(1600, 640))}" fill="none" stroke="#3d5753" stroke-width="1.2" opacity="0.3"/>`;

function ecrire(nom, contenu, titre) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- ${titre} Généré par tools/scene-colis.mjs : ne pas modifier à la main.
       Décor et personnages dessinés pour le jeu (personnages : src/assets/silhouettes/persos). Les positions suivent les zones de case.json. -->
${contenu}
</svg>
`;
  if (/href="(?!#|data:image\/)/.test(svg)) throw new Error('la scène doit rester autonome');
  writeFileSync(new URL(nom, DOSSIER), svg);
  console.log(`${nom} : ${(svg.length / 1024).toFixed(0)} Ko`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Scène 1 : le salon de Joseph Larkin
// ═══════════════════════════════════════════════════════════════════════════════════════
{
  const { perso, defs: defsPersos, cadres } = creerPersos();
  const larkin = { x: 420, y: 780, s: echelle(780) }; // entre le fauteuil et la cheminée, il montre la fenêtre
  const harker = { x: 1090, y: 792, s: echelle(792) }; // le secrétaire, à droite de la table
  const adler = { x: 1262, y: 744, s: echelle(744) }; // le trésorier, devant la porte du vestibule
  const TABLE = { cx: 812, cy: 694, rx: 176, ry: 38, bas: 792 };
  // le guéridon est dessiné autour de (812, 694) puis agrandi pour que le colis se lise : un point (x, y) du dessin
  // est en (800 + 1.22 (x − 812), 700 + 1.22 (y − 694)) dans la scène
  const T_TABLE = 'translate(800 700) scale(1.22) translate(-812 -694)';

  // papier peint : un semis de fleurons sombres
  const papierPeint = `<pattern id="fleurons" patternUnits="userSpaceOnUse" width="44" height="52">
      <path d="M22 8 C26 16 30 18 34 18 C30 20 26 24 22 32 C18 24 14 20 10 18 C14 18 18 16 22 8 Z" fill="#2b3d38" opacity="0.7"/>
      <path d="M0 34 C3 39 5 40 8 40 C5 42 3 44 0 49 C-3 44 -5 42 -8 40 C-5 40 -3 39 0 34 Z M44 34 C47 39 49 40 52 40 C49 42 47 44 44 49 C41 44 39 42 36 40 C39 40 41 39 44 34 Z" fill="#2b3d38" opacity="0.6"/>
    </pattern>`;

  // la fenêtre du mur gauche : la rue dans le brouillard de la nuit, le réverbère, l'homme barbu
  const fenetre = { a: [56, ym(56, 104)], b: [228, ym(228, 104)], c: [228, ym(228, 440)], d: [56, ym(56, 440)] };
  const barbu = { x: 134, y: 404, s: 0.24 };
  const rue = `<rect x="40" y="0" width="210" height="500" fill="url(#nuit)"/>
    <g fill="#16232a"><path d="M40 300 L40 270 L84 252 L120 266 L120 258 L132 258 L132 268 L176 262 L176 250 L186 250 L186 264 L250 276 L250 470 L40 470 Z"/></g>
    <g fill="#c9a24a" opacity="0.5"><rect x="66" y="294" width="6" height="9"/><rect x="198" y="300" width="5" height="9"/></g>
    <path d="M40 404 L250 404 L250 480 L40 480 Z" fill="#1d2a2c"/>
    <g stroke="#2e3e40" stroke-width="1.2" opacity="0.8"><path d="M40 416 H250 M40 432 H250 M40 452 H250"/></g>
    <!-- le réverbère d'en face -->
    <rect x="171" y="300" width="3.4" height="104" fill="#0a1012"/>
    <path d="M164 300 L181 300 L178 286 L167 286 Z" fill="#0a1012"/>
    <rect x="167" y="288" width="11" height="10" fill="#f3d58e" opacity="0.9"/>
    <circle cx="172.5" cy="293" r="60" fill="url(#lueurRue)"/>
    <ellipse cx="160" cy="406" rx="48" ry="5" fill="#d9b56a" opacity="0.18"/>`;

  // le manteau de la cheminée, la glace, la pendule
  const cheminee = `<rect x="372" y="150" width="276" height="250" fill="#141c1a"/>
    <rect x="402" y="166" width="216" height="214" fill="#6a5a34"/>
    <rect x="410" y="174" width="200" height="198" fill="url(#glace)"/>
    <path d="M418 182 L470 182 L418 252 Z" fill="#fff" opacity="0.05"/>
    <path d="M402 166 H618 V380 H402 Z" fill="none" stroke="#b08a45" stroke-width="2" opacity="0.5"/>
    <rect x="362" y="392" width="296" height="13" fill="#2a2a24"/>
    <path d="M362 392 H658" stroke="#d9c79a" stroke-width="1.4" opacity="0.4"/>
    <rect x="378" y="405" width="34" height="235" fill="#1d2420"/><rect x="608" y="405" width="34" height="235" fill="#1d2420"/>
    <rect x="412" y="405" width="196" height="34" fill="#1d2420"/>
    <rect x="412" y="439" width="196" height="201" fill="#050707"/>
    <!-- la grille et les braises -->
    <path d="M440 620 H580 M446 604 H574 M452 588 H568" stroke="#1e1a16" stroke-width="5"/>
    <path d="M454 612 C474 596 494 604 510 594 C530 584 548 600 566 610 L566 622 L454 622 Z" fill="#8a2c14"/>
    <path d="M470 614 C482 606 494 610 506 604 C520 598 534 606 548 612" stroke="#f0903a" stroke-width="2.4" fill="none" opacity="0.8"/>
    <ellipse cx="510" cy="612" rx="90" ry="34" fill="#e8743a" opacity="0.14"/>
    <!-- la pendule de marbre noir, 7 heures passées -->
    <g id="pendule"><rect x="478" y="334" width="64" height="58" rx="4" fill="#0b0f0e"/>
    <path d="M472 334 H548 L540 324 H480 Z" fill="#0b0f0e"/>
    <circle cx="510" cy="360" r="17" fill="#d8ccaa"/>
    <circle cx="510" cy="360" r="17" fill="none" stroke="#b08a45" stroke-width="2"/>
    <path d="M510 360 L503 371 M510 360 L510.6 346" stroke="#1a1612" stroke-width="2.2" stroke-linecap="round"/></g>
    <!-- chandeliers -->
    <path d="M412 392 L408 360 L416 360 Z M608 392 L604 360 L612 360 Z" fill="#0b0f0e"/>
    <rect x="409" y="336" width="6" height="24" fill="#d8cdaa"/><rect x="605" y="336" width="6" height="24" fill="#d8cdaa"/>`;

  // la copie de l'affiche de la police (lettre « Dear Boss »), épinglée au mur par le comité
  const affiche = `<g id="affiche" transform="rotate(1.5 836 244)">
    <rect x="770" y="150" width="132" height="190" fill="#bdb393"/>
    <text x="836" y="168" font-family="Georgia, serif" font-size="7" letter-spacing="1.5" fill="#2a241c" text-anchor="middle">METROPOLITAN</text>
    <text x="836" y="184" font-family="Georgia, serif" font-size="13" font-weight="bold" letter-spacing="2" fill="#2a241c" text-anchor="middle">POLICE</text>
    <rect x="780" y="192" width="112" height="112" fill="#d9d0b5"/>
    <text x="786" y="206" font-family="'Segoe Print', 'Comic Sans MS', cursive" font-size="8.5" fill="#8f2a22">Dear Boss</text>
    <path d="${ecriture(786, 218, 100, 7, 10.4, 11, 10)}" fill="none" stroke="#8f2820" stroke-width="0.8" stroke-linecap="round"/>
    <text x="850" y="298" font-family="'Segoe Print', 'Comic Sans MS', cursive" font-size="6.5" fill="#8f2a22">Jack the Ripper</text>
    <path d="${lignesImprimees(782, 314, 108, 3, 6, 5)}" stroke="#4a4235" stroke-width="1.4"/>
    <circle cx="776" cy="156" r="2.4" fill="#6e2a22"/><circle cx="896" cy="156" r="2.4" fill="#6e2a22"/>
  </g>`;

  // un portrait encadré : l'entreprise Larkin, « Builder & Decorator »
  const cadreMur = `<g id="cadre"><rect x="952" y="176" width="150" height="104" fill="#3a2e1a"/>
    <rect x="962" y="186" width="130" height="84" fill="#9a906f"/>
    <text x="1027" y="214" font-family="Georgia, serif" font-size="10" letter-spacing="1.2" fill="#2a241c" text-anchor="middle">J. LARKIN</text>
    <text x="1027" y="230" font-family="Georgia, serif" font-size="7" letter-spacing="1" fill="#2a241c" text-anchor="middle">BUILDER &amp; DECORATOR</text>
    <path d="M980 244 H1074 M992 254 H1062" stroke="#4a4235" stroke-width="1.2"/></g>`;

  // la porte du vestibule, entrouverte sur le noir
  const porte = `<rect x="1150" y="150" width="172" height="490" fill="#0c1110"/>
    <rect x="1164" y="164" width="144" height="476" fill="#040606"/>
    <path d="M1164 164 L1220 182 L1220 640 L1164 640 Z" fill="#1a221f"/>
    <path d="M1172 200 L1212 212 L1212 380 L1172 372 Z M1172 410 L1212 418 L1212 610 L1172 606 Z" fill="none" stroke="#0a0f0e" stroke-width="3"/>
    <circle cx="1208" cy="420" r="4" fill="#b08a45"/>
    <!-- les manteaux du comité, accrochés dans le vestibule -->
    <path d="M1262 220 C1250 250 1248 320 1254 380 L1290 380 C1294 320 1290 250 1276 220 Z" fill="#0d1312"/>`;

  // le guéridon : nappe à franges, lampe à pétrole, le carton, le papier brun, la lettre
  const table = (() => {
    const { cx, cy, rx, ry, bas } = TABLE;
    let franges = '';
    for (let x = cx - rx + 6; x < cx + rx - 4; x += 7) {
      const y = bas - 6 - Math.pow((x - cx) / rx, 2) * 18;
      franges += `M${num(x)} ${num(y)} v8 `;
    }
    return `<g id="nappe" transform="${T_TABLE}"><ellipse cx="${cx}" cy="${bas + 6}" rx="${rx + 30}" ry="16" fill="#000" opacity="0.55"/>
    <path d="M${cx - rx} ${cy} C${cx - rx - 4} ${cy + 40} ${cx - rx + 4} ${bas - 30} ${cx - rx + 8} ${bas - 4} C${cx - 60} ${bas + 10} ${cx + 60} ${bas + 10} ${cx + rx - 8} ${bas - 4} C${cx + rx - 4} ${bas - 30} ${cx + rx + 4} ${cy + 40} ${cx + rx} ${cy} Z" fill="#3a1714"/>
    <path d="M${cx - rx + 30} ${cy + 20} C${cx - rx + 26} ${cy + 60} ${cx - rx + 34} ${bas - 20} ${cx - rx + 40} ${bas} M${cx - 40} ${cy + 36} C${cx - 44} ${cy + 70} ${cx - 42} ${bas - 10} ${cx - 40} ${bas + 6} M${cx + 60} ${cy + 34} C${cx + 64} ${cy + 70} ${cx + 62} ${bas - 10} ${cx + 64} ${bas + 4}" stroke="#220c0a" stroke-width="3" fill="none"/>
    <path d="${franges}" stroke="#7a4a2a" stroke-width="1.4" opacity="0.7"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#4a1e19"/>
    <path d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}" fill="none" stroke="${AMBRE}" stroke-width="1.4" opacity="0.45"/>
    </g>
    <g id="colis" transform="${T_TABLE}">
    <!-- le papier brun déplié, la ficelle coupée -->
    <path d="M676 690 L752 680 L768 708 L690 718 Z" fill="#8a6a44"/>
    <path d="M676 690 L752 680 L758 690 L682 700 Z" fill="#9c7a50"/>
    <path d="M690 704 C710 700 730 712 760 700" stroke="#c9b48a" stroke-width="1.2" fill="none"/>
    <rect x="732" y="684" width="9" height="11" fill="#7a2a2a" transform="rotate(-8 736 690)"/>
    <rect x="743" y="683" width="9" height="11" fill="#7a2a2a" transform="rotate(-8 747 689)"/>
    <circle cx="726" cy="694" r="7" fill="none" stroke="#2a241c" stroke-width="1" opacity="0.8"/>
    <path d="${ecriture(694, 708, 46, 1, 6, 77)}" fill="none" stroke="#1d1814" stroke-width="0.8"/>
    <!-- le petit carton ouvert, son couvercle posé à côté -->
    <path d="M772 650 L812 645 L820 660 L780 666 Z" fill="#b09a72"/>
    <path d="M794 668 L834 662 L834 682 L794 688 Z" fill="#a08a62"/>
    <path d="M794 668 L834 662 L842 676 L842 694 L802 700 L794 688 Z" fill="#8f7a55"/>
    <path d="M796 670 L832 665 L838 675 L802 681 Z" fill="#2a2216"/>
    <path d="M802 672 C808 668 818 667 826 670 C830 674 826 678 818 678 C812 679 806 678 802 676 Z" fill="#4a2620"/>
    <path d="M806 672 C812 670 818 670 822 672" stroke="#c9a87a" stroke-width="0.8" fill="none" opacity="0.6"/>
    <ellipse cx="818" cy="674" rx="18" ry="5" fill="#d9c27a" opacity="0.12"/>
    <!-- la lettre, pliée en quatre puis rouverte -->
    <path d="M862 686 L912 680 L918 716 L866 722 Z" fill="#ddd3b6"/>
    <path d="M887 683 L892 719" stroke="#a89c7c" stroke-width="0.8"/>
    <path d="${ecriture(868, 694, 44, 5, 5.2, 66, 0, 0.8)}" fill="none" stroke="#1d1814" stroke-width="0.7" transform="rotate(-6 890 700)"/>
    </g>
    <g id="lampe" transform="${T_TABLE}">
    <!-- la lampe à pétrole -->
    <ellipse cx="936" cy="680" rx="22" ry="6" fill="#0b0f0e"/>
    <path d="M924 678 C920 660 928 650 936 650 C944 650 952 660 948 678 Z" fill="#1b2422"/>
    <rect x="930" y="636" width="12" height="14" fill="#0b0f0e"/>
    <path d="M928 636 C924 620 928 600 932 594 L940 594 C944 600 948 620 944 636 Z" fill="#f3d58e" opacity="0.5"/>
    <path d="M934 630 C932 622 934 612 936 608 C938 612 940 622 938 630 Z" fill="#ffe7a8"/></g>`;
  })();

  // le fauteuil, au premier plan à gauche, et le journal posé dessus
  const fauteuil = `<ellipse cx="220" cy="886" rx="150" ry="14" fill="#000" opacity="0.6"/>
    <path d="M86 640 C80 610 96 590 128 588 L300 596 C328 598 340 618 336 648 L330 760 L94 752 Z" fill="#1e0f0d"/>
    <path d="M72 720 C66 700 76 684 96 684 L330 690 C352 692 360 708 356 728 L346 860 L82 852 Z" fill="#2a1411"/>
    <path d="M60 700 C52 690 54 670 72 668 C90 668 98 680 98 700 L96 860 L66 858 Z M326 704 C322 690 330 676 346 676 C364 678 370 692 366 708 L356 864 L326 862 Z" fill="#190b09"/>
    <path d="M100 716 L328 722" stroke="#4a221c" stroke-width="2" opacity="0.7"/>
    <g fill="#3a1a14">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${130 + i * 42}" cy="${620 + (i % 2) * 6}" r="3"/>`).join('')}</g>
    <!-- The Daily Ledger, plié sur le siège -->
    <g id="journal"><path d="M140 712 L282 702 L296 744 L148 758 Z" fill="#c9bf9e"/>
    <path d="M140 712 L282 702 L284 708 L142 718 Z" fill="#d6cdae"/>
    <text x="214" y="716" font-family="Georgia, serif" font-weight="bold" font-size="10" fill="#2a241c" text-anchor="middle" transform="rotate(-4 214 716)">THE DAILY LEDGER</text>
    <path d="${lignesImprimees(152, 726, 64, 4, 6, 31)}" stroke="#5c5444" stroke-width="1.2" transform="rotate(-4 200 736)"/>
    <path d="${lignesImprimees(222, 722, 64, 4, 6, 37)}" stroke="#5c5444" stroke-width="1.2" transform="rotate(-4 250 732)"/></g>`;

  // le secrétaire (bureau) au premier plan à droite : le tiroir tiré, les lettres, le carnet
  const bureau = `<ellipse cx="1470" cy="890" rx="150" ry="12" fill="#000" opacity="0.6"/>
    <rect x="1336" y="660" width="264" height="24" fill="#1a1310"/>
    <path d="M1336 660 H1600" stroke="${AMBRE}" stroke-width="1.6" opacity="0.4"/>
    <rect x="1350" y="684" width="250" height="210" fill="#120d0b"/>
    <rect x="1362" y="696" width="226" height="40" fill="#0c0807"/>
    <!-- le tiroir tiré (tout entier, avec son contenu : la passe IA le recolle tel quel), éclairé par la lampe -->
    <g id="tiroir">
      <path d="M1352 728 L1592 728 L1600 776 L1344 776 Z" fill="#4a3424"/>
      <path d="M1352 728 L1592 728" stroke="${AMBRE}" stroke-width="1.4" opacity="0.5"/>
      <path d="M1360 732 L1584 732 L1590 770 L1354 770 Z" fill="#1e140e"/>
      <path d="M1376 748 L1442 742 L1446 766 L1380 770 Z" fill="#cfc4a3" transform="rotate(-4 1410 756)"/>
      <path d="M1450 744 L1508 740 L1510 762 L1452 766 Z" fill="#d8cdaa" transform="rotate(5 1480 752)"/>
      <path d="${ecriture(1382, 752, 54, 2, 6, 91)}" fill="none" stroke="#1d1814" stroke-width="0.7" transform="rotate(-4 1410 756)"/>
      <path d="${ecriture(1456, 750, 46, 2, 6, 93)}" fill="none" stroke="#1d1814" stroke-width="0.7" transform="rotate(5 1480 752)"/>
      <rect x="1520" y="740" width="44" height="26" fill="#3e2a1e" transform="rotate(-6 1542 752)"/>
      <rect x="1526" y="744" width="32" height="18" fill="#d6cbad" transform="rotate(-6 1542 752)"/>
      <rect x="1344" y="776" width="256" height="26" fill="#3a2819"/>
      <path d="M1344 776 H1600" stroke="${AMBRE}" stroke-width="1.6" opacity="0.55"/>
      <circle cx="1470" cy="789" r="4" fill="#b08a45"/>
    </g>
    <g fill="none" stroke="#0a0706" stroke-width="3"><rect x="1366" y="800" width="214" height="80"/></g>`;

  // tapis sous le guéridon
  const tapis = `<polygon points="430,706 1200,706 1380,890 230,890" fill="#2a1210"/>
    <polygon points="452,714 1180,714 1352,882 258,882" fill="none" stroke="#5a2a1a" stroke-width="4" opacity="0.7"/>
    <polygon points="476,724 1158,724 1320,872 290,872" fill="none" stroke="#6e3a22" stroke-width="1.6" opacity="0.5"/>`;

  const personnages = {
    larkin: perso('president-montre', { ...larkin, miroir: true, reflets: [[3, -2, AMBRE, 0.75], [-2.5, -1.5, TEAL, 0.35]], nom: 'larkin' }),
    harker: perso('secretaire-note', { ...harker, miroir: true, reflets: [[-3, -2, AMBRE, 0.7], [2.5, -1.5, TEAL, 0.3]], nom: 'harker' }),
    adler: perso('tresorier-registre', { ...adler, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.55], [2.5, -2, TEAL, 0.3]], nom: 'adler' }),
    barbu: perso('barbu-guette', { ...barbu, ombre: '#05090b', nom: 'barbu' }),
  };

  const contenu = `  <defs>${DEFS_COMMUNES}
    <linearGradient id="murFond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#22322e"/><stop offset="0.7" stop-color="#1c2a27"/><stop offset="1" stop-color="#162220"/>
    </linearGradient>
    <linearGradient id="murGauche" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#1f2e2b"/><stop offset="1" stop-color="#111b1a"/>
    </linearGradient>
    <linearGradient id="murDroit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1d2b28"/><stop offset="1" stop-color="#0c1514"/>
    </linearGradient>
    <linearGradient id="glace" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#34494a"/><stop offset="1" stop-color="#162222"/>
    </linearGradient>
    <radialGradient id="lampe" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffd890" stop-opacity="0.42"/><stop offset="0.4" stop-color="#e8b45a" stop-opacity="0.14"/><stop offset="1" stop-color="#e8b45a" stop-opacity="0"/>
    </radialGradient>
    ${papierPeint}
    <clipPath id="fenetreClip"><polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>

  <!-- ═══ Plan 1 : la pièce, dans la nuit ═══ -->
  ${piece(`<rect x="260" y="62" width="1080" height="408" fill="url(#fleurons)"/>
  <polygon points="${quadMur(0, 260, 62, 470)}" fill="url(#fleurons)" opacity="0.6"/>
  <polygon points="${quadMur(1340, 1600, 62, 470)}" fill="url(#fleurons)" opacity="0.5"/>`)}

  <!-- La fenêtre : la rue, le réverbère d'en face, et l'homme barbu qui regarde la maison -->
  <g clip-path="url(#fenetreClip)">
    ${rue}
    ${personnages.barbu}
    <rect x="40" y="0" width="210" height="500" fill="#8fa9a5" opacity="0.08"/>
  </g>
  <g fill="none" stroke="#0a0f0e">
    <polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}" stroke-width="12"/>
    <path d="M142 ${num(ym(142, 104))} L142 ${num(ym(142, 440))}" stroke-width="7"/>
    <path d="M56 ${num(ym(56, 262))} L228 ${num(ym(228, 262))}" stroke-width="7"/>
  </g>
  <!-- rideaux de velours -->
  <polygon points="${quadMur(22, 64, 84, 470)}" fill="#3a1210"/>
  <polygon points="${quadMur(216, 252, 84, 470)}" fill="#3a1210"/>
  <path d="M30 ${num(ym(30, 90))} C40 ${num(ym(40, 260))} 34 ${num(ym(34, 380))} 44 ${num(ym(44, 470))} M232 ${num(ym(232, 90))} C226 ${num(ym(226, 260))} 238 ${num(ym(238, 380))} 230 ${num(ym(230, 470))}" stroke="#220a08" stroke-width="3" fill="none"/>
  <polygon points="${quadMur(40, 240, 440, 454)}" fill="#141c1a"/>

  <!-- La cheminée, la glace et la pendule -->
  ${cheminee}

  <!-- La copie de l'affiche « Dear Boss » et le cadre de l'entreprise -->
  ${affiche}
  ${cadreMur}

  <!-- La porte du vestibule -->
  ${porte}

  <!-- ═══ Plan 2 : boiseries, plancher, tapis ═══ -->
  <rect x="260" y="470" width="102" height="170" fill="url(#boiserie)"/>
  <rect x="658" y="470" width="492" height="170" fill="url(#boiserie)"/>
  <rect x="1322" y="470" width="18" height="170" fill="url(#boiserie)"/>
  <polygon points="${quadMur(0, 260, 470, 640)}" fill="url(#boiserie)"/>
  <polygon points="${quadMur(1340, 1600, 470, 640)}" fill="url(#boiserie)"/>
  <g fill="none" stroke="#0a0f0d" stroke-width="3">
    ${[[680, 780], [800, 900], [920, 1020], [1040, 1130]].map(([a, b]) => `<rect x="${a}" y="486" width="${b - a}" height="118"/>`).join('')}
  </g>
  <g fill="#1d2622"><rect x="658" y="462" width="492" height="9"/><polygon points="${quadMur(0, 260, 462, 471)}"/><polygon points="${quadMur(1340, 1600, 462, 471)}"/></g>
  <g fill="#0a0f0e"><rect x="260" y="622" width="1080" height="18"/><polygon points="${quadMur(0, 260, 622, 640)}"/><polygon points="${quadMur(1340, 1600, 622, 640)}"/></g>
  ${plancher(`<ellipse cx="812" cy="770" rx="460" ry="120" fill="url(#flaque)"/><ellipse cx="510" cy="660" rx="200" ry="40" fill="#e8743a" opacity="0.06"/>`)}
  <rect x="352" y="640" width="316" height="22" fill="#1b1b18"/>
  ${tapis}

  <!-- ═══ Plan 3 : meubles et personnages ═══ -->
  <!-- William Harker, le secrétaire : lunettes rondes, il note la séance -->
  <ellipse cx="${num(harker.x - 10)}" cy="${harker.y}" rx="66" ry="9" fill="#000" opacity="0.5"/>
  ${personnages.harker}

  <!-- Joseph Adler, le trésorier : haut-de-forme, pardessus, le livre de comptes -->
  <ellipse cx="${num(adler.x - 6)}" cy="${adler.y}" rx="60" ry="8" fill="#000" opacity="0.5"/>
  ${personnages.adler}

  <!-- Le guéridon : le carton, la lettre, le papier d'emballage, la lampe -->
  ${table}

  <!-- Joseph Larkin montre la fenêtre : grosse moustache, rosette du comité -->
  <ellipse cx="${num(larkin.x - 10)}" cy="${larkin.y}" rx="90" ry="11" fill="#000" opacity="0.55"/>
  ${personnages.larkin}

  <!-- Le fauteuil et le journal -->
  ${fauteuil}

  <!-- Le bureau et son tiroir ouvert -->
  ${bureau}

  <!-- ═══ Plan 4 : lumière, brouillard ═══ -->
  <circle cx="951" cy="597" r="480" fill="url(#lampe)"/>
  <circle cx="951" cy="597" r="170" fill="url(#gaz)"/>
  <ellipse cx="510" cy="600" rx="200" ry="120" fill="#e8743a" opacity="0.05"/>
  <rect y="600" width="1600" height="300" fill="url(#brumeSol)"/>
  <rect width="1600" height="900" fill="url(#vignette)"/>`;

  ecrire('scene.svg', contenu, 'Chez Joseph Larkin, Alderney Road, Mile End, jeudi 18 octobre 1888, 19 h.');
  console.log('— salon —');
  afficherCadres(cadres);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Scène 2 : le musée d'anatomie pathologique du London Hospital
// ═══════════════════════════════════════════════════════════════════════════════════════
{
  const { perso, defs: defsPersos, cadres } = creerPersos();
  const oldfield = { x: 600, y: 806, s: echelle(806) }; // derrière la table, penché sur le rein, à la loupe
  const tim = { x: 1252, y: 800, s: echelle(800) }; // le reporter du Comet, près de la porte
  // le bord avant de la table, à la hauteur de la main posée du docteur
  const PLATEAU = Math.round(oldfield.y + oldfield.s * reperes['conservateur-loupe'].mains.loin[1]) + 8;
  const loupe = reperes['conservateur-loupe'].mains.proche.map((v, i) => (i ? oldfield.y : oldfield.x) + oldfield.s * (v + [32, 33][i]));
  const TABLE = { x1: 470, x2: 1150, fond: PLATEAU - 40, sol: 812 };

  // les étagères de bocaux : des pièces dans l'alcool ambré, chacune avec son étiquette
  const etageres = (() => {
    const r = hasard(53);
    const x0 = 392;
    const x1 = 1328;
    const rangs = [150, 250, 350, 450, 556];
    let planches = '';
    let bocaux = '';
    let reflets = '';
    let etiquettes = '';
    for (const y of rangs) {
      planches += `<rect x="${x0 - 8}" y="${y}" width="${x1 - x0 + 16}" height="9"/>`;
      let x = x0 + 6;
      while (x < x1 - 30) {
        const w = 24 + r() * 26;
        const h = 40 + r() * 42;
        const top = y - h;
        const liquide = top + 6 + r() * 6;
        bocaux += `<rect x="${num(x)}" y="${num(top)}" width="${num(w)}" height="${num(h)}" rx="3" fill="#1b2a28"/>`;
        bocaux += `<rect x="${num(x + 2)}" y="${num(liquide)}" width="${num(w - 4)}" height="${num(y - liquide - 2)}" rx="2" fill="#7a5a22" opacity="${num(0.45 + r() * 0.3)}"/>`;
        const cx = x + w / 2;
        const cy = liquide + (y - liquide) * 0.5;
        const t = Math.min(w, y - liquide) * 0.32;
        bocaux += `<path d="M${num(cx - t)} ${num(cy)} C${num(cx - t)} ${num(cy - t * 1.2)} ${num(cx + t * 0.6)} ${num(cy - t * 1.1)} ${num(cx + t)} ${num(cy - t * 0.2)} C${num(cx + t * 1.1)} ${num(cy + t)} ${num(cx - t * 0.4)} ${num(cy + t * 1.2)} ${num(cx - t)} ${num(cy)} Z" fill="#2a120e" opacity="0.85"/>`;
        bocaux += `<rect x="${num(x - 1)}" y="${num(top - 5)}" width="${num(w + 2)}" height="6" rx="1" fill="#0b0f0e"/>`;
        reflets += `<path d="M${num(x + 4)} ${num(top + 6)} V${num(y - 6)}" />`;
        if (r() < 0.75) etiquettes += `<rect x="${num(x + w * 0.2)}" y="${num(y - h * 0.42)}" width="${num(w * 0.6)}" height="${num(8 + r() * 4)}"/>`;
        x += w + 6 + r() * 8;
      }
    }
    return `<rect x="${x0 - 14}" y="70" width="${x1 - x0 + 28}" height="500" fill="#0e1514"/>
      <g fill="#1d1712">${planches}</g>
      ${bocaux}
      <g stroke="#e8d7a0" stroke-width="1.4" opacity="0.22">${reflets}</g>
      <g fill="#cfc4a3" opacity="0.75">${etiquettes}</g>`;
  })();

  // le règlement, cloué à gauche des étagères
  const reglement = `<g id="reglement"><rect x="278" y="250" width="92" height="132" fill="#c4ba99"/>
    <text x="324" y="268" font-family="Georgia, serif" font-size="7.5" font-weight="bold" letter-spacing="0.8" fill="#2a241c" text-anchor="middle">DISSECTING</text>
    <text x="324" y="278" font-family="Georgia, serif" font-size="7.5" font-weight="bold" letter-spacing="0.8" fill="#2a241c" text-anchor="middle">ROOM</text>
    <path d="M288 284 H360" stroke="#2a241c" stroke-width="0.8"/>
    <path d="${lignesImprimees(286, 296, 76, 11, 7, 17)}" stroke="#4a4235" stroke-width="1.3"/>
    <circle cx="282" cy="254" r="2" fill="#2a2a24"/><circle cx="366" cy="254" r="2" fill="#2a2a24"/></g>`;

  // la fenêtre du mur gauche : la cour de l'hôpital, un arbre nu, la lune dans le brouillard
  const fenetre = { a: [50, ym(50, 90)], b: [222, ym(222, 90)], c: [222, ym(222, 460)], d: [50, ym(50, 460)] };
  const cour = `<rect x="30" y="0" width="210" height="520" fill="url(#nuit)"/>
    <circle cx="170" cy="190" r="22" fill="#d8dfd0" opacity="0.5"/>
    <circle cx="170" cy="190" r="70" fill="#c9d6d0" opacity="0.08"/>
    <path d="M30 360 L90 340 L90 300 L150 300 L150 344 L240 330 L240 520 L30 520 Z" fill="#141f24"/>
    <g fill="#e9d79c" opacity="0.4"><rect x="104" y="316" width="6" height="10"/><rect x="128" y="316" width="6" height="10"/></g>
    <path d="M70 520 L74 380 C70 340 60 320 44 300 M74 400 C90 370 110 360 130 344 M73 430 C60 410 46 400 36 396 M100 366 C104 350 102 336 96 322" stroke="#0a1114" stroke-width="5" fill="none" stroke-linecap="round"/>`;

  // la porte du musée, sur le mur droit, et sa plaque de cuivre
  const porte = `<polygon points="${quadMur(1352, 1452, 158, 640)}" fill="#0a0f0e"/>
    <polygon points="${quadMur(1362, 1442, 172, 640)}" fill="#141c1a"/>
    <polygon points="${quadMur(1370, 1434, 190, 380)}" fill="none" stroke="#0a0f0e" stroke-width="3"/>
    <polygon points="${quadMur(1370, 1434, 410, 620)}" fill="none" stroke="#0a0f0e" stroke-width="3"/>
    <polygon id="plaque" points="${quadMur(1376, 1428, 330, 362)}" fill="#a8873e"/>
    <circle cx="1434" cy="${num(ym(1434, 420))}" r="5" fill="#b08a45"/>`;

  // la vitrine du squelette, au bout du mur droit
  const vitrine = (() => {
    const x1 = 1478;
    const x2 = 1592;
    const os = (x, h) => [x, ym(x, h)];
    const cx = (x1 + x2) / 2;
    const P = (dx, h) => os(cx + dx, h);
    const ligne = (...ps) => `M${ps.map((p) => `${num(p[0])} ${num(p[1])}`).join(' L')}`;
    return `<polygon points="${quadMur(x1 - 8, x2 + 8, 110, 640)}" fill="#0b100f"/>
      <polygon points="${quadMur(x1, x2, 124, 620)}" fill="#1a2726"/>
      <g stroke="#bdb59a" stroke-linecap="round" fill="none" opacity="0.8">
        <path d="${ligne(P(0, 210), P(0, 400))}" stroke-width="4"/>
        <path d="${ligne(P(-22, 236), P(22, 236))} ${ligne(P(-24, 254), P(24, 254))} ${ligne(P(-24, 272), P(24, 272))} ${ligne(P(-22, 290), P(22, 290))} ${ligne(P(-18, 308), P(18, 308))}" stroke-width="2.6"/>
        <path d="${ligne(P(-24, 228), P(-30, 300), P(-30, 370))} ${ligne(P(24, 228), P(30, 300), P(32, 370))}" stroke-width="3"/>
        <path d="${ligne(P(-18, 400), P(-20, 500), P(-20, 600))} ${ligne(P(18, 400), P(20, 500), P(22, 600))}" stroke-width="3.6"/>
        <path d="${ligne(P(-22, 392), P(22, 392), P(18, 412), P(-18, 412))}Z" stroke-width="3"/>
      </g>
      <ellipse cx="${num(P(0, 188)[0])}" cy="${num(P(0, 188)[1])}" rx="14" ry="17" fill="#c9c1a4" opacity="0.85"/>
      <g fill="#0b100f"><circle cx="${num(P(-5, 186)[0])}" cy="${num(P(-5, 186)[1])}" r="3.6"/><circle cx="${num(P(5, 186)[0])}" cy="${num(P(5, 186)[1])}" r="3.6"/></g>
      <polygon points="${quadMur(x1 + 26, x2 - 26, 560, 576)}" fill="#cfc4a3" opacity="0.8"/>
      <polygon points="${quadMur(x1, x2, 124, 620)}" fill="#9fbcb7" opacity="0.07"/>
      <path d="M${x1 + 14} ${num(ym(x1 + 14, 130))} L${x1 + 30} ${num(ym(x1 + 30, 300))}" stroke="#e9f4f1" stroke-width="2" opacity="0.2"/>`;
  })();

  // la grande table : plateau de marbre, le plat de porcelaine et le demi-rein, le carton, le carnet, le journal
  const table = (() => {
    const { x1, x2, fond, sol } = TABLE;
    const av = PLATEAU;
    const ep = 16;
    const [lx, ly] = loupe;
    return `<ellipse cx="${(x1 + x2) / 2}" cy="${sol + 4}" rx="${(x2 - x1) / 2 + 40}" ry="14" fill="#000" opacity="0.55"/>
      <polygon points="${x1 + 30},${fond} ${x2 - 30},${fond} ${x2},${av} ${x1},${av}" fill="#8e928a"/>
      <polygon points="${x1 + 30},${fond} ${x2 - 30},${fond} ${x2},${av} ${x1},${av}" fill="url(#marbre)"/>
      <rect x="${x1 - 4}" y="${av}" width="${x2 - x1 + 8}" height="${ep}" fill="#4a4e48"/>
      <path d="M${x1 - 4} ${av} H${x2 + 4}" stroke="#d8dccf" stroke-width="1.6" opacity="0.6"/>
      <!-- le bas de la table : une ceinture à tiroirs et quatre pieds tournés ; on voit les jambes du docteur dessous -->
      <rect x="${x1 + 8}" y="${av + ep}" width="${x2 - x1 - 16}" height="34" fill="#141b19"/>
      <g fill="none" stroke="#080c0b" stroke-width="2.5">${[0, 1, 2, 3].map((i) => { const w = (x2 - x1 - 60) / 4; return `<rect x="${num(x1 + 24 + i * (w + 4))}" y="${av + ep + 6}" width="${num(w)}" height="22"/>`; }).join('')}</g>
      <g fill="#a8873e">${[0, 1, 2, 3].map((i) => { const w = (x2 - x1 - 60) / 4; return `<rect x="${num(x1 + 24 + i * (w + 4) + w / 2 - 9)}" y="${av + ep + 15}" width="18" height="4" rx="2"/>`; }).join('')}</g>
      <g fill="#0f1514">
        <path d="M${x1 + 14} ${av + ep + 34} h26 l-4 ${sol - av - ep - 34} h-18 Z M${x2 - 40} ${av + ep + 34} h26 l-4 ${sol - av - ep - 34} h-18 Z"/>
        <rect x="${x1 + 40}" y="${sol - 70}" width="40" height="10"/><rect x="${x2 - 80}" y="${sol - 70}" width="40" height="10"/>
      </g>
      <!-- le plat de porcelaine sous la loupe, et le demi-rein -->
      <g id="rein"><ellipse cx="${num(lx + 6)}" cy="${num(av - 12)}" rx="40" ry="10" fill="#d9ddd2"/>
      <ellipse cx="${num(lx + 6)}" cy="${num(av - 13)}" rx="30" ry="6.5" fill="#b9beb2"/>
      <path d="M${num(lx - 12)} ${num(av - 14)} C${num(lx - 10)} ${num(av - 22)} ${num(lx + 18)} ${num(av - 24)} ${num(lx + 24)} ${num(av - 15)} C${num(lx + 18)} ${num(av - 10)} ${num(lx)} ${num(av - 9)} ${num(lx - 12)} ${num(av - 14)} Z" fill="#4a2620"/>
      <path d="M${num(lx - 4)} ${num(av - 17)} C${num(lx + 4)} ${num(av - 20)} ${num(lx + 14)} ${num(av - 20)} ${num(lx + 18)} ${num(av - 16)}" stroke="#a87a62" stroke-width="1" fill="none" opacity="0.6"/></g>
      <!-- le carton du colis, vide, et son couvercle -->
      <g id="carton"><path d="M${num(lx + 70)} ${num(av - 26)} L${num(lx + 108)} ${num(av - 30)} L${num(lx + 108)} ${num(av - 10)} L${num(lx + 70)} ${num(av - 6)} Z" fill="#a08a62"/>
      <path d="M${num(lx + 70)} ${num(av - 26)} L${num(lx + 108)} ${num(av - 30)} L${num(lx + 114)} ${num(av - 22)} L${num(lx + 76)} ${num(av - 18)} Z" fill="#2a2216"/>
      <path d="M${num(lx + 118)} ${num(av - 10)} L${num(lx + 156)} ${num(av - 14)} L${num(lx + 162)} ${num(av - 4)} L${num(lx + 124)} ${num(av)} Z" fill="#b09a72"/></g>
      <!-- le microscope, au bout gauche de la table -->
      <g fill="#0b100f">
        <ellipse cx="${x1 + 40}" cy="${av - 6}" rx="26" ry="6"/>
        <path d="M${x1 + 34} ${av - 8} L${x1 + 38} ${av - 60} L${x1 + 50} ${av - 60} L${x1 + 46} ${av - 8} Z"/>
        <path d="M${x1 + 24} ${av - 30} H${x1 + 58} V${av - 24} H${x1 + 24} Z"/>
        <path d="M${x1 + 30} ${av - 112} L${x1 + 46} ${av - 116} L${x1 + 54} ${av - 54} L${x1 + 40} ${av - 52} Z"/>
      </g>
      <path d="M${x1 + 32} ${av - 110} L${x1 + 42} ${av - 54}" stroke="#b08a45" stroke-width="1.4" opacity="0.6"/>
      <!-- le carnet du docteur, ouvert -->
      <g id="carnet"><path d="M${x1 + 70} ${av - 18} L${x1 + 130} ${av - 24} L${x1 + 134} ${av - 4} L${x1 + 66} ${av + 2} Z" fill="#e2d8bc"/>
      <path d="M${x1 + 100} ${av - 21} L${x1 + 100} ${av - 1}" stroke="#8a7a60" stroke-width="1.2"/>
      <path d="${ecriture(x1 + 74, av - 14, 22, 3, 4.4, 101)}" fill="none" stroke="#1d1814" stroke-width="0.7"/>
      <path d="${ecriture(x1 + 104, av - 16, 24, 3, 4.4, 103)}" fill="none" stroke="#1d1814" stroke-width="0.7"/></g>
      <!-- The Comet, froissé, jeté au bout de la table -->
      <g id="comet"><path d="M${x2 - 70} ${av - 14} L${x2 - 4} ${av - 26} L${x2 + 4} ${av - 2} L${x2 - 62} ${av + 4} Z" fill="#c9bf9e"/>
      <path d="M${x2 - 50} ${av - 16} L${x2 - 36} ${av} M${x2 - 24} ${av - 22} L${x2 - 18} ${av - 2}" stroke="#8d8468" stroke-width="1.2"/>
      <text x="${x2 - 36}" y="${av - 14}" font-family="Georgia, serif" font-weight="bold" font-size="8" fill="#2a241c" text-anchor="middle" transform="rotate(-9 ${x2 - 36} ${av - 14})">THE COMET</text></g>
      <path d="M${x1 + 30} ${fond} H${x2 - 30}" stroke="${TEAL}" stroke-width="1" opacity="0.25"/>`;
  })();

  const lampe = (x, y) => `<g id="lampe-gaz"><path d="M${x} 0 V${y - 26}" stroke="#0b1211" stroke-width="3"/>
    <path d="M${x - 6} ${y - 26} h12 l-2 10 h-8 Z" fill="#0b1211"/>
    <path d="M${x - 44} ${y} C${x - 40} ${y - 14} ${x - 20} ${y - 18} ${x - 8} ${y - 18} L${x + 8} ${y - 18} C${x + 20} ${y - 18} ${x + 40} ${y - 14} ${x + 44} ${y} Z" fill="#26302b"/>
    <ellipse cx="${x}" cy="${y + 1}" rx="44" ry="4.5" fill="#ffe2a0"/>
    <!-- le bec de gaz sous l'abat-jour : une tige de laiton, un petit brûleur, une flamme nue -->
    <rect x="${x - 1.5}" y="${y + 1}" width="3" height="22" fill="#6a5a34"/>
    <path d="M${x - 5} ${y + 22} h10 l-2 5 h-6 Z" fill="#8a7440"/>
    <circle cx="${x}" cy="${y + 12}" r="16" fill="#ffd27a" opacity="0.25"/>
    <path d="M${x} ${y + 22} C${x - 6} ${y + 18} ${x - 5} ${y + 10} ${x} ${y + 2} C${x + 5} ${y + 10} ${x + 6} ${y + 18} ${x} ${y + 22} Z" fill="#ffc64a"/>
    <path d="M${x} ${y + 21} C${x - 3} ${y + 18} ${x - 2.5} ${y + 13} ${x} ${y + 8} C${x + 2.5} ${y + 13} ${x + 3} ${y + 18} ${x} ${y + 21} Z" fill="#fff4d0"/></g>`;

  const personnages = {
    oldfield: perso('conservateur-loupe', { ...oldfield, reflets: [[-2.5, -2.5, AMBRE, 0.8], [2.5, -1.5, TEAL, 0.35]], nom: 'oldfield' }),
    tim: perso('journaliste-interroge', { ...tim, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.5], [2.5, -2, TEAL, 0.4]], nom: 'tim' }),
  };

  const contenu = `  <defs>${DEFS_COMMUNES}
    <linearGradient id="murFond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#25332f"/><stop offset="0.7" stop-color="#1d2a27"/><stop offset="1" stop-color="#172321"/>
    </linearGradient>
    <linearGradient id="murGauche" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#22302d"/><stop offset="1" stop-color="#121c1b"/>
    </linearGradient>
    <linearGradient id="murDroit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1f2d2a"/><stop offset="1" stop-color="#0d1615"/>
    </linearGradient>
    <linearGradient id="marbre" x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0" stop-color="#6f746c"/><stop offset="0.5" stop-color="#a4a89c"/><stop offset="1" stop-color="#5f645d"/>
    </linearGradient>
    <clipPath id="fenetreClip"><polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>

  <!-- ═══ Plan 1 : la salle, dans la nuit ═══ -->
  ${piece('')}

  <!-- La fenêtre : la cour de l'hôpital, un arbre nu, la lune dans le brouillard -->
  <g clip-path="url(#fenetreClip)">${cour}<rect x="30" y="0" width="210" height="520" fill="#8fa9a5" opacity="0.07"/></g>
  <g fill="none" stroke="#0a0f0e">
    <polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}" stroke-width="12"/>
    <path d="M136 ${num(ym(136, 90))} L136 ${num(ym(136, 460))}" stroke-width="6"/>
    <path d="M50 ${num(ym(50, 220))} L222 ${num(ym(222, 220))} M50 ${num(ym(50, 340))} L222 ${num(ym(222, 340))}" stroke-width="6"/>
  </g>
  <polygon points="${quadMur(36, 236, 460, 474)}" fill="#141c1a"/>
  <polygon points="${pts([222, 90], [222, 460], [520, 900], [880, 900])}" fill="#c9d6d0" opacity="0.025"/>

  <!-- Les étagères de bocaux du musée -->
  ${etageres}

  <!-- Le règlement de la salle de dissection -->
  ${reglement}

  <!-- La porte et la vitrine du squelette, sur le mur droit -->
  ${porte}
  ${vitrine}

  <!-- ═══ Plan 2 : armoires basses et plancher ═══ -->
  <rect x="378" y="565" width="964" height="75" fill="#0f1514"/>
  <g fill="none" stroke="#080c0b" stroke-width="3">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${388 + i * 118}" y="575" width="106" height="56"/>`).join('')}</g>
  <polygon points="${quadMur(0, 260, 470, 640)}" fill="url(#boiserie)"/>
  <rect x="260" y="470" width="118" height="170" fill="url(#boiserie)"/>
  <g fill="#0a0f0e"><rect x="260" y="622" width="1080" height="18"/><polygon points="${quadMur(0, 260, 622, 640)}"/><polygon points="${quadMur(1340, 1600, 622, 640)}"/></g>
  ${plancher(`<ellipse cx="860" cy="780" rx="420" ry="100" fill="url(#flaque)"/>`)}
  <path d="M860 120 L560 900 L1160 900 Z" fill="url(#coneLampe)"/>

  <!-- ═══ Plan 3 : la table et les personnages ═══ -->
  <!-- Tim Bradford, du Comet, son carnet à la main -->
  <ellipse cx="${num(tim.x - 6)}" cy="${tim.y}" rx="80" ry="10" fill="#000" opacity="0.5"/>
  ${personnages.tim}

  <!-- Le docteur Thomas Oldfield, penché sur le rein, la loupe à la main -->
  <ellipse cx="${num(oldfield.x + 40)}" cy="${oldfield.y}" rx="80" ry="10" fill="#000" opacity="0.5"/>
  ${personnages.oldfield}
  ${table}

  <!-- La lampe à gaz au-dessus de la table -->
  ${lampe(860, 120)}

  <!-- ═══ Plan 4 : lumière, brouillard ═══ -->
  <circle cx="860" cy="120" r="460" fill="url(#gaz)"/>
  <rect y="600" width="1600" height="300" fill="url(#brumeSol)"/>
  <rect width="1600" height="900" fill="url(#vignette)"/>`;

  ecrire('musee.svg', contenu, "Le musée d'anatomie pathologique du London Hospital, Whitechapel Road, vendredi 19 octobre 1888, 21 h.");
  console.log(`— musée — plateau de la table en y = ${PLATEAU}, loupe en ${loupe.map(Math.round)}`);
  afficherCadres(cadres);
}
