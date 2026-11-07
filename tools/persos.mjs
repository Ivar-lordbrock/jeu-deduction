// Silhouettes des personnages, dessinées pour le jeu.
// Un personnage = des proportions, une tête dessinée (visage, chapeau, barbe) et un vêtement.
// Une pose = les angles des membres. Tout regarde vers la droite (on retourne l'image pour la gauche).
// Le sol est en y = 0, à l'échelle de la scène du commissariat : un homme debout fait environ 560 px.
//
// Usage : node tools/persos.mjs
//   → src/assets/silhouettes/persos/<perso>-<pose>.svg  (une silhouette par fichier)
//   → docs/planche-persos.svg                           (toutes les poses, avec l'éclairage de la scène)
//   → src/assets/silhouettes/persos/pas/                (le cycle de marche du joueur, pour l'intro)

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const DOSSIER = new URL('../src/assets/silhouettes/persos/', import.meta.url);
const PLANCHE = new URL('../docs/planche-persos.svg', import.meta.url);

const NOIR = '#070b0b';
const PLI = '#253534'; // lignes de détail, à peine visibles dans le noir
const PAPIER = '#d8cdaa';
const OR = '#c9a04a';
const ARGENT = '#a3b4b1';

// ——— géométrie ———

const RAD = Math.PI / 180;
const v = (x, y) => ({ x, y });
const add = (a, b) => v(a.x + b.x, a.y + b.y);
const sub = (a, b) => v(a.x - b.x, a.y - b.y);
const mul = (a, k) => v(a.x * k, a.y * k);
const lerp = (a, b, t) => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
const len = (a) => Math.hypot(a.x, a.y);
const unit = (a) => mul(a, 1 / (len(a) || 1));
/** direction d'un membre : 0° = vers le bas, 90° = vers l'avant, 180° = vers le haut */
const dir = (deg) => v(Math.sin(deg * RAD), Math.cos(deg * RAD));
const num = (n) => String(Math.round(n * 10) / 10);
const pt = (p) => `${num(p.x)} ${num(p.y)}`;

/** repère local → monde : origine o, rotation r (degrés ; positif = sens horaire = vers l'avant), échelle s */
const repere = (o, r = 0, s = 1) => {
  const c = Math.cos(r * RAD);
  const sn = Math.sin(r * RAD);
  return (x, y) => v(o.x + s * (x * c - y * sn), o.y + s * (x * sn + y * c));
};
/** repère d'une main ou d'un objet tenu : y local suit la direction `deg`, x local va vers le pouce */
const repereMembre = (o, deg, s = 1) => repere(o, -deg, s);

/** applique un repère à un tracé écrit en commandes absolues M L C Q Z (nombres par paires) */
function trace(d, f, pts) {
  return d
    .replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, (_, x, y) => {
      const p = f(+x, +y);
      pts?.push(p);
      return pt(p);
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** membre en forme de gélule effilée, du point a (rayon r1) au point b (rayon r2) */
function gelule(a, b, r1, r2) {
  const d = sub(b, a);
  const L = len(d) || 0.01;
  const u = mul(d, 1 / L);
  const p = v(-u.y, u.x);
  const s = Math.max(-0.95, Math.min(0.95, (r1 - r2) / L));
  const c = Math.sqrt(1 - s * s);
  const m1 = add(mul(u, s), mul(p, c));
  const m2 = sub(mul(u, s), mul(p, c));
  const A1 = add(a, mul(m1, r1));
  const B1 = add(b, mul(m1, r2));
  const B2 = add(b, mul(m2, r2));
  const A2 = add(a, mul(m2, r1));
  return `M${pt(A1)} L${pt(B1)} A${num(r2)} ${num(r2)} 0 ${s < 0 ? 1 : 0} 0 ${pt(B2)} L${pt(A2)} A${num(r1)} ${num(r1)} 0 ${s > 0 ? 1 : 0} 0 ${pt(A1)} Z`;
}

/** polygone aux coins arrondis (t = part de chaque côté mangée par l'arrondi, 0.5 = tout en courbe) */
function arrondi(points, t = 0.3) {
  const n = points.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const a = lerp(p1, p0, t);
    const b = lerp(p1, p2, t);
    d += `${i === 0 ? 'M' : ' L'}${pt(a)} Q${pt(p1)} ${pt(b)}`;
  }
  return `${d} Z`;
}

/** enveloppe convexe (chaîne monotone) */
function enveloppe(ps) {
  const p = [...ps].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [];
  const hi = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo.at(-2), lo.at(-1), q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of p.reverse()) {
    while (hi.length >= 2 && cross(hi.at(-2), hi.at(-1), q) <= 0) hi.pop();
    hi.push(q);
  }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

/** ruban ondulé (écharpe au vent, rubans) : base b, direction deg, longueur L, largeur w */
function ruban(b, deg, L, w, onde = 6, fin = 0.7) {
  const u = dir(deg);
  const n = v(-u.y, u.x);
  const gauche = [];
  const droite = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const c = add(add(b, mul(u, s * L)), mul(n, Math.sin(s * Math.PI * 2.2) * onde * s));
    const demi = (w / 2) * (1 - (1 - fin) * s);
    gauche.push(add(c, mul(n, demi)));
    droite.push(sub(c, mul(n, demi)));
  }
  const tour = gauche.concat(droite.reverse());
  return { d: `M${tour.map(pt).join(' L')} Z`, pts: tour, bout: lerp(gauche.at(-1), droite[0], 0.5), u, n };
}

// ——— le dessin d'une silhouette ———

class Dessin {
  corps = [];
  plis = [];
  accents = [];
  defs = []; // motifs et découpes propres à la silhouette ; {id} est remplacé par son identifiant
  pts = [];
  /** forme pleine du corps, tracé local d dans le repère f */
  forme(d, f, attrs = '') {
    this.corps.push(`<path${attrs} d="${f ? trace(d, f, this.pts) : d}"/>`);
  }
  formePts(d, pts, attrs = '') {
    this.pts.push(...pts);
    this.corps.push(`<path${attrs} d="${d}"/>`);
  }
  membre(a, b, r1, r2) {
    this.corps.push(`<path d="${gelule(a, b, r1, r2)}"/>`);
    this.pts.push(sub(a, v(r1, r1)), add(a, v(r1, r1)), sub(b, v(r2, r2)), add(b, v(r2, r2)));
  }
  rond(c, r) {
    this.corps.push(`<circle cx="${num(c.x)}" cy="${num(c.y)}" r="${num(r)}"/>`);
    this.pts.push(sub(c, v(r, r)), add(c, v(r, r)));
  }
  /** ligne de détail, visible seulement à l'intérieur de la silhouette */
  pli(d, f, w = 2) {
    this.plis.push(`<path d="${f ? trace(d, f) : d}" stroke-width="${w}"/>`);
  }
  /** couleur posée par-dessus le noir (châle, papier, galons…) */
  accent(d, f, fill, attrs = '') {
    this.accents.push(`<path d="${f ? trace(d, f, this.pts) : d}" fill="${fill}"${attrs}/>`);
  }
  trait(d, f, stroke, w, attrs = '') {
    this.accents.push(`<path d="${f ? trace(d, f) : d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"${attrs}/>`);
  }
}

// ——— squelette ———

function squelette(c, pose, hanche) {
  const lean = pose.lean ?? 0;
  const T = repere(hanche, lean);
  const epaule = T(...c.epaule);
  const cou = T(...c.cou);
  const bras = (s) => {
    // ra / rb < 1 : avant-bras ou bras vu en raccourci (il passe derrière le corps)
    const coude = add(epaule, mul(dir(s.a), c.bras * (s.rb ?? 1)));
    const poignet = add(coude, mul(dir(s.a + s.e), c.avant * (s.ra ?? 1)));
    return { epaule, coude, poignet, dir: s.a + s.e + (s.w ?? 0), main: s.main ?? 'ouverte', s };
  };
  const jambe = (s) => {
    const h = T(...c.hanche);
    const genou = add(h, mul(dir(s.h), c.cuisse));
    const cheville = add(genou, mul(dir(s.h - s.k), c.tibia));
    return { hanche: h, genou, cheville, pied: s.f ?? 0, h: s.h, k: s.k };
  };
  return { T, lean, hanche, epaule, cou, bN: bras(pose.bN), bF: bras(pose.bF), jN: jambe(pose.jN), jF: jambe(pose.jF) };
}

/** point le plus bas des pieds (et du genou posé à terre) : il sera posé sur le sol */
function plusBas(c, sq) {
  let y = -Infinity;
  for (const j of [sq.jN, sq.jF]) {
    const f = repere(j.cheville, j.pied, c.pied);
    for (const x of [-14, 20, c.pointe]) y = Math.max(y, f(x, c.semelle).y);
    y = Math.max(y, j.genou.y + c.rGenou);
  }
  return y;
}

/** point sur la jambe : t = 1 au genou, 2 à la cheville */
const surJambe = (j, t) => (t <= 1 ? lerp(j.hanche, j.genou, t) : lerp(j.genou, j.cheville, Math.min(1, t - 1)));
const prise = (b, c) => repereMembre(b.poignet, b.dir, c.main)(1, 14); // centre du poing

// ——— pièces communes ———

const SOULIER = 'M -12 -10 C -17 0 -18 10 -16 20 L 38 20 C 47 20 52 16 51 11 C 50 6 40 3 28 1 C 18 -1 12 -7 10 -10 Z';
const BOTTINE = 'M -11 -14 C -15 0 -16 10 -14 18 L 34 18 C 42 18 45 14 44 10 C 42 6 32 3 22 1 C 14 -1 10 -8 9 -14 Z';
const MAINS = {
  ouverte: 'M -9 0 C -12 14 -11 30 -6 40 C -2 47 5 47 8 41 C 11 33 12 22 11 13 C 15 15 18 13 17 9 C 15 5 11 2 9 0 Z',
  poing: 'M -10 0 C -13 12 -10 26 0 27 C 10 28 14 18 13 7 C 13 3 11 0 9 0 Z',
  doigt: 'M -10 0 C -13 12 -10 26 0 27 C 10 28 14 18 13 7 C 13 3 11 0 9 0 Z',
};

function main(D, b, c) {
  if (b.main === 'cachee' || b.main === 'poche') return;
  const f = repereMembre(b.poignet, b.dir, c.main);
  D.forme(MAINS[b.main], f);
  if (b.main === 'doigt') D.membre(f(4, 18), f(4, 46), 4.6 * c.main, 3.6 * c.main);
  if (b.main === 'ouverte') D.membre(f(9, 6), f(17, 22), 4 * c.main, 3 * c.main); // pouce
}

function jambes(D, sq, c, chaussure = SOULIER) {
  for (const j of [sq.jF, sq.jN]) {
    D.membre(j.hanche, j.genou, c.rCuisse, c.rGenou);
    D.membre(j.genou, j.cheville, c.rGenou, c.rCheville);
    D.forme(chaussure, repere(j.cheville, j.pied, c.pied));
  }
}

function brasEtMains(D, sq, c) {
  for (const b of [sq.bF, sq.bN]) {
    D.membre(b.epaule, b.coude, c.rBras, c.rCoude);
    D.membre(b.coude, b.poignet, c.rCoude, c.rPoignet);
    main(D, b, c);
  }
  const b = sq.bN;
  // revers de manche
  const f = repereMembre(b.poignet, b.dir - (b.s.w ?? 0));
  D.pli(`M ${-c.rPoignet - 1} -6 L ${c.rPoignet + 1} -6`, f, 1.6);
}

/** manteau : un contour qui suit le dos, descend derrière la jambe arrière, se creuse un peu entre
 *  les jambes quand elles s'écartent, puis remonte devant la jambe avant jusqu'au ventre.
 *  m.dos et m.ventre : points du buste (repère du buste), du haut vers le bas et du bas vers le haut. */
function manteau(D, sq, c, m) {
  const bord = (j, t, plus) => {
    const o = surJambe(j, t);
    const u = unit(sub(surJambe(j, t + 0.04), surJambe(j, Math.max(0, t - 0.04))));
    const n = v(-u.y, u.x);
    const r = (t <= 1 ? c.rCuisse + (c.rGenou - c.rCuisse) * t : c.rGenou) + plus;
    return [add(o, mul(n, r)), sub(o, mul(n, r))];
  };
  const dos = m.dos.map(([x, y]) => sq.T(x, y));
  const ventre = m.ventre.map(([x, y]) => sq.T(x, y));
  if ((sq.jN.h + sq.jF.h) / 2 > 60) {
    // assis : le manteau couvre les cuisses et retombe derrière sur le siège
    const pts = [...dos, ...ventre];
    for (const j of [sq.jN, sq.jF]) pts.push(...bord(j, Math.min(m.long, 0.95), m.ample * 0.6));
    if (m.basque) pts.push(sq.T(...m.basque));
    const tour = enveloppe(pts);
    const d = arrondi(tour, 0.3);
    D.formePts(d, tour);
    return d;
  }
  const [ar, av] = [sq.jN, sq.jF].sort((a, b) => surJambe(a, m.long).x - surJambe(b, m.long).x);
  const cote = (j, t, plus, devant) => {
    const [p, q] = bord(j, t, plus);
    return (p.x > q.x) === devant ? p : q;
  };
  // l'ourlet tombe droit, à la hauteur moyenne des deux jambes ; une fente s'ouvre au milieu quand elles s'écartent
  const t0 = Math.min(0.3, m.long);
  const bas = [ar, av].flatMap((j) => bord(j, m.long, m.ample));
  const yh = (surJambe(ar, m.long).y + surJambe(av, m.long).y) / 2;
  const xb = Math.min(...bas.map((p) => p.x));
  const xf = Math.max(...bas.map((p) => p.x));
  const xm = (surJambe(ar, m.long).x + surJambe(av, m.long).x) / 2;
  const ecart = surJambe(av, m.long).x - surJambe(ar, m.long).x;
  const fh = (m.fente ?? 0.1) * c.cuisse * Math.max(0, Math.min(1, (ecart - 40) / 60));
  const fente = fh > 6 ? [v(xm - 7, yh), v(xm, yh - fh), v(xm + 7, yh)] : [];
  const tour = [...dos, cote(ar, t0, m.ample * 0.4, false), v(xb, yh), ...fente, v(xf, yh), cote(av, t0, m.ample * 0.4, true), ...ventre];
  const d = arrondi(tour, 0.2);
  D.formePts(d, tour);
  if (fente.length) D.pli(`M${pt(v(xm, yh - fh))} L${pt(v(xm, yh - fh - 30))}`, null, 1.6);
  return d;
}

