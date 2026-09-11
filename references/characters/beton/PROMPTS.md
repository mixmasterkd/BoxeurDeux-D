# Béton — sources des sprites

Ressources originales produites avec la génération d’images intégrée à Codex (`image_gen__imagegen`), sans CLI ni clé API. Les images finales RGBA sont les trois fichiers `*-alpha.png` de ce dossier. Les variantes opaques et les tentatives intermédiaires restent hors du dépôt. Les références de style sont le gym validé et les gardes de sparring existantes ; aucune photographie privée n’a été utilisée.

Identité : boxeur adulte noir, peau brun foncé, cheveux courts crépus, barbe courte, casque et débardeur graphite, short ocre, gants ocre, bottines sombres, bordures crème. Le jab utilise son bras gauche ; le direct au corps son bras droit. Chaque planche contient une garde debout de calibration afin de conserver l’échelle physique des poses fléchies.

La préparation `node scripts/prepare-beton-sprites.mjs` extrait les cellules, recale les pieds et mesure les repères. Elle ne dessine ni ne recolore les personnages. Comme pour les autres atlas du projet, elle écarte uniquement les résidus de masque d’alpha ≤ 16. Les 14 poses finales et leurs points de contact sont vérifiés dans `tests/beton-render.test.js`.

Prompts exacts, dans l’ordre des étapes. Les demandes de transparence combinées à d’autres retouches ont parfois rendu du RGB ; seules les sorties réellement RGBA ont été retenues.

## beton_prompt_1

Use case: stylized-concept.
Asset type: production sprite sheet for an original detailed 16-bit boxing game.
References: Image 1 gym is ONLY pixel-art lighting/finish style; Image 2 front-facing teal boxer is ONLY framing, pixel density and full-body scale reference; Image 3 blue boxer is ONLY compatible finish. Create a NEW unrelated original opponent, NOT a recolor of the teal boxer.
Subject in every pose: BÉTON, adult Black male boxer, deep dark brown skin with warm amber highlights, short tightly coiled black hair, neatly trimmed short black beard, focused calm intelligent eyes, broad athletic shoulders and muscular lean legs. Graphite open-face padded boxing headguard (hair visible on crown), anthracite tank top with cream trim, warm ochre/russet-orange shorts with cream waistband and hem stripes, mustard ochre boxing gloves with cream cuffs, dark charcoal midcalf boxing boots with cream laces. No letters, logos, jewelry or extra props.
Create FIVE separate complete FULL-BODY figures in ONE horizontal row, all at precisely the same physical scale and floor baseline, ample transparent gaps between figures, no overlap or crop. Front view toward camera as opponent in Super Punch-Out, orthodox stance: anatomical left fist appears on VIEWER RIGHT. Camera and proportions constant. Original premium SNES-inspired hand-detailed pixel art, crisp pixel clusters, thoughtful warm shading, expressive face, credible anatomy and fabric; no vector look, no blurry painterly edges. Height of upright figure about 580 px in a wide sheet.
Pose order LEFT TO RIGHT:
1. Balanced relaxed boxing guard, both ochre fists by cheeks, knees softly flexed, shoulders broad, face visible. This is identity and scale master.
2. High protective block: both gloves together in front of brow/cheeks, elbows tucked to ribs, chin down, face partially behind gloves. Different clear silhouette.
3. Left jab anticipation: anatomical LEFT fist on viewer RIGHT drawn slightly back near cheek, left shoulder rolled up, small weight load; opposite fist protecting face.
4. Left jab intermediate extension: anatomical LEFT fist moves toward camera on viewer RIGHT, elbow half extended, opposite fist stays protecting face, shoulder follows.
5. Left jab full contact straight toward camera: anatomical LEFT arm on viewer RIGHT extended forward with convincing foreshortening; visibly enlarged ochre glove at face height on viewer RIGHT, opposite fist still near cheek. Do NOT switch hands. Same legs and torso scale throughout.
Background: GENUINELY TRANSPARENT RGBA alpha=0, including between legs and arms; no white/gray/checkerboard pixels baked into background, no ground shadows or floor, no labels. Complete boots and helmet with generous empty margin. Output just the five original sprites.

