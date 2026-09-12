# BoxeurDeux-D

Le jeu relie **une maison explorable, un quartier montréalais et le gym**. Votre boxeur à tuque rouge se promène en survêtement noir à bandes blanches dans la maison et les rues, puis retrouve sa tenue d’entraînement au gym. Les ateliers améliorent des capacités sauvegardées, jusqu’aux plafonds du premier adversaire. La porte de la salle communautaire ouvre directement le combat contre **Béton**, sans intérieur à explorer; elle remplace l’ancienne affiche du gym.

Le GO actuel ajoute **maison, quartier, énergie de journée, sommeil et sauvegarde du lieu de reprise** à la précédente livraison des ateliers et des gains. **La boucle est jouable, publiée et vérifiée sur ordinateur et mobile simulé, en local et sur le site public.** Les résultats détaillés sont consignés dans [`docs/VERIFICATIONS.md`](docs/VERIFICATIONS.md). Si votre sauvegarde reprend au gym, sortez par sa porte pour découvrir le quartier. Un indicateur accompagne le premier chargement des images, qui peut prendre un moment selon la connexion.

Premier prototype jouable de sparring dans le gym validé, en JavaScript avec Phaser **4.2.1** et Vite **8.2.2**. Caméra fixe en 1280 × 720, Rémi le Tank de face et joueur de dos semi-transparent. Le décor original est conservé. Les deux boxeurs portent maintenant leur tenue de sparring : casque, débardeur, short et gants, dans leurs couleurs respectives.

Un round dure **60 secondes**. Essayez les frappes pendant les ouvertures, lisez les annonces de Rémi, défendez-vous et laissez revenir l'endurance. Rémi reste un partenaire d’entraînement. La séance **Résistance et relevés** ajoute les chutes et le compte de dix; le sparring classique et les trois leçons restent disponibles séparément.

## Béton, premier adversaire — étape 2

Rejoignez la **salle communautaire dans le quartier**, puis utilisez **E / A** à sa porte pour rencontrer Béton. Cette entrée ouvre directement le combat, sans vestibule ni bâtiment explorable; l’ancienne affiche du gym a été retirée. Accès direct de développement : `?scene=fight`. Le combat se déroule dans une **salle de boxe de quartier**, devant le public et sous les projecteurs. Le sparring de Rémi reste dans le gym validé. Même cadrage fixe 1280 × 720 et mêmes commandes; le retour du combat vous ramène dans le quartier.

Béton est un boxeur noir original, calme et précis, en tenue graphite et ocre. Sa garde haute est programmée, indépendante des boutons du joueur. Son jab vise la tête; son direct vise le corps et laisse une ouverture plus longue pour répondre. Les gestes appris avec Rémi restent les mêmes : gardes haute/basse, esquives, coups tête/corps et combo J/K/J ou A/B/A. Aucun uppercut chargé ni nouveau combo à débloquer à cette étape.

- **Trois rounds de 60 secondes maximum**. Les règles de chute et de relevé décrites ci-dessous s’appliquent : compte de dix, arrêt à trois chutes dans le round ou quatre dans le combat. Une revanche ne coûte rien.
- **Décision aux points** au terme des trois rounds : 1 point par touche nette, plus 3 points par chute adverse. Les coups bloqués ou esquivés ne donnent aucun point. Le plus haut total gagne; un total identique donne un match nul. C’est le barème simple de ce prototype, affiché avant le combat.
- **Entre les rounds**, le joueur rejoint son tabouret et Rémi intervient comme coach avec sa serviette. Son conseil dépend des coups reçus, des blocages et des ripostes du round qui vient de finir. Bilan du round, total des points et récupération annoncée restent visibles. Le joueur choisit quand lancer la reprise.
- **À la reprise** : endurance pleine à votre maximum entraîné, puis +20 de résistance dans la limite du maximum de chaque boxeur. Le joueur commence à 100 et peut atteindre 108; Béton reste à 100. Seul le compteur des chutes du round repart à zéro; points et chutes du combat restent conservés. Les menus, A/B, pause, portrait et sorties suivent la convention commune.
- **Fin** : victoire, défaite ou match nul clairement indiqué; revanche, commandes et retour au quartier. Le résultat final rejoint l’historique sauvegardé de Béton : tentatives, victoires, défaites, égalités et meilleur score. Rémi garde ses séances d’entraînement séparées.

Les valeurs du rythme et les conseils sont dans `src/game/OpponentProfiles.js`. Les ressources originales sont dans `public/assets/sprites/beton/` et `public/assets/sprites/corner/`, avec sources et prompts dans les dossiers correspondants de `references/characters/`. Voir `docs/VERIFICATIONS.md` pour les essais réellement terminés.

## Résistance et relevés — étape 1

Approchez Rémi puis **E / A → Résistance et relevés · 3 rounds**. La séance est aussi proposée dans **Votre séance** à l’accueil du ring, ou directement par `?scene=sparring&lesson=resistance`. Elle dure jusqu’à **trois rounds de 60 secondes**, avec un arrêt volontaire entre les rounds et la possibilité de recommencer toute la séance.

