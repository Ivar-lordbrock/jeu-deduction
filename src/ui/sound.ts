/**
 * Ambiance sonore et bruitages, fabriqués par le code (Web Audio) : aucun fichier son, aucune licence.
 *
 * - Une ambiance par écran : la rue sous la pluie (menus), le poste de police (pluie contre les vitres,
 *   pendule), la morgue (gouttes sur le carrelage, sifflement des becs de gaz).
 * - Des bruitages pour chaque geste : plume qui note un mot, papier, caractère d'imprimerie posé dans
 *   la gazette, tampon « Validé », cloches de l'affaire résolue.
 * - Le son ne démarre qu'au premier geste du joueur (règle des navigateurs). Bouton « son » ou touche M
 *   pour le couper ; le choix est gardé d'une partie à l'autre.
 */
import { h } from '../dom';

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
  | 'click'; // un bouton

/** L'ambiance de chaque affaire, par identifiant ; les autres écrans sont dans la rue. */
const AMBIENCES: Record<string, Ambience> = { 'leman-street': 'station', morgue: 'morgue' };
export const ambienceFor = (caseId: string): Ambience => AMBIENCES[caseId] ?? 'street';

const PREF_KEY = 'jeu-deduction:v1:@son';
const VOLUME = 0.8;

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
/** Réverbération légère des bruitages (cloches, carillon). */
let sfxRoom: GainNode;
let wanted: Ambience | null = null;
let current: { name: Ambience; stop: () => void } | null = null;
const noises: Partial<Record<Noise, AudioBuffer>> = {};

type Noise = 'white' | 'pink' | 'brown';

// ———————————————————————————————— moteur ————————————————————————————————

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  comp.connect(ctx.destination);
  master = gain(muted ? 0 : VOLUME, comp);
  ambienceBus = gain(0.5, master);
  sfxBus = gain(0.75, master);
  const room = ctx.createConvolver();
  room.buffer = impulse(1.4, 3.2);
  room.connect(master);
  sfxRoom = gain(0.35, room);
  if (muted) void ctx.suspend();
  return ctx;
}

