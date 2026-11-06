import boothMap from '../assets/maps/booth-whitechapel.jpg';
import walk from '../assets/silhouettes/persos/pas/pas.json';
import fogUrl from '../assets/textures/fog-1.png';
import paperUrl from '../assets/textures/paper.jpg';
import { cases } from '../cases/registry';
import { GAME_TITLE } from '../config';
import { h } from '../dom';
import { engravingUrl } from './art';
import { MAP_H, MAP_PINS, MAP_W } from './menu';
import { playSound, prepareEffects, restartMusic, setIntroMix, type Sound } from './sound';

/**
 * Le film d'ouverture : une minute, dessinée en direct sur un canvas. Les gravures de Doré défilent
 * comme sous une caméra (lent travelling, grain et scintillement de vieux film), les journaux tournent
 * et se posent, les épingles des affaires se plantent sur la carte de Booth, puis le titre se fond
 * dans l'écran titre. La Gymnopédie de Satie l'accompagne ; « Passer » ou Échap l'arrête.
 * Montré une fois, à la première ouverture du jeu ; « Revoir l'intro » sur l'écran titre.
 */

const INTRO_KEY = 'jeu-deduction:v1:@intro';

/** Le cycle de marche du reporter (tools/persos.mjs) : une image par instant du pas, dans l'ordre. */
const WALK_URLS = Object.entries(
  import.meta.glob<string>('../assets/silhouettes/persos/pas/*.svg', { eager: true, query: '?url', import: 'default' }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

export function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) !== null;
  } catch {
    return true; // stockage indisponible : on ne l'impose pas à chaque visite
  }
}

function markSeen() {
  try {
    localStorage.setItem(INTRO_KEY, 'true');
  } catch {
    // idem
  }
}

// ———————————————————————————————— le découpage ————————————————————————————————

const FADE = 1.4; // fondu enchaîné entre deux plans, en secondes
const TOTAL = 56;
const STARTS = [0, 3.6, 10.6, 17.6, 24.4, 31.4, 38.4, 46.4];
const PAPERS_AT = 24.8; // le premier journal part ; un toutes les 1,4 s
const PINS_AT = 40.4; // la première épingle ; une toutes les 1,2 s

const CAPTIONS: { start: number; end: number; text: string; center?: boolean }[] = [
  { start: 0.6, end: 3.4, text: 'Londres, automne 1888.', center: true },
  { start: 4.8, end: 10, text: 'La plus grande ville du monde.' },
  { start: 11.8, end: 17, text: 'À l\'est, Whitechapel : des ruelles, des garnis, le brouillard.' },
  { start: 18.8, end: 24, text: 'Le 31 août, une femme est retrouvée morte. Puis une autre, le 8 septembre.' },
  { start: 26, end: 31, text: 'Toute la presse en parle, jusqu\'à Paris et New York.' },
  { start: 32.6, end: 37.8, text: 'La police, elle, cherche à la lanterne.' },
  { start: 39.6, end: 45.8, text: 'Vous n\'êtes qu\'un petit reporter. Mais vous rêvez d\'être détective.' },
];
const TITLE_AT = 47.6;

interface Paper {
  name: string;
  gothic?: boolean;
  date: string;
  head: string;
  /** Où il se pose, dans un écran de 1100 × 900, et son angle. */
  x: number;
  y: number;
  r: number;
}
const PAPERS: Paper[] = [
  { name: 'THE COMET', date: 'Saturday, 1st September 1888', head: 'MURDER IN WHITECHAPEL', x: 300, y: 262, r: -7 },
  { name: 'The Daily Ledger', gothic: true, date: 'Monday, 10th September 1888', head: 'ANOTHER EAST END MURDER', x: 800, y: 290, r: 5 },
  { name: 'Le Matinal', gothic: true, date: 'Paris, mardi 11 septembre 1888', head: 'LE MYSTÈRE DE WHITECHAPEL', x: 320, y: 570, r: 4 },
  { name: 'New York Sentinel', gothic: true, date: 'New York, September 12, 1888', head: 'LONDON IN TERROR', x: 790, y: 556, r: -4 },
];

