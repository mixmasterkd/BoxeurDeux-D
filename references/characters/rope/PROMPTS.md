# Boxeur à la corde

Outil : image_gen intégré. Sources conservées, transparence et poses contrôlées avant extraction technique. Aucun service nécessaire pendant le jeu.

## ropeSpritePrompt

```text
Use case: stylized-concept
Asset type: production transparent game sprite sheet, six original jump-rope boxer animation poses for BoxeurDeux-D.
Input images: Image 1 is the character identity, exact clothing and pixel-art rendering reference. Image 2 is the gym palette and lighting reference only.
Primary request: draw the SAME adult boxer for a jumping-rope minigame, full body facing almost straight forward with a tiny three-quarter turn. Preserve his distinctive red knit beanie with tiny black boxer emblem, short dark beard, athletic adult proportions, royal-blue singlet with white trim, black shorts with white side stripes, white socks and blue boxing shoes. Replace his large boxing gloves with white hand wraps and bare fingers that grip two short dark wooden rope handles, one in each hand. Arms relaxed out by hips, elbows close to body, wrists rotate. No rope cable: it is animated separately by the game.
Composition: precisely SIX isolated poses in a clean THREE COLUMN by TWO ROW grid. Landscape sheet. Every cell contains the whole man from beanie to boots with ample transparent margin, SAME scale and same camera. No borders or text.
Top row left to right: 1 READY upright feet near one another and both handles at hips; 2 LOAD knees flexed a little and heels lifting, handles held at hips; 3 HOP LEFT small boxer skip, both feet just airborne with right knee slightly bent and left forefoot lower, same body proportions.
Bottom row left to right: 4 HOP RIGHT complementary boxer skip, left knee bent, right forefoot lower, both airborne; 5 LAND forefeet down and knees softly flexed, shoulders relaxed; 6 STUMBLE a small missed-step recovery, one foot set forward, expressive mild surprise, still holding both handles near hips.
Style: beautiful detailed 16-bit game pixel art as in reference, crisp pixel clusters, clean dark outlines, shaded anatomy and fabric, an adult fighter, not a tiny chibi exploration character and not a rough drawing. Warm upper-left light.
Constraints: real transparent RGBA alpha background, no painted checkerboard, no ground or cast shadow, no background scene, no rope cable, no huge gloves, no extra limbs, no crop, no repeated identical poses, no labels, no letters, no watermark. Preserve character identity and consistent scale across all six poses.
```

## ropeOppositePrompt

```text
Edit ONLY the bottom-left boxer (fourth sprite) in this sheet. His leg pose currently repeats the top-right sprite. Change ONLY his legs to the opposite boxer skip: the leg on the RIGHT SIDE OF THE IMAGE bends upward with the knee lifted and shoe behind; the leg on the LEFT SIDE OF THE IMAGE extends lower with the toe pointing down. Keep his torso, face, arms, both rope handles, red beanie, all clothes/colors, scale, full figure and position unchanged. Keep all five other sprites exactly unchanged. Preserve genuine transparent background. No rope cable, no text, no extra elements.
```

## ropeOppositeAlphaPrompt

```text
Remove the background from this sprite sheet. Make the background transparent. Keep all six characters exactly the same.
```
