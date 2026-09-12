# Reprise dans Codex pour VS Code — BoxeurDeux-D

## GO actif — livraisons, boutiques, Kramer et Gants de bronze

Le 12 septembre 2026, l’utilisateur donne explicitement GO pour l’ensemble discuté. Terminer ce chapitre sans redemander chaque détail courant : lisibilité du ring mobile en premier; nouvelle rue résidentielle de livraisons à vélo; secteur commercial distinct inspiré du Quartier DIX30 avec DEUX boutiques (vêtements et boxe), autres vitrines fermées et cônes aux futures extensions; argent, achats, garde-robe maison et casier gym; Kramer « The Quitter » qui abandonne à sa deuxième chute cumulée; tournoi payant sur trois jours avec Marco Bellini, Louis « Le Roc » Fortin et André « Le Patron » Gagnon. Béton puis Kramer sont les deux rencontres avant le tournoi. Tableau de huit, trois adversaires sur le parcours et quatre participants d’ambiance.

Hôtel explorable en plusieurs lieux reliés : chambre, couloir, ascenseur, hall, mini-gym/pads avec Rémi, piscine avec longueurs animées, salle d’événement défilante avec quatre rings/gradins/boxeurs. Victoire puis lit pour avancer du quart à la demi puis finale; médailles or/argent/bronze selon résultat, souvenir en quart, retour maison et exposition. Prévoir défaite, départ anticipé, reprise sauvegardée et idempotence des paiements/résultats. Équipements cosmétiques; plafonds sportifs progressifs. Tenues de compétition inspirées du règlement Boxe Canada janvier 2025 : couleur de coin, ceinture contrastante, casque ouvert sans protège-joues. Mécanique de combat actuelle conservée.

La demande autorise intégration, commits intermédiaires et publication GitHub Pages selon le relais existant. Les achats futurs d’ordinateur/cellulaire et les achats en ligne restent une idée ultérieure, pas ce GO. Les sections « attendre GO » ci-dessous décrivent les livraisons précédentes. Chapitre intégré et vérifié localement : `a07883b` (économie/sauvegarde v3), `2164799` (runtime, visuels et tests). 285 tests autonomes, combats réellement joués, livraisons/boutiques/tenues, hôtel/journées et deux parcours de production passent. Le menu mobile est corrigé, y compris son défilement tactile. Publication en préparation : lire `docs/VERIFICATIONS.md` pour sa preuve finale. Les références historiques ci-dessous restent conservées, sans limiter cette livraison.

## Correction des proportions de la maison

Après la livraison du quartier, l’utilisateur trouve le personnage trop petit pour la maison. Le rendu maison utilise désormais une échelle entière **×2** sur le personnage et son ombre, avec l’ancre aux pieds préservée; l’empreinte au sol passe à **28 × 14** de demi-dimensions pour respecter le mobilier. Rue, gym, caméra et sauvegardes conservent leurs règles. Voir la section correspondante de `docs/VERIFICATIONS.md` pour les contrôles et la publication.

## Historique — GO maison, quartier explorable et journées

L’utilisateur a confirmé puis donné **GO pour l’ensemble** : quartier plus grand que l’écran avec caméra suiveuse, maison explorable et lit, gym relié au quartier, salle communautaire accessible par une porte qui ouvre directement Béton, énergie quotidienne et sauvegarde du jour/énergie/lieu. Il a explicitement demandé de faire la maison avec le sommeil, puis confirmé que le quartier fait partie de ce GO. **Ne pas revenir à une carte réduite à un écran, ni attendre un nouveau GO pour terminer cette boucle.** Les anciennes portées et ordres conservés plus bas sont historiques.

**Phase terminée, commitée et publiée** : `5acc1ae` puis `4f6fca1` pour le chargement et les menus compacts. 207 tests autonomes, parcours complets du quartier et des journées, migration/reprise/import, interruptions pendant la nuit, ateliers de 45 secondes et bundle de production réussis. Le site public a passé le parcours complet PC/tactile sans erreur; workflow `34657851624`, bundle `index-BLy4v1Fx.js`. Preuves dans `docs/VERIFICATIONS.md`. Aucun nouveau développement n’est autorisé automatiquement après cette livraison; discuter la prochaine phase avec l’utilisateur.

Portée concrète :

- **Quartier montréalais de 2379 × 1488** : l’écran reste une fenêtre de 1280 × 720; la caméra suit le boxeur et s’arrête aux bords. Quelques rues et ruelles, collisions, portes accessibles. Cônes orange et travaux bloquent les futurs accès. Le dépanneur et le local fermé sont du décor, sans interaction commerciale ni emploi.
- **Maison explorable** : déplacement dans la pièce, sortie et lit. Interagir avec le lit propose une confirmation; seule la validation passe au lendemain. De l’espace reste disponible pour de futures activités; aucun achat de tenue, trophée interactif ou gestion domestique n’est demandé maintenant.
- **Tenue** : tuque rouge à motif noir et survêtement noir à bandes blanches à la maison et dehors; la tenue bleue/blanche d’entraînement reste au gym. Préserver toutes les ressources et identités validées.
- **Gym** : les cinq ateliers, Rémi et leurs contrôles sont conservés. La porte mène désormais au quartier. L’ancienne affiche de combat est supprimée.
- **Salle communautaire** : sa porte extérieure ouvre la présentation du combat contre Béton, sans intérieur explorable. Retour au quartier après sortie du combat. Rémi conserve son sparring et son rôle de coach entre les rounds.

