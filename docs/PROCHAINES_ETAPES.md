# Suite du projet BoxeurDeux-D

Direction confirmée par l’utilisateur, actualisée après le GO du 11 septembre 2026. Voir `VERIFICATIONS.md` pour les validations effectivement terminées; cette feuille de route ne confirme pas à elle seule une publication.

## Livraison du GO « 1 à 4 »

L’utilisateur a autorisé ensemble **la fin du gym, ses bénéfices de combat, la sauvegarde et la vérification de la boucle complète**. Il a ensuite demandé une reprise de la corde et de la speed ball avec de vrais personnages animés et les commandes adaptées au périphérique. Les travaux sont intégrés et vérifiés localement. Les résultats et la preuve de publication sont consignés séparément dans `VERIFICATIONS.md`.

| Travail autorisé | Contenu de cette livraison |
| --- | --- |
| 1. Terminer le gym | Sac, miroir, sparring, speed ball et corde accessibles à pied. Les deux nouveaux ateliers durent 45 s, avec personnages adultes à tuque rouge, poses dédiées, balle/corde animées et petit repère de rythme qui laisse l’action visible. |
| 2. Donner de vrais bénéfices | Gains modestes annoncés avant la séance et appliqués aux combats, plafonnés au palier Béton. Le miroir conserve son rôle de pratique. |
| 3. Sauvegarder | Sauvegarde locale versionnée, copie précédente de secours, Continuer/Nouvelle partie, export/import validé puis confirmé et historique de Béton. |
| 4. Vérifier la boucle | Entraînement terminé → gain → combat Béton → fermeture/reprise des acquis. Parcours clavier et mobile simulé, sans présenter ce dernier comme un essai sur le téléphone physique. |

| Atelier | Condition d’une séance terminée | Gain | Plafond Béton |
| --- | --- | --- | --- |
| Sac | 6 contacts et 50 % de précision | Puissance +1 | Bonus +5 aux dégâts nets |
| Speed ball | 20 bons temps et 60 % de précision | Récupération +2 points de pourcentage | Bonus +10 % |
| Corde à danser | 20 bons temps et 60 % de précision | Endurance maximale +2 | 110, base 100 |
| Résistance et relevés | 10 touches nettes ou défenses réussies, séance terminée | Résistance maximale +2 | 108, base 100 |
| Miroir, leçons et sparring libre | Pratique des gestes et du rythme adverse | Aucun bonus permanent | Sans objet |

J/K sur ordinateur et A/B à droite sur mobile conservent la même alternance gauche/droite dans les nouveaux ateliers. L’aide présente les touches du périphérique utilisé; le joypad sert à la navigation des menus. P/Échap ou ☰ ouvre pause/Commandes, et ← Gym reste direct. Les boutons tactiles restent dans les marges; le cadrage 1280 × 720 en 16:9 est conservé sur tous les écrans.

Le premier adversaire reçoit les acquis d’entraînement du joueur sans devenir plus fort en miroir. Au coin, l’endurance revient à son maximum entraîné et la résistance remonte de 20 jusqu’au maximum propre à chacun : joueur jusqu’à 108, adversaire 100. Répéter les séances au-delà du plafond ne permet pas de dépasser ce palier.

**Prochaine étape proposée : la boucle des journées et du sommeil**, puis le petit quartier avec maison, travail et argent. Le gym reste gratuit. Le sommeil fera avancer le jour et remplira uniquement l’énergie quotidienne. Ces systèmes, les adversaires suivants et le tournoi ne sont pas ajoutés à la livraison actuelle. La liste initiale complète ci-dessous reste la feuille de route.

## Nouvelle direction — décisions validées et ordre proposé

La discussion après le commit `74f87df` précise la progression à long terme. La résistance et le premier adversaire ont été livrés avant le GO actuel sur les ateliers, gains et sauvegarde. Le premier adversaire est **Béton**, accessible par l’affiche « Prochain combat » dans le gym existant, avec Rémi comme coach entre les rounds. Les journées, le quartier et les phases ultérieures restent à concevoir ensemble.

### Étape 2 — GO Béton

Précision après la livraison : le combat contre Béton se déroule dans une salle de quartier avec public et projecteurs; le sparring reste au gym. L’affiche conserve l’accès direct, sans nouvelle carte. Le coach intervient toujours entre les rounds dans la salle.

Premier adversaire noir original, tenue graphite/ocre, garde haute programmée, jab tête et direct corps suivi d’une grande ouverture. Les compétences enseignées par Rémi restent suffisantes : aucun nouveau bouton. Combat de trois rounds de 60 secondes au maximum, règles de chute/relevé communes, décision aux points explicite (1 par touche nette, 3 par chute adverse), victoire/défaite/égalité, revanche gratuite et retour au gym. Vignette originale du boxeur au tabouret avec Rémi coach, conseil fondé sur le dernier round et reprise volontaire avec les récupérations déjà annoncées. Détails dans le README; validations effectivement terminées dans `VERIFICATIONS.md`.

Les nouveaux combos et l’uppercut chargé discutés avant ce GO restent des possibilités futures. Leur cadence et la distinction appui court/maintenu devront être testées sans ralentir le direct. Les déblocages dépendront d’une progression sauvegardée; ils ne sont pas implémentés dans cette rencontre.

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

### Liste initiale conservée — ordre de réalisation

Les étapes 1 et 2 ci-dessous ont leurs livraisons historiques. Les étapes 3 et 4 constituent maintenant l’intégration du GO actuel, avec les vérifications de boucle décrites en tête. L’étape 5 est la prochaine proposition; les étapes 5 à 8 ne sont pas réalisées ici.

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
- La première livraison intègre chute, relevé et arrêt : six pressions alternées, résistance rendue 55/45/35 et trois rounds de 60 secondes. Le KO spécial pourra venir avec un adversaire conçu pour l’enseigner. L’étape 2 ajoute pour Béton le départage aux points décrit plus haut; Rémi conserve son bilan d’entraînement.

