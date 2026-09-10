# BoxeurDeux-D

Un jeu de vie de boxeur en 2D, en pixel art inspiré des jeux Super Nintendo / 16 bits. Le nom joue avec « 2D » : **BoxeurDeux-D**.

Cette base affiche un ring provisoire et « Projet prêt ». Elle sert à vérifier Phaser : aucune mécanique de combat ou de carrière n'est encore implémentée.

## Démarrer

Node.js 24 est conseillé (`nvm use` si nvm est disponible). Dans le terminal de VS Code, ouvert sur ce dossier :

```sh
npm install
npm run dev
```

Les dépendances sont déjà installées lors de la préparation initiale : `npm run dev` suffit pour reprendre. Ouvrir **http://127.0.0.1:5173/** dans le navigateur. Les modifications sont rechargées automatiquement. Pour arrêter le serveur : `Ctrl+C` dans son terminal.

Si le port est déjà utilisé, ouvrir le serveur existant ou démarrer sur un autre port avec `npm run dev -- --port 5174`.

```sh
npm run build    # Vérifie et produit la version compilée dans dist/
npm run preview  # Affiche cette version sur http://127.0.0.1:4173/
```

Utiliser un serveur local plutôt que d'ouvrir directement `index.html`. Pour réinstaller exactement les dépendances enregistrées, utiliser `npm ci`.

## Organisation

- `src/main.js` : configuration Phaser, résolution 384 × 288 et affichage adapté à la fenêtre.
- `src/scenes/BootScene.js` : scène de démarrage et ring provisoire.
- `src/style.css` : présentation de la page.
- `public/assets/sprites/` : futurs personnages et animations.
- `public/assets/tilemaps/` : futures cartes et tuiles.
- `public/assets/audio/` : futurs sons et musiques.
- `vite.config.js` : serveur local et compilation.

Les fichiers de `public/` sont servis directement, par exemple `assets/sprites/boxeur.png`. Le dépôt Git reste local. `node_modules/`, `dist/` et les fichiers d'environnement sont exclus du suivi.

## Prochaines étapes

1. Sparring dans le gym avec **Rémi le Tank**, partenaire d'entraînement : vue façon Punch-Out, joueur de dos et Rémi de face; frappes, garde, esquives et endurance.
2. Gym explorable en vue du dessus légèrement inclinée, à la Zelda.
3. Petit quartier inspiré de Montréal, avec maison et emploi.
4. Boucle maison / emploi / entraînement / récupération.
5. Premier combat officiel, puis autres lieux utiles.

Outils prévus : VS Code, Git, JavaScript, [Phaser](https://docs.phaser.io/phaser/getting-started/installation) et [Vite](https://vite.dev/guide/). LibreSprite pour les animations et Tiled pour les cartes viendront plus tard; ils ne sont pas installés dans cette préparation.