Journées : base **100 énergie**, jour 1 pour une nouvelle partie. Coûts centralisés dans `src/game/DayRules.js` : **sac 15, corde 15, speed ball 15, miroir 5, sparring libre ou Résistance et relevés 20, leçon 10, Béton/revanche 0**. Marcher, franchir les portes et ouvrir un menu restent gratuits. Chaque accueil annonce le prix; le débit survient une seule fois au démarrage effectif. Pause/reprise ne redébite pas; recommencer coûte une nouvelle séance. L’abandon conserve la dépense et ne donne pas le gain. Un manque d’énergie bloque le départ de l’activité et propose de rentrer dormir; Béton reste accessible à zéro énergie.

Le sommeil confirmé avance le jour de **un**, remet seulement l’énergie quotidienne à **100** et conserve toutes les capacités, plafonds et statistiques. Ni bonus nocturne ni récupération de compétence supplémentaire. Endurance et résistance des combats restent des réserves séparées avec leurs propres règles.

Sauvegarde **schéma 2** sur la clé locale existante `boxeur-deux-d-career-v1` : champs `daily` (jour, énergie, maximum) et `location` (scène explorable, position, direction), avec acquis et résultats conservés. Les anciens profils v1 sont validés puis migrés automatiquement au **gym, jour 1, énergie 100**, en gardant leur source en secours si le stockage le permet. Nouveau profil à la maison. `Continuer` reprend le lieu sauvegardé, pas un round ou une animation en cours; une position est vérifiée par la scène avant reprise. Dépense, fin de séance, sommeil et points stables d’exploration sont sauvegardés. Export/import conserve aussi le jour et le lieu; import et Nouvelle partie demandent confirmation. Erreur de stockage signalée sans bloquer le jeu en mémoire, version future protégée. Ne pas effacer les sauvegardes pour faire fonctionner les nouveautés.

Convention commune : directions **flèches/WASD/ZQSD** ou **joypad mobile**, interaction **E/Entrée** ou **A**, choix **Entrée/A**, retour **Échap/B**, pause **P/Échap** ou **☰**. J/K et A/B restent les attaques/gestes des activités. Les boutons mobiles restent dans les bandes latérales; aucun contrôleur affiché sur ordinateur. Cadrage **16:9, 1280 × 720**, mis à l’échelle uniformément en largeur et hauteur; paysage mobile, invitation à tourner en portrait, appuis libérés à la perte de focus et aux transitions.

Accès de développement : `?scene=home`, `?scene=neighborhood`, `?scene=gym`, ainsi que les raccourcis d’activités existants. Ils prennent priorité sur le lieu sauvegardé, sans régénérer gratuitement l’énergie. Le démarrage normal sans paramètre passe par la reprise ou une nouvelle partie maison.

Fichiers métier : `src/game/DayRules.js`, `src/game/CareerProfile.js`, `src/game/DailyActivityGate.js`, `src/game/ExplorationWorld.js`; les scènes et interfaces ajoutées sont à lire dans l’état réel du dépôt. Les acquis gym/Béton de la livraison précédente doivent rester fonctionnels. Préserver les changements locaux et réutiliser le Vite existant, port strict 5173. La publication GitHub Pages reste autorisée par les relais précédents, après intégration et contrôles; aucun autre service distant n’est demandé.

Suite hors de ce GO : travail, argent, achats/vêtements, deuxième puis troisième adversaire et tournoi. **La liste initiale complète est conservée dans `docs/PROCHAINES_ETAPES.md`**; le présent GO regroupe sa boucle des journées et la partie maison/quartier de l’étape suivante. La maison précède/accompagne maintenant le sommeil. Les coûts monétaires et le tournoi ne sont pas implémentés par anticipation.

## Historique — GO « 1 à 4 », gym complet, capacités et sauvegarde

Les paragraphes de cette livraison décrivent l’état avant le GO maison/quartier ci-dessus. Leurs mentions d’un accueil au gym, d’un schéma v1 ou de journées encore futures sont remplacées par le contrat courant.

L’utilisateur a autorisé les quatre travaux ensemble : **terminer les ateliers du gym, relier leurs gains au combat, sauvegarder la progression et vérifier la boucle entraînement → Béton → reprise**. Il a ensuite interrompu la première proposition de corde/speed ball pour demander de meilleurs visuels et les bonnes touches selon ordinateur/mobile. Cette correction complète le GO; elle ne ramène pas la mission à une maquette. Les anciennes attentes de confirmation et portées visuelles conservées ci-dessous sont historiques.

État de l’intégration : speed ball et corde à danser sont accessibles à pied dans le gym, ou par `?scene=speedball` / `?scene=rope`. Chaque séance dure 45 s, avec objectif de 20 bons temps et 60 % de précision. Les deux ateliers disposent de personnages adultes à tuque rouge, tenue bleue/blanche, poses transparentes dédiées et décors du gym. La speed ball anime la frappe et le retour des bras avec la balle indépendante; la corde accompagne préparation, saut, réception et faux pas. Les points se résolvent au contact ou au passage sous les pieds. Un petit repère de rythme laisse le personnage visible.

Convention maintenue dans tout le jeu : **J/K sur ordinateur**, **A/B dans la marge droite sur téléphone paysage**, joypad gauche pour les menus et déplacements; l’aide des nouveaux ateliers s’adapte au périphérique. Pas de manette affichée sur l’action à l’ordinateur. **P/Échap** ou **☰** ouvre la pause et Commandes; **← Gym** reste direct. Le cadrage logique demeure 1280 × 720, 16:9, ajusté uniformément à la largeur et à la hauteur disponibles. Portrait et perte de focus libèrent les appuis et arrêtent la séance.

