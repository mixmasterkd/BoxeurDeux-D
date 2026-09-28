# Casino de Montréal — 27 septembre 2026

Le GO ajoute un casino à gauche de l’île de la carte existante. Il ouvre après une participation **terminée** aux Gants de bronze et le retour de l’hôtel, y compris après une élimination. Un départ anticipé du tournoi ne suffit pas. Entrée gratuite, aucune énergie de journée consommée, aucun compte ni argent réel.

## Visite et jeux

Depuis la sortie du métro de l’île, suivre le chemin vers la gauche, sous le bâtiment du métro, pour rejoindre le nouveau secteur. Traverser le petit pont vers la petite île du casino, puis avancer dans la porte du parvis. Voir [le déplacement sur sa propre île](CASINO_ISLAND.md). La façade reprend la silhouette du vrai bâtiment; l’intérieur et l’implantation dans notre carte sont des adaptations pour le jeu.

- Rez-de-chaussée : réception, caisse, vestiaire fermé, coin détente et six machines proposant quatre modèles.
- Premier étage : Karl au blackjack, croupière à la roulette, salle de spectacles fermée annonçant les futurs galas de boxe professionnelle, aile réservée.
- Deuxième étage : Hold’em contre Luc à lunettes, Mireille et Marco, bar et futur salon privé.
- L’ascenseur au fond de chaque étage propose les trois niveaux. La sortie du rez-de-chaussée revient sur l’île; le parcours du marathon est préservé.

Karl reprend la référence de l’utilisateur : cheveux noirs bouclés volumineux, petite moustache, chemise blanche, gilet noir et nœud papillon. Il distribue, retourne une carte et présente les jetons. Ses salutations suivent la carrière. Les futurs galas professionnels, l’agrandissement de la maison actuelle avec la chambre de Karl et une autre maison chez les pros restent des idées futures, hors de cette livraison.

| Jeu | Mise et règles |
|---|---|
| Blackjack | 1 à 5 $. Tirer, rester, doubler, séparer une paire de même valeur une fois; double après split. As séparés : une carte chacun. Karl reste sur 17 souple. Naturel payé 3:2; victoire 1:1, égalité remboursée. Pas d’assurance. |
| Roulette | Européenne, zéro unique, 37 cases. Jeton de 1 $, total de 5 $ maximum. Numéro 35:1, couleur ou parité 1:1, douzaine/colonne 2:1. Zéro perd les mises extérieures. |
| Machines | 1 $ par tour; Les Cerises, Les Cloches, Les Diamants et Nuit de Montréal. Lots maximaux 25, 40, 50 et 30 $. Combinaisons et probabilités visibles dans les règles. |
| Hold’em | Quatre joueurs, cave de 10 ou 20 $, blinds 1/2 $. Préflop, flop, turn, river; suivre, checker, relancer, se coucher et tapis confirmé. Pots secondaires, égalités et jetons impairs. Sans prélèvement. La cave restante et les gains sont rendus après chaque main. |

Les bots utilisent uniquement leurs propres cartes, les cartes communes et les mises visibles. Luc peut bluffer, Mireille est sélective, Marco suit davantage. Le hasard dépend de la graine tirée indépendamment du portefeuille et des résultats précédents. Il n’existe aucune victoire garantie. Les machines utilisent une table de résultats pondérés explicite, détaillée dans [les règles techniques](../references/casino/GAME_RULES.md).

## Argent, sauvegarde et commandes

Le plafond passe à **1 000 $ après les Gants de bronze**, sans prime gratuite. Il englobe l’argent et les jetons conservés. À la caisse, 1 $ = 1 jeton; échanges de 1/5/10/20/50 $ et retrait complet sans frais. Aucun emprunt. Les petites mises restent accessibles; cinq jetons sur un numéro de roulette peuvent néanmoins donner 175 $ de bénéfice selon la règle affichée.

