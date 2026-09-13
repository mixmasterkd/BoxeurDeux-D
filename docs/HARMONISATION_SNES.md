# GO — cohérence SNES, Fredo, The Octopus et exploration

Ce GO suit le chapitre livraisons/boutiques/tournoi. Il conserve les sauvegardes et tous les lieux existants. Les deux ou trois prochains adversaires et le camp à Cuba restent futurs.

## Contrat utilisateur

- Fenêtres et menus de style SNES, lisibles et entièrement dans le cadrage 1280×720 commun PC/mobile. Joypad et A/B dans les marges mobiles; aucun contrôleur live sur PC.
- Convention affichée : WASD déplacements/menus/défenses, E interaction et confirmation, J/K frappes, P/Échap pause/retour. Entrée et Espace ne confirment plus. Souris disponible dans les menus; mobile joypad+A/B+menu.
- Franchir les portes et limites de quartiers en marchant, sans confirmation et sans rebond automatique au retour.
- Ascenseur hôtel entre étage des chambres et RC seulement; depuis un vrai RC défilant, marcher vers accueil, gym, piscine, salle des quatre rings.
- Fredo est le coach partout, en Adidas bleu marine à trois bandes blanches. Photos fournies comme références de visage. Rémi reste le partenaire de sparring.
- Pads libres : Fredo tient sa cible jusqu’à la frappe; jab gauche vers sa gauche anatomique (droite écran), direct droit vers sa droite (gauche écran). Comptage au contact réel, pause et énergie conservées.
- The Octopus, ami boxeur professionnel du joueur, se tient au gym. Dialogues, conseils selon l’adversaire débloqué et trois drills de pratique. Chandail POULIN noir avec poulpe blanc vendu45$, équipé à la maison avec tuque rouge.
- Meilleure réponse jab/direct, petite mémoire de frappe en fin de retour, vidée aux interruptions. Harmoniser les visuels de tournoi avec le combat/sparring.
- Dépôt de livraison évident et accessible; numéros/rues/secteurs précis; tournée répartie dans trois secteurs avec vélo et chrono sauvegardés aux transitions. Compatibilité anciennes tournées.
- Métro inspiré de Montréal : stations explorables, train aller/retour et secteur Des Rives avec accès futurs bloqués par les cônes.

## Intégration

Agents séparés : UI/commandes; mondes/portes/livraisons/métro; combat/pads et uniformes. Intégration, personnages Fredo/Octopus/chandail, drills, vérification finale et documentation par l’agent principal. Serveur existant réutilisé sur5173. Aucun service payant ni IA nécessaire en partie.

L’imagegen intégré produit les illustrations. Sources, prompts et extraction technique conservés dans references/characters/{fredo,octopus,outfits/street-octopus} et references/world-flow. Transparence contrôlée : les sorties au faux damier sont rejetées, pas utilisées comme sprites.

Le dernier ajustement demandé concerne les proportions : joueur, Rémi et amis du gym utilisent une échelle de 1,25, avec empreintes adaptées. Fredo et Octopus ont des petites silhouettes d’exploration dédiées (source dans `references/characters/gym-explorers`), distinctes de leurs grandes illustrations d’atelier. Dans le métro, le joueur passe de 2 à 1,25 et son empreinte à 16 × 8 de demi-dimensions : il tient sous le cadre de la porte du train. La maison et les boutiques conservent leurs dimensions.

## Vérifications locales terminées

