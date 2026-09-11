# Frappes au corps et gardes basses

Ressources créées avec la compétence `imagegen` et l’outil de génération **intégré**, sans CLI ni clé API. Les trois planches finales sont `gym-alpha.png`, `player-alpha.png` et `remi-alpha.png`. Les tentatives non retenues restent hors du dépôt dans le dossier de génération de Codex; elles ne sont pas requises par le jeu.

Les références examinées avant génération sont les gardes existantes de `bag-orthodox` et `sparring-v2`, ainsi que le décor validé `public/assets/backgrounds/gym.png`. La tuque rouge demeure réservée aux ateliers; les deux personnages du ring conservent leurs casques et tenues de sparring.

## Préparation technique

`node scripts/prepare-body-training-sprites.mjs` extrait les poses, conserve l’alpha généré, réduit/agrandit au plus proche voisin et aligne les semelles. Il ne dessine aucun membre et ne détourne aucun fond opaque. Le recadrage de la deuxième rangée du joueur dos suit les espaces transparents autour de la botte du crochet.

- Sources natives RGBA : gym **68,74 %**, joueur dos **62,69 %**, Rémi **54,80 %** de pixels alpha zéro.
- Sorties : `public/assets/sprites/body-training/gym-*.png`, canevas 420 × 360, ancre (170, 340); `gym.json`.
- Sorties ring : `player-*.png` et `remi-*.png`, canevas 384 × 640, ancre (192, 624); `sparring.json`.
- Six poses originales au gym, huit pour le joueur dos, six pour Rémi. Les retours de bras du ring réutilisent les préparations dessinées, selon la trajectoire temporelle inverse; aucun bras n’est retourné pour remplacer l’autre main.
- Les points de contact des gants, de tête et de corps ont été relevés sur les planches. Le sac possède deux cibles espacées de 89 pixels sur son cuir, qui suivent ensemble son oscillation.
- Toutes les images finales ont été ouvertes après extraction. Les préparations, gants abaissés, gardes compactes et réactions au ventre sont de nouvelles anatomies dessinées; il ne s’agit pas d’abaisser le sprite d’un coup à la tête.

## Prompts de génération

### Gym : jab gauche, direct droit, crochet gauche et garde basse

Référence : `public/assets/sprites/bag-orthodox/player-guard.png`.

```text
Use case: identity-preserve. Asset type: original 16-bit boxing game animation sprite sheet, genuinely transparent RGBA PNG. Reference image 1 fixes the exact character identity, outfit, camera and anatomy style. Create SIX whole-body poses in a clean 3 columns × 2 rows evenly spaced grid, no labels and no floor shadows, transparent canvas. Same lean boxer every cell: red knit tuque with tiny black boxer emblem, short dark hair, blue and white boxing singlet, black shorts with white side stripes, blue gloves and boots. Same three-quarter FRONT view facing screen RIGHT. ORTHODOX stance is essential: his anatomical LEFT leg and LEFT shoulder are forward towards screen right; his RIGHT foot is rear at screen left. Do not mirror the stance. All poses have the same camera, body size, proportions, foot baseline within cells. Use polished detailed SNES sprite shading, sharp colored pixels, clean silhouette, original reference style. These are body punches aimed at a standing opponent's abdomen, around the boxer's own waist or lower ribs; not head punches. Pose order: top left 1 BODY PUNCH PREPARATION: bend knees slightly, settle weight, both elbows compact, left glove ready to jab to the abdomen and right glove protecting cheek. Top center 2 LEFT JAB TO BODY: left lead arm reaches diagonally forward-down towards screen right at abdomen height, knees bent, right glove stays at cheek; left foot stays front. Top right 3 RIGHT CROSS TO BODY: anatomical right rear arm extends diagonally forward-down at abdomen height, torso rotates right shoulder forward, rear right heel pivots, left glove protects cheek. Bottom left 4 LEFT BODY HOOK PREPARATION: load weight over left lead leg with a modest knee dip, left elbow bent near hip, right glove at cheek, feet unchanged. Bottom center 5 LEFT HOOK TO BODY: left elbow remains visibly bent about 90 degrees, left glove hooks forward at abdomen height; torso rotation, right glove guards cheek. Bottom right 6 LOW GUARD: upright head still watching opponent, both elbows tucked over ribs and both blue gloves protecting stomach and lower ribs, compact slight crouch, not the high guard shown in reference. Exactly six separated complete figures, no opponent, no bag, no mirror, no text or numbers, no motion trails, no duplicate arms, no artificial checkerboard; preserve actual transparent alpha. Keep every boot and glove fully visible with generous cell margins.
```

