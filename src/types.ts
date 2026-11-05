/**
 * Format des données d'une affaire (fichier src/cases/<dossier>/case.json).
 * La documentation complète, en français, est dans docs/FORMAT.md.
 */

export type WordCategory = 'person' | 'action' | 'object' | 'place' | 'other';

export const CATEGORY_ORDER: WordCategory[] = ['person', 'action', 'object', 'place', 'other'];

export const CATEGORY_LABELS: Record<WordCategory, string> = {
  person: 'Personnes',
  action: 'Actions',
  object: 'Objets',
  place: 'Lieux',
  other: 'Divers',
};

export interface WordDef {
  /** Texte affiché dans la banque de mots et dans les cases remplies. */
  label: string;
  category: WordCategory;
}

/** Rectangle en pixels de l'image de la scène. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Contenu révélé en gros plan : une poche, un tiroir, le verso d'une lettre… */
export interface ZoneDetail {
  label: string;
  /** Texte enrichi : [[motId]] ou [[motId|texte affiché]] rend un mot collectable. */
  text: string;
}

export type ZoneKind = 'person' | 'object' | 'document';

/** Zone cliquable de la scène. */
export interface Zone {
  id: string;
  kind: ZoneKind;
  /** Nom neutre affiché au survol (« Homme en bleu », pas le vrai nom à deviner). */
  label: string;
  rect: Rect;
  text: string;
  details?: ZoneDetail[];
  /** Cadrage du portrait sur la page « Qui est qui ? » (sinon calculé depuis rect). */
  portrait?: Rect;
}

interface PageBase {
  id: string;
  title: string;
  /** Indices révélés un par un, du plus vague au plus précis. */
  hints?: string[];
}

/** Phrases à trous. Chaque {motId} est une case ; {a/b} accepte plusieurs réponses. */
export interface SentencesPage extends PageBase {
  kind: 'sentences';
  sentences: string[];
}

/** Associer un nom à chaque personnage (portrait découpé dans la scène). */
export interface IdentitiesPage extends PageBase {
  kind: 'identities';
  people: { zone: string; answer: string }[];
}

/** Remettre des événements dans l'ordre. Ils sont écrits ici dans le bon ordre. */
export interface ChronologyPage extends PageBase {
  kind: 'chronology';
  events: string[];
}

export type Page = SentencesPage | IdentitiesPage | ChronologyPage;

export interface CaseData {
  id: string;
  /** Position dans la campagne (1, 2, 3…). */
  order: number;
  title: string;
  /** Texte d'ouverture, affiché avant l'exploration. */
  intro: string;
  /** Texte de conclusion, affiché quand toutes les pages sont validées. */
  epilogue: string;
  scene: { image: string; width: number; height: number };
  /** Nombre d'erreurs sous lequel le jeu dit « N erreurs ou moins ». 2 par défaut. */
  tolerance?: number;
  /** Mots déjà dans la banque au début de l'affaire. */
  startingWords?: string[];
  words: Record<string, WordDef>;
  zones: Zone[];
  pages: Page[];
}