### Sauvegarde de la partie — intégrée avec les premiers gains

La sauvegarde locale versionnée contient maintenant les capacités/plafonds, les séances et meilleurs résultats des ateliers ainsi que les tentatives, victoires, défaites, égalités et meilleur score de Béton. Les préférences de son restent mémorisées séparément. Git/GitHub protègent le code et les ressources du projet, pas les parties individuelles.

- Sauvegarde automatique locale aux moments stables : activité résolue et résultat final d’un combat contre Béton. Les futurs achats, jours/énergie, argent, vêtements et états de tournoi étendront ce format lorsque ces systèmes existeront.
- Une sauvegarde active et une copie précédente valide de secours. Format v1 et schéma validé à l’import; les versions futures sont refusées et protégées de l’écriture automatique. Une erreur de stockage laisse jouer en mémoire et indique de conserver un export, sans annoncer une fausse réussite. Des migrations seront nécessaires lors de futures évolutions de schéma.
- Une séance interrompue ne donne aucun gain. Le résultat d’une séance terminée n’est enregistré qu’une fois. Les futurs coûts et récompenses d’une même activité devront être enregistrés ensemble, pour ne jamais débiter deux fois énergie/argent après reprise.
- Reprise à un point sûr avec les acquis terminés : accueil au gym; un lien direct ouvre l’activité avant son départ. Ni round en cours ni animation ne sont restaurés. Le tournoi aura ses propres points de reprise après les rencontres et journées lorsqu’il existera.
- Au lancement avec une progression : **Continuer** ou **Nouvelle partie**, avec confirmation avant remplacement. Dans **P/Échap ou ☰ au gym** : export JSON et import validé/prévisualisé puis confirmé; mêmes commandes de navigation et confirmation A/B. Le menu d’accueil propose également import/export.
- La sauvegarde locale dépend du navigateur et de l’adresse du jeu. Le site GitHub Pages, `127.0.0.1` et l’adresse Wi-Fi ont des stockages séparés; ordinateur et téléphone ne se synchronisent pas automatiquement. Un fichier exporté permet de transférer la partie et d’en conserver une copie indépendante du navigateur. Importer une partie ne doit pas écraser l’ancienne sans confirmation.
- Aucun compte joueur ni serveur de sauvegarde n’est requis pour cette première version. Une éventuelle synchronisation en ligne sera une phase séparée, avec ses coûts et contraintes discutés avant mise en place.

L’ordre recommandé commence donc par la base de combat, puis un adversaire témoin, avant de compléter le gym. Il permet d’équilibrer les gains d’entraînement contre une rencontre réelle. Les sections suivantes conservent l’historique; cette direction remplace les anciennes propositions de cotisation au gym et de priorité immédiate à la speed ball.

## Historique des livraisons précédentes

Les sections suivantes conservent leur contexte d’origine. La mention d’un atelier alors « futur » est remplacée par l’état actuel décrit en tête.

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

À cette étape, la **speed ball**, puis la **corde à danser**, étaient les prochains ateliers envisagés; le GO actuel les ajoute désormais à la visite, au sac, au miroir et au sparring. Les coups au corps et gardes haute/basse font partie de la convention commune. La progression quotidienne reste ultérieure.

## Convention commune — GO avant la speed ball

Joypad gauche, A/B et ☰ à droite sur mobile; directions flèches/WASD, J/K, E, P/Échap sur ordinateur. Même navigation des menus, mêmes hauteurs de garde et d’attaque au miroir, sac et sparring. Les sorties «← Gym» sont directes. Cette convention doit aussi servir aux prochains lieux : une activité adapte les gestes, elle ne réinvente pas ses boutons. Les gardes haute/basse protègent réellement tête/corps; Rémi annonce sa cible. Les nouvelles ressources complètent les anciennes sans les écraser. Voir `VERIFICATIONS.md` pour les tests effectivement terminés.

## Rôles des ateliers — liste initiale conservée

Chaque atelier doit être agréable à jouer et compréhensible par lui-même. Les gains et objectifs retenus dans cette livraison sont détaillés en tête.

| Activité | Intention du mini-jeu |
| --- | --- |
| Sac de frappe | Première séance intégrée : rythme, précision et cinq enchaînements, dont un au corps. |
| Shadow boxing devant le miroir | Intégré : pratique libre, reflet, défenses, combo et ralenti, sans adversaire. |
| Speed ball | Coordination et régularité. |
| Corde à danser | Rythme, endurance et jeu de jambes. |
| Sparring avec Rémi le Tank | Mettre en pratique le timing, la précision, les blocages, les esquives et les réponses. |

Plus tard, les séances consommeront de l’**énergie du jour**. Leurs gains de capacités sont déjà reliés au combat dans le GO actuel. Cette réserve quotidienne restera distincte de l’**endurance pendant un round**, qui sert aux actions et récupère entre les échanges. Les coûts et règles de récupération quotidienne restent à définir avec la boucle des journées et du sommeil.

Le gym est explorable et ses cinq activités ont maintenant une boucle jouable. Le premier combat contre Béton et la progression sauvegardée sont intégrés. L’énergie quotidienne et le sommeil, puis la ville, la maison, l’emploi, l’argent et les rencontres suivantes restent à venir.

Sur la future carte extérieure, le personnage portera un survêtement Adidas noir à bandes blanches avec sa tuque rouge. Les photos fournies ont servi de références graphiques; elles ne sont pas publiées avec le jeu.
