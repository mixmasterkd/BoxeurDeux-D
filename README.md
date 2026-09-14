# BoxeurDeux-D

Jeu original de vie de boxeur en 2D, en JavaScript avec **Phaser 4.2.1** et **Vite 8.2.2**. Le personnage à tuque rouge explore Montréal, s’entraîne, travaille à vélo et dispute ses premiers combats, puis les **Gants de bronze**. Le chapitre V5 ajoute un métro à cinq stations, le laptop à la maison, un marathon facultatif, le **Mexique** et les **Gants dorés**. Après le bronze, **Dyrex**, **Le Feu**, **Cuba** et le **Mexique** se découvrent dans l’ordre voulu.

Le décor de sparring validé est préservé. L’exploration utilise une caméra de **1280 × 720**, qui suit le joueur sur les grandes cartes; les intérieurs et le ring conservent ce cadrage. L’image garde ses proportions 16:9 sur ordinateur et téléphone en paysage.

Les fenêtres et personnages conservent le style 16 bits. Les portes se traversent à pied et les commandes suivent la même convention dans les lieux et activités. **Fredo** est le coach à Montréal, à Cuba et en tournoi; **The Octopus** donne des conseils et drills au gym montréalais et prend le rôle de coach pendant le séjour au Mexique.

## Lancer le jeu

```bash
npm install        # Seulement sur une nouvelle installation
npm run dev       # Port strict 5173, accessible sur le réseau local
```

- Ordinateur : **http://127.0.0.1:5173/**
- Wi-Fi du PC vérifié le 13 septembre 2026 : **http://192.168.50.123:5173/**. Téléphone sur le même réseau; l’adresse peut changer après un redémarrage.
- Adresse publique du projet : **https://mixmasterkd.github.io/BoxeurDeux-D/**. Chapitre V5 publié et vérifié ; voir [les résultats](docs/CHAPITRE_V5.md#publication).

Réutiliser le serveur déjà lancé. Ne pas démarrer un deuxième Vite ni changer de port silencieusement. Le jeu ne demande aucun compte, abonnement ni clé d’IA. Les illustrations sont des fichiers locaux; aucune génération d’images ne se produit pendant une partie.

L’état intégré et le bilan des vérifications sont dans [docs/CHAPITRE_V5.md](docs/CHAPITRE_V5.md). Les détails sont répartis entre [sauvegarde et règles V5](docs/CHAPITRE_V5_MODELE.md), [métro et aéroport](docs/METRO_ET_AEROPORT.md), [combats V5](docs/COMBATS_CHAPITRE_V5.md) et [menus d’activités](docs/MENUS_ACTIVITES.md). [Cuba et défis](docs/CUBA_ET_DEFIS.md) et [harmonisation SNES](docs/HARMONISATION_SNES.md) conservent les livraisons antérieures; le présent README décrit les règles actuelles.

## Commencer et découvrir le chapitre

1. Une nouvelle partie commence **à la maison**. Le lit fait passer au lendemain; la garde-robe permet d’équiper les vêtements achetés. Le **laptop** donne accès au navigateur du jeu et au terminal de test.
2. Sortez dans le quartier. Le **gym** donne accès au sac, au miroir, à la corde, à la speed ball, au sparring avec **Rémi**, aux pads de **Fredo** et aux drills de **The Octopus**. La **salle communautaire** ouvre les combats sans intérieur supplémentaire.
3. Le passage ouvert **à gauche du quartier** mène à la **rue des Érables**. Prenez une tournée au **guichet jaune DÉPÔT**, devant l’entrepôt au sud. Le colis suivant indique son adresse, son quartier et la direction à prendre; la tournée traverse maintenant trois secteurs.
4. Continuez à gauche vers la **place commerçante inspirée du DIX30**. Entrez chez **Rue Nord** pour les vêtements et au **Coin Bleu** pour la boxe. Les autres commerces restent fermés; cônes et barrières ferment les futures extensions.
5. Battez **Béton**, puis **Kramer « The Quitter »**. Épargnez l’inscription aux **Gants de bronze**, puis partez depuis la salle communautaire.
6. L’entrée du **métro** est au sud-est du quartier du gym. Descendez à pied, consultez le plan sur le quai et avancez dans la porte du train. Restez à bord jusqu’à la station voulue, puis descendez par sa porte ouverte.
7. Après une participation terminée aux Gants de bronze et votre retour de l’hôtel, la **salle communautaire** propose Dyrex et Le Feu. Réservez **Cuba** ou le **Mexique** sur le laptop ou au comptoir de l’aéroport, puis rejoignez physiquement la porte d’embarquement du pays.
8. Le **marathon de Montréal** est facultatif : inscription à 100 $ sur le laptop, métro jusqu’à l’île, puis départ à pied. Après les victoires sur Dyrex, Le Feu, Louisto et Danielo, la salle communautaire ouvre les **Gants dorés**.

