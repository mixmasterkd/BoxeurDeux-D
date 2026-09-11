# Boxeur orthodoxe au sac — correction anatomique

Ressources créées avec l’outil imagegen intégré. Aucun appel IA n’est nécessaire pendant une partie. Ce nouveau set corrige la garde gauchère et l’inversion anatomique des frappes signalées par l’utilisateur. Il s’agit de nouvelles poses dessinées, sans miroir, échange d’étiquettes ou compensation anatomique par code. Les anciennes ressources, le décor et le sac sont conservés inchangés.

## Vérification des poses

La caméra montre désormais la poitrine et le côté avant-gauche, avec le boxeur orienté vers le sac à droite. Le pied gauche mène à droite de l’image, le pied droit reste derrière à gauche. Ce changement de point de vue rend la garde vérifiable.

- Garde : gant droit à la joue, gant gauche en avant près du menton; pied gauche devant.
- Jab : extension du bras gauche de la même épaule qui mène en garde; gant droit maintenu à la joue.
- Direct : bras droit opposé en extension, hanche et épaule droites pivotées; talon du pied droit arrière levé, pied gauche avant conservé. Une retouche rend le gant gauche de protection visible près de la joue derrière le bras tendu.
- Crochet : même bras gauche que le jab, coude plié, poing plus avancé que le coude vers le sac, gant droit à la joue.

Les PNG extraits ont été inspectés visuellement pour l’anatomie, la lisibilité et la transparence. Le contrôle intégré du contact dans Phaser relève de l’intégration de la scène; ce fichier ne prétend pas qu’un essai navigateur ou téléphone physique a été réalisé pour ce set.

## Fichiers et extraction

- `guard-reference.png` : garde initiale validant la nouvelle vue et le pied gauche avant.
- `player-source-v1.png` : première planche de six poses, RGBA.
- `player-source-v2.png` : retouche du gant de protection du direct; cette sortie RGB exige une nouvelle extraction du fond.
- `player-alpha.png` : source finale RGBA, 1536 × 1024; 68,55 % des pixels ont alpha zéro.
- `public/assets/sprites/bag-orthodox/player-*.png` : six poses finales, canvas commun 420 × 360 et ancre (170, 340).
- `public/assets/sprites/bag-orthodox/fighters.json` : coordonnées, anatomie des coups et copie à l’identique des métadonnées du sac existant.

Commande reproductible : `node scripts/prepare-bag-orthodox-sprites.mjs`.

Une échelle commune de 0,7056367432 est appliquée à toute la planche. La garde mesure 338 pixels de haut, avec une petite marge permettant la hauteur naturelle du direct. L’extracteur conserve les couleurs et l’alpha générés; seuls les résidus quasi invisibles d’alpha ≤ 16 sont ignorés, comme pour les ressources précédentes. Aucun découpage par couleur, dessin de membre ou effet miroir n’est appliqué. Le sac est réutilisé depuis `public/assets/sprites/bag/heavy-bag.png`.

Les six images restent des poses clés : la correction porte sur la garde et les vrais bras/pieds. Des intermédiaires supplémentaires pourront enrichir la fluidité.

## Garde orthodoxe de référence

```text
Use case: identity-preserve.
Asset type: one production pixel-art boxer sprite for BoxeurDeux-D, an anatomy-correct ORTHODOX boxing guard.
Reference image: preserve the established adult athletic man, short fitted red knit beanie with small black standing-boxer silhouette emblem, dark stubble, royal blue singlet with white edging, black boxing shorts with wide pale waistband and white side stripes, blue boots with white soles. Add blue boxing gloves with white cuffs.
Create ONE full-body neutral guarded boxer, facing and looking RIGHT toward an imaginary heavy bag. No bag in the output.
CRITICAL ANATOMY: this boxer is RIGHT-HANDED, orthodox stance. His OWN LEFT foot is the LEAD foot toward the right of the image. His OWN RIGHT foot is BEHIND toward the left of the image. The LEFT shoulder and LEFT glove lead, the RIGHT shoulder is back and RIGHT glove protects the right cheek. BOTH blue gloves visible near the chin, elbows tucked, knees flexed, chin down.
CAMERA is THREE-QUARTERS FRONT-LEFT of the boxer, not behind him: the viewer sees the FRONT neckline/chest of the blue singlet and the LEFT side of his body. His LEFT upper arm and LEFT leg are the NEAR limbs, foreground and toward the bag at image RIGHT. His RIGHT leg is the FAR rear leg at image LEFT. This front-left viewpoint must make which foot/arm leads unambiguous. His face shows a three-quarters frontal view looking right. Do not show his racerback/back.
Foot arrangement: nearer LEFT knee at screen-right and left boot planted ahead, farther RIGHT boot at screen-left/rear, shoulder-width gap. Real adult boxing proportions around 6 heads tall, athletic lean build, full body uncropped, exactly 2 arms and 2 legs.
Polished original 16-bit game pixel art, deliberate visible pixel clusters and selective dark outlines, no vector smoothness or plastic 3D. Warm upper-left light, colors consistent with reference.
Transparent background. No floor, shadow, writing, letters, numbered labels, grid, mirrored copy or additional pose.
```

