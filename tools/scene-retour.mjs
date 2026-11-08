// Scènes de l'affaire 7 : « Ce n'est pas lui ».
//   scene.svg   : le poste de police de Leman Street, lundi 16 février 1891, 10 h. La même pièce que l'affaire 1
//                 (tirée de tools/scene-commissariat.mjs), deux ans et demi plus tard : James Selwyn menotté sur le banc,
//                 la recrue qui a trouvé Frances, l'adjoint Stone, le délégué des marins et Tim, The Comet à la main.
//   reserve.svg : la réserve des pièces, l'arrière-salle du poste : le couteau, les deux chapeaux, la boîte des objets
//                 non réclamés (ceux de l'inconnue de King's Row).
// Les papiers (indices) restent clairs. La gravure et la rue de la fenêtre viennent de tools/scene-commissariat/.
//
// Usage : node tools/scene-retour.mjs   (après npm run persos si les silhouettes ont changé)
//   → src/cases/07-pas-lui/scene.svg et reserve.svg (autonomes)
//   et affiche les rectangles des personnages pour les zones de case.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AMBRE, F, TEAL, afficherCadres, creerPersos, echelle, gx, gy, num, pts, quadMur, reperes, symbole, ym } from './scene-outils.mjs';

const ICI = new URL('./scene-commissariat/', import.meta.url);
const DOSSIER = new URL('../src/cases/07-pas-lui/', import.meta.url);
mkdirSync(DOSSIER, { recursive: true });
const SORTIE = new URL('scene.svg', DOSSIER);

const { perso, defs: defsPersos, cadres } = creerPersos();

// ——— placements ———
const selwyn = { x: 165, y: 760, s: echelle(760) }; // assis sur le banc, menotté, contre le mur gauche
const stone = { x: 590, y: 0, s: 0.7 }; // l'adjoint Stone, derrière le comptoir : ses poings reposent sur le plateau
const COMPTOIR = 414; // dessus du plateau
stone.y = COMPTOIR - 4 - stone.s * reperes['agent-sergent'].mains.proche[1];
const thorne = { x: 352, y: 724, s: echelle(724) }; // la recrue, au garde-à-vous près du banc
const wilkes = { x: 1140, y: 800, s: 1 }; // le délégué des marins, le journal de bord tendu
const tim = { x: 1478, y: 792, s: echelle(792) }; // Tim, devant la porte, The Comet à la main

// banc le long du mur gauche : son assise est à la hauteur de celle de Selwyn
const kC = (selwyn.y - F.y) / 310; // profondeur de ses pieds
const ySiege = selwyn.y + selwyn.s * reperes['chauffeur-assis'].assise; // dessous de ses cuisses, dans la scène
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
  stone: perso('agent-sergent', { ...stone, reflets: [[-2.5, -2, TEAL, 0.45], [3, -1.5, AMBRE, 0.7]], nom: 'stone' }),
  selwyn: perso('chauffeur-assis', { ...selwyn, reflets: [[-2.5, -2, TEAL, 0.6], [3, -1, AMBRE, 0.5]], nom: 'selwyn' }),
  thorne: perso('recrue-debout', { ...thorne, reflets: [[-2.5, -2, TEAL, 0.55], [3, -1.5, AMBRE, 0.5]], nom: 'thorne' }),
  wilkes: perso('delegue-livre', { ...wilkes, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.7], [2.5, -2, TEAL, 0.45]], nom: 'wilkes' }),
  tim: perso('journaliste-une', { ...tim, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.6], [2.5, -2, TEAL, 0.55]], nom: 'tim' }),
  agentDehors: perso('agent-ronde', { x: 1545, y: 560, s: 0.55, miroir: true, ombre: '#4d6461', nom: 'agent-dehors' }),
};