- **Endurance** : la jauge existante paie les frappes, les gardes et les esquives; elle remonte pendant les moments de repos. La vider ne provoque pas une chute.
- **Résistance** : une base de 100 pour chaque boxeur, jusqu’à 108 pour le joueur entraîné. Seules les touches nettes la font descendre : dégâts de base jab 12, direct 18, crochet 22, auxquels s’ajoute le bonus de puissance des coups du joueur. Une garde à la bonne hauteur ou une esquive réussie évite cette perte. Ces valeurs sont des réglages de prototype regroupés dans `KNOCKDOWN_RULES`.
- **Au tapis** : à zéro résistance, le gant termine son véritable contact, puis le boxeur chute. Le temps du round s’arrête pendant le décompte et le relevé. Les deux touches d’attaque servent alors à se relever, pas à frapper un boxeur au sol.
- **Se relever** : six pressions alternées **J → K → J → K → J → K**, ou **A → B → A → B → A → B** sur téléphone. Commencez par J/A et suivez le repère; au moins 0,35 s entre les efforts acceptés. Maintenir une touche ou marteler ne répète pas les efforts. Pas de pénalité cachée pour une pression trop tôt.
- **Compte de dix** : le compteur suit les secondes actives; à dix sans relevé, la séance se termine par KO. Rémi reprend ses appuis au compte de 6, 8 ou 9 selon ses chutes dans la séance. Ses décisions ne lisent pas les boutons du joueur.
- **Limites** : troisième chute dans un round ou quatrième dans l’ensemble de la séance = arrêt, sans nouvel essai de relevé. Les échanges simultanés sont résolus équitablement, y compris une double chute. Un coup arrivé à la cloche est compté avant la fin du round.
- **Après un relevé** : résistance rendue de 55, puis 45, puis 35 selon le nombre total de chutes; endurance du joueur ramenée à 60. Rémi laisse ensuite une ouverture. Au round suivant : endurance pleine à votre maximum et +20 de résistance sans dépasser le maximum de chacun (joueur jusqu’à 108, Rémi 100); les chutes du round repartent à zéro, le total est conservé.
- **Pause et sortie** : **P / Échap / ☰** arrête aussi le décompte; portrait, perte de focus et changement de périphérique libèrent les appuis et demandent une reprise explicite. **← Gym** reste direct. La pause permet d’ouvrir Commandes ou de recommencer toute la séance.

Au terme de la séance, le bilan indique les touches, défenses, combos et chutes. Terminer avec au moins **10 touches nettes, blocages ou esquives réussis** accorde **+2 de résistance**, jusqu’à 108. Ce mode reste une séance avec Rémi, sans classement officiel. Le premier adversaire Béton est disponible séparément. Le KO immédiat spécial reste une possibilité future.

## Phase tenues et fluidité — 10 septembre 2026

La base comprend dix poses par boxeur : garde, jab/direct, préparations et demi-extensions, protection, réaction et esquive. Trois poses de crochet complètent maintenant celles du joueur. Certaines variantes de jab/direct utilisent un miroir pour garder exactement la même identité. Les frappes passent par une préparation, une pose intermédiaire, le contact pendant 100 ms, puis un retour progressif. L’échelle des personnages reste constante; un cadrage fixe légèrement plus large garde les pieds visibles pendant les échanges rapprochés.

Le paysage mobile est conservé. Un ancien doigt resté sur Garde pendant une perte de focus ne peut plus activer accidentellement « Reprendre » au relâchement.

La speed ball et la corde disposent de leurs exercices, décrits ci-dessous. Le nouveau système de journées est décrit plus bas; l’endurance du round et la résistance restent indépendantes de l’énergie quotidienne.

## Commandes et cadrage dans tout le jeu

Sur ordinateur, **aucun bouton de jeu ni rappel permanent des touches** ne recouvre l’action; les raccourcis du pied de page sont également masqués. **P ou Échap → Commandes** ouvre l’aide depuis la pause dans tout le jeu, y compris les deux ateliers de rythme. Revenir de l’aide au menu ne reprend pas la partie. Les petits repères de timing indiquent quand agir, sans afficher une manette sur l’image.

Sur téléphone en paysage, les boutons occupent **deux bandes latérales hors de l’image du jeu**. La scène centrale garde exactement le même cadrage 1280 × 720 et les mêmes proportions 16:9 que sur ordinateur. Elle s’adapte à la largeur et à la hauteur restantes, sans être étirée ni coupée. Le joypad occupe la marge gauche; A/B et le bouton ☰ sont à droite. Les menus gardent ces repères : joypad pour sélectionner, A pour valider, B pour revenir. Le son se règle dans la pause. En portrait, une invitation demande de tourner le téléphone et le jeu se met en pause.

La détection utilise le périphérique de pointage principal : un ordinateur à la souris reste sans boutons même si son navigateur annonce une capacité tactile. Une fenêtre verticale sur ordinateur reste jouable; l’invitation à tourner est réservée au tactile. Un changement de périphérique libère les commandes et met la partie en pause.

## Explorer le gym

La scène conserve **1280 × 720 et le même cadrage 16:9** sur ordinateur et téléphone en paysage. Sa taille d’affichage s’adapte aux deux dimensions de la fenêtre; le mobile ne révèle pas une autre portion de la salle.

