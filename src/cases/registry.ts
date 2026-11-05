import type { CaseData } from '../types';

/** Une affaire avec ses fichiers résolus. */
export interface LoadedCase extends CaseData {
  folder: string;
  sceneUrl: string;
}

// Chaque dossier de src/cases contenant un case.json est une affaire :
// ajouter un dossier suffit, rien à enregistrer ailleurs.
const files = import.meta.glob<CaseData>('./*/case.json', { eager: true, import: 'default' });
const images = import.meta.glob<string>('./*/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const cases: LoadedCase[] = Object.entries(files)
  .map(([path, data]) => {
    const folder = path.split('/')[1];
    return { ...data, folder, sceneUrl: images[`./${folder}/${data.scene?.image}`] ?? '' };
  })
  .sort((a, b) => a.order - b.order);
