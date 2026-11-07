/** Outils de l'éditeur sur les données d'une affaire (sans interface). */
import { checkCase } from '../engine/checkCase';
import { wordIdsIn } from '../engine/markup';
import { caseScenes, MAIN_SCENE, sceneById, zoneSceneId } from '../engine/scenes';
import { slugify, uniqueId } from '../engine/slug';
import { expectedSlots } from '../engine/validation';
import type { CaseData, ExtraScene, Page, Rect, StoryData, WordCategory, Zone, ZoneKind } from '../types';

export const ZONE_KINDS: ZoneKind[] = ['person', 'object', 'document'];

export const ZONE_KIND_LABELS: Record<ZoneKind, { one: string; many: string; fresh: string }> = {
  person: { one: 'Témoin', many: 'Témoins', fresh: 'Nouveau témoin' },
  object: { one: 'Objet', many: 'Objets', fresh: 'Nouvel objet' },
  document: { one: 'Document', many: 'Documents', fresh: 'Nouveau document' },
};

export const CATEGORY_SINGULAR: Record<WordCategory, string> = {
  person: 'Personne',
  action: 'Action',
  object: 'Objet',
  place: 'Lieu',
  other: 'Divers',
};

export const PAGE_KIND_LABELS: Record<Page['kind'], string> = {
  sentences: 'Phrases à trous',
  identities: 'Qui est qui ?',
  chronology: 'Chronologie',
};

const PAGE_DEFAULT_TITLES: Record<Page['kind'], string> = {
  sentences: 'Que s\'est-il passé ?',
  identities: 'Qui est qui ?',
  chronology: 'Dans quel ordre ?',
};

export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Mot existant dont le texte correspond (sans tenir compte des accents ni des majuscules). */
export function findWordByText(c: CaseData, text: string): string | null {
  const n = normalizeText(text);
  for (const [id, w] of Object.entries(c.words)) {
    if (normalizeText(w.label) === n || id === n) return id;
  }
  return null;
}

export function guessCategory(text: string): WordCategory {
  return /^[A-ZÀ-ÖØ-Þ]/.test(text.trim()) ? 'person' : 'object';
}