Avant d’engager une mise, la carrière réserve assez de place pour le gain maximal possible; un refus explique la limite avant le tirage. Un gain remporté n’est jamais tronqué. Les demi-dollars préservent exactement les naturels de blackjack à 3:2. Les livraisons tiennent compte des jetons au casino pour respecter le même plafond.

La sauvegarde **V6** conserve la clé historique et migre les versions 1 à 5, avec copie de secours. Chaque engagement/action et son règlement sont enregistrés ensemble. Les cartes, paquet, décisions et résultats sont conservés; les imports reconstruisent les parties pour vérifier leur cohérence. Recharger reprend la même main, sans remettre la mise ni payer deux fois. Une main engagée doit être terminée avant de quitter le casino ou commencer une autre activité. Le terminal conserve son profil de test séparé.

Flèches/WASD pour naviguer, **E** pour confirmer; clic disponible. Sur téléphone paysage, joypad et A/B dans les marges. P/Échap/B pendant une main ouvre sa pause; les règles restent consultables. Focus perdu, portrait et pause suspendent les décisions des bots et le temps des animations. Les actions et explications défilent dans leurs colonnes sur les petits écrans; les cartes du joueur restent prioritaires.

## Ressources et vérifications

Décors et personnages : `public/assets/casino/`. Sources et prompts : `references/casino/`; préparation reproductible : `scripts/prepare-casino.mjs`. Illustrations générées avec l’outil ImageGen intégré, aucun appel IA pendant une partie. La photo originale de Karl n’est pas publiée. Référence architecturale : [Provencher_Roy, Casino de Montréal](https://provencherroy.ca/en/projects/casino-de-montreal).

Commandes : `npm run test:casino`, `npm run test:casino-browser`, `npm run test:casino-world`. Les rapports navigateur et captures sont dans `outputs/verification/casino/`. Les fixtures débloquent le chapitre pour les essais; les boutons/clavier/touches jouent les parties. Les essais tactiles utilisent Chromium/CDP, aucun téléphone physique.

Le contrôle final comprend **494 tests automatisés réussis**, une compilation Vite réussie et les parcours du monde au clavier et en émulation tactile. Les **14 scénarios des quatre jeux sur la version compilée**, ordinateur et petit téléphone, passent avec **42 contrôles de disposition**, sans erreur JavaScript ni avertissement navigateur. Les règles, pauses, rotations, rechargements et règlements des mises sont couverts. Les captures finales de l’extérieur et de la salle de poker sont dans `outputs/verification/casino/final-*.png`.

La compilation finale contient `index-VAFeLcvW.js` et `index-BilBeM5G.css`. Vite conserve son avertissement de taille du bundle Phaser. Les contrôles mobiles utilisent l’émulation Chromium ; aucun téléphone physique n’a été testé.

## Publication

Le casino est **publié et vérifié le 27 septembre 2026** sur [le jeu public](https://mixmasterkd.github.io/BoxeurDeux-D/). Le commit d’implémentation est `7620578`; le [workflow GitHub Pages 36375220352](https://github.com/mixmasterkd/BoxeurDeux-D/actions/runs/36375220352) a réussi.

L’index, les deux bundles et les dix-sept visuels du casino — **20 fichiers** — sont identiques à `dist` par SHA-256. Sur ce vrai site public, les **14 scénarios ordinateur et mobile simulé** passent, avec **42 contrôles de disposition**, aucune erreur JavaScript et aucun avertissement navigateur. Le rapport consolidé, les captures, les empreintes et la preuve du déploiement sont dans `outputs/verification/casino/public/`.

Le premier passage public avait terminé les sept scénarios ordinateur avant un délai réseau dépassé au chargement mobile. Le script accorde désormais 60 secondes aux navigations publiques; toutes les assertions sont conservées. La relance complète réussie remplace ce résultat provisoire, conservé dans `results-first-attempt.json`. Aucun téléphone physique n’a été testé.
