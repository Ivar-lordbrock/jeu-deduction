# Format d'une affaire

Chaque affaire est un dossier dans `src/cases/` :

```
src/cases/
  01-diner/
    case.json   ← les données de l'affaire
    scene.svg   ← l'image de la scène (svg, png, jpg ou webp)
```

Ajouter un dossier suffit : le jeu le trouve tout seul. Le préfixe `01-` sert seulement à
ranger les dossiers, l'ordre dans le jeu vient du champ `order`.

Après chaque modification, `npm test` vérifie que l'affaire est cohérente : références
cassées, zones hors de l'image, et surtout **réponses impossibles à trouver dans la scène**.
En développement (`npm run dev`), les erreurs s'affichent aussi en bas de l'écran.

L'affaire de démonstration [`src/cases/01-diner/case.json`](../src/cases/01-diner/case.json)
sert d'exemple complet.

---

## Champs principaux

| Champ | Rôle |
|-------|------|
| `id` | Identifiant unique, sert à la sauvegarde. Ne plus le changer une fois l'affaire publiée. |
| `order` | Position dans la campagne (1, 2, 3…). |
| `title` | Titre affiché. |
| `intro` | Texte d'ouverture. `\n` pour aller à la ligne. |
| `epilogue` | Texte de conclusion, une fois toutes les pages validées. |
| `scene` | `{ "image": "scene.svg", "width": 1600, "height": 900 }`, la taille en pixels de l'image. |
| `tolerance` | Seuil du message « N erreurs ou moins » (2 par défaut). |
| `startingWords` | *(facultatif)* Mots déjà notés au départ. |
| `words` | Le dictionnaire des mots collectables. |
| `zones` | Les zones cliquables de la scène. |
| `pages` | Les pages de réflexion. |

## Les mots (`words`)

```json
"words": {
  "margot": { "label": "Margot", "category": "person" },
  "arsenic": { "label": "arsenic", "category": "object" }
}
```

Catégories : `person` (personnes), `action`, `object`, `place` (lieux), `other` (divers).
Chaque catégorie a sa couleur dans la banque de mots.

Les mots qui ne sont la réponse d'aucune case sont des **fausses pistes**, et c'est voulu.

## Les textes enrichis

Dans les textes des zones, un mot entre doubles crochets devient collectable :

- `[[margot]]` affiche le label du mot (« Margot ») ;
- `[[margot|Mlle Margot]]` affiche un autre texte, mais note le mot « Margot ».

## Les zones (`zones`)

```json
{
  "id": "femme",
  "kind": "person",
  "label": "Jeune femme en violet",
  "rect": { "x": 1165, "y": 296, "w": 170, "h": 499 },
  "text": "Une jeune femme immobile…",
  "details": [
    { "label": "Dans sa main", "text": "Un reçu : une fiole d'[[arsenic]]…" }
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

## Les pages de réflexion (`pages`)

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
  "sentences": ["{margot} a versé de l'{arsenic} dans le {vin} de {aldric}."]
}
```

Chaque `{motId}` est une case. `{poison/arsenic}` accepte l'un ou l'autre.

### Qui est qui (`identities`)

```json
{
  "id": "qui",
  "kind": "identities",
  "title": "Qui est qui ?",
  "people": [{ "zone": "femme", "answer": "margot" }]
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
