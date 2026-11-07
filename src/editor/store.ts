/**
 * État de l'éditeur : l'histoire et les affaires chargées depuis les fichiers,
 * la navigation, et la sauvegarde automatique vers le disque.
 */
import { useLayoutEffect, useState } from 'preact/hooks';
import { MAIN_SCENE, sceneById, zoneSceneId } from '../engine/scenes';
import { slugify, uniqueId } from '../engine/slug';
import type { CaseData, StoryData } from '../types';
import * as api from './api';
import { addScene, imageSize, newSceneId, scaleCase } from './model';

export type CaseTab = 'recit' | 'scene' | 'mots' | 'reflexion' | 'verif';
export const CASE_TABS: CaseTab[] = ['recit', 'scene', 'mots', 'reflexion', 'verif'];

export type Route =
  | { view: 'story' }
  | { view: 'characters' }
  | { view: 'chapter'; id: string }
  | { view: 'case'; folder: string; tab: CaseTab; zone?: string | null; page?: string | null };

export interface CaseEntry {
  folder: string;
  data: CaseData;
  /** Images présentes dans le dossier. */
  files: string[];
  /** Change à chaque nouvelle image, pour contourner le cache du navigateur. */
  imageRev: number;
}

export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

export interface EditorState {
  status: 'loading' | 'ready' | 'error';
  loadError: string | null;
  story: StoryData;
  cases: CaseEntry[];
  /** Affaires dont le case.json est illisible. */
  broken: { folder: string; error: string }[];
  route: Route;
  save: SaveState;
  saveError: string | null;
}

export const state: EditorState = {
  status: 'loading',
  loadError: null,
  story: { title: '', characters: [], chapters: [] },
  cases: [],
  broken: [],
  route: parseHash(location.hash),
  save: 'saved',
  saveError: null,
};

const listeners = new Set<() => void>();
let version = 0;
function emit() {
  version++;
  listeners.forEach((l) => l());
}

/** Abonne le composant à l'état : il se redessine à chaque changement. */
export function useEditor(): EditorState {
  const [, setTick] = useState(0);
  const renderedVersion = version;
  // Abonnement synchrone (useLayoutEffect) : un changement survenu entre le rendu
  // et l'abonnement (fin du chargement, par exemple) n'est jamais perdu.
  useLayoutEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    if (version !== renderedVersion) l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---------- Navigation (dans l'adresse, pour que le retour arrière et le rechargement marchent) ----------

export function parseHash(hash: string): Route {
  const [view, a, b, c] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (view === 'personnages') return { view: 'characters' };
  if (view === 'chapitre' && a) return { view: 'chapter', id: a };
  if (view === 'affaire' && a) {
    const tab = (CASE_TABS as string[]).includes(b) ? (b as CaseTab) : 'recit';
    return {
      view: 'case',
      folder: a,
      tab,
      zone: tab === 'scene' ? (c ?? null) : null,
      page: tab === 'reflexion' ? (c ?? null) : null,
    };
  }
  return { view: 'story' };
}

export function routeToHash(r: Route): string {
  const enc = encodeURIComponent;
  switch (r.view) {
    case 'story':
      return '#histoire';
    case 'characters':
      return '#personnages';
    case 'chapter':
      return `#chapitre/${enc(r.id)}`;
    case 'case': {
      const sub = r.tab === 'scene' ? r.zone : r.tab === 'reflexion' ? r.page : null;
      return `#affaire/${enc(r.folder)}/${r.tab}${sub ? '/' + enc(sub) : ''}`;
    }
  }
}

export function navigate(r: Route, replace = false) {
  state.route = r;
  const hash = routeToHash(r);
  if (replace) history.replaceState(null, '', hash);
  else if (location.hash !== hash) history.pushState(null, '', hash);
  emit();
}

window.addEventListener('popstate', () => {
  state.route = parseHash(location.hash);
  emit();
});

// ---------- Chargement ----------

function normalizeCase(d: CaseData): CaseData {
  d.words ??= {};
  d.zones ??= [];
  d.pages ??= [];
  d.scene ??= { image: 'scene.svg', width: 1600, height: 900 };
  return d;
}

export async function init() {
  try {
    const p = await api.loadProject();
    if (!p?.story || !Array.isArray(p.cases)) {
      throw new Error('L\'API de l\'éditeur ne répond pas. Lancez le jeu avec « npm run dev » (ou le lanceur du Bureau).');
    }
    state.story = {
      ...p.story,
      title: p.story.title ?? '',
      characters: Array.isArray(p.story.characters) ? p.story.characters : [],
      chapters: Array.isArray(p.story.chapters) ? p.story.chapters : [],
    };
    state.cases = p.cases
      .filter((c) => c.data)
      .map((c) => ({ folder: c.folder, data: normalizeCase(c.data as CaseData), files: c.files, imageRev: 0 }));
    state.broken = p.cases.filter((c) => !c.data).map((c) => ({ folder: c.folder, error: c.error ?? 'Erreur inconnue' }));
    state.status = 'ready';
  } catch (e) {
    state.status = 'error';
    state.loadError = message(e);
  }
  emit();
}

// ---------- Modifications et sauvegarde automatique ----------

const dirty = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;

function markDirty(key: string) {
  dirty.add(key);
  state.save = 'pending';
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), 700);
}

