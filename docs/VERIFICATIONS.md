# Vérification du prototype — 11 septembre 2026

## Commandes dans les marges et sac chorégraphié — 11 septembre 2026

- **Ordinateur au clavier :** aucun bouton de jeu, de pause, de son ni guide de touches pendant la partie. L’aide reste dans **Commandes**, au menu ouvert avec P/Échap. **Tactile :** pavé, garde, esquives, frappes, interaction, pause et son sont placés dans les marges latérales, hors du canvas, selon l’activité. La résolution logique reste **1280 × 720**, mise à l’échelle uniforme.
- `npm run test:side-controls` : gym et sparring en paysages tactiles **844 × 390, 667 × 375, 568 × 320, 1280 × 720**, plus ordinateur **1440 × 1000 et 568 × 320**. Positions des boutons mesurées, absence de chevauchement et contrôle de l’élément réellement touchable au centre. Marche et garde avec deux doigts, relâchement indépendant, annulation, perte de focus, conversations, pause/Commandes, portrait et retour au gym validés. Deux défauts de menu détectés puis corrigés : retour au gym recouvert au petit format tactile, pause débordante au petit format ordinateur. Aucune erreur navigateur.
- `npm test` : **55 tests réussis**, dont 11 nouveaux pour le sac. Ils couvrent contact différé après l’appui, tolérances du rythme, crochet conditionnel, erreurs, pause pendant une frappe, fin exacte à 45 secondes, animation terminée avant la cloche et cohérence à 20/60 Hz. Les 44 contrôles de sparring, marche, leçons et audio sont conservés.
- `npm run test:bag` : deux séances complètes de **45 secondes réelles** dans Chromium. Marche jusqu’au sac, erreur volontaire, double jab, jab–direct et crochet JKJ déclenchés par les vrais boutons/clavier. Les huit contacts enregistrés utilisent la pose de la frappe comptée et un gant à moins de **2 pixels** de la cible du sac. Pause/Commandes, perte de focus, sourdine persistante, bilan, nouvel essai et retour aux mêmes coordonnées validés. Boutons hors canvas et menus accessibles en **844 × 390, 667 × 375, 568 × 320**, portrait en pause. Aucun échec de page, console ou ressource. Rapport : `bag-browser-results.json`; captures : `sac-*.png`.
- `BAG_CASE=controls npm run test:bag` après revue : deux doigts sur le même bouton, relâchement indépendant, activation native par Entrée/Espace et **10 allers-retours gym–sac** par l’interface. Position conservée et compteurs de listeners shutdown/destroy stables. Le nettoyage des trois scènes retire désormais ses deux listeners; les événements DOM et ResizeObserver sont aussi libérés. Rapport ciblé : `bag-controls-browser-results.json`.
- Compilation finale réussie; `npm run test:static` rejoue le bundle sous `/BoxeurDeux-D/` et son index explicite, au clavier et au tactile : gym, aide, sparring, jab, reprise/remise à zéro, première réussite de leçon, son, retour, puis sac, contact, aide, recommencement et retour. Tous les assets chargent sous le bon sous-dossier; les objets de débogage sont absents. Aucun échec navigateur; seul avertissement de compilation : taille habituelle du bundle Phaser (~1,48 Mo minifié / 388 ko gzip).
- Ressources du sac créées avec **imagegen intégré**, enregistrées dans le projet : décor distinct, six poses transparentes à échelle commune, sac séparé. Référence et décor validés du ring préservés. Extraction technique reproductible, sources et prompts dans `references/characters/bag/PROMPTS.md`. Composition du sac inspectée dans Phaser sur ordinateur et paysage mobile; aucun damier peint ni personnage tronqué.
- Régression finale `test:commands` : six formats ordinateur/tactiles passent avec le guide désormais caché sur ordinateur et les menus adaptés à la zone disponible. `test:visibility` confirme encore le boxeur en WebGL près du sac (**2 069 pixels visibles**), du miroir (**2 504**) et de la speed ball (**2 498**); captures mises à jour.
- Serveur Vite existant réutilisé, PID 13241 sur **0.0.0.0:5173**. Wi-Fi revérifié le 11 septembre : **192.168.50.123**. Aucun serveur concurrent ni logiciel supplémentaire installé.

