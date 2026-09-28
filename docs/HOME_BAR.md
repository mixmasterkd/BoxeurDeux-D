# Maison, Karl et bar de l’île — V7

Chapitre autorisé par le GO du 28 septembre 2026. La maison actuelle s’agrandit et les nouveaux loisirs sont gratuits.

## Visiter

Le salon ouvre sur le quartier par sa porte du bas. À gauche, la porte mène au garage ; au fond, le bureau ; à droite, l’escalier vers le palier. À l’étage se trouvent votre chambre et celle de Karl. Votre lit, votre garde-robe et vos médailles sont maintenant dans votre chambre.

Karl mesure environ une tête de plus que le joueur. Ses poses debout et assise conservent les mêmes proportions.

Karl joue sur son laptop dans sa chambre. Parlez-lui ou approchez de la Xbox au salon pour l’inviter. Il descend avec sa manette ; on peut ensuite lui proposer de retourner à son laptop. Son emplacement se conserve pendant la session et revient à sa chambre au rechargement. Ses résultats restent sauvegardés.

Dans le garage, la GR Corolla blanche, rouge et noire est préparée pour la course. Elle est exposée et accessible depuis la maison ; les déplacements en voiture sont une extension future.

Le bar est sur l’île du parc et du métro. Il s’ouvre depuis la promenade, indépendamment de la petite île du casino. Béton et Kramer y jouent au pool. De temps en temps, ils reprennent leur échange : « Yo tu cé pas chui qui man ! » / « Non TOI tu cé pas chui qui man ! ». Les bulles sont temporaires et la visite reste libre.

## Jeux entre amis

**Xbox : course rétro à trois tours.** Vous conduisez la GR Corolla ; Karl a sa Camaro jaune à bandes noires. Au clavier : flèches haut/bas pour accélérer et freiner/reculer, gauche/droite pour tourner. Au tactile : joypad pour tourner, A pour accélérer, B pour freiner/reculer. P ou le menu permet de mettre en pause. Le gazon ralentit ; les points de passage imposent de faire le tour du circuit. Les victoires des deux joueurs et votre meilleur temps gagnant sont conservés.

**Pool : huit simplifié contre Béton ou Kramer.** Souris/doigt pour viser, gauche/droite pour ajuster l’angle, haut/bas pour la puissance, E/A pour frapper. Les six poches, collisions, bandes, pleines/rayées, fautes et blanche en main sont jouables. La 8 ne se joue qu’après son groupe ; l’empocher trop tôt ou avec une faute fait perdre. Les règles complètes sont accessibles avant de jouer. Chaque adversaire a son compteur de victoires.

La pause, la perte de focus et le passage en portrait suspendent les jeux. Recharger ou quitter abandonne la partie en cours sans résultat. Seuls les résultats terminés sont sauvegardés ; les billes et les voitures ne reprennent pas au milieu d’une partie après rechargement.

Aucun pari, argent, énergie ou statistique de boxe n’est ajouté ou consommé par ces loisirs.

## Ordinateur du bureau

Le bureau donne accès à un ordinateur avec cinq applications : navigateur, messages, carrière, scores et garage. Navigation précédente, retour au bureau et fermeture restent disponibles au clavier, au clic et au joypad. Les messages de Karl et Fredo sont des éléments du jeu ; aucun service de messagerie n’est contacté.

Les réservations de voyages et l’inscription au marathon conservent leurs conditions et coûts. Les applications carrière, scores et garage consultent les données de votre partie.

## Sauvegarde et sources

Version de profil **7**, sur la même clé de stockage. Les sauvegardes V1–V6 sont migrées et leurs acquis conservés. Une partie amicale reçoit un identifiant lié au profil en mémoire : un résultat ne peut être enregistré deux fois, ni appliqué à un profil remplacé par import, reset ou mode test. Une partie interrompue n’est pas persistée.

- Pièces et connexions : `HomeBarWorld.js`, `HomeBarScene.js`.
- Mini-jeux : `RetroRaceSession.js`, `BilliardsSession.js`, scènes et interfaces correspondantes.
- Historique amical : `LeisureCareer.js` et `CareerProfile.js`.
- Ordinateur : `ComputerApps.js`, `LaptopUI.js`, `computer.css`.

Les décors et personnages ont été générés avec le **tool ImageGen intégré**, sans appel IA pendant le jeu. Les sources, le jeu de prompts exact et les paramètres de préparation sont dans [references/home-bar](../references/home-bar/) et [prompts.json](../references/home-bar/prompts.json). Les PNG finaux sont dans [public/assets/home](../public/assets/home/) et [public/assets/bar](../public/assets/bar/). Les scripts `prepare-home-bar.mjs` et `prepare-home-bar-sprites.mjs` effectuent uniquement le cadrage, le redimensionnement uniforme et l’extraction des sprites avec leur alpha généré.

## Vérifications

Les commandes dédiées sont `npm run test:home-bar`, `test:home-bar-browser`, `test:race-browser`, `test:billiards-browser` et `test:computer-browser`.

La suite globale finale compte **587 tests réussis** : migrations et unicité des résultats, itinéraires accessibles, collisions/poches et parties complètes simulées, tours ordonnés et conduite déterministe. Les parcours navigateur utilisent un clavier et du tactile émulé ; aucun téléphone physique n’a été testé. Le test de victoire du pool en développement prépare une dernière bille puis joue réellement le coup ; il ne représente pas une partie entière jouée manuellement. Les parcours de production utilisent les menus et commandes normaux.

Les parcours de la version compilée couvrent la maison et le bar, la course, le pool, les applications de l’ordinateur et le terminal. Les rapports et captures sont dans `outputs/verification/home-bar/built/`, `retro-race/built/`, `billiards/built/`, `computer/built/` et `casino-terminal/built/`. La compilation produit `index-Bjt8Q7nB.js` et `index-CORD--UA.css`. Vite signale la taille du bundle principal (Phaser inclus) ; la compilation réussit.

## Publication

Le commit `5f64cec` est publié sur [GitHub Pages](https://mixmasterkd.github.io/BoxeurDeux-D/). Le [workflow 36461559222](https://github.com/mixmasterkd/BoxeurDeux-D/actions/runs/36461559222) a réussi. L’index, les deux bundles et les 12 images nouvelles sont identiques à `dist` par SHA-256 (**15 fichiers**) ; preuve dans `outputs/verification/home-bar/public/assets.json`. Les **14 parcours publics** passent sans erreur : maison/bar tactile2, course PC/tactile2, billard PC/tactile4, ordinateur PC/tactile4, terminal PC/tactile2. Le monde a aussi passé ses deux parcours PC sur la compilation locale ; ils ne sont pas rejoués sur le public puisque les fichiers sont identiques. Rapports et captures dans les dossiers `public/` correspondants. Aucun téléphone physique testé.

Les anciens diagnostics de développement ont été archivés dans `/tmp`; le dépôt conserve les rapports finaux du bundle et du site public. Le seul ajustement après publication concerne les attentes de fermeture du panneau pause dans le script de test du pool. Les sources du jeu et ses fichiers publiés sont inchangés. Les commits suivants consignent uniquement les preuves et la documentation.
