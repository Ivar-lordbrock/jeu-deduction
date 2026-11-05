# Whitechapel, 1888 (titre provisoire)

Jeu d'enquête sur Jack l'Éventreur, d'après les faits réels. Londres, automne 1888 : la
presse s'empare des meurtres de Whitechapel et Scotland Yard est dépassée. Les dates, les
faits et les lieux sont historiques ; par respect, les noms des personnes et des journaux
sont changés (la correspondance est dans les notes de `src/story/story.json`).

Chaque affaire est une scène figée à l'instant clé : le joueur l'explore, note les mots
importants dans son carnet, puis reconstitue ce qui s'est passé dans la gazette, au-dessus
de la scène, sans changer d'écran.

Cette version web sert de prototype : le jeu sera ensuite porté sur Godot. Elle est pensée
pour un écran d'ordinateur (pas de version mobile).

## Le parcours du joueur

1. **Écran titre** : un seul bouton principal, « Commencer » puis « Continuer l'enquête ».
2. **Prologue** : quelques écrans sur l'univers (Londres, 1888), à la première partie.
3. **Première affaire = tutoriel** : au poste de Leman Street, une bulle guide le joueur pas
   à pas (examiner, noter, carnet, documents, zones, gazette, remplir et corriger une case,
   qui est qui, chronologie, verdict, indices). Il peut passer une étape ou tout le
   tutoriel, et le revoir avec le bouton « ? ».
4. **Les affaires** : rangées par chapitre, l'affaire à reprendre est mise en avant.

« Comment jouer » (écran titre, liste des affaires, bouton « ? ») ouvre un aide-mémoire des
règles.

Chaque écran a son adresse (`#prologue`, `#affaires`, `#<dossier>`) : le bouton « Retour »
du navigateur fonctionne et recharger la page rouvre le même écran.

## La boucle de jeu

Tout tient sur un seul écran : le **carnet** à gauche, la **gazette** en haut, la **scène**
en dessous.

1. **Observer** : cliquer les personnages, objets et documents de la scène. Leur fiche
   s'ouvre par-dessus la scène ; les mots soulignés s'inscrivent dans le carnet.
2. **Reconstituer** : chaque page de l'affaire est un article de la gazette (phrases à
   trous, qui est qui, chronologie), à compléter avec les mots du carnet. On tire la barre
   sous la gazette pour lui donner plus ou moins de place, ou on la replie.
3. **Valider** : un article complet est jugé. Le jeu dit « Validé », « N erreurs ou moins »
   ou rien de plus : jamais où sont les erreurs.

## Lancer le jeu