Les essais tactiles sont simulés dans Chromium; aucun essai sur le téléphone physique ni sur Safari/iOS. Le crochet est disponible au sac après l’enchaînement annoncé; son ajout au sparring, les autres ateliers et l’énergie quotidienne restent à faire. Les nouvelles animations utilisent des poses clés, dont les transitions pourront encore être affinées.

## Correction de visibilité et commandes — retour utilisateur

- Menu **Commandes** disponible dans la pause de chaque scène. P/Échap depuis l’aide ramène au menu pause sans reprendre; les commandes de jeu ne sont pas actives dans l’aide. Les boutons de déplacement, de frappe et de pause sont masqués sur ordinateur sans tactile, le guide inférieur était encore visible à cette étape (désormais masqué, voir la phase du 11 septembre). Les appareils tactiles et hybrides conservent leurs contrôles.
- `tests/commands-browser.mjs` : ordinateur **1440 × 1000** et **568 × 320**, trois paysages tactiles **844 × 390, 667 × 375, 568 × 320**, appareil hybride simulé **1024 × 768**. Menus entièrement visibles sans défilement, focus clavier, maintien d’Entrée, perte de focus, gel du chronomètre, absence de frappe pendant l’aide, retour à la pause puis reprise sans ancienne garde ni déplacement. Captures inspectées; aucune erreur navigateur. Capture conservée : `menu-commandes.png`. Il s’agit d’émulation Chromium, pas d’essais physiques.
- Bug reproduit dans WebGL : au sac, la capture rendue était identique avec le sprite affiché ou caché (**0 pixel visible du boxeur**), malgré une position et une interaction valides. Les anciens tests des ateliers vérifiaient la marche et les dialogues, sans mesurer la visibilité du sprite.
- Cause confirmée dans la version installée de Phaser 4.2.1 : `setMask` / `GeometryMask` ne s’appliquent qu’au rendu Canvas. En WebGL, les deux copies de décor censées être découpées recouvraient toute la salle lorsque le joueur passait derrière leur profondeur.
- Correction : filtre de masque WebGL pour ne dessiner que l’équipement concerné; GeometryMask conservé pour le moteur Canvas. Le décor et les sprites sources ne sont pas modifiés.
- `npm run test:visibility` et `GYM_RENDERER=canvas npm run test:visibility` : parcours au clavier jusqu’au sac, au miroir et à la speed ball, captures effectivement rendues comparées avec/sans le sprite, puis interaction. **Plus de 2 000 pixels visibles du boxeur à chaque poste**, dans les deux moteurs. Les captures ont aussi été inspectées visuellement. Le test interdit les avertissements de masque non pris en charge.
- `npm test` : les **44 contrôles** de déplacement, règles de combat, animation, leçons et audio restent réussis.
- Validation intégrée finale : compilation réussie; `test:static` vérifie l’aide dans les deux pauses sur le bundle, puis le sparring et le retour au gym au clavier et au tactile. `test:gym` rejoue marche, ateliers, leçon jab complète, retour, contacts simultanés et orientation. `test:visibility` recontrôle les trois postes avec l’interface finale. `test:browser` conserve frappes, défenses, focus, tactile et round complet terminé après **60,0 secondes réelles**. Aucune erreur navigateur ni ressource manquante. Seul avertissement de compilation : taille habituelle du bundle Phaser.

## Première visite du gym — 10 septembre 2026

