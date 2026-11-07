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
  /** Personnage de l'histoire représenté par ce témoin (id dans story.json). */
  character?: string;
  /** Scène où se trouve la zone (id d'une scène de « scenes ») ; sans ce champ, la première scène. */
  scene?: string;
  /** Note de l'auteur, invisible en jeu (ce que cette zone prouve…). */
  notes?: string;
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

/** Image d'une scène, en pixels. */
export interface SceneImage {
  image: string;
  width: number;
  height: number;
}

/** Première scène de l'affaire (champ « scene »). */
export interface MainScene extends SceneImage {
  /** Nom de la scène sur son onglet, quand l'affaire en a plusieurs (« La salle des dépêches »). */
  title?: string;
}

/** Scène de plus : une autre pièce, ou le même lieu à un autre moment. */
export interface ExtraScene extends SceneImage {
  /** Identifiant, repris par le champ « scene » des zones qui s'y trouvent. */
  id: string;
  /** Nom sur son onglet (« Le bureau du directeur », « Le lendemain matin »). */
  title: string;
}

/** Notes d'écriture d'une affaire, invisibles en jeu. */
export interface CaseNotes {
  /** L'instant figé que montre la scène. */
  moment?: string;
  /** Ce qui s'est réellement passé : qui, comment, pourquoi, dans quel ordre. */
  truth?: string;
  /** Ce qui doit faire douter le joueur. */
  falseLeads?: string;
  other?: string;
}

export interface CaseData {
  id: string;
  /** Position dans son chapitre (1, 2, 3…). */
  order: number;
  /** Chapitre de l'histoire (id dans story.json). */
  chapter?: string;
  /** Affaire en cours d'écriture : visible seulement en développement. */
  draft?: boolean;
  /**
   * Affaire tutoriel : à la première partie, le jeu y guide le joueur pas à pas
   * (examiner, noter, remplir la gazette, valider). À ajouter directement dans case.json.
   */
  tutorial?: boolean;
  notes?: CaseNotes;
  title: string;
  /** Texte d'ouverture, affiché avant l'exploration. */
  intro: string;
  /** Texte de conclusion, affiché quand toutes les pages sont validées. */
  epilogue: string;
  scene: MainScene;
  /** Autres scènes de l'affaire (pièces, moments), après la première. Facultatif. */
  scenes?: ExtraScene[];
  /** Nombre d'erreurs sous lequel le jeu dit « N erreurs ou moins ». 2 par défaut. */
  tolerance?: number;
  /** Mots déjà dans la banque au début de l'affaire. */
  startingWords?: string[];
  words: Record<string, WordDef>;
  zones: Zone[];
  pages: Page[];
}

/** Personnage récurrent de l'histoire (fiche d'auteur). */
export interface StoryCharacter {
  id: string;
  name: string;
  role?: string;
  appearance?: string;
  /** Ce qu'il veut, ce qu'il cache. */
  motive?: string;
  notes?: string;
}

export interface StoryChapter {
  id: string;
  title: string;
  summary?: string;
}

/** L'histoire dans son ensemble (fichier src/story/story.json). */
export interface StoryData {
  title: string;
  /** Phrase d'accroche affichée sous le titre, dans le menu. */
  subtitle?: string;
  /** Époque et lieu. */
  setting?: string;
  tone?: string;
  /** Le fil rouge qui relie toutes les affaires. */
  synopsis?: string;
  notes?: string;
  /**
   * Introduction de l'univers, montrée au joueur avant la première affaire :
   * un écran par élément. À modifier directement dans story.json.
   */
  prologue?: PrologueScreen[];
  characters: StoryCharacter[];
  /** Dans l'ordre de la campagne. */
  chapters: StoryChapter[];
}

export interface PrologueScreen {
  /** Titre court de l'écran (« Londres, automne 1888 »). */
  heading: string;
  text: string;
  /** Gravure de fond, par son nom de fichier dans src/assets/engravings (sans « .jpg »). Facultatif. */
  image?: string;
}
