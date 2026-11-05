import type { LoadedCase } from '../cases/registry';
import type { CaseProgress } from '../engine/progress';

export type Mode = 'explore' | 'think';

/** État d'une affaire en cours : la progression sauvegardée + l'état de l'interface. */
export interface Session {
  data: LoadedCase;
  progress: CaseProgress;
  mode: Mode;
  openZone: string | null;
  showZones: boolean;
  activePage: string;
  /** Case sélectionnée, en attente d'un mot. */
  selectedSlot: { page: string; index: number } | null;
  /** Mot sélectionné, en attente d'une case. */
  armedWord: string | null;
  /** Mot tout juste collecté (petite animation dans la banque). */
  lastCollected: string | null;
  showEpilogue: boolean;
}

export interface Actions {
  collect(wordId: string): void;
  openZone(zoneId: string): void;
  closeZone(): void;
  toggleZones(): void;
  setMode(mode: Mode): void;
  setPage(pageId: string): void;
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
}