const CUES: { at: number; sound: Sound }[] = [
  { at: 11.2, sound: 'hooves' },
  { at: PAPERS_AT - 0.2, sound: 'press' },
  ...PAPERS.map((_, i) => ({ at: PAPERS_AT + i * 1.4 + 1.05, sound: 'paper' as Sound })),
  { at: 32.4, sound: 'steps' },
];

// ———————————————————————————————— outils de dessin ————————————————————————————————

interface Cam {
  /** Le point de l'image (en fraction de sa largeur et de sa hauteur) au centre de l'écran. */
  x: number;
  y: number;
  /** 1 : l'image couvre juste l'écran. */
  z: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (p: number) => {
  const q = clamp01(p);
  return q * q * (3 - 2 * q);
};
const outCubic = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
const mix = (a: Cam, b: Cam, p: number): Cam => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, z: a.z + (b.z - a.z) * p });

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Un journal, dessiné une fois pour toutes (520 × 330). */
function drawPaper(p: Paper, texture: HTMLImageElement | null): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 520;
  c.height = 330;
  const g = c.getContext('2d')!;
  g.fillStyle = '#dcd2b4';
  g.fillRect(0, 0, 520, 330);
  if (texture) {
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = 0.55;
    g.drawImage(texture, 0, 0, 520, 330);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  g.fillStyle = '#211c16';
  g.textAlign = 'center';
  g.font = p.gothic ? '46px UnifrakturMaguntia, serif' : '44px "IM Fell English", Georgia, serif';
  g.fillText(p.name, 260, 60);
  g.fillRect(24, 74, 472, 2.5);
  g.fillRect(24, 100, 472, 1.2);
  g.font = 'italic 15px "IM Fell English", Georgia, serif';
  g.fillText(p.date, 260, 92);
  // le gros titre, réduit s'il déborde
  let size = 38;
  g.font = `${size}px "IM Fell English", Georgia, serif`;
  while (g.measureText(p.head).width > 470 && size > 20) g.font = `${--size}px "IM Fell English", Georgia, serif`;
  g.fillText(p.head, 260, 146);
  g.fillRect(180, 160, 160, 1.2);
  // trois colonnes de texte
  g.fillStyle = 'rgba(70, 62, 48, 0.55)';
  let seed = p.name.length * 7 + 3;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (const x of [24, 187, 350]) {
    for (let y = 176; y < 312; y += 9) {
      const w = y > 300 || rnd() < 0.08 ? 60 + rnd() * 60 : 140 + rnd() * 6;
      g.fillRect(x, y, Math.min(w, 146), 3);
    }
  }
  g.strokeStyle = '#9c9075';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 518, 328);
  return c;
}