/** Enregistre tout de suite les modifications en attente. */
export async function flush(): Promise<void> {
  clearTimeout(timer);
  if (saving) {
    await saving;
    if (dirty.size) return flush();
    return;
  }
  if (!dirty.size) return;
  const keys = [...dirty];
  dirty.clear();
  state.save = 'saving';
  emit();
  saving = (async () => {
    try {
      for (const key of keys) {
        if (key === 'story') await api.saveStory(state.story);
        else {
          const entry = getCase(key.slice('case:'.length));
          if (entry) await api.saveCase(entry.folder, entry.data);
        }
      }
      state.save = dirty.size ? 'pending' : 'saved';
      state.saveError = null;
    } catch (e) {
      keys.forEach((k) => dirty.add(k));
      state.save = 'error';
      state.saveError = message(e);
      timer = setTimeout(() => void flush(), 5000);
    } finally {
      saving = null;
      emit();
    }
  })();
  await saving;
  if (dirty.size && (state.save as SaveState) !== 'error') {
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), 700);
  }
}

export function hasUnsavedChanges(): boolean {
  return dirty.size > 0 || saving !== null;
}

window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges()) {
    void flush();
    e.preventDefault();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flush();
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    void flush();
  }
});

export function getCase(folder: string): CaseEntry | undefined {
  return state.cases.find((c) => c.folder === folder);
}

export function updateStory(fn: (s: StoryData) => void) {
  fn(state.story);
  markDirty('story');
}

export function updateCase(folder: string, fn: (c: CaseData) => void) {
  const entry = getCase(folder);
  if (!entry) return;
  fn(entry.data);
  markDirty(`case:${folder}`);
}

// ---------- Affaires ----------

export function casesOfChapter(chapterId: string | null): CaseEntry[] {
  const known = new Set(state.story.chapters.map((c) => c.id));
  return state.cases
    .filter((c) => (chapterId ? c.data.chapter === chapterId : !c.data.chapter || !known.has(c.data.chapter)))
    .sort((a, b) => a.data.order - b.data.order);
}

export async function createCase(chapter?: string) {
  await flush();
  try {
    const r = await api.createCase('Nouvelle affaire', chapter);
    state.cases.push({ folder: r.folder, data: normalizeCase(r.data), files: r.files, imageRev: 0 });
    navigate({ view: 'case', folder: r.folder, tab: 'recit' });
  } catch (e) {
    alert(`Impossible de créer l'affaire : ${message(e)}`);
  }
}

export async function deleteCase(folder: string) {
  await flush();
  try {
    const r = await api.trashCase(folder);
    state.cases = state.cases.filter((c) => c.folder !== folder);
    dirty.delete(`case:${folder}`);
    navigate({ view: 'story' });
    alert(`L'affaire a été déplacée dans le dossier « ${r.trashedTo} ». Vous pouvez l'y récupérer.`);
  } catch (e) {
    alert(`Impossible de supprimer l'affaire : ${message(e)}`);
  }
}

/** Ordre des affaires d'un chapitre : 1, 2, 3… dans l'ordre donné. */
export function reorderCases(folders: string[]) {
  folders.forEach((folder, i) => {
    const entry = getCase(folder);
    if (entry && entry.data.order !== i + 1) updateCase(folder, (c) => (c.order = i + 1));
  });
}

export function setCaseChapter(folder: string, chapterId: string) {
  const last = Math.max(0, ...casesOfChapter(chapterId || null).map((c) => c.data.order));
  updateCase(folder, (c) => {
    if (chapterId) c.chapter = chapterId;
    else delete c.chapter;
    c.order = last + 1;
  });
}

const IMAGE_EXT = /\.(svg|png|jpe?g|webp)$/i;

