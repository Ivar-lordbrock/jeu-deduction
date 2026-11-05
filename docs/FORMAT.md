# Format des données

> L'éditeur (`npm run dev`, puis http://localhost:5180/editeur.html) écrit ces fichiers pour
> vous. Ce document sert à comprendre ce qu'il produit, ou à modifier un fichier à la main.

## L'histoire (`src/story/story.json`)

```json
{
  "title": "Whitechapel, 1888",
  "subtitle": "Phrase sous le titre du menu",
  "setting": "Époque, lieux",
  "tone": "Ambiance",
  "synopsis": "Le fil rouge de toute l'histoire",
  "notes": "Notes libres",
  "prologue": [
    { "heading": "Londres, automne 1888", "text": "Whitechapel, dans l'East End…", "image": "over-london-by-rail" }
  ],
  "characters": [
    { "id": "harrow", "name": "Sir Edmund Harrow", "role": "Chef de Scotland Yard", "appearance": "Médailles, moustache grise", "motive": "Éviter une émeute", "notes": "D'après Sir Charles Warren" }
  ],
  "chapters": [
    { "id": "chapitre-1", "title": "L'onde de choc", "summary": "" }
  ]
}
```

- `title` et `subtitle` s'affichent dans le menu du jeu.
- L'ordre de `chapters` est l'ordre du jeu ; le menu range les affaires par chapitre.
- `characters` est la liste des témoins de toute l'histoire. Une zone de scène peut y renvoyer
  (champ `character`, voir plus bas) pour garder les descriptions cohérentes d'une affaire à
  l'autre.