- `npm run test:gym` : marche animée et collision avec le ring, conversation sans activation involontaire par Entrée maintenue, leçon jab terminée et retour exactement à la même position. Les quatre ateliers sont rejoints à pied, sans téléportation. Contacts diagonaux, relâchement indépendant, annulation, perte de focus et reprise explicite vérifiés. Même canvas 1280 × 720, menus accessibles aux trois tailles paysage et invitation portrait. Aucune erreur console, page ou ressource. Rapport : `gym-browser-results.json`; captures : `gym-premiere-visite.png`, `gym-dialogue-remi.png`, `gym-mobile-paysage.png`, `gym-mobile-portrait.png`.
- `npm run test:training` : les trois leçons complètes repassent après intégration, ainsi que pause/reprise, bilans, nouvel essai, retour au libre, volume et sourdine persistants, activation par geste et jeu sans Web Audio.
- `npm test` : **44 tests réussis**. Huit nouveaux contrôles couvrent vitesse et diagonales, collisions et glissement, limites de la salle, ateliers accessibles sans interaction à travers le ring, approche de Rémi, pause, reprise et entrées invalides. Les 36 contrôles de sparring, animations, leçons et audio restent réussis.
- `npm run build` : compilation réussie. Avertissement habituel sur la taille du bundle Phaser : environ 1,45 Mo minifié / 380 ko gzip.
- `npm run test:static` : parcours du bundle de production sous `/BoxeurDeux-D/` et `/BoxeurDeux-D/index.html`, sans objets de débogage. Marche au clavier puis au tactile jusqu’à Rémi, sparring, jab, pause, nouvel essai, première réussite de la leçon jab, sourdine et retour au gym. Les deux décors, les douze poses de marche et les vingt poses de sparring se chargent sans erreur. Le délai de déplacement utilise le temps de frame réel pour éviter le ralentissement dû au lissage de démarrage de Phaser.
- `npm run test:browser` : régression du sparring libre via `?scene=sparring`, clavier et contacts simultanés, défenses, relâchements, focus, orientation et réglages. Le round complet termine après **60,0 secondes réelles** puis recommence correctement. Aucune erreur navigateur ni ressource manquante.
- Vérification indépendante de l’interface : marche tactile jusqu’à Rémi, conversation, pause et reprise en **844 × 390, 667 × 375 et 568 × 320**, portrait **390 × 844**. Aucune conversation tronquée, aucun défilement. Le cartouche a été placé en haut pour laisser visibles les pieds. Cent ouvertures et fermetures de conversation ne font pas croître les éléments ou écouteurs DOM après nettoyage.
- Ressources créées par l’imagegen intégré puis contrôlées : transparence RGBA réelle, pas de damier peint dans les sprites finaux, douze poses alignées à une échelle commune et nouvelle pose d’accueil de Rémi. Inspection aux dimensions natives et agrandies. Prompts exacts et script reproductible dans `references/characters/exploration/PROMPTS.md`.
- Décor et personnages du sparring conservés. Salle d’exploration distincte, même résolution logique **1280 × 720** et même cadrage proportionnel sur ordinateur et mobile. Les photos personnelles ne sont pas publiées.
- Vite existant réutilisé sur le port 5173. Adresse Wi-Fi revérifiée : **192.168.50.123**. Aucun serveur supplémentaire, logiciel installé ou service payant ajouté.

**Limites de cette phase :** quatre ateliers présentés mais mini-jeux encore à construire; ni énergie quotidienne, ni ville, ni progression sauvegardée. La marche reste un cycle simple de poses clés. Les essais mobiles sont des fenêtres et événements tactiles simulés dans Chromium, **pas un test sur le téléphone physique ni sur Safari/iOS**.

## Phase leçons de Rémi et son — 10 septembre 2026