## Six poses sur la garde validée

```text
Use case: identity-preserve.
Asset type: production 6-frame ORTHODOX boxing animation sprite sheet for BoxeurDeux-D.
Reference: the single supplied guard is the EXACT character, correct stance and camera to preserve. Make six poses of this same adult boxer; identical head, red knit beanie with black boxer emblem, blue/white FRONT singlet neckline, black shorts with pale waistband, blue gloves/boots, proportions and pixel art.
CRITICAL: He stays RIGHT-HANDED/ORTHODOX, facing image RIGHT. His anatomical LEFT foot is the foot ahead at image RIGHT, anatomical RIGHT foot remains rear at image LEFT. His anatomical LEFT arm is attached to shoulder on image RIGHT, toward the bag, and is the lead jab/hook arm. His anatomical RIGHT arm begins at image LEFT/back, its glove protects his cheek except during the RIGHT cross. Preserve this exact front-left chest-visible viewpoint, not a rear view. Do NOT mirror or switch stance between frames.
Exactly SIX full-body sprites, even 3 columns × 2 rows, generous transparent gutters, equal scale, identical floor baseline inside each cell, all feet visible.
Reading order:
1 TOP LEFT = guard: match reference closely, both gloves up, right glove at cheek, left glove just ahead of chin, left foot ahead.
2 TOP MIDDLE = jab/cross preparation: guard slightly compact, both gloves near chin, subtle knee bend; same feet and stance.
3 TOP RIGHT = LEFT JAB impact: extend the anatomical LEFT leading arm (the arm on image RIGHT of reference) straight to the RIGHT at shoulder/chin height. Its blue glove is the rightmost point. The anatomical RIGHT hand (from image LEFT of reference) stays tucked at cheek, visibly bent forearm guarding face. Keep LEFT foot planted ahead at image RIGHT and RIGHT foot behind image LEFT. Minimal hip rotation for a jab.
4 BOTTOM LEFT = RIGHT CROSS impact: extend the OTHER arm, anatomical RIGHT rear arm (from image LEFT/back of reference), straight RIGHT at same shoulder height; rotate right hip/right shoulder forward toward target, visibly raise and pivot RIGHT rear heel at image LEFT. Anatomical LEFT glove remains raised at left cheek, NOT extended. LEFT front boot stays planted at image RIGHT. Must clearly be the opposite punching arm from frame3.
5 BOTTOM MIDDLE = LEFT HOOK preparation: LEFT elbow bends outward at shoulder height as left shoulder loads back slightly; RIGHT blue glove stays at cheek. Same orthodox feet.
6 BOTTOM RIGHT = LEFT HOOK impact: LEFT lead arm (same arm as frame3) swings toward image RIGHT, elbow bent 90–110 degrees, blue glove contacting target at rightmost point at shoulder height. RIGHT glove stays at cheek. Rotate hips into punch with LEFT lead foot pivoting but still ahead at image RIGHT, RIGHT foot remains behind. True left hook, not an uppercut, not elbow strike, not right hook. At impact the glove is farther right than the bent elbow.
All frames full body facing RIGHT, unambiguous front of shirt/chest visible where anatomically appropriate. Athletic grown man, about 6 heads tall, exactly two gloves/arms and two legs. Polished crisp 16-bit pixel clusters and selective outlines matching reference. No anti-aliased vector drawing, no smear trails or impact effects.
Transparent background. No scenery, no bag, no shadows, no grids, no text or pose labels.
```

## Gant gauche de protection pendant le direct

```text
Use case: precise-object-edit.
Edit ONLY the BOTTOM-LEFT right-cross sprite in this six-pose ORTHODOX boxer sheet. Leave all other five poses exactly unchanged, including their correct LEFT-foot-forward stance, camera, size and positions.
In the bottom-left pose, KEEP the extended RIGHT rear arm, pivoted RIGHT rear foot at image left, planted LEFT front boot at image right, and torso rotation exactly as drawn. Do not change which arm is punching.
Make the NON-PUNCHING LEFT BLUE GLOVE clearly visible in a raised guard close to his jaw/left cheek, behind or just below the extended right arm. This guarding blue glove and its white cuff must be recognizably a boxing glove near the face; the left elbow stays tucked. Do NOT add a third arm or hand. Retain exactly two arms and two blue gloves. The punching RIGHT glove remains fully extended toward the right.
Keep the rest of this sheet unchanged: original premium pixel style, all anatomy, red beanie, front-left camera, blue-white singlet, black shorts, floor baselines, margins and genuine transparent RGBA background.
```

## Retrait du fond après la retouche

```text
Remove the background from this sprite sheet. Make the background transparent. Keep all six characters exactly the same.
```