## beton_prompt_alpha1

Use case: background-extraction. Edit this exact sprite sheet, preserve all five complete boxer figures exactly as shown, their faces, skin, colors, garments, poses, pixel detail, positions and scale. Remove ONLY the white-gray checkerboard background, including every background gap between arms and legs. Deliver a TRUE 8-bit RGBA PNG with the empty background alpha=0; actual transparent pixels, NOT an illustration of transparency and NOT RGB. Preserve fully opaque colored boxer interiors including white cream uniform edges and laces. No floor or shadow, no added texture, no new checkerboard. The requested result is the identical five original boxer sprite cutouts with genuine alpha transparency.

## beton_prompt_2

Use case: stylized-concept. Asset type: production boxing sprite sheet, continuation of the supplied ORIGINAL Béton identity sheet.
Input image is the exact identity, equipment, palette, pixel-detail and physical scale reference. Create SIX new separated complete FULL-BODY figures of this SAME character in ONE wide horizontal row, same physical scale and same floor baseline, generous empty transparent gaps. Keep his distinctive calm Black face, deep brown skin, short coiled hair, short neat beard, graphite headguard, anthracite tank cream trim, russet ochre shorts cream borders, mustard ochre gloves cream cuffs, charcoal boots cream laces. Premium polished SNES-style pixel clusters and warm shading exactly like reference. Orthodox stance, anatomical RIGHT hand is on VIEWER LEFT. No letters, symbols, props, labels or shadows.
LEFT TO RIGHT poses:
1. Exact relaxed front boxing guard as original first figure; this is a standing physical-scale calibration, full helmet to boots.
2. RIGHT STRAIGHT TO BODY preparation: bend both knees distinctly to lower shoulders, load right shoulder back (VIEWER LEFT), right ochre glove near lower cheek, left glove guards face. Torso twist and weight load readable, not standing translated down.
3. Right straight body intermediate extension: knees still flexed, rotate hips/shoulder forward, RIGHT glove on VIEWER LEFT halfway extended DOWNWARD TOWARD CAMERA at opponent abdomen height; opposite left glove stays by cheek.
4. Right straight body FULL CONTACT: RIGHT arm on VIEWER LEFT visibly extending diagonally DOWN and forward toward camera, large foreshortened ochre glove in front of his LOWER torso/waist at abdomen height, legs deeply flexed, right shoulder rotates across; opposite glove guards face. Punch must clearly be much LOWER than the head jab in reference. Do not switch hands or use an uppercut.
5. Reaction to receiving a body punch: grimace, bend forward at hips with shoulders curled and knees giving, gloves drawn in against abdomen; head remains recognizably same face and headguard. Believable boxer absorbing a solar-plexus strike, never vomiting or injury effects.
6. Low abdominal block: both forearms vertical with elbows touching lower ribs, ochre gloves close together over abdomen just above waistband, chin tucked, weight balanced. Same complete body; clearly different from high head block.
Background: ACTUAL RGBA ALPHA TRANSPARENCY, empty pixels alpha=0 including between limbs. No checkerboard illustration, no white/gray matte. Complete helmet and boots, no cropped edges. Same identity and same limb lengths throughout; lower poses occupy less vertical space naturally, NEVER scale them up.

## beton_prompt_alpha2

Use case: background-extraction. Preserve these exact SIX complete boxer figures, their identity, faces, skin colors, graphite and ochre uniform, all anatomy, poses, pixels, sizes and positions. Remove ONLY the gray-white checkerboard backdrop, including gaps between arms and legs. Return genuine 8-bit RGBA PNG with alpha=0 everywhere outside the boxer silhouettes. No checkerboard pixels, no gray or white matte, no floor or shadow. Preserve opaque cream laces and clothing borders. Do not redraw, recolor, rescale or crop any boxer. Actual transparent background is essential for game use.

## beton_prompt_alpha2_retry

Remove the background of this image and make it transparent. This is background removal for six boxer sprite cutouts. The existing gray-and-white checkerboard is unwanted actual image content: erase it to zero alpha, including gaps between limbs. Preserve the six boxer subjects. Output a transparent RGBA PNG cutout, not an image showing a checkerboard.

