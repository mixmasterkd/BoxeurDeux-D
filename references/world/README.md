# Maison et quartier — sources de la phase journées

Création avec **imagegen intégré**, à partir du gym validé comme référence de style. Aucun service de génération ni clé n’est nécessaire pendant une partie.

- `home/home-source.png` et `home/PROMPT.md` : maison originale. Préparation technique par `scripts/prepare-home-background.mjs`; résultat final `public/assets/world/home.png`, 1280 × 720.
- `neighborhood/source.png` et `neighborhood/PROMPT.txt` : quartier original, résultat généré de 1586 × 992 malgré une résolution plus grande demandée dans le prompt. Le fichier final `public/assets/world/neighborhood.png` conserve ces pixels; une échelle uniforme de 1,5 donne un monde de **2379 × 1488**.
- La caméra reste **1280 × 720**, suit le joueur et s’arrête aux limites. Elle ne réduit pas toute la carte à un seul écran. Les sprites gardent leur taille entre maison, rue et gym.
- La tenue de rue et ses douze poses sont dans `references/characters/street/`, avec leur prompt et les sources transparentes; ressources finales dans `public/assets/sprites/street/`.

Collisions, points d’entrée et interactions actuels : `src/game/ExplorationWorld.js`. Les repères de `home/layout.json` documentent la mesure du décor; le modèle reste la définition jouée. `ExplorationScene` extrait certains pixels déjà présents (arbres, clôtures, mobilier) en calques transparents pour gérer l’ordre d’affichage selon les pieds. Aucun personnage n’est peint dans les décors.

Le gym existant est préservé. L’extérieur est un premier quartier illustré fixe, avec ruelles, parc et trois portes actives. Dépanneur, local vacant et extensions derrière les chantiers restent futurs; aucun achat ou emploi n’y est encore proposé.
