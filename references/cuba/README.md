# Décors du séjour à Cuba

Ces six décors originaux ont été générés avec l’outil de génération d’images intégré à Codex, après inspection des décors validés du gym et du quartier. Aucun appel à un service d’images, abonnement ou clé API n’est nécessaire pendant une partie.

Pour chaque lieu, le fichier `*-source.png` conserve la sortie originale et `*-prompt.txt` le prompt envoyé. Le script `scripts/prepare-cuba.mjs` effectue uniquement une mise à l’échelle uniforme avec rééchantillonnage au plus proche et un léger recadrage centré pour atteindre exactement 16:9. Il ne redessine aucun élément. Les PNG finaux sont tous opaques; aucune transparence n’était nécessaire pour ces fonds.

| Source | Ressource de jeu | Dimensions finales | Usage |
| --- | --- | --- | --- |
| `village-source.png` | `public/assets/cuba/village.png` | 1920 × 1080 | Carte défilante, casa, gym, kiosque retour et sentier plage |
| `home-source.png` | `public/assets/cuba/home.png` | 1280 × 720 | Logement explorable, lit et porte |
| `gym-source.png` | `public/assets/cuba/gym.png` | 1280 × 720 | Gym explorable de béton et sacs en pneus |
| `gym-training-source.png` | `public/assets/cuba/gym-training.png` | 1280 × 720 | Cadrage rapproché des ateliers, sans mur avant sous les personnages |
| `beach-source.png` | `public/assets/cuba/beach.png` | 1920 × 1080 | Plage explorable et ring visible avec marches |
| `beach-ring-source.png` | `public/assets/cuba/beach-ring.png` | 1280 × 720 | Cadrage de combat Punch-Out, distinct de la carte |

Les personnages sont des sprites séparés. Le joueur conserve sa tuque rouge et les tenues équipées; Fredo reprend ses poses dédiées. Les collisions, dimensions de personnages, seuils de portes et positions de retour sont définis dans `src/game/CubaWorld.js`. Les décors existants de Montréal n’ont pas été remplacés.
