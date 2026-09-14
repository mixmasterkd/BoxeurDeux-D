# Combats du chapitre 5

Pablo est le partenaire de sparring mexicain. Danielo est l’adversaire officiel de l’arène de terre. Au Mexique, Octopus assure les conseils et le coin, avec sa propre illustration; Fredo reste le coach à Montréal, à Cuba et pendant les tournois.

Les Gants dorés ajoutent Rafael Ríos, Émile Moreau et Thiago Santos, dans cet ordre. Ils portent un uniforme amateur rouge et blanc avec casque. Le joueur conserve le bleu et blanc en tournoi et sa tenue équipée dans les combats locaux. Les préparations restent visibles au moins 550 ms, avec des séries plus longues et une résistance croissante. La boucle conserve 3 rounds de 45 secondes et les coups rapides du prototype.

## Esquives et contacts

Tous les répertoires actuels sont orthodoxes : jab de la main physique gauche (à droite de l’écran chez l’adversaire de face), direct de sa droite (à gauche de l’écran). L’esquive extérieure suit ce côté de l’écran. Rémi avait six poses de tête dessinées à l’inverse de ses poses au corps : seules ces six poses sont maintenant corrigées par le miroir de rendu. Ses coups au corps et le joueur ne sont pas inversés. Les repères de préparation et la visée ont été alignés avec ces mains; l’impact reste compté lorsque le gant atteint son contact.

## Juges et décision

Le jeu utilise trois juges en local et cinq en tournoi. Chaque round est attribué 10–9, 10–8 ou 10–7 suivant l’écart de domination. Une chute ne retire plus automatiquement un point. Les touches nettes priment; la qualité des coups, la précision et la défense départagent les échanges proches. Une égalité parfaite utilise le premier contact propre effectivement enregistré, puis l’initiative de frappe. Les très anciens rounds sans événement exploitable disposent d’un départage alterné entre les coins, sans avantage fixe au joueur.

Un total égal sur une carte reste affiché tel quel, avec un astérisque : le départage technique est expliqué dans le détail. La majorité des cartes décide, sans décision nulle. Les cartes apparaissent progressivement, puis l’arbitre désigne le vainqueur. Le joueur est désormais vu de face dans trois véritables poses : attente, victoire et défaite. Les pieds et la taille du corps sont communs, même lorsque son bras se lève.

Le 10-point-must, les trois critères généraux, les scores 10–9/8/7 et l’absence de round nul s’inspirent des règles de [World Boxing, février 2024, §7](https://boxingcanada.org/wp-content/uploads/2024/03/WB-Competition-Rules-Feb-2024-v3.9.pdf). Le calcul numérique et le format trois juges locaux/cinq en tournoi sont des conventions de ce jeu.

## Altercation du marathon

Le coureur adverse et le joueur ont des sprites de course complets, avec poings nus, sur une rue de Montréal. Le joueur porte la tenue violette, le short noir et la casquette noire. Aucun chronomètre de combat, round, juge ou relevé à dix : une seule chute termine l’altercation après l’animation. Une défaite permet également de reprendre la course.

Le profil marque la rencontre consommée une seule fois. Le résultat ne donne ni argent, ni compétence, ni victoire de boxe officielle et ne consomme pas d’énergie supplémentaire. La scène revient au point exact sauvegardé, avec son index de parcours; le chrono de course était en pause pendant l’altercation. Quitter le combat permet aussi de continuer. Le rechargement ne recrée pas la rencontre.

## Vérifications

- `tests/new-opponents.test.js` et `tests/fight-progression.test.js` : les quatre nouveaux adversaires officiels restent battables en observant les attaques, avec une perception simulée de 150 ms, à 20 et 60 Hz, avec statistiques de base et entraînées. L’attaque aveugle échoue contre les adversaires avancés.
- `tests/bout-judges.test.js` : 10-point-must, domination, absence de déduction par chute, cartes 3/5, départages symétriques, historique immuable.
- `tests/street-session.test.js` : 180 secondes sans limite de combat, vraie chute gagnante/perdante, aucun décompte ou round supplémentaire, rythme de Pablo.
- `tests/new-chapter-combat-assets.test.js` : transparence, marges non coupées, points de contact et cibles sur les silhouettes, lignes de pieds communes, orientation de Rémi et présence des ressources chargées.
- `tests/new-chapter-combat-browser.mjs` : combats de rue réellement joués au clavier et avec événements tactiles CDP en 568 × 320, garde/frappes, pause, contacts alignés, une chute et résultat. Deux esquives extérieures de Rémi jouées au clavier. Aucun état de combat fabriqué.
- `tests/fight-pacing-browser.mjs` : vrai tournoi Bellini de trois rounds de 45 s, deux coins, pause par passage portrait, cinq cartes, enregistrement unique du résultat et retour à l’hôtel; viewport mobile 568 × 320.
- `tests/mexico-corner-browser.mjs` : vrai round de Danielo de 45 s, deux respirations clavier avec Octopus, illustration et texte du coach vérifiés, passage au round 2.
- `tests/mexico-defense-browser.mjs` : Pablo au clavier et Danielo en tactile simulé 568 × 320; blocages tête/corps, esquives extérieures du jab/direct et touches aux deux hauteurs réellement joués, contacts visuels à moins de 2 pixels de la cible.
- `tests/fight-presentation-browser.mjs` : **fixtures de rendu**, distinctes des parties réelles, pour les deux vainqueurs, les uniformes locaux/tournoi et les cartes 3/5; détails accessibles avec E, vues ordinateur/mobile.
- `tests/marathon-fight-integration-browser.mjs` : **fixture de sauvegarde** avant une rencontre, puis vrai combat joué jusqu’à une chute et retour dans le parcours; coordonnées, temps, index et absence de récompense vérifiés, y compris après rechargement.

Les essais mobiles sont des fenêtres simulées avec entrées tactiles, pas un essai sur le téléphone physique.
