# Arbitre de décision — sources originales

Création avec l’outil **imagegen intégré**, sans service requis pendant une partie.
Références de style : `public/assets/sprites/sparring-v2/player-guard.png` et
`public/assets/sprites/beton/beton-guard.png`.

## Génération de la planche

Use case: stylized-concept. Asset type: production pixel-art game referee sprite atlas, three full-body poses of ONE original boxing referee in a single horizontal row. Input images 1 and 2 are ONLY style references: match their refined detailed Super Nintendo boxing sprite art, clean dark outlines, warm shaded skin and crisp pixel edges. Do not include the referenced fighters. Main character: mature medium-brown-skinned male referee, short neatly combed dark hair with gray temples, clean-shaven, light powder-blue short sleeve collared shirt, black bow tie, charcoal black trousers, black belt, black shoes and black gloves. Strong readable friendly-serious face, normal fit adult proportions. Camera straight-on, whole body frontal, same head scale, same body height, same boots baseline and identical identity in all three poses. Layout: wide 1536x1024 transparent PNG with three separated equal-width columns, one complete character per column and ample clear separation. Left column NEUTRAL: arms angled down and slightly outward, hands at hip height, like holding wrists of two invisible neighboring boxers. Middle column LEFT WINNER: image-left arm extended diagonally upward, black hand gripping an invisible boxer's wrist around the height of referee's forehead, other arm down; do not draw boxer or detached wrist. Right column RIGHT WINNER: mirrored raised-arm direction, image-right arm extended diagonally upward, other arm down. Keep both feet in same relaxed planted pose in all three images. Raised hands must fit fully within respective columns. Actual transparent background with alpha, no checkerboard painted into pixels, no shadows outside feet, no scenery, no rings, no text, no labels, no frames. Fine polished high-quality sprite illustration matching supplied existing game characters, not low-effort blocky stick figures.

## Détourage intégré

La première sortie `atlas-source.png` est une planche RGB opaque avec un damier peint.
Elle est conservée comme source, mais ne doit pas être utilisée directement dans le jeu.

Use case: background-extraction. Edit this exact referee atlas: remove every single gray/white checkerboard background pixel, including gaps between arms and torso and between legs. Make background genuinely transparent PNG RGBA alpha=0. Keep all three referees unchanged, same locations, exact scale, poses, colors, face, hands and feet. The provided image currently has a painted checkerboard on an opaque RGB background: this must be replaced with actual transparency, never render another checkerboard. No other changes, no additional shadows. Preserve the detailed pixel-art clothing and outline. Transparent cutout production sprite sheet.

Cette tentative a également produit un damier opaque. La ressource finale vient donc
de la passe intégrée sur fond chromatique ci-dessous, suivie d'une conversion
technique du fond vert en alpha par `scripts/prepare-referee.mjs`.

## Fond chromatique de production

Precise background edit for game sprite production. Keep these exact three referee characters and all of their pixels as closely as possible. Replace the checkerboard background everywhere with flat perfectly solid CHROMA KEY GREEN #00FF00. Background must be uniform RGB 0,255,0 in corners and through gaps between legs and arms. No gradients, no checkerboard, no green spill or bounce light, no backdrop texture, no shadows. Character colors unchanged, light blue shirts, black pants and dark outlines, no green in characters. Preserve exact pose, full bodies, three separated referees, dimensions and positions. This is a technical green-screen atlas for subsequent engine chroma-key transparency, not an illustration of a checkerboard.

## Extraction et contrôle

- `atlas-chroma.png` : sortie intégrée retenue, 1536 × 1024.
- `atlas-alpha.png` : fond chromatique retiré, vrai PNG RGBA.
- Trois fichiers finaux `public/assets/sprites/referee/{neutral,raise-left,raise-right}.png`.
- Canvas commun 640 × 640, ancrage pieds `(320,624)`, corps debout environ 512 px.
- Une seule échelle de 512/805 pour les trois poses ; les bras levés ne rapetissent pas le corps.
- Mains et tête alignables grâce aux repères de `fighters.json`. Gauche/droite désignent les côtés de l'image.
- Contrôle pixel : 82,6 à 83,1 % de pixels entièrement transparents ; aucun résidu vert dominant ; aucun pixel visible ne touche un bord du canvas.
- Vérification visuelle des trois PNG sur fond sombre : visage, mains, chaussures et silhouette complets, identité cohérente, pas de damier.
- Le script ne dessine aucun personnage : conversion du fond, découpage, alignement et redimensionnement au plus proche seulement.

## Prévisualisation de composition

`decision-preview.png` est une **fixture visuelle**, rendue dans Phaser avec les
vrais assets du jeu et `DecisionView`, puis inspectée. Elle ne constitue pas une
preuve de parcours d'un combat. La pose de victoire du joueur utilise son direct
déjà dessiné, avec le gant aligné à la main de l'arbitre. Les adversaires n'ont pas
encore de pose de victoire bras levé : ils restent en garde pendant que l'arbitre
indique leur côté. Aucun membre n'est découpé ou déformé artificiellement.
