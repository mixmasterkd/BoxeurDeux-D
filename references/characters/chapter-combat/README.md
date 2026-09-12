# Combattants du premier chapitre

Ressources originales produites avec **l’outil intégré de génération d’images**,
puis contrôlées et extraites en PNG. Aucun appel réseau, service d’IA ou logiciel
de dessin n’est requis pendant le jeu.

- `ATLAS_PROMPTS.md` : prompts des quatre adversaires.
- `COMPETITION_PROMPTS.md` : uniforme du joueur, relevés et corrections de contact.
- `FINISHING_PROMPTS.md` : détourage des atlas et vignette du coin.
- `*-source.png` : compositions générées initiales, parfois sur damier peint.
- `*-alpha.png` : sorties réellement RGBA obtenues par retouche intégrée.
- `competition-corner-final.png` : vignette opaque sur fond sombre pour les
  pauses du tournoi. Les tentatives de détourage n’ayant pas livré d’alpha
  exploitable, le fond sombre a été réalisé par l’outil intégré.

Finales : `public/assets/sprites/chapter-combat/{kramer,bellini,fortin,gagnon,competition}`,
avec un `fighters.json` par personnage. 16 poses par adversaire, 21 poses joueur.
Vignette : `public/assets/sprites/corner/competition-coach.png`.

Les sources carrées demandées en 2048 × 2048 sont réellement sorties en
1254 × 1254. Les proportions et les groupes de silhouettes ont été mesurés
sur ces dimensions réelles. La taille physique vient de la garde de référence;
une pose assise n’est jamais étirée à la hauteur debout.

`node scripts/prepare-chapter-combat.mjs` reproduit les extractions techniques :
composantes alpha visibles, gouttières, mise à l’échelle sans lissage, ancrage
des appuis et repères de tête/corps/gant. Les résidus de segmentation d’alpha
1–16 sont exclus, comme dans le pipeline existant. Aucun personnage n’est
dessiné par ce script. Les poses de retour réutilisent explicitement la pose
de préparation correspondante; les poses de contact sont propres et mesurées.

Le jab de Gagnon a été régénéré pour corriger la main active : gauche anatomique,
à droite de l’écran pour un adversaire de face. Les deux crochets de compétition
du joueur reprennent les poses de contact existantes avec l’uniforme bleu/blanc.

Tournoi : coin bleu joueur, coin rouge adversaire, débardeur et short assortis,
ceinture blanche contrastante, casque ouvert sans protège-joues. Les tenues
cosmétiques du gym n’altèrent pas ces uniformes de compétition.