- Marcher : **flèches**, **WASD** ou **ZQSD**; joypad tactile à gauche, avec déplacements diagonaux au pouce.
- Interagir : **E**, **Entrée**, ou **A** à droite quand vous êtes près de Rémi ou d’un atelier.
- Pause : **P**, **Échap**, ou bouton **☰**. Échap ferme aussi une conversation.
- Sur ordinateur, ouvrir **Commandes** dans la pause pour consulter les raccourcis. Sur téléphone, le joypad et les boutons A/B se trouvent dans les bandes latérales.
- Rémi, près des marches à droite du ring, propose le sparring libre, ses trois leçons et Résistance et relevés. La séance choisie s’ouvre sur son menu avant démarrage.
- Le sac ouvre une séance guidée de 45 secondes; son accueil explique l’exercice avant démarrage.
- Le miroir ouvre une pratique libre des mouvements, sans adversaire ni limite de temps.
- La speed ball et la corde ouvrent chacune une séance de rythme de 45 secondes, avec préparation, bilan et nouvel essai. Chaque accueil annonce l’objectif, le gain possible et votre plafond.
- **← Gym**, toujours accessible dans la bordure d’une activité, ramène directement à votre position; cette sortie reste aussi dans les menus. Le clavier et les contacts sont libérés à chaque changement de scène.

Les collisions empêchent de traverser le ring, le sac et les meubles. Les cinq ateliers sont accessibles à pied. La porte permet de **sortir vers le quartier**; le gym demeure gratuit, les séances consomment seulement l’énergie quotidienne annoncée avant leur démarrage.

Le personnage d’exploration du gym porte une tuque rouge courte avec un petit motif noir, un débardeur bleu et blanc, un short noir et des chaussures bleues. Douze poses partagent une échelle et un point de contact au sol. Rémi a une pose d’accueil adaptée à la même vue; le sparring garde ses personnages et son décor validés. La maison et le quartier utilisent son survêtement noir à bandes blanches et sa tuque rouge.

## Maison et quartier

Une nouvelle partie commence **à la maison**. On peut se déplacer dans la pièce, rejoindre le lit ou sortir. Le lit propose de passer au lendemain : seule la confirmation déclenche le sommeil. La maison laisse de la place pour de futures activités; garde-robe, trophées et autres interactions ne sont pas fonctionnels à cette étape.

Le personnage est affiché deux fois plus grand dans la maison pour correspondre aux proportions du mobilier. Son ombre et son empreinte au sol suivent cette taille, avec les pieds ancrés sur le plancher dans toutes les poses. Le cadrage reste 1280 × 720 sur ordinateur et téléphone.

Le quartier mesure **2379 × 1488** dans le monde du jeu. L’écran en montre une portion de **1280 × 720** : la caméra suit le personnage et s’arrête aux limites de la carte. La carte entière n’est pas réduite à un seul écran. Même échelle, mêmes proportions et même portion visible sur ordinateur et mobile paysage.

- **Maison** : porte vers l’intérieur explorable et le lit.
- **Gym** : porte vers les cinq ateliers et Rémi.
- **Salle communautaire** : porte vers la présentation du combat contre Béton, sans intérieur explorable.
- **Chantiers et cônes orange** : obstacles qui ferment les futurs accès. Le dépanneur et le local fermé sont décoratifs, sans achat ni travail disponible.

Marchez avec **flèches/WASD/ZQSD** ou le **joypad mobile**, puis interagissez avec **E/Entrée** ou **A**. Dans les choix, Entrée/A valide et Échap/B revient. **P/Échap** ou **☰** ouvre le menu pause et Commandes. Les collisions des bâtiments et meubles gardent les déplacements dans les zones accessibles. Se promener, entrer, sortir et consulter les menus ne coûte aucune énergie.

## Énergie de journée et sommeil

Chaque journée commence avec **100 points d’énergie quotidienne**. Cette réserve paie les séances du gym; elle ne remplace ni l’endurance des gestes ni la résistance aux coups pendant un combat. Les coûts sont annoncés avant de commencer.

| Séance | Coût en énergie de journée |
| --- | --- |
| Sac | 15 |
| Corde à danser | 15 |
| Speed ball | 15 |
| Shadow boxing au miroir | 5 |
| Sparring libre ou Résistance et relevés | 20 |
| Une leçon de Rémi | 10 |
| Combat contre Béton et revanche | 0 |
| Déplacements, portes et menus | 0 |

Le coût est débité et sauvegardé **au démarrage effectif**, jamais à la simple ouverture de l’accueil de l’activité. Une pause puis reprise ne redébite rien; **recommencer lance une nouvelle séance et paie son coût**. Abandonner une séance ne rembourse pas l’énergie déjà dépensée et n’accorde pas son gain de capacité. Une énergie insuffisante empêche de démarrer, avec un message invitant à rentrer dormir. Le combat contre Béton reste accessible même à zéro énergie.

Au lit, confirmer le sommeil **avance le jour de un et remet l’énergie quotidienne à 100**. Les capacités, leurs plafonds et les résultats restent acquis; dormir n’accorde aucun bonus supplémentaire. Il est toujours possible de rentrer et de dormir à zéro énergie. Le jour, l’énergie et le lieu de reprise sont enregistrés automatiquement. Les prix sont regroupés dans `src/game/DayRules.js` pour les ajustements de rythme.

## Le sac chorégraphié — 11 septembre 2026

Approchez-vous du sac dans le gym et interagissez pour ouvrir l’atelier. La séance dure **45 secondes** : observez les coups annoncés, puis frappez lorsque leur repère s’allume. Cinq enchaînements reviennent au fil de l’exercice : jab, double jab, jab–direct, jab–direct–crochet et jab–direct–crochet au corps. Une pression déclenche un coup; maintenir une touche ne répète pas les frappes.

