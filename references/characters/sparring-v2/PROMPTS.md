# Prompts de la phase tenues et animation — 10 septembre 2026

Outil utilisé : imagegen intégré à Codex, pour les tenues, nouvelles poses et transparence. Aucune API supplémentaire, aucun appel réseau pendant le jeu. Le décor et les sources des personnages ont été inspectés avant génération.

Les planches RGB de génération sont des sources, pas des animations directement utilisables. Les versions RGBA ont été vérifiées et découpées ensuite; une première tentative d’alpha du joueur n’avait pas de transparence et a été remplacée. Certaines poses coupées au bord des sources ont été écartées au profit de poses complètes et de variantes en miroir.

## remi-outfit

Use case: identity-preserve. Edit target: the attached existing SIX-POSE boxer sprite sheet. These are production animation frames for BoxeurDeux-D. Change ONLY the sparring outfit of the same adult stocky mustached French-Canadian boxer Rémi. Keep his face identity, warm skin, muscles, poses, limb positions, boots, glove positions and sizes, transparent cell separation, three columns and two rows, SAME CANVAS SIZE AND POSITIONS. Add a fitted dark petrol-teal boxing training singlet with cream piping around neckline/armholes, subtle fabric folds; keep teal shorts cream waistband and brick-red gloves and burgundy boots. Add matching padded dark brick-red open-face sparring headgear with cheek and ear padding; his eyes nose and distinctive mustache stay fully visible and expressive. Consistent gear in all SIX poses including block, hit and dodge. Keep warm detailed crisp 16-bit pixel-art palette with dark outlines and controlled tiny highlights, no vector/cartoon flattening, no logos, no words, no extra objects. Preserve full silhouettes and feet, exact original scale and pose geometry. Genuinely transparent RGBA alpha background outside all sprites and between arms/legs, NOT a painted checkerboard or solid backdrop. Remove invisible matte residues without changing character. No new frames or anatomy. The result will be sliced for a game.

## player-outfit

Use case: identity-preserve. Edit target: existing six-pose BACK VIEW player boxer sprite sheet. Give ALL SIX poses the SAME sparring uniform while preserving original identity, warm medium brown skin, navy shorts gold waistband and gold sides, ivory gloves with amber cuffs, navy boxing boots. Add a fitted navy blue training singlet with gold piping around neck and armholes and natural shaded fabric folds, covering his back. Add padded navy sparring headgear with a narrow gold brow stripe and ear padding, seen strictly from the back, with a small black curly hair patch still visible on crown. All poses must remain rear view without any face. Keep original stance, size, anatomy, glove positions and feet; fists high above head for top-middle jab and top-right cross stay high. Detailed warm 16-bit pixel art as source, NOT smooth vector flat illustration. EXACT SIX separated full-body poses: three columns by two rows, top guard/jab/cross, bottom block/hit/dodge. Keep all feet and extended gloves inside canvas with generous margins, no clipping. True RGBA transparency outside figures and holes, no checkerboard pattern, no white or gray background, no shadows, no text. Only clothing and headgear change; identity, palette and action pose remain.

## remi-alpha

Use case: background-extraction. Edit target: the supplied six-frame Rémi sparring sprite sheet. Remove the entire gray/white checkerboard backdrop and deliver a genuinely TRANSPARENT RGBA PNG alpha zero outside the SIX boxers and between limbs. This is a cutout/production sprite task, preserve painted sprites' pixel detail, outfit, face, gloves and poses. Also UNCROP the small cut-off right edge of the right-column boxer glove/elbow and right boots: expand canvas slightly on RIGHT and BOTTOM enough to finish those outlines naturally and leave transparent breathing room all around; do not zoom in. Keep three columns and two rows, six sprites separated. No checkerboard, no solid background, no cast shadow or text. Same detailed pixel-art style; no redesign.

## player-alpha

Use case: background-extraction. Edit target: supplied six-pose boxer sheet. Remove the entire checkerboard backdrop and output a genuinely TRANSPARENT RGBA PNG, alpha zero outside the six boxers, between arms and torso and between legs. Preserve the sprites exactly, positions, scale, outfits, poses, identity, colors and pixel detail. The checkerboard is unwanted background. No new checkerboard, no solid color, no floor shadow, no text or redesign.

## remi-transitions

