import type { LoadedCase } from '../cases/registry';
import type { CaseProgress } from '../engine/progress';
import type { SceneView } from '../engine/view';

/**
 * État d'une affaire en cours : la progression sauvegardée + l'état de l'interface.
 * Tout tient sur un seul écran : le carnet à gauche, la gazette (reconstitution)
 * au-dessus de la scène.
 */
export interface Session {
  data: LoadedCase;
  progress: CaseProgress;
  openZone: string | null;
  /** Scène affichée, quand l'affaire en a plusieurs (pièces, moments). '' pour la première. */
  sceneId: string;
  showZones: boolean;
  /** Case sélectionnée, en attente d'un mot. */
  selectedSlot: { page: string; index: number } | null;
  /** Mot sélectionné, en attente d'une case. */
  armedWord: string | null;
  /** Mot tout juste collecté (petite animation dans le carnet). */
  lastCollected: string | null;
  /** Article tout juste validé (petite animation dans la gazette). */
  justSolved: string | null;
  /** Article dont on vient de révéler un indice (on fait défiler jusqu'à lui). */
  justHinted: string | null;
  /** Gazette repliée : seul son bandeau reste visible, la scène prend la place. */
  gazetteFolded: boolean;
  /** Cadrage de la scène (zoom, déplacement). La molette et le glisser le changent sans redessiner l'écran. */
  view: SceneView;
  showEpilogue: boolean;
}

export interface Actions {
  collect(wordId: string): void;
  openZone(zoneId: string): void;
  /** Passe à une autre scène de l'affaire (onglets au-dessus de la scène). */
  showScene(sceneId: string): void;
  closeZone(): void;
  toggleZones(): void;
  toggleGazette(): void;
  /** Zoom par les boutons ou le clavier : facteur (>1 rapproche), ou null pour revoir toute la scène. */
  zoom(factor: number | null): void;
  selectSlot(pageId: string, index: number): void;
  pickWord(wordId: string): void;
  dropWord(pageId: string, index: number, wordId: string): void;
  clearSlot(pageId: string, index: number): void;
  moveEvent(pageId: string, from: number, to: number): void;
  revealHint(pageId: string): void;
  dismissIntro(): void;
  closeEpilogue(): void;
  reset(): void;
  exit(): void;
  /** Aide-mémoire des règles (et, dans l'affaire tutoriel, « Revoir le tutoriel »). */
  help(): void;
  /** La une de The Whitechapel Lantern, une fois l'affaire résolue. */
  frontPage(): void;
  /** Passe à l'affaire suivante (absent pour la dernière). */
  next?: () => void;
}
