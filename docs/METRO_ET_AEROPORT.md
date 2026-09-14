# Métro et aéroport

Réseau compact fictif inspiré de Montréal : **Quartier ↔ Des Rives ↔ Île Sainte-Hélène ↔ Stade olympique ↔ Aéroport**. Chaque nom indique un lieu réellement accessible dans le jeu. Le plan donne aussi les activités voisines.

Avancer dans la porte du train fait monter à bord. Le train roule quatre secondes entre les arrêts et laisse ses portes ouvertes huit secondes. Le joueur peut rester à bord aussi longtemps qu’il le souhaite : descendre exige d’avancer dans la porte ouverte. Au terminus, le train repart dans l’autre direction. Un arrêt raté n’interrompt donc pas le trajet.

Le panneau « PLAN » sur chaque quai permet de consulter le réseau et de choisir la direction du train avant de monter. À bord, le plan est près de la porte; il est également disponible dans le menu pause. Les panneaux et l’en-tête indiquent la station actuelle ou le prochain arrêt. Les portes glissent et le tunnel défile aux fenêtres.

Commandes identiques au reste du monde : WASD/flèches, E pour le panneau ou le comptoir; mobile en paysage, joypad et A. P/Échap ou le bouton menu met aussi le train en pause. Perte de focus et portrait le suspendent. Aucun déplacement ne consomme d’argent ni d’énergie.

Une recharge pendant le trajet reprend sur le quai de la dernière station atteinte. Le train n’est pas réinitialisé avec le personnage perdu dans un état de porte intermédiaire.

À l’aéroport, le comptoir réserve les séjours à Cuba et au Mexique pour 160 $ chacun, comme le navigateur du laptop. La réservation ne transporte pas le joueur : il faut ensuite avancer dans la porte portant le nom du pays. L’embarquement et le retour inclus ne débitent pas une deuxième fois le billet. L’escalier central rejoint le métro.

## Intégration

- `MetroScene` gère les cinq quais, `metro-train` et `airport`.
- Paramètres du train : `{place:'metro-train', station:'metro-island', direction:-1}`.
- `MetroNetwork.js` donne les arrêts, destinations et points de sortie; `MetroWorld.js` porte les collisions alignées sur les ressources.
- `TrainSession.js` porte les arrêts, le sens et le temps, indépendamment du rendu.
- Les ressources originales sont dans `public/assets/metro/`, les sources et prompts dans `references/world/metro/`. La station validée n’a pas été remplacée.

## Vérifications

`node --test tests/metro-network.test.js` vérifie les cinq connexions, l’aller-retour complet, les arrêts, le blocage des portes, la pause, la reprise sur un quai et l’accès physique aux deux portes et au comptoir de l’aéroport.

`node tests/metro-browser.mjs` joue le parcours au clavier et au tactile simulé en 568 × 320 : plan via pause, montée en marchant, arrêt dépassé volontairement, descente choisie, direction inverse, reprise après recharge, deux réservations et embarquement sans second paiement. Il vérifie également le portrait et que les commandes restent hors de l’image. Résultats et captures dans `docs/metro-browser-results.json` et `docs/metro-*.png`. Il ne s’agit pas d’un essai sur un téléphone physique.