### Joueur du ring vu de dos

Référence : `public/assets/sprites/sparring-v2/player-guard.png`.

```text
Use case: identity-preserve. Create a professional 16-bit game animation sheet for the exact boxer in the reference. Output eight full-body character poses in a FOUR columns by TWO rows grid, same scale, foot baseline and padding per cell, transparent PNG. Camera fixed DIRECTLY BEHIND the man, never show his face or chest. Preserve exact athletic stocky tan man, curly dark hair, blue protective sparring headgear with gold edges, royal-blue tank top, royal-blue trunks with gold waistband and gold side stripes, CREAM padded gloves with gold wrist cuffs, blue boots with white stripes. Both feet visible every pose, body proportions and polished detailed pixel sprite style exactly match reference. No words, no numbers, no lines, no ground shadow, no opponent, no background. This sheet adds BODY punches and low defense. Knees bend and arms aim to the belly of an opponent in front of him, around the boxer's chest/upper stomach level in this rear camera rather than the high glove reaching over his helmet in a head jab. Do not make these head punches or raise glove above his head.
Pose order left to right top row: 1 left body jab windup: left glove ready lower near left ribs, knees dip modestly, right glove guards right cheek. 2 LEFT BODY JAB fully extended away from camera toward opponent stomach, left shoulder reaches forward with straight left elbow, glove visibly at upper-torso height left of helmet and BELOW helmet, right glove stays beside face. 3 right body cross windup: right glove loaded by right ribs, left glove guards face, compact knees. 4 RIGHT BODY CROSS fully extended away from camera at upper-torso height BELOW helmet, right shoulder and hip rotate forward, rear heel pivots, left glove remains at left cheek. Bottom row: 5 left body hook windup with left elbow bent near lower ribs, right glove protects cheek. 6 LEFT BODY HOOK, left elbow bent about ninety degrees and glove curling inward across opponent stomach at chest-height BELOW helmet, torso rotated naturally, right glove near right cheek. 7 LOW BODY GUARD, both elbows tightly tucked over ribs and both cream gloves lowered just forward of upper abdomen, knees softly bent, head upright looking forward. 8 BODY HIT REACTION, compact forward bend from abdomen with knees flexed, shoulders hunched briefly and gloves lowered toward hurt abdomen, still rear view. All are boxing gestures, not stretching. Exact character identity, no additional limbs and no clipping. Every cell has one complete separated figure.
```

Correction de perspective retenue :

```text
Use case: precise-object-edit. Edit this exact eight-cell rear-view boxer sprite sheet. Keep the six other poses, same uniform, identity, camera, anatomy style, feet and cell positions. Correct ONLY top-row pose 2 and pose 4: these straight body punches must point FORWARD away from the camera toward an opponent in front of the boxer, not out to the side of his body. Strongly foreshorten the punching forearm in perspective: in pose 2, the LEFT punching glove should project close to the LEFT SHOULDER, horizontally about 40 pixels left of the head center in its 384-pixel-wide cell, and vertically around 150 pixels below the top of the cell. In pose 4, the RIGHT punching glove projects close to the RIGHT SHOULDER, about 40 pixels right of the head center and around y150 in its cell. Each punching arm is extended away from us into the depth of the image, glove below the head rather than above it. The opposite glove stays by the cheek. Do not stretch either arm laterally sideways. These are punches into an opponent's belly. Keep boxer rear view with no face visible. Preserve the remaining windup, body hook, low guard and hunched body-hit poses exactly. Extract all eight figures onto a true transparent background (RGBA PNG), no checkerboard or shadows.
```