Capacités plafonnées au palier Béton :

- Sac terminé avec 6 contacts et 50 % de précision : puissance +1, bonus maximal +5 sur les dégâts des touches nettes.
- Speed ball terminée avec 20 bons temps et 60 % : récupération +2 points de pourcentage, bonus maximal +10 %.
- Corde terminée avec 20 bons temps et 60 % : endurance maximale +2, de 100 à 110.
- Résistance et relevés terminée avec au moins 10 touches nettes/blocages/esquives réussis : résistance maximale +2, de 100 à 108.
- Miroir, leçons et sparring libre : pratique, sans gain permanent. Les bonus n’agissent jamais comme défense automatique.

Les valeurs actuelles, objectifs et plafonds sont annoncés avant les ateliers; les gains sont présentés au bilan. Le joueur commence les combats avec ses capacités entraînées. Au coin : endurance pleine à son maximum, +20 résistance jusqu’à son plafond personnel; Rémi et Béton restent à 100. Les récupérations après relevé et les coûts des gestes gardent leurs règles propres.

`CareerProfile` enregistre automatiquement les activités résolues et les résultats finaux contre Béton. Format versionné v1, statistiques d’entraînement, capacités/plafonds, tentatives/victoires/défaites/égalités/meilleur score de Béton, copie précédente de secours et statut d’enregistrement réel. Une sauvegarde locale de version future est protégée de l’écriture automatique. Le stockage bloqué conserve la partie en mémoire et demande un export, sans casser le jeu. Pas de sauvegarde au milieu d’une animation : l’accueil reprend au gym avec les acquis terminés; les liens directs ouvrent une activité prête à démarrer.

Au retour à l’accueil avec une progression : **Continuer / Nouvelle partie**, import/export, confirmations avant remplacement. Dans la pause du gym : export JSON et import validé/prévisualisé puis confirmé; joypad/A/B ou clavier naviguent les mêmes menus. Le menu de reprise bloque le gym derrière lui et libère les commandes à sa fermeture. Les stockages sont séparés par navigateur et adresse; transfert PC/mobile par export/import, sans compte ni synchronisation distante.

Fichiers principaux : `src/game/RhythmSession.js`, `src/scenes/RhythmScene.js`, `src/scenes/RhythmTrainingView.js`, `src/ui/RhythmUI.js`, `src/game/CareerProfile.js`, `src/ui/CareerMenu.js`. Ressources finales dans `public/assets/sprites/speedball/` et `public/assets/sprites/rope/`, sources/prompts dans `references/characters/speedball/`, `references/characters/rope/` et les dossiers de décors correspondants.

**Version jouable `39de7a8` terminée et publiée** : 176 tests, parcours complet de progression, commandes communes, import tactile et bundle de production réussis. Le workflow Pages a réussi; le parcours complet du site public a également passé au clavier et au tactile simulé, sans erreur au dernier essai. Lire `docs/VERIFICATIONS.md` pour les résultats, l’incident de chargement initial et les preuves. Conserver le serveur Vite existant sur le port strict 5173 et préserver tous les fichiers déjà présents. La publication GitHub Pages de ce projet reste autorisée par le relais historique, après intégration et contrôles.

La suite proposée est **journées/énergie/sommeil**, puis petit quartier, maison, travail et argent; les prochains adversaires et le tournoi viennent ensuite. Le gym reste gratuit. Dormir passera au jour suivant et remplira seulement l’énergie quotidienne. Aucune de ces extensions ne fait partie du GO actuel. L’ordre complet et la liste initiale restent dans `docs/PROCHAINES_ETAPES.md`.

## Relais précédents — historique, remplacé par l’état ci-dessus

Les sections qui suivent conservent les décisions et livraisons successives. Leurs mentions « futur », « prochain GO » ou « pas encore sauvegardé » décrivent leur date d’origine; elles ne limitent pas le GO actuel.

## Historique — les combats dans une salle

Après avoir validé Béton et le coach, l’utilisateur demande que **les combats aient lieu dans une salle plutôt que dans le gym**. Béton reçoit donc un décor dédié de salle de boxe de quartier avec public et projecteurs (`public/assets/backgrounds/fight-hall.png`). Le sparring de Rémi conserve `gym.png`; les ateliers et le gym explorable sont préservés. Le cadrage, les personnages, règles, commandes, repos avec Rémi et retour au même endroit restent communs. L’affiche du gym conduit directement à la salle, sans ajouter une carte extérieure. Sources et prompt dans `references/direction-artistique/fight-hall/`; lire `docs/VERIFICATIONS.md` pour les contrôles effectivement terminés.

Livrée dans `f30ba83` : 139 tests, composition PC/trois paysages mobiles simulés, retour vers le sparring de Rémi, vrai round de 60 s jusqu’au coach, compilation et parcours de production local réussis. Déploiement GitHub Pages puis parcours complet du vrai site également réussis, sans erreur navigateur ou ressource. Le public du décor est fixe. Les prochaines fonctionnalités restent à discuter.

## Étape 2 terminée — Béton et le coach entre les rounds

Après l’étape 1, l’utilisateur a autorisé le **premier adversaire**, nommé **Béton**, un boxeur noir; l’apparence restante et son comportement sont laissés au choix de l’agent. Il a ensuite demandé de conserver la continuité avec les leçons de Rémi et d’ajouter **un petit visuel entre les rounds avec le coach**, dans l’esprit Punch-Out. Ces précisions complètent le GO de l’étape 2, elles ne l’annulent pas.