/** Premier geste du joueur : le navigateur autorise enfin le son. */
function unlock() {
  const c = ensure();
  if (!c) return;
  if (!muted && c.state === 'suspended') void c.resume();
  if (wanted && !current) startAmbience(wanted);
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
  // onglet caché : on se tait (et les sons aléatoires ne s'accumulent pas)
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (!muted) void ctx.resume();
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

/** Un gain, branché sur un nœud, ou sur un paramètre (pour moduler : la pluie qui forcit, le vent…). */
function gain(value: number, to?: AudioNode | AudioParam): GainNode {
  const g = ctx!.createGain();
  g.gain.value = value;
  if (to instanceof AudioParam) g.connect(to);
  else if (to) g.connect(to);
  return g;
}

function filter(type: BiquadFilterType, frequency: number, q = 0.7, to?: AudioNode): BiquadFilterNode {
  const f = ctx!.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  if (to) f.connect(to);
  return f;
}

function pan(value: number, to: AudioNode): AudioNode {
  if (!ctx!.createStereoPanner) return to;
  const p = ctx!.createStereoPanner();
  p.pan.value = value;
  p.connect(to);
  return p;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Bruit en boucle, sans raccord audible (la fin se fond dans le début). */
function noise(kind: Noise): AudioBuffer {
  const cached = noises[kind];
  if (cached) return cached;
  const sr = ctx!.sampleRate;
  const n = Math.floor(sr * 4);
  const buf = ctx!.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else if (kind === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = b0 + b1 + b2 + w * 0.1848;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last;
    }
    peak = Math.max(peak, Math.abs(d[i]));
  }
  const F = Math.floor(sr * 0.15);
  for (let i = 0; i < n; i++) d[i] /= peak;
  for (let i = 0; i < F; i++) d[n - F + i] = d[n - F + i] * (1 - i / F) + d[i] * (i / F);
  noises[kind] = buf;
  return buf;
}

/** Source de bruit qui tourne en boucle (pour les nappes d'ambiance). */
function loop(kind: Noise, to: AudioNode): AudioBufferSourceNode {
  const s = ctx!.createBufferSource();
  s.buffer = noise(kind);
  s.loop = true;
  s.loopStart = 0.15;
  s.loopEnd = s.buffer.duration;
  s.connect(to);
  s.start(0, rand(0.2, 3.5));
  return s;
}

/** Enveloppe : montée rapide, puis extinction exponentielle. */
function envelope(p: AudioParam, t: number, attack: number, peak: number, decay: number) {
  p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  p.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

/** Une bouffée de bruit filtré : papier, goutte, déclic… Rend le filtre, qu'on peut animer. */
function burst(
  t: number,
  dur: number,
  o: { type?: BiquadFilterType; f: number; q?: number; peak: number; to: AudioNode; kind?: Noise; pan?: number; attack?: number },
): BiquadFilterNode {
  const src = ctx!.createBufferSource();
  src.buffer = noise(o.kind ?? 'white');
  const g = gain(0, o.pan === undefined ? o.to : pan(o.pan, o.to));
  const type = o.type ?? 'bandpass';
  const f = filter(type, o.f, o.q ?? 1, g);
  // un filtre étroit ne laisse passer qu'une part du bruit : on compense, pour que « peak » garde le même sens
  const ny = ctx!.sampleRate / 2;
  const band = type === 'bandpass' ? o.f / (o.q ?? 1) : type === 'lowpass' ? o.f : type === 'highpass' ? ny - o.f : ny;
  const boost = Math.min(8, Math.sqrt(ny / Math.max(band, 60)));
  envelope(g.gain, t, o.attack ?? Math.min(0.006, dur / 4), o.peak * boost, dur);
  src.connect(f);
  src.start(t, rand(0, 3));
  src.stop(t + dur + 0.1);
  return f;
}

/** Une note simple (sinus, triangle…) avec son enveloppe ; rend l'oscillateur. */
function tone(t: number, freq: number, dur: number, peak: number, to: AudioNode, type: OscillatorType = 'sine', attack = 0.004): OscillatorNode {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  const g = gain(0, to);
  envelope(g.gain, t, attack, peak, dur);
  o.connect(g);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
  return o;
}

/** Partiels d'une cloche d'église : rapport de fréquence, force, durée relative. */
const BELL: [number, number, number][] = [
  [0.5, 0.35, 1],
  [1, 0.5, 0.8],
  [1.19, 0.3, 0.6],
  [1.5, 0.2, 0.5],
  [2, 0.35, 0.45],
  [2.5, 0.12, 0.3],
  [2.67, 0.1, 0.3],
  [3, 0.08, 0.25],
  [4.17, 0.06, 0.2],
];
function bell(t: number, f0: number, dur: number, peak: number, to: AudioNode) {
  for (const [ratio, amp, life] of BELL) tone(t, f0 * ratio * rand(0.998, 1.002), dur * life, peak * amp, to, 'sine', 0.003);
}

/** Réponse impulsionnelle d'une pièce (pour la réverbération). */
function impulse(seconds: number, decay: number): AudioBuffer {
  const sr = ctx!.sampleRate;
  const n = Math.floor(sr * seconds);
  const b = ctx!.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}

/** Répète un son à intervalles aléatoires (en secondes), seulement quand le son tourne. */
function every(min: number, max: number, fn: (t: number) => void): () => void {
  let id = 0;
  let on = true;
  const next = () => {
    id = window.setTimeout(() => {
      if (!on) return;
      if (running()) fn(ctx!.currentTime + 0.03);
      next();
    }, rand(min, max) * 1000);
  };
  next();
  return () => {
    on = false;
    clearTimeout(id);
  };
}

// ———————————————————————————————— ambiances ————————————————————————————————

interface Layer {
  sources: AudioScheduledSourceNode[];
  timers: (() => void)[];
}

/** La pluie : un ruissellement continu, et des gouttes qui claquent çà et là. */
function rain(L: Layer, out: AudioNode, o: { level: number; muffle: number; drops: [number, number]; dropLevel: number }) {
  const g = gain(o.level, out);
  const lp = filter('lowpass', o.muffle, 0.5, g);
  L.sources.push(loop('pink', filter('highpass', 350, 0.5, lp)));
  // la pluie forcit et faiblit doucement
  const swell = ctx!.createOscillator();
  swell.frequency.value = 0.06;
  const depth = gain(o.level * 0.3, g.gain);
  swell.connect(depth);
  swell.start();
  L.sources.push(swell);
  L.timers.push(
    every(o.drops[0], o.drops[1], (t) =>
      burst(t, rand(0.01, 0.03), { f: rand(1500, Math.min(6000, o.muffle * 2)), q: rand(2, 6), peak: o.dropLevel * rand(0.3, 1), to: out, pan: rand(-0.8, 0.8) }),
    ),
  );
}

/** Le vent qui souffle dans la rue, par rafales lentes. */
function wind(L: Layer, out: AudioNode, level: number) {
  const g = gain(level, out);
  const bp = filter('bandpass', 320, 0.8, g);
  L.sources.push(loop('brown', bp));
  const lfo = ctx!.createOscillator();
  lfo.frequency.value = 0.045;
  const d = gain(160, bp.frequency);
  lfo.connect(d);
  lfo.start();
  const lfo2 = ctx!.createOscillator();
  lfo2.frequency.value = 0.027;
  const d2 = gain(level * 0.6, g.gain);
  lfo2.connect(d2);
  lfo2.start();
  L.sources.push(lfo, lfo2);
}

/** Une cloche d'église au loin, de temps en temps (un à trois coups). */
function distantBell(L: Layer, out: AudioNode, o: { every: [number, number]; level: number; muffle: number }) {
  const lp = filter('lowpass', o.muffle, 0.5, out);
  L.timers.push(
    every(o.every[0], o.every[1], (t) => {
      const strokes = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < strokes; i++) bell(t + i * 2.4, 196, 5, o.level, lp);
    }),
  );
}

function buildAmbience(name: Ambience, out: GainNode): Layer {
  const L: Layer = { sources: [], timers: [] };
  const c = ctx!;
  const verb = c.createConvolver();
  const wet = gain(1, out);
  verb.connect(wet);

  if (name === 'street') {
    // la rue de Whitechapel, la nuit : pluie, vent, une cloche au loin
    verb.buffer = impulse(2, 2.5);
    rain(L, out, { level: 0.22, muffle: 6000, drops: [0.04, 0.14], dropLevel: 0.05 });
    wind(L, out, 0.16);
    distantBell(L, gain(0.6, verb), { every: [35, 80], level: 0.05, muffle: 1600 });
  } else if (name === 'station') {
    // le poste de police : la pluie derrière les vitres, la pendule, la rumeur de la pièce
    verb.buffer = impulse(0.9, 3);
    rain(L, out, { level: 0.14, muffle: 1300, drops: [0.12, 0.5], dropLevel: 0.035 });
    L.sources.push(loop('brown', filter('lowpass', 170, 0.5, gain(0.12, out))));
    const clock = gain(0.05, pan(-0.35, out));
    const toVerb = gain(0.4, verb);
    clock.connect(toVerb);
    let next = c.currentTime + 0.3;
    let tock = false;
    const id = window.setInterval(() => {
      if (!running()) return;
      if (next < c.currentTime) next = c.currentTime + 0.1;
      while (next < c.currentTime + 0.5) {
        burst(next, 0.012, { f: tock ? 2300 : 2900, q: 9, peak: 1, to: clock });
        tone(next, tock ? 1300 : 1650, 0.03, 0.25, clock, 'triangle', 0.001);
        tock = !tock;
        next += 1;
      }
    }, 200);
    L.timers.push(() => clearInterval(id));
    distantBell(L, gain(0.5, verb), { every: [70, 140], level: 0.04, muffle: 900 });
  } else {
    // la morgue : air froid, becs de gaz qui sifflent, gouttes sur le carrelage, pluie lointaine
    verb.buffer = impulse(2.6, 2.2);
    L.sources.push(loop('brown', filter('lowpass', 210, 0.5, gain(0.13, out))));
    const hiss = gain(0.025, out);
    L.sources.push(loop('white', filter('highpass', 4200, 0.5, filter('lowpass', 9000, 0.5, hiss))));
    L.timers.push(every(0.15, 0.5, (t) => hiss.gain.setTargetAtTime(rand(0.016, 0.034), t, 0.08)));
    rain(L, out, { level: 0.05, muffle: 700, drops: [0.5, 1.5], dropLevel: 0.008 });
    const dripVerb = gain(0.9, verb);
    const drip = (t: number, p: number) => {
      const o = tone(t, rand(1900, 2500), 0.06, 0.12, pan(p, gain(0.5, out)), 'sine', 0.002);
      o.frequency.exponentialRampToValueAtTime(rand(700, 950), t + 0.04);
      const w = tone(t, rand(1900, 2500), 0.06, 0.1, dripVerb, 'sine', 0.002);
      w.frequency.exponentialRampToValueAtTime(800, t + 0.04);
    };
    L.timers.push(
      every(1.4, 6.5, (t) => {
        const p = rand(-0.7, 0.7);
        drip(t, p);
        if (Math.random() < 0.3) drip(t + rand(0.25, 0.6), p);
      }),
    );
  }
  return L;
}

function startAmbience(name: Ambience) {
  if (!ctx) return;
  const out = gain(0.0001, ambienceBus);
  out.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
  const L = buildAmbience(name, out);
  current = {
    name,
    stop: () => {
      const t = ctx!.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      L.timers.forEach((stop) => stop());
      window.setTimeout(() => {
        L.sources.forEach((s) => s.stop());
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
  if (name && ctx) startAmbience(name);
}

// ———————————————————————————————— bruitages ————————————————————————————————

/** Joue un bruitage, tout de suite ou un peu plus tard (en secondes). */
export function playSound(sound: Sound, delay = 0): void {
  if (muted || !running()) return;
  const t = ctx!.currentTime + 0.01 + delay;
  const out = sfxBus;
  switch (sound) {
    case 'pen': {
      // la plume gratte le papier : trois traits, le dernier plus long
      let at = t;
      for (let i = 0; i < 3; i++) {
        const d = i === 2 ? rand(0.12, 0.16) : rand(0.05, 0.08);
        const f = burst(at, d, { f: rand(3200, 4200), q: 1.6, peak: 0.22, to: out, attack: 0.012 });
        f.frequency.linearRampToValueAtTime(rand(4500, 5500), at + d * 0.6);
        f.frequency.linearRampToValueAtTime(rand(2800, 3400), at + d);
        at += d + rand(0.03, 0.06);
      }
      burst(t, 0.008, { type: 'lowpass', f: 2000, peak: 0.15, to: out });
      break;
    }
    case 'paper':
    case 'paperSoft': {
      const soft = sound === 'paperSoft';
      const n = soft ? 3 : 6;
      let at = t;
      for (let i = 0; i < n; i++) {
        const d = rand(0.03, 0.07);
        burst(at, d, { f: rand(900, 4200), q: rand(0.8, 2), peak: (soft ? 0.13 : 0.2) * rand(0.5, 1), to: out, pan: rand(-0.3, 0.3) });
        at += d * rand(0.4, 0.9);
      }
      burst(t + 0.02, 0.09, { type: 'lowpass', f: 380, peak: soft ? 0.15 : 0.25, to: out, kind: 'pink' });
      break;
    }
    case 'type': {
      // un caractère de plomb qu'on pose : déclic métallique et petit choc sourd
      const p = rand(0.94, 1.06);
      burst(t, 0.005, { type: 'highpass', f: 3000, peak: 0.45, to: out });
      tone(t, 2800 * p, 0.035, 0.11, out, 'sine', 0.001);
      tone(t, 4100 * p, 0.02, 0.05, out, 'sine', 0.001);
      tone(t, 170 * p, 0.04, 0.38, out, 'sine', 0.002).frequency.exponentialRampToValueAtTime(90, t + 0.04);
      break;
    }
    case 'untype': {
      burst(t, 0.004, { type: 'highpass', f: 2200, peak: 0.28, to: out });
      tone(t + 0.01, 1900, 0.03, 0.08, out, 'sine', 0.001);
      tone(t, 130, 0.03, 0.2, out, 'sine', 0.002);
      break;
    }
    case 'stamp': {
      // le tampon s'abat sur la page, puis un petit carillon
      tone(t, 120, 0.2, 0.45, out, 'sine', 0.003).frequency.exponentialRampToValueAtTime(45, t + 0.15);
      burst(t, 0.06, { type: 'lowpass', f: 1200, peak: 0.35, to: out, kind: 'pink' });
      burst(t, 0.03, { f: 650, q: 4, peak: 0.25, to: out });
      const chime = gain(1, out);
      chime.connect(sfxRoom);
      tone(t + 0.14, 880, 1.1, 0.07, chime, 'sine', 0.003);
      tone(t + 0.14, 1320, 0.9, 0.05, chime, 'sine', 0.003);
      tone(t + 0.26, 1760, 0.8, 0.035, chime, 'sine', 0.003);
      break;
    }
    case 'close': {
      // deux notes qui restent en suspens
      const g = gain(1, filter('lowpass', 2200, 0.5, out));
      g.connect(sfxRoom);
      tone(t, 440, 0.25, 0.2, g, 'triangle', 0.01);
      tone(t + 0.14, 494, 0.35, 0.18, g, 'triangle', 0.01);
      break;
    }
    case 'wrong': {
      // un choc sourd et deux notes qui descendent
      const g = gain(1, filter('lowpass', 900, 0.5, out));
      tone(t, 147, 0.22, 0.16, g, 'triangle', 0.006);
      tone(t + 0.16, 131, 0.3, 0.14, g, 'triangle', 0.006);
      burst(t, 0.05, { type: 'lowpass', f: 300, peak: 0.25, to: out, kind: 'pink' });
      break;
    }
    case 'hint': {
      // une page qu'on tourne
      const f = burst(t, 0.28, { f: 600, q: 0.9, peak: 0.14, to: out, attack: 0.1 });
      f.frequency.exponentialRampToValueAtTime(3500, t + 0.25);
      burst(t + 0.27, 0.06, { type: 'lowpass', f: 500, peak: 0.13, to: out, kind: 'pink' });
      break;
    }
    case 'victory': {
      // les cloches sonnent : un accord égrené
      const g = gain(1, out);
      g.connect(sfxRoom);
      [392, 494, 587, 784].forEach((f, i) => bell(t + i * 0.16, f, 2.6, 0.18, g));
      break;
    }
    case 'click': {
      burst(t, 0.004, { f: 1800, q: 2, peak: 0.16, to: out });
      tone(t, 900, 0.015, 0.07, out, 'sine', 0.001);
      break;
    }
  }
}

// ———————————————————————————————— couper le son ————————————————————————————————

export const isMuted = (): boolean => muted;

// En développement seulement : pour régler les sons depuis la console (__son.playSound('stamp')).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__son = { playSound, setAmbience, master: () => master };
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
      window.setTimeout(() => muted && void c.suspend(), 300);
    } else {
      void c.resume();
      master.gain.linearRampToValueAtTime(VOLUME, t + 0.4);
      if (wanted && !current) startAmbience(wanted);
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