## beton_prompt_3

Use case: stylized-concept. Production sprite sheet for the SAME original Béton boxer in supplied reference; identity, clothing, camera, scale and detailed pixel style must remain fixed.
Create FIVE separated complete FULL-BODY poses in ONE horizontal row, same floor baseline and exact same physical body/limb scale. The first reference sheet supplies character identity: adult Black boxer with dark brown skin, close black curls, neat short black beard, graphite open-face headguard, graphite tank with cream trim, russet ochre shorts cream trim, mustard gloves cream cuffs, charcoal midcalf boots cream laces. Warm detailed 16-bit pixel clusters, credible anatomy. Facing camera, lightly orthodox 3/4 frontal stance permitted when seated. No text or symbols.
LEFT TO RIGHT:
1. Repeat his original standing relaxed boxing guard, full helmet to boots, arms by cheeks. This is the STANDING PHYSICAL SCALE REFERENCE.
2. Reaction to a head jab: head and shoulders recoiling slightly back and to his left, eyes squeezed briefly, mouth slightly open exhaling, gloves loosen slightly but remain near chest, knees giving. No blood or injury markings.
3. FALLING TO ONE KNEE after boxing knockdown: his RIGHT knee touches the floor, other foot planted ahead, torso tips forward at hips, one glove descending to brace, head down but face recognizable. Whole body lowered by realistic joint bending; retain full-size head and limbs.
4. DOWN ON THE CANVAS: seated on his backside with knees bent and legs spread moderately ahead, both complete boots visible, one ochre glove planted beside hip for support, other resting on thigh, torso upright enough to see dazed calm face looking forward. Must be considerably shorter on canvas than standing, same head/body scale. Not a rotated upright boxer.
5. RISING: pushing himself up from one knee, right glove planted on floor, left forearm supporting on forward raised knee, hips and shoulders rising, concentrated face looking slightly up. Clearly distinct from falling and seated. Same scale, both boots complete, no crop.
Give the seated figure enough horizontal space for complete feet and limbs, no adjacent figure overlap. KEEP ALL GROUNDED BOOTS/GLOVES ON THE SAME FLOOR BASELINE and keep the body proportion scale identical; the seated figure should be roughly HALF the standing figure's height, rise roughly three-quarters. Do not enlarge crouched figures to fill the cell.
Background genuinely TRANSPARENT RGBA alpha=0, all empty gaps transparent, no white-gray checkerboard rendered, no background, no ground shadow, no text.

## beton_prompt_alpha3

Use case: background-extraction. Edit this exact sprite sheet. Remove ONLY the white-gray checkerboard background, including every background gap between arms and legs. Deliver a TRUE 8-bit RGBA PNG with empty background alpha=0; actual transparent pixels, NOT an illustration of transparency and NOT RGB. Preserve all five complete boxer figures, faces, skin, colors, clothing, poses, pixel detail, positions and physical scale. Preserve fully opaque boxer interiors including cream trim and laces. Extend the transparent canvas slightly to the right if necessary so the fifth figure's rightmost elbow has a complete outline and transparent margin; this is the only permitted edge repair, do not cut that elbow. No floor or shadow, no new checkerboard. Return actual transparent PNG cutouts ready for a game.

## beton_prompt_alpha3_retry

Remove the background of this image and make it transparent. This is background removal for five boxer sprite cutouts. The existing gray-and-white checkerboard is unwanted actual image content: erase it to zero alpha, including gaps between limbs. Preserve the five boxer subjects. Add a small transparent margin at the far right and complete the rightmost elbow outline so that no body touches the image border. Output a transparent RGBA PNG cutout, not an image showing a checkerboard.

## beton_prompt_alpha3_final

Remove the background of this image and make it transparent. This is background removal for five boxer sprite cutouts. The existing gray-and-white checkerboard is unwanted actual image content: erase it to zero alpha, including gaps between limbs. Preserve the five boxer subjects exactly. Output a transparent RGBA PNG cutout, not an image showing a checkerboard.

