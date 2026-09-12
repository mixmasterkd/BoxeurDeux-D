# Hôtel des Gants de bronze

Décors et personnages originaux générés avec **l’outil intégré image_gen** de cette session, sans API externe ou abonnement pendant la partie. Compétence utilisée : `/home/mixmasterkd/.codex/skills/.system/imagegen/SKILL.md`.

Direction : conserver le pixel art détaillé du gym et de la maison validés. Bois chaud, laiton, bleu canard et bordeaux relient les six pièces. Références inspectées avant génération : `public/assets/world/home.png`, `public/assets/backgrounds/gym.png`, puis les nouveaux décors de l’hôtel. Rémi reprend son identité de `public/assets/sprites/corner/remi-coach.png`; le nageur reprend le personnage à tuque rouge, avec bonnet de bain rouge et maillot noir.

Les prompts et chemins des sorties originales sont dans [PROMPTS.json](./PROMPTS.json). Sources finales : `room-source.png`, `corridor-source.png`, `lobby-source.png`, `gym-source.png`, `pool-source.png`, `venue-source.png`, `coach-sheet.png`, `swimmer-sheet.png`. Les sources antérieures documentent les retouches d’identité, d’alpha et d’alternance du bras; elles ne sont pas chargées par le jeu.

## Ressources livrées

- `public/assets/hotel/room.png`, `lobby.png`, `gym.png`, `pool.png` : 1280 × 720.
- `public/assets/hotel/corridor.png` : 1920 × 1080, caméra défilante de 1280 × 720.
- `public/assets/hotel/venue.png` : 2304 × 1536, caméra défilante, quatre rings dans le décor.
- `public/assets/hotel/coach-{ready,left,right,sweep}.png` : quatre poses 512 × 640 à ancrage constant 256,624. Cibles des manoplas mesurées dans `coach.json`.
- `public/assets/hotel/swimmer-{0,1,2,3}.png` : quatre poses horizontales 320 × 160; les bras se récupèrent alternativement en haut et en bas du corps. Alpha conservé, eau et remous animés séparément.

## Préparation et contrôle

`node scripts/prepare-hotel-backgrounds.mjs` applique une échelle uniforme et un recadrage centré très léger, puis un échantillonnage nearest-neighbor. Les cinq premiers fonds ont été reçus en 1672 × 941, et la salle en 1536 × 1024. Aucune perspective n’est étirée.

`node scripts/prepare-hotel-sprites.mjs` extrait les cellules, conserve leur alpha, aligne les pieds de Rémi, normalise les poses et exporte les points des cibles. Les grands sprites du joueur déjà présents sont réutilisés avec leurs métadonnées et leur orientation : jab gauche, direct droit. Les gants et manoplas coïncident à l’instant où une touche est comptée.

Les pixels RVB des zones transparentes peuvent contenir un halo dans certaines prévisualisations qui ignorent l’alpha; ce halo est transparent et n’apparaît pas dans le navigateur. Les captures dans `docs/hotel-*.png` montrent le compositing réel.

Les tenues achetées sont réutilisées à l’hôtel avec `OutfitView`. Les trois adversaires principaux utilisent leurs vrais sprites de combat miniaturisés dans la salle. Dans les quatre rings, les poses de garde, jab et blocage proviennent de `public/assets/sprites/chapter-combat/competition/` pour le boxeur bleu et de `bellini/`, `fortin/`, `gagnon/` pour les boxeurs rouges, sans teinte supplémentaire. Les origines sont celles de leurs fichiers `fighters.json` et leur échelle est de 0,23. Ces petites animations sont de l’ambiance et ne modifient jamais les résultats du tableau; leurs sources sont documentées dans `references/characters/chapter-combat/`.
