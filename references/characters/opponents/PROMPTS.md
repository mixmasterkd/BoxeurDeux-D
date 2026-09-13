# Dyrex et Louisto — provenance des sprites

Les deux personnages ont été créés avec l’outil **Imagegen intégré à Codex**. Les résultats sont conservés dans ce dépôt; aucun service d’IA n’est appelé pendant une partie. Le nom et la version du modèle de génération n’étaient pas exposés par l’outil.

Le texte intégral des deux appels n’est plus accessible dans le contexte de travail. Le stockage de session conserve les images et leurs chemins de sortie, mais pas les prompts. Les descriptions ci-dessous sont donc une **synthèse fidèle des consignes utilisées, et non leur transcription exacte**.

## Sources conservées

| Personnage | Sortie originale, fond vert | Source après détourage technique | Identifiant de la sortie Imagegen |
| --- | --- | --- | --- |
| Dyrex | `references/characters/opponents/dyrex-source.png` | `references/characters/opponents/dyrex-alpha.png` | `exec-5ae59fc7-3968-4bd9-bcc1-3d10004e24a2.png` |
| Louisto | `references/characters/opponents/louisto-source.png` | `references/characters/opponents/louisto-alpha.png` | `exec-a35a7bcd-9ac4-4b08-be38-8948e9b907e5.png` |

Les deux sorties provenaient du dossier de génération `01a097b0-3547-73e1-b93f-e268f5cfab43`. Elles ont été copiées dans le projet en laissant les originaux de l’outil en place.

Deux références du jeu ont été examinées et jointes aux appels :

- `references/characters/chapter-combat/kramer-alpha.png`, pour l’organisation de la planche et les poses;
- `public/assets/sprites/beton/beton-guard.png`, pour la qualité de dessin, les contours et le rendu des pixels.

Ces références servaient à maintenir le style et la géométrie du jeu. Dyrex et Louisto ont des identités originales; aucune photographie de personne n’a été utilisée pour ces deux personnages. La provenance du Feu est documentée séparément dans `lefeu/PROMPTS.md`.

## Consignes communes — synthèse

Créer un boxeur original pour BoxeurDeux-D, vu de face comme adversaire d’un jeu inspiré de Punch-Out. Rendu SNES/16 bits soigné, contours nets, groupes de pixels et ombrages détaillés, anatomie athlétique adulte expressive, sans silhouette chibi. Conserver le même visage, la même tenue, les mêmes proportions et la même échelle sur toute la planche.

Produire exactement seize poses complètes sur une grille de quatre colonnes et quatre lignes, avec séparation entre les silhouettes. Garder tous les gants et toutes les chaussures visibles. Fond uni vert chroma `#00ff00`, sans texte, logo, décor, ombre portée ni accessoire. Aucun casque ni chapeau. Le jab anatomique gauche se projette à droite de l’écran; le direct anatomique droit à gauche. Les poses au tapis restent à l’échelle du corps debout, sans agrandir le personnage assis.

Ordre demandé, de gauche à droite :

1. Garde; blocage haut; préparation du jab gauche; jab gauche tendu.
2. Préparation du direct droit; direct droit tendu; préparation du direct droit au corps; direct droit au corps.
3. Blocage bas; réaction à une touche à la tête; réaction à une touche au corps; chute avec appui sur un gant.
4. Assis au tapis; relevé sur un genou; esquive latérale vers la gauche de l’écran; bras levés en reconnaissance du public.

Ces images sont les poses clés de l’animation. La planche générée n’a pas été considérée comme une animation immédiatement exploitable : les silhouettes, les côtés des frappes, l’alignement et les repères de contact ont été contrôlés après extraction.

## Dyrex — synthèse des consignes d’identité

Boxeur de gabarit athlétique moyen, peau claire olivâtre ou hâlée, cheveux bruns très courts et texturés, mâchoire anguleuse, visage glabre et expression calme et concentrée. Torse nu. Gants violet profond avec poignets blancs; short de boxe gris anthracite, panneau violet et ceinture blanc argenté; chaussures de boxe gris foncé à lacets blancs. Conserver cette identité dans les seize poses.

## Louisto — synthèse des consignes d’identité

Boxeur cubain à la silhouette légère et agile, peau brun foncé chaude, cheveux noirs très courts et bouclés, visage glabre expressif, amical mais concentré. Torse nu, sans tatouages. Gants bleu royal avec grand panneau blanc sur les articulations et poignets blancs; short rouge vif, liserés bleus et blancs, ceinture blanche; chaussures bleues à garnitures blanches. Membres athlétiques et identité constante sur les seize poses.

## Détourage et préparation technique

La préparation est reproductible à partir des PNG sources conservés :

```sh
node scripts/prepare-new-opponents.mjs
```

Le script utilise uniquement Node.js et les fonctions PNG locales de `scripts/sprite-png.mjs` :

- décodage des PNG RGB/RGBA, puis suppression du fond vert lorsque `g > 55`, `g > r × 1.25` et `g > b × 1.25`;
- détection des composantes connexes de pixels visibles, avec rejet des résidus minuscules; contrôle de seize silhouettes distinctes;
- isolation de chaque silhouette pour éviter qu’un gant ou une chaussure d’une autre cellule ne soit inclus;
- mise à l’échelle uniforme, par voisin le plus proche, calibrée sur une garde haute de 512 pixels; la même échelle physique est appliquée aux seize poses, y compris au tapis;
- placement dans un canevas RGBA de 640 × 640, ancre `(320, 624)`, pieds sur la ligne `y = 624`; centrage sur les appuis des pieds, sauf les poses de chute, d’assise et de relevé centrées sur leur support complet;
- enregistrement des repères mesurés de tête, de corps et de gant/contact dans chaque `fighters.json`.

Les fichiers joués se trouvent dans `public/assets/sprites/opponents/dyrex/` et `public/assets/sprites/opponents/louisto/`. Aucun corps, gant ni détail du visage n’a été redessiné par le script : il retire le fond, découpe et aligne les éléments générés.

## Vérifications effectuées lors de l’intégration

Inspection des planches originales, contrôles des silhouettes et des repères dans `tests/new-opponent-assets.test.js`, puis combats réellement joués au clavier et par appuis tactiles CDP dans `tests/new-opponents-browser.mjs`. Le rapport est conservé dans `docs/new-opponents-browser-results.json`. Les essais tactiles simulent un appareil mobile; ils ne constituent pas un test sur un téléphone physique.