- **J** : jab gauche (main avant); **K** : direct droit (main arrière).
- Dans l’enchaînement annoncé **jab → direct → crochet**, les deux premiers coups réussis ouvrent une courte fenêtre : le troisième **J** déclenche alors le crochet. Hors de cette fenêtre, J reste un jab. Au tactile, **A** reste A et son sous-titre indique **Crochet** quand il est disponible.
- **P / Échap** : pause ou reprise; **Commandes** explique les mouvements depuis le menu.
- **M** : couper ou rétablir le son; le bouton tactile Son se trouve dans le menu pause.
- Le bilan donne les contacts, la précision et les enchaînements réussis, avec un conseil. Il permet de recommencer ou de revenir au même endroit dans le gym.

Le boxeur est en **garde de droitier : pied gauche devant, pied droit derrière**. Les nouvelles poses montrent le jab gauche, le direct droit avec pivot du pied droit arrière et le crochet gauche. Le gant, l’impact sonore et le balancement du sac correspondent au contact compté. Le boxeur garde sa tuque rouge et sa tenue bleue/blanche; six poses dessinées représentent la garde, les préparations et les trois frappes. Le sac et ses chaînes sont une ressource transparente séparée du nouveau décor. Ces images viennent de la génération intégrée; les sources et prompts du personnage corrigé sont conservés dans `references/characters/bag-orthodox/PROMPTS.md` (décor et sac dans le dossier `bag`). La fluidité pourra encore gagner des poses intermédiaires.

Le même enchaînement est maintenant disponible en **sparring libre**, avec les règles ci-dessous. Une séance terminée avec **6 contacts et 50 % de précision** donne **puissance +1**, jusqu’à un bonus de 5. Démarrer ou recommencer la séance coûte 15 points d’énergie quotidienne.

## Speed ball et corde à danser

Rejoignez l’appareil ou le tapis dans le gym, puis interagissez avec **E** sur ordinateur ou **A** sur mobile. Accès directs : `?scene=speedball` et `?scene=rope`. Chaque séance dure **45 secondes**; il faut terminer avec **au moins 20 bons temps et 60 % de précision** pour obtenir son gain.

- **Speed ball** : alternez les mains au rythme des retours de la balle. Le personnage adulte à tuque rouge prépare sa frappe, touche la balle puis ramène le bras; le point est compté au contact. Une balle indépendante accompagne le mouvement sous sa plateforme.
- **Corde à danser** : alternez les appuis gauche/droit au passage de la corde. Des poses dédiées montrent la préparation, le saut, la réception et le faux pas; la corde passe autour du corps puis sous les pieds au moment du point compté.
- **Ordinateur** : J pour la gauche, K pour la droite. **Mobile paysage** : A pour la gauche, B pour la droite dans la marge droite; le joypad sert aux menus. L’aide affiche les touches correspondant au périphérique utilisé.
- Un **repère de rythme discret** guide l’appui sans cacher le personnage. Une pression lance un mouvement complet; maintenir une touche ne répète pas l’action. Pause **P/Échap** ou **☰**, aide **Commandes**, puis reprise explicite. **← Gym** quitte directement la séance.

Les deux ateliers utilisent leurs propres sprites transparents, dans la même tenue bleue/blanche à tuque rouge que le gym. Les ressources finales se trouvent dans `public/assets/sprites/speedball/` et `public/assets/sprites/rope/`; les sources et prompts de génération intégrée sont conservés dans les dossiers correspondants de `references/characters/`.

## Gains du gym et plafonds

Les progrès s’appliquent au joueur lors de la prochaine séance de combat, y compris contre Béton. Les règles, les coûts des gestes et le rythme de l’adversaire restent lisibles; un bonus ne bloque ni n’esquive à votre place. Le premier palier reste plafonné même après de nombreuses répétitions.

| Atelier | Séance utile | Gain | Plafond au palier Béton |
| --- | --- | --- | --- |
| Sac | 6 contacts et 50 % de précision | Puissance +1 aux dégâts des touches nettes | Bonus +5 |
| Speed ball | 20 bons temps et 60 % de précision | Récupération +2 points de pourcentage | Bonus +10 % |
| Corde | 20 bons temps et 60 % de précision | Endurance maximale +2 | 110, base 100 |
| Résistance et relevés | Terminer la séance et réussir 10 touches nettes ou défenses | Résistance maximale +2 | 108, base 100 |
| Miroir, leçons et sparring libre | Pratiquer les gestes et la lecture de Rémi | Aucun bonus permanent | Pratique libre |

Les gains sont annoncés avant l’atelier et présentés au bilan, avec le plafond. Une séance sous l’objectif conserve son résultat sans attribuer de capacité. Au réglage de récupération standard, la speed ball fait passer la récupération de base de 20 points/s à un maximum de 22 points/s. Le gym ne demande aucun argent; ses séances utilisent l’énergie quotidienne décrite ci-dessus. Le plafond atteint ne supprime pas le coût d’une nouvelle séance.

## Sauvegarder et reprendre

La partie est **sauvegardée automatiquement dans ce navigateur** aux moments stables : lieu de reprise pendant l’exploration, démarrage payé d’une séance, activité résolue, résultat final contre Béton et sommeil confirmé. Le fichier **version 2** contient le jour, l’énergie quotidienne et le lieu/position/direction de reprise, en plus des capacités, plafonds, résultats des ateliers et historique de Béton. Une copie précédente valide sert de secours si la sauvegarde active est endommagée.

