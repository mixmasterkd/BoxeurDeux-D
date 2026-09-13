# Cuba et les défis après les Gants de bronze

Chapitre autorisé par le GO du 13 septembre 2026. Cette page décrit le fonctionnement, les migrations et les vérifications effectivement terminées. Les livraisons précédentes restent documentées dans [HARMONISATION_SNES.md](HARMONISATION_SNES.md) et [VERIFICATIONS.md](VERIFICATIONS.md).

## Débloquer la suite

Terminer une participation aux **Gants de bronze**, puis quitter l’hôtel par l’accueil, ouvre les nouveaux défis. Une élimination au premier tour compte : le joueur n’a pas besoin de gagner l’or. Un séjour abandonné avant que son parcours soit résolu reste un abandon, sans déblocage.

Les trois possibilités sont indépendantes :

| Défi | Accès | Lecture à apprendre |
| --- | --- | --- |
| **Dyrex** | Salle communautaire, Montréal | Sa garde change de hauteur; distinguer cette garde de la cible annoncée par le prochain coup. Son direct laisse une ouverture. |
| **Le Feu** | Salle communautaire, Montréal | Rafales au corps puis à la tête, de deux puis trois coups. Garder du souffle pour la fin et répondre après la série complète. C’est le défi montréalais le plus difficile de ce lot. |
| **Louisto** | Ring de la plage, pendant le séjour à Cuba | Appuis latéraux, feintes et contres annoncés. Ne pas poursuivre la feinte; lire la vraie préparation et répondre lorsqu’il se replace. |

Battre l’un ne conditionne pas l’accès aux autres. Les revanches et reprises de combat n’ont pas de coût quotidien. Les adversaires gardent un calendrier d’attaques indépendant de la lecture des boutons du joueur. Fredo reste le coach au coin; Rémi reste le partenaire de sparring du gym.

Les plafonds après Kramer sont conservés : **puissance +10, récupération +20 %, endurance 124, résistance 122 et épargne 500 $**. Aucun nouveau combat n’ajoute une bourse automatique ou des capacités sans limite.

## Voyager et vivre à Cuba

L’agence à **Des Rives**, accessible par le métro depuis le quartier du gym, propose un séjour à **160 $ d’argent du jeu**. Le prix inclut le logement et le retour à Montréal. Le départ exige une participation terminée aux Gants, une tournée terminée ou abandonnée, et aucun séjour au tournoi encore actif.

La confirmation du voyage débite une seule fois 160 $ et place le joueur dans la casa. Recharger, importer sa partie ou confirmer une deuxième fois n’entraîne pas un second paiement. Le retour termine le séjour et ramène à **Des Rives**; il reste possible avant de battre Louisto. Un nouveau départ après le retour ouvre un autre séjour payant.

| Lieu | Cadrage et rôle |
| --- | --- |
| Village | Carte de 1920 × 1080 avec caméra suivant le joueur dans le même cadre 1280 × 720. Relie logement, gym, plage et retour. |
| Casa | Logement au cadrage fixe 1280 × 720. Le lit propose la nuit suivante. Personnage à ×2. |
| Gym | Gym cubain au cadrage 1280 × 720, personnage à ×1,5. Pads, corde et atelier de frappe sur six pneus suspendus. |
| Plage | Carte de 1920 × 1080, personnage à ×1,5. Exploration et ring du combat contre Louisto. |

Le joueur du village est aussi à ×1,5. Les portes et passages se franchissent en marchant. E au clavier ou A au tactile sert aux activités, personnes et confirmations. La résolution logique et les proportions 16:9 restent les mêmes sur ordinateur et téléphone paysage.

Dormir avance exactement d’un jour et remet seulement **l’énergie quotidienne à 100**. Le séjour reste actif, sans coût par nuit, sans bonus de compétence et sans victoire préalable obligatoire. L’endurance et la résistance des combats conservent leurs règles propres. À zéro énergie, le joueur peut toujours marcher, dormir, combattre ou rentrer.

## Ateliers, technique et carnet

| Activité | Dépense quotidienne | Fonctionnement |
| --- | --- | --- |
| Pads avec Fredo | 10 | Cible tenue jusqu’au bon contact; jab gauche vers le pad à droite de l’écran, direct droit vers le pad à gauche. Pas de barre de rythme. |
| Corde | 15 | Alternance J/K ou A/B et animation du personnage, comme au gym montréalais. |
| Pneus suspendus | 15 | Six pneus composent la cible visible; l’atelier reprend la chorégraphie et le contact de la boucle du sac. |
| Double jab avec The Octopus, à Montréal | 10 | Trois séries J → J → K, ou A → A → B, terminées pendant le drill. Accessible après le retour des Gants. |

