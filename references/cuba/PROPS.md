# Accessoires de Cuba

Art original généré avec l’outil intégré imagegen le 13 septembre 2026. Aucun service distant n’est appelé pendant une partie.

## Comptoir Voyages

Source : `travel-kiosk-source.png`. Recadrage de l’alpha réel, redimensionnement au plus proche voisin et normalisation 196 × 224 par `scripts/prepare-cuba-props.mjs`. Les résidus de détourage alpha ≤ 16 sont ignorés; aucune couleur visible n’est repeinte.

Prompt :

Use case: stylized-concept. A polished SNES16bit pixel art GAME PROP, standalone small travel ticket kiosk seen from a slightly elevated topdown RPG camera, matching a cozy Montreal street game. Cream painted wooden counter with navy trim and warm ochre small canopy. A poster of turquoise sea and palm on one side, a small tidy paper ticket stack inside. Small readable sign 'VOYAGES' across canopy and smaller 'CUBA' on poster, no other lettering. Human sized street kiosk around1.8m tall and1.6m wide, frontal slight top view, entire prop including feet/base visible. No people. Readable deliberately chunky pixel clusters at logical resolution about96pxwide×112pxtall enlarged uniformly, professional warm16bit palette, no smoothphotorealism. True transparent background, crisp darkoutline without colored glow, no groundplane, no checkerboard.

## Sac de six pneus

Source initiale : `tire-bag-source.png`. Une vignette supplémentaire de vue du dessus a été produite. Deux essais de retouche ont ensuite rendu un faux damier opaque, donc ils sont écartés. Une nouvelle génération isolée a fourni la source retenue : `tire-bag-clean-source.png`, avec son alpha réel. Normalisation 160 × 530; seuls le recadrage et la mise à l’échelle sont faits par script. Les deux points de contact hérités du sac, (20,296) et (20,385), touchent le caoutchouc visible (alpha 253 et 252).

Prompt initial :

Create ONE transparent pixel-art boxing training prop for a polished SNES16bit game: a heavy punch bag made from SIX used black rubber car tires STACKED HORIZONTALLY tightly on a vertical axis, hanging by short chains meeting at one top suspension eye. Front view with a little top view, full prop from chain eye to bottom tire visible. No person, no environment, no floor shadow. Tall narrow silhouette for existing game collider: overall logical bounding rectangle about124px wide ×510px high, topchain section about85px, rubber stack the rest, tires form a straight consistent left and right side. Dark charcoal rubber with readable gray tread grooves, muted worn edges, darkmetal chains. Crisp dark pixel outlines, no coloredfringe/glow. Entire composition centred in a spacious portrait canvas on GENUINE TRANSPARENT RGBA background, not checkerboard. Professional warm retro16bit sprite, not realisticphoto.

Première retouche, écartée :

Edit this exact generated pixel-art asset. Keep ONLY the tall hanging six-tire punching bag with its long suspension chains and top ring, preserving its artwork and colors. Completely remove the separate small circular top-view diagram floating at the upper right. Remove the gray glow behind the artwork. The sole bag must have a truly transparent RGBA background, not black, no checkerboard, no shadow, no colored halo. Do not add anything. Preserve complete top suspension ring and bottom tire. Output a single clean isolated transparent sprite.


Prompt de la génération finale retenue :

A single isolated game sprite of a Cuban boxing punching bag made from six worn black rubber car tires stacked flat on top of each other into one tall vertical column, suspended by steel chains meeting a small ring above. Beautiful SNES 16-bit pixel art, crisp pixel shading, charcoal black, subtle warm gray highlights. Straight-on view. Entire bag visible from suspension ring to bottom tire, centered. Transparent background. Only one object, no diagram, no inset, no text, no floor, no backdrop. Tall narrow bag proportions: overall height about four times the width.
