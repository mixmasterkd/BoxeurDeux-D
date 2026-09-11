# Crochet gauche du joueur — 11 septembre 2026

Trois poses supplémentaires, créées avec **imagegen intégré**, pour le joueur de dos en tenue de sparring bleu/or. Les fichiers existants de `sparring-v2` restent intacts. Les sources RGB montrent les premiers rendus; seuls les PNG `*-alpha.png` avec véritable canal alpha alimentent la préparation.

- `player-hook-windup` : coude gauche à hauteur d'épaule, gant gauche à gauche du casque.
- `player-hook-recover` : pose intermédiaire de sortie et de retour, gant gauche au-dessus du bord gauche du casque.
- `player-hook` : contact, gant gauche passé vers la droite au-dessus du casque; coude gauche toujours plié, gant droit à la joue. La rotation vient du buste et des appuis. Aucun miroir n'est appliqué.

Les trois personnages ont été inspectés en source puis à leur taille finale : deux bras, deux gants, deux jambes, tenue et casque identiques, pieds complets. Le passage de la garde symétrique d'origine à ces poses accentue légèrement le décalage des pieds pour montrer l'appui de droitier. Il s'agit de trois poses clés, pas d'une animation dessinée image par image.

## Préparation reproductible

```sh
node scripts/prepare-sparring-hook.mjs
```

Le script effectue uniquement recadrage, redimensionnement uniforme au plus proche voisin et alignement. L'échelle utilise la **distance sommet des cheveux–semelles**, ramenée à 512 pixels, indépendamment de la hauteur du gant. Les couleurs et l'alpha générés sont conservés; aucun détourage ou dessin anatomique n'est fait par code.

Sorties : `public/assets/sprites/sparring-hook/`, trois PNG de 384 × 640 et `fighters.json`. Ancre commune `(192, 624)`. Toutes les poses ont `head`, `glove` et `contact`. Le point de contact final est `(246, 115)`, au centre du gant gauche crème. Les sources RGBA ont respectivement 60,79 %, 61,76 % et 61,70 % de pixels à alpha zéro (préparation, intermédiaire, contact).

Les premiers appels ont livré un faux damier RGB malgré la demande de transparence. Les corrections courtes « Make the background transparent » ont fourni l'alpha natif vérifié. Le jeu utilise uniquement les PNG finaux locaux; aucun service d'IA ou abonnement n'intervient pendant une partie. Prompts exacts dans `PROMPTS.md`.
