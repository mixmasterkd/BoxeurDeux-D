# Reprise dans Codex pour VS Code — BoxeurDeux-D

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
