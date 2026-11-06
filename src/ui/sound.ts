/**
 * Ambiance sonore et bruitages : de vrais enregistrements de BigSoundBank (Joseph Sardin, CC0),
 * coupés pour le jeu, dans src/assets/sounds/ (voir CREDITS.md).
 *
 * - Une ambiance par écran : la rue sous la pluie (menus), le poste de police (pluie contre les vitres,
 *   pendule), la morgue (gouttes dans une salle carrelée, pluie au loin).
 * - Des bruitages pour chaque geste : crayon qui note un mot, papier, touche de machine à écrire,
 *   marteau du juge pour un article validé, cloches de l'affaire résolue.
 * - En fond, très bas, la Gymnopédie n° 1 de Satie (1888, domaine public) : src/assets/music/.
 * - Les fichiers ne sont chargés qu'au premier geste du joueur (règle des navigateurs), et chaque ambiance
 *   seulement quand un écran la demande. Bouton « son » ou touche M pour couper ; le choix est gardé.
 */
import { h } from '../dom';
import musicUrl from '../assets/music/gymnopedie-1.mp3';

export type Ambience = 'street' | 'station' | 'morgue';
export type Sound =
  | 'pen' // un mot noté dans le carnet
  | 'paper' // un document qu'on ouvre, la gazette qu'on déplie
  | 'paperSoft' // une fiche qu'on ouvre ou qu'on ferme
  | 'type' // un mot posé dans une case de la gazette
  | 'untype' // un mot retiré
  | 'stamp' // article validé
  | 'close' // « Presque »
  | 'wrong' // « Quelque chose ne colle pas »
  | 'hint' // un indice révélé
  | 'victory' // affaire résolue
  | 'click' // un bouton
  | 'press' // la une qui sort des presses
  // les bruits des zones de la scène (voir ZONE_SOUNDS)
  | 'hooves' // un fiacre passe sous la fenêtre
  | 'steps' // un agent fait quelques pas
  | 'chime' // la pendule sonne
  | 'drawer' // un tiroir qu'on ouvre
  | 'sheet' // le drap qu'on soulève
  | 'scissors'; // les ciseaux du docteur

/** L'ambiance de chaque affaire, par identifiant ; les autres écrans sont dans la rue. */
const AMBIENCES: Record<string, Ambience> = { 'leman-street': 'station', morgue: 'morgue' };
export const ambienceFor = (caseId: string): Ambience => AMBIENCES[caseId] ?? 'street';

/**
 * Le bruit de certaines zones quand on les examine, par affaire puis par zone (à la place du
 * froissement de la fiche). Gardé ici plutôt que dans case.json, que l'éditeur réécrit.
 */
const ZONE_SOUNDS: Record<string, Record<string, Sound>> = {
  'leman-street': { fenetre: 'hooves', pendule: 'chime', tiroir: 'drawer' },
  morgue: { 'corps-1': 'sheet', 'corps-2': 'sheet', agent: 'steps', docteur: 'scissors' },
  fruiterie: { cour: 'hooves', sergent: 'steps' },
};
export const zoneSound = (caseId: string, zoneId: string): Sound | null => ZONE_SOUNDS[caseId]?.[zoneId] ?? null;

const PREF_KEY = 'jeu-deduction:v1:@son';
const VOLUME = 0.9;
/** Les ambiances restent discrètes sous la musique et les bruitages (−6 dB par rapport à la première version). */
const AMBIENCE_LEVEL = 0.35;
/**
 * La musique, au niveau des ambiances : l'enregistrement est à −30,6 dB en moyenne, ramené vers −37 dB,
 * comme la pluie des scènes.
 */
const MUSIC_LEVEL = 0.45;
/** Silence entre deux passages de la musique, en secondes : elle revient sans tourner en boucle. */
const MUSIC_GAP = 25;

// ———————————————————————————————— les enregistrements ————————————————————————————————

