# Le bar dans le quartier — 28 septembre 2026

Le Bar de l’Île est déplacé dans une nouvelle rue du quartier. Depuis la maison ou le gym, marchez vers la droite, passez la salle de boxe et poursuivez par l’ancienne sortie barrée. Le bar se trouve au milieu de la nouvelle rue, sur le trottoir du haut. La sortie de gauche ramène au quartier.

Béton et Kramer ont été redessinés aux proportions du joueur : silhouettes compactes, grandes têtes et jambes courtes. Leur canevas est maintenant de 96×112 pixels, avec le même ancrage aux pieds et la même échelle ×2 que le joueur à l’intérieur. Hauteur visible : 176px pour Béton et 180px pour Kramer. Karl reste une tête plus grand à la maison.

## Intégration

La nouvelle scène `BarStreetScene` et son modèle `BarStreetWorld` gèrent la rue, la façade, les collisions et ses deux sorties. La rue utilise la musique existante du quartier et conserve le vélo pendant une tournée de livraison. Le bar et les jeux amicaux conservent leur fonctionnement.

L’identifiant intérieur `island-bar` est conservé pour les sauvegardes V7. Une ancienne partie déjà dans le bar ressort désormais dans la nouvelle rue. Les scores, l’argent, l’énergie et la progression sont préservés. Sur l’île, l’ancienne façade, le panneau, la collision et l’entrée du bar sont retirés; le métro, le marathon et le pont du casino restent accessibles.

## Visuels

Mode utilisé : **outil ImageGen intégré**. Sources et prompts exacts : [references/bar-street/prompts.json](../references/bar-street/prompts.json).

- Nouvelle rue : [public/assets/bar/street.png](../public/assets/bar/street.png).
- Raccord est du quartier : [public/assets/world/neighborhood-east-open.png](../public/assets/world/neighborhood-east-open.png), superposé uniquement sur la zone modifiée.
- Béton : [public/assets/bar/beton.png](../public/assets/bar/beton.png).
- Kramer : [public/assets/bar/kramer.png](../public/assets/bar/kramer.png).

Les scripts `scripts/prepare-bar-street.mjs` et `scripts/prepare-bar-people.mjs` réalisent uniquement le cadrage et le redimensionnement uniforme au plus proche voisin. La transparence réelle des personnages est conservée. Les paramètres d’export sont enregistrés dans `references/bar-street/`. Aucune IA n’est appelée pendant le jeu.

## Vérification

**591 tests automatisés réussis** et compilation finale `index-BVXARDUc.js` / `index-CORD--UA.css`. Six parcours compilés PC/tactile passent sans erreur, avec 28 captures dans `outputs/verification/bar-street/built/` : trajet quartier/rue/bar, sauvegarde V7 ancienne avec scores et sortie vers la nouvelle rue, ancien site de l’île sans entrée fantôme. Les personnages et l’alignement de la façade ont été revus visuellement. Aucun téléphone physique testé.

Les six parcours locaux ont été joués sur `index-PWhsa7_j.js`. Le dernier bundle ajoute uniquement la transmission du drapeau de retour du vélo, couverte par le test de transitions; la version publiée sera rejouée après déploiement. La publication et ses contrôles restent à terminer.

Commandes ciblées :

```sh
HOME_SCOPE=bar HOME_BUILT=1 PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/google-chrome node tests/home-bar-browser.mjs
HOME_SCOPE=bar HOME_URL=https://mixmasterkd.github.io/BoxeurDeux-D/ HOME_MOBILE=1 PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/google-chrome node tests/home-bar-browser.mjs
HOME_ASSET_OUTPUT=outputs/verification/bar-street/public node tests/home-bar-public-assets.mjs
```