- Au lancement, une progression existante propose **Continuer** dans le lieu sauvegardé ou **Nouvelle partie** à la maison. Recommencer demande une confirmation. Le menu possède sa propre navigation clavier et bloque les commandes du lieu derrière lui.
- **P/Échap ou ☰ dans les lieux explorables** permet d’**Exporter la sauvegarde** en JSON et d’**Importer** une partie. L’accueil propose aussi ces actions. Un import valide affiche la partie sélectionnée et demande confirmation avant remplacement; un JSON invalide ou une version future est refusé.
- Les sauvegardes **v1 sont migrées automatiquement vers v2** en conservant acquis et résultats. Elles reprennent au gym au jour 1 avec 100 points d’énergie; l’ancienne source est gardée en copie de secours lorsque le stockage le permet. Aucun effacement manuel n’est nécessaire.
- Un stockage bloqué ne casse pas la séance : les gains restent en mémoire et l’interface signale qu’ils ne sont pas enregistrés. Exportez alors la partie avant de fermer. Un fichier local de version future est protégé contre l’écrasement automatique par une ancienne version du jeu.
- Une séance interrompue ne reçoit pas de gain et sa dépense de départ reste enregistrée. La sauvegarde reprend dans un lieu explorable sûr; elle ne restaure ni une animation ni un round en cours. Les liens directs `?scene=…` sont des points d’accès de développement qui prennent la priorité sur le lieu sauvegardé et ouvrent les activités avant leur départ; ils ne donnent aucune énergie gratuite.

**Le navigateur et l’adresse déterminent la sauvegarde.** GitHub Pages, `127.0.0.1` et l’adresse Wi-Fi ont des stockages distincts; ordinateur et téléphone ne se synchronisent pas automatiquement. Exporter puis importer permet de transférer la partie. Git/GitHub conserve le projet, pas votre partie individuelle. Aucun compte joueur ni serveur de sauvegarde n’est requis.

## Combo dans le sparring libre

**J → K → J : jab gauche, direct droit, crochet gauche.** Attendez le retour en garde après chaque coup, puis pressez le suivant dans la demi-seconde. Aucun coup n’est mis en attente et maintenir une touche ne répète pas l’attaque. Hors enchaînement, J reste un jab; le crochet n’a pas de troisième touche dédiée.

Les deux premières frappes peuvent être bloquées : le crochet reste lançable, mais le bilan compte un **combo complet** seulement si les trois coups ont touché. Une garde haute, une esquive, un coup reçu, une pause, un manque d’endurance ou une attente trop longue interrompt la chaîne. Bas peut rester tenu entre les frappes pour enchaîner au corps. Une frappe déjà engagée finit son mouvement. Au tactile, le sous-titre du bouton A devient Crochet; il prend une teinte verte lorsque les 21 points d’endurance nécessaires sont disponibles.

Le coût des trois coups est de **48 points d’endurance** (10 + 17 + 21), hors récupération entre les coups. Rémi laisse des ouvertures fixes un peu plus longues en libre, sans réagir à la lecture de vos boutons. Les trois leçons conservent jab/direct et leur rythme initial. Le crochet dispose de trois nouvelles poses vues de dos, avec casque et tenue de sparring; le contact, le son et les compteurs utilisent la même horloge.

## Shadow boxing devant le miroir

Rejoignez le miroir en haut à gauche du gym puis **E / Entrée → Pratiquer devant le miroir**. Cet atelier permet de répéter librement les mouvements, sans adversaire, sans limite de temps et sans coût d’endurance.

- **J** : jab gauche; **K** : direct droit; **J → K → J** : crochet gauche après les deux premiers gestes, avec la même cadence que le sparring. Une pression par geste, après le retour en garde.
- **Haut / W** maintenu : garde haute; **Bas / S** maintenu : garde basse. **Bas + J/K** vise le corps. **A / D ou ← / →** : esquives. La garde haute et les esquives interrompent le combo; bas maintenu permet de l’enchaîner au corps.
- **P / Échap** : pause; **Commandes** : aide; **M** : son/muet. Le menu propose une vitesse normale ou un **ralenti à 65 %** pour observer le geste.
- **Terminer la séance**, dans la pause, présente les mouvements pratiqués : frappes, enchaînements, esquives et temps en garde. Ce bilan ne note ni précision ni coups portés à un adversaire. Recommencez ou revenez au même endroit dans le gym.
- Le reflet reproduit instantanément la pose, l’inclinaison et les déplacements du personnage. Pause et ralenti s’appliquent ensemble au boxeur et à son reflet.

Le personnage conserve sa tuque rouge, sa tenue bleue/blanche et sa garde de droitier. Les six poses du sac sont réutilisées; une garde haute et deux esquives dessinées les complètent. Un nouveau décor du même gym encadre le reflet. Les sons sont de courts souffles de mouvement, sans bruit de frappe sur un adversaire. Les ressources viennent de la génération d’images intégrée; sources et prompts : `references/characters/mirror/PROMPTS.md`.

Sur mobile, jouez en paysage : joypad à gauche pour gardes/esquives, A/B à droite pour frappes. **← Gym** quitte directement la pratique, sans passer par la pause. Les appuis sont libérés en cas de perte de focus, de changement de périphérique ou de passage en portrait. La reprise reste explicite. Aucun compte ni service distant n’est nécessaire pour pratiquer.

## Leçons de Rémi et son

Le menu **Votre séance** propose le sparring libre et trois exercices guidés. Chaque exercice demande **trois répétitions réussies**, au rythme tranquille de Rémi, avec une limite de 60 secondes.

| Exercice | Réussite attendue |
| --- | --- |
| Placer son jab | Un jab à la tête dans chacune de trois ouvertures différentes. Rémi laisse travailler sans attaquer. |
| Bloquer et souffler | Bloquer un coup à la tête avec la garde haute, relâcher, puis récupérer 8 points d’endurance. |
| Esquiver et répondre | Esquiver du côté indiqué, puis placer un jab à la tête dans l’ouverture qui suit. |