const FILES = import.meta.glob('../assets/sounds/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

type SampleName =
  | 'pluie-rue'
  | 'pluie-vitre'
  | 'vent'
  | 'gouttes'
  | 'pendule'
  | 'cloche-loin'
  | 'crayon'
  | 'journal'
  | 'page-1'
  | 'page-2'
  | 'grande-page'
  | 'touche'
  | 'espace'
  | 'marteau'
  | 'livre'
  | 'cloches'
  | 'presse'
  | 'sabots'
  | 'pas'
  | 'carillon'
  | 'tiroir'
  | 'drap-1'
  | 'drap-2'
  | 'ciseaux';

interface Sample {
  buffer: AudioBuffer;
  /** Niveau moyen (pour régler les nappes d'ambiance) et crête (pour les bruitages). */
  rms: number;
  peak: number;
  /** Les passages sonores, séparés par des silences, en secondes (les traits de crayon, les froissements). */
  parts: [number, number][];
  /** Force perçue de tout l'enregistrement (voir loudness). */
  loud: { active: number; peak: number };
}

/** Une nappe d'ambiance qui tourne en boucle. `db` : niveau moyen visé (dB pleine échelle). */
interface Bed {
  sample: SampleName;
  db: number;
  lowpass?: number;
  pan?: number;
  /** Part envoyée dans la réverbération de la pièce. */
  verb?: number;
  /** Durée exacte de la boucle (la pendule doit garder son rythme) ; sinon fondu de 2 s. */
  period?: number;
  /** Écrête les sons trop forts au-dessus du niveau moyen, en dB (les grosses gouttes qui claquent). */
  cap?: number;
}

/** Un son qui revient de temps en temps (la cloche au loin). `db` : crête visée. */
interface Occasional {
  sample: SampleName;
  db: number;
  every: [number, number];
  /** Nombre de coups, et l'écart entre deux. */
  strokes: [number, number];
  spacing: number;
  lowpass?: number;
  verb?: number;
}

interface Scene {
  /** Réverbération : durée (s) et pente de l'extinction. */
  room: [number, number];
  beds: Bed[];
  events: Occasional[];
}

const SCENES: Record<Ambience, Scene> = {
  // la rue de Whitechapel, la nuit : la pluie sur le pavé, le vent, une cloche au loin
  street: {
    room: [2.4, 2.4],
    beds: [
      { sample: 'pluie-rue', db: -28, cap: 14 },
      { sample: 'pluie-vitre', db: -40, lowpass: 900 },
      { sample: 'vent', db: -33, lowpass: 2500 },
    ],
    events: [{ sample: 'cloche-loin', db: -27, every: [40, 90], strokes: [1, 3], spacing: 2.2, lowpass: 2200, verb: 0.7 }],
  },
  // le poste de police : la pluie derrière les vitres, la pendule
  station: {
    room: [1, 3],
    beds: [
      { sample: 'pluie-vitre', db: -31, lowpass: 1500 },
      { sample: 'pendule', db: -33, pan: -0.35, verb: 0.35, period: 6.51 },
    ],
    events: [{ sample: 'cloche-loin', db: -34, every: [70, 140], strokes: [1, 2], spacing: 2.2, lowpass: 900, verb: 0.5 }],
  },
  // la morgue : des gouttes dans une salle carrelée, la pluie au loin
  morgue: {
    room: [2.6, 2.2],
    beds: [
      { sample: 'gouttes', db: -31, verb: 0.8 },
      { sample: 'pluie-vitre', db: -40, lowpass: 600 },
    ],
    events: [],
  },
};

/**
 * Un bruitage : un ou plusieurs enregistrements (tirés au sort), sa force visée (niveau moyen de ses
 * passages sonores, en dB pleine échelle, la crête restant sous −2 dB), sa vitesse de lecture.
 */
interface Effect {
  samples: SampleName[];
  db: number;
  rate?: [number, number];
  /** Joue un seul passage sonore, tiré au sort, coupé à cette durée (crayon, froissement). */
  part?: number;
  /** Les passages, en secondes, quand la détection automatique les coupe trop (le journal). */
  parts?: [number, number][];
  /** Part envoyée dans la réverbération (cloches, marteau). */
  room?: number;
  /** Ne joue que le début de l'enregistrement (en secondes), puis fondu de sortie (`fadeOut`). */
  length?: number;
  fadeOut?: number;
  /** Filtre passe-bas (un bruit entendu derrière une vitre). */
  lowpass?: number;
  /**
   * Chargé seulement quand une affaire en a besoin (les bruits des zones, la presse), pas au
   * premier geste du joueur comme les bruitages de tous les écrans.
   */
  lazy?: boolean;
}

const EFFECTS: Record<Sound, Effect> = {
  pen: { samples: ['crayon'], db: -22, part: 0.6, rate: [0.97, 1.03] },
  paper: { samples: ['journal'], db: -21, part: 1.4, parts: [[0.78, 2.25], [6.45, 7.6]] },
  paperSoft: { samples: ['page-1', 'page-2'], db: -24, rate: [0.95, 1.05] },
  type: { samples: ['touche'], db: -22, rate: [0.95, 1.05] },
  untype: { samples: ['espace'], db: -24, rate: [0.95, 1.05] },
  stamp: { samples: ['marteau'], db: -17, room: 0.25 },
  close: { samples: ['livre'], db: -23, rate: [1.08, 1.12] },
  wrong: { samples: ['livre'], db: -19, rate: [0.84, 0.88] },
  hint: { samples: ['grande-page'], db: -21 },
  victory: { samples: ['cloches'], db: -19, room: 0.3 },
  click: { samples: ['touche'], db: -31, rate: [1.15, 1.25] },
  press: { samples: ['presse'], db: -22, fadeOut: 1.2, lazy: true },
  hooves: { samples: ['sabots'], db: -27, lowpass: 1800, fadeOut: 0.8, lazy: true },
  steps: { samples: ['pas'], db: -25, length: 2.2, fadeOut: 0.5, rate: [0.96, 1.04], lazy: true },
  chime: { samples: ['carillon'], db: -25, room: 0.25, fadeOut: 1.5, lazy: true },
  drawer: { samples: ['tiroir'], db: -23, lazy: true },
  sheet: { samples: ['drap-1', 'drap-2'], db: -28, length: 1.4, fadeOut: 0.4, lazy: true },
  scissors: { samples: ['ciseaux'], db: -24, part: 0.6, lazy: true },
};

const SFX_SAMPLES = [...new Set(Object.values(EFFECTS).flatMap((e) => (e.lazy ? [] : e.samples)))];
/** Les enregistrements demandés par l'affaire ouverte (chargés dès que le son est autorisé). */
const extra = new Set<SampleName>();
const preload = () => [...SFX_SAMPLES, ...extra].forEach((s) => void load(s));

/** L'affaire ouverte prépare ses bruits : ceux de ses zones, et la presse de la une de fin. */
export function prepareSounds(caseId: string): void {
  const sounds: Sound[] = ['press', ...Object.values(ZONE_SOUNDS[caseId] ?? {})];
  sounds.forEach((s) => EFFECTS[s].samples.forEach((n) => extra.add(n)));
  if (ctx && !muted) preload();
}

// ———————————————————————————————— moteur ————————————————————————————————

function loadMuted(): boolean {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}')?.muted === true;
  } catch {
    return false;
  }
}

