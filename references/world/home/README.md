# Maison du boxeur

Intérieur original généré avec l’outil intégré `image_gen`, en utilisant le gym validé comme référence de style. Le prompt est conservé dans `PROMPT.md` et le résultat original dans `home-source.png`.

Ressource finale : `public/assets/world/home.png` (1280 × 720). Préparation reproductible : `node scripts/prepare-home-background.mjs`. Le script effectue uniquement une mise à l’échelle uniforme avec échantillonnage au plus proche et un recadrage centré inférieur à un pixel source dû au rapport 1672 × 941. Aucune image n’est étirée.

Le lit se trouve en haut à droite, la sortie en bas au centre, l’armoire en haut à gauche et la kitchenette au fond. Le parquet central reste libre. Le bureau et la niche à trophée réservent une place visuelle à de futures activités; cette phase n’en ajoute pas.

`layout.json` fournit les points d’arrivée, du lit, de sortie et les empreintes des meubles mesurées sur la ressource finale. Ces coordonnées sont des ancrages aux pieds. L’intégration doit ajouter la marge de collision du personnage.