function tete(D, sq, pose, c, traces) {
  const f = repere(sq.cou, sq.lean + (pose.tete ?? 0), c.tete);
  const debut = D.pts.length;
  for (const d of traces) D.forme(d, f);
  D.tete = boite(D.pts.slice(debut));
  return f;
}

function boite(pts) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return [num(x), num(y), num(Math.max(...xs) - x), num(Math.max(...ys) - y)].map(Number);
}

// ——— objets tenus ———

const OBJETS = {
  canne(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const g = prise(b, c);
    const bas = v(g.x + (o.dx ?? 0), 0);
    const u = unit(sub(bas, g));
    D.membre(sub(g, mul(u, 16)), bas, 3.6, 3);
    D.rond(sub(g, mul(u, 18)), 6.5);
  },
  lanterne(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repere(prise(b, c), 0); // la lanterne pend droit
    D.forme('M -4 -10 C -4 -16 4 -16 4 -10 L 3 4 L -3 4 Z', f);
    D.forme('M -6 4 L 6 4 L 6 -2 L -6 -2 Z M -12 12 C -12 4 12 4 12 12 Z', f);
    D.forme('M -13 12 L 13 12 L 13 46 C 13 51 -13 51 -13 46 Z', f);
    D.forme('M 12 18 C 22 18 23 40 12 40 Z', f);
    D.pli('M -13 22 L 13 22 M -13 38 L 13 38', f, 1.6);
    if (o.allumee !== false) {
      D.accent('M 13 20 C 21 20 21 38 13 38 C 15 32 15 26 13 20 Z', f, '#f2c35b');
      D.accents.push(`<ellipse cx="${num(f(26, 29).x)}" cy="${num(f(26, 29).y)}" rx="20" ry="16" fill="#f2c35b" opacity="0.18"/>`);
    }
  },
  matraque(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repereMembre(b.poignet, b.dir + (o.rot ?? 0), c.main);
    D.membre(f(1, 4), f(1, 66), 4.5, 5.5);
  },
  carnet(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repere(prise(b, c), o.rot ?? 0);
    if (o.ferme) {
      D.forme('M -4 -30 L 22 -30 L 22 6 L -4 6 Z', f);
      D.trait('M 20 -27 L 20 3', f, PAPIER, 1.6, ' opacity="0.8"');
      return;
    }
    D.forme('M -6 -40 L 32 -40 L 32 8 L -6 8 Z', f);
    D.accent('M -3 -37 L 29 -37 L 29 5 L -3 5 Z', f, PAPIER);
    D.trait('M 2 -28 L 24 -28 M 2 -20 L 22 -20 M 2 -12 L 25 -12 M 2 -4 L 16 -4', f, '#8d8468', 1.2);
  },
  crayon(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repereMembre(prise(b, c), b.dir + (o.rot ?? 0));
    D.trait('M 0 -8 L 0 22', f, '#d6ad3a', 4.2);
    D.trait('M 0 22 L 0 28', f, '#3a2f1c', 2.2);
  },
  journal(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const k = o.taille ?? 1;
    const f = repere(prise(b, c), o.rot ?? -8, k);
    D.forme('M -10 4 L -18 -74 L 40 -86 L 52 -8 Z', f);
    D.accent('M -7 0 L -14 -70 L 37 -81 L 48 -10 Z', f, '#cfc6a8');
    if (o.titre) {
      const p0 = f(-8, -61);
      D.accents.push(`<text transform="translate(${pt(p0)}) rotate(${num((o.rot ?? -8) - 12.8)})" font-family="Georgia, serif" font-weight="bold" font-size="${num(7.6 * k * (o.police ?? 1))}" fill="#2a241c">${o.titre}</text>`);
    } else D.trait('M -10 -60 L 34 -70', f, '#2a241c', 4);
    D.trait('M -9 -50 L 12 -54 M -8 -42 L 12 -46 M -7 -34 L 13 -38 M -6 -26 L 14 -30 M 18 -55 L 38 -59 M 19 -47 L 40 -51 M 20 -39 L 41 -43 M 21 -31 L 42 -35', f, '#6d6550', 1.4);
  },
  loupe(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repereMembre(prise(b, c), b.dir + (o.rot ?? 0));
    D.membre(f(0, -6), f(0, 26), 4.2, 3.6);
    const centre = f(0, 46);
    D.formePts(
      `M${pt(add(centre, v(-20, 0)))} A20 20 0 1 0 ${pt(add(centre, v(20, 0)))} A20 20 0 1 0 ${pt(add(centre, v(-20, 0)))} Z M${pt(add(centre, v(-14.5, 0)))} A14.5 14.5 0 1 1 ${pt(add(centre, v(14.5, 0)))} A14.5 14.5 0 1 1 ${pt(add(centre, v(-14.5, 0)))} Z`,
      [sub(centre, v(20, 20)), add(centre, v(20, 20))],
      ' fill-rule="evenodd"',
    );
    D.accents.push(`<circle cx="${num(centre.x)}" cy="${num(centre.y)}" r="14.5" fill="#bfe0d8" opacity="0.32"/>`);
    D.accents.push(`<path d="M${pt(add(centre, v(-8, -7)))} Q${pt(add(centre, v(-4, -11)))} ${pt(add(centre, v(2, -11)))}" fill="none" stroke="#e9f4f1" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`);
  },
  panier(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repere(lerp(b.coude, b.poignet, 0.62), 0);
    D.forme('M -26 40 C -30 -8 30 -8 26 40 L 21 40 C 24 2 -24 2 -21 40 Z', f);
    D.forme('M -38 34 L 38 34 L 37 41 L -37 41 Z', f);
    D.forme('M -35 40 L 35 40 C 33 62 22 74 0 74 C -22 74 -33 62 -35 40 Z', f);
    D.pli('M -33 50 L 33 50 M -29 60 L 29 60 M -12 42 L -10 72 M 12 42 L 10 72', f, 1.5);
  },
  cravache(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repereMembre(prise(b, c), b.dir + (o.rot ?? 0));
    D.membre(f(0, -12), f(0, 96), 3.6, 1.5);
    D.forme('M -4 94 L 4 94 L 6 108 L -6 108 Z', f);
    D.rond(f(0, -14), 5);
  },
  sonde(D, sq, c, o) {
    // instrument du médecin : une fine sonde d'acier
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repereMembre(prise(b, c), b.dir + (o.rot ?? 0));
    D.membre(f(0, -6), f(0, 44), 2.8, 1.3);
    D.trait('M 0 8 L 0 42', f, ARGENT, 1.2, ' opacity="0.9"');
  },
  plume(D, sq, c, o) {
    // porte-plume d'acier ; la plume est rougie par l'encre
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repereMembre(prise(b, c), b.dir + (o.rot ?? 0));
    D.membre(f(0, -14), f(0, 26), 2.4, 1.8);
    D.forme('M -1.8 25 L 1.8 25 L 0 34 Z', f);
    if (o.encre) D.accent('M -1.6 27 L 1.6 27 L 0 34 Z', f, o.encre);
  },
  sac(D, sq, c, o) {
    // sac de toile plein de lettres, pendu au poing par son col
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repere(prise(b, c), o.rot ?? 0);
    const POCHE = 'M -15 24 C -40 34 -50 62 -46 96 C -44 116 -30 124 0 124 C 30 124 44 116 46 96 C 50 62 40 34 15 24 Z';
    D.forme('M -8 -4 C -10 4 -12 10 -16 14 C -40 26 -50 60 -46 96 C -44 116 -30 124 0 124 C 30 124 44 116 46 96 C 50 60 40 26 16 14 C 12 10 10 4 8 -4 Z', f);
    // la toile, plus claire que l'uniforme, et ses plis
    D.accent(POCHE, f, '#4a4536');
    D.trait('M -30 44 C -20 62 -18 90 -24 114 M 22 38 C 30 62 30 90 24 114 M -40 74 C -10 82 14 82 42 72', f, '#2b281e', 1.8);
    // lettres qui dépassent du col
    D.accent('M -14 2 L 2 -22 L 12 -16 L -4 8 Z', f, PAPIER, ' opacity="0.9"');
    D.accent('M 2 4 L 22 -14 L 28 -6 L 8 10 Z', f, '#c9bf9e', ' opacity="0.9"');
  },
  convocation(D, sq, c, o) {
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repere(prise(b, c), o.rot ?? -14, o.taille ?? 1);
    D.accent('M -6 -10 L 40 -10 L 40 20 L -6 20 Z', f, PAPIER);
    D.trait('M 0 -2 L 30 -2 M 0 5 L 34 5 M 0 12 L 22 12', f, '#8d8468', 1.2);
  },
  registre(D, sq, c, o) {
    // gros livre de comptes, serré contre la poitrine : toile verte, étiquette de papier
    const b = o.bras === 'F' ? sq.bF : sq.bN;
    const f = repere(prise(b, c), o.rot ?? 0, o.taille ?? 1);
    D.forme('M -10 -58 L 34 -58 L 34 12 L -10 12 Z', f);
    D.accent('M -7 -55 L 31 -55 L 31 9 L -7 9 Z', f, o.couleur ?? '#2f4c3e');
    D.accent('M 4 -42 L 24 -42 L 24 -30 L 4 -30 Z', f, PAPIER, ' opacity="0.9"');
    D.trait('M -4 -55 L -4 9', f, '#1a2a22', 2.4);
  },
};

function objets(D, sq, c, pose) {
  for (const o of pose.objets ?? []) OBJETS[o.type](D, sq, c, o);
}

// ——— visages et coiffes (repère de la tête : origine en haut du cou, x vers l'avant) ———

const VISAGE = (nez = 0) =>
  `M -14 24 C -14 14 -16 6 -19 0 C -29 -6 -33 -22 -32 -40 C -31 -60 -15 -73 4 -74 C 22 -74 33 -64 35 -50 C 36 -44 38 -40 39 -37 C 36 -35 35 -33 36 -31 C 38 -27 ${42 + nez * 0.5} -22 ${47 + nez} -17 C ${48 + nez} -15 ${45 + nez * 0.5} -13 42 -13 C 40 -13 39 -12 40 -10 C 41 -8 40 -7 38 -6 C 39 -5 40 -3 39 -2 C 37 0 36 2 37 4 C 38 7 36 10 32 11 C 26 12 20 11 16 10 C 12 12 11 17 11 24 Z`;
const VISAGE_F =
  'M -12 24 C -12 14 -14 6 -16 0 C -26 -6 -29 -20 -28 -36 C -27 -54 -13 -66 4 -67 C 20 -67 29 -58 31 -46 C 32 -41 33 -38 34 -35 C 32 -33 31 -31 32 -29 C 34 -26 37 -22 40 -18 C 41 -16 39 -14 36 -14 C 35 -13 35 -12 36 -11 C 36 -9 35 -8 34 -7 C 35 -6 35 -4 34 -3 C 32 -1 32 1 32 3 C 32 6 29 8 26 8 C 21 9 17 8 14 8 C 11 10 10 16 10 24 Z';

const HOMME = {
  cuisse: 138, tibia: 134, bras: 104, avant: 88,
  hanche: [0, 0], epaule: [-2, -168], cou: [8, -198],
  rCuisse: 24, rGenou: 16, rCheville: 11, rBras: 14, rCoude: 12, rPoignet: 9,
  semelle: 20, pointe: 50, pied: 1, main: 1, tete: 1.1,
};

// ——— les personnages ———

