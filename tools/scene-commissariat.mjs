// Scène de l'affaire 1 : le poste de police de Leman Street, dimanche 30 septembre 1888, 7 h 05.
// Une pièce vue en perspective (point de fuite au centre), dessinée pour le jeu, en « silhouettes en couches » :
// le mur du fond est clair dans le brouillard, les meubles plus sombres, les personnages presque noirs,
// liserés par la lumière du gaz (ambre) et du jour (vert-bleu). Les papiers (indices) restent clairs.
//
// Usage : node tools/scene-commissariat.mjs   (après npm run persos si les silhouettes ont changé)
//   → src/cases/01-leman-street/scene.svg (autonome : images en base64, aucun fichier extérieur)
//   et affiche les rectangles des personnages pour les zones de case.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { AMBRE, F, TEAL, creerPersos, echelle, gx, gy, num, pts, quadMur, reperes, symbole, ym } from './scene-outils.mjs';

const ICI = new URL('./scene-commissariat/', import.meta.url);
const SORTIE = new URL('../src/cases/01-leman-street/scene.svg', import.meta.url);

const { perso, defs: defsPersos, cadres } = creerPersos();

// ——— placements ———
const coyle = { x: 165, y: 760, s: echelle(760) }; // assise sur le banc, contre le mur gauche
const hale = { x: 590, y: 0, s: 0.7 }; // derrière le comptoir : ses poings reposent sur le plateau
const COMPTOIR = 414; // dessus du plateau
hale.y = COMPTOIR - 4 - hale.s * reperes['agent-sergent'].mains.proche[1];
const harrow = { x: 1245, y: 800, s: 1 };
const pell = { x: 1478, y: 792, s: echelle(792) };

// banc le long du mur gauche : son assise est à la hauteur de celle de Mrs Coyle
const kC = (coyle.y - F.y) / 310; // profondeur de ses pieds
const ySiege = coyle.y + coyle.s * reperes['temoin-assise'].assise; // dessous de ses cuisses, dans la scène
const hAssise = F.y + (ySiege - F.y) / kC;
const kB = 1.1;
const kA = 1.55;

// ——— dessin ———
const lignesPlancher = () => {
  let d = '';
  for (let x = -1400; x <= 3000; x += 42) d += `M${num(x)} 640 L${num(F.x + (x - F.x) * (570 / 310))} 900 `;
  return d;
};
const joints = () => {
  let d = '';
  const rangs = [1.05, 1.13, 1.23, 1.35, 1.49, 1.66, 1.84];
  rangs.forEach((k, j) => {
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
const panneauxFond = [[272, 382], [396, 506], [520, 630], [644, 754], [768, 878], [892, 996], [1164, 1250], [1262, 1330]]
  .map(([a, b]) => `<rect x="${a}" y="484" width="${b - a}" height="118"/>`)
  .join('');
const panneauxGauche = [[10, 86], [100, 168], [182, 250]].map(([a, b]) => `<polygon points="${quadMur(a, b, 484, 602)}"/>`).join('');
const panneauxDroite = [[1346, 1384], [1560, 1600]].map(([a, b]) => `<polygon points="${quadMur(a, b, 484, 602)}"/>`).join('');

const fenetre = { a: [70, ym(70, 100)], b: [230, ym(230, 100)], c: [230, ym(230, 420)], d: [70, ym(70, 420)] };
const porte = { x1: 1392, x2: 1548 };
const vitre = quadMur(porte.x1, porte.x2, 200, 390);

const banc = (() => {
  const hb = hAssise + 10;
  const dessus = pts([gx(50, kB), gy(hAssise, kB)], [gx(135, kB), gy(hAssise, kB)], [gx(135, kA), gy(hAssise, kA)], [gx(50, kA), gy(hAssise, kA)]);
  const chant = pts([gx(135, kB), gy(hAssise, kB)], [gx(135, kA), gy(hAssise, kA)], [gx(135, kA), gy(hb, kA)], [gx(135, kB), gy(hb, kB)]);
  const bout = pts([gx(50, kA), gy(hAssise, kA)], [gx(135, kA), gy(hAssise, kA)], [gx(135, kA), gy(hb, kA)], [gx(50, kA), gy(hb, kA)]);
  const dossier = pts([gx(46, kB), gy(468, kB)], [gx(46, kA), gy(468, kA)], [gx(46, kA), gy(496, kA)], [gx(46, kB), gy(496, kB)]);
  const pied = (d, k) => `<rect x="${num(gx(d, k) - 5 * k)}" y="${num(gy(hb, k))}" width="${num(10 * k)}" height="${num(gy(640, k) - gy(hb, k))}"/>`;
  const montant = (k) => `<rect x="${num(gx(46, k) - 4 * k)}" y="${num(gy(496, k))}" width="${num(8 * k)}" height="${num(gy(hAssise, k) - gy(496, k))}"/>`;
  return `<g>
    <polygon points="${pts([gx(40, kB), gy(640, kB)], [gx(150, kB), gy(640, kB)], [gx(150, kA), gy(640, kA)], [gx(40, kA), gy(640, kA)])}" fill="#000" opacity="0.35"/>
    <g fill="#0c1514">${pied(128, 1.16)}${pied(128, 1.5)}${pied(58, 1.5)}${montant(1.18)}${montant(1.5)}</g>
    <polygon points="${dossier}" fill="#14211f"/>
    <path d="M${num(gx(46, kB))} ${num(gy(468, kB))} L${num(gx(46, kA))} ${num(gy(468, kA))}" stroke="${TEAL}" stroke-width="1.4" opacity="0.4"/>
    <polygon points="${dessus}" fill="#1c2c2a"/>
    <polygon points="${chant}" fill="#111c1b"/>
    <polygon points="${bout}" fill="#0f1918"/>
    <path d="M${num(gx(135, kB))} ${num(gy(hAssise, kB))} L${num(gx(135, kA))} ${num(gy(hAssise, kA))}" stroke="${TEAL}" stroke-width="1.5" opacity="0.45"/>
  </g>`;
})();

const personnages = {
  hale: perso('agent-sergent', { ...hale, reflets: [[-2.5, -2, TEAL, 0.45], [3, -1.5, AMBRE, 0.7]], nom: 'hale' }),
  coyle: perso('temoin-assise', { ...coyle, reflets: [[-2.5, -2, TEAL, 0.6], [3, -1, AMBRE, 0.5]], nom: 'coyle' }),
  harrow: perso('commissaire-brandit', { ...harrow, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.7], [2.5, -2, TEAL, 0.45]], nom: 'harrow' }),
  pell: perso('journaliste-billet', { ...pell, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.6], [2.5, -2, TEAL, 0.55]], nom: 'pell' }),
  agentDehors: perso('agent-ronde', { x: 1545, y: 560, s: 0.55, miroir: true, ombre: '#4d6461', nom: 'agent-dehors' }),
};

