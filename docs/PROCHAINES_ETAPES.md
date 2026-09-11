# Suite du projet BoxeurDeux-D

Direction confirmée par l’utilisateur, actualisée après le GO du 11 septembre 2026. Voir `VERIFICATIONS.md` pour les validations effectivement terminées; cette feuille de route ne confirme pas à elle seule une publication.

## Phase réalisée — 10 septembre 2026

Le sparring dispose de tenues d’entraînement (débardeur, short, casque et gants), de dix poses par boxeur et de transitions plus fluides. L’identité des personnages, le décor validé, le round jouable et les commandes sont conservés. Le cadrage garde les pieds visibles pendant les échanges. Le paysage mobile a été vérifié dans Chromium; le confort sur un téléphone physique reste à essayer. Voir `VERIFICATIONS.md` pour les contrôles effectués.

## Phase leçons et son — réalisée le 10 septembre 2026

- Trois exercices de trois réussites : jab dans des ouvertures distinctes, blocage suivi de récupération, esquive puis riposte.
- Conseils pendant le jeu, progression, bilan, nouvel essai et passage à la leçon suivante.
- Cloche, impacts, blocages, souffle et sons de réussite, synthétisés localement. Volume et sourdine mémorisés; pas encore de boucle d’ambiance.
- Sparring libre conservé, clavier et tactile en paysage.

## Première visite du gym — réalisée après le nouveau GO

- Salle dans le même univers visuel, cadrage 1280 × 720 identique sur ordinateur et téléphone paysage.
- Boxeur à tuque rouge courte et motif noir, débardeur bleu et blanc, short noir, chaussures bleues; marche en quatre directions.
- Rémi près du ring : conversation, choix du sparring libre ou des trois leçons, retour à la position de départ après la séance.
- Sac, miroir, speed ball et corde accessibles à pied. Le sac ouvre maintenant sa séance; les trois autres ateliers présentent leur future activité.
- Collisions, pause, clavier, tactile simultané, relâchements et orientation.

## Commandes hors de l’image — GO du 11 septembre 2026

La disparition du personnage près des ateliers est corrigée. La nouvelle présentation s’applique au **gym, au sparring et au sac** :

- Sur ordinateur, aucun bouton de jeu ni rappel permanent des touches, y compris dans le pied de page. **P/Échap → Commandes** ouvre l’aide depuis la pause.
- Sur téléphone en paysage, les boutons sont placés dans **deux bandes latérales hors de l’image**. Le centre conserve le cadrage complet 1280 × 720 en 16:9, sans étirement ni découpe.
- M coupe le son des séances au clavier; Son/Muet se trouve dans la marge tactile. Portrait et perte de focus mettent le jeu en pause et libèrent les appuis.

## Sac chorégraphié — intégré après ce même GO

- Accès par interaction près du sac, ou directement par `?scene=bag`.
- Séance de **45 secondes** : jab, double jab, jab–direct, puis jab–direct–crochet, avec repères de rythme.
- Gants, sons, contact compté et balancement du sac synchronisés; bilan de précision et d’enchaînements réussis.
- Pause, Commandes, reprise, nouvel essai et retour au même endroit dans le gym.
- **J → K → J = jab → direct → crochet**, actif au sac seulement. Le troisième J devient un crochet lorsque l’enchaînement annoncé a ses deux premières frappes réussies et que la fenêtre de rythme est ouverte. Hors combo, J reste un jab.
- Nouveau décor du même gym, tuque rouge, tenue bleue/blanche, sac transparent séparé et six poses. Garde de droitier corrigée après retour utilisateur : pied gauche devant, jab gauche, direct droit avec pivot arrière droit, crochet gauche. Ressources issues de la génération intégrée; poses corrigées et prompts dans `references/characters/bag-orthodox/PROMPTS.md`, décor/sac conservés dans le dossier `bag`.

Les poses clés sont en place; davantage d’intermédiaires pourront améliorer la fluidité. Les scripts `test:bag` et `test:side-controls` couvrent la séance et la disposition des commandes; leurs résultats appartiennent au compte rendu de vérifications.

## Suite à travailler

Reprendre le combo **jab–direct–crochet en sparring**, comme demandé par l’utilisateur, avec une ouverture et un contact lisibles. Il n’est pas encore actif dans le ring. Les frappes au corps pourront ensuite enrichir le jeu sans multiplier d’emblée les commandes.

Le prochain atelier envisagé est le **miroir**, pour pratiquer librement les mouvements seulement, sans adversaire. La speed ball et la corde suivront. La visite, le sac et le sparring restent la base jouable pendant cette suite.

## Ateliers prévus

Chaque atelier devra d’abord être agréable à jouer et compréhensible par lui-même.

| Activité | Intention du mini-jeu |
| --- | --- |
| Sac de frappe | Première séance intégrée : rythme, précision et quatre enchaînements. |
| Shadow boxing devant le miroir | Pratiquer librement les mouvements seulement, sans adversaire. |
| Speed ball | Coordination et régularité. |
| Corde à danser | Rythme, endurance et jeu de jambes. |
| Sparring avec Rémi le Tank | Mettre en pratique le timing, la précision, les blocages, les esquives et les réponses. |

Plus tard, les séances consommeront de l’**énergie du jour** et feront progresser les compétences correspondantes. Cette réserve quotidienne restera distincte de l’**endurance pendant un round**, qui sert aux actions et récupère entre les échanges. Les coûts, gains et règles de récupération quotidienne restent à définir après les premiers mini-jeux.

Le gym est explorable et le sac possède sa première séance. Le miroir, la speed ball, la corde et la progression quotidienne restent des étapes futures. La ville, la maison, l’emploi, la carrière et les combats officiels viendront ensuite.

Sur la future carte extérieure, le personnage portera un survêtement Adidas noir à bandes blanches avec sa tuque rouge. Les photos fournies ont servi de références graphiques; elles ne sont pas publiées avec le jeu.