const commissaire = {
  id: 'commissaire',
  nom: 'Le commissaire',
  portrait: 'gros, grosse barbe, casquette d’officier à galon d’or, redingote, canne',
  c: { ...HOMME, cuisse: 132, tibia: 128, rCuisse: 30, rGenou: 19, rCheville: 13, rBras: 18, rCoude: 15, rPoignet: 11, cou: [12, -196], main: 1.08, pied: 1.05, tete: 1.16 },
  dessiner(D, sq, pose, c) {
    jambes(D, sq, c);
    D.forme(
      'M -12 -192 C -26 -188 -38 -178 -40 -160 C -44 -134 -42 -104 -38 -80 C -36 -60 -40 -36 -42 -16 C -44 4 -36 18 -20 22 L 30 24 C 60 20 84 0 88 -30 C 92 -62 80 -96 60 -118 C 50 -130 44 -150 38 -166 C 32 -180 24 -188 16 -192 Z',
      sq.T,
    );
    manteau(D, sq, c, { dos: [[-40, -70], [-42, 10]], ventre: [[60, -6], [74, -40]], long: 0.92, ample: 10, fente: 0.45, basque: [-46, 20] });
    brasEtMains(D, sq, c);
    const f = tete(D, sq, pose, c, [
      VISAGE(5),
      // barbe touffue qui tombe sur la poitrine, moustache sous le nez
      'M -6 -40 C -12 -30 -12 -16 -8 -4 C -8 8 -2 20 4 32 C 7 40 12 46 18 52 C 22 48 25 54 31 52 C 35 48 39 50 41 44 C 45 40 48 36 47 28 C 50 22 48 16 48 10 C 50 4 46 0 46 -4 C 51 -5 52 -9 47 -11 C 44 -12 42 -11 39 -12 L 30 -28 Z',
      // casquette à visière
      'M -31 -40 L -33 -58 C -38 -62 -38 -69 -31 -71 L 31 -75 C 38 -75 39 -68 34 -63 L 33 -50 C 42 -49 50 -45 54 -40 C 47 -38 40 -40 32 -42 Z',
    ]);
    D.pli('M 6 10 C 10 22 14 32 18 42 M 22 2 C 26 16 30 26 30 40 M 38 -2 C 40 10 42 20 40 32', f, 1.6);
    D.trait('M -32 -49 L 33 -53', f, OR, 3);
    D.accents.push(`<circle cx="${num(f(25, -62).x)}" cy="${num(f(25, -62).y)}" r="3.5" fill="${OR}"/>`);
    // boutons et chaîne de montre sur la panse
    const T = sq.T;
    for (const [x, y] of [[48, -128], [70, -98], [82, -66], [84, -34]]) {
      const p = T(x, y);
      D.accents.push(`<circle cx="${num(p.x)}" cy="${num(p.y)}" r="3.2" fill="${OR}" opacity="0.9"/>`);
    }
    D.trait('M 50 -58 C 58 -46 70 -44 80 -48', T, OR, 1.8, ' opacity="0.85"');
    // médailles de campagne : rubans et disques
    [['#8c2a24', 28], ['#2f5687', 36], ['#c9a04a', 44], ['#8c2a24', 52]].forEach(([ruban, x]) => {
      D.accent(`M ${x} -126 L ${x + 6} -126 L ${x + 6} -115 L ${x} -115 Z`, T, ruban);
      const p = T(x + 3, -110);
      D.accents.push(`<circle cx="${num(p.x)}" cy="${num(p.y)}" r="3.4" fill="${OR}"/>`);
    });
    D.pli('M 56 -122 C 76 -96 86 -64 86 -30 C 84 -6 72 12 56 20', T, 1.8);
    objets(D, sq, c, pose);
  },
  poses: {
    debout: {
      nom: 'debout, appuyé sur sa canne',
      lean: -3, tete: -3,
      jN: { h: 6, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 24, e: 14, main: 'poing' }, bF: { a: -26, e: 100, main: 'cachee', ra: 0.45 },
      objets: [{ type: 'canne', bras: 'N', dx: 14 }],
    },
    marche: {
      nom: 'marche, la canne en avant',
      lean: 3,
      jN: { h: 20, k: 4, f: -14 }, jF: { h: -16, k: 22, f: 26 },
      bN: { a: 28, e: 18, main: 'poing' }, bF: { a: -20, e: 16, main: 'ouverte' },
      objets: [{ type: 'canne', bras: 'N', dx: 30 }],
    },
    accuse: {
      nom: 'pointe du doigt, poing sur la hanche',
      lean: 4, tete: -6,
      jN: { h: 12, k: 2 }, jF: { h: -8, k: 0 },
      bN: { a: 96, e: 2, main: 'doigt' }, bF: { a: -38, e: 112, main: 'cachee', ra: 0.55 },
    },
    brandit: {
      nom: 'brandit un journal froissé, la cravache à la main',
      lean: -4, tete: -8,
      jN: { h: 12, k: 2 }, jF: { h: -9, k: 0 },
      bN: { a: 146, e: 12, main: 'poing' }, bF: { a: 14, e: 34, main: 'poing' },
      objets: [{ type: 'journal', bras: 'N', titre: 'THE COMET', taille: 1.6, rot: -6 }, { type: 'cravache', bras: 'F', rot: 12 }],
    },
    assis: {
      nom: 'assis, les mains sur la canne',
      lean: -8, siege: true,
      jN: { h: 82, k: 84 }, jF: { h: 88, k: 80 },
      bN: { a: 44, e: 34, main: 'poing' }, bF: { a: 40, e: 40, main: 'poing' },
      objets: [{ type: 'canne', bras: 'N', dx: 8 }],
    },
  },
};

const agent = {
  id: 'agent',
  nom: 'L’agent',
  portrait: 'grand, casque de la police métropolitaine, moustache, tunique ceinturée, lanterne sourde, matraque',
  c: { ...HOMME, cuisse: 146, tibia: 142, bras: 108, avant: 92, epaule: [-2, -176], cou: [8, -206], rCuisse: 23, rGenou: 15, rBras: 13, rCoude: 11.5 },
  dessiner(D, sq, pose, c) {
    jambes(D, sq, c, BOTTINE);
    D.forme(
      'M -10 -202 C -22 -198 -32 -188 -34 -172 C -38 -146 -36 -116 -32 -92 C -30 -76 -32 -54 -34 -34 C -36 -12 -31 8 -18 16 L 16 18 C 28 10 30 -12 30 -36 C 30 -60 30 -80 34 -104 C 40 -130 40 -164 28 -184 C 24 -192 20 -196 16 -200 Z',
      sq.T,
    );
    manteau(D, sq, c, { dos: [[-34, -64]], ventre: [[31, -64]], long: 0.42, ample: 6, fente: 0.2 });
    // ceinturon et boucle
    D.pli('M -36 -64 L 32 -64 M -36 -54 L 32 -54', sq.T, 1.8);
    const boucle = sq.T(30, -59);
    D.accents.push(`<rect x="${num(boucle.x - 4)}" y="${num(boucle.y - 5)}" width="6" height="10" fill="${ARGENT}" opacity="0.85"/>`);
    for (const y of [-160, -134, -108, -84]) {
      const p = sq.T(31 + (y < -120 ? 4 : 0), y);
      D.accents.push(`<circle cx="${num(p.x)}" cy="${num(p.y)}" r="2.6" fill="${ARGENT}" opacity="0.8"/>`);
    }
    brasEtMains(D, sq, c);
    const f = tete(D, sq, pose, c, [
      VISAGE(1),
      // moustache
      'M 37 -12 C 45 -13 50 -9 49 -3 C 44 -5 39 -5 35 -7 Z',
      // casque
      'M -40 -24 C -36 -27 -34 -32 -33 -40 C -32 -66 -22 -86 -4 -94 L -3 -99 L -1 -105 L 2 -105 L 4 -99 L 5 -95 C 22 -90 32 -76 34 -60 C 35 -52 38 -48 44 -44 C 46 -42 44 -40 40 -40 C 30 -42 10 -44 -10 -40 C -22 -36 -32 -28 -40 -24 Z',
    ]);
    if (pose.galons) {
      const b = sq.bN;
      const u = unit(sub(b.coude, b.epaule));
      const g = repereMembre(lerp(b.epaule, b.coude, 0.5), Math.atan2(u.x, u.y) / RAD);
      for (let k = 0; k < pose.galons; k++) D.trait(`M -8 ${k * 7 - 6} L 0 ${k * 7} L 8 ${k * 7 - 6}`, g, '#c7c0a4', 2.4);
    }
    if (pose.poche) {
      // poche de poitrine : une pièce d'argent et le coin d'une carte de visite
      D.pli('M 6 -150 L 26 -150 L 26 -132 L 6 -132 Z', sq.T, 1.6);
      D.accent('M 12 -150 L 22 -152 L 23 -157 L 13 -155 Z', sq.T, PAPIER);
      const piece = sq.T(10, -152);
      D.accents.push(`<circle cx="${num(piece.x)}" cy="${num(piece.y)}" r="3.2" fill="#c9cfc8"/>`);
    }
    D.pli('M -33 -40 C -10 -46 16 -46 36 -44', f, 1.6);
    D.accent('M 20 -74 L 22 -68 L 28 -68 L 23 -64 L 25 -58 L 20 -62 L 15 -58 L 17 -64 L 12 -68 L 18 -68 Z', f, ARGENT, ' opacity="0.9"');
    objets(D, sq, c, pose);
  },
  poses: {
    debout: {
      nom: 'au repos, les mains dans le dos',
      lean: -2, tete: -2,
      jN: { h: 4, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: -22, e: 96, main: 'cachee', ra: 0.4 }, bF: { a: -18, e: 90, main: 'cachee', ra: 0.4 },
    },
    ronde: {
      nom: 'fait sa ronde, lanterne à la main',
      lean: 3,
      jN: { h: 20, k: 4, f: -14 }, jF: { h: -16, k: 22, f: 26 },
      bN: { a: 16, e: 30, main: 'poing' }, bF: { a: -20, e: 14, main: 'ouverte' },
      objets: [{ type: 'lanterne', bras: 'N' }],
    },
    halte: {
      nom: 'lève la main : halte !',
      tete: -4,
      jN: { h: 14, k: 2 }, jF: { h: -10, k: 0 },
      bN: { a: 84, e: 84, main: 'ouverte' }, bF: { a: 6, e: 20, main: 'poing' },
      objets: [{ type: 'matraque', bras: 'F' }],
    },
    sergent: {
      nom: 'sergent de service, tête basse, les mains sur le comptoir',
      lean: 6, tete: 26, galons: 3, poche: true,
      jN: { h: 4, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: 22, e: 58, main: 'poing' }, bF: { a: 30, e: 52, main: 'poing' },
    },
    examine: {
      nom: 'un genou à terre, éclaire le sol',
      lean: 28, tete: 18,
      jN: { h: 92, k: 96 }, jF: { h: 4, k: 92, f: 70 },
      bN: { a: 40, e: -6, main: 'poing' }, bF: { a: 24, e: 20, main: 'ouverte' },
      objets: [{ type: 'lanterne', bras: 'N' }],
    },
    carnet: {
      nom: 'sergent, note dans son carnet',
      lean: 2, tete: 12, galons: 3,
      jN: { h: 5, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 26, e: 98, main: 'poing' }, bF: { a: 18, e: 108, main: 'poing' },
      objets: [{ type: 'carnet', bras: 'N', rot: -10 }, { type: 'crayon', bras: 'F', rot: 40 }],
    },
    sac: {
      nom: 'emporte un sac de lettres',
      lean: -2, tete: 2,
      jN: { h: 6, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: 8, e: 4, main: 'poing' }, bF: { a: -22, e: 96, main: 'cachee', ra: 0.4 },
      objets: [{ type: 'sac', bras: 'N' }],
    },
  },
};

const journaliste = {
  id: 'journaliste',
  nom: 'Le journaliste',
  portrait: 'chapeau melon, crayon derrière l’oreille, long pardessus, carnet',
  c: { ...HOMME },
  dessiner(D, sq, pose, c) {
    jambes(D, sq, c);
    const BUSTE = 'M -10 -194 C -22 -190 -32 -180 -34 -164 C -38 -138 -37 -110 -33 -86 C -31 -70 -33 -50 -35 -30 C -37 -10 -32 8 -18 16 L 16 18 C 28 10 32 -12 32 -38 C 32 -62 30 -82 32 -104 C 36 -130 36 -160 26 -178 C 23 -184 20 -188 16 -192 Z';
    D.forme(BUSTE, sq.T);
    const dManteau = manteau(D, sq, c, { dos: [[-36, -96], [-38, -20]], ventre: [[34, -20], [33, -96]], long: 1.1, ample: 14, fente: 0.55 });
    // col relevé et rabat de poche
    D.forme('M -14 -200 C -24 -196 -30 -186 -32 -174 L -10 -178 Z', sq.T);
    D.pli('M 30 -170 C 22 -140 26 -100 30 -60', sq.T, 1.8);
    brasEtMains(D, sq, c);
    const f = tete(D, sq, pose, c, [
      VISAGE(2),
      'M -27 -46 C -30 -62 -24 -84 2 -85 C 26 -85 32 -64 29 -46 Z',
      'M -40 -44 C -37 -49 -20 -49 0 -49 C 18 -49 38 -52 45 -47 C 46 -43 42 -42 38 -43 C 18 -44 -14 -45 -34 -40 C -39 -39 -42 -41 -40 -44 Z',
    ]);
    D.pli('M -27 -52 C -6 -54 14 -54 29 -52', f, 2.2);
    // manteau à carreaux : le motif ne couvre que le buste, le manteau et les manches
    const manches = [sq.bN, sq.bF].flatMap((b) => [gelule(b.epaule, b.coude, c.rBras, c.rCoude), gelule(b.coude, b.poignet, c.rCoude, c.rPoignet)]);
    D.defs.push(`<clipPath id="{id}-manteau"><path d="${trace(BUSTE, sq.T)}"/><path d="${dManteau}"/>${manches.map((d) => `<path d="${d}"/>`).join('')}</clipPath>`);
    D.defs.push(`<pattern id="{id}-carreaux" patternUnits="userSpaceOnUse" width="18" height="18" patternTransform="rotate(${num(sq.lean)})"><path d="M0 9 H18 M9 0 V18" stroke="#6a5a3c" stroke-width="2.2" opacity="0.55"/><path d="M0 3 H18 M3 0 V18" stroke="#33423f" stroke-width="1.2" opacity="0.7"/></pattern>`);
    D.accents.push(`<rect x="-400" y="-800" width="800" height="800" fill="url(#{id}-carreaux)" clip-path="url(#{id}-manteau)"/>`);
    // le crayon reste derrière l'oreille tant qu'il n'est pas dans la main
    if (!(pose.objets ?? []).some((o) => o.type === 'crayon')) D.trait('M -12 -22 L 4 -36', f, '#d6ad3a', 3.4);
    objets(D, sq, c, pose);
  },
  poses: {
    note: {
      nom: 'prend des notes',
      lean: 2, tete: 12,
      jN: { h: 5, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 26, e: 98, main: 'poing' }, bF: { a: 18, e: 108, main: 'poing' },
      objets: [{ type: 'carnet', bras: 'N', rot: -10 }, { type: 'crayon', bras: 'F', rot: 40 }],
    },
    carnet: {
      nom: 'serre son carnet contre lui, le crayon derrière l’oreille',
      lean: 3, tete: 6,
      jN: { h: 6, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: 12, e: 116, main: 'poing' }, bF: { a: 4, e: 24, main: 'poche' },
      objets: [{ type: 'carnet', bras: 'N', rot: 8, ferme: true }],
    },
    billet: {
      nom: 'lit en douce un petit mot plié, le crayon derrière l’oreille',
      lean: 4, tete: 16,
      jN: { h: 6, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: 26, e: 104, main: 'poing' }, bF: { a: 4, e: 24, main: 'poche' },
      objets: [{ type: 'convocation', bras: 'N', rot: -24, taille: 0.85 }],
    },
    presse: {
      nom: 'marche vite, carnet en main',
      lean: 8,
      jN: { h: 24, k: 6, f: -16 }, jF: { h: -20, k: 30, f: 32 },
      bN: { a: -24, e: 30, main: 'poing' }, bF: { a: 24, e: 30, main: 'poing' },
      objets: [{ type: 'carnet', bras: 'N', rot: 20, ferme: true }],
    },
    interroge: {
      nom: 'penché, tend l’oreille et le carnet',
      lean: 14, tete: 4,
      jN: { h: 16, k: 8 }, jF: { h: -10, k: 2 },
      bN: { a: 70, e: 18, main: 'poing' }, bF: { a: 34, e: 84, main: 'poing' },
      objets: [{ type: 'carnet', bras: 'N', rot: -6 }, { type: 'crayon', bras: 'F', rot: 40 }],
    },
    brandit: {
      nom: 'brandit le journal',
      lean: -2, tete: -10,
      jN: { h: 12, k: 2 }, jF: { h: -8, k: 0 },
      bN: { a: 150, e: 14, main: 'poing' }, bF: { a: -34, e: 110, main: 'cachee', ra: 0.55 },
      objets: [{ type: 'journal', bras: 'N' }],
    },
  },
};