Use case: stylized-concept. Reference image defines the ONE boxer identity and his new sparring outfit. Create a NEW game animation sprite sheet for THIS SAME mustached bulky adult boxer, FRONT VIEW, dark teal training singlet/shorts cream trim, brick-red padded open-face boxing headgear, red gloves and burgundy boots. Match detailed warm 16-bit pixel art, face and outfit perfectly. NEW LAYOUT wide landscape canvas 1536x1024, exactly 3 columns and 2 rows, SIX full-body figures separated by generous empty gutters. Every sprite has WHOLE boots and glove visible with margin on every side; keep figures small enough within cells, NO CROPPING at right/bottom/top edges, especially right column. Shared anatomy/feet stance/hip and head height. Background true transparent RGBA alpha, no checkerboard, no text.
POSES in reading order:
1 upper left: WINDUP for a punch on LEFT of screen, left-screen red glove drawn back next to shoulder, shoulder cocked, BOTH gloves still near face, weight on back foot.
2 upper middle: WINDUP for punch on RIGHT of screen, mirror-side shoulder cocked back, fists near face.
3 upper right: LEFT-screen HALF-EXTENSION, glove halfway from cheek toward camera, forearm extended only halfway, elbow still bent, same head and feet height.
4 lower left: RIGHT-screen HALF-EXTENSION, same intermediate arm bend toward camera.
5 lower middle: FULL EXTENSION LEFT-screen punch, foreshortened big red glove at face height to LEFT of head, other glove guards cheek, WHOLE BODY AND BOOTS fully inside cell.
6 lower right: DODGE leaning to RIGHT screen, bends knees and leans torso/head clearly right with hands protecting head, same scale full boots.
No extra limbs, no face alteration, no logos. Practical individually crop-able frames, not a poster.

## remi-transitions-alpha

Use case: background-extraction. Remove all painted checkerboard from the supplied six-pose sprite sheet. Preserve all SIX characters exactly as painted and positioned. Output genuinely transparent RGBA PNG, alpha zero outside sprites and between limbs. No checkerboard, no white background, no redesign, no text. Keep original pixel detail and full canvas size.

## player-transitions

Use case: stylized-concept. Reference image defines SAME ONE male back-view athlete in NAVY and GOLD sparring uniform, navy padded headguard with gold trim and curly hair on top, navy singlet gold armhole trim, navy/gold shorts, ivory gloves amber cuffs, navy boots. Keep outfit/identity and detailed warm 16-bit pixel art. Create SIX additional animation frames in a NEW WIDE landscape layout, canvas1536x1024, three equal columns and two rows. FULL FIGURES with WHOLE BOOTS and hands inside each cell, generous transparent margin all around each character, especially right and bottom cells; reduce figure size to fit. True transparent RGBA background, no checkerboard, no labels.
All six figures BACK VIEW, SAME BODY proportions and anatomical height, waist and feet baseline shared. Existing top-row jab/cross aim forward and UP toward taller opponent.
READING ORDER:
top-left LEFT JAB WINDUP: left shoulder pulled slightly back, left elbow bent and glove beside left temple ready to strike, opposite glove protects head.
top-middle RIGHT CROSS WINDUP: right shoulder pulled back, right glove at temple and elbow bent ready to strike, left glove guards.
top-right LEFT HALF-EXTENSION: left glove moved halfway up toward target above head, just ABOVE crown near centerline, elbow still visibly bent, shoulder rotates toward target. NOT fully straight overhead, glove half-way between cheek and full raised punch.
bottom-left RIGHT HALF-EXTENSION: right glove just above crown near centerline, elbow still visibly bent, opposite hand at cheek.
bottom-middle FULL RIGHT CROSS: right arm extended fully forward/up in perspective, ivory glove at least ONE FULL HEAD HEIGHT above his crown toward CENTER; same original full cross pose but with full boots and margins. Only punching hand raises figure's height; torso does not grow/shrink.
bottom-right DODGE LEFT: athletic knee bend, torso/head leaning LEFT screen by one head width, both gloves up, full feet present.
No face/front view, no extra limbs, no shadows, no logos. Each sprite same person, practical game keyframes.

## player-transitions-alpha

Use case: background-extraction. Remove the checkerboard backdrop from this six-pose back-view boxer sheet. Deliver a transparent RGBA PNG with alpha zero outside all six figures and in all holes between limbs. Preserve every sprite exactly: identity, navy/gold outfit, gloves, pixel colors, pose, full boots, position and scale. No painted backdrop, no replacement background, no text, no redesign. Keep original1536x1024 layout.

## player-transitions-alpha-retry

Make the background transparent. Remove the gray checkerboard completely from this six-sprite sheet, keeping only the six boxers and preserving every figure unchanged. The exported PNG must have a real alpha transparency channel, not a picture of a checkerboard.
