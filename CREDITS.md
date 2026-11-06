# Crédits et licences des assets

Tous les assets sont gratuits. Les fichiers gardés dans le dépôt sont dans `src/assets/`. Ceux qui sont marqués « recompressé » ont été réduits pour le web (largeur, qualité JPEG, niveaux de gris) ; les originaux restent disponibles aux sources indiquées.

## Gravures — domaine public

Gustave Doré (dessin) et ses graveurs, pour *London, a Pilgrimage*, de Blanchard Jerrold et Gustave Doré (Grant & Co., Londres, 1872). Les fichiers viennent de Wikimedia Commons, où ils sont marqués domaine public. Ils sont recompressés en 1000 px, en niveaux de gris, dans `src/assets/engravings/`.

| Fichier | Planche | Source |
|---|---|---|
| `over-london-by-rail.jpg` | « Over London – by Rail » (gravure d'Adolphe François Pannemaker) | [Commons](https://commons.wikimedia.org/wiki/File:YCBA_London_a_Pilgrimage_06_(cropped).jpg) |
| `bluegate-fields.jpg` | « Bluegate Fields » (chap. XVII) | [Commons](https://commons.wikimedia.org/wiki/File:Bpt6k10470488_f319.jpg) |
| `dudley-street.jpg` | « Dudley Street, Seven Dials » (chap. XIX) | [Commons](https://commons.wikimedia.org/wiki/File:Bpt6k10470488_f375.jpg) |
| `bulls-eye.jpg` | « The Bull's-Eye » (chap. XVIII, Whitechapel) | [Commons](https://commons.wikimedia.org/wiki/File:Bpt6k10470488_f333.jpg) |
| `wentworth-street.jpg` | « Wentworth Street, Whitechapel » | [Commons](https://commons.wikimedia.org/wiki/File:Gustave_Dor%C3%A9_-_Wentworth_Street_Whitechapel_-_London,_a_Pilgrimage.jpg) |
| `whitechapel.jpg` | « Whitechapel » (chap. XVIII) | [Commons](https://commons.wikimedia.org/wiki/File:Bpt6k10470488_f322.jpg) |

Les scans `Bpt6k10470488` viennent de Gallica (Bibliothèque nationale de France).

## Icônes — CC BY 3.0

[game-icons.net](https://game-icons.net), sous licence [Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/). Attribution obligatoire : elle figure dans ce fichier et en bas de l'écran titre.

- **Lorc** ([lorcblog.blogspot.com](https://lorcblog.blogspot.com)) : `top-hat`, `fist`, `key`, `scroll-unfurled`, `magnifying-glass`, `lantern-flame`, `cycle`, `uncertainty`, `quill-ink`.
- **Delapouite** ([delapouite.com](https://delapouite.com)) : `house`, `newspaper`, `notebook`.

Fichiers SVG d'origine, non modifiés (`src/assets/icons/`), colorés par le CSS.

## Polices — SIL Open Font License 1.1

- **IM Fell English** (normal et italique), d'Igino Marini, d'après les caractères Fell du XVIIᵉ siècle. Licence : `src/assets/fonts/OFL-IMFellEnglish.txt`. Source : [google/fonts](https://github.com/google/fonts/tree/main/ofl/imfellenglish).
- **UnifrakturMaguntia**, de J. "Mach" Wust. Licence : `src/assets/fonts/OFL-UnifrakturMaguntia.txt`. Source : [google/fonts](https://github.com/google/fonts/tree/main/ofl/unifrakturmaguntia).

## Textures — CC0 (domaine public)

- `textures/paper.jpg` : **Paper006** d'[ambientCG](https://ambientcg.com/view?id=Paper006), [CC0](https://docs.ambientcg.com/license/). Carte de couleur seule, recompressée en 768 px.
- `textures/fog-1.png` à `fog-3.png` : `smoke_01`, `smoke_04` et `smoke_07` du **Particle Pack** de [Kenney](https://kenney.nl) ([OpenGameArt](https://opengameart.org/content/particle-pack-80-sprites)), [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Réduits en 256 px.

## Sons — CC0 (domaine public)

Ambiances et bruitages : vrais enregistrements de **Joseph Sardin**, sur [BigSoundBank](https://bigsoundbank.com), sous licence [Creative Commons CC0 1.0](https://bigsoundbank.com/licenses.html), sans aucune restriction. Pour le remercier : « Sons additionnels : Joseph SARDIN - BigSoundBank.com ».

Dans `src/assets/sounds/`, les MP3 d'origine sont coupés aux limites de trames (sans réencodage) et débarrassés de leurs balises. Le jeu fait les boucles, les filtres et les volumes en direct (`src/ui/sound.ts`).

| Fichier | Son d'origine | N° | Passage gardé |
|---|---|---|---|
| `pluie-rue.mp3` | « Rain on concrete » | [1289](https://bigsoundbank.com/rain-on-concrete-s1289.html) | 2 à 22 s |
| `vent.mp3` | « Whistling of the Wind #1 » | [0147](https://bigsoundbank.com/whistling-of-the-wind-1-s0147.html) | 0 à 24 s |
| `pluie-vitre.mp3` | « Rain on car windshield #2 » | [1297](https://bigsoundbank.com/rain-on-car-windshield-2-s1297.html) | 4 à 24 s |
| `gouttes.mp3` | « Drops of water #1 » | [1384](https://bigsoundbank.com/drops-of-water-1-s1384.html) | entier |
| `pendule.mp3` | « Grandfather clock, ticking » | [1567](https://bigsoundbank.com/grandfather-clock-ticking-s1567.html) | 2,5 à 9,35 s |
| `cloche-loin.mp3` | « Bell 1 O'clock » | [3446](https://bigsoundbank.com/bell-1-o-clock-s3446.html) | 0 à 5 s |
| `cloches.mp3` | « Bell 5 O'clock » | [3445](https://bigsoundbank.com/bell-5-o-clock-s3445.html) | les deux derniers coups |
| `crayon.mp3` | « Pencil #2 » | [3233](https://bigsoundbank.com/pencil-2-s3233.html) | 0,3 à 5,3 s |
| `journal.mp3` | « News paper, pages » | [1250](https://bigsoundbank.com/news-paper-pages-s1250.html) | 5,6 à 13,5 s |
| `page-1.mp3`, `page-2.mp3` | « Pages that Turn #5 » et « #6 » | [2212](https://bigsoundbank.com/pages-that-turn-5-s2212.html), [2213](https://bigsoundbank.com/pages-that-turn-6-s2213.html) | entiers |
| `grande-page.mp3` | « Great Page that Turns #1 » | [0362](https://bigsoundbank.com/great-page-that-turns-1-s0362.html) | entier |
| `touche.mp3`, `espace.mp3` | « Typewriter, Key » et « Typewriter, space » | [2842](https://bigsoundbank.com/typewriter-key-s2842.html), [2843](https://bigsoundbank.com/typewriter-space-s2843.html) | entiers |
| `marteau.mp3` | « Gavel, 1 blow » | [1588](https://bigsoundbank.com/gavel-1-blow-s1588.html) | entier |
| `livre.mp3` | « Closed book #1 » | [1410](https://bigsoundbank.com/closed-book-1-s1410.html) | entier |
| `presse.mp3` | « Heidelberg printing press #2 » | [3405](https://bigsoundbank.com/heidelberg-printing-press-2-s3405.html) | 0,9 à 4,5 s |
| `sabots.mp3` | « Horse Trotting » | [0610](https://bigsoundbank.com/horse-trotting-s0610.html) | 0 à 4 s |
| `pas.mp3` | « Footsteps, Shoe on Concrete » | [0514](https://bigsoundbank.com/footsteps-shoe-on-concrete-s0514.html) | 0,3 à 3,3 s |
| `carillon.mp3` | « 1 pendulum chime » | [3360](https://bigsoundbank.com/1-pendulum-chime-s3360.html) | 2,85 à 9,5 s |
| `tiroir.mp3` | « Wooden drawer, opening » | [1499](https://bigsoundbank.com/wooden-drawer-opening-s1499.html) | entier |
| `drap-1.mp3`, `drap-2.mp3` | « Flag #1 » et « Flag #2 » | [1787](https://bigsoundbank.com/flag-1-s1787.html), [1788](https://bigsoundbank.com/flag-2-s1788.html) | entiers |
| `ciseaux.mp3` | « Scissors » | [0008](https://bigsoundbank.com/scissors-s0008.html) | entier |
| `seau.mp3` | « Mop and bucket Set » | [1579](https://bigsoundbank.com/mop-and-bucket-set-s1579.html) | 0,5 à 7,5 s |
| `craie.mp3` | « Chalk on bitumen » | [3223](https://bigsoundbank.com/chalk-on-bitumen-s3223.html) | entier |

## Carte — domaine public

`maps/booth-whitechapel.jpg` (écran « Les affaires ») : Whitechapel sur la **Descriptive Map of London Poverty** de **Charles Booth**, « compiled from School Board Visitors' Reports in 1887 », numérisée par la David Rumsey Map Collection et versée sur [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Descriptive_Map_of_London_Poverty,_Compiled_From_School_Board_Visitors%27_Reports_in_1887._(IA_dr_descriptive-map-of-london-poverty-compiled-from-school-board-visitors-rep-10169000).jpg), où elle est marquée domaine public. Recadrée sur Whitechapel (1600 × 1150 px, JPEG recompressé).

## Silhouettes — CC0 (domaine public)

Personnages et décor de rue en silhouettes, venus d'[Openclipart](https://openclipart.org), où tout est versé dans le domaine public ([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)). Tous ont été publiés entre 2007 et 2021, avant les générateurs d'images par IA. Dans `src/assets/silhouettes/`, les fichiers sont débarrassés de leurs métadonnées d'éditeur ; chacun garde en tête une ligne avec son numéro, son titre et son auteur.

| Fichier | Titre d'origine | Auteur | Openclipart |
|---|---|---|---|
| `monsieur-1.svg` à `monsieur-4.svg` | « Gentleman silhouette 1 » à « 4 » | Firkin | [226293](https://openclipart.org/detail/226293), [226294](https://openclipart.org/detail/226294), [226295](https://openclipart.org/detail/226295), [226296](https://openclipart.org/detail/226296) |
| `monsieur-5.svg` à `monsieur-7.svg` | « Gentleman silhouette », « 2 » et « 3 » | Firkin | [233752](https://openclipart.org/detail/233752), [233753](https://openclipart.org/detail/233753), [234056](https://openclipart.org/detail/234056) |
| `gentleman.svg` | « Vintage gentleman silhouette » | liftarn | [320826](https://openclipart.org/detail/320826) |
| `gentleman-canne.svg` | « Gentleman with cane » | liftarn | [320823](https://openclipart.org/detail/320823) |
| `bobby.svg` | « Stern policeman » | Firkin | [284188](https://openclipart.org/detail/284188) |
| `dames.svg` | « Victorian Woman Silhouette » | liftarn | [332979](https://openclipart.org/detail/332979) |
| `dame-1.svg`, `dame-2.svg` | « Old Fashioned Victorian Woman Silhouette » et sa variante 2 | GDJ | [255365](https://openclipart.org/detail/255365), [255366](https://openclipart.org/detail/255366) |
| `dame-ombrelle.svg` | « Vintage Victorian Lady Silhouette » | GDJ | [246918](https://openclipart.org/detail/246918) |
| `dame-1874.svg` | « 1874 Fashion Silhouette » | GDJ | [256527](https://openclipart.org/detail/256527) |
| `lanterne-murale.svg` | « Old-Fashioned Street Lamp Silhouette Remix » | SunKing2 | [290838](https://openclipart.org/detail/290838) |
| `reverbere-double.svg` | « Vintage Street Lamp Silhouette » | GDJ | [246924](https://openclipart.org/detail/246924) |
| `reverbere.svg` | « Vintage Street Lamp Silhouette 2 » | GDJ | [255363](https://openclipart.org/detail/255363) |
| `fiacre.svg` | « Old Carriage By Andrea Stockel Silhouette » | GDJ | [331921](https://openclipart.org/detail/331921) |
| `omnibus.svg` | « horse drawn doubledecker 2 » | johnny_automatic | [5411](https://openclipart.org/detail/5411) |
| `pupitre.svg` | « Vintage Reading Desks » (seul le pupitre de droite est gardé) | GDJ | [317926](https://openclipart.org/detail/317926) |
| `chaise.svg` | « Old furniture 2 » | Firkin | [224389](https://openclipart.org/detail/224389) |
| `porte-manteau.svg` | « coat stand » | mazeo | [63061](https://openclipart.org/detail/63061) |

Dans la scène du commissariat, seules la foule, le fiacre et le réverbère vus par la fenêtre viennent d'Openclipart : `gentleman`, `monsieur-3`, `monsieur-7`, `fiacre` et `reverbere`. Les personnages (Winkoff, Stone, Tim Bradford, Elisabeth Coyle et l'agent flou derrière la vitre) sont les silhouettes dessinées pour le jeu, plus bas.

Dans la scène de la morgue viennent d'Openclipart le pupitre (et son livre ouvert, qui sert de journal du docteur), la chaise et le porte-manteau, ainsi que la planche anatomique punaisée au mur : « Anatomical Man Line Art » de GDJ ([326032](https://openclipart.org/detail/326032), CC0), une gravure ancienne d'écorché, gardée en PNG de 400 px (`tools/scene-morgue/ecorche.png`).

Dans la scène de Goulston Street viennent d'Openclipart les réverbères et les deux passants dans le brouillard (`reverbere`, `gentleman`, `monsieur-3`) et la lanterne au-dessus de l'entrée (`lanterne-murale`).

## Dessins originaux du projet

Le décor du commissariat (`src/cases/01-leman-street/scene.svg`, généré par `tools/scene-commissariat.mjs` : la pièce en perspective, murs, meubles, papiers, lumière), celui de la morgue (`src/cases/02-morgue/scene.svg`, généré par `tools/scene-morgue.mjs`), celui de Goulston Street (`src/cases/03-goulston-street/scene.svg`, généré par `tools/scene-goulston.mjs`) et les toits de l'écran titre (`src/assets/skyline.svg`) sont dessinés pour le jeu, en SVG.

Les silhouettes des personnages récurrents (`src/assets/silhouettes/persos/` : commissaire, agent, journaliste, joueur, témoin, docteur, quatre ou cinq poses chacun, et le détective en civil, deux poses) sont aussi dessinées pour le jeu, par `tools/persos.mjs`, en s'inspirant des profils découpés de l'époque cités plus haut. Elles n'en reprennent aucun tracé. La scène contient aussi, en petit et teintées, deux gravures de Doré citées plus haut : « Bluegate Fields » vue par la fenêtre et « The Bull's-Eye » punaisée au mur.
