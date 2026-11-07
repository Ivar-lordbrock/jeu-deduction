import { story } from '../config';
import { caseScenes } from '../engine/scenes';
import type { CaseData } from '../types';

/** Une affaire avec ses fichiers résolus. */
export interface LoadedCase extends CaseData {
  folder: string;
  /** Image de la première scène. */
  sceneUrl: string;
  /** Image de chaque scène, par id de scène (la première a l'id ''). Vide si le fichier manque. */
  sceneUrls: Record<string, string>;
}

// Chaque dossier de src/cases contenant un case.json est une affaire :
// ajouter un dossier suffit, rien à enregistrer ailleurs.
const files = import.meta.glob<CaseData>('./*/case.json', { eager: true, import: 'default' });
const images = import.meta.glob<string>('./*/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Position du chapitre dans la campagne ; les affaires sans chapitre passent à la fin. */
export function chapterIndex(chapterId: string | undefined): number {
  const i = story.chapters.findIndex((c) => c.id === chapterId);
  return i === -1 ? story.chapters.length : i;
}

const allCases: LoadedCase[] = Object.entries(files)
  .map(([path, data]) => {
    const folder = path.split('/')[1];
    const url = (image: string | undefined) => images[`./${folder}/${image}`] ?? '';
    const sceneUrls = data.scene ? Object.fromEntries(caseScenes(data).map((sc) => [sc.id, url(sc.image)])) : {};
    return { ...data, folder, sceneUrl: url(data.scene?.image), sceneUrls };
  })
  .sort((a, b) => chapterIndex(a.chapter) - chapterIndex(b.chapter) || a.order - b.order);

/** Les brouillons ne sont visibles qu'en développement. */
export const cases: LoadedCase[] = import.meta.env.DEV ? allCases : allCases.filter((c) => !c.draft);