function imageExt(file: File): string {
  const match = file.name.match(IMAGE_EXT);
  if (!match) throw new Error('Format non pris en charge : utilisez svg, png, jpg ou webp.');
  return match[1].toLowerCase().replace('jpeg', 'jpg');
}

async function sendImage(entry: CaseEntry, name: string, file: File) {
  await api.uploadFile(entry.folder, name, file);
  if (!entry.files.includes(name)) entry.files.push(name);
  entry.imageRev++;
}

/**
 * Importe une nouvelle image pour une scène de l'affaire : scene.png pour la première,
 * <id de la scène>.png pour les autres.
 */
export async function uploadSceneImage(folder: string, file: File, sceneId: string = MAIN_SCENE) {
  const entry = getCase(folder);
  if (!entry) return;
  const name = `${sceneId === MAIN_SCENE ? 'scene' : sceneId}.${imageExt(file)}`;
  const size = await imageSize(file);
  await sendImage(entry, name, file);

  const old = sceneById(entry.data, sceneId);
  const resized = size.width !== old.width || size.height !== old.height;
  const rescale =
    resized &&
    entry.data.zones.some((z) => zoneSceneId(z) === sceneId) &&
    confirm(
      `La nouvelle image fait ${size.width}×${size.height} au lieu de ${old.width}×${old.height}.\n` +
        'Adapter la position des zones à la nouvelle taille ?',
    );
  updateCase(folder, (c) => {
    if (rescale) scaleCase(c, size.width / old.width, size.height / old.height, sceneId);
    const target = sceneId === MAIN_SCENE ? c.scene : c.scenes?.find((sc) => sc.id === sceneId);
    if (target) Object.assign(target, { image: name, width: size.width, height: size.height });
  });
}

/** Ajoute une scène (une autre pièce, un autre moment) à partir d'une image. Renvoie son id. */
export async function addSceneFromFile(folder: string, file: File): Promise<string | null> {
  const entry = getCase(folder);
  if (!entry) return null;
  const ext = imageExt(file);
  const id = newSceneId(entry.data);
  const size = await imageSize(file);
  const name = `${id}.${ext}`;
  await sendImage(entry, name, file);
  const n = (entry.data.scenes?.length ?? 0) + 2;
  updateCase(folder, (c) => addScene(c, { id, title: `Scène ${n}`, image: name, width: size.width, height: size.height }));
  return id;
}

// ---------- Chapitres et personnages ----------

export function addChapter() {
  const n = state.story.chapters.length + 1;
  const id = uniqueId(slugify(`chapitre-${n}`), state.story.chapters.map((c) => c.id));
  updateStory((s) => s.chapters.push({ id, title: `Chapitre ${n}`, summary: '' }));
  navigate({ view: 'chapter', id });
}

export function moveChapter(id: string, delta: number) {
  updateStory((s) => {
    const i = s.chapters.findIndex((c) => c.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= s.chapters.length) return;
    [s.chapters[i], s.chapters[j]] = [s.chapters[j], s.chapters[i]];
  });
}

export function deleteChapter(id: string) {
  const inside = casesOfChapter(id);
  const ch = state.story.chapters.find((c) => c.id === id);
  const question = inside.length
    ? `Supprimer le chapitre « ${ch?.title} » ? Ses ${inside.length} affaire(s) seront gardées, sans chapitre.`
    : `Supprimer le chapitre « ${ch?.title} » ?`;
  if (!confirm(question)) return;
  inside.forEach((c) => updateCase(c.folder, (d) => delete d.chapter));
  updateStory((s) => (s.chapters = s.chapters.filter((c) => c.id !== id)));
  navigate({ view: 'story' });
}

export function addCharacter(): string {
  const id = uniqueId('personnage', state.story.characters.map((c) => c.id));
  updateStory((s) => s.characters.push({ id, name: '', role: '', appearance: '', motive: '', notes: '' }));
  return id;
}

export function deleteCharacter(id: string) {
  const ch = state.story.characters.find((c) => c.id === id);
  if (!confirm(`Supprimer la fiche « ${ch?.name || 'sans nom'} » ? Les témoins liés seront simplement détachés.`)) return;
  for (const entry of state.cases) {
    if (entry.data.zones.some((z) => z.character === id)) {
      updateCase(entry.folder, (c) => c.zones.forEach((z) => z.character === id && delete z.character));
    }
  }
  updateStory((s) => (s.characters = s.characters.filter((c) => c.id !== id)));
}
