# Tenues achetées

Quatre variantes originales ont été produites et retouchées avec l’outil imagegen intégré : survêtement bleu, survêtement bordeaux, tenue de boxe émeraude, tenue de boxe bordeaux et or. Les références de départ sont les personnages de marche validés du projet. Aucun abonnement ni appel distant n’intervient pendant une partie.

Les fichiers `*-source.png` sont les premières sorties. Trois comportaient un damier opaque : les versions `*-alpha.png` ont été corrigées avec l’outil intégré, puis vérifiées. La version bordeaux de boxe possédait déjà un alpha exploitable. Les consignes complètes sont dans `PROMPTS.md`.

`node scripts/prepare-outfit-sprites.mjs --id street-blue --source references/characters/outfits/street-blue-alpha.png` extrait les douze silhouettes alpha, avec une échelle commune, une toile de 96 × 112 et l’ancre existante (48, 104). Répéter pour les trois autres identifiants. Aucun personnage n’est redessiné par le script. L’extraction par silhouette évite de couper une chaussure lorsque les limites verticales de deux rangées se chevauchent.

Les ressources finales et leurs métadonnées se trouvent dans `public/assets/sprites/outfits/<id>/`. `preloadOutfits` et `streetTexture`/`boxingTexture` les sélectionnent à partir de la tenue réellement équipée.

Pour les grands personnages des combats et ateliers, `OutfitView.js` remplace uniquement la palette bleue du tissu par l’émeraude ou le bordeaux, dans une texture locale mise en cache. Les dessins, proportions, alpha et repères de contact restent exactement ceux des atlas existants. La peau, la tuque rouge, les bandages blancs et les contours restent intacts. Une tenue officielle de tournoi est toujours prioritaire.

`prepareBoxingOutfits(scene, baseKeys)` prépare les poses de la tenue choisie pendant le menu de démarrage, avant le premier coup. `tests/outfit-view.test.js` contrôle les 48 silhouettes, la conservation des pixels protégés dans six atlas, les slots indépendants et la priorité de la tenue officielle. `node tests/outfit-view-browser.mjs` vérifie le rendu Phaser réel et le cache dans une page locale isolée, sans lancer de serveur. L’aperçu est `preview.png` et la preuve `browser-proof.json`; ce n’est pas une capture d’un parcours joué ni un essai sur téléphone physique.

Intégration réelle dans les ateliers : `node tests/outfit-activities-browser.mjs` joue un geste au sac, au miroir, à la corde et à la speed ball, avec équipement acheté et choisi au casier dans la fixture sauvegardée. Les huit cas couvrent ordinateur et tactile simulé 844 × 390. Les contacts comptés, le reflet, les textures préparées avant le départ et le cadrage sont contrôlés; captures `bag-*`, `shadow-*`, `rope-*`, `speedball-*` et `activities-proof.json`.

`node tests/chapter-menu-browser.mjs` contrôle l’argent, le lieu, le jour de tournoi, la collection et l’aperçu d’import dans les menus. Les deux tailles vérifiées sont 1280 × 720 et 568 × 320 tactile simulé. Le bouton Continuer reste visible au-dessus des détails secondaires. Captures `career-*`, `pause-*` et `menu-proof.json`. Les tests isolent les messages de rechargement de Vite dans leur propre navigateur pour que les éditions parallèles des agents ne réinitialisent pas une séance en cours.