Les ateliers de Cuba utilisent les objectifs et gains plafonnés habituels : pads/sac pour la puissance, corde pour l’endurance maximale. Une pause ne redébite pas la séance; recommencer constitue un nouveau départ. Abandonner conserve la dépense sans attribuer de gain.

Le drill d’Octopus débloque la technique **double jab–direct** de façon permanente. Le mouvement de départ **jab–direct–crochet** reste intact. Une pression donne une frappe; le maintien ne répète pas les coups. Le JJK complet coûte **41 endurance** et son dernier direct ajoute **4 dégâts**. Il ne donne pas de point de décision gratuit : le bilan compte seulement les touches réellement portées. Une garde adverse peut empêcher les trois touches sans empêcher les animations.

Le **Carnet** se trouve près de **Commandes** dans les menus des lieux et des activités. Il contient trois pages :

- **Objectifs** : accès aux trois défis, résultat déjà acquis et montant restant pour Cuba.
- **Parcours** : jour/énergie, portefeuille/plafond, capacités, victoires/défaites/nuls, médailles et séjours.
- **Techniques** : combo de départ, double jab verrouillé ou appris, gardes et commandes du périphérique actif.

La fenêtre reste dans le cadrage SNES. Sur petit mobile, son texte défile au doigt; le joypad navigue entre les choix et A confirme. B, P/Échap ou ☰ referme le carnet et revient au menu précédent **sans reprendre le jeu**. Aucune nouvelle action de combat ni touche de confirmation n’est ajoutée.

## Sauvegarde v4

La clé locale historique reste `boxeur-deux-d-career-v1`. Le format v4 ajoute :

- Les résultats `dyrex`, `lefeu` et `louisto`, avec les reçus de rencontre empêchant le double enregistrement.
- `techniques.doubleJab`, booléen strict, faux tant que le drill n’est pas terminé.
- `cuba.entries`, `nextId`, `active` et `history`, avec identité du séjour, jour du départ, montant payé et jour du retour.

Les migrations v1/v2/v3 préservent les capacités, plafonds, résultats antérieurs, inventaire et tenues équipées, portefeuille, journées, lieu, médailles et progression des livraisons ou du tournoi. Une copie de la source est conservée quand le stockage est disponible. Les versions futures sont protégées de l’écriture; les fichiers incohérents sont refusés avant de remplacer la partie.

Une sauvegarde à Cuba reprend le séjour payé. Un combat interrompu reprend depuis son lieu d’accès, sans restaurer une animation en cours. Sommeil et retour conservent les acquis. Un échec du stockage est signalé; la session reste jouable et l’export contient son état en mémoire.

Les parties restent propres au navigateur et à l’adresse utilisée. Localhost, Wi-Fi et GitHub Pages ont des stockages séparés; transférer un export JSON est nécessaire pour déplacer la partie entre appareils. Aucun serveur de comptes ni abonnement n’est ajouté.

## Vérifications consignées

Vérifications terminées le 13 septembre, sur le jeu local et le bundle compilé :

