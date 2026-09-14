# Animation du métro — 13 septembre 2026

Deux retours utilisateur : le quai doit défiler avant de laisser apparaître le tunnel, puis revenir progressivement à l’arrivée; un second embarquement affichait une fenêtre agrandie à la place du wagon entier.

## Correction

L’ajout d’un découpage avec `Texture.add()` change `firstFrame` dans Phaser. La visite suivante utilisait ce cadre par défaut et l’étirait à 1280 × 720. Les fonds d’exploration demandent maintenant explicitement `__BASE`. Les nouvelles fenêtres utilisent leurs propres textures sans ajouter de cadres au décor du wagon.

Le panorama est continu : fermeture à quai, accélération, passage de l’entrée du tunnel devant les vitres, tunnel, retour progressif du quai pendant le freinage et immobilisation avant ouverture. La frontière traverse les fenêtres dans l’ordre correspondant au sens du train. Les poignées, cadres et barres restent fixes. Les petites vitres des portes coulissantes montrent le même extérieur, en suivant le déplacement des portes.

`TrainWindowMotion` déduit la distance du temps réel de trajet, avec accélération/freinage et maintien de la position au terminus malgré l’inversion du sens. Il ne modifie ni horaires (8 s à quai, 4 s entre les arrêts), ni destinations, ni commandes, ni sauvegardes, ni coûts. Pause, perte de focus et portrait continuent de suspendre le trajet. `MetroWindowView` utilise des petites portions de TileSprite; pas de masque réservé à un moteur de rendu.

Une planche originale a été créée avec la génération d’images intégrée; source et prompt dans `references/metro-motion/`. `scripts/prepare-metro-windows.mjs` extrait et dimensionne uniformément les deux panoramas. Aucun service de génération appelé pendant le jeu.

## Vérifications

429 tests autonomes et compilation réussis. Les trois nouveaux tests couvrent la fermeture encore à quai, les transitions successives, la pause, la continuité au terminus et l’indépendance du débit d’images. Les 9 contrôles métro ordinateur et 9 contrôles tactiles simulés passent : directions, descentes, hall, rechargement, portrait, pause et réservation/embarquement à l’aéroport.

Le scénario ciblé `tests/metro-windows-browser.mjs` effectue trois embarquements dans le même cache de textures par format. Il compare les pixels du wagon, des poignées et de la barre à travers les phases et après remontée; capture départ/tunnel/arrivée; vérifie l’immobilité des pixels pendant la pause. Il enregistre également le premier trajet sur le canvas avec MediaRecorder. Les avertissements Chromium liés à ReadPixels pendant les captures sont conservés séparément des erreurs ou avertissements du jeu.

Le parcours ciblé local passe sur les deux formats : six embarquements, pixels fixes et pause vérifiés, sans erreur JavaScript/console/HTTP ni avertissement du jeu. Rapport `metro-motion-local-results.json`, séquence `metro-motion-local-journey.webm` et captures `metro-motion-local-*.png`. Le bundle compilé passe le même parcours dans les deux formats sous `/BoxeurDeux-D/`, sans hook de jeu DEV : six embarquements et contrôles de pixels/pauses, zéro erreur. Rapport `metro-motion-built-results.json`. Publication en cours. Les essais mobiles sont des simulations Chromium 568 × 320 avec événements CDP; aucun téléphone physique testé.