Intégration : affiche Prochain combat sur un présentoir à droite de l’entrée (station combat 1010,575, accessible depuis y585), interaction E/A, rencontre contre Béton dans le ring existant et retour au même endroit. Accès direct `?scene=fight`; données de scène `opponent: 'beton'`. Béton est indépendant de Rémi : garde haute programmée, jab tête et direct corps qui laisse une ouverture plus longue. Trois rounds de 60 s; règles de résistance/chutes/relevés de l’étape 1. Décision à la fin : 1 point par touche nette, +3 par chute adverse, total supérieur vainqueur, égalité possible. Victoire, défaite, revanche et retour au gym sont présentés séparément du sparring. Les tests et la preuve de publication doivent être lus dans `docs/VERIFICATIONS.md`.

Entre les rounds, une nouvelle vignette montre le joueur au tabouret et Rémi en survêtement de coach avec serviette. Le conseil utilise les statistiques du round terminé. Le prochain round démarre uniquement sur action du joueur; endurance pleine, résistance +20/max100, chutes du round remises à zéro et totaux conservés. Paysage mobile et contrôles communs restent applicables. L’illustration n’ajoute pas de nouvelle commande ni de mini-jeu de soin.

Les idées discutées de J/J/K, de K maintenu pour un uppercut, de crochets au corps par doubles pressions et de déblocages futurs ne sont pas dans ce GO. Les gestes actuels suffisent pour tester ce premier adversaire. Ni carte extérieure, ni progression de carrière sauvegardée, ni gains de capacités permanents ne sont ajoutés maintenant.

**Terminée et publiée dans `c4505ac`** : 139 tests autonomes, quatre parcours Béton réellement joués (victoire, KO, coin après 60 s, tactile), régression des trois leçons, compilation et parcours du bundle local réussis. Le workflow GitHub Pages a réussi et le parcours public complet a ensuite passé, sans erreur au dernier essai. Sources, prompts, rapports et captures sont conservés; détails et incidents résolus dans `docs/VERIFICATIONS.md`. La prochaine étape proposée est celle des gains réels des entraînements et de la sauvegarde; elle reste à discuter et à autoriser.

## Étape 1 terminée — résistance, chute et relevé

L’utilisateur a dit **« ok j’aime ton idée go pour l’étape 1 »**. Cette autorisation remplace l’attente de GO du plan ci-dessous pour cette seule étape. La séance **Résistance et relevés** est intégrée au choix de Rémi : trois rounds de 60 secondes, deux jauges de résistance distinctes de l’endurance, chutes, compte de dix, relevé avec six pressions alternées J/K ou A/B, récupération partielle et arrêts à trois chutes dans un round ou quatre dans la séance. Les exercices pédagogiques et le sparring libre de 60 secondes restent disponibles. Lire `docs/VERIFICATIONS.md` pour les validations effectivement terminées et la publication; l’implémentation seule ne prouve pas leur réussite.

**Étape 1 terminée et publiée dans `703e5aa`** : 126 tests autonomes, parcours de résistance complet, régression des trois leçons, compilation et parcours de production local réussis. Le workflow GitHub Pages a réussi et le même parcours a passé sur le site public, y compris une chute et un relevé par six A/B tactiles simulés. L’étape 2 a reçu depuis son propre GO, décrit en tête de ce document.

Les coups nets retirent 12/18/22 points pour jab/direct/crochet; blocage et esquive ne retirent pas de résistance. Le contact reste visible 100 ms avant la chute. Pour se relever, commencer par J/A, puis alterner six pressions au total espacées d’au moins 0,35 s avant dix; aucun avantage au maintien ou au martèlement. Rémi se relève au compte de 6, 8 puis 9 selon ses chutes totales. Résistance rendue 55/45/35 et endurance 60 après relevé; entre les rounds, endurance pleine et +20 de résistance. Pause, perte de focus et portrait figent aussi le décompte. Les nouvelles poses, sources et prompts sont dans les dossiers `knockdown`; les anciens personnages et décors sont conservés.

L’étape 2 était alors prévue séparément : premier adversaire original via une affiche **« Prochain combat »** dans le gym existant. La discussion a retenu cette entrée sans construire la ville maintenant. Rémi garde son rôle de partenaire. Ni adversaire officiel, ni décision aux points, ni KO spécial, ni sauvegarde de carrière, ni gains permanents/dépenses quotidiennes n’avaient été ajoutés à l’étape 1.

## Plan après les commandes communes — historique de la discussion

Les commandes communes sont livrées dans `74f87df`; le parcours du site GitHub Pages a aussi réussi au clavier et au tactile simulé après déploiement. La discussion suivante valide gym gratuit, argent pour goodies/vêtements futurs, plafonds de capacités et d’épargne liés à l’avancement, énergie quotidienne dépensée au travail/gym et remise à plein uniquement en dormant, endurance et résistance séparées pendant les combats. Un adversaire original à la fois; après deux ou trois, tournoi de trois jours avec hôtel, restaurant et gym dédiés. Le sens de tournoi «payant» est interprété provisoirement comme une inscription en argent du jeu. Les conditions précises de chute/KO à zéro résistance restent à régler.