let muted = typeof localStorage === 'undefined' ? false : loadMuted();
let ctx: AudioContext | null = null;
let master: GainNode;
let ambienceBus: GainNode;
let sfxBus: GainNode;
/** Réverbération légère des bruitages. */
let sfxRoom: GainNode;
let wanted: Ambience | null = null;
let current: { name: Ambience; stop: () => void } | null = null;
let musicBus: GainNode;
let music: HTMLAudioElement | null = null;
let musicTimer = 0;

const loading = new Map<SampleName, Promise<Sample | null>>();
const ready = new Map<SampleName, Sample>();
const loops = new Map<SampleName, { buffer: AudioBuffer; rms: number }>();

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 3;
  comp.connect(ctx.destination);
  master = gain(muted ? 0 : VOLUME, comp);
  ambienceBus = gain(AMBIENCE_LEVEL, master);
  musicBus = gain(0, master);
  sfxBus = gain(1, master);
  const room = ctx.createConvolver();
  room.buffer = impulse(1.2, 3.2);
  room.connect(master);
  sfxRoom = gain(1, room);
  if (muted) void ctx.suspend();
  return ctx;
}

/** Premier geste du joueur : le navigateur autorise enfin le son ; on charge les bruitages. */
function unlock() {
  const c = ensure();
  if (!c) return;
  if (!muted && c.state === 'suspended') void c.resume();
  if (!muted) preload();
  if (wanted && !current && !muted) startAmbience(wanted);
  if (!muted) startMusic();
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
  // onglet caché : on se tait (et les sons aléatoires ne s'accumulent pas)
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      void ctx.suspend();
      pauseMusic();
    } else if (!muted) {
      void ctx.resume();
      startMusic();
    }
  });
  // M : couper ou remettre le son
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'm' && e.key !== 'M') return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    toggleSound();
  });
  // un petit clic pour les boutons des menus (dans une affaire, chaque geste a son propre bruit)
  document.addEventListener('click', (e) => {
    if (document.getElementById('app')?.classList.contains('screen-case')) return;
    if ((e.target as HTMLElement | null)?.closest('button:not(.sound-btn), a')) playSound('click');
  });
}

