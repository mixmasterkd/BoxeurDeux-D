# Ressources du sac — BoxeurDeux-D

Créées avec l’outil imagegen intégré, sans clé API ni service nécessaire pendant une partie. Sources conservées dans ce dossier et dans `references/direction-artistique/bag/`. Les photographies personnelles de référence ne sont pas copiées dans le site.

## Ressources finales

- `public/assets/backgrounds/bag-training.png` : nouvelle vue rapprochée du gym, sans ring, à partir du décor validé conservé.
- `public/assets/sprites/bag/player-*.png` : six poses peintes avec tuque rouge, tenue bleue/blanche, short noir et gants bleus.
- `public/assets/sprites/bag/heavy-bag.png` : sac et chaînes séparés, pivot au sommet.
- `public/assets/sprites/bag/fighters.json` : ancres, gants au contact et pivot du sac.

Les sorties initiales de la planche avaient un damier peint. Deux demandes détaillées de retrait du fond ont encore produit du RGB; elles sont écartées. La dernière demande concise a livré du RGBA réel : 74,8 % de pixels complètement transparents avant extraction. Le sac possède aussi un vrai canal alpha. Les pixels presque invisibles (alpha ≤ 16) sont écartés par le même extracteur que les autres personnages; aucun découpage par couleur et aucun dessin des personnages par code.

Préparation reproductible : `node scripts/prepare-bag-sprites.mjs`. Les six poses utilisent une échelle commune et une ligne de sol commune. Canvas 420 × 360, ancre (170, 340), personnage d’environ 340 pixels de haut. Le jab utilise le bras éloigné, le direct la rotation de hanche/épaule et la levée du talon, le crochet a un bras plié et un pas d’entrée pour sa portée plus courte. Animation par poses clés; des intermédiaires pourront enrichir la fluidité ultérieurement.

## Personnage — planche initiale

```text
Use case: stylized-concept.
Asset type: production pixel-art character animation sheet for the original game BoxeurDeux-D.
Input images: image 1 is the established player's identity and colors; image 2 is the validated gym pixel-art style. Create a NEW sparring-bag animation sheet inspired by those references, not a gym image.
Subject: one adult athletic lean boxer wearing the short fitted RED knit beanie with tiny BLACK standing-boxer silhouette emblem, royal-blue singlet with white edging and racerback, black boxing shorts with wide pale gray waistband and white side stripes, royal-blue boxing gloves with ivory cuffs, blue boxing boots with white soles. Same man, proportions, costume and head in EVERY pose. Grown athletic man, not child/chibi; head is 1/6 of body height.
Composition: EXACTLY 6 full-body separate sprites on a 3 columns × 2 rows evenly spaced sheet. Orthographic game camera slightly above, three-quarters REAR view, boxer is facing RIGHT, so his back and small right-side face profile are visible. All poses look and punch RIGHT. Full figure and both shoes visible, no cropping. Each cell has a shared floor baseline and same scale. Generous separation. Transparent background with REAL alpha channel; do not paint a checkerboard. No labels, no grid lines, no text, no bag, no floor/shadows, no speed lines or impacts.
Pose order reading left to right:
1 top-left: neutral orthodox guard, knees softly bent, left foot ahead at right, both blue gloves near chin, elbows close, visibly guarded.
2 top-middle: subtle loaded preparation for jab/direct, guard remains close to chin, small torso turn, same planted feet.
3 top-right: full-extension LEFT jab straight toward RIGHT at shoulder height, left arm long/straight, right glove protects cheek, rear hand clearly stays back; front foot planted.
4 bottom-left: full-extension RIGHT cross/direct punch toward RIGHT at same shoulder-height endpoint, rear heel raised and right hip/shoulder rotated forward, left glove protects cheek. Clearly a different punching arm from jab.
5 bottom-middle: loaded LEFT hook preparation, body rotates left/back, left elbow bent outward at shoulder height, right glove guards cheek, knees flexed.
6 bottom-right: LEFT hook impact toward RIGHT at shoulder height, left elbow BENT about ninety degrees so it is clearly a hook rather than a straight punch; torso twisted and forearm horizontal, right glove at chin.
Art: excellent hand-crafted 16-bit / late SNES pixel art with readable anatomy, selective dark outlines, warm highlights, coherent chunky pixel clusters, 4–6 color shades per material, polished original game sprites. Clean crisp pixel edges, no blur, no gradients, not a vector drawing. The poses must be true limb and torso changes rather than copies translated. Maintain consistent silhouette height except natural knee flex. No blood, no injury.
```

## Correction du jab et du crochet

```text
Use case: precise-object-edit. Edit the supplied SIX-pose boxer sheet, preserving the identity, costume, red tuque, scale, camera, feet baselines, pose locations and the unchanged top-left, top-middle, bottom-left and bottom-middle sprites.
Correct only the punching arms in TWO cells:
TOP RIGHT (jab): it must be a LEFT lead jab from the FAR arm. The left blue glove extends far RIGHT at shoulder height from the far-side shoulder. The near RIGHT arm is bent, elbow down, and its blue glove remains by the right cheek. It must clearly differ from the bottom-left right cross.
BOTTOM RIGHT (left hook contact): the fist must hit the imaginary bag at the RIGHT edge of this pose. Draw the far LEFT arm as a readable bent hook with elbow bending about 90–110 degrees, not a straight arm and NOT an elbow strike. The LEFT BLUE GLOVE is the rightmost leading point at shoulder height. The left elbow lies to the LEFT of the leading glove, the forearm extends toward the right. Near right glove guards the cheek. Rotate the torso into the left hook; preserve feet, head, shirt and shorts.
Every fist must remain inside its blue boxing glove with ivory wrist cuff. No exposed fists, no elbow leading beyond striking glove, no third arm, no speed trails.
Keep the excellent original pixel-art style and outlines. Background must be REAL transparent alpha, not a rendered checkerboard. Six separate sprites, no text, no bag, no grid. Keep all other artwork unchanged.
```