L’utilisateur avait demandé **un plan par étapes**, avant d’autoriser l’étape 1 ci-dessus. Décisions et ordre proposé dans `docs/PROCHAINES_ETAPES.md` : résistance/chutes/relevé → premier adversaire → gains réels des ateliers → speed ball et corde → journées → petit quartier/travail/argent → adversaires suivants → tournoi. Ne pas transformer cet ordre en fonctionnalités déjà réalisées ou approuvées en détail.

Il demande aussi comment sauvegarder la progression du joueur. Le plan inclut dès les premiers gains permanents une sauvegarde automatique locale versionnée, Continuer/Nouvelle partie, copie précédente de secours et export/import de fichier via le menu commun. Stockages séparés par navigateur/adresse; aucune synchronisation PC/téléphone implicite et aucune partie stockée par un simple push Git. Les coûts/récompenses et reprises d’activités devront rester cohérents après rechargement. Cette sauvegarde de carrière est proposée, pas encore implémentée.

## Dernier GO — commandes communes avant la prochaine activité

L’utilisateur a validé **joypad + A/B**, gardes directionnelles et coups tête/corps dans tout le jeu, avant la speed ball. La convention remplace les boutons de direction/guard et la touche Espace des étapes historiques ci-dessous. Ordinateur : flèches/WASD (ZQSD aussi), J/K frappes, E interaction, Entrée validation, P/Échap pause/retour. Mobile paysage : joypad à gauche, A/B à droite, ☰ pause; dans les menus joypad sélectionne, A valide, B revient. Haut garde tête; bas garde corps et sélectionne les frappes au corps, gauche/droite esquivent. Attaquer suspend la garde; le combo peut se faire bas maintenu. Les lettres A/B restent fixes. La sortie «← Gym» est directement accessible dans la bordure des trois activités et conserve la position du gym.

`GameControls.js` mutualise entrées, capture tactile, navigation et relâchements. `act`, `setGuard(held, level)` et `releaseControls` sont communs aux trois modèles. Rémi annonce tête/corps avec cible stable; son calendrier de garde est indépendant des boutons. Les leçons gardent leurs objectifs à la tête mais ne changent pas silencieusement les gestes au corps. Le sac inclut une cinquième séquence au corps. Nouveaux PNG dans `body-training`, anciens décors et sprites conservés. Les résultats des tests, de compilation et de publication doivent être lus dans `docs/VERIFICATIONS.md`; ce relais décrit l’implémentation, pas une preuve de déploiement.

## Dernier GO — shadow boxing au miroir

Après le combo de sparring publié dans `25500d5`, l’utilisateur a autorisé l’atelier suivant : **pratiquer les mouvements devant le miroir**. Le miroir est désormais raccordé au gym par une conversation et le bouton Pratiquer, ou directement par `?scene=shadow`. Le retour conserve la position de la visite. Speed ball, corde et énergie quotidienne restent ultérieurs.

Séance libre sans adversaire, sans limite de durée et sans coût d’endurance. J jab gauche, K direct droit, J/K/J crochet selon la même fenêtre que le sparring; Espace garde, A/D ou flèches esquives. Deux vitesses dans les menus : normale et ralentie à 65 %. P/Échap ouvre pause/Commandes; Terminer présente un bilan simple des mouvements, puis nouvel essai ou retour au gym. Aucun bouton permanent sur ordinateur; les sept boutons tactiles sont dans les marges, portrait/focus/périphérique libèrent les entrées et mettent en pause.

`ShadowSession` sépare temps réel actif et horloge d’animation, compte les gestes à leur extension, sans coups reçus ni score de précision. `ShadowFighterView` anime ensemble le boxeur et son reflet inversé horizontalement, sans second acteur ni second minuteur. Nouveau décor `public/assets/backgrounds/mirror-training.png`, trois poses défensives `public/assets/sprites/mirror/`, six poses de frappe/garde reprises de `bag-orthodox`. Tenue du gym et tuque rouge conservées. Les pixels et le cadre de verre ont été inspectés dans le navigateur; sources, prompts intégrés et préparation dans `references/characters/mirror/` et `scripts/prepare-mirror-sprites.mjs`.

Consulter `docs/VERIFICATIONS.md` pour les vérifications terminées et leurs limites. `npm run test:shadow` couvre la vraie marche jusqu’au miroir, clavier, tactile, reflet, pause/ralenti, bilans et transitions répétées. La compilation et le contrôle réel de GitHub Pages restent à distinguer d’un commit local.

## Nouveau GO après redémarrage — combo en sparring libre

L’étape précédente autorisée était le transfert **J → K → J** dans le sparring libre : jab gauche, direct droit, crochet gauche. Le miroir est maintenant décrit plus haut. Pas de ville ni d’énergie quotidienne dans cette phase.

Le modèle dispose d’une fenêtre de 0,5 s après la récupération de chaque coup, sans entrée mise en attente. Le crochet coûte 21 points, la séquence 48; les deux premières frappes bloquées n’empêchent pas de lancer le crochet, mais un combo complet au bilan demande trois touches. Défense, coup reçu, pause, expiration et épuisement invalident la chaîne. Les coups engagés finissent leur animation. Les ouvertures libres de Rémi sont allongées selon le rythme, indépendamment des touches; les trois leçons sont inchangées.

Trois poses supplémentaires dans `public/assets/sprites/sparring-hook/` complètent les vingt poses existantes; génération intégrée, références et prompts dans `references/characters/sparring-hook/`. Le personnage conserve casque et tenue bleu/or du ring, vu de dos. Le bouton tactile Jab devient Crochet; aucun bouton permanent n’est réintroduit sur ordinateur. Aide dans P/Échap → Commandes. `npm run test:combo` couvre les entrées clavier/tactile et contacts. Les résultats réellement terminés et la publication sont consignés dans `docs/VERIFICATIONS.md`.

