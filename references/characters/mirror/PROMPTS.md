# Atelier miroir — ressources originales

Créées le 11 septembre 2026 avec la compétence imagegen et l’outil de génération **intégré** (pas de CLI, pas de clé API). Aucune IA n’est utilisée pendant une partie.

## Fichiers finaux

- `public/assets/backgrounds/mirror-training.png` — 1280 × 720.
- `public/assets/sprites/mirror/player-block.png`.
- `public/assets/sprites/mirror/player-dodge-left.png`.
- `public/assets/sprites/mirror/player-dodge-right.png`.
- `public/assets/sprites/mirror/fighters.json` — mêmes canevas 420 × 360 et ancre (170, 340) que le boxeur droitier du sac.

Les six poses de frappe et de garde existantes du sac sont réutilisées par le jeu. Le reflet synchronisé peut inverser horizontalement l’image entière dans la vitre; ce n’est pas une nouvelle garde de gaucher ni un autre personnage.

## Contrôles visuels et techniques

Les décors gym, exploration et sac, puis les poses de garde, jab, direct et crochet du sac ont été examinés avant la génération. Les quatre finales ont ensuite été ouvertes et inspectées : même identité tuque rouge/emblème noir, tenue bleu/blanc, shorts noirs, bottes bleues; tête et pieds intacts; garde orthodoxe conservée.

La garde haute remonte réellement les deux gants. Les deux esquives sont dessinées indépendamment, genoux fléchis, poids en arrière pour gauche écran et buste vers l’avant pour droite écran; elles ne sont pas obtenues en retournant une pose.

Les trois premières poses comportaient un faux damier opaque. Une retouche intégrée distincte les a converties en véritable RGBA. Les fractions de pixels alpha zéro dans les sources finales sont respectivement 76,46 %, 74,36 % et 75,23 %. Le script `node scripts/prepare-mirror-sprites.mjs` refuse une source sans transparence, puis recadre, réduit au plus proche voisin et aligne les semelles mesurées de la garde du sac. L’outil technique existant retire seulement les résidus d’alpha ≤ 16, pas un fond coloré.

Les semelles restent à y340. Hauteurs de dessin obtenues : garde335, esquive gauche282, esquive droite288; les esquives ne sont pas étirées pour les remonter à hauteur de garde. La vitre finale est exploitable de x688 à1198 et y58 à516. Proposition de reflet : ancre x960, pieds500, hauteur de garde300.

## Prompts conservés

### Décor — génération

Références : public/assets/backgrounds/bag-training.png et gym-exploration.png. Sortie conservée : background-source.png.

```text
Use case: stylized-concept. Create one original raster background for the shadow-boxing mirror activity of the 16-bit pixel art game BoxeurDeux-D. Reference images show the EXACT approved gym visual identity: aged warm Montréal brick walls, navy steel beams, old wooden floor, golden late afternoon, sophisticated hand-pixelled SNES texture and clear perspective. Preserve that style, not a new modern gym.
Output composition: exactly 1280 x 720 wide 16:9, no UI or text, NO people and NO reflected people. The left half is clear training space with a blue worn floor mat, intended boxer feet at x440,y635. Right half has one very large clean dark-wood-framed rectangular gym mirror. Mirror glass rectangle approximately x710,y80 to x1210,y585, near frontal (only very mild oblique perspective). Mirror must be tall and wide enough for a full-body reflection that will later be drawn by game code at x945 with feet y560 and head y270. Inside the mirror: subdued softly cool reflected gym, faint reflected brick and a distant warm window, floor continuing in reflection below y450; no objects occluding the central glass from x750 to1180 y200 to570. Outside mirror left half: brick wall with one window, old radiator under it, a small bench with folded towel only at far left. Clear foreground floor area. The mirror must unambiguously read as a mirror rather than another window, with subtle diagonal silver glass glints near its edges ONLY. One wall hanging lamp left. No bag, no ring ropes, no characters. Rich but restrained original 16-bit game background detail matching references; pixel-scale coherent, fixed camera.
```

### Décor — agrandissement du miroir

Cible : background-source.png. Sortie retenue : background-final-source.png. Une conversion technique nearest-neighbour via un canvas Chromium produit public/assets/backgrounds/mirror-training.png en 1280 × 720. Aucun élément du dessin n’a été ajouté par code.

```text
Use case: precise-object-edit. Edit this pixel-art gym background. Keep the existing image style, palette, left window, lamp, radiator, bench and training mat completely unchanged. Change ONLY the huge wooden-framed mirror on the right: make it a FULL-LENGTH gym mirror by extending its glass and frame vertically DOWNWARD to near the foreground floor, so its bottom is at 83 percent of total image height rather than 55 percent. Keep mirror's top and left/right edges fixed. Extend the reflection naturally with more reflected blue mat and floor, leaving the central glass unobstructed for a future full body animated reflection. No people or characters. Final mirror glass should span normalized coordinates x685..1200 y58..580 of a 1280x720 canvas. The reflected torso and head area should stay quiet and unobscured. Full image remains 16:9.
```

### Garde haute

Référence : public/assets/sprites/bag-orthodox/player-guard.png. Première sortie : player-block-source.png.

