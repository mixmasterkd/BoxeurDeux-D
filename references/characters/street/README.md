# Tenue de sortie et de maison

Variante originale générée avec l’outil intégré `image_gen`, à partir des 12 poses approuvées de `references/characters/exploration/player-alpha.png`.

L’identité, la tuque rouge avec motif de boxeur noir, la barbe et les quatre directions sont conservées. Le personnage porte un survêtement noir à trois bandes blanches et des chaussures blanches. Le PNG source contient une véritable transparence (1 187 502 pixels totalement transparents sur 1 572 516).

Préparation reproductible : `node scripts/prepare-street-sprites.mjs --source references/characters/street/player-alpha.png`.

Les 12 ressources finales sont dans `public/assets/sprites/street/`. Chacune utilise un canevas de 96 × 112, un ancrage aux pieds (48, 104), une échelle uniforme 0,307692 et une hauteur de silhouette de référence de 88 pixels. Aucune pose n’est étirée séparément. L’alignement horizontal prend le centre de la tuque pour référence afin que les mains et les pieds en mouvement ne déplacent pas le torse. `player.json` contient les bornes et métadonnées par pose.

Vérifications : quatre lignes séparées, trois silhouettes par ligne, fond alpha véritable, douze poses distinctes, aucune silhouette coupée, inspection visuelle de l’original et des PNG préparés. Les traces alpha ≤ 16 sont traitées comme vides, comme l’extracteur historique du projet; aucun détourage RGB ni redessin n’est réalisé en code.
