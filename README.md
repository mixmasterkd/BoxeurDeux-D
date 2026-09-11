# BoxeurDeux-D

Le jeu ouvre sur **une visite jouable du gym** : votre boxeur à tuque rouge se déplace dans une salle en pixel art, rejoint le **sac chorégraphié**, pratique le **shadow boxing au miroir** ou rencontre Rémi pour le sparring libre, ses trois leçons et la séance **Résistance et relevés**. Le retour au gym conserve sa position pendant la partie.

Premier prototype jouable de sparring dans le gym validé, en JavaScript avec Phaser **4.2.1** et Vite **8.2.2**. Caméra fixe en 1280 × 720, Rémi le Tank de face et joueur de dos semi-transparent. Le décor original est conservé. Les deux boxeurs portent maintenant leur tenue de sparring : casque, débardeur, short et gants, dans leurs couleurs respectives.

Un round dure **60 secondes**. Essayez les frappes pendant les ouvertures, lisez les annonces de Rémi, défendez-vous et laissez revenir l'endurance. Rémi reste un partenaire d’entraînement. La séance **Résistance et relevés** ajoute les chutes et le compte de dix; le sparring classique et les trois leçons restent disponibles séparément.

## Résistance et relevés — étape 1

Approchez Rémi puis **E / A → Résistance et relevés · 3 rounds**. La séance est aussi proposée dans **Votre séance** à l’accueil du ring, ou directement par `?scene=sparring&lesson=resistance`. Elle dure jusqu’à **trois rounds de 60 secondes**, avec un arrêt volontaire entre les rounds et la possibilité de recommencer toute la séance.

- **Endurance** : la jauge existante paie les frappes, les gardes et les esquives; elle remonte pendant les moments de repos. La vider ne provoque pas une chute.
- **Résistance** : une jauge de 100 pour chaque boxeur. Seules les touches nettes la font descendre : jab 12, direct 18, crochet 22. Une garde à la bonne hauteur ou une esquive réussie évite cette perte. Ces valeurs sont des réglages de prototype regroupés dans `KNOCKDOWN_RULES`.
- **Au tapis** : à zéro résistance, le gant termine son véritable contact, puis le boxeur chute. Le temps du round s’arrête pendant le décompte et le relevé. Les deux touches d’attaque servent alors à se relever, pas à frapper un boxeur au sol.
- **Se relever** : six pressions alternées **J → K → J → K → J → K**, ou **A → B → A → B → A → B** sur téléphone. Commencez par J/A et suivez le repère; au moins 0,35 s entre les efforts acceptés. Maintenir une touche ou marteler ne répète pas les efforts. Pas de pénalité cachée pour une pression trop tôt.
- **Compte de dix** : le compteur suit les secondes actives; à dix sans relevé, la séance se termine par KO. Rémi reprend ses appuis au compte de 6, 8 ou 9 selon ses chutes dans la séance. Ses décisions ne lisent pas les boutons du joueur.
- **Limites** : troisième chute dans un round ou quatrième dans l’ensemble de la séance = arrêt, sans nouvel essai de relevé. Les échanges simultanés sont résolus équitablement, y compris une double chute. Un coup arrivé à la cloche est compté avant la fin du round.
- **Après un relevé** : résistance rendue de 55, puis 45, puis 35 selon le nombre total de chutes; endurance du joueur ramenée à 60. Rémi laisse ensuite une ouverture. Au round suivant : endurance pleine, +20 de résistance dans la limite de 100; les chutes du round repartent à zéro, le total est conservé.
- **Pause et sortie** : **P / Échap / ☰** arrête aussi le décompte; portrait, perte de focus et changement de périphérique libèrent les appuis et demandent une reprise explicite. **← Gym** reste direct. La pause permet d’ouvrir Commandes ou de recommencer toute la séance.

Au terme des trois rounds, le bilan indique les touches, défenses, combos et chutes. Ce mode reste une séance avec Rémi, sans classement officiel. Le KO immédiat spécial, le premier adversaire, la progression sauvegardée et les journées appartiennent aux étapes suivantes.

## Phase tenues et fluidité — 10 septembre 2026

La base comprend dix poses par boxeur : garde, jab/direct, préparations et demi-extensions, protection, réaction et esquive. Trois poses de crochet complètent maintenant celles du joueur. Certaines variantes de jab/direct utilisent un miroir pour garder exactement la même identité. Les frappes passent par une préparation, une pose intermédiaire, le contact pendant 100 ms, puis un retour progressif. L’échelle des personnages reste constante; un cadrage fixe légèrement plus large garde les pieds visibles pendant les échanges rapprochés.

