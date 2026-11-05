# Jeu de déduction (titre provisoire)

Jeu d'enquête dans le navigateur. Chaque affaire est une scène figée à l'instant clé :
le joueur l'explore, note les mots importants, puis reconstitue ce qui s'est passé en
remplissant des pages de réflexion.

## La boucle de jeu

1. **Explorer** : cliquer les personnages, objets et documents de la scène. Les mots
   soulignés vont dans la banque de mots.
2. **Réfléchir** : compléter les pages avec ces mots (phrases à trous, qui est qui,
   chronologie).
3. **Valider** : une page complète est jugée. Le jeu dit « Validé », « N erreurs ou moins »
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

## Écrire une affaire

- [docs/GABARIT-HISTOIRE.md](docs/GABARIT-HISTOIRE.md) : le gabarit à remplir en texte libre
  pour chaque affaire (aucune connaissance technique nécessaire).
- [docs/FORMAT.md](docs/FORMAT.md) : le format des fichiers `case.json`.

L'affaire `src/cases/01-diner` est une démonstration, avec une scène provisoire dessinée en
SVG, à remplacer par la vraie histoire.

## Structure

```
src/
  main.ts            démarrage, menu ↔ affaire
  config.ts          titre du jeu, réglages généraux
  types.ts           format des données d'une affaire
  cases/             une affaire par dossier (case.json + image)
  engine/
    markup.ts        lecture des [[mots]] et des {cases}
    validation.ts    jugement des pages, règle « N erreurs ou moins »
    progress.ts      sauvegarde dans le navigateur
    checkCase.ts     vérification de cohérence d'une affaire
  ui/
    menu.ts          liste des affaires
    caseScreen.ts    écran d'une affaire et actions du joueur
    explore.ts       scène et zones cliquables
    think.ts         pages de réflexion
    wordBank.ts      banque de mots
tests/               tests du moteur et des affaires
docs/                format et gabarit d'écriture
```

Pas de framework : TypeScript et DOM, construit avec Vite.

## Prochaines étapes

- [ ] Remplacer la démo par la première vraie affaire
- [ ] Zoom et déplacement dans les grandes scènes
- [ ] Plusieurs scènes par affaire (pièces, moments différents)
- [ ] Glisser-déposer pour la chronologie, et au toucher sur mobile
- [ ] Carte ou frise reliant les affaires (le fil rouge)
- [ ] Musique, sons, écran titre
- [ ] Version de bureau (Steam) avec Electron ou Tauri
