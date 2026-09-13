# BoxeurDeux-D

Jeu original de vie de boxeur en 2D, en JavaScript avec **Phaser 4.2.1** et **Vite 8.2.2**. Le personnage à tuque rouge explore un quartier montréalais, s’entraîne, travaille à vélo et dispute ses premiers combats, puis les **Gants de bronze**. Après une participation terminée, il choisit librement entre **Dyrex**, **Le Feu** et un séjour à **Cuba** pour rencontrer **Louisto**.

Le décor de sparring validé est préservé. L’exploration utilise une caméra de **1280 × 720**, qui suit le joueur sur les grandes cartes; les intérieurs et le ring conservent ce cadrage. L’image garde ses proportions 16:9 sur ordinateur et téléphone en paysage.

Le chapitre d’harmonisation ajoute les fenêtres pixel art de style SNES, **Fredo** comme coach, **The Octopus** au gym, les pads libres, des portes traversées à pied et un métro vers **Des Rives**. Les silhouettes du gym ont été harmonisées et le joueur du métro ajusté à la hauteur des portes du train; la résolution du jeu ne change pas.

## Lancer le jeu

```bash
npm install        # Seulement sur une nouvelle installation
npm run dev       # Port strict 5173, accessible sur le réseau local
```

- Ordinateur : **http://127.0.0.1:5173/**
- Wi-Fi du PC vérifié le 12 septembre 2026 : **http://192.168.50.123:5173/**. Téléphone sur le même réseau; l’adresse peut changer après un redémarrage.
- Site du projet : **https://mixmasterkd.github.io/BoxeurDeux-D/**

Réutiliser le serveur déjà lancé. Ne pas démarrer un deuxième Vite ni changer de port silencieusement. Le jeu ne demande aucun compte, abonnement ni clé d’IA. Les illustrations sont des fichiers locaux; aucune génération d’images ne se produit pendant une partie.

La portée et les vérifications du chapitre actuel sont consignées dans [docs/CUBA_ET_DEFIS.md](docs/CUBA_ET_DEFIS.md). [docs/HARMONISATION_SNES.md](docs/HARMONISATION_SNES.md) et [docs/VERIFICATIONS.md](docs/VERIFICATIONS.md) conservent les livraisons précédentes. Une adresse publique existante ne confirme pas que le dernier chapitre y est déjà publié.

## Commencer et découvrir le chapitre

1. Une nouvelle partie commence **à la maison**. Le lit fait passer au lendemain; la garde-robe permet d’équiper les vêtements achetés.
2. Sortez dans le quartier. Le **gym** donne accès au sac, au miroir, à la corde, à la speed ball, au sparring avec **Rémi**, aux pads de **Fredo** et aux drills de **The Octopus**. La **salle communautaire** ouvre les combats sans intérieur supplémentaire.
3. Le passage ouvert **à gauche du quartier** mène à la **rue des Érables**. Prenez une tournée au **guichet jaune DÉPÔT**, devant l’entrepôt au sud. Le colis suivant indique son adresse, son quartier et la direction à prendre; la tournée traverse maintenant trois secteurs.
4. Continuez à gauche vers la **place commerçante inspirée du DIX30**. Entrez chez **Rue Nord** pour les vêtements et au **Coin Bleu** pour la boxe. Les autres commerces restent fermés; cônes et barrières ferment les futures extensions.
5. Battez **Béton**, puis **Kramer « The Quitter »**. Épargnez l’inscription aux **Gants de bronze**, puis partez depuis la salle communautaire.
6. L’entrée du **métro** est au sud-est du quartier du gym. Descendez à pied, interagissez avec le train pour voyager, puis sortez par l’escalier à **Des Rives**. Cette nouvelle place est explorable; les cônes réservent les futures extensions.
7. Après une participation terminée aux Gants et votre retour de l’hôtel, la **salle communautaire** propose Dyrex et Le Feu. L’agence à **Des Rives** propose le séjour à Cuba. Le **Carnet**, dans les menus, suit ces trois défis, le budget du voyage, les résultats et les techniques.

Avancez dans les portes ouvertes et les passages pour changer de lieu. **E / A** sert aux personnes, ateliers, achats, livraisons, au train et aux confirmations; il n’est plus demandé à chaque porte.