## Dernier retour utilisateur — contrôles ordinateur et garde au sac

Le navigateur de l’ordinateur affichait encore les boutons : l’ancienne détection traitait `maxTouchPoints > 0` comme un téléphone. `GameLayout` utilise désormais `(pointer: coarse) and (hover: none)` pour le périphérique principal. Les trois interfaces suivent cette décision commune; une simple capacité tactile ou un événement touch ne force plus le mode mobile. Le portrait n’interrompt pas une fenêtre ordinateur. Changer de périphérique libère les entrées et met la scène en pause.

Les poses initiales du sac dessinaient le pied droit devant et rendaient les mains ambiguës. Le personnage a été redessiné en **garde de droitier**, trois quarts avant : pied gauche devant, **J = jab gauche**, **K = direct droit avec pivot arrière droit**, crochet gauche en combo. Nouveau set `public/assets/sprites/bag-orthodox/`, sources/prompts dans `references/characters/bag-orthodox/`; anciens fichiers conservés. Le sac et le décor sont réutilisés à l’identique. Les noms de touches et les règles n’ont pas été échangés pour compenser les dessins.

## Historique — GO du sac et des commandes du 11 septembre 2026

L’utilisateur a autorisé **les deux étapes ensemble** : déplacer les commandes hors de l’image dans tout le jeu et réaliser le sac chorégraphié. Cette demande remplace les anciennes attentes de GO, de mini test visuel et de discussion préalable conservées dans les archives ci-dessous.

- **Gym, sparring et sac :** même cadrage logique 1280 × 720, format 16:9, adaptation uniforme à la largeur et à la hauteur réellement disponibles.
- **Ordinateur :** aucun bouton de jeu ni rappel permanent des touches sur l’action; le pied de page des raccourcis est également caché. P/Échap ouvre la pause; son menu **Commandes** donne l’aide. Les boutons des menus restent accessibles lorsque la séance est arrêtée.
- **Téléphone en paysage :** boutons dans les deux bandes latérales noires, hors de l’image de jeu, pour les trois scènes. En portrait : invitation à tourner l’appareil et pause. Les bandes réservent l’espace nécessaire aux pouces; préserver le cadrage complet au centre.
- **Sac intégré :** accès en marchant jusqu’au sac puis en interagissant, ou par `?scene=bag`. Séance de 45 secondes, quatre enchaînements (jab, double jab, jab–direct, jab–direct–crochet), repères de rythme, impacts, bilan, pause/reprise, nouvel essai et retour à la même position dans le gym.
- **J / K / J au sac :** jab, direct, puis crochet uniquement dans la fenêtre de l’enchaînement annoncé et après les deux premières frappes réussies. Hors de cette fenêtre, J reste un jab. Le bouton tactile indique Crochet lorsqu’il est prêt. Le nouveau GO décrit plus haut ajoute maintenant ce combo au sparring libre. Les frappes au corps sont ultérieures.
- **Son des séances :** M au clavier; Son/Muet dans la marge tactile. Audio synthétisé localement, sans service distant pendant une partie.
- **Ressources du sac :** nouveau décor rapproché du même gym, boxeur adulte à tuque rouge et tenue bleue/blanche, sac séparé transparent et six poses dessinées. Génération imagegen intégrée, sources et prompts dans `references/characters/bag/PROMPTS.md`; extraction reproductible par `scripts/prepare-bag-sprites.mjs`. L’animation par poses clés pourra gagner en fluidité avec des intermédiaires.
- **Portée restante :** speed ball et corde sont encore des présentations. Le miroir est ajouté par le dernier GO décrit en tête. Pas d’énergie quotidienne, de compétences persistantes ni de carte extérieure.

Le README décrit les commandes et les scripts de vérification, notamment `npm run test:bag` et `npm run test:side-controls`. Consulter `docs/VERIFICATIONS.md` pour les résultats réellement obtenus; ce relais ne certifie pas une publication de cette nouvelle étape. L’envoi GitHub et le contrôle du déploiement restent distincts d’un commit local.

## Relais historiques

> **Retour utilisateur après la visite :** disparition près du sac et de la speed ball corrigée. La cause visuelle était l’usage de GeometryMask, limité au rendu Canvas dans Phaser 4; le rendu WebGL utilise le filtre de masque. La première correction masquait seulement les commandes sur ordinateur et gardait les raccourcis en bas. La demande du 11 septembre ci-dessus remplace cette présentation pour tout le jeu.

> **Gym autorisé au nouveau GO, après discussion :** réaliser le personnage à tuque rouge à partir des références fournies, la première salle explorable, les déplacements et le lien avec Rémi. Le gym ouvre maintenant par défaut; le sparring reste accessible par Rémi ou `?scene=sparring`, avec retour au gym. Résolution logique fixe 1280 × 720, cadrage identique sur ordinateur et téléphone paysage. Les autres ateliers sont présentés, leurs mini-jeux viendront ensuite. Tenue extérieure future : survêtement Adidas noir à bandes blanches et tuque rouge. Cette décision remplace l’attente de discussion mentionnée dans les anciens relais.

> **Phase leçons et son autorisée puis réalisée le 10 septembre 2026 :** trois exercices guidés de Rémi (jab, blocage et récupération, esquive et riposte), progression, bilans et audio local. Le sparring libre reste disponible. L’utilisateur demande ensuite une discussion sur les aspects du gym explorable : ne pas lancer sa réalisation avant cette discussion. Voir le README et les vérifications pour le fonctionnement actuel.