const ECHARPE = '#b3873a';

const joueur = {
  id: 'joueur',
  nom: 'Le joueur',
  portrait: 'petit reporter de l’East End : jeune, mince, casquette plate, écharpe, veste courte, loupe de détective',
  c: { ...HOMME, cuisse: 132, tibia: 128, bras: 98, avant: 84, epaule: [-2, -160], cou: [6, -188], rCuisse: 20, rGenou: 14, rCheville: 10, rBras: 12, rCoude: 10, rPoignet: 8, main: 0.92, pied: 0.94, tete: 1.06 },
  dessiner(D, sq, pose, c) {
    jambes(D, sq, c, BOTTINE);
    D.forme(
      'M -9 -184 C -20 -180 -29 -170 -31 -156 C -34 -132 -33 -106 -30 -84 C -28 -68 -30 -50 -31 -30 C -33 -10 -29 6 -16 14 L 14 16 C 25 8 28 -12 28 -36 C 28 -60 27 -80 29 -100 C 32 -124 31 -152 23 -168 C 20 -176 18 -180 14 -182 Z',
      sq.T,
    );
    manteau(D, sq, c, { dos: [[-31, -60]], ventre: [[29, -60]], long: 0.14, ample: 5 });
    // mains dans les poches : l'avant-bras plonge dans la veste
    brasEtMains(D, sq, c);
    const f = tete(D, sq, pose, c, [
      VISAGE(-2),
      // mèche dans la nuque
      'M -30 -40 C -36 -32 -34 -22 -28 -14 C -27 -20 -24 -24 -24 -30 C -22 -26 -20 -24 -18 -24 Z',
      // casquette plate
      'M -33 -40 C -37 -52 -30 -70 -6 -76 C 16 -80 34 -72 40 -60 C 44 -56 52 -54 56 -50 C 56 -46 50 -45 44 -45 C 30 -45 8 -45 -10 -42 C -20 -40 -28 -38 -33 -40 Z',
    ]);
    D.pli('M -30 -46 C -8 -50 18 -50 40 -50', f, 1.6);
    // écharpe : un tour au cou, un pan qui pend ou vole au vent
    const T = sq.T;
    const tour = 'M -16 -194 C -6 -200 14 -198 22 -190 L 20 -176 C 10 -182 -6 -182 -16 -178 Z';
    D.forme(tour, T);
    D.accent(tour, T, ECHARPE);
    const vent = pose.echarpe ?? 0;
    const base = vent > 20 ? T(-12, -186) : T(16, -184);
    const r = ruban(base, vent > 20 ? -vent : 6 + (pose.lean ?? 0) * 0.2, vent > 20 ? 92 : 78, 15, vent > 20 ? 7 : 2, 0.85);
    D.formePts(r.d, r.pts);
    D.accent(r.d, null, ECHARPE);
    D.trait(`M${pt(add(r.bout, mul(r.n, 6)))} L${pt(add(add(r.bout, mul(r.n, 6)), mul(r.u, 9)))} M${pt(r.bout)} L${pt(add(r.bout, mul(r.u, 10)))} M${pt(sub(r.bout, mul(r.n, 6)))} L${pt(add(sub(r.bout, mul(r.n, 6)), mul(r.u, 9)))}`, null, ECHARPE, 2);
    D.trait('M -14 -186 C -2 -191 12 -189 21 -183', T, '#8a6526', 1.6);
    objets(D, sq, c, pose);
  },
  poses: {
    debout: {
      nom: 'les mains dans les poches',
      lean: 2, tete: 6,
      jN: { h: 7, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 10, e: 30, main: 'poche' }, bF: { a: 6, e: 30, main: 'poche' },
    },
    marche: {
      nom: 'presse le pas, l’écharpe au vent',
      lean: 8, echarpe: 70,
      jN: { h: 26, k: 8, f: -14 }, jF: { h: -22, k: 34, f: 34 },
      bN: { a: -30, e: 40, main: 'poing' }, bF: { a: 30, e: 50, main: 'poing' },
    },
    loupe: {
      nom: 'penché, la loupe à l’œil',
      lean: 24, tete: 6,
      jN: { h: 24, k: 26 }, jF: { h: -4, k: 12 },
      bN: { a: 62, e: 72, main: 'poing' }, bF: { a: 16, e: 34, main: 'ouverte' },
      objets: [{ type: 'loupe', bras: 'N' }],
    },
    assis: {
      nom: 'assis, écrit sur son genou',
      lean: 12, tete: 16, siege: true,
      jN: { h: 80, k: 84 }, jF: { h: 86, k: 92 },
      bN: { a: 40, e: 50, main: 'poing' }, bF: { a: 34, e: 70, main: 'poing' },
      objets: [{ type: 'carnet', bras: 'F', rot: 70 }, { type: 'crayon', bras: 'N', rot: 20 }],
    },
  },
};

const CHALE = '#6e2420';

const temoin = {
  id: 'temoin',
  nom: 'La témoin',
  portrait: 'femme du quartier : bonnet, châle rouge, jupe longue à tournure',
  c: { ...HOMME, cuisse: 128, tibia: 124, bras: 94, avant: 80, epaule: [-2, -150], cou: [6, -178], rCuisse: 20, rGenou: 14, rCheville: 9, rBras: 11, rCoude: 9.5, rPoignet: 7.5, main: 0.85, pied: 0.88, semelle: 18, pointe: 44 },
  dessiner(D, sq, pose, c) {
    const T = sq.T;
    const H = sq.hanche;
    for (const j of [sq.jF, sq.jN]) D.forme(BOTTINE, repere(j.cheville, j.pied, c.pied));
    const assise = (sq.jN.h + sq.jF.h) / 2 > 60;
    const genou = [sq.jN, sq.jF].reduce((a, j) => (j.genou.x > a.genou.x ? j : a));
    const chevAv = Math.max(sq.jN.cheville.x, sq.jF.cheville.x);
    const chevAr = Math.min(sq.jN.cheville.x, sq.jF.cheville.x);
    let jupe;
    if (assise) {
      const K = genou.genou;
      jupe = [
        T(-22, -56), T(-36, -22), T(-40, 16), v(H.x + 6, H.y + 30), v(K.x - 40, K.y + 34), v(chevAr - 34, -2), v(chevAr - 28, 0),
        v(K.x + 40, 0), v(K.x + 38, -10), v(K.x + 24, K.y + 4), v(K.x + 8, K.y - 24), T(36, -24), T(20, -56),
      ];
    } else {
      const avant = Math.max(H.x + 60, chevAv + 30);
      const arriere = Math.min(H.x - 74, chevAr - 34);
      const bombe = Math.max(sq.jN.genou.x, sq.jF.genou.x) + 22;
      jupe = [
        T(-22, -56), T(-50, -36), T(-62, -4), v(H.x - 66, H.y + 70), v(arriere, -10), v(arriere + 4, 0),
        v(avant, 0), v(avant + 2, -10), v(bombe, (H.y + sq.jN.genou.y) / 2 + 30), T(32, 10), T(20, -56),
      ];
    }
    D.formePts(arrondi(jupe, 0.32), jupe);
    D.forme(
      'M -8 -176 C -18 -172 -26 -164 -28 -150 C -30 -126 -26 -100 -22 -78 C -20 -66 -22 -56 -24 -48 L 22 -48 C 20 -60 18 -72 20 -84 C 30 -96 36 -112 32 -134 C 30 -150 24 -164 14 -174 Z',
      T,
    );
    if (!assise) {
      // plis de la jupe
      const bas = (x) => v(x, -2);
      D.pli(`M${pt(T(4, -40))} Q${pt(v(H.x + 2, H.y + 120))} ${pt(bas(H.x - 4))}`, null, 2.2);
      D.pli(`M${pt(T(-30, -10))} Q${pt(v(H.x - 40, H.y + 120))} ${pt(bas(H.x - 46))}`, null, 2.2);
    } else {
      const K = genou.genou;
      D.pli(`M${pt(v(K.x + 18, K.y + 12))} Q${pt(v(K.x + 30, K.y + 70))} ${pt(v(K.x + 28, -2))}`, null, 2.2);
      D.pli(`M${pt(v(K.x - 6, K.y + 20))} Q${pt(v(K.x - 2, K.y + 80))} ${pt(v(K.x - 10, -2))}`, null, 2.2);
    }
    brasEtMains(D, sq, c);
    // châle : sur les épaules, pointe dans le dos ; il retombe sur le haut du bras proche
    const CHALE_D = 'M -10 -184 C -24 -182 -34 -170 -36 -152 C -40 -126 -42 -100 -40 -78 L -34 -50 C -24 -66 -10 -84 4 -96 C 16 -106 30 -112 37 -116 C 39 -132 35 -150 27 -164 C 21 -174 13 -182 4 -186 Z';
    D.forme(CHALE_D, T);
    D.accent(CHALE_D, T, CHALE);
    const b = sq.bN;
    const u = unit(sub(b.coude, b.epaule));
    const n = v(-u.y, u.x);
    const coude = lerp(b.epaule, b.coude, 0.9);
    const drape = enveloppe([b.epaule, add(coude, mul(n, c.rCoude + 5)), sub(coude, mul(n, c.rCoude + 5)), T(6, -104), T(-26, -104), T(-20, -170), T(18, -166)]);
    const dDrape = arrondi(drape, 0.3);
    D.formePts(dDrape, drape);
    D.accent(dDrape, null, CHALE);
    D.trait('M -36 -132 Q -30 -110 -37 -88 M -8 -170 Q 4 -142 22 -124', T, '#561c19', 2.2);
    // franges
    D.trait('M -38 -74 L -42 -64 M -36 -62 L -39 -52 M -28 -60 L -30 -50 M -20 -70 L -21 -60 M -10 -80 L -10 -70 M 0 -90 L 1 -80 M 12 -100 L 13 -90 M 24 -107 L 26 -97', T, '#4a1714', 2);
    const f = tete(D, sq, pose, c, [
      VISAGE_F,
      // chignon sous le bonnet
      'M -26 -28 C -38 -28 -40 -12 -30 -8 C -24 -8 -20 -16 -22 -24 Z',
      // bonnet : posé sur l'arrière de la tête, la passe dégage le visage
      'M -22 2 C -34 -4 -38 -26 -34 -46 C -30 -66 -12 -78 8 -77 C 24 -76 34 -68 37 -58 C 38 -52 35 -48 31 -50 C 23 -54 13 -54 8 -48 C 4 -40 2 -26 -2 -16 C -6 -8 -12 -2 -16 2 Z',
      // nœud sous le menton
      'M 14 8 C 8 4 4 10 8 14 C 12 16 14 14 16 12 C 18 16 22 20 26 16 C 28 10 22 8 18 10 Z',
    ]);
    D.pli('M 31 -50 C 23 -54 13 -54 8 -48 M -2 -16 C 4 -4 10 4 14 9', f, 1.6);
    objets(D, sq, c, pose);
  },
  poses: {
    debout: {
      nom: 'debout, le panier au bras',
      lean: -1, tete: 2,
      jN: { h: 3, k: 0 }, jF: { h: -3, k: 0 },
      bN: { a: 6, e: 84, main: 'poing' }, bF: { a: 10, e: 70, main: 'cachee' },
      objets: [{ type: 'panier', bras: 'N' }],
    },
    marche: {
      nom: 'marche, serre son châle',
      lean: 4,
      jN: { h: 18, k: 4, f: -10 }, jF: { h: -14, k: 20, f: 24 },
      bN: { a: 20, e: 110, main: 'poing' }, bF: { a: -14, e: 20, main: 'cachee' },
    },
    montre: {
      nom: 'montre du doigt, la main sur le cœur',
      lean: -4, tete: -4,
      jN: { h: 8, k: 0 }, jF: { h: -6, k: 0 },
      bN: { a: 100, e: 0, main: 'doigt' }, bF: { a: 20, e: 120, main: 'ouverte' },
    },
    assise: {
      nom: 'assise, la convocation à la main',
      lean: 4, tete: 6, siege: true,
      jN: { h: 84, k: 88 }, jF: { h: 88, k: 86 },
      bN: { a: 34, e: 60, main: 'poing' }, bF: { a: 30, e: 50, main: 'cachee' },
      objets: [{ type: 'convocation', bras: 'N' }],
    },
  },
};

const TABLIER = '#6b6756';
const CHEMISE = '#d9d3bd';