Il faut [Node.js](https://nodejs.org/) 22 ou plus récent.

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5180.

| Commande | Rôle |
|----------|------|
| `npm run dev` | Jeu en développement, rechargé à chaque modification. |
| `npm test` | Vérifie le moteur et la cohérence de toutes les affaires. |
| `npm run check` | Vérification des types + tests. |
| `npm run build` | Version finale dans `dist/`, à déposer sur n'importe quel hébergeur statique. |

## L'éditeur

Avec `npm run dev` lancé, ouvrir http://localhost:5180/editeur.html (ou le bouton
« ✎ Ouvrir l'éditeur » du menu du jeu). L'éditeur écrit directement dans les fichiers du
jeu : rien à copier-coller, et le jeu ouvert dans un autre onglet se met à jour seul.

| Écran | Contenu |
|-------|---------|
| **Histoire** | Titre du jeu, époque, ton, synopsis, notes, et un tableau de bord des affaires. |
| **Personnages** | Fiches des témoins (rôle, apparence, mobile) et les affaires où ils apparaissent. |
| **Chapitre** | Titre, résumé, ordre des affaires du chapitre. |
| **Affaire › Récit** | Introduction, épilogue, et vos notes d'auteur (la vérité, les fausses pistes…). |
| **Affaire › Scène** | L'image, et les zones à dessiner à la souris : témoins, objets, documents. |
| **Affaire › Mots** | La liste des mots à trouver : où on les trouve, où ils servent, fausses pistes. |
| **Affaire › Réflexion** | Les pages à compléter : phrases à trous, qui est qui, chronologie, indices. |
| **Affaire › Vérification** | Tout ce qui empêche l'affaire d'être jouable. |

Dans un texte, sélectionner un mot puis cliquer **★ Mot à trouver** le rend collectable ;
dans une phrase de réflexion, **▭ Faire une case** en fait une case à remplir.

- Tout est enregistré automatiquement (Ctrl+S force l'enregistrement).
- Une nouvelle affaire est un **brouillon** : visible seulement en développement, jamais
  dans la version finale, tant que la case « Brouillon » est cochée.
- Une affaire supprimée part dans le dossier `corbeille/`, d'où on peut la remettre dans
  `src/cases/`.
- L'éditeur n'existe qu'en développement : `npm run build` ne contient que le jeu.

## Écrire une affaire

- L'éditeur ci-dessus, la manière la plus simple.
- [docs/GABARIT-HISTOIRE.md](docs/GABARIT-HISTOIRE.md) : le gabarit à remplir en texte libre
  pour chaque affaire (aucune connaissance technique nécessaire).
- [docs/FORMAT.md](docs/FORMAT.md) : le format des fichiers `story.json` et `case.json`.

L'affaire `src/cases/01-leman-street` (« La nuit du double meurtre ») est la première affaire
et le tutoriel : le poste de Leman Street au matin du 30 septembre 1888, après le double
meurtre de Berner Street et de Mitre Square. Sa scène est un SVG généré par
`tools/scene-commissariat.mjs` (`npm run scene`) : une pièce en perspective dessinée pour le jeu,
les silhouettes des personnages récurrents, et deux gravures de Doré dans la fenêtre et au mur.
Le script affiche les rectangles des personnages, à reporter dans les zones de `case.json`.

## Structure

```
editeur.html         page de l'éditeur (développement uniquement)
tools/
  editorApi.ts       lecture et écriture des fichiers pour l'éditeur
  persos.mjs         dessine les silhouettes des personnages (npm run persos)
  scene-commissariat.mjs   dessine la scène de l'affaire 1 (npm run scene)
src/
  main.ts            démarrage, menu ↔ affaire
  config.ts          titre du jeu, réglages généraux
  types.ts           format des données d'une affaire
  story/story.json   l'histoire : titre, personnages, chapitres
  cases/             une affaire par dossier (case.json + image)
  assets/            gravures de Doré, silhouettes, icônes, polices, textures (sources : CREDITS.md)
  engine/
    markup.ts        lecture des [[mots]] et des {cases}
    validation.ts    jugement des pages, règle « N erreurs ou moins »
    progress.ts      sauvegarde dans le navigateur
    campaign.ts      état des affaires (verrouillée, en cours…), affaire à reprendre
    checkCase.ts     vérification de cohérence d'une affaire
    slug.ts          identifiants tirés des titres
  ui/
    title.ts         écran titre
    prologue.ts      introduction de l'univers
    menu.ts          liste des affaires
    caseScreen.ts    écran d'une affaire et actions du joueur
    notebook.ts      le carnet de mots, à gauche
    gazette.ts       la gazette : reconstitution des faits, au-dessus de la scène
    explore.ts       scène, zones cliquables et fiches
    guide.ts         tutoriel guidé de la première affaire
    rules.ts         aide-mémoire « Comment jouer »
    art.ts           gravures, icônes et brouillard
  editor/            l'éditeur (Preact)
tests/               tests du moteur et des affaires
docs/                format et gabarit d'écriture, planche des personnages
```

Le jeu n'utilise pas de framework : TypeScript et DOM, construit avec Vite. L'éditeur utilise
Preact, qui n'est jamais livré aux joueurs.

Direction artistique : « silhouettes en couches ». Les plans s'assombrissent vers l'avant dans
un brouillard vert-bleu, avec la lumière ambre du gaz. Les assets sont tous gratuits : gravures
de Gustave Doré (1872, domaine public), silhouettes d'Openclipart (CC0), icônes de game-icons.net
(CC BY 3.0), polices OFL et textures CC0. Les sources et licences sont dans [CREDITS.md](CREDITS.md).

Les personnages récurrents (commissaire, agent, journaliste, joueur, témoin) sont dessinés pour le
jeu, de profil, en plusieurs poses : `src/assets/silhouettes/persos/`. Ils viennent de
`tools/persos.mjs` : changer une pose, c'est changer quelques angles, puis `npm run persos`.
La planche [docs/planche-persos.svg](docs/planche-persos.svg) les montre tous avec l'éclairage de la scène.

## Prochaines étapes

- [ ] Écrire les affaires des chapitres suivants (octobre, Miller's Court, l'après)
- [ ] Zoom et déplacement dans les grandes scènes
- [ ] Plusieurs scènes par affaire (pièces, moments différents)
- [ ] Glisser-déposer pour la chronologie
- [ ] Carte ou frise reliant les affaires (le fil rouge)
- [ ] Musique, sons, écran titre
- [ ] Portage sur Godot