> **Publication autorisée le 10 septembre 2026 :** la capture de `mixmasterkd.github.io/BoxeurDeux-D/` confirme que l’utilisateur souhaite y jouer au sparring actuel. L’interdiction initiale de publication est dépassée pour ce site. Le prototype complet et le workflow `.github/workflows/pages.yml` sont enregistrés et envoyés sur GitHub. Pages utilise désormais la source **GitHub Actions** pour publier `dist/`. La connexion GitHub existante de VS Code a pu être réutilisée au moyen de son helper Git officiel et de son socket IPC actif; aucune nouvelle connexion n’est nécessaire tant que cet accès reste disponible. Ne jamais demander de mot de passe ou jeton dans le chat, ni afficher la sortie d’un helper de credentials. Vérifier la réussite du workflow et l’adresse publique avant d’annoncer le jeu en ligne.

> **Phase exécutée le 10 septembre 2026 après GO :** tenues de sparring, poses intermédiaires, garde et retours plus fluides, cadrage fixe des échanges rapprochés, correction d’une reprise tactile accidentelle après perte de focus. Les règles du round restent inchangées. Les idées du gym explorable (sac, miroir pour pratiquer les mouvements, speed ball, corde à danser et sparring avec Rémi) et la future énergie quotidienne sont dans `docs/PROCHAINES_ETAPES.md`. Ne pas les considérer comme déjà implémentées.

> **Relais actualisé le 9 septembre 2026.** La nouvelle demande explicite autorise et demande le prototype de sparring complet jusqu’au round jouable, sans arrêt au mini test visuel ni autorisation avant le jab. Les limitations de portée visuelle ci-dessous sont historiques et dépassées. Voir `README.md` pour les commandes actuelles et `docs/VERIFICATIONS.md` pour les vérifications. Le décor validé et les autres contraintes du projet restent applicables.

Ce document conserve la direction issue de la discussion vocale. Il doit permettre de poursuivre dans **Codex dans VS Code**, dans ce projet existant, sans recommencer la préparation. Les dernières demandes ci-dessous précisent la priorité par rapport au README initial.

## Demande à envoyer à Codex

> Lis entièrement REPRISE_CODEX.md et examine l'image references/direction-artistique/gym-proposition-01.png. Reprends ce projet pour réaliser uniquement le mini test visuel décrit ici. Utilise des agents pour les sous-tâches utiles si cette session le permet. Préserve les modifications présentes, soigne vraiment le décor et les boxeurs, puis montre le résultat avant de passer au premier jab. Ne développe pas encore les contrôles complets, la ville ou la carrière.

## Prochaine étape : un mini test visuel

L'utilisateur veut **voir une belle composition avant les bases des contrôles** :

- Caméra fixe façon Punch-Out / Super Punch-Out, à hauteur d'épaule dans le ring, face au mur opposé.
- Joueur vu de dos au premier plan, légèrement semi-transparent pour que Rémi reste visible devant lui.
- **Rémi le Tank** de face : c'est un partenaire de sparring, pas un adversaire de combat officiel.
- Ring, cordes et murs du gym visibles; centre dégagé pour les silhouettes et les futurs coups.
- Joueur d'apparence simple pour concentrer le soin sur les poses et les animations.
- D'abord une composition lisible; éventuellement une légère animation de garde. Montrer cette étape avant de poursuivre avec un premier jab.

Aucun ensemble de commandes n'est arrêté. Jab/direct, garde, esquives, endurance et réglages sont des pistes pour la suite, pas la portée de ce premier test. Ne pas construire d'emblée un système de combat complet.

## Direction artistique à respecter

Jeu original en pixel art soigné, inspiré des jeux Super Nintendo / 16 bits. **Rétro ne veut pas dire grossier ou pauvre en détails.** L'utilisateur a testé le ring provisoire et le trouve vraiment laid, particulièrement le mur. Cette scène est uniquement une vérification fonctionnelle de Phaser; elle n'est pas une direction artistique approuvée.

Il veut de vraies images et un décor travaillé : composition, lumière, textures, profondeur, palette cohérente et grille de pixels régulière. Éviter les gros rectangles génériques comme résultat final. Garder les futurs boxeurs lisibles devant le décor; la richesse visuelle ne doit pas masquer l'action. Il ne faut ni rendu photographique ou 3D, ni vue isométrique pour ce test.

Le brief du décor vise un cadre **16:9**. La scène affiche maintenant le gym en **1280 × 720**, avec mise à l'échelle uniforme de l'image et affichage adapté à la fenêtre. L'ancien cadre technique 384 × 288 a été remplacé. Préserver les proportions du décor et des futurs personnages. Maintenir une structure simple.

## Référence locale : direction visuelle validée

Image disponible dans le projet :

`references/direction-artistique/gym-proposition-01.png`

**Statut : direction visuelle validée par l'utilisateur; décor intégré dans la scène Phaser.** Après avoir vu cette image générée avec Imagegen dans la discussion vocale, l'utilisateur a confirmé qu'elle est beaucoup plus belle et correspond au style souhaité pour le jeu. À sa demande suivante, l'image a été copiée dans `public/assets/backgrounds/gym.png` et affichée dans le jeu, sans étirement. S'appuyer sur cette direction pour la suite. Le joueur de dos semi-transparent et Rémi de face restent à ajouter.

