# Hôtel, pads et piscine — vérifications du 12 septembre 2026

## État livré

Six lieux explorables reliés par portes et ascenseur : chambre 201, couloir, réception, mini-gym, piscine, salle d’événement. Le couloir et la salle défilent derrière la caméra fixe 1280 × 720. Les quatre rings existent dans le décor, avec de petites rencontres animées, des gradins et des participants rencontrables. Les adversaires principaux utilisent leur identité visuelle de combat. La tenue choisie est conservée par `OutfitView`.

Le tableau présente huit participants et le parcours quart/demi/finale. Il révèle les résultats déjà obtenus, conserve le résultat d’une élimination et présente la récompense. Une victoire des deux premiers jours demande de retourner au lit; le sommeil conserve les compétences et remplit uniquement l’énergie quotidienne. Le lit ne saute jamais un combat encore à faire. Le retour au quartier reste proposé, avec confirmation explicite si cela abandonne une inscription en cours.

Pads : les cibles de Rémi annoncent jab, direct, gardes haute/basse et esquives. Même convention que les combats : J/K, directions, ou A/B et joypad. Une garde peut être maintenue; elle doit être encore tenue au contact. Piscine : alternance des bras, douze bonnes poussées par longueur. Deux séances de 45 secondes, coût annoncé de 10 énergie au démarrage; pause et reprise gratuites, abandon sans gain. Les acquis restent plafonnés par la carrière.

## Vérifications réalisées

- `node --test tests/hotel-*.test.js` : **25 tests passent**. Séances complètes jouables, points uniquement au contact, pause, maintien/relâchement des gardes, martelage non récompensé, limites du bassin, accès à chaque porte/activité, validation des positions sauvegardées et cohérence du tableau.
- `node tests/hotel-browser.mjs` : **PC et tactile CDP 844 × 390 réussis**, sans erreur de page ni ressource. Marche réelle chambre → couloir → ascenseur → pads → piscine → salle, interaction avec tableau et invitation Bellini, coûts/reprise/abandon, rechargement et position conservée. Portrait suspend; menu et boutons en marges à 568 × 320. Le test mobile utilise le joypad et A/B par événements tactiles CDP.
- `node tests/hotel-sessions-browser.mjs` : **quatre séances réelles de 45 secondes réussies**, PC et tactile. Pads : 29 mouvements, 100 %. Piscine : 52 poussées, 4 longueurs, 100 %. Pause/reprise au milieu de chaque séance, un seul débit de 10, gain +1 puissance ou +2 endurance, conservation au rechargement. Aux contacts des jabs/directs, le gant et la manopla concordent à moins de 0,1 pixel dans les coordonnées de jeu.
- `node tests/hotel-stay-browser.mjs` : **séjours PC et tactile réussis**. Annuler puis confirmer le sommeil après le quart, reprendre au jour 2, dormir après la demi vers le jour 3, perte de focus et portrait durant la nuit sans reprise automatique, résultat or conservé, visite de la réception, choix rester ou rentrer, retour au quartier et rechargement sans doubler la médaille. Cas d’élimination en demi avec bronze et retour au quartier également réussi.

Pour ce dernier contrôle, les résultats des combats sont des **fixtures métier importées par la vraie interface de sauvegarde entre les rencontres**. Ce test vérifie les transitions de séjour et les sauvegardes, pas la capacité à battre les adversaires : les combats ont leurs tests séparés. Les gestes, menus, nuits et transitions décrits sont exécutés dans le navigateur.

Les rapports détaillés sont `hotel-browser-results.json`, `hotel-sessions-browser-results.json` et `hotel-stay-browser-results.json`. Tous ont `errors: []` et `failure: null` au dernier passage réussi.

## Contrôles visuels

Captures de la chambre, du couloir, de la réception, des pads, de la piscine, des deux parties de la salle et du portrait dans `docs/hotel-*.png`. Inspection des poses générées, transparence réelle dans le bassin, alternance des bras, taille adulte du joueur, alignement des cibles et boutons tactiles hors de la scène. L’allée gauche du bassin a été corrigée après un essai tactile : les collisions suivent maintenant sa perspective au lieu d’utiliser un grand rectangle qui resserrait le passage.

Dernier ajustement visuel : les quatre rencontres d’ambiance utilisent les uniformes de compétition bleus et rouges, avec garde, jab et blocage. Les captures des deux portions de la salle ont été renouvelées sur PC et mobile simulé; les quatre paires utilisent les textures attendues, sans teinte additionnelle et sans erreur de chargement ou d’exécution. Cette modification ne touche ni le tournoi ni les mini-jeux.

Les contrôles mobiles sont **simulés dans Chromium**, sans essai sur le téléphone physique de l’utilisateur. Les personnages des autres rings sont de l’ambiance; leurs mouvements ne simulent pas des combats complets et n’affectent pas la catégorie du joueur. La sauvegarde reste locale au navigateur.

Sources, prompts, dimensions et préparation : `references/hotel/README.md` et `references/hotel/PROMPTS.json`. Tous les fonds et sprites utilisés sont conservés dans `public/assets/hotel/`; aucune génération n’est requise pendant une partie.