export function addWord(c: CaseData, label: string, category: WordCategory): string {
  const id = uniqueId(slugify(label), Object.keys(c.words), 'mot');
  c.words[id] = { label: label.trim(), category };
  return id;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Supprime un mot : dans les textes, il redevient du texte normal. */
export function removeWord(c: CaseData, id: string) {
  const label = c.words[id]?.label ?? id;
  const re = new RegExp(`\\[\\[${escapeRe(id)}(?:\\|([^\\]]+))?\\]\\]`, 'g');
  const unwrap = (t: string) => t.replace(re, (_m, shown?: string) => shown ?? label);
  for (const z of c.zones) {
    z.text = unwrap(z.text);
    z.details?.forEach((d) => (d.text = unwrap(d.text)));
  }
  if (c.startingWords) c.startingWords = c.startingWords.filter((w) => w !== id);
  delete c.words[id];
}

export interface WordUsage {
  foundIn: Zone[];
  answerIn: Page[];
  starting: boolean;
}

export type WordStatus = 'answer' | 'decoy' | 'missing' | 'unplaced';

export const WORD_STATUS_LABELS: Record<WordStatus, { label: string; hint: string }> = {
  answer: { label: 'Réponse', hint: 'Réponse d\'une case, et trouvable dans la scène.' },
  decoy: { label: 'Fausse piste', hint: 'Trouvable dans la scène, mais réponse d\'aucune case.' },
  missing: { label: 'Introuvable', hint: 'Réponse d\'une case, mais présent dans aucun texte de la scène : le joueur ne peut pas le trouver.' },
  unplaced: { label: 'Non placé', hint: 'Présent dans aucun texte et réponse d\'aucune case.' },
};

export function analyzeWords(c: CaseData): Map<string, WordUsage> {
  const usage = new Map<string, WordUsage>();
  const starting = new Set(c.startingWords ?? []);
  for (const id of Object.keys(c.words)) usage.set(id, { foundIn: [], answerIn: [], starting: starting.has(id) });
  for (const z of c.zones) {
    const ids = new Set([...wordIdsIn(z.text ?? ''), ...(z.details ?? []).flatMap((d) => wordIdsIn(d.text ?? ''))]);
    ids.forEach((id) => usage.get(id)?.foundIn.push(z));
  }
  for (const p of c.pages) {
    new Set(expectedSlots(p).flat()).forEach((id) => usage.get(id)?.answerIn.push(p));
  }
  return usage;
}

export function wordStatus(u: WordUsage): WordStatus {
  const obtainable = u.foundIn.length > 0 || u.starting;
  if (u.answerIn.length > 0) return obtainable ? 'answer' : 'missing';
  return obtainable ? 'decoy' : 'unplaced';
}

export function newZone(c: CaseData, kind: ZoneKind, rect: Rect, sceneId: string = MAIN_SCENE): Zone {
  const id = uniqueId(slugify(ZONE_KIND_LABELS[kind].one), c.zones.map((z) => z.id));
  const zone: Zone = { id, kind, label: ZONE_KIND_LABELS[kind].fresh, rect, text: '' };
  if (sceneId !== MAIN_SCENE) zone.scene = sceneId;
  c.zones.push(zone);
  return zone;
}

/** Nouvelle scène (pièce, moment) : son id sert aussi de nom à son image (scene-2.png…). */
export function newSceneId(c: CaseData): string {
  const ids = caseScenes(c).map((s) => s.id);
  return uniqueId(slugify(`scene ${ids.length + 1}`), ids, 'scene');
}

export function addScene(c: CaseData, scene: ExtraScene) {
  (c.scenes ??= []).push(scene);
}

/** Supprime une scène et ses zones (et leurs portraits de « Qui est qui ? »). */
export function removeScene(c: CaseData, id: string) {
  if (id === MAIN_SCENE) return;
  for (const z of c.zones.filter((x) => zoneSceneId(x) === id)) removeZone(c, z.id);
  c.scenes = (c.scenes ?? []).filter((s) => s.id !== id);
  if (!c.scenes.length) delete c.scenes;
}

/** Range une zone dans une autre scène, en la gardant dans l'image. */
export function moveZoneToScene(c: CaseData, zoneId: string, sceneId: string) {
  const z = c.zones.find((x) => x.id === zoneId);
  if (!z) return;
  if (sceneId === MAIN_SCENE) delete z.scene;
  else z.scene = sceneId;
  delete z.portrait;
  const { width, height } = sceneById(c, sceneId);
  const w = Math.min(z.rect.w, width);
  const h = Math.min(z.rect.h, height);
  z.rect = { x: Math.min(z.rect.x, width - w), y: Math.min(z.rect.y, height - h), w, h };
}

export function removeZone(c: CaseData, id: string) {
  c.zones = c.zones.filter((z) => z.id !== id);
  for (const p of c.pages) if (p.kind === 'identities') p.people = p.people.filter((x) => x.zone !== id);
}

export function newPage(c: CaseData, kind: Page['kind']): Page {
  const id = uniqueId(slugify(PAGE_DEFAULT_TITLES[kind]), c.pages.map((p) => p.id), 'page');
  const title = PAGE_DEFAULT_TITLES[kind];
  const page: Page =
    kind === 'sentences'
      ? { id, kind, title, sentences: [''] }
      : kind === 'identities'
        ? { id, kind, title, people: c.zones.filter((z) => z.kind === 'person').map((z) => ({ zone: z.id, answer: '' })) }
        : { id, kind, title, events: ['', ''] };
  c.pages.push(page);
  return page;
}

/** Adapte les zones quand l'image change de taille (seulement celles d'une scène, si elle est donnée). */
export function scaleCase(c: CaseData, sx: number, sy: number, sceneId?: string) {
  const scale = (r: Rect): Rect => ({
    x: Math.round(r.x * sx),
    y: Math.round(r.y * sy),
    w: Math.round(r.w * sx),
    h: Math.round(r.h * sy),
  });
  for (const z of c.zones) {
    if (sceneId !== undefined && zoneSceneId(z) !== sceneId) continue;
    z.rect = scale(z.rect);
    if (z.portrait) z.portrait = scale(z.portrait);
  }
}

/** Taille en pixels d'une image choisie par l'auteur. */
export async function imageSize(file: File): Promise<{ width: number; height: number }> {
  if (/\.svg$/i.test(file.name)) {
    const text = await file.text();
    const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
    const w = parseFloat(svg.getAttribute('width') ?? '');
    const h = parseFloat(svg.getAttribute('height') ?? '');
    if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
    const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { width: Math.round(vb[2]), height: Math.round(vb[3]) };
    throw new Error('Ce SVG n\'indique pas sa taille (width/height ou viewBox).');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Remplace la sélection d'un champ de texte en gardant l'historique d'annulation (Ctrl+Z)
 * quand le navigateur le permet.
 */
export function replaceSelection(el: HTMLTextAreaElement | HTMLInputElement, text: string) {
  el.focus();
  let ok = false;
  try {
    ok = document.execCommand('insertText', false, text);
  } catch {
    ok = false;
  }
  if (!ok) {
    el.setRangeText(text, el.selectionStart ?? 0, el.selectionEnd ?? 0, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export interface Issues {
  errors: string[];
  warnings: string[];
}

/** Problèmes d'une affaire : la vérification du jeu + ce que seul l'éditeur sait. */
export function caseIssues(c: CaseData, files: string[], story: StoryData): Issues {
  const strip = (m: string) => m.replace(/^\[[^\]]*\] /, '');
  let report: Issues;
  try {
    report = checkCase(c);
  } catch (e) {
    report = { errors: [`Vérification impossible : ${(e as Error).message}`], warnings: [] };
  }
  const errors = report.errors.map(strip);
  const warnings = report.warnings.map(strip);
  for (const sc of c.scene ? caseScenes(c) : []) {
    if (sc.image && !files.includes(sc.image)) errors.push(`L'image de la scène « ${sc.title} » (${sc.image}) est introuvable.`);
  }
  if (!c.chapter) warnings.push('L\'affaire n\'est rangée dans aucun chapitre.');
  else if (!story.chapters.some((ch) => ch.id === c.chapter)) warnings.push('Le chapitre de cette affaire n\'existe plus.');
  for (const z of c.zones) {
    if (!z.text?.trim()) warnings.push(`« ${z.label} » n'a pas encore de description.`);
    if (z.character && !story.characters.some((ch) => ch.id === z.character)) {
      warnings.push(`« ${z.label} » est lié à un personnage qui n'existe plus.`);
    }
  }
  return { errors, warnings };
}