Marcher, rouler sur une tournée déjà payée, franchir une porte, ouvrir un menu et combattre ne redébite aucune énergie quotidienne.

## Commandes communes

| Action | Ordinateur | Téléphone paysage |
| --- | --- | --- |
| Se déplacer / choisir dans un menu | WASD | Joypad gauche |
| Interagir / confirmer | E, ou clic sur le choix | A |
| Revenir dans un menu | P ou Échap | B |
| Pause, **Commandes** et **Carnet** | P ou Échap | ☰ |
| Jab gauche / direct droit | J / K | A / B |
| Garde haute / basse | W / S | Joypad haut / bas |
| Esquive gauche / droite | A / D | Joypad gauche / droite |
| Coup au corps | S + J ou K | Joypad bas + A ou B |
| Couper / rétablir le son | Menu pause | Menu pause |

**J → K → J** (ou **A → B → A**) permet jab, direct, crochet gauche. Le prochain coup peut être préparé juste avant le retour en garde : les échanges répondent plus vite, avec une pression par frappe. Maintenir le bouton ne répète pas les coups. La garde et les diagonales utiles acceptent les appuis simultanés. Les flèches et ZQSD restent compatibles pour les directions; **E est l’unique confirmation au clavier**, y compris pour les sauvegardes et les achats. Entrée, Espace et J/K ne valident pas les menus.

Après les Gants, The Octopus peut enseigner **J → J → K**, ou **A → A → B** : double jab, direct. Terminez son drill de **trois séries**, au gym de Montréal; il coûte **10 énergie** au départ. Le déblocage est permanent et sauvegardé. Le combo de départ J → K → J reste disponible. Le double jab–direct coûte 41 endurance; son dernier direct inflige 4 dégâts supplémentaires, sans point gratuit ni hausse des plafonds.

Sur ordinateur, aucune manette ni liste permanente de raccourcis ne couvre l’action. Sur mobile, le joypad et A/B restent **dans les deux marges latérales**, hors de l’image. Le ring place ses indications au-dessus des combattants. La petite sortie **← Gym / ← Hôtel / ← Quartier / ← Salle** ramène directement au lieu précédent.

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
| Pads avec Fredo, au gym ou à l’hôtel · 45 s | 10 | 12 contacts, 60 % de précision | Puissance +1 |
| Drills avec The Octopus | 10 | Gestes, défenses ou combo guidés au miroir | Aucun bonus de capacité |
| Drill double jab–direct, après les Gants | 10 | 3 séries J → J → K terminées | Technique JJK sauvegardée |
| Piscine de l’hôtel · 45 s | 10 | 3 longueurs, 60 % | Endurance maximale +2 |

Le sac annonce ses enchaînements; la corde et la speed ball utilisent J/K ou A/B en alternance. **Rémi reste le partenaire de sparring**. **Fredo**, en survêtement bleu marine, est le coach au gym et dans tous les coins entre les rounds. **The Octopus** propose des conseils selon le prochain adversaire, trois drills de base au miroir puis le double jab après les Gants, sans remplacer Fredo. Les touches sont comptées au contact des animations, avec une distinction entre coup net, blocage et esquive. Chaque accueil annonce son coût, son objectif et son plafond; le bilan indique le gain obtenu ou la raison de son absence.

Aux pads, Fredo garde une cible levée jusqu’au bon contact. Frappez en croisé : **J / A, jab gauche vers le pad à droite de l’écran**; **K / B, direct droit vers le pad à gauche**. Vous choisissez le moment, sans barre de rythme ni pénalité pour attendre. Un mauvais choix de main réduit la précision. Les 45 secondes limitent la séance, pas le délai autorisé pour répondre à chaque cible.

| Palier | Puissance maximale | Récupération maximale | Endurance maximale | Résistance maximale |
| --- | --- | --- | --- | --- |
| Avant la victoire contre Béton | +5 | +10 % | 110 | 108 |
| Après Béton | +7 | +14 % | 116 | 114 |
| Après Kramer | +10 | +20 % | 124 | 122 |

Une pause/reprise ne paie pas de nouveau départ. Recommencer paie une nouvelle séance. Un abandon conserve la dépense et ne donne pas de gain. Même au plafond, une séance garde son coût annoncé. À zéro énergie on peut toujours marcher, rentrer dormir et combattre.

