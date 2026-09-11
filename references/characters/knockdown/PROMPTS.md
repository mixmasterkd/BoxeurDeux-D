# Chute au tapis et relevé

Ressources réalisées avec la compétence `imagegen` et l’outil de génération **intégré**. Aucune clé API, aucun service distant pendant une partie. Références examinées : gardes de `sparring-v2/player-guard.png` et `sparring-v2/remi-guard.png`, plus le décor gym validé.

Les deux sources finales `player-alpha.png` et `remi-alpha.png` contiennent quatre figures : la garde debout sert seulement de témoin de taille, puis viennent la chute sur un genou, la position assise au tapis et le relevé. Le jeu utilise seulement les trois nouvelles poses. Les tentatives intermédiaires restent hors du dépôt.

`node scripts/prepare-knockdown-sprites.mjs` extrait les PNG vers `public/assets/sprites/knockdown/` et écrit `fighters.json`. Le script mesure **une seule échelle par planche** sur la garde debout de 512 pixels. Il applique cette même échelle aux trois figures abaissées, puis place leur point de sol sur l’ancre (192, 624) du canevas 384 × 640. Les jambes fléchies ne sont jamais étirées pour occuper la hauteur d’un personnage debout. Aucun membre n’est dessiné, retourné ou séparé par code.

Les textures sont `player-fall`, `player-down`, `player-rise` et leurs équivalents `remi`. Le mouvement de chute passe du genou au tapis; le relevé traverse les appuis avant de revenir à la garde. Les poses au sol gardent une rotation nulle et une ancre fixe. Pendant le compte de Rémi seul, le joueur debout s’écarte progressivement pour laisser la silhouette assise visible, puis retrouve sa place pendant le relevé. Deux tests de composition complètent les trois contrôles artistiques décrits ci-dessous : écart réel entre les silhouettes, cadrage, contact conservé, pause et transitions à 20/60 Hz.

Contrôles finaux : les six PNG ont été ouverts après extraction. Transparence native des sources : **71,31 %** des pixels du joueur et **66,88 %** de ceux de Rémi ont un alpha nul. Hauteurs extraites chute/tapis/relevé : joueur **334/226/429 px**, Rémi **382/301/422 px**, comparées à la garde debout de **512 px**. Les trois tests de `tests/knockdown-render.test.js` vérifient notamment ces silhouettes abaissées, l’alpha, l’ancre de sol, l’échelle constante et les transitions à 20 et 60 images/s.

## Joueur, vu de dos

Référence : `public/assets/sprites/sparring-v2/player-guard.png`.

```text
Use case: identity-preserve. Asset type: professional original 16-bit boxing game knockdown sprite sheet. Reference image fixes the EXACT boxer identity, muscle proportions, royal blue sparring singlet and shorts with GOLD edging and waistband, cream white gloves with gold cuffs, blue headgear gold trim and curly dark hair, blue boots white stripes, rear-view camera and detailed pixel shading. Create FOUR separated full-body poses in ONE horizontal row of four equal cells on a wide transparent PNG, with generous gaps. All figures use the SAME physical body size: identical head diameter and limb lengths across poses. Their feet/knees touch a common ground baseline across the sheet. Leave empty transparent space above kneeling/seated poses. Do NOT make the seated poses as tall as a standing person. All four poses seen FROM BEHIND, at most slight rear three-quarter view, no visible face or chest, never face the camera. Every boot and glove visible. No text, cell borders, numbers, ring, ropes, floor shadows, impact effects, or other characters.
Cell 1: Exact original standing guard as calibration pose, full height.
Cell 2: FALLING ON ONE KNEE after being stunned in sparring. Athletic knees genuinely bend and hips descend. Right knee touches the ground and left foot is planted, upper body leaning forward, one cream gloved fist reaching down to steady himself and other glove low near ribs. Head still in blue protective helmet, chin tucked. Full body silhouette reaches about 70 percent of standing height. This is a newly drawn kneeling anatomy, not a rotated standing body.
Cell 3: DOWN ON THE CANVAS: boxer seated low on his hip/backside with knees bent and both boots visible, torso slumped forward, one gloved fist braced on ground beside hip and the other near thigh. Back of headguard visible bowed down. Compact stable seated pose, not lying spread across the whole cell. Full silhouette height around 45 percent of standing height. Same head size and limb lengths as standing, no shrunken character.
Cell 4: RISING from a knockdown: balanced on one grounded knee with the opposite boot firmly planted forward, pushing himself upward with one glove on the raised thigh and one glove coming back toward the cheek. Back straightening, head lifted forward; clearly higher and more composed than fall, around 80 percent standing height. Same rear camera, identity, shoes, clothes and body scale.
Precise coherent limbs, expressive weight and credible boxing recovery, not violent injury. Transparent alpha PNG with no actual painted checkerboard.
```

