# Suite du projet BoxeurDeux-D

Direction confirmée par l’utilisateur, actualisée après le GO du 11 septembre 2026. Voir `VERIFICATIONS.md` pour les validations effectivement terminées; cette feuille de route ne confirme pas à elle seule une publication.

## Nouvelle direction — décisions validées et ordre proposé

La discussion après le commit `74f87df` précise la progression à long terme. L’utilisateur a ensuite autorisé **l’étape 1** et retenu l’accès au premier adversaire par une affiche « Prochain combat » dans le gym existant pour l’étape 2. Ce GO ne lance pas toutes les phases suivantes; leurs détails restent à concevoir ensemble.

### Étape 1 intégrée après le GO

Rémi propose **Résistance et relevés**, trois rounds de 60 secondes. Résistance séparée de l’endurance, chute à zéro, compte de dix, six pressions alternées J/K ou A/B pour se relever, récupération partielle, pause du décompte et bilan. Troisième chute du round ou quatrième de la séance : arrêt. Entre les rounds : endurance pleine, +20 de résistance et remise à zéro du compteur de chutes du round uniquement. Les trois leçons et le sparring libre restent disponibles. Règles précises dans le README; essais réellement terminés dans `VERIFICATIONS.md`.

### Décisions retenues

- Gym gratuit pour le moment. L’argent servira aux goodies et aux vêtements futurs; pas de cotisation ni de dette quotidienne à cette étape.
- Trois réserves distinctes : énergie quotidienne pour travail/entraînements, endurance du combat pour agir/se défendre et récupérer, résistance du combat pour encaisser les coups.
- Dormir passe au jour suivant et remplit uniquement l’énergie quotidienne, sans gain de compétence ni bonus supplémentaire. Les combats commencent avec leurs jauges propres pleines et restent accessibles pour apprendre et réessayer.
- L’entraînement améliore les capacités de combat jusqu’à des plafonds liés à l’avancement. Les acquis restent sauvegardés; les plafonds ne doivent pas effacer la progression ou permettre trente jours de répétition pour écraser un adversaire.
- L’argent peut aussi avoir un plafond selon l’avancement, annoncé avant un travail; aucun argent déjà gagné ne doit être retiré lors d’un changement de palier.
- Un adversaire original à la fois, avec des signes lisibles, un pattern à découvrir et une ouverture à exploiter. Rémi reste le partenaire et l’enseignant du gym.
- Résistance à zéro : chute ou KO selon des conditions encore à fixer. Règle d’arrêt proposée et acceptée dans la discussion : troisième knock-down dans un même round ou quatrième dans l’ensemble du combat.
- Après deux ou trois adversaires, premier tournoi sur trois jours avec sa propre petite carte : lieu des combats, chambre d’hôtel, restaurant et gym du tournoi.
- Tournoi « payant » : hypothèse de planification = inscription en argent du jeu et récompense à gagner. Le sens précis et les tarifs seront confirmés lors de la conception de cette phase; aucun paiement réel ni service externe n’est prévu.

### Proposition de réalisation par étapes

| Étape | Contenu borné | Résultat à vérifier avant la suivante |
| --- | --- | --- |
| 1. Résistance, chute et relevé | Ajouter la résistance aux deux boxeurs, compte de dix, relevé, récupération partielle, compteurs de chutes par round/combat et états de fin. Préserver le sparring pédagogique de Rémi. | Un échange peut produire une chute, un relevé ou un KO compréhensible au clavier et avec A/B. Les transitions de rounds et les limites de chutes fonctionnent. |
| 2. Premier adversaire | Affiche « Prochain combat » dans le gym existant, puis transition vers le ring. Créer un seul adversaire avec deux attaques principales, une particularité et une ouverture claire; plusieurs rounds courts, victoire/défaite, bilan et revanche. Définir la décision si la limite de rounds est atteinte. La carte extérieure attend l’étape 6. | Le combat est gagnable par lecture du pattern avec les capacités de base, puis rejouable sans payer chaque tentative. Retour au gym avec les mêmes interactions. |
| 3. Bénéfices réels du gym | Relier d’abord les ateliers existants à des gains modestes de résistance et d’endurance; afficher capacités de base, gains possibles et plafonds; sauvegarde locale versionnée. Le miroir conserve son rôle d’apprentissage des gestes et n’accorde pas de points pour de simples appuis répétés. | Une séance utile produit une différence mesurable dans le même combat; le plafond est explicite et les acquis survivent au rechargement. Aucun bonus ne bloque/esquive à la place du joueur. |
| 4. Compléter les ateliers | Speed ball, puis corde à danser, une activité vérifiée à la fois. Même joypad, A/B, menus, bilan et retour au gym. Leur bénéfice précis est choisi à partir du combat déjà testé. | Les cinq activités du gym ont un rôle lisible, sans commandes supplémentaires ni répétitions sans intérêt. |
| 5. Boucle des journées | Énergie quotidienne, coût annoncé des séances, jour courant et action de dormir avant de construire la maison. Les coûts des entraînements sont appliqués ici; rien ne dépend encore d’une grande carte extérieure. | On peut organiser une journée, dormir même à zéro énergie et reprendre le lendemain à pleine énergie; aucun bonus nocturne ni blocage. |
| 6. Petit quartier, travail et argent | Une maison pour dormir, un seul travail sous forme de mini-jeu, salaire et plafond d’épargne visible, quelques goodies/vêtements donnant une utilité à l’argent. Survêtement extérieur et tuque rouge conservés. | Boucle courte gym–travail–maison, achat cosmétique et sauvegarde. Le gym reste gratuit et les combats accessibles. |
| 7. Deuxième puis troisième adversaire | Créer et équilibrer chaque adversaire séparément, avec un nouveau problème à lire; ouvrir progressivement les plafonds d’entraînement et d’argent. | Chaque rencontre demande un nouvel apprentissage et reste gagnable sans préparation maximale. Préférence de plan : trois adversaires avant le tournoi. |
| 8. Premier tournoi | Petite carte dédiée et calendrier de trois jours, inscription, hôtel, restaurant et gym. Réutiliser une partie des adversaires déjà validés; définir récompense, abandon, sauvegarde et reprise. | Le tournoi se joue du départ au retour; les besoins essentiels et une défaite ne créent pas de blocage financier. Les coûts/restaurants/bonus éventuels sont conçus à cette étape. |