- `npm test` : **36 tests réussis** (19 règles et animations conservés, 12 leçons, 5 audio). Les objectifs sont vérifiés sur les échanges résolus : une réussite par ouverture, blocage puis relâchement volontaire et récupération, esquive puis riposte dans la bonne ouverture. Les tests couvrent aussi l’inaction, les erreurs, la pause, les remises à zéro et une troisième réussite juste avant 60 secondes.
- `npm run test:training` : les **trois exercices complets**, chacun avec trois réussites obtenues par de vraies commandes clavier dans Chromium. Pause/reprise, bilan, leçon suivante, nouvel essai et retour au sparring libre passent. Le temps en pause ne fait pas progresser les objectifs. Une perte de focus simulée après un blocage ne valide pas un repos volontaire.
- `npm run test:browser` : parcours clavier et tactile du sparring libre conservé, dont garde et jab simultanés, annulation de contact, esquive, focus, orientation et réglages. Un round complet finit après **60,0 secondes réelles**, puis redémarre avec des statistiques vierges. Aucun échec de ressource ni erreur navigateur. Le premier lancement en parallèle des autres navigateurs a manqué la fenêtre d’une esquive tactile; le parcours isolé a ensuite passé tous ses contrôles sans modification du jeu. Exécuter ces parcours sensibles au temps séparément.
- Audio : absence de contexte avant une interaction; cloche au démarrage; arrêt des sources en pause et sourdine; absence de sons retardés; volume et sourdine conservés au rechargement; réactivation par geste. Sans Web Audio, la commande de son est désactivée et un jab reste jouable.
- L’agent audio a rendu numériquement les dix types de sons avec `OfflineAudioContext` dans Chromium : signaux non silencieux, échantillons finis, crêtes entre 0,0227 et 0,0949 au volume par défaut de 35 %, durée maximale 1,316 s. **Ce contrôle du signal ne remplace pas une écoute sur haut-parleurs ou casque.** Il n’y a pas de boucle d’ambiance.
- `npm run build` et `npm run test:static` : compilation et parcours du vrai bundle réussis sous `/BoxeurDeux-D/` et `/BoxeurDeux-D/index.html`. Clavier et jab tactile, pause, remise à zéro, sélection de la leçon jab, première réussite et sourdine passent sans objet de débogage. Décor et 20 sprites chargés; aucune erreur de page, console ou ressource. Avertissement habituel de taille pour Phaser : environ 1,43 Mo minifié / 373 ko gzip.
- Interface inspectée aux tailles **844 × 390, 667 × 375 et 568 × 320** : choix de séance, pause, bilans des quatre modes, conseils pendant le jeu, volume et boutons accessibles, sans défilement ni déformation. Les bilans utilisés par l’agent pour les contrôles de disposition étaient forcés; les bilans des captures `lecon-*-bilan.png` proviennent des exercices réellement terminés.
- Parcours tactiles de navigation aux trois tailles : changement explicite de séance, leçon suivante, retour au libre, relâchement d’un ancien doigt après perte de focus, portrait **390 × 844** et reprise explicite. Ce sont des fenêtres mobiles simulées dans Chromium, **pas un essai sur le téléphone physique de l’utilisateur ni sur Safari/iOS**.
- Serveur Vite existant réutilisé sur 5173, sans autre serveur. Adresse Wi-Fi revérifiée : `192.168.50.123`. Gym et ressources des personnages inchangés.

Rapport : `training-browser-results.json`. Captures : `lecons-accueil.png`, `lecon-riposte.png` et `lecon-{jab,guard,counter}-bilan.png`. La prochaine étape est une discussion sur le gym explorable; aucune carte ni énergie quotidienne n’a été ajoutée.

## Historique des vérifications précédentes

Vérification après la phase tenues de sparring et fluidité, lancée au « GO » de l’utilisateur. Les contrôles ci-dessous portent sur les ressources `sparring-v2` et le cadrage final.

## Résultats exécutés