Le paysage mobile est conservé. Un ancien doigt resté sur Garde pendant une perte de focus ne peut plus activer accidentellement « Reprendre » au relâchement.

La speed ball et la corde présentent encore leur futur mini-jeu. Leurs exercices et l’énergie quotidienne restent à développer; voir `docs/PROCHAINES_ETAPES.md`. L’endurance du round reste indépendante de ce futur système.

## Commandes et cadrage dans tout le jeu

Sur ordinateur, **aucun bouton de jeu ni rappel permanent des touches** ne recouvre l’action; les raccourcis du pied de page sont également masqués. **P ou Échap → Commandes** ouvre l’aide depuis la pause, dans le gym, le sparring, le sac et au miroir. Revenir de l’aide au menu ne reprend pas la partie.

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
- **← Gym**, toujours accessible dans la bordure d’une activité, ramène directement à votre position; cette sortie reste aussi dans les menus. Le clavier et les contacts sont libérés à chaque changement de scène.

Les collisions empêchent de traverser le ring, le sac et les meubles. La speed ball et la corde présentent encore leurs futures activités. La porte présente la future sortie vers le quartier. Ni énergie quotidienne, ni progression sauvegardée, ni carte extérieure à cette étape.

Le personnage d’exploration porte une tuque rouge courte avec un petit motif noir, un débardeur bleu et blanc, un short noir et des chaussures bleues. Douze poses partagent une échelle et un point de contact au sol. Rémi a une pose d’accueil adaptée à la même vue; le sparring garde ses personnages et son décor validés. Le survêtement Adidas noir à bandes blanches est prévu pour l’extérieur.

## Le sac chorégraphié — 11 septembre 2026

Approchez-vous du sac dans le gym et interagissez pour ouvrir l’atelier. La séance dure **45 secondes** : observez les coups annoncés, puis frappez lorsque leur repère s’allume. Cinq enchaînements reviennent au fil de l’exercice : jab, double jab, jab–direct, jab–direct–crochet et jab–direct–crochet au corps. Une pression déclenche un coup; maintenir une touche ne répète pas les frappes.

- **J** : jab gauche (main avant); **K** : direct droit (main arrière).
- Dans l’enchaînement annoncé **jab → direct → crochet**, les deux premiers coups réussis ouvrent une courte fenêtre : le troisième **J** déclenche alors le crochet. Hors de cette fenêtre, J reste un jab. Au tactile, **A** reste A et son sous-titre indique **Crochet** quand il est disponible.
- **P / Échap** : pause ou reprise; **Commandes** explique les mouvements depuis le menu.
- **M** : couper ou rétablir le son; le bouton tactile Son se trouve dans le menu pause.
- Le bilan donne les contacts, la précision et les enchaînements réussis, avec un conseil. Il permet de recommencer ou de revenir au même endroit dans le gym.

Le boxeur est en **garde de droitier : pied gauche devant, pied droit derrière**. Les nouvelles poses montrent le jab gauche, le direct droit avec pivot du pied droit arrière et le crochet gauche. Le gant, l’impact sonore et le balancement du sac correspondent au contact compté. Le boxeur garde sa tuque rouge et sa tenue bleue/blanche; six poses dessinées représentent la garde, les préparations et les trois frappes. Le sac et ses chaînes sont une ressource transparente séparée du nouveau décor. Ces images viennent de la génération intégrée; les sources et prompts du personnage corrigé sont conservés dans `references/characters/bag-orthodox/PROMPTS.md` (décor et sac dans le dossier `bag`). La fluidité pourra encore gagner des poses intermédiaires.

Le même enchaînement est maintenant disponible en **sparring libre**, avec les règles ci-dessous. L’atelier du sac ne consomme pas encore d’énergie quotidienne et n’attribue pas de compétences persistantes.

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

Les conseils et la progression apparaissent à gauche pendant l’exercice. Le bilan propose une piste pour progresser, un nouvel essai ou la leçon suivante. **Choisir une séance**, en pause ou au bilan, ramène au menu et remet les compteurs à zéro. Les compétences et l’énergie quotidienne ne sont pas encore enregistrées.

La cloche, les impacts, les blocages, le souffle et les réussites ont des sons distincts, synthétisés localement avec Web Audio. Le son commence après une interaction et s’arrête en pause, en portrait ou lors d’une perte de focus. La touche **M** coupe le son sur ordinateur; le bouton tactile **Son / Muet** est dans le menu pause. Le volume du sparring se règle au menu et en pause. Ces préférences sont mémorisées dans le navigateur lorsque son stockage est disponible. Le jeu reste utilisable sans audio. Aucune boucle d’ambiance n’est ajoutée à cette étape.

