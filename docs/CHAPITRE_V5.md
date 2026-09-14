# Chapitre V5 — voyages, métro et marathon

Livraison du 13 septembre 2026. Le projet existant, son décor validé, ses activités et sa carrière sont conservés. Le serveur Vite existant est réutilisé sur le port strict 5173.

## Parcours jouables

- **Maison, laptop** : navigateur rétro pour s’inscrire au marathon et réserver Cuba/Mexique ; Terminal pour les raccourcis de développement. `liste` montre les commandes. `test cuba`, `test mexique`, `test marathon`, `test dore`, `combat feu`, etc. travaillent sur un profil séparé. `retour` rend la carrière normale ; elle et sa copie de secours sont préservées à l’octet près.
- **Métro** : Quartier → Des Rives → Île Sainte-Hélène → Stade olympique → Aéroport, dans les deux sens. Plan consultable, station courante/prochaine et direction annoncées. Marcher dans le train à l’arrêt, attendre son arrêt puis sortir physiquement au bon endroit. Une recharge reprend sur un quai sûr.
- **Voyages** : Cuba et Mexique coûtent chacun 160 $ d’argent du jeu, logement/retour inclus. Réservation depuis le laptop ou le kiosque, puis départ à l’aéroport. Accessibles ensemble après une participation terminée aux Gants de bronze. Réservations, séjours, dépenses et retours sont sauvegardés sans double débit.
- **Mexique** : village, posada, plage/promenade, gym et arènes de Danielo. Pablo est partenaire de sparring. **The Octopus est le coach au Mexique**, aux pads et dans le coin ; Fredo reste ailleurs. Lit, entraînement, portes et retours utilisent les conventions existantes.
- **Marathon optionnel** : 100 $ par inscription, aucune prime d’arrivée. L’île, le centre-ville, le Vieux-Port et le stade sont aussi visitables librement. Courir demande seulement les directions ; petits repères, chrono indicatif, pause et reprise sauvegardée. Première arrivée : une médaille souvenir unique à la maison ; les suivantes peuvent améliorer le record. Une rencontre provocatrice par tentative, évitable. Si acceptée : bagarre sans chrono ni juges, une chute, puis reprise au même endroit sans récompense de combat.
- **Gants dorés** : 240 $, après Bronze terminé et les victoires contre Dyrex, Le Feu, Louisto et Danielo. Marathon non requis. Trois jours contre Rafael Ríos, Émile Moreau et Thiago Santos ; hôtel, chambre, gym, piscine, salle et restaurant La Croûte dorée. Le bar à pain se parcourt en trois stations, sans modifier argent, énergie ou capacités.
- **Combat et interface** : esquives extérieures alignées sur la main illustrée ; décisions avec joueur de face, trois juges locaux/cinq en tournoi, rounds au 10-point-must sans égalité ni retrait automatique de point par chute. Les trois rounds officiels de 45 secondes et la récupération au coin sont conservés. Accueils/bilans d’activité à deux choix principaux ; réglages, aide et carnet restent dans la pause.

## Dernières corrections visuelles

Le centre-ville possède une rue en U, des voitures à l’échelle du personnage et des passages nord/sud. Le parcours de l’île monte autour du parc puis revient au pont ; les collisions suivent le chemin. Au pont, le coureur reste sur le tablier et passe derrière la structure avant, extraite de l’illustration. Le Vieux-Port impose un détour sur le quai. Au stade, le parvis est accessible par l’est et la caméra regarde plus haut pour montrer le bâtiment. Les autres coureurs suivent les mêmes chemins sans traverser les jardins pour revenir au départ.

Le marathon garde la tenue inspirée de la photo de l’utilisateur : tee-shirt violet, casquette et short noirs. Les planches ont été vérifiées puis détourées/ancrées ; le damier opaque initial n’est pas utilisé comme transparence. Les photos brutes ne sont pas publiées. Sources, prompts et scripts de préparation sont conservés dans `references/` et `scripts/` ; les fichiers du jeu sont dans `public/assets/`.

## Contrôles et accès

Ordinateur : **flèches/WASD**, **E** pour interagir/confirmer, **J/K** pour jab/direct, **P/Échap** pour le menu. Mobile paysage : **joypad, A/B et ☰ dans les marges**. Portrait : invitation à tourner, jeu en pause et appuis libérés. Le Terminal accepte la saisie habituelle avec Entrée ou Envoyer ; les autres menus gardent E/A et la souris/le tactile.

