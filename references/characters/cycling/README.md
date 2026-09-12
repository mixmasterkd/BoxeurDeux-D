# Cycliste : tuque rouge et vélo de livraison

Ressource originale créée avec la génération d’images intégrée à partir du personnage en survêtement du projet. `PROMPT.txt` conserve la demande initiale; `source.png` est la première planche. La première sortie contenait un faux damier, donc elle n’a pas été utilisée telle quelle. La retouche intégrée consignée dans `ALPHA_PROMPT.txt` produit `alpha.png`, contrôlée pour sa vraie transparence.

Douze poses : face, droite, dos, gauche, avec trois positions de pédalage chacune. Même vélo turquoise, colis à l’arrière, survêtement noir à bandes blanches et tuque rouge. Les versions finales ont une taille de 160 × 152 et une ancre commune (80,144), avec une échelle de dessin constante; `player.json` fournit ces métadonnées.

Préparation reproductible : `node scripts/prepare-cycling-sprites.mjs --source references/characters/cycling/alpha.png`. Ce script extrait les cases, contrôle le fond transparent et normalise l’ancrage. Les formes et poses proviennent de la génération intégrée, pas de ce script. Le jeu charge seulement les fichiers PNG/JSON finaux de `public/assets/sprites/cycling/`.

Les trajets de livraison et le rendu ont été vérifiés par entrées clavier et joypad/CDP tactiles dans un navigateur de test; les captures se trouvent dans `docs/chapter-cycling-*.png`. Il ne s’agit pas d’un essai sur téléphone physique.