Description transmise : gym avec ring en vue frontale depuis l'intérieur, tapis dégagé, cordes, murs de briques, fenêtres lumineuses et équipement sur les côtés, sans boxeurs. Brief d'origine : scène 16:9 en pixel art soigné; aucun personnage, interface ou texte; pas d'isométrie, de photographie ou de rendu 3D. Vérifier l'image réelle avant toute adaptation, en particulier la cohérence des pixels et la place laissée aux personnages.

L'original est conservé à son emplacement source :

`/home/mixmasterkd/.codex/generated_images/01a08917-5a9b-7a21-8f2c-fedd83c0bba6/exec-f882c811-09b2-495a-88d3-e63f0accb89f.png`

La référence et la ressource permanente sont identiques à l'original. L'intégration du décor a été réalisée par la tâche de l'application Codex après une nouvelle demande explicite de l'utilisateur; elle ne signifie pas que l'extension de VS Code a reçu la reprise ou exécuté ce travail.

## Vision du jeu à long terme

**BoxeurDeux-D**, avec « eur », « Deux » en lettres, sans espaces et un trait d'union avant le D final : jeu de mots avec 2D. Conserver ce nom et le dossier `/home/mixmasterkd/Documents/HTML/BoxeurDeux-D`.

Jeu de vie de boxeur avec, à terme, exploration à la Zelda en vue du dessus légèrement inclinée. Petit quartier inspiré de Montréal; premiers lieux : gym, maison et emploi. Cette caméra d'exploration est distincte de celle du sparring.

Progression envisagée :

1. Sparring avec Rémi le Tank.
2. Gym explorable.
3. Petit quartier.
4. Boucle maison / emploi / entraînement / récupération.
5. Premier combat officiel.
6. Autres lieux avec des activités utiles.

Cette vision sert à préserver la cohérence, pas à élargir la prochaine tâche.

## État technique au moment du relais

- JavaScript, Phaser **4.2.1**, Vite **8.2.2**; dépendances déjà installées dans le projet. Node **24.19.0** disponible lors de la préparation.
- `src/main.js` configure Phaser; `src/scenes/BootScene.js` charge et affiche le gym validé; `src/style.css` présente la page. Le ring géométrique et ses textes superposés ont été retirés.
- Ressources prévues dans `public/assets/sprites/`, `public/assets/tilemaps/` et `public/assets/audio/`.
- Aucun combat, carrière, carte ou système de contrôles implémenté lors de la préparation.
- Intégration du décor compilée et vérifiée visuellement sur `http://127.0.0.1:5173/`, sans erreur dans la console du navigateur. Un avertissement non bloquant signale la taille du bundle Phaser.
- Git local sur `main`, premier commit de base `6857632`; aucun dépôt distant configuré lors de la préparation. Vérifier l'état actuel avant de modifier, car une autre session ou l'utilisateur peut avoir avancé.
- Serveur laissé sur `http://127.0.0.1:5173/` lors de la préparation. Vérifier s'il tourne encore; sinon lancer `npm run dev`. `npm run build` compile et `npm run preview` affiche la compilation.

Le README conserve les instructions de démarrage. Ne pas recréer le projet, remplacer toute sa structure ou toucher aux autres dossiers, notamment **BoxeurDeux** sans suffixe et **B2combat**.

## Outils, agents et façon de travailler

L'utilisateur privilégie les solutions gratuites. VS Code et Git sont présents; Phaser est installé. Aseprite a été écarté pour éviter un achat. LibreSprite est l'alternative proposée pour les sprites et retouches, et Tiled pour assembler le gym et la carte.

L'utilisateur permet d'installer les outils **s'ils sont nécessaires** à un beau décor. Ce n'est pas une demande d'installation générale : la génération d'image a déjà fonctionné sans eux. LibreSprite et Tiled peuvent être ajoutés au moment utile; ils ne dessinent pas automatiquement un beau décor. Aucun logiciel ni réglage global n'a été ajouté pendant ce relais.

L'utilisateur souhaite que **Codex dans VS Code utilise des agents**. Si les outils et la configuration de la session le permettent, leur confier des sous-tâches concrètes et utiles, par exemple préparation des éléments visuels et vérification de la composition, en évitant les modifications concurrentes des mêmes fichiers. Ne jamais affirmer que des agents ont été lancés sans preuve. Leur disponibilité dans cette future session n'a pas été vérifiée ici.

Avancer sobrement et directement, avec de courts points d'étape en français. L'utilisateur a exprimé sa frustration devant la lenteur de la préparation; éviter les longues investigations, une architecture prématurée et les demandes de confirmation répétitives pour le travail déjà demandé.

## Critères du premier résultat à montrer

Le test local doit afficher le gym suivant la direction visuelle validée et les deux boxeurs dans la bonne perspective, avec un joueur de dos discret et Rémi de face bien visible. La composition doit rester lisible et les pixels cohérents. Vérifier le résultat dans le navigateur et la compilation, puis présenter cette première intégration visuelle à l'utilisateur. La simple présence d'un ring ne suffit pas à satisfaire la demande artistique.

## État du transfert

Ce fichier et la référence locale préparent le relais. **Ils ne prouvent pas qu'une conversation a été envoyée à Codex dans VS Code ou que le travail y a démarré.** Pour lancer la reprise, envoyer le paragraphe « Demande à envoyer à Codex » dans le panneau Codex du projet. Le chemin du document suffit à identifier le contexte à lire; on peut aussi joindre le fichier avec la commande « Codex: Add File to Codex Thread » proposée par l'extension installée.