Avancez dans les portes ouvertes et les passages pour changer de lieu. **E / A** sert aux personnes, ateliers, panneaux, achats, livraisons et confirmations. Monter dans le métro, en descendre ou embarquer vers un pays réservé se fait en marchant.

Marcher, rouler sur une tournée déjà payée, franchir une porte, ouvrir un menu et combattre ne redébite aucune énergie quotidienne.

## Commandes communes

| Action | Ordinateur | Téléphone paysage |
| --- | --- | --- |
| Se déplacer / choisir dans un menu | WASD ou flèches | Joypad gauche |
| Interagir / confirmer | E, ou clic sur le choix | A |
| Revenir dans un menu | P ou Échap | B |
| Pause / options avant ou après une activité | P ou Échap | ☰ |
| Jab gauche / direct droit | J / K | A / B |
| Garde haute / basse | W / S | Joypad haut / bas |
| Esquive gauche / droite | A / D | Joypad gauche / droite |
| Coup au corps | S + J ou K | Joypad bas + A ou B |
| Couper / rétablir le son | Menu pause | Menu pause |

**J → K → J** (ou **A → B → A**) permet jab, direct, crochet gauche. Le prochain coup peut être préparé juste avant le retour en garde : les échanges répondent plus vite, avec une pression par frappe. Maintenir le bouton ne répète pas les coups. La garde et les diagonales utiles acceptent les appuis simultanés. Les flèches et ZQSD restent compatibles pour les directions; **E est la confirmation des menus au clavier**, y compris pour les sauvegardes et les achats. Entrée, Espace et J/K ne valident pas les menus. Seul le champ de saisie du terminal accepte Entrée pour envoyer une commande écrite.

Après les Gants, The Octopus peut enseigner **J → J → K**, ou **A → A → B** : double jab, direct. Terminez son drill de **trois séries**, au gym de Montréal; il coûte **10 énergie** au départ. Le déblocage est permanent et sauvegardé. Le combo de départ J → K → J reste disponible. Le double jab–direct coûte 41 endurance; son dernier direct inflige 4 dégâts supplémentaires, sans point gratuit ni hausse des plafonds.

Sur ordinateur, aucune manette ni liste permanente de raccourcis ne couvre l’action. Sur mobile, le joypad et A/B restent **dans les deux marges latérales**, hors de l’image. Le ring place ses indications au-dessus des combattants. La petite sortie **← Gym / ← Hôtel / ← Quartier / ← Salle** ramène directement au lieu précédent.

Pendant l’exploration sur mobile, la bannière d’accueil et de proximité est masquée pour dégager les personnages et les vendeurs. **A s’active à proximité d’une interaction**; les dialogues s’ouvrent seulement sur demande. L’annonce de proximité reste accessible aux lecteurs d’écran.

Les accueils et bilans d’activités ont **deux choix : commencer/rejouer, ou revenir au lieu**. **P/Échap/☰** ouvre les options avant ou après une séance; les commandes, le carnet, le son et les réglages restent accessibles dans la pause. Les leçons de Rémi se choisissent depuis le gym ou les options avant le sparring. Consulter les menus ne dépense pas d’énergie.

La promenade laisse les décors dégagés : le lieu figure dans la bordure extérieure, et le jour, l’argent et l’énergie sont dans **P / Échap / ☰ → Pause**. Les repères d’interaction et les dialogues volontaires restent disponibles.

Les menus ont un encadrement pixel et une police hébergée dans le jeu. Dans les petits cadrages, le texte et les listes de choix défilent à l’intérieur de leur fenêtre; le repère **↕** signale la suite. Glissez le doigt pour lire, ou naviguez au joypad. Les actions principales des combats restent accessibles en bas du menu.

