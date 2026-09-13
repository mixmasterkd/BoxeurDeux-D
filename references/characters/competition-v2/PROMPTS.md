# Joueur de compétition — deuxième version

Outil intégré imagegen, 12 septembre 2026. Les sources de sparring restent intactes. Les cinq nouvelles planches servent uniquement à mettre le même athlète en tenue bleue/blanche : coupe et couleurs de peau conservées, gants bleus et poignets blancs, passepoils et ceinture blancs. Pas de palette d'équipement personnalisable dans le tournoi.

Sources fournies à l'outil : `sparring-v2/player-outfit-alpha.png`, `sparring-v2/player-transitions-source.png`, `body-training/player-alpha.png`, `knockdown/player-alpha.png`, et les trois poses de `sparring-hook`.

Instruction partagée :

> Clothing-only image edit for an existing 2D game sprite sheet. Preserve the original drawing very faithfully: same skin tone, body anatomy, exact muscle size, boot positions, pose silhouettes, detailed painterly shading with fine pixel-sized texture, navy-blue cloth tonal texture, hard black pixel outlines. Do not simplify into smooth flat cartoon, do not enlarge shoulders or thighs, do not change identity. Change only all yellow/gold trim and waistband to white and cream-colored boxing gloves to royal blue with white cuffs. Blue/white competition singlet, shorts, boots and open-face blue headguard. No markings or text. Keep every pose and original position/count; preserve scale between standing and crouching poses. Solid pure chroma green background, no checkerboard, green reflection, shadows or text. Complete feet/gloves.

Planches : base six poses (3×2), transitions six poses (3×2), corps huit poses (4×2), sol quatre poses (ligne), crochet trois poses (ligne). Pour le crochet : conserver la main gauche au-dessus de la tête, coude fléchi, sans substituer un jab vertical.

Préparation reproductible : `node scripts/prepare-competition-v2.mjs`. Le script retire seulement le vert de fond, isole les silhouettes, mesure les pieds, applique une échelle uniforme puis place les repères. Aucun dessin d'anatomie n'est produit par code. La botte du direct en haut à droite de la source de base est coupée par la génération : cette cellule n'est pas utilisée. Le direct est le miroir du jab complet, comme dans les sprites de sparring. L'esquive vient de la planche de transitions complète. Les récupérations au corps réutilisent leurs positions intermédiaires authentiques.

27 poses finales en RGBA, ancre des pieds (320,624), hauteur de garde 512, canevas 640×640. La caméra et les proportions sont identiques au sparring; aucune réduction indépendante de largeur.