/** Bruit de pellicule : quelques carrés de grain tirés au sort à chaque image. */
function makeGrain(): HTMLCanvasElement[] {
  return [0, 1, 2, 3].map(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const g = c.getContext('2d')!;
    const img = g.createImageData(192, 192);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

// ———————————————————————————————— le lecteur ————————————————————————————————

interface IntroOptions {
  /** Ouverte par un clic (« Revoir l'intro ») : elle démarre tout de suite, avec le son. */
  autoplay: boolean;
  onClose?(): void;
}

export function openIntro(opts: IntroOptions): void {
  document.querySelector('.intro')?.remove();
  prepareEffects(['press', 'hooves', 'steps']);
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const canvas = h('canvas', { class: 'intro-canvas', 'aria-hidden': 'true' });
  const g = canvas.getContext('2d')!;
  const live = h('p', { class: 'intro-live', role: 'status' });
  const captions = CAPTIONS.map((c) => h('p', { class: `intro-caption${c.center ? ' center' : ''}`, 'aria-hidden': 'true' }, c.text));
  const title = h(
    'div',
    { class: 'intro-title', 'aria-hidden': 'true' },
    h('h1', {}, GAME_TITLE),
    h('p', {}, 'Observez. Notez. Écrivez ce qui s\'est vraiment passé.'),
    h('small', {}, 'D\'après des faits réels'),
  );
  const skip = h('button', { class: 'btn ghost small intro-skip', onClick: () => finish(true) }, 'Passer ▸');
  const play = h('button', { class: 'btn primary big', disabled: true, onClick: () => begin() }, 'Chargement…');
  const start = opts.autoplay
    ? null
    : h(
        'div',
        { class: 'intro-start' },
        h('p', { class: 'kicker' }, 'Londres, automne 1888'),
        h('h1', {}, GAME_TITLE),
        h('p', { class: 'intro-start-hint' }, 'Un petit film d\'une minute pour entrer dans l\'histoire. Mettez le son.'),
        play,
        h('button', { class: 'btn ghost', onClick: () => finish(true) }, 'Passer l\'intro'),
      );
  const overlay = h(
    'div',
    { class: 'intro', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Introduction' },
    canvas,
    ...captions,
    title,
    live,
    skip,
    start,
  );
  document.body.append(overlay);
  (start ? play : skip).focus({ preventScroll: true });

  // ——— taille du canvas ———
  let W = 0;
  let H = 0;
  let vignette: CanvasGradient;
  let glow: CanvasGradient;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = canvas.width = Math.round(Math.min(overlay.clientWidth * dpr, 2400));
    H = canvas.height = Math.round(overlay.clientHeight * (W / Math.max(1, overlay.clientWidth)));
    vignette = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.25, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
    vignette.addColorStop(0, 'rgba(5, 8, 8, 0)');
    vignette.addColorStop(1, 'rgba(5, 8, 8, 0.88)');
    glow = g.createRadialGradient(W * 0.5, H * 0.12, 0, W * 0.5, H * 0.12, Math.max(W, H) * 0.6);
    glow.addColorStop(0, 'rgba(226, 174, 76, 0.16)');
    glow.addColorStop(1, 'rgba(226, 174, 76, 0)');
  };
  resize();
  window.addEventListener('resize', resize);
  const layer = document.createElement('canvas');
  const lg = layer.getContext('2d')!;

  // ——— les images ———
  const names = ['over-london-by-rail', 'wentworth-street', 'bluegate-fields', 'bulls-eye', 'whitechapel'];
  const img: Record<string, HTMLImageElement | null> = {};
  let papers: HTMLCanvasElement[] = [];
  let steps: HTMLImageElement[] = [];
  const grain = makeGrain();
  const pins = cases.filter((c) => !c.draft && MAP_PINS[c.id]).map((c) => MAP_PINS[c.id]);
  const ready = Promise.all([
    ...names.map(async (n) => (img[n] = await loadImage(engravingUrl(n) ?? ''))),
    loadImage(boothMap).then((i) => (img.map = i)),
    Promise.all(WALK_URLS.map(loadImage)).then((frames) => (steps = frames.filter((f): f is HTMLImageElement => !!f))),
    loadImage(fogUrl).then((i) => (img.fog = i)),
    Promise.all([
      loadImage(paperUrl),
      document.fonts?.load('46px UnifrakturMaguntia'),
      document.fonts?.load('38px "IM Fell English"'),
      document.fonts?.load('italic 15px "IM Fell English"'),
    ]).then(([tex]) => (papers = PAPERS.map((p) => drawPaper(p, tex ?? null)))),
  ]);

  /** Pose une image en plein cadre, cadrée par la caméra ; renvoie sa position pour y placer d'autres choses. */
  function cover(c: CanvasRenderingContext2D, im: HTMLImageElement | null | undefined, cam: Cam) {
    if (!im) return null;
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * cam.z;
    const dw = im.naturalWidth * s;
    const dh = im.naturalHeight * s;
    const dx = Math.min(0, Math.max(W - dw, W / 2 - cam.x * dw));
    const dy = Math.min(0, Math.max(H - dh, H / 2 - cam.y * dh));
    c.drawImage(im, dx, dy, dw, dh);
    return { dx, dy, s };
  }

  /** La teinte des gravures dans le jeu : papier vert-de-gris, nuit, une lueur de gaz en haut. */
  function grade(c: CanvasRenderingContext2D, tint: string, dark: number) {
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = tint;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = `rgba(9, 15, 15, ${dark})`;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'screen';
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }

  function fog(c: CanvasRenderingContext2D, local: number, alpha: number) {
    if (!img.fog) return;
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = alpha;
    const drift = still ? 0 : local * W * 0.012;
    c.drawImage(img.fog, -W * 0.2 + drift, H * 0.3, W * 0.9, H * 0.7);
    c.drawImage(img.fog, W * 0.45 - drift * 0.7, H * 0.05, W * 0.8, H * 0.6);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  const travel = (a: Cam, b: Cam) => (p: number) => (still ? mix(a, b, 0.5) : mix(a, b, smooth(p)));
  const engraving = (name: string, a: Cam, b: Cam, dark = 0.3, extra?: (c: CanvasRenderingContext2D, local: number, p: number) => void) => {
    const cam = travel(a, b);
    return (c: CanvasRenderingContext2D, local: number, p: number) => {
      c.fillStyle = '#050808';
      c.fillRect(0, 0, W, H);
      cover(c, img[name], cam(p));
      grade(c, '#93a69f', dark);
      extra?.(c, local, p);
    };
  };

  type Draw = (c: CanvasRenderingContext2D, local: number, p: number) => void;
  const shots: Draw[] = [
    // noir : « Londres, automne 1888. »
    (c) => {
      c.fillStyle = '#050808';
      c.fillRect(0, 0, W, H);
    },
    // les toits de Londres, vus du train
    engraving('over-london-by-rail', { x: 0.5, y: 0.3, z: 1.3 }, { x: 0.56, y: 0.42, z: 1.08 }, 0.22),
    // Wentworth Street : la foule ; le reporter passe au premier plan
    engraving('wentworth-street', { x: 0.5, y: 0.3, z: 1.12 }, { x: 0.5, y: 0.62, z: 1 }, 0.28, (c, local) => {
      fog(c, local, 0.18);
      if (steps.length < walk.images) return;
      // il traverse l'image en marchant ; la vitesse suit la longueur du pas, pour que les pieds ne glissent pas
      const [vx, vy, vw, vh] = walk.viewBox;
      const k = (H * 0.6) / vh; // pixels par unité du dessin
      const stride = walk.foulee * k; // ce qu'il avance pendant un cycle
      const cycle = Math.max(0.95, Math.min(1.35, (stride * 7.6) / (W + vw * k * 1.1)));
      const t = local - 0.4;
      const n = still ? 0 : Math.floor((t / cycle) * walk.images);
      const frame = steps[((n % walk.images) + walk.images) % walk.images];
      // le corps avance d'image en image, comme au cinéma : le pied posé ne bouge pas d'un pixel
      const hip = still ? W * 0.72 : -vw * k * 0.55 + (stride * n) / walk.images;
      c.drawImage(frame, hip + vx * k, H * 0.99 + vy * k, vw * k, vh * k);
    }),
    // Bluegate Fields, la nuit
    engraving('bluegate-fields', { x: 0.5, y: 0.78, z: 1.2 }, { x: 0.5, y: 0.5, z: 1.02 }, 0.4, (c, local) => fog(c, local, 0.22)),
    // les journaux
    (c, local) => {
      const bg = c.createRadialGradient(W / 2, 0, 0, W / 2, 0, Math.hypot(W, H));
      bg.addColorStop(0, '#2d4644');
      bg.addColorStop(0.55, '#142221');
      bg.addColorStop(1, '#090f0f');
      c.fillStyle = bg;
      c.fillRect(0, 0, W, H);
      fog(c, local, 0.12);
      const S = Math.min(W / 1100, H / 900);
      const t = STARTS[4] + local;
      papers.forEach((paper, i) => {
        const p = PAPERS[i];
        const q = (t - (PAPERS_AT + i * 1.4)) / 1.1;
        if (q <= 0) return;
        const e = outCubic(q);
        const k = still ? 1 : 0.04 + 0.96 * e;
        const turn = still ? 0 : (1 - e) * 720;
        const tx = W / 2 + (p.x - 550) * S * (still ? 1 : e);
        const ty = H / 2 + (p.y - 450) * S * (still ? 1 : e);
        c.save();
        c.globalAlpha = still ? clamp01(q) : 1;
        c.translate(tx, ty);
        c.rotate(((p.r + turn) * Math.PI) / 180);
        c.scale(S * k * 0.8, S * k * 0.8);
        c.shadowColor = 'rgba(0, 0, 0, 0.6)';
        c.shadowBlur = 30;
        c.shadowOffsetY = 14;
        c.drawImage(paper, -260, -165);
        c.restore();
      });
    },
    // The Bull's-Eye : l'agent et sa lanterne
    engraving('bulls-eye', { x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.66, z: 1.35 }, 0.3),
    // la carte de Booth : les affaires, une à une, reliées par le fil rouge
    (() => {
      /** La caméra finit cadrée sur les épingles, un peu au-dessus du sous-titre. */
      const fit = (): Cam => {
        if (!pins.length) return { x: 0.4, y: 0.6, z: 1 };
        const xs = pins.map((pin) => pin.x / MAP_W);
        const ys = pins.map((pin) => pin.y / MAP_H);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        const s1 = Math.max(W / MAP_W, H / MAP_H);
        const fw = W / (MAP_W * s1); // la part de la carte visible sans zoom
        const fh = H / (MAP_H * s1);
        const z = Math.max(1, Math.min(1.6, (fw * 0.66) / Math.max(0.01, x1 - x0), (fh * 0.58) / Math.max(0.01, y1 - y0)));
        return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + (fh / z) * 0.1, z };
      };
      return (c: CanvasRenderingContext2D, local: number, p: number) => {
        c.fillStyle = '#050808';
        c.fillRect(0, 0, W, H);
        const end = fit();
        const from = { x: (end.x + 0.5) / 2, y: (end.y + 0.55) / 2, z: Math.max(1, end.z * 0.78) };
        const r = cover(c, img.map, travel(from, end)(p));
        grade(c, '#d6c8a6', 0.3);
        if (!r) return;
        const u = Math.min(W, H) / 700;
        const t = STARTS[6] + local;
        const at = (i: number) => PINS_AT + i * 1.2;
        const pos = (i: number) => {
          const pin = pins[i];
          return { x: r.dx + (pin.x / MAP_W) * (img.map!.naturalWidth * r.s), y: r.dy + (pin.y / MAP_H) * (img.map!.naturalHeight * r.s) };
        };
        // le fil rouge
        c.strokeStyle = '#b3261e';
        c.lineWidth = 3 * u;
        c.lineCap = 'round';
        for (let i = 1; i < pins.length; i++) {
          const q = clamp01((t - (at(i) - 0.8)) / 0.8);
          if (q <= 0) continue;
          const a = pos(i - 1);
          const b = pos(i);
          c.beginPath();
          c.moveTo(a.x, a.y);
          c.lineTo(a.x + (b.x - a.x) * q, a.y + (b.y - a.y) * q);
          c.stroke();
        }
        // les épingles
        pins.forEach((_, i) => {
          const q = (t - at(i)) / 0.35;
          if (q <= 0) return;
          const k = still ? 1 : q < 1 ? 0.4 + 0.9 * q - 0.3 * q * q : 1;
          const { x, y } = pos(i);
          const R = 16 * u * k;
          c.save();
          c.shadowColor = 'rgba(0, 0, 0, 0.55)';
          c.shadowBlur = 8 * u;
          c.shadowOffsetY = 3 * u;
          c.fillStyle = '#8f1f1a';
          c.beginPath();
          c.arc(x, y, R, 0, Math.PI * 2);
          c.fill();
          c.restore();
          c.strokeStyle = '#e2ae4c';
          c.lineWidth = 2 * u;
          c.stroke();
          c.fillStyle = '#f3ead2';
          c.font = `${Math.round(18 * u * k)}px "IM Fell English", Georgia, serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(String(i + 1), x, y + 1 * u);
        });
      };
    })(),
    // Whitechapel : on recule, le titre apparaît, la gravure s'efface vers l'écran titre
    engraving('whitechapel', { x: 0.5, y: 0.45, z: 1.35 }, { x: 0.5, y: 0.45, z: 1 }, 0.3, (c, local) => {
      c.fillStyle = `rgba(9, 15, 15, ${0.55 * smooth((local - 1) / 7)})`;
      c.fillRect(0, 0, W, H);
    }),
  ];
  const ends = STARTS.map((_, i) => (i + 1 < STARTS.length ? STARTS[i + 1] + FADE : TOTAL));

  /** Grain, scintillement, rayures : la pellicule. */
  function film(c: CanvasRenderingContext2D) {
    c.fillStyle = vignette;
    c.fillRect(0, 0, W, H);
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.12;
    const tile = grain[still ? 0 : Math.floor(Math.random() * grain.length)];
    const pattern = c.createPattern(tile, 'repeat');
    if (pattern) {
      const ox = still ? 0 : Math.random() * 192;
      const oy = still ? 0 : Math.random() * 192;
      c.translate(-ox, -oy);
      c.fillStyle = pattern;
      c.fillRect(0, 0, W + ox, H + oy);
    }
    c.restore();
    if (still) return;
    c.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.06})`;
    c.fillRect(0, 0, W, H);
    if (Math.random() < 0.07) {
      const x = Math.random() * W;
      c.fillStyle = `rgba(230, 225, 205, ${0.08 + Math.random() * 0.12})`;
      c.fillRect(x, 0, Math.max(1, W / 1400), H);
    }
  }

  function render(T: number) {
    const active = shots.map((_, i) => i).filter((i) => T >= STARTS[i] && T < ends[i]);
    for (const i of active) {
      const local = T - STARTS[i];
      const p = local / (ends[i] - STARTS[i]);
      const alpha = i === 0 ? 1 : clamp01(local / FADE);
      if (alpha >= 1) shots[i](g, local, p);
      else {
        if (layer.width !== W || layer.height !== H) {
          layer.width = W;
          layer.height = H;
        }
        shots[i](lg, local, p);
        g.globalAlpha = alpha;
        g.drawImage(layer, 0, 0);
        g.globalAlpha = 1;
      }
    }
    film(g);
  }

  // ——— lecture ———
  let T = 0;
  let last = 0;
  let raf = 0;
  let playing = false;
  let closing = false;
  let shown = -1;
  const fired = new Set<number>();

  function frame(now: number) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    T += dt;
    update();
    if (T < TOTAL) raf = requestAnimationFrame(frame);
  }

  /** Une image du film à l'instant T, avec ses sous-titres et ses bruitages. */
  function update() {
    render(T);
    CUES.forEach((cue, i) => {
      if (T >= cue.at && !fired.has(i)) {
        fired.add(i);
        if (T - cue.at < 0.5) playSound(cue.sound);
      }
    });
    const idx = CAPTIONS.findIndex((c) => T >= c.start && T < c.end);
    captions.forEach((el, i) => el.classList.toggle('on', i === idx));
    if (idx !== shown) {
      shown = idx;
      if (idx >= 0) live.textContent = CAPTIONS[idx].text;
    }
    if (T >= TITLE_AT && !title.classList.contains('on')) {
      title.classList.add('on');
      live.textContent = `${GAME_TITLE}. Observez. Notez. Écrivez ce qui s'est vraiment passé.`;
    }
    if (T >= TOTAL - 1.6) finish(false);
  }

  function begin() {
    if (playing) return;
    playing = true;
    start?.remove();
    skip.focus({ preventScroll: true });
    setIntroMix(true);
    restartMusic();
    raf = requestAnimationFrame(frame);
  }

  function finish(fast: boolean) {
    if (closing) return;
    closing = true;
    markSeen();
    setIntroMix(false);
    window.removeEventListener('keydown', onKey, true);
    overlay.classList.add('closing');
    if (fast) overlay.classList.add('fast');
    window.setTimeout(
      () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        overlay.remove();
        opts.onClose?.();
      },
      fast ? 550 : 1650,
    );
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    finish(true);
  }
  window.addEventListener('keydown', onKey, true);
  // en développement : sauter à un instant du film pour vérifier un plan (__intro.seek(40))
  if (import.meta.env.DEV) {
    const seek = (t: number) => {
      T = t;
      update();
    };
    (window as unknown as { __intro: unknown }).__intro = { seek, time: () => T };
  }

  // première image : le noir et la pellicule, le temps que les gravures arrivent
  render(0);
  void ready.then(() => {
    if (closing) return;
    if (opts.autoplay) begin();
    else {
      play.disabled = false;
      play.textContent = '▶ Voir l\'intro';
      play.focus({ preventScroll: true });
    }
  });
}