Les conseils et la progression apparaissent à gauche pendant l’exercice. Le bilan propose une piste pour progresser, un nouvel essai ou la leçon suivante. **Choisir une séance**, en pause ou au bilan, ramène au menu et remet les compteurs à zéro. Ces trois leçons servent à apprendre; les gains permanents viennent des ateliers du tableau ci-dessus. Chaque démarrage de leçon coûte 10 points d’énergie quotidienne.

La cloche, les impacts, les blocages, le souffle et les réussites ont des sons distincts, synthétisés localement avec Web Audio. Le son commence après une interaction et s’arrête en pause, en portrait ou lors d’une perte de focus. La touche **M** coupe le son sur ordinateur; le bouton tactile **Son / Muet** est dans le menu pause. Le volume du sparring se règle au menu et en pause. Ces préférences sont mémorisées dans le navigateur lorsque son stockage est disponible. Le jeu reste utilisable sans audio. Aucune boucle d’ambiance n’est ajoutée à cette étape.

## Lancer

Node.js 24 conseillé (`nvm use` si disponible). Depuis ce dossier dans VS Code :

```sh
npm run dev
```

Les dépendances sont déjà installées. Si nécessaire, `npm ci` réinstalle les versions verrouillées. **Si le serveur tourne déjà, réutilisez-le.** Vite écoute sur le port strict 5173 : ne lancez pas de serveur concurrent et ne changez pas de port pour contourner le serveur existant.

- Sur cet ordinateur : **http://127.0.0.1:5173/**
- Accès explicite par l’index : **http://127.0.0.1:5173/index.html** (même accueil, nouvelle partie à la maison ou Continuer).
- Accès de développement aux lieux : **http://127.0.0.1:5173/?scene=home**, **http://127.0.0.1:5173/?scene=neighborhood** et **http://127.0.0.1:5173/?scene=gym**. Sans paramètre, le jeu utilise l’accueil et le lieu sauvegardé.
- Accès direct au sparring : **http://127.0.0.1:5173/?scene=sparring**. Ce raccourci fonctionne aussi sur le site publié.
- Premier combat contre Béton : **http://127.0.0.1:5173/?scene=fight**. Dans le parcours normal, entrer par la salle communautaire du quartier.
- Accès direct au sac : **http://127.0.0.1:5173/?scene=bag**.
- Accès direct au miroir : **http://127.0.0.1:5173/?scene=shadow**. Fonctionne aussi sur GitHub Pages.
- Speed ball : **http://127.0.0.1:5173/?scene=speedball**; corde : **http://127.0.0.1:5173/?scene=rope**.
- Sur le même Wi-Fi : **http://192.168.50.123:5173/** (adresse vérifiée le 11 septembre 2026; elle peut changer).

Pour retrouver l'adresse Wi-Fi du PC : `ip -4 addr show wlp45s0`. Vite conserve `host: '0.0.0.0'` pour le réseau local. Aucun compte joueur, clé API ni service d'IA n'est nécessaire pendant une partie.

```sh
npm test         # Règles du sparring, du sac, déplacements et autres modèles
npm run build    # Compilation vers dist/
npm run test:knockdown # Résistance, chutes, relevés clavier/tactile et transitions de rounds
npm run test:beton # Combat, victoire/défaite, coach au coin et commandes tactiles
npm run test:controls # Convention commune, gardes tête/corps, joypad A/B et transitions
npm run test:browser # Parcours navigateur (Playwright local déjà disponible ici)
npm run test:combo # Combo sparring réel au clavier/tactile, contacts et interruptions
npm run test:shadow # Miroir, mouvements/reflet, ralenti, tactile et retours au gym
npm run test:training # Trois leçons complètes, bilans et audio
npm run test:gym # Marche, collisions, ateliers, aller/retour sparring et tactile
npm run test:visibility # Pixels réellement visibles près des ateliers (WebGL)
GYM_RENDERER=canvas npm run test:visibility # Même contrôle avec le rendu Canvas
npm run test:commands # Aide dans la pause, clavier, tactile et petites fenêtres
npm run test:bag # Séance au sac, rythme, combo, contacts, bilan et retour
npm run test:side-controls # Commandes hors image dans le gym et le ring
npm run test:input-device # PC déclarant du tactile, mobile et changements de périphérique
npm run test:progression # Ateliers de rythme, gains, sauvegarde/reprise et cadrage mobile
npm run test:exploration # Maison/quartier/gym, énergie, lit, import/reprise, clavier et tactile
npm run test:days # Coûts, refus, reprise et énergie du gym sur ordinateur/mobile
npm run test:lifecycle # Reprise avant chargement et interruptions pendant la nuit
npm run test:compact-menus # Menus et boutons accessibles sur petit écran ordinateur
npm run test:static # Vérifie dist/ au clavier et au tactile, après compilation
npm run preview  # Prévisualisation locale de dist/ sur le port strict 4173
```

`index.html` à la racine est l’entrée de développement Vite. Pour un hébergement web statique, `npm run build` produit l’index prêt à servir dans `dist/index.html`; il faut transférer tout le contenu de `dist/`, avec ses ressources. Ouvrir le fichier source directement depuis le disque ou afficher son code sur GitHub ne lance pas le jeu.

## Publication sur GitHub Pages

Le dépôt est associé à `https://github.com/mixmasterkd/BoxeurDeux-D`. Adresse du jeu : **https://mixmasterkd.github.io/BoxeurDeux-D/**.

