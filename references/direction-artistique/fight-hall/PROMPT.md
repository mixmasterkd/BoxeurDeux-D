# Salle de rencontre amateur — provenance et prompt

Source originale : `fight-hall-source.png`, produite avec l’outil intégré `image_gen__imagegen` de Codex. Aucun CLI de génération, clé API ou abonnement supplémentaire n’est requis par le jeu.

Référence de style et de géométrie inspectée avant génération : `public/assets/backgrounds/gym.png` et sa référence `references/direction-artistique/gym-proposition-01.png`. Le gym reste intact. Aucune photo privée n’a été utilisée.

La génération constitue un nouveau décor de rencontre amateur dans une salle de quartier : gradins occupés derrière les cordes, charpente haute et éclairage de soirée. Le ring est entièrement vide, sans personnage ni corde de premier plan. La normalisation vers 1280 × 720 utilise une échelle uniforme et le plus proche voisin pour conserver les pixels ; elle ne dessine aucun élément du décor.

Reproduction de la préparation : `node scripts/prepare-fight-hall.mjs`. Les dimensions de source et le recadrage exact sont consignés dans `preparation.json`.

## Prompt exact

Use case: stylized-concept.
Asset type: finished background for an original premium 16-bit boxing videogame, flat raster background 1280 × 720 pixels, widescreen 16:9.
Reference image: the supplied gym picture is the precise PIXEL-ART FINISH and RING CAMERA / GEOMETRY reference only. Create a NEW boxing competition hall, not a gym variation and not a recolored copy.
Scene: an intimate Montréal neighborhood amateur boxing evening, set inside a modest older community sports hall. A small enthusiastic mixed adult audience sits in dark tiered bleachers BEHIND the far side of the ring. High exposed steel roof beams, a few warm amber spotlights suspended above, dim brick/concrete walls, restrained burgundy seating, deep blue ring canvas. Authentic small local event, warm and atmospheric, no giant arena or stadium. Audience faces and clothing resolved as tasteful expressive pixel clusters in shadow; do not make the crowd distracting or put anybody in the ring.
Camera and ring composition MUST match the reference: fixed Punch-Out viewpoint standing INSIDE the ring, looking straight toward the opposite ropes. Slight downward view to the broad blue mat. Far-left blue padded post at x≈140, far-right red padded post x≈1140 in the 1280px image. Three far horizontal ropes: red at y≈230, cream at y≈285, blue at y≈345. The corner posts end near y≈395. Short side ropes angle out to the SIDE edges only, above y≈395. Ring mat starts approximately y=395 and occupies the entire lower 325 pixels unobstructed. No close front ropes, no visible foreground fence or rail.
Critical gameplay empty space: the entire blue mat from y=395 to the bottom edge must be empty of objects and people. Keep the central region x=370..910 visually calm and evenly lit for two later-added game sprites around x=640 with feet at y=521 and y=632. The background contains ZERO boxers, ZERO referee, ZERO figures inside the ropes. Lightly worn blue canvas with subtle pixel texture; no logos or large marks; no harsh bright spotlight hotspot, no strong painted lines across the central action area.
Style: same sophisticated SNES / 16-bit pixel-art density and craft as the supplied reference. Crisp square pixel clusters, deliberate highlights and textured shading, rich deep navy/blue, amber, burgundy/red palette, clean readable silhouettes, detailed but restrained. Do not make a 3D render, vector graphic or blurry painterly illustration.
No gym equipment, no punching bags, no speed bags, no mirrors, no large gym windows, no outdoor skyline, no HUD, no buttons, no lettering, no numbers, no banners with text, no brands, no watermark. Full-bleed opaque scene in 16:9, ideally exactly 1280 × 720.