const fenetreRue = readFileSync(new URL('fenetre.jpg', ICI)).toString('base64');
const gravure = readFileSync(new URL('gravure.jpg', ICI)).toString('base64');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- Poste de police de Leman Street, lundi 16 février 1891, 10 h. Généré par tools/scene-retour.mjs : ne pas modifier à la main.
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
  <g id="gravure" transform="rotate(-2 425 220)">
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
  <g id="affiches"><g transform="rotate(1.5 606 182)">
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
  </g></g>

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
  <g id="pendule"><circle cx="805" cy="160" r="44" fill="#101a19"/>
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
  <line x1="805" y1="160" x2="787.7" y2="150" stroke="#1a140e" stroke-width="4" stroke-linecap="round"/>
  <line x1="805" y1="160" x2="805" y2="131" stroke="#1a140e" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="805" cy="160" r="3" fill="#1a140e"/></g>

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
  <g clip-path="url(#derriereComptoir)">${personnages.stone}</g>

  <!-- registre de garde ouvert sur son pupitre, plume, encrier -->
  <g id="registre">
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
  </g>

  <!-- lampe à pétrole sur le comptoir -->
  <ellipse cx="850" cy="${COMPTOIR}" rx="16" ry="3.5" fill="#070b0b"/>
  <path d="M838 ${COMPTOIR} C836 402 840 392 850 390 C860 392 864 402 862 ${COMPTOIR} Z" fill="#0b1211"/>
  <path d="M845 390 L845 382 C840 376 840 352 845 344 L855 344 C860 352 860 376 855 382 L855 390 Z" fill="#f3e6bd" opacity="0.85"/>
  <path d="M850 372 Q846 364 850 354 Q854 364 850 372 Z" fill="#fff6d8"/>
  <path d="M838 ${COMPTOIR} C836 402 840 392 850 390" fill="none" stroke="#e8b452" stroke-width="1.4" opacity="0.7"/>

  <!-- Banc le long du mur gauche : James Selwyn, menotté, la tête bandée ; la recrue Ernest Thorne le garde -->
  ${banc}
  <ellipse cx="${num(selwyn.x + 70)}" cy="${selwyn.y}" rx="110" ry="9" fill="#000" opacity="0.45"/>
  ${personnages.selwyn}
  <ellipse cx="${num(thorne.x + 6)}" cy="${thorne.y}" rx="58" ry="7" fill="#000" opacity="0.45"/>
  ${personnages.thorne}

  <!-- Bureau, feuille de la loge des docks, tiroir fermé -->
  <polygon points="915,522 1135,522 1150,548 900,548" fill="#1d2e2c"/>
  <path d="M915 522 H1135" stroke="#c99a4e" stroke-width="2" opacity="0.7"/>
  <rect x="905" y="548" width="240" height="22" fill="#14211f"/>
  <rect x="912" y="570" width="18" height="128" fill="#0e1716"/><rect x="1122" y="570" width="18" height="128" fill="#0e1716"/>
  <rect x="930" y="570" width="70" height="60" fill="#111d1c"/>
  <circle cx="965" cy="600" r="3" fill="#b08a45" opacity="0.7"/>
  <ellipse cx="1025" cy="702" rx="140" ry="8" fill="#000" opacity="0.4"/>
  <g id="feuille-docks" transform="rotate(4 980 532)">
    <rect x="938" y="516" width="86" height="30" fill="#e6dcc0"/>
    <text x="981" y="525" font-family="Georgia, serif" font-size="6" fill="#4a3c22" text-anchor="middle">ST KATHARINE DOCKS</text>
    <rect x="944" y="529" width="74" height="5" fill="#f2e9cc"/><rect x="944" y="537" width="56" height="5" fill="#f2e9cc"/>
  </g>
  <ellipse cx="1110" cy="520" rx="12" ry="3" fill="#070b0b"/>
  <rect x="1106" y="492" width="8" height="28" fill="#cfc4a6"/>
  <path d="M1110 492 Q1114 484 1110 478" fill="none" stroke="#7d918e" stroke-width="1.5" opacity="0.6"/>
  <rect x="1004" y="560" width="124" height="44" fill="#1d2e2c" stroke="#0a1312" stroke-width="2"/>
  <circle cx="1066" cy="582" r="3.5" fill="#b08a45" opacity="0.7"/>

  <!-- Pile de vieux numéros du Comet, par terre -->
  <g id="journaux">
  <ellipse cx="965" cy="800" rx="84" ry="9" fill="#000" opacity="0.5"/>
  <rect x="895" y="770" width="140" height="28" fill="#b9b094"/>
  <rect x="900" y="750" width="132" height="22" fill="#c4bb9f" transform="rotate(-3 966 761)"/>
  <rect x="893" y="730" width="138" height="22" fill="#b6ad91" transform="rotate(2 962 741)"/>
  <rect x="902" y="708" width="128" height="24" fill="#cbc2a6" transform="rotate(-4 966 720)"/>
  <g font-family="Georgia, serif" fill="#2a241c" text-anchor="middle">
    <text x="966" y="725" font-size="10.5" font-weight="bold" transform="rotate(-4 966 720)">THE COMET</text>
    <text x="962" y="746" font-size="11" transform="rotate(2 962 741)">THE COMET</text>
    <text x="966" y="766" font-size="10" transform="rotate(-3 966 761)">THE COMET</text>
  </g>
  <path d="M945 708 L948 798 M985 706 L982 798" stroke="#5a4a30" stroke-width="1.5"/>
  <path d="M895 784 H1035" stroke="#7d746a" stroke-width="1" opacity="0.6"/>
  </g>

  <!-- Tim Bradford, devant la porte : il montre la une du Comet, « C’EST LUI ! » -->
  <ellipse cx="${num(tim.x - 30)}" cy="${tim.y}" rx="80" ry="9" fill="#000" opacity="0.55"/>
  ${personnages.tim}

  <!-- Harry Wilkes, délégué du syndicat des marins, tend le journal de bord du Winfield -->
  <ellipse cx="${num(wilkes.x - 20)}" cy="${wilkes.y}" rx="96" ry="11" fill="#000" opacity="0.55"/>
  ${personnages.wilkes}

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
console.log('— poste —');
afficherCadres(cadres);

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// Scène 2 : la réserve des pièces, l'arrière-salle du poste. Le même lundi, à la lumière du gaz et du soupirail.
// ════════════════════════════════════════════════════════════════════════════════════════════════════