La première page publiée servait l’ancien index source et affichait seulement « Prochain prototype ». Le workflow `.github/workflows/pages.yml` compile désormais le jeu avant publication : dépendances verrouillées, tests autonomes, compilation Vite, puis déploiement du seul dossier `dist/`. Les chemins relatifs conservent le chargement du décor et des sprites dans le sous-dossier `/BoxeurDeux-D/`.

La source **GitHub Actions** est configurée dans **Settings → Pages → Build and deployment**. Envoyer les commits de `main` sur GitHub avec **Push / Envoyer** dans VS Code, ou `git push origin main` depuis un terminal authentifié. Chaque envoi sur `main` déclenche ensuite le workflow; il peut aussi être lancé dans **Actions → Publier le sparring sur GitHub Pages → Run workflow**. Attendre la réussite du job `deploy` avant de considérer la nouvelle version comme publiée.

Les tests navigateur facultatifs utilisent Playwright déjà disponible dans cet environnement; ils ne sont pas exécutés dans le workflow, qui ne l’installe pas. Vérifier le site réellement publié avec `SPARRING_URL=https://mixmasterkd.github.io/BoxeurDeux-D/ npm run test:static`. Sans cette variable, le test sert `dist/` par interception HTTP locale, sans nouveau serveur.

## Commandes du sparring

| Action | Clavier | Tactile |
| --- | --- | --- |
| Jab / direct à la tête | J / K | A / B |
| Jab / direct au corps | Bas ou S + J / K | Joypad bas + A / B |
| Crochet en combo (libre) | J → K → J | A → B → A |
| Garde haute / basse | Haut/W / Bas/S maintenu | Joypad haut / bas maintenu |
| Esquives gauche / droite | Gauche/A / Droite/D | Impulsion joypad gauche / droite |
| Pause | P ou Échap | ☰ |
| Valider / retour dans un menu | Entrée / Échap (J/K aussi) | A / B |
| Son / sourdine | M | Son / Muet dans la pause |
| Quitter une activité | ← Gym dans la bordure | ← Gym dans la marge |

Le combat contre Béton propose un retour au **quartier**; les activités d’entraînement reviennent au **gym**.

Une pression déclenche une frappe ou une esquive; relâchez puis appuyez de nouveau pour la suivante. Les directions acceptent flèches, WASD et ZQSD. Espace n’est plus une commande de garde. Une attaque engagée prend la priorité sur la garde. La garde revient ensuite si elle est encore maintenue. Le changement d'onglet, la perte de focus et le passage en portrait libèrent les commandes et mettent le round en pause.

**Téléphone : utilisez le paysage.** En portrait, une invitation demande de tourner l'appareil. La scène conserve ses proportions et s'adapte à la largeur et à la hauteur disponibles; les boutons restent dans les bandes latérales, hors de l’image, près des pouces. Aucune API de verrouillage d'orientation n'est nécessaire.

## Apprendre avec Rémi

- Rémi commence par laisser une ouverture. Sa garde et ses attaques suivent un calendrier indépendant de vos boutons.
- L’annonce ambrée distingue **TÊTE · GARDE HAUTE** et **CORPS · GARDE BASSE**. Rémi garde une hauteur annoncée jusqu’au contact. La garde ne protège que la bonne hauteur; frapper l’ouvre temporairement. Dans la leçon de riposte, « Préparez / Esquivez » indique le côté sûr. La fenêtre de protection dure 0,36 s, après 0,08 s de mouvement.
- Les marques dorées indiquent une touche, le bouclier bleu un blocage, et les traits verts une esquive. Le bilan distingue touches données/reçues, blocages et esquives réussies.
- Jab : 10 points d'endurance; direct : 17; crochet : 21; esquive : 12. La garde coûte 7 points/s et un blocage 8 points supplémentaires. Au repos, récupération de base de 20 points/s après un court délai, augmentée par le bonus de speed ball. Une garde épuisée ne protège plus : relâchez pour souffler.
- En sparring libre, les réglages proposent trois rythmes de Rémi et deux vitesses de récupération. Les leçons conservent le rythme tranquille; la récupération reste réglable. Une annonce déjà commencée conserve sa durée pour rester prévisible.
- Le bilan de fin permet de recommencer un round avec des statistiques remises à zéro.

## Fichiers utiles