### Conditions de KO à prototyper

- Par défaut, tomber à zéro résistance déclenche un knock-down avec une chance de se relever avant dix; un relevé ne restaure qu’une partie de la résistance.
- L’échec du relevé avant dix donne un KO. Les seuils de trois chutes dans le round ou quatre dans le combat entraînent l’arrêt sans nouveau relevé.
- Un KO immédiat éventuel doit également arriver à zéro résistance, avec une condition déterministe et annoncée. Candidat pour plus tard : un coup spécial clairement préparé, reçu en épuisement complet, qui vide la résistance restante. Pas de probabilité cachée.
- La première livraison intègre chute, relevé et arrêt : six pressions alternées, résistance rendue 55/45/35 et trois rounds de 60 secondes. Le KO spécial pourra venir avec un adversaire conçu pour l’enseigner. Le départage aux points reste à définir à l’étape 2; Rémi donne ici un bilan d’entraînement.

### Sauvegarde de la partie — à intégrer dès l’étape 3

La question de sauvegarde fait partie du plan avant la suite. Le prototype actuel mémorise des préférences comme le son; il n’a pas encore de carrière sauvegardée. Git/GitHub protègent le code et les ressources du projet, pas les parties individuelles.

- Sauvegarde automatique locale aux moments stables : activité résolue, résultat d’un combat, achat, changement de jour et changement de lieu utile. Les capacités et plafonds, jour/énergie, argent, vêtements possédés/équipés, adversaires et victoires seront conservés. L’état du tournoi sera ajouté lorsque ce mode existera.
- Une sauvegarde active et une copie précédente de secours suffisent au départ. Format versionné et migrations lors des mises à jour, validation des fichiers importés, erreurs de stockage signalées sans afficher une fausse réussite.
- Les coûts et récompenses d’une même activité sont enregistrés ensemble. Une reprise ne doit ni débiter deux fois l’énergie/l’argent, ni attribuer deux fois une récompense. Le statut d’une activité interrompue est explicite.
- Reprendre à un point sûr : avant un combat pour un round interrompu; au gym pour un atelier interrompu, avec ses coûts traités de façon cohérente. Sauvegarder un poing au milieu de son animation n’est pas nécessaire. Le tournoi aura un point de reprise après chaque rencontre et chaque journée.
- Au lancement : **Continuer** ou **Nouvelle partie**; une nouvelle partie ne remplace pas silencieusement la sauvegarde existante. Dans P/Échap ou ☰ : rubrique **Sauvegarde**, avec **Exporter ma partie** et **Importer une partie**; mêmes commandes de navigation et confirmation A/B.
- La sauvegarde locale dépend du navigateur et de l’adresse du jeu. Le site GitHub Pages, `127.0.0.1` et l’adresse Wi-Fi ont des stockages séparés; ordinateur et téléphone ne se synchronisent pas automatiquement. Un fichier exporté permet de transférer la partie et d’en conserver une copie indépendante du navigateur. Importer une partie ne doit pas écraser l’ancienne sans confirmation.
- Aucun compte joueur ni serveur de sauvegarde n’est requis pour cette première version. Une éventuelle synchronisation en ligne sera une phase séparée, avec ses coûts et contraintes discutés avant mise en place.