const docteur = {
  id: 'docteur',
  nom: 'Le médecin',
  portrait: 'médecin légiste : favoris, front dégarni, pince-nez, gilet, manches de chemise retroussées, long tablier de toile',
  c: { ...HOMME, cuisse: 136, tibia: 130, bras: 102, avant: 86, epaule: [-4, -164], cou: [6, -194], rCuisse: 23, rGenou: 15.5, rBras: 13.5, rCoude: 11.5, rPoignet: 8.5, tete: 1.08 },
  dessiner(D, sq, pose, c) {
    const T = sq.T;
    jambes(D, sq, c);
    D.forme(
      'M -10 -190 C -22 -186 -32 -176 -34 -160 C -38 -134 -36 -106 -32 -84 C -30 -68 -32 -50 -33 -30 C -35 -10 -30 8 -18 14 L 16 16 C 28 8 32 -12 32 -36 C 32 -58 32 -80 34 -100 C 38 -126 36 -158 26 -176 C 22 -184 18 -188 14 -190 Z',
      T,
    );
    // tablier de toile : la bavette sur la poitrine, la jupe tombe devant les jambes jusqu'aux mollets
    const bas = 1.5;
    const devant = (j, t, plus) => {
      const o = surJambe(j, t);
      return v(o.x + (t <= 1 ? c.rCuisse : c.rGenou) + plus, o.y);
    };
    const avant = [sq.jN, sq.jF].reduce((a, j) => (surJambe(j, bas).x > surJambe(a, bas).x ? j : a));
    const yb = Math.max(...[sq.jN, sq.jF].map((j) => surJambe(j, bas).y));
    const xArr = Math.min(...[sq.jN, sq.jF].map((j) => surJambe(j, bas).x)) - 6;
    const jupe = [T(-14, -66), T(36, -66), devant(avant, 0.4, 10), devant(avant, 1, 10), v(devant(avant, bas, 8).x, yb), v(xArr, yb)];
    const dJupe = arrondi(jupe, 0.18);
    D.formePts(dJupe, jupe);
    D.accent(dJupe, null, TABLIER);
    const BAVETTE = 'M 12 -154 L 31 -156 C 34 -130 36 -96 36 -66 L -4 -66 C 2 -96 6 -128 12 -154 Z';
    D.accent(BAVETTE, T, TABLIER);
    D.trait('M 13 -154 L 0 -188 M 29 -156 L 18 -190', T, TABLIER, 2.4);
    D.trait('M -14 -72 L 34 -72', T, '#55523f', 1.6);
    D.pli(`M${pt(lerp(jupe[0], jupe[5], 0.5))} L${pt(v(xArr + 10, yb - 8))}`, null, 1.6);
    brasEtMains(D, sq, c);
    // le bras proche passe devant le tablier : on le redessine en noir par-dessus
    {
      const b = sq.bN;
      D.accents.push(`<path d="${gelule(b.epaule, b.coude, c.rBras, c.rCoude)}" fill="${NOIR}"/><path d="${gelule(b.coude, b.poignet, c.rCoude, c.rPoignet)}" fill="${NOIR}"/>`);
      if (b.main !== 'cachee' && b.main !== 'poche') D.accent(MAINS[b.main], repereMembre(b.poignet, b.dir, c.main), NOIR);
      if (b.main === 'doigt') {
        const m = repereMembre(b.poignet, b.dir, c.main);
        D.accents.push(`<path d="${gelule(m(4, 18), m(4, 46), 4.6 * c.main, 3.6 * c.main)}" fill="${NOIR}"/>`);
      }
    }
    // manches de chemise retroussées au coude
    for (const b of [sq.bF, sq.bN]) {
      const u = unit(sub(b.poignet, b.coude));
      const n = v(-u.y, u.x);
      const m = add(b.coude, mul(u, 8));
      D.trait(`M${pt(add(m, mul(n, c.rCoude)))} L${pt(sub(m, mul(n, c.rCoude)))}`, null, CHEMISE, 5, ' opacity="0.85"');
    }
    // col de chemise
    D.trait('M -6 -190 C 2 -194 12 -194 20 -188', T, CHEMISE, 3);
    const f = tete(D, sq, pose, c, [
      VISAGE(3),
      // favoris jusque sous la mâchoire
      'M 2 -32 C 6 -20 8 -6 10 4 C 12 14 18 20 26 18 C 31 14 31 8 28 3 C 22 -2 18 -14 16 -28 Z',
      // couronne de cheveux autour d'un front dégarni
      'M -31 -48 C -37 -38 -35 -22 -27 -12 C -22 -18 -21 -30 -23 -42 C -18 -46 -10 -46 -4 -42 C -10 -50 -22 -54 -31 -48 Z',
    ]);
    D.pli('M -23 -42 C -16 -47 -8 -47 -2 -41', f, 1.4);
    // pince-nez
    const verre = f(36, -36);
    D.accents.push(`<ellipse cx="${num(verre.x)}" cy="${num(verre.y)}" rx="5" ry="4.2" fill="#bfe0d8" fill-opacity="0.25" stroke="${OR}" stroke-width="1.4"/>`);
    D.trait('M 31 -34 C 26 -24 22 -12 20 0', f, OR, 0.9, ' opacity="0.7"');
    objets(D, sq, c, pose);
  },
  poses: {
    debout: {
      nom: 'debout, les mains dans le dos',
      lean: 4, tete: 4,
      jN: { h: 5, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: -22, e: 96, main: 'cachee', ra: 0.4 }, bF: { a: -18, e: 90, main: 'cachee', ra: 0.4 },
    },
    examine: {
      nom: 'penché sur la table, une sonde à la main',
      lean: 26, tete: 20,
      jN: { h: 8, k: 0 }, jF: { h: -6, k: 0 },
      bN: { a: 56, e: 34, main: 'poing' }, bF: { a: 38, e: 34, main: 'ouverte' },
      objets: [{ type: 'sonde', bras: 'N', rot: 30 }],
    },
    montre: {
      nom: 'désigne une blessure du doigt',
      lean: 14, tete: 14,
      jN: { h: 8, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 64, e: 14, main: 'doigt' }, bF: { a: -20, e: 96, main: 'cachee', ra: 0.45 },
    },
    note: {
      nom: 'écrit dans son journal',
      lean: 3, tete: 14,
      jN: { h: 5, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 26, e: 98, main: 'poing' }, bF: { a: 18, e: 108, main: 'poing' },
      objets: [{ type: 'carnet', bras: 'N', rot: -10 }, { type: 'crayon', bras: 'F', rot: 40 }],
    },
    lampe: {
      nom: 'lève une lampe au-dessus de la table',
      lean: 10, tete: 22,
      jN: { h: 8, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 150, e: -12, main: 'poing' }, bF: { a: 40, e: 40, main: 'ouverte' },
      objets: [{ type: 'lanterne', bras: 'N' }],
    },
  },
};

const detective = {
  id: 'detective',
  nom: 'Le détective',
  portrait: 'détective : chapeau melon bas, moustache tombante, long pardessus sombre et uni, canne-parapluie',
  c: { ...HOMME, cuisse: 140, tibia: 136, tete: 1.08 },
  dessiner(D, sq, pose, c) {
    jambes(D, sq, c);
    const BUSTE = 'M -10 -194 C -22 -190 -32 -180 -34 -164 C -38 -138 -37 -110 -33 -86 C -31 -70 -33 -50 -35 -30 C -37 -10 -32 8 -18 16 L 16 18 C 28 10 32 -12 32 -38 C 32 -62 30 -82 32 -104 C 36 -130 36 -160 26 -178 C 23 -184 20 -188 16 -192 Z';
    D.forme(BUSTE, sq.T);
    manteau(D, sq, c, { dos: [[-36, -96], [-39, -20]], ventre: [[34, -20], [33, -96]], long: 1.22, ample: 12, fente: 0.5 });
    // col de velours et boutonnage
    D.forme('M -14 -200 C -24 -196 -30 -186 -32 -174 L -10 -178 Z', sq.T);
    D.pli('M 30 -172 C 26 -140 28 -104 31 -70', sq.T, 1.6);
    brasEtMains(D, sq, c);
    const f = tete(D, sq, pose, c, [
      VISAGE(1),
      // melon plus bas que celui du journaliste
      'M -28 -46 C -31 -58 -27 -77 0 -79 C 25 -79 32 -61 29 -46 Z',
      'M -38 -44 C -35 -48 -20 -48 0 -48 C 18 -48 36 -50 42 -46 C 43 -42 39 -42 35 -42 C 18 -43 -14 -44 -33 -40 C -37 -39 -40 -41 -38 -44 Z',
      // moustache tombante, qui dépasse du profil
      'M 22 -11 C 30 -15 39 -14 44 -10 C 47 -6 46 -1 42 -2 C 38 -3 34 -6 28 -5 C 25 -5 22 -7 22 -11 Z',
    ]);
    D.pli('M -28 -52 C -6 -54 14 -54 29 -52', f, 2);
    objets(D, sq, c, pose);
  },
  poses: {
    note: {
      nom: 'prend des notes',
      lean: 2, tete: 14,
      jN: { h: 5, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 26, e: 98, main: 'poing' }, bF: { a: 18, e: 108, main: 'poing' },
      objets: [{ type: 'carnet', bras: 'N', rot: -10 }, { type: 'crayon', bras: 'F', rot: 40 }],
    },
    explique: {
      nom: 'tend la main ouverte, explique',
      lean: -2, tete: -4,
      jN: { h: 12, k: 2 }, jF: { h: -8, k: 0 },
      bN: { a: 72, e: 16, main: 'ouverte' }, bF: { a: 8, e: 22, main: 'poing' },
      objets: [{ type: 'canne', bras: 'F' }],
    },
  },
};

const TABLIER_FRUITIER = '#8a8466';
const FOULARD = '#6e3a26';
const BARBE = '#8e918a';

const marchand = {
  id: 'marchand',
  nom: 'Le marchand de fruits',
  portrait: 'vieux marchand : dos voûté, casquette plate, collier de barbe grise, foulard, manches retroussées, grand tablier de toile',
  c: { ...HOMME, cuisse: 130, tibia: 126, bras: 100, avant: 84, epaule: [-4, -160], cou: [8, -190], rCuisse: 24, rGenou: 16, rBras: 14, rCoude: 12, rPoignet: 9, tete: 1.1 },
  dessiner(D, sq, pose, c) {
    const T = sq.T;
    jambes(D, sq, c);
    // buste voûté, un peu de ventre
    D.forme(
      'M -8 -186 C -24 -184 -38 -172 -40 -152 C -42 -128 -38 -104 -34 -84 C -32 -68 -34 -50 -35 -30 C -37 -10 -31 8 -18 14 L 18 16 C 34 8 42 -14 44 -40 C 46 -64 42 -88 38 -108 C 36 -130 34 -158 26 -174 C 22 -180 18 -184 14 -186 Z',
      T,
    );
    // grand tablier : la bavette sur la poitrine, la jupe jusque sous les genoux
    const bas = 1.4;
    const devant = (j, t, plus) => {
      const o = surJambe(j, t);
      return v(o.x + (t <= 1 ? c.rCuisse : c.rGenou) + plus, o.y);
    };
    const avant = [sq.jN, sq.jF].reduce((a, j) => (surJambe(j, bas).x > surJambe(a, bas).x ? j : a));
    const yb = Math.max(...[sq.jN, sq.jF].map((j) => surJambe(j, bas).y));
    const xArr = Math.min(...[sq.jN, sq.jF].map((j) => surJambe(j, bas).x)) - 8;
    const jupe = [T(-16, -72), T(44, -72), devant(avant, 0.4, 14), devant(avant, 1, 12), v(devant(avant, bas, 10).x, yb), v(xArr, yb)];
    const dJupe = arrondi(jupe, 0.18);
    D.formePts(dJupe, jupe);
    D.accent(dJupe, null, TABLIER_FRUITIER);
    const BAVETTE = 'M 14 -150 L 33 -152 C 38 -128 44 -100 44 -72 L 0 -72 C 4 -100 8 -126 14 -150 Z';
    D.accent(BAVETTE, T, TABLIER_FRUITIER);
    D.trait('M 15 -150 L 2 -184 M 31 -152 L 20 -186', T, TABLIER_FRUITIER, 2.4);
    D.trait('M -16 -78 L 42 -78', T, '#5f5a45', 1.8);
    D.pli(`M${pt(lerp(jupe[0], jupe[5], 0.5))} L${pt(v(xArr + 12, yb - 8))}`, null, 1.6);
    D.pli('M 10 -112 L 34 -112 L 34 -94 L 12 -94', T, 1.4);
    brasEtMains(D, sq, c);
    // le bras proche passe devant le tablier : on le redessine en noir par-dessus
    {
      const b = sq.bN;
      D.accents.push(`<path d="${gelule(b.epaule, b.coude, c.rBras, c.rCoude)}" fill="${NOIR}"/><path d="${gelule(b.coude, b.poignet, c.rCoude, c.rPoignet)}" fill="${NOIR}"/>`);
      if (b.main !== 'cachee' && b.main !== 'poche') D.accent(MAINS[b.main], repereMembre(b.poignet, b.dir, c.main), NOIR);
      if (b.main === 'doigt') {
        const m = repereMembre(b.poignet, b.dir, c.main);
        D.accents.push(`<path d="${gelule(m(4, 18), m(4, 46), 4.6 * c.main, 3.6 * c.main)}" fill="${NOIR}"/>`);
      }
    }
    // manches de chemise retroussées au coude
    for (const b of [sq.bF, sq.bN]) {
      const u = unit(sub(b.poignet, b.coude));
      const n = v(-u.y, u.x);
      const m = add(b.coude, mul(u, 8));
      D.trait(`M${pt(add(m, mul(n, c.rCoude)))} L${pt(sub(m, mul(n, c.rCoude)))}`, null, CHEMISE, 5, ' opacity="0.85"');
    }
    // foulard noué au cou
    const tour = 'M -12 -186 C -2 -192 12 -190 20 -182 L 18 -170 C 8 -176 -4 -176 -12 -172 Z';
    D.forme(tour, T);
    D.accent(tour, T, FOULARD);
    D.accent('M 14 -176 C 22 -174 26 -166 22 -158 C 18 -162 14 -166 12 -172 Z', T, FOULARD);
    const f = tete(D, sq, pose, c, [
      VISAGE(4),
      // collier de barbe : le long de la mâchoire, sous le menton, le visage rasé
      'M 4 -24 C 6 -12 8 -2 12 6 C 16 14 24 18 34 17 C 40 16 43 12 40 9 C 35 10 30 10 26 8 C 21 4 18 -6 17 -24 Z',
      // casquette plate, large, enfoncée
      'M -34 -38 C -38 -52 -31 -72 -6 -78 C 18 -82 36 -73 42 -60 C 46 -56 54 -54 58 -50 C 58 -45 52 -44 46 -44 C 30 -44 8 -44 -10 -40 C -21 -38 -29 -36 -34 -38 Z',
    ]);
    D.accent('M 4 -24 C 6 -12 8 -2 12 6 C 16 14 24 18 34 17 C 40 16 43 12 40 9 C 35 10 30 10 26 8 C 21 4 18 -6 17 -24 Z', f, BARBE, ' opacity="0.45"');
    D.pli('M -31 -45 C -8 -49 20 -49 42 -49', f, 1.6);
    objets(D, sq, c, pose);
  },
  poses: {
    brandit: {
      nom: 'brandit The Comet, fier de son histoire',
      lean: 2, tete: -6,
      jN: { h: 10, k: 2 }, jF: { h: -7, k: 0 },
      bN: { a: 96, e: 34, main: 'poing' }, bF: { a: -30, e: 110, main: 'cachee', ra: 0.55 },
      objets: [{ type: 'journal', bras: 'N', titre: 'THE COMET', taille: 1.5, rot: -6 }],
    },
    montre: {
      nom: 'montre la cour du doigt',
      lean: 6, tete: -2,
      jN: { h: 8, k: 0 }, jF: { h: -6, k: 0 },
      bN: { a: 92, e: 4, main: 'doigt' }, bF: { a: -20, e: 96, main: 'cachee', ra: 0.45 },
    },
  },
};