const fenetreRue = readFileSync(new URL('fenetre.jpg', ICI)).toString('base64');
const gravure = readFileSync(new URL('gravure.jpg', ICI)).toString('base64');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- Commissariat de Leman Street, dimanche 30 septembre 1888, 7 h 05. Généré par tools/scene-commissariat.mjs : ne pas modifier à la main.
       Décor dessiné pour le jeu, en perspective ; personnages : src/assets/silhouettes/persos (dessinés pour le jeu).
       Rue par la fenêtre : « Bluegate Fields », gravure au mur : « The Bull's-Eye », Gustave Doré, London, a Pilgrimage (1872), domaine public ;
       silhouettes de la rue : Openclipart (CC0). Les positions suivent les zones de case.json. -->
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
    <linearGradient id="couloir" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#1b2b29"/><stop offset="1" stop-color="#0b1312"/>
    </linearGradient>
    <linearGradient id="fogOut" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b3c4bf"/><stop offset="1" stop-color="#7d9590"/>
    </linearGradient>
    <linearGradient id="fogVeil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c2d1cc" stop-opacity="0.4"/><stop offset="0.6" stop-color="#a9bcb7" stop-opacity="0.25"/><stop offset="1" stop-color="#8fa6a1" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="vitrePorte" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a6b9b4"/><stop offset="1" stop-color="#6f8984"/>
    </linearGradient>
    <linearGradient id="brumeSol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fa9a5" stop-opacity="0"/><stop offset="1" stop-color="#8fa9a5" stop-opacity="0.18"/>
    </linearGradient>
    <linearGradient id="rayonFenetre" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d7e6e2" stop-opacity="0.16"/><stop offset="1" stop-color="#d7e6e2" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="gaz">
      <stop offset="0" stop-color="#ffd27a" stop-opacity="0.34"/><stop offset="0.45" stop-color="#f0b45a" stop-opacity="0.12"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lampe">
      <stop offset="0" stop-color="#ffe2a0" stop-opacity="0.5"/><stop offset="0.35" stop-color="#f0b45a" stop-opacity="0.14"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="flaque">
      <stop offset="0" stop-color="#e8b45a" stop-opacity="0.17"/><stop offset="1" stop-color="#e8b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="jourPorte">
      <stop offset="0" stop-color="#bcd2cc" stop-opacity="0.16"/><stop offset="1" stop-color="#bcd2cc" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="streetLamp">
      <stop offset="0" stop-color="#fff2c4" stop-opacity="0.95"/><stop offset="0.3" stop-color="#f3d58a" stop-opacity="0.4"/><stop offset="1" stop-color="#f3d58a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.8">
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/>
    </radialGradient>
    <!-- taches d'humidité et grain du plâtre -->
    <filter id="taches" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.011" numOctaves="3" seed="11"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.07  0 0 0 0 0.12  0 0 0 0 0.11  0 0 0 -2.4 1.32"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.8  0 0 0 0.5 -0.18"/>
    </filter>
    <!-- gravures teintées : brouillard dehors, encre sur papier au mur -->
    <filter id="fogTint" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.5 0 0 0 0.3  0.5 0 0 0 0.37  0.5 0 0 0 0.35  0 0 0 1 0"/>
    </filter>
    <filter id="inkTint" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.66 0 0 0 0.165  0.64 0 0 0 0.141  0.54 0 0 0 0.11  0 0 0 1 0"/>
    </filter>
    <filter id="frost" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <clipPath id="murs"><polygon points="0,${num(ym(0, 50))} 260,50 1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640 260,640 0,${num(ym(0, 640))}"/></clipPath>
    <clipPath id="sol"><polygon points="0,${num(ym(0, 640))} 260,640 1340,640 1600,${num(ym(1600, 640))} 1600,900 0,900"/></clipPath>
    <clipPath id="fenetreClip"><polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}"/></clipPath>
    <clipPath id="vitreClip"><polygon points="${vitre}"/></clipPath>
    <clipPath id="derriereComptoir"><rect x="0" y="0" width="1600" height="${COMPTOIR + 2}"/></clipPath>
    <clipPath id="ouverture"><rect x="1014" y="172" width="132" height="468"/></clipPath>
    ${['fiacre:0', 'reverbere:1', 'gentleman', 'monsieur-3', 'monsieur-7'].map((s) => symbole(...s.split(':').map((v, i) => (i ? +v : v)))).join('\n    ')}
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
  <!-- corniche, cimaise, angles des murs -->
  <g fill="#1f3331">
    <rect x="260" y="50" width="1080" height="12"/>
    <polygon points="${quadMur(0, 260, 50, 62)}"/><polygon points="${quadMur(1340, 1600, 50, 62)}"/>
  </g>
  <g fill="none" stroke="#22383a" stroke-width="4">
    <path d="M260 112 H1340 M0 ${num(ym(0, 112))} L260 112 M1340 112 L1600 ${num(ym(1600, 112))}"/>
  </g>
  <path d="M260 116 H1340" stroke="#4a6a66" stroke-width="1" opacity="0.55"/>
  <path d="M260 50 V640 M1340 50 V640" stroke="#162523" stroke-width="3" opacity="0.7"/>
  <path d="M261 62 V640" stroke="#1a2b29" stroke-width="6" opacity="0.6"/>
  <path d="M1339 62 V640" stroke="#4b6763" stroke-width="2" opacity="0.35"/>

  <!-- Fenêtre, sur le mur gauche : la rue dans le brouillard de l'aube (Doré, Bluegate Fields),
       le fiacre, le réverbère, la foule et un crieur de journaux. -->
  <g clip-path="url(#fenetreClip)">
    <!-- la rue n'est pas dans le plan du mur : on la voit de face, la fenêtre la découpe -->
    <g transform="translate(19 ${num(fenetre.a[1])}) scale(${num((fenetre.d[1] - fenetre.a[1]) / 330)}) translate(-60 -90)">
      <rect x="60" y="90" width="200" height="330" fill="url(#fogOut)"/>
      <image href="data:image/jpeg;base64,${fenetreRue}" x="60" y="90" width="200" height="330" preserveAspectRatio="xMidYMid slice" filter="url(#fogTint)" opacity="0.9"/>
      <rect x="60" y="90" width="200" height="330" fill="url(#fogVeil)"/>
      <rect x="60" y="250" width="200" height="34" fill="#c8d6d2" opacity="0.28"/>
      <use href="#s-fiacre" x="70" y="276" width="118" height="67" fill="#5d7570"/>
      <rect x="60" y="300" width="200" height="40" fill="#c8d6d2" opacity="0.22"/>
      <circle cx="214" cy="196" r="70" fill="url(#streetLamp)"/>
      <use href="#s-reverbere" x="194" y="168" width="54" height="252" fill="#3a4d4b"/>
      <rect x="211" y="191" width="9" height="11" fill="#fff3c4"/>
      <g fill="#2e3f3d">
        <use href="#s-gentleman" x="64" y="322" width="34" height="130"/>
        <use href="#s-monsieur-3" x="96" y="338" width="40" height="116"/>
        <use href="#s-monsieur-7" x="146" y="332" width="62" height="114"/>
        <use href="#s-monsieur-3" width="36" height="104" transform="translate(262 352) scale(-1 1)"/>
        <rect x="60" y="396" width="200" height="30"/>
      </g>
      <g transform="rotate(-10 142 318)">
        <rect x="130" y="308" width="24" height="17" fill="#ddd2b0"/>
        <path d="M134 314 H150 M134 319 H146" stroke="#7a705a" stroke-width="1.2"/>
      </g>
    </g>
    <polygon points="${pts(fenetre.a, [150, ym(150, 100)], [70, ym(70, 260)])}" fill="#fff" opacity="0.06"/>
  </g>
  <g fill="none" stroke="#0c1514">
    <polygon points="${pts(fenetre.a, fenetre.b, fenetre.c, fenetre.d)}" stroke-width="14"/>
    <path d="M150 ${num(ym(150, 100))} L150 ${num(ym(150, 420))}" stroke-width="8"/>
    <path d="M70 ${num(ym(70, 255))} L230 ${num(ym(230, 255))}" stroke-width="8"/>
  </g>
  <polygon points="${quadMur(52, 246, 420, 436)}" fill="#142120"/>
  <path d="M52 ${num(ym(52, 420))} L246 ${num(ym(246, 420))}" stroke="#8fa9a5" stroke-width="1.5" opacity="0.5"/>

  <!-- Pèlerines et casque au portemanteau -->
  <rect x="264" y="126" width="72" height="7" fill="#101a19"/>
  <g fill="#121d1c">
    <path d="M276 132 C262 150 258 230 266 318 L300 322 C304 240 300 160 284 132 Z"/>
    <path d="M314 132 C300 152 298 236 306 304 L336 300 C340 230 334 158 322 132 Z"/>
  </g>
  <path d="M276 132 C262 150 258 230 266 318" fill="none" stroke="#6f8b86" stroke-width="1.4" opacity="0.5"/>
  <path d="M305 124 Q304 98 320 94 Q336 98 335 124 Z" fill="#0c1514"/>
  <rect x="300" y="122" width="40" height="5" rx="2" fill="#0a1211"/>

  <!-- Gravure du London Pictorial punaisée au mur : The Bull's-Eye de Doré -->
  <g transform="rotate(-2 425 220)">
    <rect x="335" y="145" width="180" height="152" fill="#d3c8a5"/>
    <text x="425" y="160" font-family="Georgia, serif" font-size="10" fill="#2a241c" text-anchor="middle" letter-spacing="1.2">THE LONDON PICTORIAL</text>
    <line x1="345" y1="165" x2="505" y2="165" stroke="#2a241c" stroke-width="1"/>
    <image href="data:image/jpeg;base64,${gravure}" x="347" y="171" width="156" height="96" preserveAspectRatio="xMidYMid slice" filter="url(#inkTint)"/>
    <rect x="347" y="171" width="156" height="96" fill="none" stroke="#3a3226" stroke-width="1.5"/>
    <text x="425" y="280" font-family="Georgia, serif" font-size="9" font-style="italic" fill="#2a241c" text-anchor="middle">Whitechapel by night</text>
    <text x="440" y="292" font-family="'Segoe Print', 'Comic Sans MS', cursive" font-size="9" fill="#4a3a2a" text-anchor="middle" transform="rotate(-3 440 290)">Et toujours rien !</text>
    <circle cx="425" cy="150" r="3" fill="#8a2a22"/>
  </g>

  <!-- Affiches de police au-dessus du comptoir -->
  <g transform="rotate(1.5 606 182)">
    <rect x="566" y="130" width="80" height="102" fill="#b8ad8c"/>
    <text x="606" y="148" font-family="Georgia, serif" font-size="12" font-weight="bold" fill="#2a241c" text-anchor="middle" letter-spacing="1">POLICE</text>
    <text x="606" y="160" font-family="Georgia, serif" font-size="8" fill="#2a241c" text-anchor="middle" letter-spacing="1.5">NOTICE</text>
    <path d="M574 166 H638" stroke="#2a241c" stroke-width="1"/>
    <path d="M576 174 H636 M576 181 H636 M576 188 H630 M576 195 H636 M576 202 H624 M576 212 H636 M576 219 H616" stroke="#5c5444" stroke-width="1.5"/>
    <circle cx="606" cy="134" r="2.5" fill="#8a2a22"/>
  </g>
  <g transform="rotate(4 680 182)">
    <rect x="656" y="150" width="48" height="62" fill="#a99f82"/>
    <path d="M662 160 H698 M662 167 H698 M662 174 H690 M662 181 H698 M662 188 H684" stroke="#5c5444" stroke-width="1.3"/>
    <circle cx="680" cy="154" r="2.2" fill="#8a2a22"/>
  </g>

  <!-- Casiers et pendule derrière le comptoir -->
  <rect x="720" y="230" width="170" height="190" fill="#172625" stroke="#0b1413" stroke-width="4"/>
  <g stroke="#0b1413" stroke-width="4">
    <line x1="777" y1="230" x2="777" y2="420"/><line x1="833" y1="230" x2="833" y2="420"/>
    <line x1="720" y1="293" x2="890" y2="293"/><line x1="720" y1="356" x2="890" y2="356"/>
  </g>
  <path d="M720 230 H890" stroke="#b08a45" stroke-width="2" opacity="0.6"/>
  <g fill="#b3a98a" opacity="0.85">
    <rect x="730" y="268" width="38" height="20"/><rect x="842" y="262" width="40" height="26"/>
    <rect x="786" y="330" width="40" height="22"/><rect x="730" y="392" width="40" height="24"/><rect x="845" y="398" width="34" height="18"/>
    <rect x="790" y="270" width="34" height="18" transform="rotate(-6 807 279)"/>
  </g>
  <g fill="#0d1615"><rect x="732" y="318" width="34" height="34"/><rect x="848" y="320" width="30" height="32" rx="3"/></g>
  <circle cx="805" cy="160" r="44" fill="#101a19"/>
  <circle cx="805" cy="160" r="44" fill="none" stroke="#b08a45" stroke-width="1.5" opacity="0.5"/>
  <circle cx="805" cy="160" r="36" fill="#d8cdaa"/>
  <g stroke="#2a2018" stroke-width="2">
    <line x1="805" y1="127" x2="805" y2="133"/><line x1="805" y1="187" x2="805" y2="193"/>
    <line x1="772" y1="160" x2="778" y2="160"/><line x1="832" y1="160" x2="838" y2="160"/>
  </g>
  <g stroke="#2a2018" stroke-width="1">
    <line x1="821.5" y1="131.4" x2="820" y2="134"/><line x1="833.6" y1="143.5" x2="831" y2="145"/>
    <line x1="833.6" y1="176.5" x2="831" y2="175"/><line x1="821.5" y1="188.6" x2="820" y2="186"/>
    <line x1="788.5" y1="188.6" x2="790" y2="186"/><line x1="776.4" y1="176.5" x2="779" y2="175"/>
    <line x1="776.4" y1="143.5" x2="779" y2="145"/><line x1="788.5" y1="131.4" x2="790" y2="134"/>
  </g>
  <line x1="805" y1="160" x2="794" y2="177" stroke="#1a140e" stroke-width="4" stroke-linecap="round"/>
  <line x1="805" y1="160" x2="819" y2="135" stroke="#1a140e" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="805" cy="160" r="3" fill="#1a140e"/>

  <!-- Applique à gaz -->
  <path d="M955 50 V120" stroke="#0e1716" stroke-width="5"/>
  <path d="M955 120 L955 150 L925 150" fill="none" stroke="#3c3220" stroke-width="5"/>
  <path d="M912 150 L938 150 L944 120 L906 120 Z" fill="#f6e7b8"/>
  <path d="M920 142 Q925 128 930 142 Z" fill="#fff6d8"/>

  <!-- Passage vers les cellules : un couloir sombre, une porte à barreaux, une veilleuse -->
  <rect x="1000" y="158" width="160" height="482" fill="#14201f"/>
  <g clip-path="url(#ouverture)">
    <rect x="1014" y="172" width="132" height="468" fill="#0b1312"/>
    <polygon points="1146,172 1146,640 1014,${num(F.y + 310 * 0.618)} 1014,${num(F.y - 158 * 0.618)}" fill="url(#couloir)"/>
    <polygon points="1014,${num(F.y + 310 * 0.618)} 1146,640 1146,640 1014,640" fill="#0e1817"/>
    <polygon points="${pts([1094, 262], [1124, 236], [1124, 590], [1094, 548])}" fill="#081010"/>
    <g stroke="#2c3d3b" stroke-width="2.2">
      <path d="M1100 262 L1100 552 M1106 257 L1106 560 M1112 252 L1112 568 M1118 246 L1118 578"/>
    </g>
    <circle cx="1070" cy="286" r="40" fill="url(#lampe)" opacity="0.6"/>
    <rect x="1066" y="280" width="7" height="11" fill="#f2d8a0" opacity="0.8"/>
  </g>
  <path d="M1000 158 H1160" stroke="#b08a45" stroke-width="1.5" opacity="0.4"/>
  <path d="M1014 172 V640" stroke="#4b6763" stroke-width="1.5" opacity="0.4"/>

  <!-- Plan du quartier, encadré -->
  <rect x="1196" y="92" width="130" height="102" fill="#101a19"/>
  <rect x="1203" y="99" width="116" height="88" fill="#59614f" opacity="0.75"/>
  <path d="M1206 130 Q1240 122 1262 140 T1316 132 M1230 100 L1240 186 M1270 100 Q1262 140 1284 186 M1206 164 H1318" fill="none" stroke="#353d31" stroke-width="2"/>
  <path d="M1196 92 H1326" stroke="#b08a45" stroke-width="1.2" opacity="0.5"/>

  <!-- Porte du poste, sur le mur droit : le jour gris derrière la vitre dépolie, un agent passe dehors -->
  <polygon points="${quadMur(1380, 1560, 156, 640)}" fill="#0c1514"/>
  <polygon points="${quadMur(porte.x1, porte.x2, 170, 640)}" fill="#121e1d"/>
  <polygon points="${vitre}" fill="url(#vitrePorte)"/>
  <g clip-path="url(#vitreClip)">
    <g filter="url(#frost)" opacity="0.75">${personnages.agentDehors}</g>
    <polygon points="${vitre}" fill="#fff" opacity="0.06"/>
  </g>
  <polygon points="${vitre}" fill="none" stroke="#0b1413" stroke-width="5"/>
  <g fill="none" stroke="#0b1413" stroke-width="4">
    <polygon points="${quadMur(porte.x1 + 4, porte.x2 - 4, 420, 520)}"/><polygon points="${quadMur(porte.x1 + 4, porte.x2 - 4, 534, 624)}"/>
  </g>
  <circle cx="1538" cy="${num(ym(1538, 430))}" r="7" fill="#c9a24a"/>
  <path d="M${porte.x1} ${num(ym(porte.x1, 170))} L${porte.x1} ${num(ym(porte.x1, 640))}" stroke="#56716c" stroke-width="1.5" opacity="0.45"/>
  <!-- lanterne sourde accrochée près de la porte -->
  <path d="M1568 ${num(ym(1568, 200))} V${num(ym(1568, 200) + 18)}" stroke="#0e1716" stroke-width="3"/>
  <rect x="1556" y="${num(ym(1568, 200) + 18)}" width="26" height="38" rx="3" fill="#0b1312"/>
  <circle cx="1569" cy="${num(ym(1568, 200) + 37)}" r="8" fill="#3b4f4c" stroke="#7d918e" stroke-width="1.5"/>

  <!-- ═══ Plan 2 : boiseries et plancher ═══ -->
  <rect x="260" y="470" width="740" height="170" fill="url(#boiserie)"/><rect x="1160" y="470" width="180" height="170" fill="url(#boiserie)"/>
  <polygon points="${quadMur(0, 260, 470, 640)}" fill="url(#boiserie)"/>
  <polygon points="${quadMur(1340, porte.x1 - 12, 470, 640)}" fill="url(#boiserie)"/>
  <polygon points="${quadMur(porte.x2 + 12, 1600, 470, 640)}" fill="url(#boiserie)"/>
  <g fill="none" stroke="#0e1816" stroke-width="3">${panneauxFond}${panneauxGauche}${panneauxDroite}</g>
  <g fill="#22332f">
    <rect x="260" y="462" width="740" height="9"/><rect x="1160" y="462" width="180" height="9"/>
    <polygon points="${quadMur(0, 260, 462, 471)}"/>
    <polygon points="${quadMur(1340, porte.x1 - 12, 462, 471)}"/><polygon points="${quadMur(porte.x2 + 12, 1600, 462, 471)}"/>
  </g>
  <path d="M260 462 H1000 M1160 462 H1340" stroke="#b08a45" stroke-width="1.5" opacity="0.35"/>
  <g fill="#0c1413">
    <rect x="260" y="622" width="740" height="18"/><rect x="1160" y="622" width="180" height="18"/>
    <polygon points="${quadMur(0, 260, 622, 640)}"/>
    <polygon points="${quadMur(1340, porte.x1 - 12, 622, 640)}"/><polygon points="${quadMur(porte.x2 + 12, 1600, 622, 640)}"/>
  </g>
  <g clip-path="url(#sol)">
    <rect y="500" width="1600" height="400" fill="url(#plancher)"/>
    <path d="${lignesPlancher()}" stroke="#0a1110" stroke-width="2" opacity="0.85"/>
    <path d="${joints()}" stroke="#0a1110" stroke-width="1.5" opacity="0.7"/>
    <ellipse cx="840" cy="730" rx="440" ry="120" fill="url(#flaque)"/>
    <ellipse cx="1440" cy="820" rx="200" ry="70" fill="url(#jourPorte)"/>
  </g>
  <path d="M0 ${num(ym(0, 640))} L260 640 H1340 L1600 ${num(ym(1600, 640))}" fill="none" stroke="#4b6763" stroke-width="1.2" opacity="0.35"/>

  <!-- Rayons du gaz et de la fenêtre -->
  <g fill="#f0c05a" opacity="0.045">
    <path d="M925 140 L690 900 L830 900 Z"/><path d="M925 140 L980 900 L1110 900 Z"/>
  </g>
  <polygon points="${pts([232, 90], [232, 425], [520, 900], [980, 900])}" fill="url(#rayonFenetre)"/>

  <!-- ═══ Plan 3 : meubles et personnages ═══ -->
  <!-- Comptoir de garde -->
  <rect x="420" y="${COMPTOIR + 10}" width="470" height="${662 - COMPTOIR - 10}" fill="#111d1c"/>
  <g fill="none" stroke="#0a1312" stroke-width="3">
    <rect x="440" y="${COMPTOIR + 34}" width="132" height="196"/><rect x="590" y="${COMPTOIR + 34}" width="132" height="196"/><rect x="740" y="${COMPTOIR + 34}" width="132" height="196"/>
  </g>
  <g stroke="#b08a45" stroke-width="1" opacity="0.3"><path d="M590 ${COMPTOIR + 34} H722 M740 ${COMPTOIR + 34} H872"/></g>
  <ellipse cx="655" cy="668" rx="260" ry="10" fill="#000" opacity="0.4"/>
  <rect x="410" y="${COMPTOIR}" width="490" height="12" fill="#1d2e2c"/>
  <path d="M410 ${COMPTOIR} H900" stroke="#c99a4e" stroke-width="2.5" opacity="0.7"/>

  <!-- L’adjoint William Stone, derrière le comptoir, la tête basse : trois chevrons sur la manche -->
  <g clip-path="url(#derriereComptoir)">${personnages.hale}</g>

  <!-- registre de garde ouvert sur son pupitre, plume, encrier -->
  <polygon points="452,412 596,412 590,396 458,396" fill="#0e1716"/>
  <path d="M462 398 L522 392 L524 410 L458 414 Z" fill="#e2d8bc"/>
  <path d="M522 392 L582 396 L588 414 L524 410 Z" fill="#d6cbad"/>
  <line x1="523" y1="392" x2="524" y2="410" stroke="#8a7a60" stroke-width="2"/>
  <g stroke="#6a5c46" stroke-width="1.1">
    <line x1="466" y1="401" x2="516" y2="396"/><line x1="466" y1="406" x2="517" y2="401"/><line x1="467" y1="411" x2="506" y2="407"/>
    <line x1="530" y1="398" x2="578" y2="401"/><line x1="530" y1="403" x2="580" y2="406"/><line x1="531" y1="408" x2="562" y2="410"/>
  </g>
  <path d="M538 411 L586 401" stroke="#0b1211" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M586 401 L593 400" stroke="#c9a24a" stroke-width="1.6"/>
  <rect x="604" y="398" width="18" height="16" rx="3" fill="#070b0b"/>
  <path d="M618 400 V412" stroke="#e8b452" stroke-width="1.2" opacity="0.7"/>

  <!-- lampe à pétrole sur le comptoir -->
  <ellipse cx="850" cy="${COMPTOIR}" rx="16" ry="3.5" fill="#070b0b"/>
  <path d="M838 ${COMPTOIR} C836 402 840 392 850 390 C860 392 864 402 862 ${COMPTOIR} Z" fill="#0b1211"/>
  <path d="M845 390 L845 382 C840 376 840 352 845 344 L855 344 C860 352 860 376 855 382 L855 390 Z" fill="#f3e6bd" opacity="0.85"/>
  <path d="M850 372 Q846 364 850 354 Q854 364 850 372 Z" fill="#fff6d8"/>
  <path d="M838 ${COMPTOIR} C836 402 840 392 850 390" fill="none" stroke="#e8b452" stroke-width="1.4" opacity="0.7"/>

  <!-- Banc le long du mur gauche, et Elisabeth Coyle qui attend sa déposition -->
  ${banc}
  <ellipse cx="${num(coyle.x + 70)}" cy="${coyle.y}" rx="110" ry="9" fill="#000" opacity="0.45"/>
  ${personnages.coyle}

  <!-- Bureau, télégramme, tiroir entrouvert -->
  <polygon points="915,522 1135,522 1150,548 900,548" fill="#1d2e2c"/>
  <path d="M915 522 H1135" stroke="#c99a4e" stroke-width="2" opacity="0.7"/>
  <rect x="905" y="548" width="240" height="22" fill="#14211f"/>
  <rect x="912" y="570" width="18" height="128" fill="#0e1716"/><rect x="1122" y="570" width="18" height="128" fill="#0e1716"/>
  <rect x="930" y="570" width="70" height="60" fill="#111d1c"/>
  <circle cx="965" cy="600" r="3" fill="#b08a45" opacity="0.7"/>
  <ellipse cx="1025" cy="702" rx="140" ry="8" fill="#000" opacity="0.4"/>
  <g transform="rotate(4 980 532)">
    <rect x="938" y="516" width="86" height="30" fill="#e2d4a2"/>
    <text x="981" y="525" font-family="Georgia, serif" font-size="6" fill="#4a3c22" text-anchor="middle">POST OFFICE TELEGRAPHS</text>
    <rect x="944" y="529" width="74" height="5" fill="#f2e9cc"/><rect x="944" y="537" width="56" height="5" fill="#f2e9cc"/>
  </g>
  <ellipse cx="1110" cy="520" rx="12" ry="3" fill="#070b0b"/>
  <rect x="1106" y="492" width="8" height="28" fill="#cfc4a6"/>
  <path d="M1110 492 Q1114 484 1110 478" fill="none" stroke="#7d918e" stroke-width="1.5" opacity="0.6"/>
  <rect x="1010" y="560" width="112" height="40" fill="#182625" stroke="#0a1312" stroke-width="2"/>
  <rect x="1004" y="590" width="124" height="22" fill="#1d2e2c" stroke="#0a1312" stroke-width="2"/>
  <path d="M1004 590 H1128" stroke="#c99a4e" stroke-width="1.5" opacity="0.55"/>
  <rect x="1020" y="572" width="80" height="20" fill="#c9b98e"/>
  <rect x="1020" y="572" width="80" height="6" fill="#8a2a22"/>
  <text x="1060" y="589" font-family="Georgia, serif" font-size="7" fill="#5a1a14" text-anchor="middle">CONFIDENTIAL</text>
  <circle cx="1066" cy="601" r="4" fill="#d6b45e"/>
  <rect x="1104" y="598" width="12" height="5" fill="#d6b45e"/>

  <!-- Pile de journaux par terre -->
  <ellipse cx="965" cy="800" rx="84" ry="9" fill="#000" opacity="0.5"/>
  <rect x="895" y="770" width="140" height="28" fill="#b9b094"/>
  <rect x="900" y="750" width="132" height="22" fill="#c4bb9f" transform="rotate(-3 966 761)"/>
  <rect x="893" y="730" width="138" height="22" fill="#b6ad91" transform="rotate(2 962 741)"/>
  <rect x="902" y="708" width="128" height="24" fill="#cbc2a6" transform="rotate(-4 966 720)"/>
  <g font-family="Georgia, serif" fill="#2a241c" text-anchor="middle">
    <text x="966" y="725" font-size="10.5" font-weight="bold" transform="rotate(-4 966 720)">THE DAILY LEDGER</text>
    <text x="962" y="746" font-size="11" transform="rotate(2 962 741)">LE MATINAL</text>
    <text x="966" y="766" font-size="10" transform="rotate(-3 966 761)">NEW YORK SENTINEL</text>
  </g>
  <path d="M945 708 L948 798 M985 706 L982 798" stroke="#5a4a30" stroke-width="1.5"/>
  <path d="M895 784 H1035" stroke="#7d746a" stroke-width="1" opacity="0.6"/>

  <!-- Tim Bradford, reporter du Comet, devant la porte : melon, crayon derrière l’oreille, manteau à carreaux, le petit mot de son oncle -->
  <ellipse cx="${num(pell.x - 30)}" cy="${pell.y}" rx="80" ry="9" fill="#000" opacity="0.55"/>
  ${personnages.pell}

  <!-- Le chef Alan Winkoff, l’homme aux médailles : uniforme galonné, journal froissé brandi, cravache -->
  <ellipse cx="${num(harrow.x - 20)}" cy="${harrow.y}" rx="96" ry="11" fill="#000" opacity="0.55"/>
  ${personnages.harrow}

  <!-- ═══ Plan 4 : premier plan, le plus sombre ═══ -->
  <rect x="0" y="0" width="1600" height="20" fill="#060b0b"/>
  <path d="M0 20 H1600" stroke="#1d2e2c" stroke-width="2"/>
  <g fill="#030606" transform="translate(250 14)">
    <rect x="360" y="700" width="10" height="200"/><rect x="438" y="700" width="10" height="200"/>
    <rect x="356" y="696" width="96" height="12" rx="3"/>
    <rect x="364" y="736" width="80" height="7"/><rect x="364" y="768" width="80" height="7"/>
  </g>
  <path d="M606 710 H702" stroke="#e8b452" stroke-width="1.5" opacity="0.35"/>

  <!-- Lumière, poussière et brouillard -->
  <circle cx="925" cy="140" r="520" fill="url(#gaz)"/>
  <circle cx="850" cy="362" r="200" fill="url(#lampe)"/>
  <g fill="#f6dc9a" opacity="0.45">
    <circle cx="880" cy="230" r="1.4"/><circle cx="960" cy="260" r="1.1"/><circle cx="905" cy="320" r="1.6"/><circle cx="1010" cy="210" r="1.2"/>
    <circle cx="850" cy="300" r="1.1"/><circle cx="990" cy="360" r="1.4"/><circle cx="940" cy="420" r="1"/><circle cx="1040" cy="300" r="1.1"/>
  </g>
  <rect y="600" width="1600" height="300" fill="url(#brumeSol)"/>
  <g fill="#9db6b2" opacity="0.06">
    <ellipse cx="300" cy="840" rx="360" ry="40"/><ellipse cx="1150" cy="860" rx="420" ry="36"/><ellipse cx="760" cy="885" rx="300" ry="30"/>
  </g>
  <rect width="1600" height="900" fill="url(#vignette)"/>
</svg>
`;

if (/href="(?!#|data:image\/)/.test(svg)) throw new Error('la scène doit rester autonome');
writeFileSync(SORTIE, svg);
console.log(`scène : ${(svg.length / 1024).toFixed(0)} Ko`);
for (const [nom, c] of Object.entries(cadres)) console.log(nom.padEnd(13), 'corps', JSON.stringify(c.corps), ' tête', JSON.stringify(c.tete));