Confirmer le sommeil au lit avance exactement **d’un jour** et remet seulement l’énergie quotidienne à **100**. Argent, tenues, capacités et résultats restent acquis; aucun bonus supplémentaire n’est donné. Au tournoi, il faut résoudre le combat du jour avant de dormir pour accéder au suivant.

## Combats et adversaires

Le sparring libre avec **Rémi le Tank** reste un round de 60 secondes au gym. **Résistance et relevés** et les combats officiels utilisent au plus **trois rounds de 60 secondes**, avec **Fredo** au coin entre les reprises. La silhouette et les poses des combats du tournoi conservent les proportions du sparring; leurs uniformes restent propres à la compétition.

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

Le calendrier des gardes et attaques adverses est autonome : l’adversaire ne bloque pas instantanément en lisant le bouton du joueur. Les signaux laissent réagir puis riposter. Chaque adversaire possède ses propres poses, couleurs et identité; les données de rythme sont dans `src/game/OpponentProfiles.js`.

- **Endurance** : paie frappes, gardes et esquives, puis remonte au repos. La vider ne met pas au tapis.
- **Résistance** : descend sur les touches nettes. Jab/direct/crochet font 12/18/22 dégâts de base, plus la puissance entraînée du joueur. Une bonne défense évite ces dégâts.
- **Chute à zéro résistance** : le contact se termine visuellement, puis le compte de dix commence. Le temps du round s’arrête.
- **Relevé** : six pressions alternées J/K ou A/B, en commençant par J/A, espacées d’au moins 0,35 seconde. Le maintien ne répète pas les efforts.
- **Arrêt** : dix sans relevé = KO; troisième chute du round ou quatrième du combat = arrêt. Kramer possède en plus son abandon spécial. Pas de KO aléatoire ajouté.
- **Au coin** : conseil de Fredo, endurance pleine à son maximum personnel, résistance +20 sans dépasser son maximum; seul le compteur de chutes du round est remis à zéro. La reprise attend le joueur.
- **Décision** : 1 point par touche nette et 3 par chute adverse. Bloquer/esquiver ne donne aucun point. Le meilleur total gagne; égalité possible.

## Les Gants de bronze

L’inscription se fait à la **salle communautaire**, après une victoire sur Kramer : **120 $ la première édition**, **60 $ les suivantes**. Il s’agit uniquement de l’argent gagné dans le jeu. Hôtel et installations sont inclus. Une tournée de livraison doit être terminée ou arrêtée avant de partir.

Le séjour comporte la **chambre 201**, un **couloir avec d’autres chambres** et un **rez-de-chaussée explorable de 1920 × 1080**. L’ascenseur relie seulement l’étage des chambres au RC. Au RC, marchez librement vers l’accueil, le **mini-gym**, la **piscine** ou la **grande salle d’événement**, puis traversez leurs portes. La caméra suit le personnage dans les grandes pièces. Quatre rings, des gradins et des participants donnent une ambiance de rencontre; le joueur dispute ses combats au ring 1. Le tableau près de l’entrée affiche huit participants et les résultats.

1. **Jour 1 : quart contre Bellini**. Après une victoire, rejoignez votre lit et dormez.
2. **Jour 2 : demi contre Fortin**. Une nouvelle victoire ouvre la nuit suivante.
3. **Jour 3 : finale contre Gagnon**. La récompense est sauvegardée; retour au quartier par la réception.

Une égalité propose de rejouer gratuitement le même jour. Une défaite termine le parcours : **souvenir de participation en quart**, **bronze en demi**, **argent en finale**. Le vainqueur reçoit **l’or**. Le résultat et la collection sont consultables à la maison, avec un petit présentoir près des trophées. Après élimination ou victoire finale, on peut visiter l’hôtel avant de rentrer. Un départ anticipé demande confirmation et termine l’inscription sans remboursement; une prochaine édition reste possible.

Les **pads avec Fredo** reprennent le même exercice libre qu’au gym du quartier. À la **piscine**, alternez les bras au repère; douze bonnes poussées font une longueur. Ces activités coûtent de l’énergie et donnent des capacités plafonnées; la piscine ne recharge pas la journée.