const running = () => ctx !== null && ctx.state === 'running';
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const fromDb = (db: number) => Math.pow(10, db / 20);

function gain(value: number, to?: AudioNode): GainNode {
  const g = ctx!.createGain();
  g.gain.value = value;
  if (to) g.connect(to);
  return g;
}

/** Chaîne de sortie : filtre passe-bas et panoramique facultatifs, puis `to`. Rend l'entrée de la chaîne. */
function chain(to: AudioNode, o: { lowpass?: number; pan?: number }): AudioNode {
  let input = to;
  if (o.pan && 'createStereoPanner' in ctx!) {
    const p = ctx!.createStereoPanner();
    p.pan.value = o.pan;
    p.connect(input);
    input = p;
  }
  if (o.lowpass) {
    const f = ctx!.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lowpass;
    f.Q.value = 0.5;
    f.connect(input);
    input = f;
  }
  return input;
}

/** Réponse impulsionnelle d'une pièce (pour la réverbération). */
function impulse(seconds: number, decay: number): AudioBuffer {
  const sr = ctx!.sampleRate;
  const n = Math.floor(sr * seconds);
  const b = ctx!.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * 0.5;
  }
  return b;
}

/** Charge et décode un enregistrement (une seule fois). Rend null s'il manque ou ne se décode pas. */
function load(name: SampleName): Promise<Sample | null> {
  let p = loading.get(name);
  if (!p) {
    const url = FILES[`../assets/sounds/${name}.mp3`];
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.arrayBuffer();
      })
      // forme à rappels de decodeAudioData : la seule que comprennent les vieux Safari
      .then((data) => new Promise<AudioBuffer>((res, rej) => ctx!.decodeAudioData(data, res, rej)))
      .then((buffer) => {
        const s = analyse(buffer);
        ready.set(name, s);
        return s;
      })
      .catch(() => null);
    loading.set(name, p);
  }
  return p;
}

/** Niveau, crête et passages sonores d'un enregistrement. */
function analyse(buffer: AudioBuffer): Sample {
  const d = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < d.length; i++) {
    sum += d[i] * d[i];
    peak = Math.max(peak, Math.abs(d[i]));
  }
  // enveloppe par tranches de 10 ms : un passage commence au-dessus de crête − 30 dB
  const win = Math.round(sr * 0.01);
  const floor = (peak * fromDb(-30)) ** 2;
  const parts: [number, number][] = [];
  let start = -1;
  let quiet = 0;
  for (let i = 0; i + win <= d.length; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) e += d[j] * d[j];
    const loud = e / win > floor;
    if (loud) {
      if (start < 0) start = i;
      quiet = 0;
    } else if (start >= 0 && ++quiet >= 12) {
      const end = i - (quiet - 1) * win;
      if (end - start > sr * 0.12) parts.push([start / sr, end / sr]);
      start = -1;
    }
  }
  if (start >= 0 && d.length - start > sr * 0.12) parts.push([start / sr, d.length / sr]);
  return { buffer, rms: Math.sqrt(sum / d.length) || 1e-6, peak: peak || 1e-6, parts, loud: loudness(d, sr, 0, d.length / sr) };
}