const FAVORIS = '#8e918a';
const BRAISE = '#e8743a';

const directeur = {
  id: 'directeur',
  nom: 'Le directeur d’agence',
  portrait: 'directeur d’agence de presse : gros, crâne dégarni, grands favoris gris, cigare, redingote ouverte sur un gilet, chaîne de montre',
  c: { ...HOMME, cuisse: 132, tibia: 128, rCuisse: 29, rGenou: 18, rCheville: 12, rBras: 17, rCoude: 14, rPoignet: 10, cou: [12, -196], main: 1.05, pied: 1.04, tete: 1.14 },
  dessiner(D, sq, pose, c) {
    const T = sq.T;
    jambes(D, sq, c);
    // la panse, sous le gilet
    D.forme(
      'M -12 -192 C -26 -188 -38 -178 -40 -160 C -44 -134 -42 -104 -38 -80 C -36 -60 -40 -36 -42 -16 C -44 4 -36 18 -20 22 L 30 24 C 58 20 80 0 84 -30 C 88 -62 76 -96 56 -118 C 46 -130 42 -150 36 -166 C 30 -180 22 -188 16 -192 Z',
      T,
    );
    // redingote ouverte : elle tombe derrière, jusqu'aux genoux, et laisse voir le gilet devant
    manteau(D, sq, c, { dos: [[-40, -70], [-42, 10]], ventre: [[30, 0], [18, -60]], long: 0.98, ample: 10, fente: 0.4, basque: [-46, 20] });
    for (const [x, y] of [[40, -128], [58, -100], [70, -72], [74, -44]]) {
      const p = T(x, y);
      D.accents.push(`<circle cx="${num(p.x)}" cy="${num(p.y)}" r="2.4" fill="${PLI}"/>`);
    }
    // chaîne de montre d'or en travers du gilet
    D.trait('M 44 -70 C 54 -56 66 -54 78 -60', T, OR, 1.8, ' opacity="0.9"');
    const breloque = T(62, -54);
    D.accents.push(`<circle cx="${num(breloque.x)}" cy="${num(breloque.y)}" r="2.6" fill="${OR}"/>`);
    // revers de la redingote
    D.pli('M 16 -172 C 22 -130 26 -80 30 -8', T, 2);
    brasEtMains(D, sq, c);
    // col blanc et cravate
    D.trait('M -6 -190 C 2 -195 12 -195 20 -189', T, CHEMISE, 3);
    D.accent('M 14 -188 L 24 -186 L 22 -172 L 16 -174 Z', T, '#5a2620');
    const FAV = 'M -4 -36 C -2 -22 0 -8 4 4 C 8 16 16 24 26 22 C 32 18 32 12 28 8 C 22 4 20 -6 18 -20 C 16 -28 12 -34 6 -38 Z';
    const f = tete(D, sq, pose, c, [
      VISAGE(4),
      // grands favoris, des tempes jusque sous la mâchoire ; le menton rasé
      FAV,
      // couronne de cheveux autour d'un crâne dégarni
      'M -31 -46 C -37 -36 -35 -20 -27 -10 C -22 -16 -21 -28 -23 -40 C -18 -44 -10 -44 -4 -40 C -10 -48 -22 -52 -31 -46 Z',
      // le cigare
      'M 38 -3 L 60 -8 C 63 -8 64 -3 61 -2 L 39 3 Z',
    ]);
    D.accent(FAV, f, FAVORIS, ' opacity="0.45"');
    D.pli('M -23 -40 C -16 -45 -8 -45 -2 -39', f, 1.4);
    const braise = f(62, -5);
    D.accents.push(`<circle cx="${num(braise.x)}" cy="${num(braise.y)}" r="2.8" fill="${BRAISE}"/>`);
    D.trait('M 64 -9 C 70 -18 64 -26 70 -36 C 74 -42 70 -50 74 -56', f, '#9fbcb7', 1.4, ' opacity="0.35"');
    objets(D, sq, c, pose);
  },
  poses: {
    brandit: {
      nom: 'brandit The Morning Courier, le cigare aux lèvres',
      lean: -3, tete: -4,
      jN: { h: 11, k: 2 }, jF: { h: -8, k: 0 },
      bN: { a: 98, e: 36, main: 'poing' }, bF: { a: -30, e: 110, main: 'cachee', ra: 0.55 },
      objets: [{ type: 'journal', bras: 'N', titre: 'MORNING COURIER', police: 0.6, taille: 1.5, rot: -6 }],
    },
    debout: {
      nom: 'les mains dans le dos, le cigare aux lèvres',
      lean: -4, tete: -4,
      jN: { h: 7, k: 0 }, jF: { h: -6, k: 0 },
      bN: { a: -22, e: 96, main: 'cachee', ra: 0.4 }, bF: { a: -18, e: 90, main: 'cachee', ra: 0.4 },
    },
  },
};

const VISIERE = '#3e7a5a';
const FIXE_MANCHE = '#b08a45';

const reporter = {
  id: 'reporter',
  nom: 'Le reporter d’agence',
  portrait: 'jeune reporter d’agence : mince, visière verte, petite moustache, gilet, bras de chemise et fixe-manches, plume',
  c: { ...HOMME, cuisse: 136, tibia: 130, bras: 102, avant: 86, epaule: [-2, -166], cou: [6, -194], rCuisse: 21, rGenou: 14.5, rCheville: 10, rBras: 12.5, rCoude: 10.5, rPoignet: 8, main: 0.95, pied: 0.97, tete: 1.06 },
  dessiner(D, sq, pose, c) {
    const T = sq.T;
    jambes(D, sq, c);
    D.forme(
      'M -9 -190 C -20 -186 -30 -176 -32 -160 C -35 -136 -34 -108 -31 -86 C -29 -70 -31 -50 -32 -30 C -34 -10 -29 6 -17 14 L 15 16 C 26 8 30 -12 30 -36 C 30 -58 29 -80 31 -100 C 34 -126 33 -156 24 -174 C 21 -182 18 -186 14 -188 Z',
      T,
    );
    // gilet court, boutonné
    D.pli('M 28 -170 C 24 -140 26 -110 29 -76 M -30 -76 L 29 -76', T, 1.6);
    for (const y of [-152, -132, -112, -92]) {
      const p = T(27, y);
      D.accents.push(`<circle cx="${num(p.x)}" cy="${num(p.y)}" r="2" fill="${PLI}"/>`);
    }
    brasEtMains(D, sq, c);
    // bras de chemise : les manches claires dans l'ombre, et les fixe-manches au-dessus du coude
    for (const b of [sq.bF, sq.bN]) {
      const ombre = b === sq.bF ? 0.28 : 0.5;
      D.accents.push(`<path d="${gelule(b.epaule, b.coude, c.rBras - 2, c.rCoude - 2)}" fill="${CHEMISE}" opacity="${ombre}"/><path d="${gelule(b.coude, b.poignet, c.rCoude - 2, c.rPoignet - 1.5)}" fill="${CHEMISE}" opacity="${ombre}"/>`);
      const u = unit(sub(b.coude, b.epaule));
      const n = v(-u.y, u.x);
      const m = lerp(b.epaule, b.coude, 0.62);
      D.trait(`M${pt(add(m, mul(n, c.rBras - 1)))} L${pt(sub(m, mul(n, c.rBras - 1)))}`, null, FIXE_MANCHE, 3.2);
    }
    // col de chemise
    D.trait('M -6 -188 C 2 -192 12 -192 20 -186', T, CHEMISE, 3);
    const f = tete(D, sq, pose, c, [
      VISAGE(0),
      // cheveux courts, raie de côté
      'M -30 -44 C -36 -36 -34 -22 -28 -14 C -26 -20 -24 -26 -24 -32 C -20 -44 -6 -50 12 -50 C 24 -50 32 -46 35 -44 C 34 -60 22 -72 2 -72 C -14 -72 -26 -62 -30 -44 Z',
      // petite moustache
      'M 36 -12 C 42 -13 46 -10 45 -5 C 41 -7 38 -7 34 -8 Z',
      // la visière et son bandeau
      'M -31 -50 C -14 -54 10 -55 30 -52 C 40 -50 54 -46 62 -40 C 60 -37 50 -38 40 -40 C 22 -44 -10 -45 -30 -42 Z',
    ]);
    D.accent('M 30 -52 C 40 -50 54 -46 62 -40 C 60 -37 50 -38 40 -40 C 36 -41 32 -42 30 -43 Z', f, VISIERE, ' opacity="0.85"');
    D.trait('M -30 -47 C -10 -51 12 -52 30 -49', f, VISIERE, 2.2, ' opacity="0.7"');
    objets(D, sq, c, pose);
  },
  poses: {
    ecrit: {
      nom: 'assis, écrit sa dépêche à la plume',
      lean: 8, tete: 12, siege: true,
      jN: { h: 84, k: 86 }, jF: { h: 88, k: 92 },
      bN: { a: 46, e: 46, main: 'poing' }, bF: { a: 36, e: 60, main: 'ouverte' },
      objets: [{ type: 'plume', bras: 'N', rot: -50, encre: '#a8322a' }],
    },
    penche: {
      nom: 'debout, penché sur son bureau, corrige à la plume',
      lean: 30, tete: 6,
      jN: { h: -4, k: 2 }, jF: { h: -12, k: 0 },
      bN: { a: 22, e: 12, main: 'poing' }, bF: { a: 14, e: 26, main: 'ouverte' },
      objets: [{ type: 'plume', bras: 'N', rot: -34, encre: '#a8322a' }],
    },
    debout: {
      nom: 'relit une dépêche, la main dans la poche',
      lean: 3, tete: 14,
      jN: { h: 6, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: 26, e: 104, main: 'poing' }, bF: { a: 4, e: 24, main: 'poche' },
      objets: [{ type: 'convocation', bras: 'N', rot: -20, taille: 1.1 }],
    },
  },
};

// ——— affaire 5 : le colis de Mile End ———

const ROSETTE = '#a8322a';

const president = {
  id: 'president',
  nom: 'Le président du comité',
  portrait: 'entrepreneur de bâtiment, président du comité de vigilance : carrure lourde, cheveux drus, grosse moustache tombante et favoris, veston court sur gilet, rosette rouge du comité',
  c: { ...HOMME, cuisse: 134, tibia: 130, rCuisse: 27, rGenou: 17.5, rCheville: 11.5, rBras: 16, rCoude: 13.5, rPoignet: 10, epaule: [-2, -170], cou: [10, -198], main: 1.04, tete: 1.12 },
  dessiner(D, sq, pose, c) {
    const T = sq.T;
    jambes(D, sq, c);
    D.forme(
      'M -12 -196 C -28 -192 -40 -180 -42 -162 C -46 -136 -44 -108 -40 -86 C -38 -68 -40 -48 -42 -28 C -44 -8 -38 10 -20 16 L 22 18 C 40 10 48 -12 48 -38 C 48 -62 44 -84 44 -104 C 46 -130 42 -160 30 -178 C 26 -186 20 -192 16 -196 Z',
      T,
    );
    // veston court : il s'arrête sous les hanches
    manteau(D, sq, c, { dos: [[-44, -80], [-46, -10]], ventre: [[46, -10], [46, -80]], long: 0.3, ample: 8 });
    D.pli('M 22 -176 C 30 -140 40 -100 44 -40', T, 2);
    for (const y of [-120, -96, -72]) {
      const p = T(40, y);
      D.accents.push(`<circle cx="${num(p.x)}" cy="${num(p.y)}" r="2.4" fill="${PLI}"/>`);
    }
    brasEtMains(D, sq, c);
    D.trait('M -6 -192 C 2 -197 12 -197 20 -191', T, CHEMISE, 3);
    // la rosette du comité de vigilance, au revers
    const r = T(26, -158);
    D.accents.push(`<circle cx="${num(r.x)}" cy="${num(r.y)}" r="5.5" fill="${ROSETTE}"/><circle cx="${num(r.x)}" cy="${num(r.y)}" r="2" fill="#e8d9b0" opacity="0.8"/>`);
    D.accent('M 24 -154 L 21 -140 L 25 -143 L 28 -139 L 28 -154 Z', T, ROSETTE);
    const f = tete(D, sq, pose, c, [
      VISAGE(2),
      // cheveux drus, coiffés en arrière
      'M -33 -40 C -39 -30 -37 -18 -31 -10 C -28 -18 -27 -26 -27 -34 C -23 -48 -6 -57 15 -57 C 27 -57 35 -53 38 -49 C 37 -68 22 -80 2 -80 C -17 -80 -29 -67 -33 -40 Z',
      // favoris
      'M 2 -36 C 4 -26 6 -16 9 -8 L 18 -8 C 16 -18 15 -28 15 -36 Z',
      // grosse moustache tombante, qui déborde du profil
      'M 19 -15 C 28 -22 44 -21 51 -12 C 54 -6 52 2 47 1 C 43 -3 37 -5 30 -3 C 24 -3 18 -8 19 -15 Z',
    ]);
    D.pli('M -27 -42 C -12 -50 10 -52 30 -50', f, 1.5);
    objets(D, sq, c, pose);
  },
  poses: {
    montre: {
      nom: 'montre la fenêtre du doigt, l’autre poing serré',
      lean: 2, tete: -4,
      jN: { h: 10, k: 2 }, jF: { h: -7, k: 0 },
      bN: { a: 98, e: 6, main: 'doigt' }, bF: { a: -8, e: 26, main: 'poing' },
    },
    debout: {
      nom: 'debout, les mains dans le dos',
      lean: 0, tete: 2,
      jN: { h: 6, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: -22, e: 96, main: 'cachee', ra: 0.4 }, bF: { a: -18, e: 90, main: 'cachee', ra: 0.4 },
    },
  },
};