## Lancer

Node.js 24 conseillé (`nvm use` si disponible). Depuis ce dossier dans VS Code :

```sh
npm run dev
```

Les dépendances sont déjà installées. Si nécessaire, `npm ci` réinstalle les versions verrouillées. **Si le serveur tourne déjà, réutilisez-le.** Vite écoute sur le port strict 5173 : ne lancez pas de serveur concurrent et ne changez pas de port pour contourner le serveur existant.

- Sur cet ordinateur : **http://127.0.0.1:5173/**
- Accès explicite par l’index : **http://127.0.0.1:5173/index.html** (même gym).
- Accès direct au sparring : **http://127.0.0.1:5173/?scene=sparring**. Ce raccourci fonctionne aussi sur le site publié.
- Accès direct au sac : **http://127.0.0.1:5173/?scene=bag**.
- Accès direct au miroir : **http://127.0.0.1:5173/?scene=shadow**. Fonctionne aussi sur GitHub Pages.
- Sur le même Wi-Fi : **http://192.168.50.123:5173/** (adresse vérifiée le 11 septembre 2026; elle peut changer).

Pour retrouver l'adresse Wi-Fi du PC : `ip -4 addr show wlp45s0`. Vite conserve `host: '0.0.0.0'` pour le réseau local. Aucun compte joueur, clé API ni service d'IA n'est nécessaire pendant une partie.

```sh
npm test         # Règles du sparring, du sac, déplacements et autres modèles
npm run build    # Compilation vers dist/
npm run test:knockdown # Résistance, chutes, relevés clavier/tactile et transitions de rounds
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

Une pression déclenche une frappe ou une esquive; relâchez puis appuyez de nouveau pour la suivante. Les directions acceptent flèches, WASD et ZQSD. Espace n’est plus une commande de garde. Une attaque engagée prend la priorité sur la garde. La garde revient ensuite si elle est encore maintenue. Le changement d'onglet, la perte de focus et le passage en portrait libèrent les commandes et mettent le round en pause.

**Téléphone : utilisez le paysage.** En portrait, une invitation demande de tourner l'appareil. La scène conserve ses proportions et s'adapte à la largeur et à la hauteur disponibles; les boutons restent dans les bandes latérales, hors de l’image, près des pouces. Aucune API de verrouillage d'orientation n'est nécessaire.

## Apprendre avec Rémi

- Rémi commence par laisser une ouverture. Sa garde et ses attaques suivent un calendrier indépendant de vos boutons.
- L’annonce ambrée distingue **TÊTE · GARDE HAUTE** et **CORPS · GARDE BASSE**. Rémi garde une hauteur annoncée jusqu’au contact. La garde ne protège que la bonne hauteur; frapper l’ouvre temporairement. Dans la leçon de riposte, « Préparez / Esquivez » indique le côté sûr. La fenêtre de protection dure 0,36 s, après 0,08 s de mouvement.
- Les marques dorées indiquent une touche, le bouclier bleu un blocage, et les traits verts une esquive. Le bilan distingue touches données/reçues, blocages et esquives réussies.
- Jab : 10 points d'endurance; direct : 17; crochet : 21; esquive : 12. La garde coûte 7 points/s et un blocage 8 points supplémentaires. Au repos, récupération de 20 points/s après un court délai. Une garde épuisée ne protège plus : relâchez pour souffler.
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
- `references/characters/sparring-v2/` : sources, prompts et préparation des nouvelles tenues et poses; les premières sources restent dans le dossier parent.
- `tests/*.test.js` : règles, concordance des animations, objectifs des leçons et cycle de vie audio.
- `docs/VERIFICATIONS.md` : vérifications réellement effectuées et limites.

La ville, la maison, l'emploi, la carrière et les compétitions restent des étapes ultérieures. Aucun outil de dessin n'est requis pour jouer. LibreSprite pourra servir aux retouches et Tiled aux futures cartes. Un commit doit marquer chaque étape fonctionnelle vérifiée; son envoi sur GitHub reste distinct de l’enregistrement local.

## Convention commune et extension des lieux

`src/ui/GameControls.js` centralise le joypad, A/B, les directions clavier et la navigation des menus. Une nouvelle activité ou un futur lieu réutilise cet adaptateur : E/A interagit, Entrée/A valide, Échap/B revient. Les interfaces propres aux ateliers conservent leurs réglages et leurs bilans. `npm run test:controls` vérifie la convention dans les quatre scènes avec de vraies entrées clavier et tactiles simulées. Les poses corps/basse garde sont conservées dans `public/assets/sprites/body-training/`, avec leurs sources et prompts dans `references/characters/body-training/`.