/**
 * Force perçue d'un passage : niveau moyen des seules tranches sonores (au-dessus de crête − 30 dB),
 * pour qu'un coup bref et un long froissement sonnent aussi fort l'un que l'autre ; et sa crête.
 */
function loudness(d: Float32Array, sr: number, from: number, to: number): { active: number; peak: number } {
  const a = Math.max(0, Math.round(from * sr));
  const b = Math.min(d.length, Math.round(to * sr));
  let peak = 0;
  for (let i = a; i < b; i++) peak = Math.max(peak, Math.abs(d[i]));
  const win = Math.round(sr * 0.01);
  const floor = (peak * fromDb(-30)) ** 2;
  let sum = 0;
  let count = 0;
  for (let i = a; i + win <= b; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) e += d[j] * d[j];
    if (e / win > floor) {
      sum += e;
      count += win;
    }
  }
  return { active: Math.sqrt(sum / Math.max(1, count)) || 1e-6, peak: peak || 1e-6 };
}

/**
 * Limiteur (hors temps réel) : aucun son ne dépasse `ceiling`. Le gain baisse 3 ms avant le coup et
 * remonte en 80 ms, pour que l'écrêtage ne s'entende pas.
 */
function limit(d: Float32Array, ceiling: number, sr: number): Float32Array {
  const n = d.length;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = Math.min(1, ceiling / (Math.abs(d[i]) || 1e-9));
  const release = 1 - Math.exp(-1 / (0.08 * sr));
  const attack = 1 - Math.exp(-1 / (0.003 * sr));
  for (let i = 1; i < n; i++) g[i] = Math.min(g[i], g[i - 1] + (1 - g[i - 1]) * release);
  for (let i = n - 2; i >= 0; i--) g[i] = Math.min(g[i], g[i + 1] + (1 - g[i + 1]) * attack);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = d[i] * g[i];
  return out;
}

/**
 * Une boucle sans raccord : la fin se fond dans le début. Avec `period`, la boucle dure exactement ce
 * temps (fondu linéaire : la pendule garde son rythme) ; sinon fondu de 2 s à puissance constante.
 * Rend aussi son niveau moyen (après l'écrêtage éventuel).
 */
function seamless(name: SampleName, s: Sample, bed: Bed): { buffer: AudioBuffer; rms: number } {
  const cached = loops.get(name);
  if (cached) return cached;
  const period = bed.period;
  const sr = s.buffer.sampleRate;
  const raw = s.buffer.getChannelData(0);
  const src = bed.cap ? limit(raw, s.rms * fromDb(bed.cap), sr) : raw;
  // on écarte le silence que le décodeur MP3 ajoute aux deux bouts
  const edge = Math.round(sr * 0.06);
  const len = src.length - 2 * edge;
  const n = period ? Math.min(len - 1, Math.round(period * sr)) : len - Math.min(Math.round(sr * 2), Math.floor(len / 4));
  const x = len - n;
  const out = ctx!.createBuffer(1, n, sr);
  const o = out.getChannelData(0);
  for (let i = 0; i < n; i++) o[i] = src[edge + i];
  for (let i = 0; i < x; i++) {
    const a = i / x;
    const [fadeIn, fadeOut] = period ? [a, 1 - a] : [Math.sin((a * Math.PI) / 2), Math.cos((a * Math.PI) / 2)];
    o[i] = src[edge + i] * fadeIn + src[edge + n + i] * fadeOut;
  }
  let sum = 0;
  for (let i = 0; i < n; i++) sum += o[i] * o[i];
  const loop = { buffer: out, rms: Math.sqrt(sum / n) || 1e-6 };
  loops.set(name, loop);
  return loop;
}

// ———————————————————————————————— ambiances ————————————————————————————————

