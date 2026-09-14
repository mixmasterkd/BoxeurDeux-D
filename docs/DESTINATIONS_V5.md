# Mexique et hôtel des Gants dorés

## Ce qui est intégré

Le Mexique comprend trois extérieurs qui défilent (village, promenade/plage, arènes) et deux intérieurs (posada, gym). Les portes et passages fonctionnent en marchant. Le lit passe au lendemain sans bonus de compétence. Le kiosque VUELOS ramène à l’aéroport de Montréal, retour déjà compris. La réservation/embarquement, les paiements et leur persistance appartiennent au modèle de carrière V5.

Au gym : **The Octopus** aux pads, conformément à la correction de l’utilisateur en cours de mission, et **Pablo** comme partenaire de sparring. Pablo a deux sprites d’exploration propres, avec les mêmes proportions que le joueur ; ses poses de combat sont distinctes. Les pads utilisent quatre nouvelles poses fidèles de The Octopus et leurs cibles sont placées sur les cercles dorés réels. Fredo reste le coach des autres lieux. Le ring officiel de **Danielo** se rejoint à pied dans les arènes au sol en terre.

L’hôtel conserve son parcours pour les Gants de bronze. Pour les Gants dorés, le hall ajoute la porte **RESTO**, le tableau/les participants présentent Rafael Ríos, Émile Moreau et Thiago Santos, et le restaurant **La Croûte dorée** permet de choisir le pain, le faire griller et le garnir en trois stations physiques. Cette pause n’ajoute aucune compétence, ne coûte pas d’énergie et ne modifie pas l’argent. Les deux halls ont des clés de texture distinctes, pour ne pas conserver l’ancien décor dans la même session.

## Fichiers

- `src/game/MexicoWorld.js`, `src/scenes/MexicoScene.js` : lieux, seuils, collisions, PNJ, activités et retour.
- `src/game/HotelWorld.js`, `src/game/HotelBoard.js`, `src/scenes/HotelScene.js` : édition dorée et restaurant.
- `src/scenes/HotelActivityScene.js` : coach et textures séparés selon destination, retour au gym correspondant.
- `public/assets/mexico` : sept décors originaux. `public/assets/hotel/{lobby-gold,restaurant}.png` : deux décors supplémentaires.
- `public/assets/sprites/mexico-pablo` et `public/assets/sprites/octopus-pads` : personnages préparés avec transparence réelle.
- Sources et prompts : `references/mexico/PROMPTS.md`, `references/characters/octopus-pads/PROMPTS.md`.
- Scripts de préparation : `scripts/prepare-mexico.mjs`, `scripts/prepare-pablo-world.mjs`, `scripts/prepare-octopus-pads.mjs`.

## Vérifications effectuées

`node --test tests/mexico-world.test.js tests/hotel-world.test.js tests/hotel-board.test.js tests/pads-motion.test.js` : **30 tests réussis**. Approches de tous les objets/portes, absence de rebond à l’arrivée, isolement des collisions bronze/doré, identités du tableau, bon/mauvais pad, cibles anatomiques et contact/score identiques à 20 et 60 Hz pour les deux coachs.

Quatre parcours Chromium isolés ont été exécutés avec `tests/destinations-browser.mjs`, sur le Vite existant, avec les profils de démonstration construits via l’API du terminal. Après cette préparation, les déplacements, confirmations, portes et coups utilisent réellement le clavier ou les événements tactiles CDP :

- `DEST_PART=mexico DEST_DEVICE=desktop` : 9 cas, 0 erreur, incluant la version finale The Octopus.
- `DEST_PART=mexico DEST_DEVICE=mobile` : 9 cas, 0 erreur, version finale The Octopus, vue paysage 568 × 320 ; portrait 390 × 844 avec invitation et pause.
- `DEST_PART=gold DEST_DEVICE=desktop` : 6 cas, 0 erreur.
- `DEST_PART=gold DEST_DEVICE=mobile` : 6 cas, 0 erreur, 568 × 320.

**30 cas navigateur** : sommeil conservant la carrière, vraie touche aux pads avec erreur visuelle inférieure à 0,01 px, vrai jab contre Pablo et Danielo, dépenses 10 + 20 énergie et aucun coût quotidien du combat officiel, marche entre les cinq lieux, retour après chaque activité, vol gratuit vers l’aéroport. Restaurant complet sans mutation d’argent/énergie/compétences, retour au hall, salle et tableau des bons participants.

Les premiers essais dorés ont détecté des sprites Santos encore en cours de génération ; les quatre rapports finaux remplacent ces états intermédiaires et sont tous verts. Les captures `docs/destinations-*.png` montrent le résultat réel dans Chromium. Les rapports détaillés sont `docs/destinations-{mexico,gold}-{desktop,mobile}-browser-results.json`.

L’essai mobile est une **simulation de fenêtre et de tactile**, pas un essai sur le téléphone physique de l’utilisateur. La validation des trois journées complètes des tournois, de la sauvegarde et des frais se trouve dans les tests du modèle de carrière ; le présent parcours visuel ne prétend pas avoir gagné les trois combats dorés au clavier.