Une perte de focus, un changement de périphérique ou le passage en portrait libère les appuis et met en pause. Le portrait tactile affiche une invitation à tourner l’appareil; aucune API de verrouillage n’est requise. La reprise reste explicite. Un ordinateur déclarant aussi du tactile reste sans manette si son périphérique principal est une souris.

## Livraisons et argent

Au dépôt, prendre une tournée coûte **30 énergie quotidienne** une seule fois. Le vélo est prêté. Livrez dans l’ordre les **trois adresses annoncées** : **12, rue des Érables**, puis le **dépanneur au 84, avenue du Gym**, puis la réception des colis de **Rue Nord au 210, promenade du Nord**. Le bandeau indique la destination et le secteur à rejoindre; une autre porte ne paie pas le colis. Utilisez E / A au point de livraison. La tournée et les livraisons réglées sont sauvegardées; les anciennes tournées à trois maisons restent reprenables.

Chaque livraison rapporte **5 $**, plus **0 à 2 $ de pourboire** selon le temps actif et les obstacles heurtés. Les pauses ne font pas avancer ce temps; une livraison lente reste payée. Une tournée rapporte donc **15 à 21 $**. Le vélo a douze poses de déplacement dédiées; les pédales et l’orientation accompagnent le mouvement. On peut arrêter une tournée au dépôt : paiements acquis conservés, énergie non remboursée. Terminer ou arrêter la tournée permet de dormir.

L’épargne est plafonnée à **200 $**, puis **350 $ après Béton** et **500 $ après Kramer**. Les paiements respectent le plafond. Les victoires débloquent les plafonds, sans donner gratuitement des capacités ou de l’argent. Deux bonnes tournées par journée financent une première inscription en environ trois jours de jeu, en gardant de l’énergie pour le gym.

| Boutique | Collection de départ | Prix |
| --- | --- | --- |
| Rue Nord | Survêtement noir d’origine | Déjà possédé |
| Rue Nord | Survêtement bleu roi / bordeaux | 28 $ / 36 $ |
| Rue Nord | Chandail noir **The Octopus · Poulin**, motif poulpe blanc | 45 $ |
| Le Coin Bleu | Tenue de boxe bleue d’origine | Déjà possédée |
| Le Coin Bleu | Tenue émeraude / bordeaux | 32 $ / 48 $ |

Acheter et équiper sont deux actions séparées. **Vêtements : garde-robe à la maison. Équipement : casier au gym.** Les nouvelles tenues changent l’apparence dans l’exploration et les ateliers; elles ne donnent aucun bonus caché. La tuque rouge reste la signature du personnage. Le vélo conserve sa tenue de travail et les combats du tournoi utilisent leur uniforme fourni.

## Gym, capacités et journées

Le gym reste gratuit. Les séances utilisent une réserve quotidienne de **100 énergie**, distincte de l’endurance des gestes et de la résistance aux coups.

| Activité | Coût au départ | Objectif d’une séance terminée | Gain |
| --- | --- | --- | --- |
| Sac chorégraphié · 45 s | 15 | 6 contacts, 50 % de précision | Puissance +1 |
| Speed ball · 45 s | 15 | 20 bons temps, 60 % | Récupération +2 points de pourcentage |
| Corde à danser · 45 s | 15 | 20 bons temps, 60 % | Endurance maximale +2 |
| Résistance et relevés avec Rémi | 20 | 10 touches nettes ou défenses, séance terminée | Résistance maximale +2 |
| Shadow au miroir | 5 | Pratique libre, reflet et ralenti | Aucun bonus permanent |
| Sparring libre / leçons de Rémi | 20 / 10 | Pratique, lecture des signaux | Aucun bonus permanent |
| Pads avec le coach · 45 s | 10 | 12 mouvements réussis, 60 % de précision | Puissance +1 |
| Drills avec The Octopus | 10 | Gestes, défenses ou combo guidés au miroir | Aucun bonus de capacité |
| Drill double jab–direct, après les Gants | 10 | 3 séries J → J → K terminées | Technique JJK sauvegardée |
| Piscine de l’hôtel · 45 s | 10 | 3 longueurs, 60 % | Endurance maximale +2 |