### Rémi de face

Référence : `public/assets/sprites/sparring-v2/remi-guard.png`.

```text
Use case: identity-preserve. Produce SIX new whole-body boxing sprite poses of the EXACT man in the reference. Three columns by two rows sheet, same scale/height and foot baseline in each cell, transparent PNG, no text, no opponent, no props or floor shadows. Same fixed frontal camera looking directly at his face. Preserve original stocky muscular man with brown hair and thick moustache, red sparring headgear, red boxing gloves with white cuffs, dark TEAL singlet with white edges, teal boxing shorts white waistband/side stripes, red boxing boots white laces. Same polished 16-bit sprite shading and anatomy style, every glove/boot intact. Body punches aimed at abdomen of boxer facing him, so lowered gloved fist around belly/waist height and compact bent knees, NOT raised near face. Orthdox boxing stance, anatomical LEFT is screen RIGHT in frontal view, anatomical RIGHT is screen LEFT. Same identity throughout.
Top-left 1 LEFT BODY JAB PREPARATION: left glove on screen right lowered to ribs preparing a straight body jab, right glove screen left protects cheek, knees slightly bent. Top-center 2 LEFT BODY JAB fully extended TOWARDS CAMERA with foreshortened forearm and red left glove seen head-on around upper-abdomen height screen right of center, right glove still protects his cheek. Top-right 3 RIGHT BODY CROSS PREPARATION, anatomical right glove screen left near lower ribs, left glove screen right protecting cheek, rear shoulder loaded. Bottom-left 4 RIGHT BODY CROSS fully extended towards camera at upper-abdomen height, right glove screen left of torso center, rear shoulder rotated forward, left glove stays cheek. Bottom-center 5 LOW GUARD both forearms compact and both red gloves shielding lower ribs and upper abdomen, head and face visible and alert, slight crouch. Bottom-right 6 BODY HIT REACTION: wince and exhale with moustached face visible, hunch forward from upper abdomen with knees bent and both gloves pulled protectively over belly, coherent full body not falling. Keep all body punches clearly aimed BELOW his own chest and head. Do not extend arms sideways, do not duplicate arms, do not change clothing or face. All six figures fully separated by transparent padding.
```

## Extractions alpha retenues

Les premières planches et certaines demandes d’extraction ont produit un damier **opaque**; elles n’ont pas été utilisées comme transparence. Les demandes suivantes ont fourni les PNG RGBA finaux contrôlés par lecture des pixels.

Gym :

```text
Make the background transparent. Extract all six exact boxer figures unchanged as one PNG sprite sheet with transparency. The checkerboard is an unwanted opaque background: completely remove it outside the figures and between their limbs, preserving every glove, outfit color, red tuque, boot and every pose and position. Use a transparent background, not a white or gray background and not painted checkerboard. The result must have a real alpha channel, alpha zero where the background was. Do not redraw anything.
```

Joueur du ring :

```text
Use case: background-extraction. Extract the exact eight boxers from this image as a TRANSPARENT PNG. Keep all eight characters unchanged, including the same poses, clothing, shapes, pixels and all opaque colors. Remove the entire fake gray-white checkered background from outside and all gaps between limbs. Output genuine native alpha transparency (RGBA, alpha zero around characters), not a rendered checkerboard and not a white/black background. This is a sprite asset for a game and MUST composite transparently. No shadows, text, outlines added or missing body parts.
```

Rémi :

```text
Remove the background from this image. Deliver a transparent PNG cutout of all six boxers, keeping their exact existing pixels, poses, scale, spacing and alignment. There must be no checkerboard in the actual image; that is the background to remove. Transparent PNG with actual alpha zero outside the characters and between their limbs. No redraw, no scene, no shadows.
```