- `prologue` : l'introduction de l'univers montrée avant la première affaire, un écran par
  élément. Ce champ ne se modifie pas dans l'éditeur, mais directement dans `story.json`
  (l'éditeur le conserve). `image` (facultatif) est le nom d'une gravure de
  `src/assets/engravings`, sans `.jpg`, affichée en fond et teintée dans le brouillard.
  Une nouvelle gravure doit être ajoutée à `CREDITS.md` (un test le vérifie).
- Seuls `title`, `subtitle`, `prologue` et `chapters` changent ce que voit le joueur ; le
  reste est pour l'auteur.

# Format d'une affaire

Chaque affaire est un dossier dans `src/cases/` :

```
src/cases/
  01-leman-street/
    case.json   ← les données de l'affaire
    scene.svg   ← l'image de la scène (svg, png, jpg ou webp)
```

Ajouter un dossier suffit : le jeu le trouve tout seul. Le préfixe `01-` sert seulement à
ranger les dossiers, l'ordre dans le jeu vient du champ `order`.

Après chaque modification, `npm test` vérifie que l'affaire est cohérente : références
cassées, zones hors de l'image, et surtout **réponses impossibles à trouver dans la scène**.
En développement (`npm run dev`), les erreurs s'affichent aussi en bas de l'écran.

L'affaire de démonstration [`src/cases/01-leman-street/case.json`](../src/cases/01-leman-street/case.json)
sert d'exemple complet.

---

## Champs principaux

| Champ | Rôle |
|-------|------|
| `id` | Identifiant unique, sert à la sauvegarde. Ne plus le changer une fois l'affaire publiée. |
| `order` | Position dans le chapitre (1, 2, 3…). |
| `chapter` | *(facultatif)* Identifiant du chapitre dans `story.json`. Sans chapitre, l'affaire est rangée dans « Autres affaires ». |
| `draft` | *(facultatif)* `true` : brouillon, visible seulement avec `npm run dev`, absent de la version finale et ignoré par `npm test`. |
| `tutorial` | *(facultatif)* `true` : affaire tutoriel. À la première partie, une bulle y guide le joueur pas à pas. Les étapes s'appuient sur la première zone de personnage qui contient des mots, puis sur le premier document : rangez les zones dans cet ordre. Champ à ajouter directement dans `case.json` (l'éditeur le conserve). |
| `title` | Titre affiché. |
| `intro` | Texte d'ouverture. `\n` pour aller à la ligne. |
| `epilogue` | Texte de conclusion, une fois toutes les pages validées. |
| `scene` | `{ "image": "scene.svg", "width": 1600, "height": 900 }`, la taille en pixels de l'image. |
| `tolerance` | Seuil du message « N erreurs ou moins » (2 par défaut). |
| `startingWords` | *(facultatif)* Mots déjà notés au départ. |
| `words` | Le dictionnaire des mots collectables. |
| `zones` | Les zones cliquables de la scène. |
| `pages` | Les pages de réflexion. |
| `notes` | *(facultatif)* Notes d'auteur, jamais affichées : `moment` (l'instant figé), `truth` (ce qui s'est vraiment passé), `falseLeads` (fausses pistes), `other`. |

## Les mots (`words`)

```json
"words": {
  "hale": { "label": "Hale", "category": "person" },
  "souverain": { "label": "souverain", "category": "object" }
}
```

Catégories : `person` (personnes), `action`, `object`, `place` (lieux), `other` (divers).
Chaque catégorie a sa couleur dans la banque de mots.

Les mots qui ne sont la réponse d'aucune case sont des **fausses pistes**, et c'est voulu.

## Les textes enrichis

Dans les textes des zones, un mot entre doubles crochets devient collectable :

- `[[hale]]` affiche le label du mot (« Hale ») ;
- `[[hale|T. Hale]]` affiche un autre texte, mais note le mot « Hale ».

## Les zones (`zones`)

```json
{
  "id": "sergent",
  "kind": "person",
  "label": "Homme derrière le comptoir",
  "rect": { "x": 1165, "y": 296, "w": 170, "h": 499 },
  "text": "Trois chevrons de sergent sur la manche…",
  "details": [
    { "label": "Sa poche de poitrine", "text": "Un [[souverain]] d'or tout neuf…" }
  ]
}
```

- `kind` : `person`, `object` ou `document` (affiché sur fond papier).
- `label` : nom **neutre** affiché au survol. Ne pas y mettre le vrai nom si le joueur doit le deviner.
- `rect` : rectangle en pixels de l'image (`x`, `y` = coin haut gauche). Un logiciel de dessin
  donne ces valeurs ; le bouton « Zones » du jeu les affiche pour vérifier.
- `details` : *(facultatif)* contenus en gros plan (poches, tiroir, verso…).
- `portrait` : *(facultatif)* rectangle de cadrage du portrait sur la page « Qui est qui ? ».
  Par défaut, le jeu cadre le haut de la zone.
- `character` : *(facultatif)* pour un témoin, l'`id` du personnage dans `story.json`.
- `notes` : *(facultatif)* note d'auteur sur la zone, jamais affichée.

## Les pages de réflexion (`pages`)

En jeu, chaque page devient un article de la gazette, affichée au-dessus de la scène : toutes
les pages sont visibles en même temps, côte à côte. Trois pages (une de chaque sorte) tiennent
bien sur un écran d'ordinateur ; au-delà, la gazette défile de côté.

Chaque page a un `id`, un `title`, un `kind` et, si on veut, des `hints` (indices révélés un
par un, du plus vague au plus précis).

Une page n'est jugée que lorsqu'elle est complète. Le jeu dit alors seulement « Validé »,
« N erreurs ou moins » ou « Quelque chose ne colle pas », jamais où sont les erreurs.

### Phrases à trous (`sentences`)

```json
{
  "id": "quoi",
  "kind": "sentences",
  "title": "Que s'est-il passé ?",
  "sentences": ["À {midi}, le sergent {hale} a fait entrer {pell} par la porte de la {cour}."]
}
```

Chaque `{motId}` est une case. `{lettre/missive}` accepte l'un ou l'autre.

### Qui est qui (`identities`)

```json
{
  "id": "qui",
  "kind": "identities",
  "title": "Qui est qui ?",
  "people": [{ "zone": "sergent", "answer": "hale" }]
}
```

Le portrait est découpé automatiquement dans l'image de la scène.

### Chronologie (`chronology`)

```json
{
  "id": "quand",
  "kind": "chronology",
  "title": "Dans quel ordre ?",
  "events": ["Premier événement.", "Deuxième.", "Troisième."]
}
```

Les événements sont écrits **dans le bon ordre** ; le jeu les mélange.
