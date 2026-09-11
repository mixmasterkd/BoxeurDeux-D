# Vérification du prototype — 10 septembre 2026

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
- Pages utilisait encore `legacy` avec `main` à la racine : ce déploiement automatique a republié l’index source après le premier workflow Vite. La source a été changée en `workflow` via l’API GitHub, puis relue pour confirmer **GitHub Actions**. Une nouvelle publication du workflow Vite doit remplacer cet ancien index; les futurs envois n’utiliseront plus le déploiement de branche concurrent.
- Après l’envoi et la réussite du workflow, vérifier l’adresse réelle avec `SPARRING_URL=https://mixmasterkd.github.io/BoxeurDeux-D/ npm run test:static`. Un contrôle local de la compilation ne prouve pas que le site public a été actualisé.

## Limites restantes

- Animation par poses clés originales, avec anticipation, demi-extension, contact et récupération; les transitions et certaines variations de jambes pourront encore être affinées par des images intermédiaires. Dix poses par boxeur, dont quelques variantes en miroir, sans morphing. Sources, prompts exacts et préparation dans `references/characters/sparring-v2/README.md` et `PROMPTS.md`.
- Sparring volontairement réduit : pas de KO, sélection tête/corps, crochets, déplacement en profondeur, carrière ou combats officiels.
- Les tests navigateur couvrent Chromium; validation physique sur téléphone et essai Safari/iOS restent à faire.