## Rémi, vu de face

Référence : `public/assets/sprites/sparring-v2/remi-guard.png`.

```text
Use case: identity-preserve. Asset type: professional original 16-bit boxing game knockdown sprite sheet. Reference image fixes EXACT stocky muscular Rémi, brown hair and moustache, RED protective headgear, red gloves white cuffs, dark TEAL sparring singlet and teal shorts with WHITE edges and waistband, red lace-up boxing boots. Same frontal camera and sophisticated detailed pixel shading. Create FOUR separated full-body poses in ONE horizontal row of four equal cells, on a wide transparent PNG with generous gaps. All figures have the SAME physical scale: same head diameter and limb lengths in every pose. Use common floor baseline across all cells; leave empty transparent space above kneeling and seated poses. Never stretch seated figures to standing height. Every glove and boot visible. No labels, numbers, frames, ring, floor shadows, opponent or special effects.
Cell1: original standing guard, exact reference pose and proportions, full height calibration.
Cell2: FALLING ON ONE KNEE after being stunned during sparring. One knee truly bends to the ground and opposite boot remains planted, hips lower, torso leans forward, one red gloved fist reaching down to steady himself, other near ribs. Moustached face visible, dazed grimace with closed mouth; no wounds. Overall height about 70 percent of standing height. Newly drawn bent-knee anatomy, not rotated standing sprite.
Cell3: DOWN ON THE CANVAS: seated compactly on his backside, legs bent in front with both red boots fully visible, knees not hiding his face; torso slumped, one glove resting on thigh and the other bracing beside hip on ground. Head bowed slightly, eyes narrowed catching breath, moustache and red helmet recognizable. Overall height around 45 percent standing height, while head and limbs stay the same physical size. Do not lie horizontally across the cell.
Cell4: RISING UP: one knee still grounded and opposite foot firmly planted, pushing upward with a glove on the raised thigh, other glove returning toward face. Torso straightening and face determined again, distinctly more upright than falling, around 80 percent standing height. Same exact teal/red uniform, front camera and physical size.
Original expressive sparring recovery sprites, credible balanced body anatomy, no blood, wounds, additional arms or clipped feet. PNG genuine transparent alpha background, no painted checkerboard.
```

## Extraction alpha, séparément pour les deux planches

```text
Use case: background-extraction. Extract the exact four boxers from this image as a TRANSPARENT PNG. Keep all four characters unchanged, including the same poses, clothing, shapes, pixels and all opaque colors. Remove the entire fake gray-white checkered background from outside and all gaps between limbs. Output genuine native alpha transparency (RGBA, alpha zero around characters), not a rendered checkerboard and not a white/black background. This is a sprite asset for a game and MUST composite transparently. No shadows, text, outlines added or missing body parts. Preserve the canvas dimensions, layout, relative scale and baseline of the figures.
```

La première extraction de Rémi conservait un damier opaque RGB. Elle n’a pas été utilisée. Seconde demande retenue, fournissant le vrai PNG RGBA :

```text
Remove the background from this image. Deliver a transparent PNG cutout of all four boxers, keeping their exact existing pixels, poses, scale, spacing and alignment. There must be no checkerboard in the actual image; that is the background to remove. Transparent PNG with actual alpha zero outside the characters and between their limbs. No redraw, no scene, no shadows. Preserve canvas dimensions and every character detail.
```