- **352/352 tests unitaires globaux** passent sur cette intégration. Ils comprennent les migrations et règles de voyage, les trois adversaires, le double jab, les ressources des adversaires et les collisions/transitions de Cuba.
- **60 tests carrière ciblés** : migrations v1/v2/v3, ordre libre des nouveaux combats, séjour payé une fois, retours, sommeil, absence de gain de capacité gratuit, import invalide atomique et stockage indisponible.
- **24 parcours navigateur du carnet** : gym, sparring, sac, shadow, corde, speed ball, pads et piscine, sur ordinateur 1280 × 720 et fenêtres tactiles 844 × 390 / 568 × 320. E/A/B, changements de page, défilement tactile, fermeture sans reprise, aucune erreur.
- **8 vérifications supplémentaires en 568 × 320** après avoir raccourci l’introduction des pages pour faire apparaître leur contenu plus haut. Aucune erreur.
- **Quatre parcours sur le bundle de production**, sous `/BoxeurDeux-D/`, sans serveur concurrent et sans accès aux objets de développement : apprentissage PC/tactile de trois séries J-J-K, migration réelle v3→v4, paiement unique de 160 $ malgré une confirmation maintenue, recharge à Cuba, nuit, retour inclus sans avoir affronté Louisto, puis accès libre à Le Feu et Dyrex. La technique est acquise au troisième contact : une pause immédiate suivie d’un rechargement mobile ne la perd pas. Aucun gain de capacité gratuit ni second débit.
- Le test de production a détecté le libellé « Retour au quartier » trop large dans le menu de combat en 568 × 320. Son retour à la ligne est corrigé; le parcours mobile entier repasse avec le bouton dans son cadre et les commandes dans les marges. Aucune erreur console, ressource manquante ou débordement de page.
- **28 contrôles Cuba**, lors de deux parcours complets PC et 568 × 320 : voyage, contact aux pads et aux pneus, deux appuis à la corde, nuit de 60 à 100 énergie, reprise du séjour, plage à caméra défilante, entrée et jab contre Louisto, retour sans réentrée accidentelle dans le ring, vol inclus et métro vers le quartier. Aucune erreur navigateur.
- **14 contrôles ciblés supplémentaires du sac en pneus**, avec vraies frappes à la tête et au corps : écart gant/cible de 0 à 0,46 pixel au moment compté; S+K et joypad bas+B simultanés. [Rapport des contacts](cuba-contact-browser-results.json).
- **Trois combats gagnés dans Chromium** : Dyrex et Le Feu au clavier, Louisto en 568 × 320 avec véritables événements tactiles émulés. Contacts, gardes hautes/basses, double jab, mises au tapis et résultat sauvegardé concordent. Le retour de Louisto mène à la plage. Les trois liens directs restent bloqués avec une partie non admissible. Aucune erreur navigateur.

Rapports : [carnet complet](career-journal-browser-results.json), [carnet compact](career-journal-small-mobile-browser-results.json), [nouveaux combats et accès](new-opponents-browser-results.json), [production consolidée](next-static-results.json), [parcours Cuba](cuba-browser-results.json). Captures : [carnet ordinateur](career-journal-desktop.png), [carnet tactile](career-journal-small-mobile.png), [drill réussi](next-static-octopus-double-jab-desktop.png), [réveil à Cuba sur mobile](next-static-cuba-morning-mobile.png), [menu Le Feu corrigé](next-static-free-lefeu-mobile.png).

```bash
npm test
npm run test:next-career
npm run test:next-shadow
npm run test:journal
npm run test:next-combat
npm run test:opponents
npm run test:cuba-world
npm run test:cuba
npm run build
npm run test:next-static
```

Les essais mobiles ci-dessus sont **des simulations de fenêtre et de contacts tactiles dans Chromium**. Aucun essai sur le téléphone physique de l’utilisateur n’est revendiqué. Le test statique utilise `dist/`; `SPARRING_URL` permet de refaire les mêmes quatre parcours sur une adresse publiée, dans un contexte de navigateur isolé.

## Publication vérifiée

Chapitre publié sur [GitHub Pages](https://mixmasterkd.github.io/BoxeurDeux-D/), à partir du commit `acd6bbe`. Le [workflow 34738918454](https://github.com/mixmasterkd/BoxeurDeux-D/actions/runs/34738918454) a réussi. Les quatre parcours ont ensuite été exécutés sur le vrai site public, sans interception des requêtes : PC 1280 × 720 et tactile simulé 568 × 320, 223 ressources chargées, aucune erreur. Migration v3, apprentissage des neuf frappes, pause au troisième combo, recharge, paiement unique, nuit, retour inclus et accès Le Feu puis Dyrex sont confirmés. [Rapport public](next-static-public-results.json), [menu Le Feu mobile](next-static-public-free-lefeu-mobile.png).

Un contrôle distinct compare les octets de l’index, des bundles et de tous les nouveaux décors/sprites : **62 fichiers HTTP 200, identiques à la compilation locale**, SHA-256 consignés dans le [rapport des ressources](next-public-assets-results.json). Les versions finales sont `index-DeJi5c8u.js` et `index-DCX6AnIy.css`. La compilation conserve l’avertissement habituel de Vite sur la taille du bundle Phaser; elle réussit.

```bash
SPARRING_URL=https://mixmasterkd.github.io/BoxeurDeux-D/ npm run test:next-static
node tests/next-chapter-public-assets.mjs
```
