# Ressources du gym — génération intégrée

Créées avec l’outil intégré imagegen, sans clé API ni dépendance pendant une partie.

## Rémi dans la visite

Une nouvelle pose reprend son identité de sparring avec les proportions du personnage d’exploration. Sources : `remi-source-v1.png`, puis `remi-alpha.png`. Ressource finale : `public/assets/sprites/exploration/remi.png`.

```text
Use case: stylized-concept. Create ONE transparent pixel-art NPC sprite for the SNES/Zelda-style gym exploration game.
Reference 1 is Rémi le Tank, the established sparring partner. Preserve his identity: broad strong build, brown swept short hair, thick brown moustache and eyebrows, RED sparring headgear, RED gloves and red boxing boots, TEAL sleeveless singlet and matching teal shorts with CREAM/WHITE trim and waistband. Reference2 is the playable character sprite sheet: MATCH ITS compact RPG proportions, enlarged readable head, pixel cluster size and rendering. Reference2's RED KNIT BEANIE belongs ONLY to the player; Rémi must wear his distinctive red padded boxing helmet from Reference1.
Generate a full-body front/down-facing relaxed standing Rémi, seen slightly from above like a Zelda NPC (35degree overhead angle). Friendly, confident and expressive, gloves resting at waist, feet planted. Approximately3.5 heads tall, a little broader than player, not much taller. Intent is about94pixels tall at native game display, crisp premium pixel art with deliberate clusters, warm highlights and dark teal shadows. No realism or smooth painting. No fighting pose, motion, shadow or additional character.
ACTUAL TRANSPARENT BACKGROUND, PNG with an alpha channel: all areas outside the one character fully empty. No checkerboard texture, no white/gray/black background drawn in. Center figure with clear transparent margin all around. No lettering, grid, UI or watermark.
```

Retouche alpha :

```text
Extract this ONE pixel-art boxer onto a REAL TRANSPARENT BACKGROUND. This input is an RGB file with an unwanted painted gray-white checkerboard. Remove the checkerboard and deliver an actual RGBA PNG cutout, alpha zero outside the character and in holes between the arms and torso and between the boots.
Preserve the exact boxer, his face and moustache, red padded headgear, teal singlet and shorts with cream trim, red gloves, red boots, all pixel edges, pose, size, proportions and position. This is background removal ONLY: do not redraw or alter anything inside the character. No white, gray, black or checkerboard replacement background. No shadows, labels or additions. Transparent empty canvas surrounding the complete unchanged character.
```

## Préparation reproductible

```sh
node scripts/prepare-gym-sprites.mjs --source references/characters/exploration/player-alpha.png
```

Ce script prépare douze poses de marche et la pose de Rémi depuis les sources RGBA. Canvas commun de 96 × 112, pieds en (48, 104), échelle commune aux poses du joueur. Les pixels presque invisibles (alpha ≤ 16) sont écartés, sans découpage par couleur ni dessin ajouté. Les silhouettes ont été inspectées sur fonds clairs et sombres, au format natif et agrandi. La marche reste un cycle simple de poses clés; les profils pourront gagner des poses intermédiaires.


## Références et choix

- Gym de sparring validé : `public/assets/backgrounds/gym.png`, conservé sans changement.
- Photos fournies dans la conversation : forme et porté de la tuque rouge, petit motif noir de boxeur, tenue bleue et blanche, short noir, ceinture claire et posture. Les photos personnelles ne sont pas copiées dans le site public.
- Exploration : tuque rouge courte sans pompon, débardeur bleu et blanc, short noir, chaussures bleues, mains bandées. Le survêtement Adidas noir à bandes blanches est réservé à la future carte extérieure.
- La marche utilise douze poses dessinées : quatre orientations et deux pas par orientation. Les personnages du sparring existant restent ses ressources validées.
- Les deux premières sorties ont un damier peint. La dernière retouche retire ce fond avec un véritable canal alpha. Le script extrait les poses à une seule échelle et aligne les pieds; il ne redessine pas les personnages.

## Prompt initial du personnage

```text
Use case: stylized-concept.
Asset type: production transparent character sprite sheet for a beautiful SNES-style 2D gym exploration game, BoxeurDeux-D.
Input images: the photographs are clothing and body/posture references supplied by the user; the last image, the pixel art Montreal boxing gym, is the approved art/style palette reference. Do not reproduce photographs or other people. Make one consistent original playable boxer inspired by the clothing references.
Primary request: one clean aligned 3-column by 4-row sprite sheet, exactly TWELVE full-body poses of the SAME adult athletic male boxer, for four-direction walking in an overhead slightly tilted Zelda-like 2D game. Camera looks down about 35 degrees, never isometric. 
Identity: a short close-fitting vivid RED knit beanie, no pompom and NO folded cuff, small BLACK boxer silhouette emblem on its front. Keep this red beanie identical in every pose. Light-medium warm skin, short dark side hair, small dark stubble, expressive mature face. BLUE boxing singlet with WHITE shoulder/side panels, BLACK boxing shorts with broad light grey/white waistband and white side stripes, blue boxing shoes with white details, white hand wraps instead of bulky gloves. Natural compact athletic build, recognizable arms, no superhero anatomy.
Layout: row1 faces camera/down; row2 faces RIGHT; row3 faces BACK/up; row4 faces LEFT. In EACH row: column1 neutral standing, column2 walking with left leg forward/right arm counter-swing, column3 walking with right leg forward/left arm counter-swing. Back row MUST show the back of the beanie and singlet, no face. Side rows genuinely face opposite directions. Feet and hands visibly alternate between walking poses. All 12 figures identical size and character proportions, grounded on an identical baseline in each row, centered in twelve equally sized cells with generous clear gaps and no overlap. No contact shadows.
Style: polished deliberate pixel art, sharp pixel clusters, warm shading, dark selective outlines, attractive SNES adventure sprite with readable slightly enlarged head (roughly 3.5 heads tall), intended about 88 pixels tall in the game. Render pixels enlarged cleanly, not painterly smooth or 3D. Carefully shaped hands, knees and shoes. Beanie must remain RED, not blue.
Background: real transparent alpha over the entire sheet, NOT a painted checkerboard. No labels, grid, letters, numbers, border, UI or scenery. Every sprite fully contained, all feet visible. Square sheet, 1024x1024.
```