## Alpha, premier essai (damier encore peint, écarté)

```text
Use case: background-extraction.
Precisely remove the entire checkerboard background and the tiny checkerboard markings surrounding the SIX boxer sprites in the supplied image. Return a PNG with a REAL RGBA alpha channel: all background pixels must have alpha 0. Preserve each boxer sprite's existing color, body, edges, pose, costume, scale, exact position and the six-cell arrangement. Remove only the background, including spaces between arms and torso and between the legs. No checkerboard or colored matte may remain in the actual image pixels. Keep every dark outline, glove cuff, white singlet edging, white boot stripe and red tuque. Do not redraw, relight, resize or reposition the artwork. The six sprites remain isolated on genuinely transparent empty canvas.
```

## Alpha, deuxième essai (damier encore peint, écarté)

```text
Extract the six characters from this sprite sheet onto a REAL TRANSPARENT BACKGROUND. This is solely background removal, not an illustration change.
The gray/white chessboard is painted into this input RGB file and MUST be removed, not reproduced. The result needs actual transparent alpha pixels, a transparent PNG cutout. Retain all six sprites, every pixel of their clothes, beanies, skin, black outlines, white cuffs, blue gloves and shoes, their current exact positions, size and poses. Do not redraw, label or change them. Delete ONLY the checkerboard between and around characters, including enclosed holes between arms and torso. No chessboard, no gray squares, no white matte, no replacement background. Transparent empty canvas, pixel art sprites only, ready to import into Phaser.
```

## Alpha final (vrai canal RGBA)

```text
Remove the background from this sprite sheet. Make the background transparent. Keep all six characters exactly the same.
```

## Sac séparé, RGBA dès la première sortie

```text
Use case: stylized-concept.
Asset type: ONE isolated heavy boxing bag sprite for the 16-bit game BoxeurDeux-D.
Input image: reference gym for matching its warm detailed pixel-art style and brown leather hanging bag.
Create ONLY a hanging heavy punching bag, long rounded cylinder made of worn reddish chestnut brown leather with stitched vertical side seams, subtle darker side shadows and warm upper-left highlights. Dark bronze fastening rings around the top connected to three short metal chains, converging at one top-center ring. Entire object including all chains is visible. Bag body about 3 times taller than its width; chain section above is about one quarter the total height. Small plain pale stitched reinforcement patch at middle height, absolutely no text or logo.
Camera: straight-on orthographic with tiny amount of visible top oval, long cylinder hangs vertically with no swing, front and left side visible. Designed to rotate later around top ring as separate transparent sprite.
Polished authentic 16-bit pixel art, crisp deliberate clusters, rich warm leather shading, restrained dark outlines, matching the provided gym illustration. Full sprite with generous margin, no cropping.
TRUE TRANSPARENT PNG BACKGROUND with alpha 0 outside bag and chains. Do NOT paint any checkerboard, white or black background. No floor, no wall, no shadow, no boxer, no support bracket, no extra objects, no interface or text.
```

## Décor rapproché

```text
Use case: stylized-concept.
Asset type: a new 16:9 fixed-camera background plate for the heavy-bag training activity in BoxeurDeux-D, final gameplay framing 1280×720.
Input images: the provided image is the approved artistic direction of the SAME boxing gym. Preserve its exquisite warm brick, worn turquoise-painted steel columns, honey wood floor, sunset Montreal windows, tactile 16-bit pixel clusters and gentle nostalgic mood.
Scene: a closer view of a quiet corner of this same old Montreal boxing gym. Camera at roughly the chest height of an adult, facing a brick wall with two tall sunset windows. Wide open foreground training area with a large worn navy rubber mat across the lower third, wood planks around it. A towel and water bottle on a small wooden bench at the far left. Old anonymous boxing pictures on the wall and a radiator. The center and right must be visually clear for adding a boxer and hanging heavy bag as separate game sprites.
Composition: horizon/wall-floor boundary at about 55 percent height; generous open mat from x20% to x90% and y55% to y93%. The boxer will stand on LEFT at x42%, feet y86%, and punch RIGHT. The heavy bag will hang around x65%, starting at y18% and ending at y75%, its ceiling chain must be added as a separate game sprite; do NOT paint the heavy bag, chain, supports or boxer into this background. Ambient wall behind that area but no foreground objects to obstruct the fight.
Style: premium handcrafted SNES-era pixel art, richly shaded yet coherent visible pixel clusters. 16:9 wide frame, same palette and architecture as reference, no blur, no antialiasing, no watercolor, not vector.
Constraints: EMPTY training room plate. Absolutely NO PEOPLE, NO boxing ring, NO ring ropes or posts, NO hanging bags, NO text, NO letters, NO HUD, NO logo, NO buttons. Preserve open space at top center for a small training cue overlay. Warm light from upper left to lower right, harmonious restrained background contrast for character legibility.
```

