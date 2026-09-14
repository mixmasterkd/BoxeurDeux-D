# Marathon — ressources originales

Illustrations créées avec la génération d’images intégrée de la session Codex, puis contrôlées et préparées localement. Aucun service de génération n’est utilisé pendant une partie. La photo fournie par l’utilisateur a servi de référence au coureur ; la photo brute n’est pas publiée dans le projet.

## Direction et demandes de génération

Les demandes ci-dessous consignent la direction des générations successives et les corrections retenues. Les fichiers `*-source.png` sont les peintures finales conservées, `runner-chroma.png` et `crowd-chroma.png` les planches préparables. Les descriptions sont un compte rendu des prompts, sans promesse qu’une nouvelle génération reproduise les mêmes pixels.

- **Coureur** : personnage adulte inspiré de la photo fournie, tee-shirt violet, casquette noire, short noir, chaussures de course et dossard ; sprites rétro 16 bits détaillés, trois poses de course pour chaque direction bas/droite/haut/gauche, identité et proportions constantes. Une première planche contenait un damier opaque : une retouche intégrée remplace seulement ce fond par un vert chroma uni avant détourage technique.
- **Île Sainte-Hélène** : parc montréalais en automne, perspective légèrement inclinée compatible avec les cartes existantes, Biosphère reconnaissable, promenade de pierre, entrée de métro et pont métallique vers l’est. Correction finale : un chemin large et dégagé qui serpente vers le nord, autour du parc puis redescend vers le pont ; pas de banc/arbre sur le passage prévu. La structure du pont doit pouvoir passer devant le personnage.
- **Centre-ville** : façades montréalaises, escaliers, lampadaires et place avec fontaine. Correction finale : rue en U avec deux axes nord/sud et une liaison à l’arrière, pour imposer plusieurs changements de direction sans couloir horizontal unique. Voitures compactes proportionnées aux portes et à un personnage adulte.
- **Vieux-Port** : quais, vieux bâtiments et attraits montréalais, fleuve en arrière-plan, larges promenades reliées et détour vers le bord de l’eau. Perspective et palette cohérentes avec les autres lieux.
- **Stade** : stade olympique reconnaissable et tour inclinée, grand parvis accessible, jardins contournables, entrée de métro au sud-est. L’arrivée reste devant le stade et la caméra permet de voir le bâtiment.
- **Autres coureurs** : quatre athlètes adultes originaux, quatre lignes de six poses (deux vers la droite, deux de face, deux de dos), costumes orange, rose, blanc et jaune ; fond vert chroma sans vert dans les vêtements, proportions et style communs au joueur. La vue gauche utilise le retournement de la droite.

## Préparation reproductible

`node scripts/prepare-marathon.mjs` normalise les quatre décors en 1920 × 1080 et extrait les personnages sur des cellules transparentes 96 × 112, hauteur du dessin 88, ancre des pieds (48,104). Les couleurs chroma sont supprimées sans repeindre les personnages. Les ressources finales sont dans `public/assets/marathon/` et `public/assets/sprites/marathon/`.

Le décor est affiché à 1,5 pour une carte 2880 × 1620, dans la caméra commune 1280 × 720. Les collisions, parcours et passage sous la structure du pont sont définis dans `MarathonWorld.js` et `MarathonScene.js`, sans dégrader l’image source. Le premier plan du pont est une extraction des pixels existants (girder ajouré et pilier), indépendante du tablier.

Contrôles : transparence réelle, marges des cellules, ancrage et directions ; parcours complet par déplacements et inspection des captures ordinateur/tactile simulé. Les passages à travers les massifs ont été corrigés en accordant le chemin visuel et les collisions. Les autres coureurs suivent le parcours sans raccourci à travers les jardins.