Le sac annonce ses enchaînements; la corde et la speed ball utilisent J/K ou A/B en alternance. **Rémi reste le partenaire de sparring**. **Fredo**, en survêtement bleu marine, accompagne les séances et les coins à Montréal, à Cuba et aux tournois. Au gym montréalais, **The Octopus** propose des conseils, trois drills de base au miroir puis le double jab après les Gants. Au **Mexique seulement**, il devient le coach des pads et du coin de Danielo. Les touches sont comptées au contact des animations, avec une distinction entre coup net, blocage et esquive. Chaque accueil annonce son coût, son objectif et son plafond; le bilan indique le gain obtenu ou la raison de son absence.

Aux pads, le coach garde une cible levée jusqu’au bon contact. Frappez en croisé : **J / A, jab gauche vers le pad à droite de l’écran**; **K / B, direct droit vers le pad à gauche**. Le coach peut aussi demander une garde haute/basse ou une esquive, avec les mêmes directions qu’en combat. Vous choisissez le moment, sans barre de rythme ni pénalité pour attendre. Un mauvais geste réduit la précision. Les 45 secondes limitent la séance, pas le délai autorisé pour répondre à chaque cible.

| Palier | Puissance maximale | Récupération maximale | Endurance maximale | Résistance maximale |
| --- | --- | --- | --- | --- |
| Avant la victoire contre Béton | +5 | +10 % | 110 | 108 |
| Après Béton | +7 | +14 % | 116 | 114 |
| Après Kramer | +10 | +20 % | 124 | 122 |

Une pause/reprise ne paie pas de nouveau départ. Recommencer paie une nouvelle séance. Un abandon conserve la dépense et ne donne pas de gain. Même au plafond, une séance garde son coût annoncé. À zéro énergie on peut toujours marcher, rentrer dormir et combattre.

Confirmer le sommeil au lit avance exactement **d’un jour** et remet seulement l’énergie quotidienne à **100**. Argent, tenues, capacités et résultats restent acquis; aucun bonus supplémentaire n’est donné. Au tournoi, il faut résoudre le combat du jour avant de dormir pour accéder au suivant.

## Combats et adversaires

Le sparring libre avec **Rémi le Tank** reste un round de 60 secondes au gym. **Résistance et relevés** conserve trois rounds de 60 secondes. Les **combats officiels** passent à **trois rounds de 45 secondes**, avec le coach au coin entre les reprises (**The Octopus au Mexique**, Fredo ailleurs). La silhouette et les poses des combats du tournoi conservent les proportions du sparring; leurs uniformes restent propres à la compétition.

| Adversaire | Particularité |
| --- | --- |
| Béton | Jab tête, direct corps, garde haute et ouvertures lisibles |
| Kramer « The Quitter » | Allemand patient, feintes et frappes précises; abandon surprise à sa **deuxième chute cumulée**, même répartie entre deux rounds |
| Marco Bellini | Quart de finale; mobilité et jab |
| Louis « Le Roc » Fortin | Demi-finale; pression, garde et corps |
| André « Le Patron » Gagnon | Finale; rythmes et enchaînements plus variés |
| Dyrex | Après les Gants; garde qui change de hauteur, jab de mesure et direct suivi d’une ouverture |
| Le Feu | Après les Gants; défi plus difficile, rafales de deux puis trois coups, corps puis tête |
| Louisto | À Cuba; appuis, feintes et contres préparés, combat sur le ring de la plage |
| Pablo | Partenaire de sparring au gym du Mexique; un round de 60 s, sans résultat officiel |
| Danielo | Au Mexique; adversaire officiel dans les arènes au sol en terre |
| Rafael Ríos | Quart des Gants dorés; premier défi du nouveau tournoi |
| Émile Moreau | Demi des Gants dorés; résistance et enchaînements plus exigeants |
| Thiago Santos | Finale des Gants dorés; dernier palier de cette édition |

Le calendrier des gardes et attaques adverses est autonome : l’adversaire ne bloque pas instantanément en lisant le bouton du joueur. Les signaux laissent réagir puis riposter. Les mains et esquives extérieures concordent avec les poses : face à un adversaire orthodoxe, son jab arrive à droite de l’écran et s’esquive vers la droite; son direct arrive à gauche et s’esquive vers la gauche. Chaque adversaire possède ses propres poses, couleurs et identité; les données de rythme sont dans `src/game/OpponentProfiles.js`.

