# Combats, coin et juges — 13 septembre 2026

## Comportement livré

- Combats officiels : trois rounds de 45 secondes. Sparring et exercices de Rémi conservés.
- Dégâts joueur officiels : jab 5, direct 7, crochet 9 ; puissance entraînée proportionnelle jusqu’à +20 %. Le direct appris J–J–K ajoute 1,5 avant ce bonus. Timings, coûts, buffer et moment du contact conservés.
- Relevés officiels : 80 %, 72 %, puis 65 % du maximum individuel. Toujours KO au compte de dix, arrêt à trois chutes dans le round/quatre dans le combat ; Kramer abandonne après deux chutes cumulées.
- Résistance et danger montent de Béton au tournoi, puis aux défis avancés. Tells conservés, ouvertures raccourcies mais adaptées à un contre ; aucune lecture des boutons ou protection invisible ajoutée.
- Coin de Fredo : neuf secondes actives, huit pressions alternées J/K ou A/B au rythme. +20 résistance garantis, bonus de 0 à 8 ; plafond personnel respecté. Passer avec E ou le bouton conserve le bonus acquis. Endurance pleine au round suivant ; le départ attend E/A. Pause, perte de focus et portrait interrompent le mini-jeu sans perdre son état.
- Juges : trois cartes déterministes, chaque round vaut 10–9 ou 10–10 avant déduction d’un point par chute. Touches nettes prioritaires ; précision/défense seulement dans un round très serré. Majorité des cartes pour gagner ; égalité sans avancement du tournoi. Aucun hasard ni cumul de dégâts utilisé pour décider.
- Présentation : cartes à 1/3/5 secondes, verdict à 7 secondes ; les dernières frappes ne peuvent pas ouvrir un menu pendant l’annonce. Le résultat est déjà sauvegardé une seule fois. Le détail des rounds utilise un bouton accessible à la convention E/A.

## Ressources

L’arbitre original provient de l’outil imagegen intégré. Trois poses cohérentes, sources et prompts dans `references/characters/referee/`, alpha réel et alignement dans `public/assets/sprites/referee/`. Extraction reproductible par `scripts/prepare-referee.mjs`. Les combattants, tenues et décors existants sont réutilisés. Le joueur vainqueur tend réellement son gant vers la main de l’arbitre ; pour une victoire adverse, l’arbitre indique son côté et l’adversaire garde sa pose existante. Une pose de célébration propre à chacun reste un ajout visuel possible.

## Vérifications

- `npm test` : 374 tests autonomes réussis, dont les anciens contrats de contact, sauvegarde, économie et déplacement.
- `fight-progression.test.js` : 32 combats avec une perception retardée de 150 ms, huit adversaires, statistiques normales/maximales, 20/60 Hz. Les contres gagnent sur plusieurs rounds ; Kramer conserve son abandon. Douze essais de frappes aveugles/aléatoires aux statistiques maximales perdent contre les trois adversaires avancés. Les trois cloches réelles du modèle mènent à une décision.
- `corner-recovery.test.js` : huit respirations, erreurs, martelage, passage, bonus plafonné/appliqué une seule fois, pause et absence de modification des touches/temps du round.
- `bout-judges.test.js` : victoire/défaite/nul, score par round plutôt que cumul, chutes, décisions partagées, symétrie et absence de récompense pour la défense passive.
- `fight-presentation-browser.mjs` : fixtures de rendu explicitement séparées du gameplay, trois résultats sur ordinateur et mobile 568 × 320. Contrôle des trois scores réellement visibles sans défilement, détails avec E, cercle de respiration accessible, aucun débordement. Captures `decision-fixture-*` et `corner-fixture-*`.

- `fight-pacing-browser.mjs` : deux combats réellement joués par entrées clavier / CDP tactile, trois rounds complets de 45 secondes chacun. Béton sur ordinateur et Bellini sur mobile 568 × 320, deux coins avec bonus, pause clavier / bascule portrait, victoire aux points, sauvegarde unique, revanche / retour au tournoi. Aucune écriture du moteur pour produire ces résultats. Rapport `fight-pacing-browser-results.json`, captures `judges-*` et `fredo-recovery-*`.
- `fight-built-browser.mjs` : compilation servie sous `/BoxeurDeux-D/` par interception locale, aucun serveur concurrent ni pont DEV. Vrai round de 45 secondes défendu au joypad, coin, pause/reprise, passage puis round 2 ; largeur mobile 568 et 844 vérifiée, quatre ressources arbitre chargées sans erreur. Rapport `fight-built-results.json`.
- `npm run build` réussit : `index-oSos2UJu.js` et `index-BIlHaQu6.css`. Avertissement historique de taille du bundle Phaser conservé.

Les essais mobiles sont des viewports tactiles Chromium simulés, pas un essai sur le téléphone physique de l’utilisateur. Le barème des juges est celui du jeu, pas une reproduction réglementaire. L’équilibrage reste à affiner avec le ressenti de vraies parties ; aucune durée minimale ou invulnérabilité n’empêche une très bonne victoire rapide.

## Publication vérifiée

Commits `2a3f088` (art) et `7bb0e98` (jeu et contrôles) publiés sur GitHub Pages. Workflow **34779348402** réussi. Le vrai site `https://mixmasterkd.github.io/BoxeurDeux-D/` a rejoué le parcours compilé : round de 45 secondes défendu au tactile, Fredo, pause/reprise, passage et round 2, tailles 568/844, quatre ressources arbitre HTTP 200, aucune erreur. Voir `fight-public-results.json` et `fredo-public.png`.

Le JS public `index-oSos2UJu.js` est identique au build local : SHA-256 `0dbf7780c531da4e9f5978300256f8c4b60c830ba8e1dd8e59848d7f48a5202f`. Serveur Vite existant réutilisé sur `127.0.0.1:5173`, Wi-Fi vérifié `192.168.50.123:5173` ; aucun nouveau serveur ni port changé.
