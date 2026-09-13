# The Octopus — imagegen intégré

Personnage inspiré des photos désignées par l’utilisateur. Apparence : cheveux tressés, côtés courts, barbe, chandail noir à poulpe blanc, bandages. Motif simplifié pour la lecture en pixel art. Aucune photo privée brute publiée.

## Planche principale

Use case: stylized-concept. Asset: original transparent game character reference sprites for BoxeurDeux-D. Reference the recent USER PHOTO of the boxer celebrating with BOTH ARMS UP, braided/cornrow dark hair, full dark beard, light skin, athletic muscular build and chest/forearm tattoos. This user-designated man is the reference for friendly gym visitor THE OCTOPUS. Do NOT use the two Fredo coach photos. Local tiny and big sprites are STYLE references only: polished SNES 16-bit pixels, expressive adult anatomy, clear small pixel clusters and clean outlines.
Create a true-transparent RGBA sheet 2x2 with FOUR well separated same-identity figures, identical proportions, no background, no floor shadow, no text labels. Dark cornrow braids swept back with clipped sides, full dark beard, smiling friendly face, black training pants and pale sneakers. Wearing black short-sleeve T-shirt with a WHITE stylized OCTOPUS emblem and small POULIN lettering above it (read normally, not mirrored). His forearm tattoos subtly visible, white hand wraps, no gloves, no hat, no tuque.
Top left: full-body standing relaxed looking toward us slightly angled, hands relaxed.
Top right: full-body same standing in a soft boxing guard, warm expression.
Bottom left: full-body showing a careful straight left jab, torso slightly rotating, other wrapped hand guarding cheek; stay within own cell.
Bottom right: large waist-up portrait of the SAME boxer in black octopus shirt, friendly smile, hands down, enough shirt emblem visible.
Premium actual pixel art, not smooth illustration, no chibi, no broad blobs, crisp consistent 16-bit sprite shading. Full bodies with entire shoes in first three cells. True alpha background, not checkerboard or solid black. Leave wide transparent separation for extraction.

## Extraction finale

Les deux tentatives de planche détourée conservaient un faux damier : elles restent comme sources de travail et ne sont pas chargées dans le jeu. Chaque pose a ensuite été isolée avec l’imagegen intégré en demandant un sprite détouré sur fond réellement transparent, en conservant le personnage, sa tenue et la pose. Les fichiers `idle-alpha.png`, `ready-alpha.png` et `jab-alpha.png` sont les sources finales à alpha vérifié. `scripts/prepare-gym-friends.mjs` effectue uniquement le cadrage et l’échantillonnage proportionnel, avec une ancre commune aux pieds. Les silhouettes d’exploration ont leur propre source dans `../gym-explorers` pour conserver les proportions des petits personnages du gym.