function startAmbience(name: Ambience) {
  if (!ctx) return;
  const c = ctx;
  const scene = SCENES[name];
  const out = gain(1, ambienceBus);
  const verb = c.createConvolver();
  verb.buffer = impulse(scene.room[0], scene.room[1]);
  verb.connect(out);
  const sources: AudioBufferSourceNode[] = [];
  const timers: number[] = [];
  let alive = true;

  for (const bed of scene.beds) {
    void load(bed.sample).then((s) => {
      if (!s || !alive) return;
      const loop = seamless(bed.sample, s, bed);
      const src = c.createBufferSource();
      src.buffer = loop.buffer;
      src.loop = true;
      const level = gain(0, chain(out, bed));
      if (bed.verb) level.connect(gain(bed.verb, verb));
      const target = fromDb(bed.db) / loop.rms;
      level.gain.setValueAtTime(0, c.currentTime);
      level.gain.linearRampToValueAtTime(target, c.currentTime + 3);
      src.connect(level);
      src.start(c.currentTime, rand(0, src.buffer.duration));
      sources.push(src);
    });
  }

  for (const ev of scene.events) {
    void load(ev.sample);
    const next = () => {
      timers.push(
        window.setTimeout(() => {
          if (!alive) return;
          const s = ready.get(ev.sample);
          if (s && running()) {
            const level = gain(fromDb(ev.db) / s.peak, chain(out, ev));
            if (ev.verb) level.connect(gain(ev.verb, verb));
            const strokes = Math.round(rand(ev.strokes[0], ev.strokes[1]));
            for (let i = 0; i < strokes; i++) {
              const src = c.createBufferSource();
              src.buffer = s.buffer;
              src.connect(level);
              src.start(c.currentTime + 0.05 + i * ev.spacing);
              sources.push(src);
            }
          }
          next();
        }, rand(ev.every[0], ev.every[1]) * 1000),
      );
    };
    next();
  }

  current = {
    name,
    stop: () => {
      alive = false;
      timers.forEach((id) => clearTimeout(id));
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      window.setTimeout(() => {
        sources.forEach((s) => {
          try {
            s.stop();
          } catch {
            // déjà arrêtée
          }
        });
        out.disconnect();
      }, 1400);
    },
  };
}

/** L'écran demande son ambiance (null : silence). Elle démarre dès que le son est autorisé. */
export function setAmbience(name: Ambience | null): void {
  wanted = name;
  if (current?.name === name) return;
  current?.stop();
  current = null;
  if (name && ctx && !muted) startAmbience(name);
}

// ———————————————————————————————— la musique ————————————————————————————————

/**
 * La Gymnopédie n° 1 d'Erik Satie (1888), au piano, sur tous les écrans. Elle est lue au fil de
 * l'eau par un <audio> (pas besoin de décoder les trois minutes d'un coup), branché sur le
 * mélangeur : elle suit le volume général et le bouton du son. Elle monte doucement la première
 * fois, puis revient après un silence.
 */
function startMusic() {
  if (!ctx || muted || document.hidden) return;
  if (!music) {
    const el = new Audio(musicUrl);
    el.preload = 'auto';
    ctx.createMediaElementSource(el).connect(musicBus);
    el.addEventListener('ended', () => {
      musicTimer = window.setTimeout(() => {
        musicTimer = 0;
        startMusic();
      }, MUSIC_GAP * 1000);
    });
    const t = ctx.currentTime;
    musicBus.gain.setValueAtTime(0, t);
    musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL, t + 8);
    music = el;
  }
  if (musicTimer || !music.paused) return;
  music.play().catch(() => {
    // lecture refusée (pas encore de geste du joueur) : on réessaiera au prochain
  });
}

function pauseMusic() {
  window.clearTimeout(musicTimer);
  musicTimer = 0;
  music?.pause();
}

// ———————————————————————————————— bruitages ————————————————————————————————