```text
Use case: identity-preserve. Edit the supplied original boxer sprite into ONE new FULL HIGH GUARD blocking pose for the same game's mirror practice. Transparent background with actual native RGBA alpha, no painted checkerboard, no shadows or text. The entire full body and both boots must be visible. Keep exact character identity: red knit tuque with small black boxer emblem, tan athletic man short brown hair, blue boxing singlet white piping and white waistband, black shorts white side stripes, blue boots white laces and stripes, blue padded gloves white wrist wraps. Same high quality 16-bit sprite style and line weight, same body proportions, same three-quarter FRONT-left camera, facing SCREEN RIGHT. Exactly same ORTHODOX stance as reference: anatomical LEFT boot leads at screen-right, anatomical RIGHT boot is rear at screen-left. Lock both feet and legs in place as close as possible to the reference.
ONLY change defense pose: chin slightly tucked, BOTH blue gloves raised close together just above eyebrow/cheek level, forearms upright shielding sides of face, elbows tucked over ribs. Eyes partially visible between gloves, red tuque still recognizable. A clear actual boxing high guard, not crossed wrists, not a punch. Head and torso stay at same height as the reference, two distinct hands anatomically attached to correct forearms. Keep transparent padding all around. One pose only.
```

### Esquive vers la droite écran

Référence : public/assets/sprites/bag-orthodox/player-guard.png. La sortie penchait effectivement vers la droite écran malgré la demande gauche initiale. Après inspection, elle a été conservée comme esquive droite (player-forward-slip-source.png), puis une vraie pose opposée a été demandée. Ce choix porte sur deux esquives et ne change ni l’anatomie ni la garde droitière.

```text
Use case: identity-preserve. Create ONE new LEFT SLIP / LEFT DODGE full-body animation pose from the exact supplied boxer guard sprite. PNG with genuine transparent alpha background, no background and no shadow. Same original athletic tan man, red knit tuque with small black boxer emblem, blue singlet white piping/waistband, black shorts white side stripes, blue padded boxing gloves white wrist tape, blue boots. Same 16-bit rendered pixel sprite visual style. Keep orthodox stance: anatomical LEFT foot forward at SCREEN RIGHT, anatomical RIGHT foot at SCREEN LEFT, feet remain planted, both boots entire and visible. Same 3/4 front-left camera looking at chest, boxer facing RIGHT.
ONLY change body pose to clear LEFT defensive slip: bend the knees and rotate/tilt upper body down and toward SCREEN LEFT (away from imaginary opponent to screen right). Head moves left by about half a head width and down by half head height relative to supplied guard. Spine stays athletic and supported by bent knees, no broken waist. Both fists up guarding the cheekbones, elbows tucked; eyes look right at imaginary mirror. Torso shorter from slight crouch; do not shrink the character's head/limbs. Distinct from neutral guard and from leaning forward. Preserve exactly the identity, style and stance; no punching, no helmet, no opponent, no text. One pose only with transparent padding. Output RGBA transparency, NOT painted checkerboard.
```

### Esquive vers la gauche écran

Références : player-guard.png et player-forward-slip-source.png. Sortie : player-backward-slip-source.png.

```text
Use case: identity-preserve. Create ONE defensive BACKWARD LEFT SLIP full body sprite pose of the exact original boxer supplied. Preserve same style, character identity and outfit and same camera as Image 1 original guard. Image 2 shows an already made forward crouch; we need the OPPOSITE lean from Image 2, NOT a duplicate.
Keep ORIGINAL ORTHODOX FEET: anatomical left boot FRONT on screen RIGHT, anatomical right boot REAR on screen LEFT. BOTH boots stay exactly planted in same two floor positions. Face always looking screen RIGHT, NO horizontal mirroring. Red tuque black small boxer emblem, blue singlet white trim, black white-striped shorts, blue gloves white cuffs and blue boots intact.
Pose: transfer weight onto bent REAR LEG at screen LEFT. Torso leans BACK toward SCREEN LEFT, away from the imaginary opponent at screen right. Head center shifts LEFT of the waist center, over the REAR boot, and down slightly, visibly angled left as a rear slip. Red hat upper center around x120/420 compared with the original x170/420; waist center around170/420; right-frontboot around250/420 and rear-leftboot around80/420 stay in place. Both gloves high beside cheekbones, eyes still look right. Head is NOT forward past the knees. Athletic boxing evade with supporting knees, not falling, no punch. One complete full body character, no duplicates, shadows or text. GENUINE RGBA transparent alpha background, not painted checkers, keep padding.
```

### Extraction transparente — une demande distincte par pose

Demandé séparément pour player-block-source.png, player-forward-slip-source.png et player-backward-slip-source.png. Sorties finales natives RGBA : player-block-alpha.png, player-dodge-right-alpha.png, player-dodge-left-alpha.png. Pas de segmentation, détourage ou peinture par code.

```text
Use case: background-extraction. Extract the exact boxer from this image as a TRANSPARENT PNG. Keep the whole character unchanged, including the same pose, clothing, shape, pixels and all opaque colors. Remove the entire fake gray-white checkered background from outside and all gaps between limbs. Output genuine native alpha transparency (RGBA, alpha zero around character), not a rendered checkerboard and not a white/black background. This is a sprite asset for a game and MUST composite transparently. No shadows, text, outlines added or missing body parts.
```