const tresorier = {
  id: 'tresorier',
  nom: 'Le trésorier du comité',
  portrait: 'trésorier du comité : grand et maigre, haut-de-forme, nez busqué, courts favoris, long pardessus, le livre de comptes vert serré contre lui',
  c: { ...HOMME, cuisse: 144, tibia: 140, bras: 106, avant: 90, rCuisse: 21, rGenou: 14.5, rCheville: 10, rBras: 12.5, rCoude: 10.5, rPoignet: 8, epaule: [-2, -172], cou: [6, -202], tete: 1.06 },
  dessiner(D, sq, pose, c) {
    jambes(D, sq, c);
    D.forme(
      'M -9 -198 C -20 -194 -30 -184 -32 -168 C -35 -142 -34 -114 -31 -90 C -29 -72 -31 -50 -33 -30 C -35 -10 -30 8 -17 16 L 15 18 C 26 10 30 -12 30 -38 C 30 -62 29 -84 31 -106 C 34 -132 33 -162 24 -180 C 21 -188 18 -194 14 -196 Z',
      sq.T,
    );
    manteau(D, sq, c, { dos: [[-34, -96], [-37, -20]], ventre: [[32, -20], [31, -96]], long: 1.26, ample: 13, fente: 0.5 });
    D.forme('M -12 -204 C -22 -200 -28 -190 -30 -178 L -8 -182 Z', sq.T);
    D.pli('M 28 -176 C 24 -140 26 -104 29 -60', sq.T, 1.6);
    brasEtMains(D, sq, c);
    D.trait('M -5 -198 C 2 -202 11 -202 18 -196', sq.T, CHEMISE, 2.6);
    const f = tete(D, sq, pose, c, [
      VISAGE(6),
      // courts favoris
      'M 2 -32 C 4 -24 6 -16 8 -10 L 15 -10 C 13 -18 13 -26 13 -32 Z',
      // haut-de-forme : la calotte, un peu évasée, puis le bord
      'M -25 -62 L -22 -124 C -22 -129 28 -129 28 -124 L 31 -62 Z',
      'M -40 -60 C -36 -66 -18 -64 2 -64 C 22 -64 40 -66 46 -60 C 46 -56 40 -56 34 -57 C 16 -58 -16 -58 -34 -56 C -38 -55 -41 -57 -40 -60 Z',
    ]);
    D.pli('M -24 -74 C -4 -77 16 -77 30 -74', f, 3);
    objets(D, sq, c, pose);
  },
  poses: {
    registre: {
      nom: 'serre le livre de comptes contre sa poitrine',
      lean: 0, tete: 6,
      jN: { h: 5, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 18, e: 118, main: 'poing' }, bF: { a: 4, e: 16, main: 'ouverte' },
      objets: [{ type: 'registre', bras: 'N', rot: -4 }],
    },
  },
};

const LUNETTES = '#a3b4b1';

const secretaire = {
  id: 'secretaire',
  nom: 'Le secrétaire du comité',
  portrait: 'secrétaire du comité : jeune, mince, lunettes rondes cerclées d’argent, cheveux séparés par une raie au milieu, veston court, le registre des séances ouvert',
  c: { ...HOMME, cuisse: 132, tibia: 128, bras: 100, avant: 84, rCuisse: 21, rGenou: 14.5, rCheville: 10, rBras: 12.5, rCoude: 10.5, rPoignet: 8, epaule: [-2, -164], cou: [6, -192], main: 0.95, pied: 0.96, tete: 1.05 },
  dessiner(D, sq, pose, c) {
    const T = sq.T;
    jambes(D, sq, c);
    D.forme(
      'M -9 -188 C -20 -184 -30 -174 -32 -158 C -35 -134 -34 -106 -31 -84 C -29 -68 -31 -48 -32 -28 C -34 -8 -29 8 -17 14 L 15 16 C 26 8 30 -12 30 -36 C 30 -58 29 -80 31 -100 C 34 -126 33 -154 24 -172 C 21 -180 18 -184 14 -186 Z',
      T,
    );
    manteau(D, sq, c, { dos: [[-33, -80], [-35, -10]], ventre: [[31, -10], [31, -80]], long: 0.28, ample: 6 });
    D.pli('M 18 -168 C 24 -130 28 -90 30 -30', T, 1.6);
    brasEtMains(D, sq, c);
    D.trait('M -6 -186 C 2 -190 12 -190 20 -184', T, CHEMISE, 3);
    // nœud papillon
    D.accent('M 12 -184 L 22 -188 L 22 -178 Z M 12 -184 L 4 -188 L 4 -178 Z', T, '#2a3a4a');
    const f = tete(D, sq, pose, c, [
      VISAGE(1),
      // cheveux plaqués, raie au milieu
      'M -31 -42 C -37 -32 -35 -20 -29 -12 C -26 -20 -25 -28 -25 -36 C -20 -48 -4 -54 14 -54 C 26 -54 33 -50 36 -46 C 35 -62 22 -74 2 -74 C -16 -74 -27 -62 -31 -42 Z',
    ]);
    D.pli('M 2 -74 C 0 -66 -2 -60 -4 -54', f, 1.4);
    // lunettes rondes : un verre de profil et la branche jusqu'à l'oreille
    const verre = f(35, -36);
    D.accents.push(`<circle cx="${num(verre.x)}" cy="${num(verre.y)}" r="6.4" fill="#bfe0d8" fill-opacity="0.22" stroke="${LUNETTES}" stroke-width="1.6"/>`);
    D.trait('M 29 -37 L -4 -40', f, LUNETTES, 1.3, ' opacity="0.85"');
    objets(D, sq, c, pose);
  },
  poses: {
    note: {
      nom: 'écrit le procès-verbal de la séance',
      lean: 4, tete: 16,
      jN: { h: 5, k: 0 }, jF: { h: -5, k: 0 },
      bN: { a: 26, e: 98, main: 'poing' }, bF: { a: 18, e: 108, main: 'poing' },
      objets: [{ type: 'carnet', bras: 'N', rot: -10 }, { type: 'crayon', bras: 'F', rot: 40 }],
    },
  },
};

const conservateur = {
  id: 'conservateur',
  nom: 'Le conservateur du musée',
  portrait: 'jeune médecin, conservateur du musée de pathologie : mince, cheveux sombres coiffés en arrière, fine moustache, redingote noire, plastron et manchettes blancs, une loupe',
  c: { ...HOMME, cuisse: 138, tibia: 134, bras: 104, avant: 88, rCuisse: 22, rGenou: 15, rCheville: 10.5, rBras: 13, rCoude: 11, rPoignet: 8.5, tete: 1.07 },
  dessiner(D, sq, pose, c) {
    const T = sq.T;
    jambes(D, sq, c);
    D.forme(
      'M -10 -194 C -22 -190 -32 -180 -34 -164 C -38 -138 -37 -110 -33 -86 C -31 -70 -33 -50 -35 -30 C -37 -10 -32 8 -18 16 L 16 18 C 28 10 32 -12 32 -38 C 32 -62 30 -82 32 -104 C 36 -130 36 -160 26 -178 C 23 -184 20 -188 16 -192 Z',
      T,
    );
    // redingote : les pans tombent jusqu'aux genoux
    manteau(D, sq, c, { dos: [[-36, -70], [-38, 10]], ventre: [[30, 0], [26, -60]], long: 0.98, ample: 9, fente: 0.4, basque: [-42, 18] });
    // le plastron blanc, entre les revers
    D.accent('M 14 -186 C 20 -170 24 -150 26 -128 L 32 -130 C 32 -150 30 -170 24 -186 Z', T, CHEMISE, ' opacity="0.8"');
    D.pli('M 12 -184 C 18 -150 22 -110 26 -60', T, 2);
    brasEtMains(D, sq, c);
    // manchettes blanches
    for (const b of [sq.bF, sq.bN]) {
      if (b.main === 'cachee') continue;
      const u = unit(sub(b.poignet, b.coude));
      const n = v(-u.y, u.x);
      const m = sub(b.poignet, mul(u, 4));
      D.trait(`M${pt(add(m, mul(n, c.rPoignet + 1)))} L${pt(sub(m, mul(n, c.rPoignet + 1)))}`, null, CHEMISE, 4, ` opacity="${b === sq.bN ? 0.85 : 0.5}"`);
    }
    D.trait('M -6 -190 C 2 -194 12 -194 20 -188', T, CHEMISE, 3);
    const f = tete(D, sq, pose, c, [
      VISAGE(2),
      // cheveux sombres coiffés en arrière
      'M -32 -44 C -38 -34 -36 -20 -30 -12 C -27 -20 -26 -28 -26 -36 C -20 -50 -4 -58 18 -58 C 28 -58 34 -54 36 -50 C 34 -66 20 -78 0 -78 C -18 -78 -30 -64 -32 -44 Z',
      // fine moustache
      'M 34 -13 C 40 -16 47 -14 48 -9 C 44 -10 40 -9 36 -8 Z',
    ]);
    D.pli('M -26 -46 C -10 -54 10 -56 30 -54', f, 1.4);
    objets(D, sq, c, pose);
  },
  poses: {
    loupe: {
      nom: 'penché sur la table, examine à la loupe',
      lean: 26, tete: 22,
      jN: { h: 8, k: 0 }, jF: { h: -6, k: 0 },
      bN: { a: 62, e: 28, main: 'poing' }, bF: { a: 40, e: 30, main: 'ouverte' },
      objets: [{ type: 'loupe', bras: 'N', rot: -46 }],
    },
    debout: {
      nom: 'debout, une main dans la poche',
      lean: 2, tete: 6,
      jN: { h: 6, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: 20, e: 60, main: 'ouverte' }, bF: { a: 4, e: 24, main: 'poche' },
    },
  },
};

const barbu = {
  id: 'barbu',
  nom: 'L’homme barbu',
  portrait: 'inconnu : chapeau mou à larges bords, épaisse barbe, long pardessus, les mains dans les poches ; il guette',
  c: { ...HOMME, cuisse: 140, tibia: 136, rCuisse: 24, rGenou: 16, tete: 1.1 },
  dessiner(D, sq, pose, c) {
    jambes(D, sq, c, BOTTINE);
    D.forme(
      'M -10 -196 C -24 -192 -34 -182 -36 -166 C -40 -140 -39 -112 -35 -88 C -33 -72 -35 -52 -37 -32 C -39 -12 -34 6 -20 14 L 18 16 C 30 8 34 -14 34 -40 C 34 -64 32 -84 34 -106 C 38 -132 38 -162 28 -180 C 24 -186 21 -190 16 -194 Z',
      sq.T,
    );
    manteau(D, sq, c, { dos: [[-38, -96], [-41, -20]], ventre: [[36, -20], [35, -96]], long: 1.32, ample: 15, fente: 0.4 });
    // col relevé
    D.forme('M -14 -204 C -26 -200 -32 -188 -34 -174 L -8 -180 Z M 18 -200 C 26 -196 30 -186 30 -176 L 14 -182 Z', sq.T);
    brasEtMains(D, sq, c);
    const f = tete(D, sq, pose, c, [
      VISAGE(3),
      // barbe épaisse, de l'oreille au menton
      'M 0 -32 C 2 -14 4 2 10 14 C 18 28 34 32 46 24 C 52 18 50 6 46 0 C 44 -6 42 -10 40 -12 C 34 -8 24 -8 18 -12 C 14 -18 14 -26 12 -32 Z',
      // chapeau mou à larges bords, rabattu sur les yeux
      'M -30 -50 C -32 -66 -24 -84 2 -86 C 26 -86 34 -70 32 -52 Z',
      'M -50 -46 C -42 -54 -16 -55 4 -55 C 26 -55 48 -54 58 -44 C 60 -40 54 -38 46 -40 C 26 -45 -14 -45 -40 -39 C -48 -37 -54 -41 -50 -46 Z',
    ]);
    D.pli('M -30 -58 C -8 -61 14 -61 32 -58', f, 2);
    objets(D, sq, c, pose);
  },
  poses: {
    guette: {
      nom: 'guette, les mains dans les poches, la tête levée',
      lean: 3, tete: -10,
      jN: { h: 4, k: 0 }, jF: { h: -4, k: 0 },
      bN: { a: -4, e: 14, main: 'poche' }, bF: { a: -8, e: 16, main: 'poche' },
    },
  },
};

const PERSOS = [commissaire, agent, journaliste, joueur, temoin, docteur, detective, marchand, directeur, reporter, president, tresorier, secretaire, conservateur, barbu];

// ——— sortie ———

function dessiner(perso, poseId) {
  return dessinerPose(perso, perso.poses[poseId]);
}

function dessinerPose(perso, pose) {
  const c = perso.c;
  const bas = plusBas(c, squelette(c, pose, v(0, 0)));
  const sq = squelette(c, pose, v(0, -bas));
  const D = new Dessin();
  perso.dessiner(D, sq, pose, c);
  D.sq = sq;
  return D;
}

function cadre(pts, marge = 6) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.floor(Math.min(...xs) - marge);
  const y = Math.floor(Math.min(...ys) - marge);
  return { x, y, w: Math.ceil(Math.max(...xs) + marge) - x, h: Math.max(2, Math.ceil(Math.max(...ys, 0) + 2)) - y };
}

