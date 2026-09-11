# Boxeur à la speed ball

Outil : image_gen intégré. Sources conservées, transparence et poses contrôlées avant extraction technique. Aucun service nécessaire pendant le jeu.

## speedSpritePrompt2

```text
Use case: identity-preserve
Input image: identity reference only (same man and outfit); discard the rope and handles for this new activity.
Asset type: four sequential full-body SPEED BAG training animation sprites, arranged in FOUR equally spaced columns in ONE horizontal row.
Show the adult red-beanie boxer from three-quarter FRONT-LEFT, looking right, feet planted almost parallel shoulder-width (not a wide combat stance). Blue-white vest, black-white shorts, blue boots, short beard, red beanie emblem and white hand wraps like the reference. Keep face, chest, shorts, planted feet and camera consistent.
All poses must have BOTH elbows up in front of the chest and BENT to 90 degrees. The fists make SMALL forward CIRCLES, about the size of a fist, in front of his nose. It is SPEED BAG work, NO long jabs, NO straight punches, NO windup behind his head.
1 LEFT BACKFIST CONTACT: his LEFT forearm (shoulder at image RIGHT, near the target) points diagonally UP toward the right from a bent elbow, left fist at brow height, back/ulnar edge of wrapped hand foremost. His right hand (shoulder at image LEFT) is tucked just behind, ready to circle.
2 LEFT RETURN: left fist folds in downward in front of chest, BOTH elbows still raised; right fist circles up by his nose.
3 RIGHT BACKFIST CONTACT: RIGHT forearm from image LEFT circles across front of chest and diagonally UP, right wrapped fist reaches the SAME point in front of nose as pose1. LEFT hand visibly tucked lower. Must use the OTHER anatomical arm.
4 RIGHT RETURN: right fist rolls back down in front of chest; left fist circles up by his nose, looping to frame1.
Keep wrists within one head-width of his face and elbows bent in every frame. Small speed bag gestures, calm upper body, strong silhouette. No ball/apparatus (added separately).
Beautiful detailed clean 16-bit pixel-art like reference. Exactly four original poses on actual transparent alpha background, full figures with generous margin, no checkerboard pixels, no scene, no ground/shadows, no text, no labels, no watermark.
```

## speedAlphaPrompt

```text
Remove the background from this sprite sheet. Make the background transparent. Keep all four characters exactly the same.
```

## speedBallPrompt

```text
Use case: stylized-concept
Asset type: one isolated speed bag prop sprite for the BoxeurDeux-D gym.
Primary request: draw a single small hanging speed bag, an authentic teardrop-shaped dark oxblood/brown leather boxing speed bag with rounded bottom, narrow neck, cream stitched vertical seams, slightly worn leather highlights, short leather tab and a small silver metal swivel loop at its top. Seen front/three-quarter, matching the detailed 16-bit pixel-art gym reference.
Composition: one complete centered prop, vertical, entire metal loop, leather tab and round leather bottom visible; generous transparent margin. Object height about 350 pixels in a square canvas to provide fine source detail before game downsampling.
Light warm from upper left. Strong clean dark outline, crisp square pixel clusters, layered leather shading, no lettering, no logo.
Transparent background. No platform, no wall, no other objects, no character, no floor or cast shadow, no checkerboard, no text, no watermark.
```