- `npm test` : **19 tests réussis**. Les 12 tests des règles couvrent impacts au bon instant, coûts d'endurance, garde, bonne/mauvaise/précoce esquive, récupération, annonces non interrompues, rythme indépendant des boutons, pause, fin à 60 secondes et remise à zéro. Sept tests supplémentaires vérifient la concordance des nouvelles poses avec le contact à 120, 30 et 20 Hz, le maintien de 100 ms, le retour, les frappes simultanées, les esquives et les points transformés, y compris les variantes en miroir.
- `npm run build` : **compilation réussie** avec Phaser 4.2.1 et Vite 8.2.2. Seul avertissement : taille du bundle Phaser (~1,4 Mo minifié, ~366 ko gzip).
- `npm run test:browser` : parcours réel dans Chromium headless, contre le serveur Vite existant sur le port 5173. Clavier : lancement, jab, direct, garde, récupération, esquive directionnelle, pause/reprise, relâchement après perte de focus simulée, réglages et recommencement.
- Le jab augmente le bilan sur la pose de contact; son gant est aligné à moins de 2 pixels de la cible dans la scène. La pose d'extension est maintenue 100 ms. Marques distinctes pour touche, blocage et esquive.
- Inspection visuelle des nouvelles tenues, préparations, extensions et retours. Le cadrage fixe à 88 % conserve une échelle constante des personnages. Contrôle des pixels visibles après transformation : garde, réaction, blocage et esquives entièrement cadrés; jab bloqué jusqu’à y651 et échange jab/jab jusqu’à y702 sur une scène haute de 720 pixels. Les marques d’impact restent alignées aux gants après cette transformation.
- Un **round complet laissé tourner pendant 60 secondes réelles** dans le navigateur atteint le bilan; le bouton de fin redémarre un round avec statistiques remises à zéro.
- Tactile, fenêtre **844 × 390** : événements de contact du navigateur via CDP, garde + jab simultanés, relâchement indépendant des doigts, direct, esquive directionnelle, annulation du contact, portrait avec pause et retour paysage avec reprise explicite.
- Contrôle complémentaire de l'interface par un agent : fenêtres **667 × 375 et 568 × 320**, menus initial/pause/bilan, boutons tactiles accessibles, réglages et remise à zéro. Pas de défilement, pas de déformation du canvas, pas de panneau tronqué. Maintien, sortie du bouton, relâchement et annulation des contacts vérifiés.
- Régression tactile corrigée et ajoutée au parcours automatisé en **568 × 320** : maintenir Garde, perdre le focus, puis relâcher l’ancien doigt ne déclenche plus « Reprendre » sous ce doigt. La pause reste active jusqu’à une nouvelle pression explicite sur le bouton. Menus également vérifiés à la souris, avec Entrée et Espace.
- Portrait **390 × 844** : invitation à tourner visible, scène rendue inactive, round mis en pause. **Ce sont des simulations de fenêtres mobiles, pas un essai sur le téléphone physique de l'utilisateur.**
- Aucun échec de chargement des ressources ni erreur console/page dans le parcours automatisé.
- Le décor de jeu et sa référence restent identiques. Aucun serveur n’écoutait sur 5173 au début de cette phase : un seul serveur Vite a été lancé, puis réutilisé pour tous les contrôles. Réseau Wi-Fi revérifié le 10 septembre : `192.168.50.123`, port strict `5173`.

Résultats horodatés de l'automatisation : `browser-results.json`. Les captures associées sont dans ce dossier : `sparring-accueil.png`, `sparring-jab.png`, `sparring-mobile-paysage.png`, `sparring-mobile-portrait.png` et `sparring-bilan.png`.

## Rejouer les vérifications

### Vérification de l’entrée index — 10 septembre 2026

- `http://127.0.0.1:5173/index.html` ouvre le sparring actuel : accueil, démarrage et jab compté vérifiés dans Chromium.
- Les 19 tests et la compilation ont été rejoués avec succès.
- La compilation de `dist/index.html` a été servie au navigateur par interception HTTP locale sous `/BoxeurDeux-D/`, sans serveur supplémentaire ni mise en ligne. Le décor et les 20 sprites v2 se chargent depuis ce sous-dossier; démarrage, jab, pause et recommencement réussissent sans erreur navigateur. Ce contrôle ne prouve pas un déploiement sur GitHub Pages.