## Correction des pas

```text
Use case: identity-preserve / background-extraction. Edit this existing 12-pose pixel art character sheet; retain the exact appealing boxer identity, red short beanie with small black boxer emblem, blue and white singlet, black shorts, white waistband, wrapped hands and blue shoes, pixel technique, four rows and three columns, and all facing directions.
Two required corrections:
1. Remove the entire gray-and-white CHECKERBOARD from behind the sprites. It is an unwanted drawn background. Deliver a PNG with TRUE ALPHA TRANSPARENCY in every area outside the twelve characters, including between arms and torso and between legs. NO checkerboard pixels, NO white background, no color matte, no shadow. The background should be empty transparent data.
2. The walking pose in column THREE of each row duplicates column two. Change ONLY the limb gait of column THREE so the OPPOSITE LEG leads and opposite ARM swings forward, maintaining the same orientation: front/down in row1, right-facing row2, rear/up row3, left-facing row4. For front and back rows this must be a visibly alternating foot with a different hand forward. For side views make the near leg lead in one pose and the far leg lead in the other, bent knee and opposite visible wrapped hand swing. Never mirror the side-facing direction. Keep columns one and two unchanged, same head/body size and outfit on all12. Maintain equal foot baselines per row, full-body uncropped. No titles, grid, outlines around cells, or added elements.
```

## Extraction alpha par imagegen

```text
Extract the twelve characters from this sprite sheet onto a REAL TRANSPARENT BACKGROUND. This is solely background removal, not an illustration change.
The gray/white chessboard is painted into this input RGB file and MUST be removed, not reproduced. The result needs actual transparent alpha pixels, a transparent PNG cutout. Retain all twelve sprites, every pixel of their clothes, beanies, skin, black outlines, white wraps and shoes, their current exact positions, size and poses. Do not redraw, label or change them. Delete ONLY the checkerboard between and around characters, including enclosed holes between arms and torso. No chessboard, no gray squares, no white matte, no replacement background. Transparent empty canvas, pixel art sprites only, ready to import into Phaser.
```

## Nouvelle vue du gym

Source conservée dans `references/direction-artistique/exploration/gym-source-v1.png`; ressource finale `public/assets/backgrounds/gym-exploration.png`.

```text
Use case: stylized-concept.
Asset type: a finished background map for an original SNES-inspired 2D boxing gym exploration game, BoxeurDeux-D. Reference image is the APPROVED gym art direction: preserve its warm Montreal afternoon light, brickwork, teal/blue shadows, worn blue canvas, wood, red/white/blue ropes and crafted pixel detail. Create a DIFFERENT VIEW of that same believable neighborhood gym. Do not replace or paint over the original image.
Primary request: one complete small gym room as an overhead slightly tilted Zelda/SNES RPG map. FIXED landscape 16:9 frame, 1280x720 composition. Orthographic parallel projection from above, NO isometric diamonds, NO perspective vanishing points. Back wall across the top, back wall about140px tall; floor visible from y165 to bottom. Room is rectangular and faces the viewer squarely, left/right walls narrow and axes aligned with image. Large clear continuous walkable floor around equipment.
Layout in 1280x720 logical coordinates: a raised EMPTY boxing ring in upper CENTER, outer footprint approximately x435..845 and y200..455. Horizontal/vertical aligned rectangle with slightly visible front apron; worn blue canvas, slim red/white/blue ropes, four padded posts, small stairs at its lower right corner. Keep the ring modest, roughly one THIRD of image width, so a player can freely walk all around it.
Left back corner: broad MIRROR on the wall at x90..330, floor space in front. A hanging heavy punching BAG left of ring around x185,y310, mounted close to back wall, its base near y350. 
Right back corner: clearly recognizable small leather SPEED BALL under a round wooden platform attached to wall at x1060,y240, floor practice spot in front.
Lower LEFT: simple empty exercise mat with a neatly coiled skipping ROPE and handles at its edge around x230,y490. Small bench and sports bag by left wall, not obstructing the central aisle.
Right wall: a few worn lockers and a low bench with gloves and towel around x1140,y500.
Bottom CENTER: a small entry doormat and subtle doorway threshold at x640,y670; DO NOT draw a tall foreground wall. Bottom corners should be quiet floor space because touch buttons will occupy those corners.
Warm sunlight from tall industrial windows along the back wall, hints of Montreal rooftops beyond; warm terra-cotta bricks and navy-teal trim, two ceiling lamps, framed boxing posters as unobtrusive unreadable graphics. Floor of warm worn boards with sections of blue-gray rubber under equipment. Leave the entire broad central/bottom aisle empty (x370..1030,y490..650), and a CLEAR spot for coach Rémi beside the ring at x915,y470. Proportions designed for an approximately90px-tall player sprite.
Style: beautiful cohesive pixel art with deliberate crisp pixel clusters and richly shaded materials, clean silhouettes, premium 16-bit adventure background. No photographic rendering, no smooth gradients, no plastic 3D. No people, no characters, no UI, no labels, no typography, no watermarks. Fill the whole landscape frame with this single room.
```