/** générateur pseudo-aléatoire (toujours le même dessin) */
const hasard = (graine) => () => {
  graine = (graine * 16807) % 2147483647;
  return (graine - 1) / 2147483646;
};
/** une écriture à la main illisible : des boucles penchées, des mots, des lignes */
function ecriture(x, y, largeur, lignes, pas, graine) {
  const r = hasard(graine);
  let d = '';
  for (let l = 0; l < lignes; l++) {
    let cx = x;
    const fin = x + largeur * (l === lignes - 1 ? 0.55 : 0.88 + r() * 0.12);
    const cy = y + l * pas;
    while (cx < fin) {
      const mot = 2 + Math.floor(r() * 5);
      d += `M${num(cx)} ${num(cy)}`;
      for (let i = 0; i < mot && cx < fin; i++) {
        const h = 1.6 + r() * 1.8;
        const w = 1.8 + r() * 1.2;
        d += ` q${num(w * 0.2)} ${num(-h * 1.4)} ${num(w * 0.7)} ${num(-h)} q${num(w * 0.3)} ${num(h * 0.9)} ${num(w * 0.3)} ${num(h)}`;
        cx += w;
      }
      cx += 2 + r() * 2;
    }
  }
  return d;
}
const lampe = (x, y) => `<g id="lampe-gaz"><path d="M${x} 0 V${y - 26}" stroke="#0b1211" stroke-width="3"/>
    <path d="M${x - 6} ${y - 26} h12 l-2 10 h-8 Z" fill="#0b1211"/>
    <path d="M${x - 44} ${y} C${x - 40} ${y - 14} ${x - 20} ${y - 18} ${x - 8} ${y - 18} L${x + 8} ${y - 18} C${x + 20} ${y - 18} ${x + 40} ${y - 14} ${x + 44} ${y} Z" fill="#26302b"/>
    <ellipse cx="${x}" cy="${y + 1}" rx="44" ry="4.5" fill="#ffe2a0"/>
    <rect x="${x - 1.5}" y="${y + 1}" width="3" height="22" fill="#6a5a34"/>
    <path d="M${x - 5} ${y + 22} h10 l-2 5 h-6 Z" fill="#8a7440"/>
    <circle cx="${x}" cy="${y + 12}" r="16" fill="#ffd27a" opacity="0.25"/>
    <path d="M${x} ${y + 22} C${x - 6} ${y + 18} ${x - 5} ${y + 10} ${x} ${y + 2} C${x + 5} ${y + 10} ${x + 6} ${y + 18} ${x} ${y + 22} Z" fill="#ffc64a"/>
    <path d="M${x} ${y + 21} C${x - 3} ${y + 18} ${x - 2.5} ${y + 13} ${x} ${y + 8} C${x + 2.5} ${y + 13} ${x + 3} ${y + 18} ${x} ${y + 21} Z" fill="#fff4d0"/></g>`;