- **Endurance** : paie frappes, gardes et esquives, puis remonte au repos. La vider ne met pas au tapis.
- **Résistance** : descend sur les touches nettes. En combat officiel, jab/direct/crochet font 5/7/9 dégâts, avec un bonus de puissance proportionnel plafonné à +20 %. J–J–K ajoute 1,5 dégât au direct avant ce multiplicateur. Le sparring conserve ses dégâts pédagogiques. Une bonne défense évite ces dégâts.
- **Chute à zéro résistance** : le contact se termine visuellement, puis le compte de dix commence. Le temps du round s’arrête.
- **Relevé** : six pressions alternées J/K ou A/B, en commençant par J/A, espacées d’au moins 0,35 seconde. Le maintien ne répète pas les efforts. En combat officiel, les relevés rendent 80 %, puis 72 % et 65 % de la résistance maximale personnelle.
- **Arrêt** : dix sans relevé = KO; troisième chute du round ou quatrième du combat = arrêt. Kramer possède en plus son abandon spécial. Pas de KO aléatoire ajouté.
- **Au coin** : en combat officiel, 9 secondes de respiration avec le coach du lieu. J puis K sur ordinateur, A puis B sur mobile, lorsque le cercle rejoint le repère. Huit respirations donnent jusqu’à +8 résistance en supplément des +20 garantis. Le bouton « Passer » (ou E) conserve le bonus déjà acquis; aucun malus en cas d’échec. P/Échap ou ☰ met aussi cet exercice en pause. À la reprise : endurance pleine, résistance plafonnée au maximum personnel, chutes du round remises à zéro; total conservé. Le round suivant attend E/A.
- **Juges** : **trois juges en combat local, cinq en tournoi**. Chaque round attribue 10 points au gagnant, contre 9, 8 ou 7 selon la domination. Les touches nettes priment; qualité des coups, précision et défense départagent les échanges proches. **Pas de round nul ni de déduction automatique par chute.** Un total égal sur une carte garde ses chiffres et reçoit un départage technique expliqué; la majorité désigne toujours un vainqueur.
- **Décision** : les cartes sont révélées successivement, puis l’arbitre annonce le résultat. Le joueur est **vu de face**, avec des poses distinctes d’attente, de victoire et de défaite. Le détail des rounds reste accessible avec WASD/E ou joypad/A. Le calcul est une adaptation arcade du 10-point-must; les points de touche du sparring ne constituent pas le barème des juges.

## Les Gants de bronze

L’inscription se fait à la **salle communautaire**, après une victoire sur Kramer : **120 $ la première édition**, **60 $ les suivantes**. Il s’agit uniquement de l’argent gagné dans le jeu. Hôtel et installations sont inclus. Une tournée de livraison doit être terminée ou arrêtée avant de partir.

Le séjour comporte la **chambre 201**, un **couloir avec d’autres chambres** et un **rez-de-chaussée explorable de 1920 × 1080**. L’ascenseur relie seulement l’étage des chambres au RC. Au RC, marchez librement vers l’accueil, le **mini-gym**, la **piscine** ou la **grande salle d’événement**, puis traversez leurs portes. La caméra suit le personnage dans les grandes pièces. Quatre rings, des gradins et des participants donnent une ambiance de rencontre; le joueur dispute ses combats au ring 1. Le tableau près de l’entrée affiche huit participants et les résultats.

1. **Jour 1 : quart contre Bellini**. Après une victoire, rejoignez votre lit et dormez.
2. **Jour 2 : demi contre Fortin**. Une nouvelle victoire ouvre la nuit suivante.
3. **Jour 3 : finale contre Gagnon**. La récompense est sauvegardée; retour au quartier par la réception.

Les combats actuels rendent toujours une décision. Une défaite termine le parcours : **souvenir de participation en quart**, **bronze en demi**, **argent en finale**. Le vainqueur reçoit **l’or**. Le résultat et la collection sont consultables à la maison, avec un petit présentoir près des trophées. Après élimination ou victoire finale, on peut visiter l’hôtel avant de rentrer. Un départ anticipé demande confirmation et termine l’inscription sans remboursement; une prochaine édition reste possible.

Les **pads avec Fredo** reprennent le même exercice libre qu’au gym du quartier. À la **piscine**, alternez les bras au repère; douze bonnes poussées font une longueur. Ces activités coûtent de l’énergie et donnent des capacités plafonnées; la piscine ne recharge pas la journée.

