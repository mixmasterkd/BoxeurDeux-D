# Confort du chapitre V5 — 13 septembre 2026

Cette correction suit les retours sur le laptop, Pablo, les quais et les textes qui recouvraient l’hôtel. Le chapitre, les décors validés, la carrière et les anciennes sauvegardes sont conservés.

- **Décors dégagés** : les grands titres et annonces permanentes de proximité disparaissent de l’aire de jeu, sur ordinateur et mobile. Le lieu reste dans la bordure extérieure. Jour, argent et énergie sont immédiatement disponibles dans Pause. Les annonces de proximité restent accessibles aux lecteurs d’écran, les dialogues s’ouvrent volontairement et la tournée active conserve son adresse utile.
- **Pablo** : le partenaire du Mexique est nommé dans le HUD, les textes de phase, les paramètres, les commandes et les libellés accessibles. Rémi reste le partenaire du gym montréalais. The Octopus demeure le coach au Mexique, y compris le libellé accessible des pads.
- **Laptop** : illustration originale du boîtier, écran et clavier; interface à l’intérieur de l’écran. Zoom de cadrage sur petit mobile pour garder le texte lisible. Clic sur ordinateur, joypad/A/B sur mobile. Le Terminal est discret, sans commandes préremplies, bouton d’aide révélateur ni promotion dans le guide du jeu. Son fonctionnement de test reste isolé de la carrière normale.
- **Métro** : hall de correspondance dans chaque station. Le passage du quai A part vers l’Aéroport, le quai B vers le Quartier; un passage est fermé au terminus. Le choix se fait à pied, le plan informe. Le retour à la rue passe par le hall. Les anciennes positions sur les quais restent compatibles; la sauvegarde du quai de retour conserve désormais le sens.
- **Wagon et sortie** : personnage agrandi à l’échelle du mobilier; station visible dans les fenêtres à l’arrêt, tunnel pendant le trajet. Passage de plain-pied sur le quai à la place de l’escalier mal orienté. Les barres du wagon restent fixes.

Les quatre sources générées et leurs prompts sont dans `references/confort/`; `scripts/prepare-comfort-assets.mjs` reproduit la mise au format des ressources finales. Aucune génération ou connexion à une IA pendant une partie.

## Vérifications

- 426 tests autonomes réussis, dont les deux passages des cinq halls, les quais persistants, le train, les transactions et migrations existantes.
- Laptop : 19 contrôles clavier et joypad CDP en contextes isolés; inscription et deux réservations sans double paiement, saisie sans mouvement du personnage, sauvegarde de test séparée, retour normal intact, défilement et fenêtre de 568 × 200 simulant l’espace réduit par le clavier. `laptop-browser-results.json`.
- Métro : 18 contrôles ordinateur et tactile simulé; embarquement à pied, passage d’un arrêt, descente à l’île, hall et quai B, direction inverse, pause, portrait, rechargement dans le même sens, aéroport et réservation puis départ pour Cuba. `metro-browser-results.json`.
- Le contrôle du premier bundle a détecté un chemin d’image relatif incorrect pour le laptop sur un sous-chemin de publication; corrigé avant mise en ligne. Une attente de reprise de la promenade a été ajoutée au scénario navigateur pour attendre l’état réellement rendu après Pause.

Le bundle final a passé **34 contrôles** sous `/BoxeurDeux-D/`, avec **219 ressources**, sans erreur JavaScript, console ou HTTP : laptop et isolation du profil de test, pads Octopus, Pablo (départ, réglages, frappes, pause et retour), métro, hôtel dégagé, ressources visibles dans Pause, bar à pain et départ du marathon. Rapport `chapter-v5-built-results.json`. Compilation réussie; seul l’avertissement connu de taille du bundle Phaser demeure.

Publication en cours de vérification sur GitHub Pages. Les essais mobiles utilisent Chromium avec viewport et événements tactiles CDP; **aucun téléphone physique n’a été testé**. Le métro reste un réseau fictif compact inspiré de Montréal.