Les uniformes du tournoi distinguent le joueur **bleu/blanc** et l’adversaire **rouge/blanc**, avec ceinture contrastante et casque ouvert sans protège-joues de sparring. Référence visuelle : [Articles et règlements de Boxe Canada, janvier 2025](https://boxingcanada.org/wp-content/uploads/2025/04/Articles-and-Rules-January-2025.pdf), §1.4 et §10. Les règles de combat restent celles du prototype arcade décrites ci-dessus. Le tableau des autres participants suit un parcours écrit; leurs combats d’ambiance ne sont pas des simulations compétitives supplémentaires.

## Après les Gants : trois défis, ordre libre

**Terminer une participation** aux Gants de bronze, puis rentrer de l’hôtel, ouvre la suite. L’or n’est pas obligatoire : une élimination, même en quart de finale, suffit. Quitter le tournoi avant d’en avoir terminé le parcours ne débloque pas ce chapitre.

**Dyrex et Le Feu** sont proposés à la salle communautaire. **Louisto** se rencontre uniquement pendant un séjour à Cuba, sur le ring de la plage. Aucun de ces trois combats n’exige d’avoir battu les deux autres. Les entraînements gardent les plafonds obtenus après Kramer; les nouvelles victoires ne donnent ni bourse automatique, ni augmentation illimitée des capacités.

À **Des Rives**, l’agence de voyages annonce **160 $ par séjour à Cuba**, logement et retour à Montréal compris. Terminez ou arrêtez votre tournée et rentrez du tournoi avant de partir. Le prix est payé une seule fois à la confirmation; vous choisissez la durée du séjour. Revenir puis repartir constitue un nouveau voyage payant.

À Cuba, explorez le **village**, votre **logement**, le **gym aux pneus** et la **plage**. Village et plage sont des cartes de **1920 × 1080** vues à travers la caméra 1280 × 720. Marcher dans les passages et les portes relie les lieux. Au gym, retrouvez les **pads (10 énergie)**, la **corde (15)** et un atelier de frappe sur **six pneus suspendus (15)** utilisant la boucle du sac. Les gains restent ceux des ateliers et leurs plafonds habituels.

Le lit du logement avance le jour et remet seulement l’énergie quotidienne à 100, sans supplément à payer ni victoire préalable obligatoire. Le séjour reste actif après sommeil, fermeture et reprise du jeu. Le retour inclus ramène à **Des Rives**, avec les résultats et acquis conservés. À zéro énergie, marcher, combattre, dormir et rentrer restent possibles.

Le **Carnet** est accessible depuis les menus des lieux et activités. Ses pages **Objectifs**, **Parcours** et **Techniques** donnent les défis, le montant restant pour Cuba, les victoires/défaites, la collection de médailles et les commandes apprises. Il reste dans le cadrage SNES; fermer le carnet retourne au menu sans reprendre le jeu.

## Sauvegarde et transfert

La sauvegarde **v4** conserve jour, énergie, lieu et position, capacités, résultats des huit adversaires, argent, inventaire, équipement, livraisons, tournoi, médailles, séjours à Cuba et technique du double jab. Les parties **v1/v2/v3** sont migrées automatiquement sans perdre les acquis, y compris une tournée ou un séjour à l’hôtel déjà en cours; une copie précédente valide sert de secours lorsque le stockage est disponible. La clé locale historique reste `boxeur-deux-d-career-v1`.

**Continuer** reprend le lieu sauvegardé. Un combat interrompu reprend depuis le lieu d’accès, sans reconstituer un round au milieu d’une animation. Coûts payés et résultats validés restent enregistrés. Les transactions de livraison, d’inscription et de récompense empêchent les doubles paiements.

Dans l’accueil et les pauses des lieux explorables : **Exporter la sauvegarde** en JSON, puis **Importer** sur l’autre appareil. L’import affiche un aperçu et demande confirmation avant remplacement; Nouvelle partie également. Un fichier invalide ou de version future est refusé. Un stockage bloqué laisse jouer en mémoire et signale l’absence d’enregistrement : exporter avant de fermer.

**Les sauvegardes appartiennent au navigateur et à l’adresse.** GitHub Pages, localhost et l’adresse Wi-Fi ont des stockages séparés, de même que PC et téléphone. Il n’y a pas de synchronisation distante; GitHub sauvegarde le projet, pas la partie individuelle.

## Développement et vérifications

```bash
npm test                  # Règles, combat, migration, économie et navigation
npm run build             # Production dist/
npm run test:snes-menus       # E/WASD, joypad/A/B, fenêtres PC/844/568 et visibilité en jeu
npm run test:snes-dialogs     # Achats, confirmations, sommeil et tableau au clavier/tactile
npm run test:world-flow       # Portes à pied, métro, trois secteurs et RC de l’hôtel
npm run test:gym-friends      # Fredo, Octopus, drills, chandail et retour au gym
npm run test:refined-combat   # Coups rapides, pads libres 45 s PC/tactile
npm run test:refined-competition # Uniformes et poses du tournoi
npm run test:tournament-corner   # Vrai round 60 s, Fredo, reprise du round 2
npm run test:harmonization-static # Bundle compilé du chapitre sans serveur concurrent
npm run test:next-career      # Migration v4, ordre libre, voyage Cuba et transactions
npm run test:next-shadow      # Apprentissage des trois séries de double jab
npm run test:journal          # Carnet dans huit familles de menus, PC/844/568
npm run test:next-combat      # Les trois nouveaux patterns et le double jab
npm run test:opponents        # Nouveaux combats joués dans le navigateur
npm run test:cuba-world       # Collisions, portes et arrivées des cartes de Cuba
npm run test:cuba             # Voyage, lieux, sommeil et retour dans le navigateur
npm run test:next-static      # Bundle compilé : leçon JJK, voyage et reprise PC/tactile
```

Les vérifications du chapitre sont consignées dans [docs/CUBA_ET_DEFIS.md](docs/CUBA_ET_DEFIS.md), dont les quatre parcours sur le bundle compilé. `SPARRING_URL` permet de reprendre ces parcours sur une adresse publiée, dans un navigateur de test isolé. Les autres scripts de contrôle sont listés dans `package.json`. Playwright utilise l’installation déjà disponible dans cet environnement ou `PLAYWRIGHT_MODULE_PATH`; ce n’est pas une dépendance du jeu. Les essais mobiles sont des **simulations de viewport et de contacts tactiles**, pas des essais sur un téléphone physique.

`npm run build` produit l’index statique dans `dist/`. Pour héberger, déployer **tout le contenu de dist/** avec ses ressources, pas le `index.html` source. La configuration Vite utilise `base: './'` pour le sous-chemin GitHub Pages. Le workflow `.github/workflows/pages.yml` construit puis publie `main`; consulter son résultat avant d’annoncer une mise en ligne.

Les accès `?scene=home`, `neighborhood`, `residential`, `commercial`, `clothing-shop`, `boxing-shop`, `metro-station`, `metro-riverside`, `riverside`, `gym`, `bag`, `shadow`, `rope`, `speedball` et `fight&opponent=kramer` sont des raccourcis de développement. Ils ne donnent ni argent ni énergie ni qualification. Les liens directs `hotel-*`, `pads` et `pool` nécessitent une inscription active; les pads locaux restent accessibles en parlant à Fredo au gym. Les destinations `cuba-village`, `cuba-home`, `cuba-gym`, `cuba-beach` nécessitent un séjour à Cuba payé; `fight&opponent=dyrex`, `lefeu` ou `louisto` respectent les mêmes conditions que les accès à pied.

Le code distingue les règles (`src/game/`), scènes et vues Phaser (`src/scenes/`), commandes et interfaces (`src/ui/`). Les ressources finales sont dans `public/assets/`; sources de génération, prompts et scripts de préparation sont conservés dans `references/` et `scripts/`. Aucun abonnement ni service d’IA n’est nécessaire pour les utiliser en jeu.

La suite reste à discuter après les retours sur ce chapitre : confort sur téléphone physique, équilibrage des trois nouveaux adversaires, nouvelles activités ou collections. Les ordinateurs, cellulaires, achats en ligne et autres régions restent des idées futures. La liste initiale et son historique restent dans [docs/PROCHAINES_ETAPES.md](docs/PROCHAINES_ETAPES.md).