L’ordre recommandé commence donc par la base de combat, puis un adversaire témoin, avant de compléter le gym. Il permet d’équilibrer les gains d’entraînement contre une rencontre réelle. Les sections suivantes conservent l’historique; cette direction remplace les anciennes propositions de cotisation au gym et de priorité immédiate à la speed ball.

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
- Sac, miroir, speed ball et corde accessibles à pied. Le sac et le miroir ouvrent maintenant leurs séances; speed ball et corde présentent leur future activité.
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
- **J → K → J = jab → direct → crochet**. Au sac, le troisième J devient un crochet lorsque l’enchaînement annoncé a ses deux premières frappes réussies et que la fenêtre de rythme est ouverte. Hors combo, J reste un jab.
- Nouveau décor du même gym, tuque rouge, tenue bleue/blanche, sac transparent séparé et six poses. Garde de droitier corrigée après retour utilisateur : pied gauche devant, jab gauche, direct droit avec pivot arrière droit, crochet gauche. Ressources issues de la génération intégrée; poses corrigées et prompts dans `references/characters/bag-orthodox/PROMPTS.md`, décor/sac conservés dans le dossier `bag`.

Les poses clés sont en place; davantage d’intermédiaires pourront améliorer la fluidité. Les scripts `test:bag` et `test:side-controls` couvrent la séance et la disposition des commandes; leurs résultats appartiennent au compte rendu de vérifications.

## Suite à travailler

Le nouveau GO autorise le combo **jab–direct–crochet en sparring libre**. Il est intégré avec trois poses supplémentaires du joueur vu de dos, une fenêtre de 0,5 s après la récupération de chaque coup, un coût total de 48 points d’endurance et des ouvertures de Rémi allongées. Les défenses, les coups reçus, la pause et l’expiration interrompent la chaîne. Le bilan distingue crochets touchés et combos de trois touches. Les leçons restent ciblées sur leurs mouvements initiaux. Voir `VERIFICATIONS.md` pour les essais terminés. Les frappes au corps sont ajoutées par le GO des commandes communes décrit ci-dessous.

## Miroir — réalisé après le nouveau GO

Le **shadow boxing** permet maintenant de pratiquer librement les mouvements seulement, sans adversaire ni endurance limitante. Accès par la visite ou `?scene=shadow`; tenue du gym à tuque rouge, reflet synchronisé dans un nouveau décor, jab/direct/crochet en combo, garde haute et deux esquives. Vitesse normale ou ralentie à 65 %, pause/Commandes, fin volontaire, bilan des gestes, nouvel essai et retour à la même position dans le gym. Commandes clavier et marges tactiles communes au reste du jeu. Les essais réellement terminés sont décrits dans `VERIFICATIONS.md`.

La **speed ball**, puis la **corde à danser**, sont les prochains ateliers envisagés. La visite, le sac, le miroir et le sparring restent la base jouable. Les coups au corps et gardes haute/basse font maintenant partie de la convention commune. La progression quotidienne reste ultérieure.

## Convention commune — GO avant la speed ball

Joypad gauche, A/B et ☰ à droite sur mobile; directions flèches/WASD, J/K, E, P/Échap sur ordinateur. Même navigation des menus, mêmes hauteurs de garde et d’attaque au miroir, sac et sparring. Les sorties «← Gym» sont directes. Cette convention doit aussi servir aux prochains lieux : une activité adapte les gestes, elle ne réinvente pas ses boutons. Les gardes haute/basse protègent réellement tête/corps; Rémi annonce sa cible. Les nouvelles ressources complètent les anciennes sans les écraser. Voir `VERIFICATIONS.md` pour les tests effectivement terminés.

## Ateliers prévus

Chaque atelier devra d’abord être agréable à jouer et compréhensible par lui-même.

| Activité | Intention du mini-jeu |
| --- | --- |
| Sac de frappe | Première séance intégrée : rythme, précision et cinq enchaînements, dont un au corps. |
| Shadow boxing devant le miroir | Intégré : pratique libre, reflet, défenses, combo et ralenti, sans adversaire. |
| Speed ball | Coordination et régularité. |
| Corde à danser | Rythme, endurance et jeu de jambes. |
| Sparring avec Rémi le Tank | Mettre en pratique le timing, la précision, les blocages, les esquives et les réponses. |

Plus tard, les séances consommeront de l’**énergie du jour** et feront progresser les compétences correspondantes. Cette réserve quotidienne restera distincte de l’**endurance pendant un round**, qui sert aux actions et récupère entre les échanges. Les coûts, gains et règles de récupération quotidienne restent à définir après les premiers mini-jeux.

Le gym est explorable; le sac, le miroir et le sparring sont jouables. La speed ball, la corde et la progression quotidienne restent des étapes futures. La ville, la maison, l’emploi, la carrière et les combats officiels viendront ensuite.

Sur la future carte extérieure, le personnage portera un survêtement Adidas noir à bandes blanches avec sa tuque rouge. Les photos fournies ont servi de références graphiques; elles ne sont pas publiées avec le jeu.