/** le contenu d'une silhouette : <defs> (corps sans couleur, masque) + calques */
function calques(id, D, b, lumiere = false) {
  const propre = (t) => t.replaceAll('{id}', id);
  const defs = `<g id="${id}">${D.corps.join('')}</g><mask id="${id}-dedans" maskUnits="userSpaceOnUse" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"><use href="#${id}" fill="#fff"/></mask>${propre(D.defs.join(''))}`;
  const reflets = lumiere
    ? `<use href="#${id}" x="-2.5" y="-2" fill="#9fbcb7" opacity="0.55"/><use href="#${id}" x="3" y="-1.5" fill="#e0ac4a" opacity="0.6"/>`
    : '';
  const corps = `${reflets}<use href="#${id}" fill="${NOIR}"/><g mask="url(#${id}-dedans)" fill="none" stroke="${PLI}" stroke-linecap="round">${D.plis.join('')}</g><g>${propre(D.accents.join(''))}</g>`;
  return { defs, corps };
}

mkdirSync(DOSSIER, { recursive: true });
const planche = [];
const reperes = {};
let fichiers = 0;
for (const perso of PERSOS) {
  const ligne = [];
  for (const poseId of Object.keys(perso.poses)) {
    const D = dessiner(perso, poseId);
    const b = cadre(D.pts);
    const id = `${perso.id}-${poseId}`;
    const { defs, corps } = calques(id, D, b);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}" height="${b.h}">
<!-- ${perso.nom} (${perso.portrait}) : ${perso.poses[poseId].nom}.
     Silhouette dessinée pour le jeu (tools/persos.mjs), d'après les profils découpés de l'époque. Tournée vers la droite ; le sol est en y = 0.
     Calques : #${id} = forme seule (couleur héritée du <use>, pour les reflets de la scène), puis plis et couleurs. -->
<defs>${defs}</defs>
${corps}
</svg>
`;
    writeFileSync(new URL(`${id}.svg`, DOSSIER), svg);
    fichiers++;
    // repères pour placer la silhouette dans une scène : hanche, assise, mains, tête (coordonnées du fichier)
    const sq = D.sq;
    const xy = (p) => [Number(num(p.x)), Number(num(p.y))];
    reperes[id] = {
      viewBox: [b.x, b.y, b.w, b.h],
      hanche: xy(sq.hanche),
      assise: Number(num(sq.hanche.y + perso.c.rCuisse)),
      mains: { proche: xy(prise(sq.bN, perso.c)), loin: xy(prise(sq.bF, perso.c)) },
      tete: D.tete,
    };
    ligne.push({ id, D, b, nom: perso.poses[poseId].nom });
  }
  planche.push({ perso, ligne });
}

writeFileSync(new URL('reperes.json', DOSSIER), `${JSON.stringify(reperes, null, 1)}\n`);

// planche : une ligne par personnage, sur le mur du commissariat, avec les reflets de la scène
const PAS_X = 330;
const PAS_Y = 760;
const L = Math.max(...planche.map((r) => r.ligne.length)) * PAS_X + 80;
const H = PAS_Y * planche.length + 60;
let defs = '';
let corps = '';
planche.forEach(({ perso, ligne }, i) => {
  const y0 = 60 + i * PAS_Y + 640;
  corps += `<text x="40" y="${y0 - 640}" class="nom">${perso.nom}</text><text x="40" y="${y0 - 612}" class="info">${perso.portrait}</text>`;
  corps += `<rect x="0" y="${y0}" width="${L}" height="${PAS_Y - 640}" fill="#1a2423"/>`;
  ligne.forEach(({ id, D, b, nom }, k) => {
    const x0 = 40 + k * PAS_X + PAS_X / 2 - (b.x + b.w / 2);
    const cq = calques(`p-${id}`, D, b, true);
    defs += cq.defs;
    let banc = '';
    const pose = perso.poses[id.slice(perso.id.length + 1)];
    if (pose.siege) {
      const sq = D.sq;
      const haut = sq.hanche.y + perso.c.rCuisse - 2;
      const x1 = sq.hanche.x - 56;
      const x2 = Math.max(sq.jN.genou.x, sq.jF.genou.x) - 34;
      banc = `<g fill="#1d2928"><rect x="${num(x1)}" y="${num(haut)}" width="${num(x2 - x1)}" height="14"/><rect x="${num(x1 + 6)}" y="${num(haut)}" width="9" height="${num(-haut)}"/><rect x="${num(x2 - 15)}" y="${num(haut)}" width="9" height="${num(-haut)}"/></g><rect x="${num(x1)}" y="${num(haut)}" width="${num(x2 - x1)}" height="2" fill="#4d6461"/>`;
    }
    corps += `<g transform="translate(${num(x0)} ${y0})">${banc}${cq.corps}</g>`;
    corps += `<text x="${40 + k * PAS_X + PAS_X / 2}" y="${y0 + 44}" class="pose" text-anchor="middle">${id}</text><text x="${40 + k * PAS_X + PAS_X / 2}" y="${y0 + 66}" class="info" text-anchor="middle">${nom}</text>`;
  });
});
writeFileSync(
  PLANCHE,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}">
<!-- Planche des silhouettes de personnages, générée par tools/persos.mjs. -->
<style>text{font-family:Georgia,serif;fill:#e6dcc0}.nom{font-size:30px}.info{font-size:15px;fill:#a9b8b4;font-style:italic}.pose{font-size:17px}</style>
<defs><linearGradient id="mur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b5250"/><stop offset="1" stop-color="#2a3b3a"/></linearGradient>${defs}</defs>
<rect width="${L}" height="${H}" fill="url(#mur)"/>
${corps}
</svg>
`,
);
// ——— le cycle de marche du joueur (l'intro du jeu) ———
// La hanche suit une hauteur donnée (elle descend un peu quand les deux pieds touchent le sol, remonte
// quand le corps passe au-dessus de la jambe d'appui) et les jambes sont calculées à l'envers depuis
// les pieds : le pied posé recule sous la hanche exactement à la vitesse où le corps avance, il ne patine
// pas. Talon qui touche, pied à plat, talon qui se lève en roulant sur la pointe ; puis la jambe repasse
// devant en pliant le genou. Les bras balancent à l'opposé, un peu en retard, le coude suit.

const PAS = {
  images: 60,
  /** part du cycle où le pied est posé */
  appui: 0.6,
  /** dans l'appui, quand le talon commence à se lever */
  talon: 0.72,
  /** la cheville, devant la hanche quand le talon touche, derrière quand le pied se met à plat… */
  avant: 72,
  arriere: 90,
  /** de combien la hanche monte et descend */
  rebond: 7,
};
const DOSSIER_PAS = new URL('pas/', DOSSIER);

/** angles de la jambe pour une cheville placée en (x, y) par rapport à la hanche (le genou plie vers l'avant) */
function versCheville(c, x, y) {
  const d = Math.min(Math.hypot(x, y), c.cuisse + c.tibia - 0.5);
  const angle = Math.atan2(x, y) / RAD;
  const a = Math.acos((c.cuisse ** 2 + d * d - c.tibia ** 2) / (2 * c.cuisse * d)) / RAD;
  const b = Math.acos((c.tibia ** 2 + d * d - c.cuisse ** 2) / (2 * c.tibia * d)) / RAD;
  return { h: angle + a, k: a + b };
}

/** courbe douce passant par des clés [s, valeur] (spline de Hermite) */
function courbe(cles, s) {
  let i = 0;
  while (i < cles.length - 2 && s > cles[i + 1][0]) i++;
  const pente = (j) => {
    const a = cles[Math.max(0, j - 1)];
    const b = cles[Math.min(cles.length - 1, j + 1)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  };
  const [s0, v0] = cles[i];
  const [s1, v1] = cles[i + 1];
  const d = s1 - s0;
  const t = (s - s0) / d;
  const [m0, m1] = [pente(i) * d, pente(i + 1) * d];
  return (2 * t ** 3 - 3 * t ** 2 + 1) * v0 + (t ** 3 - 2 * t ** 2 + t) * m0 + (3 * t ** 2 - 2 * t ** 3) * v1 + (t ** 3 - t ** 2) * m1;
}

/** le sol, sous la hanche : au plus bas quand les deux pieds touchent (q = 0,05 et 0,55) */
const sol = (c, q) => c.cuisse + c.tibia - 0.5 + c.semelle * c.pied - (PAS.rebond / 2) * (1 - Math.cos(4 * Math.PI * (q - 0.3)));

/** ce qui dépasse le plus sous la cheville, le pied tourné de f degrés (talon, plante ou pointe) */
const dessous = (c, f) => Math.max(...[-14, 20, c.pointe].map((x) => c.pied * (x * Math.sin(f * RAD) + c.semelle * Math.cos(f * RAD))));

/** le point le plus bas d'une jambe libre, par rapport à la hanche */
const piedLibre = (c, j) => c.cuisse * Math.cos(j.h * RAD) + c.tibia * Math.cos((j.h - j.k) * RAD) + dessous(c, j.f);

/** une jambe à l'instant q du cycle (0 : le talon touche le sol) */
function jambeQuiMarche(c, q) {
  const vitesse = (PAS.avant + PAS.arriere) / PAS.appui; // ce que le corps avance pendant un cycle
  if (q < PAS.appui) {
    const s = q / PAS.appui;
    if (s <= PAS.talon) {
      // le talon touche, puis le pied se pose à plat ; la cheville recule à la vitesse du corps
      const f = -14 * Math.max(0, 1 - s / 0.2) ** 1.5;
      return { ...versCheville(c, PAS.avant - vitesse * q, sol(c, q) - dessous(c, f)), f };
    }
    // le talon se lève : le pied roule sur sa pointe, qui reste au même endroit du sol
    const u = (s - PAS.talon) / (1 - PAS.talon);
    const f = 36 * u ** 1.3;
    const [px, py] = [c.pied * c.pointe, c.pied * c.semelle];
    const [sn, cs] = [Math.sin(f * RAD), Math.cos(f * RAD)];
    const ax = PAS.avant - vitesse * q + px - (px * cs - py * sn);
    const ay = sol(c, q) - (px * sn + py * cs);
    return { ...versCheville(c, ax, ay), f };
  }
  // en l'air : la cuisse part vite vers l'avant, le genou plie juste ce qu'il faut pour que le pied passe
  const s = (q - PAS.appui) / (1 - PAS.appui);
  const [a, b] = [jambeQuiMarche(c, PAS.appui - 1e-9), jambeQuiMarche(c, 0)];
  const j = {
    h: courbe([[0, a.h], [0.3, 13], [0.6, 23], [0.85, 26], [1, b.h]], s),
    k: courbe([[0, a.k], [0.3, 62], [0.6, 34], [0.88, 7], [1, b.k]], s),
    f: courbe([[0, a.f], [0.3, 14], [0.6, 2], [0.88, -10], [1, b.f]], s),
  };
  // s'il frôle le sol, le pied se relève un peu (plier le genou quand le tibia est en arrière, sinon lever la cuisse)
  for (let n = 0; n < 60 && s > 0.04 && s < 0.96 && piedLibre(c, j) > sol(c, q) - 4; n++) {
    if (j.h - j.k < 0) j.k += 0.5;
    else j.h += 0.5;
  }
  return j;
}

function poseDeMarche(c, q) {
  const tour = (p) => 2 * Math.PI * p;
  const bras = (p) => ({
    a: 2 - 24 * Math.cos(tour(p - 0.04)),
    e: 24 + 18 * (0.5 - 0.5 * Math.cos(tour(p - 0.14))), // le coude se plie en retard sur l'épaule
    main: 'poing',
  });
  return {
    lean: 7 + 1.2 * Math.cos(2 * tour(q - 0.05)),
    tete: -2 - 1.4 * Math.cos(2 * tour(q - 0.05)), // la tête compense : le regard reste droit
    echarpe: 64 + 6 * Math.sin(2 * tour(q)) + 3 * Math.sin(5 * tour(q) + 1),
    jN: jambeQuiMarche(c, q),
    jF: jambeQuiMarche(c, (q + 0.5) % 1),
    bN: bras(q),
    bF: bras(q + 0.5),
  };
}

const images = Array.from({ length: PAS.images }, (_, i) => dessinerPose(joueur, poseDeMarche(joueur.c, i / PAS.images)));
// un seul cadre pour toutes les images : la hanche et le sol restent au même endroit d'une image à l'autre
const cadrePas = cadre(images.flatMap((D) => D.pts));
const foulee = (PAS.avant + PAS.arriere) / PAS.appui; // ce que le corps avance pendant un cycle
// contrôle : la hanche doit rester à la hauteur prévue (sinon un pied s'enfonce ou flotte)
const ecart = Math.max(...images.map((D, i) => Math.abs(-D.sq.hanche.y - sol(joueur.c, i / PAS.images))));
if (ecart > 2.5) console.warn(`marche : la hanche s'écarte de ${num(ecart)} de la hauteur prévue`);
rmSync(DOSSIER_PAS, { recursive: true, force: true });
mkdirSync(DOSSIER_PAS, { recursive: true });
images.forEach((D, i) => {
  const id = `joueur-pas-${String(i).padStart(2, '0')}`;
  const { defs, corps } = calques(id, D, cadrePas);
  const b = cadrePas;
  writeFileSync(
    new URL(`${id}.svg`, DOSSIER_PAS),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}" height="${b.h}">
<!-- ${joueur.nom} qui marche : image ${i + 1} sur ${PAS.images} du cycle (tools/persos.mjs). Tourné vers la droite ; le sol est en y = 0, la hanche en x = 0. -->
<defs>${defs}</defs>
${corps}
</svg>
`,
  );
});
writeFileSync(
  new URL('pas.json', DOSSIER_PAS),
  `${JSON.stringify({ images: PAS.images, foulee: Number(num(foulee)), viewBox: [cadrePas.x, cadrePas.y, cadrePas.w, cadrePas.h] })}
`,
);

console.log(`${fichiers} silhouettes, planche ${L}×${H}, ${PAS.images} images de marche`);
