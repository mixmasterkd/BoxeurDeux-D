# The Octopus — pads au Mexique

Imagegen intégré, 13 septembre 2026. Référence d’identité : `public/assets/sprites/octopus/idle.png`, déjà créée d’après les photographies fournies par l’utilisateur. Référence de pose/mittes uniquement : `public/assets/sprites/fredo/left.png`. Fredo demeure le coach des autres lieux.

## Génération

Use case: identity-preserve. Generate a production transparent sprite ATLAS 2 columns × 2 rows with FOUR independently posed full-body characters, all THE SAME THE OCTOPUS boxer from image1. Image1 identity: long dark braids tied back, thick neat beard, athletic light-tan man, tattoos on both forearms, black T-shirt with white octopus emblem and small POULIN above, black track pants white stripe, gray-white sneakers. Image2 ONLY reference for actual oval boxing focus mitts and front-facing pad coaching pose; do NOT use image2 man's identity or navy clothes. Give The Octopus two black focus mitts with distinct GOLD circular bullseyes. Beautiful crisp polished 16-bit SNES pixel art same anatomical proportions as image1. Camera straight front, FULL body and BOTH entire shoes visible in every cell, all heads and feet aligned within equal cells, ample blank margins and gutters, no overlap across cell boundaries. Top-left READY: both mitts held in front at mid-chest, gold circles facing viewer. Top-right LEFT: his anatomical LEFT mitt raised beside face ON THE RIGHT SIDE OF IMAGE, his anatomical right mitt lowered beside waist on image left. Bottom-left RIGHT: his anatomical RIGHT mitt raised beside face ON THE LEFT SIDE OF IMAGE, left mitt lowered at image right waist. Bottom-right SWEEP: his right padded hand extends horizontally towards screen-left at shoulder height for a defensive drill, left mitt at chest. Same man, same body scale, same clothing and white octopus emblem on ALL FOUR. True RGBA transparent background, NO floor or shadow, NO checkerboard, NO titles/cell borders/text outside the shirt. Format wide enough for 2x2 equal cells with 60px empty gutters, never crop any foot.

## Retouche du fond

La première génération avait un damier opaque (alpha vérifié : 0 % transparent). Elle n’a pas été utilisée telle quelle. L’outil intégré a remplacé ce damier par une couleur chroma unie :

Use case: background-extraction. This is a pixel art sprite atlas with four excellent poses. Keep ALL FOUR character poses, faces, limbs, clothing, black mitts with golden targets, pixel colors, sizes and positions EXACTLY unchanged. Replace ONLY the fake gray-white checkerboard background, including gaps between arms/legs, with a perfectly flat solid vivid CHROMA GREEN #00FF00 background. No checkerboard anywhere. No new shadows. Preserve every shoe completely. Do not zoom, crop, repaint, relight or shift the figures. Output same dimensions1122x1402 and identical2x2grid. Background entirely clean solid green to permit exact technical alpha extraction.

## Préparation et vérification

`scripts/prepare-octopus-pads.mjs` retire uniquement le fond vert, puis extrait les quatre cellules à échelle identique. Canevas 640 × 640, ancrage (320,624), hauteur debout 512. Les centres des huit cercles dorés ont été repérés sur l’image réelle et leurs pixels vérifiés : opaques et dorés. La gauche/droite est anatomique. Les fichiers finaux `public/assets/sprites/octopus-pads/{ready,left,right,sweep}.png` ont un vrai canal alpha (81 à 83 % transparent). `coach.json` conserve les coordonnées exactes et la provenance.

Les tests `tests/pads-motion.test.js` vérifient les deux mains, les coups incorrects, la pause et l’accord contact/score à 20 et 60 Hz, pour **Fredo et The Octopus**. Les clés de texture des deux coachs sont séparées pour empêcher qu’un séjour au Mexique ne change le coach ailleurs.