- Local : <http://127.0.0.1:5173/>
- Wi-Fi vérifié le 13 septembre : <http://192.168.50.123:5173/> (même réseau).
- Site : <https://mixmasterkd.github.io/BoxeurDeux-D/>.

Les sauvegardes appartiennent au navigateur et à l’adresse. Le format V5 migre les versions 1 à 4 sur la clé historique. Export/import conserve la possibilité de transférer une partie entre appareils. Le code du projet sur GitHub ne synchronise pas automatiquement les parties.

## Vérifications réellement effectuées

| Vérification | Résultat et preuve |
| --- | --- |
| Modèles et régressions | `npm test` : **425 tests réussis**, zéro échec ; carrière, migrations, paiements, jours, voyages, tournoi, marathon, combat, collisions, contacts et anciennes activités. |
| Compilation | `npm run build` réussi, 105 modules ; avertissement de taille du bundle Phaser conservé, sans erreur de compilation. |
| Marathon complet | Deux courses par entrées réelles : clavier et joypad CDP simulé 568 × 320 ; tous les virages, pause, altercation évitée, médaille et retour au métro du Stade. Aucun déplacement moteur forcé ni chrono accéléré. Rapports `outputs/verification/chapter-v5/marathon-{desktop,mobile}-results.json`. Portrait vérifié dans l’essai mobile. |
| Bagarre intégrée | Combat réellement joué jusqu’à une chute, retour à la position/repère/temps sauvegardés puis recharge ; aucune nouvelle rencontre ni récompense officielle. `marathon-fight-integration-results.json`. |
| Laptop | **19 contrôles PC/tactiles** : inscription, deux réservations, doubles clics, CLI, isolation normale/secours, sortie de test. Fenêtres 568 × 320, 844 × 390, portrait et réduction 568 × 200 simulant l’espace du clavier. Voir `LAPTOP_VERIFICATION.md`. |
| Métro/aéroport | **14 cas PC/tactiles** : cinq stations, carte, sens, portes, montée/sortie, pause, portrait, recharge, réservations et embarquement. Voir `METRO_ET_AEROPORT.md`. |
| Mexique/hôtel doré | **30 cas PC/tactiles**, avec vraies portes, sommeil, pads touchés, jabs contre Pablo/Danielo, retour inclus, salle/tableau et restaurant sans bonus. Voir `DESTINATIONS_V5.md`. |
| Combat complet | Bellini réellement joué sur trois rounds avec deux coins et cinq juges ; Danielo jusqu’au coin Octopus et round 2 ; gardes haute/basse, deux esquives extérieures, touches tête/corps et alignement des contacts Pablo/Danielo. Voir `COMBATS_CHAPITRE_V5.md`. |
| Menus d’activité | **16 cas**, plus huit pages du carnet : invitations/bilans, deux choix, pause/options et commandes adaptées. Quelques bilans sont des fixtures de présentation, explicitement distinguées des séances jouées. Voir `MENUS_ACTIVITES.md`. |
| Version compilée | **26 cas**, 159 ressources chargées sous `/BoxeurDeux-D/`, zéro erreur, aucun hook DEV : laptop, CLI, Mexique, pads, métro, restaurant et départ du marathon avec déplacement/pause, PC/tactile. Voir `CHAPITRE_V5_PRODUCTION_TESTS.md`. |

Les contextes navigateur de vérification utilisent des profils isolés préparés pour atteindre les lieux ; ils ne modifient pas la partie du navigateur de l’utilisateur. Les tests du modèle couvrent les trois journées complètes et l’attribution des médailles des tournois ; cette livraison ne prétend pas avoir gagné les trois nouveaux combats dorés au clavier. Les poses de décision ont aussi des fixtures visuelles identifiées comme telles.

**Aucun téléphone physique testé.** Le réseau de métro et les quatre secteurs sont une interprétation compacte de Montréal, pas une reproduction géographique du parcours réel de 42,195 km. Le marathon est volontairement court et sans jeu de cadence. L’équilibrage des nouveaux adversaires reste ajustable après les retours de jeu. Aucune installation, clé API, abonnement ou IA à distance n’est nécessaire pendant une partie.

## Publication

Vérifications locales terminées. Commits : `7a814ff` (ressources originales), `d82cdb0` (runtime, carrière et contrôles). Bundle final : `index-Dy1faqWr.js`, `index-B0HO_F6X.css`. Le résultat du déploiement et les contrôles du vrai site seront ajoutés après publication.
