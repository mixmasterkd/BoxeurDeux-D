# Le coin entre les rounds

Vignette originale produite le 11 septembre 2026 avec l’outil intégré `image_gen`, à partir des gardes validées de `sparring-v2` et de la palette du gym. Aucun service n’est appelé pendant le jeu.

Le joueur bleu et or est assis de trois quarts dos sur un tabouret. Rémi conserve sa moustache, ses cheveux bruns et sa carrure, avec un survêtement teal à bordures claires, une serviette et une petite bouteille sans marque.

`prompt-01.txt` et `source-01.png` conservent la génération initiale. La première extraction (`prompt-02-alpha.txt`, `source-02.png`) a encore produit un damier opaque. La seconde extraction intégrée (`prompt-03-alpha.txt`, `source-alpha.png`) a fourni le véritable PNG RGBA ; 46,17 % de ses pixels ont un alpha nul, y compris les espaces entre les jambes du tabouret.

Le script `node scripts/prepare-corner-sprites.mjs` normalise uniquement la taille par une mise à l’échelle proportionnelle au plus proche voisin. Il ne dessine ni ne détoure les personnages. Il produit :

- `public/assets/sprites/corner/remi-coach.png`, canevas transparent **800 × 650** ;
- `public/assets/sprites/corner/corner.json`, dimensions et provenance.

Bornes de la silhouette finale : **x 28, y 24, largeur 745, hauteur 602**. Ancre de sol conseillée : **(400, 626)**. La composition complète est prévue à droite du bilan. Préserver son rapport 800:650, sans la recadrer.

Le PNG final a été ouvert et vérifié : personnages complets, tabouret, chaussures, regard du coach dirigé vers le joueur, absence de texte et de damier opaque. L’intégration dans le panneau du jeu est gérée séparément.