/** Joue un bruitage, tout de suite ou un peu plus tard (en secondes). Muet tant que le fichier n'est pas chargé. */
export function playSound(sound: Sound, delay = 0): void {
  if (muted || !running()) return;
  const fx = EFFECTS[sound];
  const name = pick(fx.samples);
  const s = ready.get(name);
  if (!s) {
    void load(name);
    return;
  }
  const c = ctx!;
  const t = c.currentTime + 0.01 + delay;
  const src = c.createBufferSource();
  src.buffer = s.buffer;
  if (fx.rate) src.playbackRate.value = rand(fx.rate[0], fx.rate[1]);
  const level = gain(0, fx.lowpass ? chain(sfxBus, fx) : sfxBus);
  if (fx.room) level.connect(gain(fx.room, sfxRoom));
  const strength = (l: { active: number; peak: number }) => Math.min(fromDb(fx.db) / l.active, fromDb(-2) / l.peak);
  src.connect(level);
  const parts = fx.parts ?? s.parts;
  if (fx.part && parts.length) {
    // un seul passage, avec un fondu bref aux deux bouts
    const [a, b] = pick(parts);
    const dur = Math.min(b - a, fx.part);
    const g = strength(loudness(s.buffer.getChannelData(0), s.buffer.sampleRate, a, a + dur));
    level.gain.setValueAtTime(0, t);
    level.gain.linearRampToValueAtTime(g, t + 0.01);
    level.gain.setValueAtTime(g, t + dur - 0.08);
    level.gain.linearRampToValueAtTime(0, t + dur);
    src.start(t, a, dur + 0.02);
  } else if (fx.length || fx.fadeOut) {
    // le début seulement, avec un fondu de sortie
    const rate = src.playbackRate.value;
    const dur = Math.min(fx.length ?? Infinity, s.buffer.duration) / rate;
    const fade = Math.min(fx.fadeOut ?? 0.08, dur / 2);
    const g = fx.length ? strength(loudness(s.buffer.getChannelData(0), s.buffer.sampleRate, 0, fx.length)) : strength(s.loud);
    level.gain.setValueAtTime(g, t);
    level.gain.setValueAtTime(g, t + dur - fade);
    level.gain.linearRampToValueAtTime(0, t + dur);
    src.start(t, 0, dur * rate + 0.02);
  } else {
    level.gain.value = strength(s.loud);
    src.start(t);
  }
}

// ———————————————————————————————— couper le son ————————————————————————————————

export const isMuted = (): boolean => muted;

// En développement seulement : pour régler les sons depuis la console (__son.playSound('stamp')).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__son = { playSound, setAmbience, master: () => master, ctx: () => ctx, music: () => music, ready };
}

export function toggleSound(): void {
  muted = !muted;
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ muted }));
  } catch {
    // stockage indisponible : le choix ne vaut que pour cette visite
  }
  const c = ensure();
  if (c) {
    const t = c.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    if (muted) {
      master.gain.linearRampToValueAtTime(0, t + 0.25);
      window.setTimeout(() => {
        if (!muted) return;
        void c.suspend();
        pauseMusic();
      }, 300);
    } else {
      void c.resume();
      master.gain.linearRampToValueAtTime(VOLUME, t + 0.4);
      preload();
      if (wanted && !current) startAmbience(wanted);
      startMusic();
    }
  }
  document.querySelectorAll<HTMLButtonElement>('.sound-btn').forEach(refresh);
}

const ICON_ON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.6c1.1 1 1.7 2.1 1.7 3.4s-.6 2.4-1.7 3.4M18.6 6.2c1.8 1.6 2.8 3.6 2.8 5.8s-1 4.2-2.8 5.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_OFF =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function refresh(b: HTMLButtonElement) {
  b.innerHTML = muted ? ICON_OFF : ICON_ON;
  b.title = muted ? 'Remettre le son (M)' : 'Couper le son (M)';
  b.setAttribute('aria-label', muted ? 'Remettre le son' : 'Couper le son');
  b.setAttribute('aria-pressed', String(muted));
}

/** Bouton qui coupe ou remet le son (dans l'en-tête d'une affaire, ou flottant sur les autres écrans). */
export function soundButton(extraClass = ''): HTMLButtonElement {
  const b = h('button', { class: `btn ghost small sound-btn ${extraClass}`.trim(), onClick: () => toggleSound() });
  refresh(b);
  return b;
}
