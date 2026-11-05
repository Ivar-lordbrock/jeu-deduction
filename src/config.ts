/** Réglages généraux du jeu. */
import storyJson from './story/story.json';
import type { StoryData } from './types';

/** L'histoire (titre, chapitres, personnages), modifiable dans l'éditeur. */
export const story = storyJson as StoryData;

/** Affiché dans le menu et l'onglet du navigateur. */
export const GAME_TITLE = story.title || 'Jeu de déduction';

export const GAME_SUBTITLE = story.subtitle ?? '';

/** Une affaire ne s'ouvre que lorsque la précédente est résolue (désactivé en développement). */
export const SEQUENTIAL_CASES = true;