- `src/main.js` : démarrage et mise à l'échelle Phaser.
- `src/scenes/GymScene.js`, `src/game/GymWorld.js`, `src/ui/GymUI.js` et `src/ui/gym.css` : visite, collisions, interactions et commandes.
- `public/assets/backgrounds/gym-exploration.png` et `public/assets/sprites/exploration/` : ressources finales de la visite.
- `references/characters/exploration/PROMPTS.md` : références, prompts exacts et préparation par imagegen intégré.
- `scripts/prepare-gym-sprites.mjs` : extraction technique reproductible des sprites depuis leurs sources alpha.
- `src/scenes/BagScene.js`, `src/game/BagSession.js`, `src/ui/BagUI.js` et `src/ui/bag.css` : séance au sac, chorégraphies, précision et menus.
- `src/scenes/BagFighterView.js` : poses du joueur, contact des gants et oscillation du sac.
- `src/game/RhythmSession.js`, `src/scenes/RhythmScene.js`, `src/scenes/RhythmTrainingView.js`, `src/ui/RhythmUI.js` et `src/ui/rhythm.css` : speed ball/corde, contacts, poses, repères, bilans et commandes adaptées.
- `src/game/CareerProfile.js`, `src/ui/CareerMenu.js` et `src/ui/career.css` : gains plafonnés, sauvegarde versionnée, secours, import/export et accueil de reprise.
- `src/game/DayRules.js` et `src/game/DailyActivityGate.js` : prix des séances, règles des journées et débit au démarrage.
- `src/game/ExplorationWorld.js` : carte d’exploration, collisions, points d’interaction et déplacements.
- `public/assets/backgrounds/speedball-training.png`, `public/assets/backgrounds/rope-training.png` et leurs dossiers de sprites : ressources des deux ateliers. Sources et prompts conservés dans `references/direction-artistique/` et `references/characters/`.
- `src/ui/GameLayout.js` : cadrage commun et commandes dans les bandes latérales.
- `src/game/ShadowSession.js`, `src/scenes/ShadowScene.js`, `src/scenes/ShadowFighterView.js`, `src/ui/ShadowUI.js` et `src/ui/shadow.css` : pratique libre au miroir, commandes et reflet synchronisé.
- `public/assets/backgrounds/mirror-training.png` et `public/assets/sprites/mirror/` : décor du miroir et trois poses défensives; les frappes utilisent les ressources `bag-orthodox`.
- `references/characters/mirror/PROMPTS.md`, `scripts/prepare-mirror-sprites.mjs` : sources, prompts intégrés et préparation reproductible.
- `public/assets/backgrounds/bag-training.png`, `public/assets/sprites/bag-orthodox/` et `public/assets/sprites/bag/heavy-bag.png` : décor et ressources finales du sac.
- `references/characters/bag-orthodox/PROMPTS.md`, `scripts/prepare-bag-orthodox-sprites.mjs` : poses droitières, prompts exacts et extraction reproductible. Le dossier `bag` conserve le sac, le décor et la première version du personnage.
- `src/scenes/SparringScene.js` : scène et synchronisation des effets avec les touches.
- `src/scenes/FighterView.js` et `src/game/FighterMotion.js` : affichage, poses et mouvements synchronisés avec le combat.
- `src/game/SparringSession.js` : chronomètre, états, règles et rythme de Rémi, sans dépendance au rendu.
- `src/game/TrainingCoach.js` : objectifs, conseils et bilans à partir des échanges réellement résolus.
- `src/audio/SparringAudio.js` : sons locaux, activation par geste et préférences.
- `src/ui/SparringUI.js`, `src/style.css`, `index.html` : interface, clavier, tactile et orientation.
- `public/assets/backgrounds/gym.png` : décor validé, inchangé.
- `public/assets/sprites/sparring-v2/` : 20 PNG transparents et leurs coordonnées utilisés localement. Les premières ressources sont conservées dans le dossier parent.
- `public/assets/sprites/sparring-hook/` : trois poses supplémentaires de crochet gauche; sources et prompts de génération intégrée dans `references/characters/sparring-hook/PROMPTS.md`.
- `public/assets/sprites/knockdown/` : six poses de chute, tapis et relevé à échelle fixe. Génération d’images intégrée, sources RGBA et prompts dans `references/characters/knockdown/PROMPTS.md`; extraction reproductible par `node scripts/prepare-knockdown-sprites.mjs`.
- `public/assets/sprites/beton/` : poses originales du premier adversaire; sources et prompts dans `references/characters/beton/PROMPTS.md`.
- `public/assets/sprites/corner/remi-coach.png` : vignette du repos avec Rémi, issue de la génération intégrée; sources et prompts décrits dans `references/characters/corner/README.md`.
- `public/assets/backgrounds/fight-hall.png` : salle des combats avec public, 1280 × 720; génération intégrée, source et prompt dans `references/direction-artistique/fight-hall/PROMPT.md`, préparation reproductible par `node scripts/prepare-fight-hall.mjs`. Le décor du gym est conservé pour Rémi.
- `references/characters/sparring-v2/` : sources, prompts et préparation des nouvelles tenues et poses; les premières sources restent dans le dossier parent.
- `tests/*.test.js` : règles, concordance des animations, objectifs des leçons et cycle de vie audio.
- `docs/VERIFICATIONS.md` : vérifications réellement effectuées et limites.

La portée actuelle réunit **maison, quartier, journées et sommeil** avec le gym et Béton déjà présents. Le travail sous forme de mini-jeu, l’argent, les achats cosmétiques, les adversaires suivants et le tournoi restent des phases futures à concevoir avant leur GO; dépanneur et local fermé n’ouvrent pas ces fonctions. La feuille de route initiale est conservée dans `docs/PROCHAINES_ETAPES.md`. Aucun outil de dessin n’est requis pour jouer. LibreSprite pourra servir aux retouches et Tiled aux extensions de carte. Un commit doit marquer chaque étape fonctionnelle vérifiée; son envoi sur GitHub reste distinct de l’enregistrement local.

## Convention commune et extension des lieux

`src/ui/GameControls.js` centralise le joypad, A/B, les directions clavier et la navigation des menus. Une nouvelle activité ou un futur lieu réutilise cet adaptateur : E/A interagit, Entrée/A valide, Échap/B revient. Les interfaces propres aux ateliers conservent leurs réglages et leurs bilans. `npm run test:controls` vérifie la convention dans les quatre scènes avec de vraies entrées clavier et tactiles simulées. Les poses corps/basse garde sont conservées dans `public/assets/sprites/body-training/`, avec leurs sources et prompts dans `references/characters/body-training/`.