### Commandes

```sh
npm test
npm run build
npm run test:browser
npm run test:training
npm run test:gym
npm run test:static # Après npm run build : compilation servie localement par interception HTTP
```

La vérification navigateur est facultative pour lancer le jeu. Elle utilise Playwright déjà présent dans l'environnement de développement. Sur une autre machine, fournir le chemin de son installation avec `PLAYWRIGHT_MODULE_PATH=/chemin/vers/playwright/index.mjs npm run test:browser`. Aucune dépendance de test ni navigateur supplémentaire n'a été installé pour cette mission. Le serveur Vite doit déjà tourner sur 5173.

Pour essayer manuellement : frappez pendant les ouvertures; maintenez puis relâchez la garde; préparez l'esquive sur « Préparez » et déclenchez-la sur « Esquivez ». Une mauvaise direction ou un départ trop tôt reste punissable. Essayez aussi un changement d'onglet avec la garde tenue, puis un retour en paysage après rotation.

## Préparation de GitHub Pages — 10 septembre 2026

- La page publique a été récupérée : elle contient encore l’index du commit initial et son import `/src/main.js`. La capture utilisateur correspond bien à cette ancienne page non compilée.
- Le prototype complet est enregistré dans Git, ainsi que ses ressources, sources graphiques et vérifications. Le workflow `pages.yml` installe les dépendances verrouillées, lance les tests autonomes, compile le jeu et déploie uniquement `dist/`.
- Validation locale du YAML : déclenchement sur `main`, dépendance du déploiement envers la compilation, permissions Pages et répertoire d’artefact. Les références des cinq actions officielles sont épinglées à des commits vérifiés sur leurs dépôts. Le premier workflow distant du commit `004b805` a ensuite réussi : installation, tests, compilation, transfert de `dist/` et déploiement.
- `npm test`, `npm run build` et le nouveau `npm run test:static` réussissent. Ce dernier teste le vrai bundle de production sans accès aux objets de débogage : `/BoxeurDeux-D/` et `/BoxeurDeux-D/index.html`, 20 sprites v2, clavier et jab tactile, pause, recommencement, paysage 844 × 390 sans défilement et portrait 390 × 844. Aucune erreur de page, console ou ressource.
- L’authentification du terminal était initialement absente. Blocage résolu en réutilisant le helper Git officiel de VS Code avec son socket IPC actif : test d’envoi puis `git push origin main` réussis. Aucun mot de passe ou jeton demandé à l’utilisateur ni affiché dans les sorties. La tentative séparée de connexion GitHub CLI a été annulée.
- Pages utilisait encore `legacy` avec `main` à la racine : ce déploiement automatique a republié l’index source après le premier workflow Vite. La source a été changée en `workflow` via l’API GitHub, puis relue pour confirmer **GitHub Actions**. La publication Vite du commit `e131feb` a ensuite réussi et le site public a passé le parcours navigateur. Les futurs envois utilisent ce workflow, sans déploiement de branche concurrent.
- Après l’envoi et la réussite du workflow, vérifier l’adresse réelle avec `SPARRING_URL=https://mixmasterkd.github.io/BoxeurDeux-D/ npm run test:static`. Un contrôle local de la compilation ne prouve pas que le site public a été actualisé.

## Limites restantes

- Animation par poses clés originales, avec anticipation, demi-extension, contact et récupération; les transitions et certaines variations de jambes pourront encore être affinées par des images intermédiaires. Dix poses par boxeur, dont quelques variantes en miroir, sans morphing. Sources, prompts exacts et préparation dans `references/characters/sparring-v2/README.md` et `PROMPTS.md`.
- Sparring volontairement réduit : pas de KO, sélection tête/corps, crochets, déplacement en profondeur, carrière ou combats officiels.
- Les tests navigateur couvrent Chromium; validation physique sur téléphone et essai Safari/iOS restent à faire.