- **304 tests autonomes** : combat, résistance, cadence, mémoire de frappe, contact des pads, exercices d’Octopus, sauvegardes, énergie, itinéraires, portes et collisions.
- **Compilation Vite réussie** : bundle `index-P3OQdXPr.js`, style `index-CZezE5qH.css`. Le signalement de taille du bundle Phaser reste informatif.
- **Menus : 32 parcours**, plus huit dialogues d’achat/sommeil/tableau, au clavier et en paysages tactiles simulés. Contrôles E/WASD, rejet Entrée/Espace, défilement, perte de focus, portrait, sauvegarde/import et fenêtres contenues. Rapports `snes-menus-browser-results.json` et `snes-dialogs-browser-results.json`.
- **Combat : huit parcours** de sparring/pads locaux/pads hôtel/uniformes, avec J–K–J rapide et contacts réellement joués. Vrai round Bellini de 60 secondes, 22 blocages, coin Fredo puis round 2. Les fenêtres sont vérifiées réellement invisibles pendant le combat, y compris après reprise; une erreur de priorité CSS découverte à l’inspection a été corrigée. Rapports `refined-*-results.json` et `snes-corner-browser-results.json`.
- **Exploration : huit parcours** clavier/tactile : trois livraisons dans trois secteurs, achats, portes automatiques, chambre/ascenseur/RC/gym/piscine/salle, métro/train/escaliers et reprise sauvegardée. Rapport détaillé dans `WORLD_FLOW_VERIFICATIONS.md`.
- **Visibilité des ateliers du gym** : approche à pied et ouverture des dialogues du sac, du miroir et de la speed ball. Comparaison des captures avec/sans joueur : respectivement 4 282, 4 956 et 4 899 pixels de personnage réellement rendus en WebGL, avec la nouvelle échelle. Captures `gym-visible-{sac,miroir,speedball}.png`.
- **Proportions mesurées sur les captures de production** : joueur du métro environ 101–105 pixels pour une ouverture de porte de 126; gym joueur 109, Fredo 101–104, Octopus 113–114, Rémi 117–118. Ordinateur et paysage tactile 568 × 320, mesures indépendantes des hooks Phaser. Rapports ciblés `harmonization-static-actors-results.json` et `harmonization-static-metro-results.json`.
- **Amis du gym : sept parcours** : chacun des trois drills terminé au clavier puis au tactile; pads locaux et retours exacts, débit de 10 par activité, aucun bonus sportif automatique, énergie et position conservées après rechargement. Septième parcours : achat du chandail pour 45 $, équipement séparé dans la garde-robe atteinte à pied, tenue conservée au rechargement. Rapport `gym-friends-browser-results.json`, aucune erreur. Les premiers essais ont révélé des hypothèses de trajet/position trop strictes dans le test; les points d’approche ont été corrigés pour respecter les nouvelles empreintes visibles.
- **Production sous `/BoxeurDeux-D/` : 32 contrôles**, 179 ressources chargées sans erreur, sans hooks de développement et sans lancer un autre serveur. Les tests pilotent les commandes réelles; les seules sauvegardes préparées servent à isoler les points de départ et fonds nécessaires. Rapport `harmonization-static-results.json`.

Les captures couvrent ordinateur et simulations tactiles 844 × 390 et 568 × 320. Aucun de ces essais ne prétend remplacer un essai sur le téléphone physique de l’utilisateur. Les rapports du chapitre précédent restent historiques.

## Limites conservées

Des Rives est une petite extension explorable avec cônes; aucun nouveau combat ni camp à Cuba n’est ajouté. Les drills d’Octopus restent de la pratique guidée, sans bonus sportif automatique. Le motif POULIN est simplifié pour la lecture des pixels. Les habitants d’ambiance et plusieurs éléments du décor restent fixes. La sauvegarde demeure locale au navigateur, avec export/import manuel pour changer d’appareil.

## Publication

Les commits `c97b10f` et `6b0e574` sont publiés. Le workflow [34732616759](https://github.com/mixmasterkd/BoxeurDeux-D/actions/runs/34732616759) a réussi. Le vrai site [BoxeurDeux-D](https://mixmasterkd.github.io/BoxeurDeux-D/) passe ensuite **32 contrôles ordinateur et tactile simulé**, avec **179 ressources chargées et aucune erreur de page, console ou réseau**. Les mesures de proportions, pads, drill, chandail, métro et hôtel sont incluses. Preuve distincte : `harmonization-static-public-results.json`; captures `harmonization-static-public-*.png`.

Le bundle public `index-P3OQdXPr.js` est identique octet par octet au fichier compilé localement : SHA-256 `8f88937ec1a0ccb173f7c36869003887926c3a5550981c67314dcdd89ab34241`. Le serveur de développement existant est réutilisé sur `http://127.0.0.1:5173/`; Wi-Fi vérifié : `http://192.168.50.123:5173/`. Aucun service distant supplémentaire n’a été configuré.
