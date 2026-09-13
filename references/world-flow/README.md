# Décors de l’exploration et du métro

Ressources originales produites avec l’outil intégré ImageGen, d’après les décors locaux déjà validés. Aucun service ni abonnement n’est utilisé pendant une partie.

Chaque `*-source.png` conserve le résultat original; les fichiers `.txt` contiennent les prompts exacts. Les PNG finaux se trouvent dans `public/assets/world/` et `public/assets/hotel/lobby-ground-floor.png`.

- `hotel-lobby` : nouveau RC explorable, 1920 × 1080, accueil et portes du gym, de la piscine et de la salle de boxe; ascenseur vers les chambres.
- `metro-platform` puis `metro-stairs` : même quai pour deux stations, signalétique dynamique pour Quartier / Des Rives. Correction de la barre transversale devant l’escalier; la transition se produit au seuil, avant d’entrer dans le décor de l’escalier.
- `riverside` : petit secteur Des Rives, 1586 × 992, commerces fermés et rues bloquées par des cônes. Affichage à une échelle uniforme de 1,5 avec caméra mobile de 1280 × 720.
- `neighborhood-metro` : seule la façade du local fermé est extraite (x1230, y675, 276 × 190) pour remplacer son entrée par le métro. Le quartier original et son ouverture ouest restent conservés.
- `depot-kiosk` : extraction du guichet bleu et jaune (x977, y624, 69 × 123), ajouté à droite de l’entrepôt. Le point d’interaction est accessible depuis la rue sans devoir contourner tout le bâtiment.

Les extractions et tailles finales utilisent `scripts/chapter-png.mjs` : conversion RGB/RGBA, recadrage et taille uniforme, sans redessiner les images. Les PNG originaux du quartier, du gym, de la rue des livreurs et de l’ancien hall n’ont pas été écrasés.