{
  const { perso, defs: defsPersos, cadres } = creerPersos();
  const hollis = { x: 650, y: 690, s: echelle(690) }; // l'inspecteur, derrière la table, relit l'étiquette du couteau
  const pell = { x: 250, y: 790, s: echelle(790) }; // le gardien de la réserve, son registre contre lui
  const cameron = { x: 1300, y: 800, s: echelle(800) }; // le marin, qui montre le couteau

  const poutres = [420, 610, 800, 990, 1180]
    .map((x) => {
      const loin = (dx) => num(F.x + (x + dx - F.x) * (330 / 280));
      return `<polygon points="${num(x - 10)},50 ${num(x + 10)},50 ${loin(16)},0 ${loin(-16)},0"/>`;
    })
    .join('');
  const piece = `<polygon points="163.6,0 260,50 1340,50 1436.4,0" fill="#0a100f"/>
  <g fill="#060a09">${poutres}</g>
  <rect x="260" y="50" width="1080" height="590" fill="url(#rFond)"/>
  <polygon points="0,${num(ym(0, 50))} 260,50 260,640 0,${num(ym(0, 640))}" fill="url(#rGauche)"/>
  <polygon points="1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640" fill="url(#rDroit)"/>
  <g clip-path="url(#rMurs)"><rect width="1600" height="640" filter="url(#taches)" opacity="0.6"/><rect width="1600" height="640" filter="url(#grain)" opacity="0.3"/></g>
  <polygon points="${quadMur(0, 260, 520, 640)}" fill="url(#rPlinthe)"/>
  <polygon points="${quadMur(1340, 1600, 520, 640)}" fill="url(#rPlinthe)"/>
  <g fill="#0a0f0e"><rect x="260" y="622" width="1080" height="18"/><polygon points="${quadMur(0, 260, 622, 640)}"/><polygon points="${quadMur(1340, 1600, 622, 640)}"/></g>`;

  // le soupirail, haut sur le mur gauche : le jour gris de Leman Street, et les jambes des passants
  const soupirail = { a: [60, ym(60, 96)], b: [224, ym(224, 96)], c: [224, ym(224, 210)], d: [60, ym(60, 210)] };
  const dehors = `<rect x="40" y="0" width="200" height="300" fill="#9fb3ae"/>
    <rect x="40" y="150" width="200" height="150" fill="#6f8580"/>
    <g fill="#24302e">
      <path d="M92 96 L98 160 L104 160 L106 110 L112 160 L118 160 L114 96 Z"/>
      <path d="M150 90 L146 160 L152 160 L160 112 L166 160 L172 160 L170 90 Z"/>
      <path d="M190 100 L196 160 L203 160 L205 116 L212 160 L218 160 L214 100 Z"/>
    </g>`;
  const rayon = `<polygon points="${pts([224, ym(224, 100)], [224, ym(224, 210)], [700, 900], [1100, 900])}" fill="url(#rRayon)"/>`;

  // les étagères du fond : des paquets ficelés et étiquetés, des boîtes, des bouteilles
  const etageres = (() => {
    const r = hasard(71);
    let s = '';
    for (const x of [290, 630, 970, 1310]) s += `<rect x="${x - 8}" y="120" width="16" height="520" fill="#1a1510"/>`;
    const planches = [200, 300, 400, 500, 600];
    const couleurs = ['#5a4630', '#4a3a28', '#6a5638', '#3a3024', '#544838', '#40362a'];
    for (const y of planches) {
      let x = 300;
      while (x < 1296) {
        if ([630, 970].some((m) => x > m - 30 && x < m + 10)) {
          x += 14;
          continue;
        }
        const w = 26 + r() * 58;
        const h = 28 + r() * 54;
        if (x + w > 1300 || [630, 970].some((m) => x < m + 10 && x + w > m - 10)) {
          x += 12;
          continue;
        }
        const kind = r();
        if (kind < 0.1) {
          x += w * 0.7;
          continue;
        }
        if (kind < 0.22) {
          // des bouteilles
          for (let i = 0; i < 3; i++) {
            const bx = x + i * 11;
            s += `<path d="M${num(bx)} ${y} V${num(y - 30)} C${num(bx)} ${num(y - 36)} ${num(bx + 3)} ${num(y - 38)} ${num(bx + 3)} ${num(y - 44)} H${num(bx + 6)} C${num(bx + 6)} ${num(y - 38)} ${num(bx + 9)} ${num(y - 36)} ${num(bx + 9)} ${num(y - 30)} V${y} Z" fill="#1d2a24"/>`;
          }
          x += 38;
          continue;
        }
        const col = couleurs[Math.floor(r() * couleurs.length)];
        s += `<rect x="${num(x)}" y="${num(y - h)}" width="${num(w)}" height="${num(h)}" fill="${col}"/>`;
        s += `<path d="M${num(x + w / 2)} ${num(y - h)} V${y} M${num(x)} ${num(y - h / 2)} H${num(x + w)}" stroke="#1e170f" stroke-width="1.2" opacity="0.7"/>`;
        s += `<rect x="${num(x + 4)}" y="${num(y - h + 5)}" width="11" height="7" fill="#cfc4a3" opacity="0.75"/>`;
        x += w + 4 + r() * 8;
      }
      s += `<rect x="282" y="${y}" width="1036" height="10" fill="#2a2218"/><path d="M282 ${y} H1318" stroke="#c9a46a" stroke-width="1" opacity="0.22"/>`;
    }
    return s;
  })();

  // la porte de l'escalier, sur le mur droit
  const porte = `<polygon points="${quadMur(1380, 1510, 150, 640)}" fill="#0a0f0e"/>
    <polygon points="${quadMur(1390, 1500, 164, 640)}" fill="#1e1a14"/>
    <g fill="none" stroke="#0e0b08" stroke-width="3"><polygon points="${quadMur(1402, 1488, 190, 380)}"/><polygon points="${quadMur(1402, 1488, 410, 610)}"/></g>
    <circle cx="1490" cy="${num(ym(1490, 400))}" r="5" fill="#8a7440"/>`;

  // la grande table des pièces : le couteau, les deux chapeaux de Frances, la boîte des objets non réclamés
  const table = `<ellipse cx="800" cy="788" rx="380" ry="16" fill="#000" opacity="0.5"/>
    <polygon points="520,500 1080,500 1130,552 470,552" fill="#3a2c1e"/>
    <rect x="466" y="552" width="668" height="14" fill="#241a10"/>
    <path d="M470 552 H1130" stroke="#c9a46a" stroke-width="1.4" opacity="0.45"/>
    <rect x="476" y="566" width="648" height="214" fill="#1c140c"/>
    <g fill="none" stroke="#100b06" stroke-width="3">${[0, 1, 2, 3].map((i) => `<rect x="${496 + i * 156}" y="584" width="140" height="176"/>`).join('')}</g>
    <g transform="translate(0 -104)">
    <g id="couteau">
      <polygon points="556,648 704,648 692,616 570,616" fill="#d8d0b6"/>
      <path d="M582 636 L642 630 L652 627 L654 632 L642 637 Z" fill="#9aa3a0"/>
      <path d="M592 635 l3 -2 l3 2 M610 633 l3 -2 l3 2 M628 631 l3 -2 l3 2" stroke="#4a524f" stroke-width="1"/>
      <rect x="653" y="626" width="34" height="9" rx="3" fill="#4a3220" transform="rotate(-4 670 630)"/>
      <path d="M686 631 C694 634 698 641 696 650" stroke="#8a7a60" stroke-width="1" fill="none"/>
      <rect x="688" y="650" width="18" height="12" fill="#e2d8bc" transform="rotate(8 697 656)"/>
      <path d="M692 655 h9 M692 658 h7" stroke="#3a3228" stroke-width="0.8" transform="rotate(8 697 656)"/>
    </g>
    <g id="chapeaux">
      <ellipse cx="782" cy="642" rx="36" ry="7" fill="#0c0d0e"/>
      <path d="M758 640 C756 619 766 608 782 608 C798 608 808 619 806 640 Z" fill="#141618"/>
      <path d="M760 628 C772 632 792 632 805 628" stroke="#3c4044" stroke-width="2.6" fill="none"/>
      <path d="M802 612 C814 618 820 628 818 642" stroke="#2c2e31" stroke-width="3.4" fill="none"/>
      <ellipse cx="872" cy="636" rx="30" ry="6" fill="#16130f"/>
      <path d="M852 634 C850 618 858 611 870 611 C884 609 892 617 890 634 Z" fill="#1e1a15"/>
      <path d="M858 622 L867 617 L876 623" stroke="#302a22" stroke-width="2" fill="none"/>
      <polygon points="906,648 948,648 942,616 910,616" fill="#b8a27a"/>
      <path d="M915 644 L940 642 L936 622 L917 624 Z" fill="#e6dcc0"/>
      <path d="M920 629 H933 M920 633 H935 M920 637 H929" stroke="#4a4235" stroke-width="0.8"/>
    </g>
    <g id="boite">
      <polygon points="966,650 1062,650 1058,606 970,606" fill="#6a5434"/>
      <polygon points="970,606 1058,606 1050,596 978,596" fill="#2a2016"/>
      <polygon points="970,606 978,596 962,584 956,600" fill="#7a6240"/>
      <polygon points="1058,606 1050,596 1068,584 1074,598" fill="#7a6240"/>
      <rect x="984" y="618" width="58" height="15" fill="#d8ceb0"/>
      <text x="1013" y="628.5" font-family="Georgia, serif" font-size="7.4" font-weight="bold" fill="#2a241c" text-anchor="middle">UNCLAIMED</text>
      <rect x="990" y="589" width="16" height="10" fill="#ece4cc" transform="rotate(-10 998 594)"/>
      <rect x="1016" y="587" width="19" height="9" fill="#d9c9a0" transform="rotate(6 1025 591)"/>
      <polygon points="1066,656 1120,656 1112,632 1072,632" fill="#121212"/>
      <polygon points="1070,654 1093,654 1089,634 1074,634" fill="#e2d8bc"/>
      <polygon points="1093,654 1116,654 1109,634 1089,634" fill="#ddd3b4"/>
      <path d="${ecriture(1075, 640, 13, 3, 4, 77)}" stroke="#2a1d14" stroke-width="0.6" fill="none"/>
      <path d="M1100 638 v9 M1096 641 h8" stroke="#b08a3a" stroke-width="1.2"/>
    </g>
    </g>`;

  // le tabouret du gardien
  const tabouret = `<g fill="#120d08"><rect x="120" y="700" width="80" height="10"/><rect x="126" y="710" width="8" height="86"/><rect x="186" y="710" width="8" height="86"/></g>`;

  const personnages = {
    hollis: perso('inspecteur-billet', { ...hollis, reflets: [[-2.5, -2, AMBRE, 0.65], [2.5, -1.5, TEAL, 0.4]], nom: 'hollis' }),
    pell: perso('gardien-registre', { ...pell, reflets: [[-2.5, -2, TEAL, 0.55], [3, -1.5, AMBRE, 0.55]], nom: 'pell' }),
    cameron: perso('marin-montre', { ...cameron, miroir: true, reflets: [[-3, -1.5, AMBRE, 0.65], [2.5, -2, TEAL, 0.4]], nom: 'cameron' }),
  };

  const contenu = `  <defs>
    <linearGradient id="rFond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a3531"/><stop offset="0.7" stop-color="#202b28"/><stop offset="1" stop-color="#18221f"/>
    </linearGradient>
    <linearGradient id="rGauche" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#26322e"/><stop offset="1" stop-color="#131c1a"/>
    </linearGradient>
    <linearGradient id="rDroit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#202c29"/><stop offset="1" stop-color="#0d1615"/>
    </linearGradient>
    <linearGradient id="rPlinthe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c1912"/><stop offset="1" stop-color="#110e0a"/>
    </linearGradient>
    <linearGradient id="rPlancher" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e221e"/><stop offset="1" stop-color="#070909"/>
    </linearGradient>
    <linearGradient id="rRayon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d7e6e2" stop-opacity="0.13"/><stop offset="1" stop-color="#d7e6e2" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rBrume" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7f9995" stop-opacity="0"/><stop offset="1" stop-color="#7f9995" stop-opacity="0.1"/>
    </linearGradient>
    <radialGradient id="rGaz">
      <stop offset="0" stop-color="#ffd27a" stop-opacity="0.34"/><stop offset="0.45" stop-color="#f0b45a" stop-opacity="0.1"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="rFlaque">
      <stop offset="0" stop-color="#e8b45a" stop-opacity="0.2"/><stop offset="1" stop-color="#e8b45a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.78">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.8"/>
    </radialGradient>
    <filter id="taches" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.011" numOctaves="3" seed="71"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.07  0 0 0 0 0.07  0 0 0 -2.4 1.36"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="9"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.82  0 0 0 0 0.8  0 0 0 0.5 -0.18"/>
    </filter>
    <clipPath id="rMurs"><polygon points="0,${num(ym(0, 50))} 260,50 1340,50 1600,${num(ym(1600, 50))} 1600,${num(ym(1600, 640))} 1340,640 260,640 0,${num(ym(0, 640))}"/></clipPath>
    <clipPath id="rSol"><polygon points="0,${num(ym(0, 640))} 260,640 1340,640 1600,${num(ym(1600, 640))} 1600,900 0,900"/></clipPath>
    <clipPath id="soupirailClip"><polygon points="${pts(soupirail.a, soupirail.b, soupirail.c, soupirail.d)}"/></clipPath>
    ${defsPersos.join('\n    ')}
  </defs>

  <!-- ═══ Plan 1 : la réserve ═══ -->
  ${piece}

  <!-- Le soupirail : le jour de la rue, les jambes des passants -->
  <g clip-path="url(#soupirailClip)">${dehors}</g>
  <g fill="none" stroke="#0a0f0e">
    <polygon points="${pts(soupirail.a, soupirail.b, soupirail.c, soupirail.d)}" stroke-width="10"/>
    <path d="${[94, 128, 162, 196].map((x) => `M${x} ${num(ym(x, 96))} L${x} ${num(ym(x, 210))}`).join(' ')}" stroke-width="4"/>
  </g>

  <!-- Les étagères des pièces et des objets trouvés -->
  ${etageres}
  ${porte}

  <!-- ═══ Plan 2 : le plancher ═══ -->
  <g clip-path="url(#rSol)">
    <rect y="500" width="1600" height="400" fill="url(#rPlancher)"/>
    <path d="${(() => { let d = ''; for (let x = -1400; x <= 3000; x += 42) d += `M${num(x)} 640 L${num(F.x + (x - F.x) * (570 / 310))} 900 `; return d; })()}" stroke="#070b0a" stroke-width="2" opacity="0.85"/>
    <ellipse cx="800" cy="740" rx="420" ry="100" fill="url(#rFlaque)"/>
  </g>
  ${rayon}

  <!-- ═══ Plan 3 : l'inspecteur derrière la table, la table des pièces, le gardien, le marin ═══ -->
  ${personnages.hollis}
  ${table}
  ${tabouret}
  <ellipse cx="${pell.x + 8}" cy="${pell.y}" rx="74" ry="9" fill="#000" opacity="0.5"/>
  ${personnages.pell}
  <ellipse cx="${cameron.x - 8}" cy="${cameron.y}" rx="80" ry="10" fill="#000" opacity="0.5"/>
  ${personnages.cameron}

  <!-- La lampe à gaz au-dessus de la table -->
  ${lampe(800, 118)}

  <!-- ═══ Plan 4 : lumière, poussière ═══ -->
  <circle cx="800" cy="118" r="500" fill="url(#rGaz)"/>
  <rect y="600" width="1600" height="300" fill="url(#rBrume)"/>
  <rect width="1600" height="900" fill="url(#vignette)"/>`;

  const reserve = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- La réserve des pièces du poste de Leman Street, lundi 16 février 1891. Généré par tools/scene-retour.mjs : ne pas modifier à la main.
       Décor et personnages dessinés pour le jeu (personnages : src/assets/silhouettes/persos). Les positions suivent les zones de case.json. -->
${contenu}
</svg>
`;
  if (/href="(?!#|data:image\/)/.test(reserve)) throw new Error('la scène doit rester autonome');
  writeFileSync(new URL('reserve.svg', DOSSIER), reserve);
  console.log(`— réserve : ${(reserve.length / 1024).toFixed(0)} Ko`);
  afficherCadres(cadres);
}
