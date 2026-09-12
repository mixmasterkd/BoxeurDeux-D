# Retouches intégrées

Le même prompt de détourage est appliqué aux autres atlas en changeant uniquement le nom du personnage.

## Détourage des atlas

Use case: background-extraction. Edit target: the supplied Kramer boxing atlas. Preserve EVERY colored sprite pixel, pose, scale, arrangement, identity and uniform. Remove ONLY the gray-and-white checkerboard background, including holes between limbs, and return a PNG with REAL alpha transparency. This is production sprite extraction, the checkerboard must not be drawn into the PNG; its alpha must be zero. Do not change/crop/rearrange characters, no shadows, no new background.

## Coin du tournoi

Use case: precise-object-edit. Edit this existing boxing corner pixel-art vignette for the tournament. Preserve the exact composition, both identities, seated boxer backview and coach Rémi talking with bottle and towel, stools, anatomy, faces, pose, all of coach's teal tracksuit unchanged. Change ONLY the seated PLAYER'S yellow waistband and yellow piping to WHITE, and his white gloves to ROYAL BLUE with WHITE cuffs. Player wears same blue singlet shorts and blue open-face headguard. Real transparent alpha PNG, no backdrop, no text, no new objects. Keep existing polished pixel-art look at original size.

## Fond final du coin

Use case: precise-object-edit. Preserve both boxers, their exact blue-white and teal costumes, poses, faces, stool, towel, bottle. Change ONLY the checkerboard background into a flat solid very dark teal #10252a. Fill all the empty gaps between legs and stool with the same dark teal. No checkerboard anywhere. Keep figures exactly the same and complete. The final image is an opaque pixel-art coaching vignette for the dark teal game menu.