Les uniformes du tournoi distinguent le joueur **bleu/blanc** et l’adversaire **rouge/blanc**, avec ceinture contrastante et casque ouvert sans protège-joues de sparring. Référence visuelle : [Articles et règlements de Boxe Canada, janvier 2025](https://boxingcanada.org/wp-content/uploads/2025/04/Articles-and-Rules-January-2025.pdf), §1.4 et §10. Les règles de combat restent celles du prototype arcade décrites ci-dessus. Le tableau des autres participants suit un parcours écrit; leurs combats d’ambiance ne sont pas des simulations compétitives supplémentaires.

## Après le bronze : Montréal, Cuba et Mexique

**Terminer une participation** aux Gants de bronze, puis rentrer de l’hôtel, ouvre la suite. L’or n’est pas obligatoire : une élimination, même en quart, suffit. Un départ anticipé avant la fin du parcours ne débloque pas ce chapitre.

**Dyrex et Le Feu** sont proposés à la salle communautaire. **Louisto** se rencontre à Cuba, sur le ring de la plage; **Danielo** se rencontre au Mexique. Aucun de ces quatre défis n’exige de battre les autres auparavant. Les capacités gardent les plafonds obtenus après Kramer; les victoires ne donnent ni bourse automatique ni bonus illimité.

Chaque séjour coûte **160 $**, logement et retour compris. Le **navigateur du laptop** et le **comptoir de l’aéroport** permettent de réserver. La réservation paie le billet **sans déplacer le personnage**; les deux billets peuvent être réservés avant de partir. Prenez le métro jusqu’à **Aéroport**, puis marchez dans la porte Cuba ou Mexique. L’embarquement ne débite rien de plus. Un seul séjour peut être actif; terminez ou arrêtez la livraison, la course ou le tournoi en cours avant de partir.

À **Cuba**, explorez le **village**, votre **logement**, le **gym aux pneus** et la **plage**. Village et plage dépassent le cadrage de la caméra. Fredo anime les **pads (10 énergie)**; le gym propose aussi la **corde (15)** et un atelier sur **six pneus suspendus (15)** qui reprend la boucle du sac. Louisto attend sur le ring au bord de la plage.

Au **Mexique**, explorez le **village**, la **posada**, le **gym**, la **promenade côtière** et les **arènes de terre**. **Pablo** est le partenaire de sparring; **Danielo** est l’adversaire officiel des arènes. **The Octopus** anime les pads et accompagne le coin au Mexique, avec ses propres sprites; Fredo conserve son rôle dans les autres lieux.

Le lit du logement avance le jour et remet seulement l’énergie quotidienne à 100, sans supplément à payer ni victoire préalable obligatoire. Le séjour reste actif après sommeil, fermeture et reprise du jeu. Le **vol retour inclus rejoint l’aéroport de Montréal**, où le métro permet de rentrer. Résultats et acquis sont conservés. Revenir puis repartir demande un nouveau billet à 160 $.

## Métro : choisir sa station

Le réseau fictif inspiré de Montréal relie **Quartier ↔ Des Rives ↔ Île Sainte-Hélène ↔ Stade olympique ↔ Aéroport**.

Dans le **hall de chaque station**, marchez vers le **quai A pour l’Aéroport**, ou le **quai B pour le Quartier**. Au terminus, seul le quai du départ est ouvert. **E / A devant le panneau PLAN** ouvre le réseau; le choix du sens se fait en rejoignant le quai. **Marchez dans la porte du train**, puis promenez-vous à l’intérieur. Le trajet dure quatre secondes entre deux arrêts; les portes restent ouvertes huit secondes. Descendez en marchant dans la porte ouverte à la station voulue. Si vous manquez un arrêt, restez à bord : le train inverse sa direction au terminus.

Le plan est aussi accessible à bord et depuis la pause. Les indications discrètes donnent la station actuelle ou le prochain arrêt. Pause, perte de focus et portrait suspendent le train. Le métro est gratuit et ne consomme pas d’énergie. Une recharge pendant le trajet reprend sur le quai de la dernière station atteinte, dans le même sens. Le passage au sud du quai rejoint le hall; sa sortie au sud mène à la rue. Les fenêtres montrent la station à l’arrêt et le tunnel entre les arrêts.

## Laptop et marathon de Montréal

À la maison, approchez-vous du **laptop** et utilisez **E / A**. Le **Navigateur** apparaît dans un véritable visuel de laptop. Cliquez sur ordinateur, ou choisissez avec le joypad et validez avec A sur mobile. Ces services appartiennent au jeu : aucun compte extérieur requis.

Dans le navigateur, **Marathon de Montréal** permet de s’inscrire pour **100 $ par participation**. La course est **facultative** et n’entre pas dans les conditions des Gants dorés. L’inscription conserve votre lieu; rejoignez le départ sur l’île en métro puis à pied.

Le parcours traverse **l’île Sainte-Hélène, le centre-ville, le Vieux-Port et le Stade olympique**, sur quatre grandes cartes avec détours et points de passage automatiques. Pendant la course, le personnage court avec sa tenue violette, son short et sa casquette; d’autres coureurs animent les rues. **Déplacez-vous simplement avec les directions ou le joypad**, sans cadence à synchroniser ni bouton de sprint. Les repères guident le parcours. Le chronomètre mesure la durée, sans limite de temps; la pause l’arrête.

Une rencontre avec un coureur peut provoquer **une seule altercation par participation**, que l’on peut éviter. En cas de bagarre, un seul passage au sol termine l’échange, sans rounds ni juges; on reprend ensuite au point sauvegardé, même après une défaite ou un abandon du combat. La course est en pause pendant l’altercation. Celle-ci ne donne ni argent, ni capacité, ni victoire officielle.

L’arrivée accorde **une médaille souvenir unique**, visible à la maison, et conserve le meilleur temps. **Aucune prime d’argent** n’est versée. Rejouer coûte une nouvelle inscription à 100 $; la médaille n’est pas dupliquée. Le métro du Stade permet de revenir. Sans inscription, les mêmes lieux restent visitables en promenade, sans ambiance de course. Une course commencée doit être terminée ou abandonnée avant de dormir, s’entraîner ou partir dans un autre événement.

## Les Gants dorés

La salle communautaire propose ce tournoi à **240 $** après une participation terminée aux **Gants de bronze**, le retour à Montréal et les victoires sur **Dyrex, Le Feu, Louisto et Danielo**. Le marathon n’est pas requis. Le séjour reprend la formule de trois jours : **quart contre Rafael Ríos**, **demi contre Émile Moreau**, puis **finale contre Thiago Santos**, avec cinq juges. Une victoire permet de dormir pour passer au jour suivant; une défaite termine le parcours. Les médailles dorées sont conservées séparément de celles du bronze.

L’hôtel conserve chambre, couloir, ascenseur vers le RC, gym, piscine et salle d’événement à quatre rings. Au rez-de-chaussée s’ajoute **La Croûte dorée**, restaurant inspiré des bars à pain de type Pacini : choisissez une tranche, faites-la griller puis ajoutez une garniture. Le bar est compris dans le séjour et sert à l’ambiance; il ne recharge ni énergie quotidienne ni capacités.

Le **Carnet**, dans les menus des lieux et activités, suit les objectifs, voyages, résultats, techniques, médailles et meilleur temps du marathon. Il reste dans le cadrage SNES; le fermer revient au menu sans reprendre la partie.

## Sauvegarde et transfert

La sauvegarde **v5** conserve jour, énergie, lieu et position, capacités, résultats, argent, inventaire, équipement, livraisons, les deux tournois, médailles, réservations et séjours Cuba/Mexique, marathon et technique du double jab. Les parties **v1 à v4** sont migrées automatiquement, en conservant les acquis et une copie valide de secours lorsque le stockage est disponible. Une ancienne tournée, un séjour à l’hôtel ou **un séjour à Cuba v4 déjà payé** reste reprenable; aucune nouvelle réservation n’est exigée pour ce voyage actif. La clé normale reste `boxeur-deux-d-career-v1`; le profil de test utilise une clé séparée `boxeur-deux-d-career-v1-test`.

**Continuer** reprend le lieu sauvegardé. Un combat interrompu reprend depuis le lieu d’accès, sans reconstituer un round au milieu d’une animation. Coûts payés et résultats validés restent enregistrés. Les transactions de livraison, réservation, inscription et récompense empêchent les doubles paiements. Le marathon conserve son temps et ses points de passage; la rencontre facultative ne se rejoue pas après une recharge. Un trajet de métro interrompu reprend sur un quai sûr.

Dans l’accueil et les pauses des lieux explorables : **Exporter la sauvegarde** en JSON, puis **Importer** sur l’autre appareil. L’import affiche un aperçu et demande confirmation avant remplacement; Nouvelle partie également. Un fichier invalide ou de version future est refusé. Un stockage bloqué laisse jouer en mémoire et signale l’absence d’enregistrement : exporter avant de fermer.

**Les sauvegardes appartiennent au navigateur et à l’adresse.** GitHub Pages, localhost et l’adresse Wi-Fi ont des stockages séparés, de même que PC et téléphone. Il n’y a pas de synchronisation distante; GitHub sauvegarde le projet, pas la partie individuelle.

## Développement et vérifications

```bash
npm test                         # Ensemble des tests unitaires du projet
npm run build                    # Production dist/

# Modèles et ressources du chapitre V5
node --test tests/travel-marathon-career.test.js tests/metro-network.test.js tests/marathon-world.test.js tests/mexico-world.test.js
node --test tests/bout-judges.test.js tests/street-session.test.js tests/new-chapter-combat-assets.test.js

# Parcours dans le navigateur local déjà lancé
node tests/metro-browser.mjs
node tests/marathon-laptop-browser.mjs
MARATHON_MOBILE=1 node tests/marathon-laptop-browser.mjs
node tests/marathon-fight-integration-browser.mjs
node tests/destinations-browser.mjs       # Mexique, hôtel doré, restaurant et tableau
node tests/new-chapter-combat-browser.mjs # Bagarre et esquives jouées
node tests/mexico-defense-browser.mjs
node tests/mexico-corner-browser.mjs
node tests/activity-options-browser.mjs  # Sept activités, options et profil test PC/mobile
JOURNAL_VARIANT=small-mobile node tests/career-journal-browser.mjs
npm run test:fight-pacing                # Vrais rounds, coin et cartes des juges
npm run test:fight-presentation          # Fixtures visuelles de décision et menus
```

Le bilan global et les limites des vérifications sont dans [docs/CHAPITRE_V5.md](docs/CHAPITRE_V5.md); les documents spécialisés indiquent les scénarios réellement joués et les fixtures utilisées. Les autres scripts de contrôle restent listés dans `package.json`. Playwright utilise l’installation déjà disponible dans cet environnement ou `PLAYWRIGHT_MODULE_PATH`; ce n’est pas une dépendance du jeu. Les essais mobiles sont des **simulations de viewport et de contacts tactiles**, pas des essais sur un téléphone physique.

`npm run build` produit l’index statique dans `dist/`. Pour héberger, déployer **tout le contenu de dist/** avec ses ressources, pas le `index.html` source. La configuration Vite utilise `base: './'` pour le sous-chemin GitHub Pages. Le workflow `.github/workflows/pages.yml` construit puis publie `main`. Le chapitre V5 a passé 26 contrôles sur le vrai site public ; 200 fichiers publiés correspondent à `dist` par SHA-256.

Les liens `?scene=home`, `gym`, `bag`, `shadow`, `rope`, `speedball`, les lieux explorables et `fight&opponent=...` restent des raccourcis de développement. Ils ne donnent ni argent ni énergie ni qualification. Les lieux de séjour exigent leur voyage ou tournoi actif; les combats respectent leurs conditions. Pour tester un chapitre avec ses prérequis sans toucher à la carrière normale, utiliser le **terminal du laptop** et ses commandes `test ...`.

Le code distingue les règles (`src/game/`), scènes et vues Phaser (`src/scenes/`), commandes et interfaces (`src/ui/`). Les ressources finales sont dans `public/assets/`; sources de génération, prompts et scripts de préparation sont conservés dans `references/` et `scripts/`. Aucun abonnement ni service d’IA n’est nécessaire pendant une partie.

La suite se décide après les retours sur ce chapitre : confort sur téléphone physique, équilibrage, nouveaux adversaires, activités et collections. Les véritables achats en ligne et d’autres destinations restent à définir; le laptop et ses services internes décrits ici sont déjà intégrés. La liste initiale et son historique restent dans [docs/PROCHAINES_ETAPES.md](docs/PROCHAINES_ETAPES.md).
