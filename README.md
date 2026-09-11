# BoxeurDeux-D

Le jeu ouvre sur **une visite jouable du gym** : votre boxeur à tuque rouge se déplace dans une salle en pixel art, rejoint le **sac chorégraphié** ou rencontre Rémi pour le sparring libre et ses trois leçons. Le retour au gym conserve sa position pendant la partie.

Premier prototype jouable de sparring dans le gym validé, en JavaScript avec Phaser **4.2.1** et Vite **8.2.2**. Caméra fixe en 1280 × 720, Rémi le Tank de face et joueur de dos semi-transparent. Le décor original est conservé. Les deux boxeurs portent maintenant leur tenue de sparring : casque, débardeur, short et gants, dans leurs couleurs respectives.

Un round dure **60 secondes**. Essayez les frappes pendant les ouvertures, lisez les annonces de Rémi, défendez-vous et laissez revenir l'endurance. Il s'agit d'un entraînement : pas de KO ni de compétition officielle.

## Phase tenues et fluidité — 10 septembre 2026

Dix poses par boxeur : garde, jab/direct, préparations et demi-extensions, protection, réaction et esquive. Certaines variantes utilisent un miroir pour garder exactement la même identité. Les frappes passent par une préparation, une extension intermédiaire, le contact pendant 100 ms, puis un retour progressif. L’échelle des personnages reste constante; un cadrage fixe légèrement plus large garde les pieds visibles pendant les échanges rapprochés.

Le paysage mobile est conservé. Un ancien doigt resté sur Garde pendant une perte de focus ne peut plus activer accidentellement « Reprendre » au relâchement.

Le miroir, la speed ball et la corde sont repérables pendant la visite et présentent leur futur mini-jeu. Leurs exercices et l’énergie quotidienne restent à développer; voir `docs/PROCHAINES_ETAPES.md`. L’endurance du round reste indépendante de ce futur système.

## Commandes et cadrage dans tout le jeu

Sur ordinateur, **aucun bouton de jeu ni rappel permanent des touches** ne recouvre l’action; les raccourcis du pied de page sont également masqués. **P ou Échap → Commandes** ouvre l’aide depuis la pause, dans le gym, le sparring et le sac. Revenir de l’aide au menu ne reprend pas la partie.

Sur téléphone en paysage, les boutons occupent **deux bandes latérales hors de l’image du jeu**. La scène centrale garde exactement le même cadrage 1280 × 720 et les mêmes proportions 16:9 que sur ordinateur. Elle s’adapte à la largeur et à la hauteur restantes, sans être étirée ni coupée. Les bandes sont réservées aux pouces, y compris pour Pause et Son. En portrait, une invitation demande de tourner le téléphone et le jeu se met en pause.

La détection utilise le périphérique de pointage principal : un ordinateur à la souris reste sans boutons même si son navigateur annonce une capacité tactile. Une fenêtre verticale sur ordinateur reste jouable; l’invitation à tourner est réservée au tactile. Un changement de périphérique libère les commandes et met la partie en pause.

## Explorer le gym

La scène conserve **1280 × 720 et le même cadrage 16:9** sur ordinateur et téléphone en paysage. Sa taille d’affichage s’adapte aux deux dimensions de la fenêtre; le mobile ne révèle pas une autre portion de la salle.

- Marcher : **flèches**, **WASD** ou **ZQSD**; pavé directionnel tactile à gauche.
- Interagir : **E**, **Entrée**, ou bouton à droite quand vous êtes près de Rémi ou d’un atelier.
- Pause : **P**, **Échap**, ou bouton Pause. Échap ferme aussi une conversation.
- Sur ordinateur, ouvrir **Commandes** dans la pause pour consulter les raccourcis. Sur téléphone, le pavé directionnel et le bouton d’interaction se trouvent dans les bandes latérales.
- Rémi, près des marches à droite du ring, propose le sparring libre et ses trois leçons. La séance choisie s’ouvre sur son menu avant démarrage.
- Le sac ouvre une séance guidée de 45 secondes; son accueil explique l’exercice avant démarrage.
- **Retour au gym**, sur l’accueil d’une séance, en pause ou au bilan, permet de retrouver votre position. Le clavier et les contacts sont libérés à chaque changement de scène.

Les collisions empêchent de traverser le ring, le sac et les meubles. Le miroir, la speed ball et la corde présentent encore leurs futures activités. La porte présente la future sortie vers le quartier. Ni énergie quotidienne, ni progression sauvegardée, ni carte extérieure à cette étape.

Le personnage d’exploration porte une tuque rouge courte avec un petit motif noir, un débardeur bleu et blanc, un short noir et des chaussures bleues. Douze poses partagent une échelle et un point de contact au sol. Rémi a une pose d’accueil adaptée à la même vue; le sparring garde ses personnages et son décor validés. Le survêtement Adidas noir à bandes blanches est prévu pour l’extérieur.

## Le sac chorégraphié — 11 septembre 2026

Approchez-vous du sac dans le gym et interagissez pour ouvrir l’atelier. La séance dure **45 secondes** : observez les coups annoncés, puis frappez lorsque leur repère s’allume. Quatre enchaînements reviennent au fil de l’exercice : jab, double jab, jab–direct et jab–direct–crochet. Une pression déclenche un coup; maintenir une touche ne répète pas les frappes.

- **J** : jab gauche (main avant); **K** : direct droit (main arrière).
- Dans l’enchaînement annoncé **jab → direct → crochet**, les deux premiers coups réussis ouvrent une courte fenêtre : le troisième **J** déclenche alors le crochet. Hors de cette fenêtre, J reste un jab. Au tactile, le bouton Jab indique **Crochet** quand il est disponible.
- **P / Échap** : pause ou reprise; **Commandes** explique les mouvements depuis le menu.
- **M** : couper ou rétablir le son; le bouton tactile Son se trouve dans la marge.
- Le bilan donne les contacts, la précision et les enchaînements réussis, avec un conseil. Il permet de recommencer ou de revenir au même endroit dans le gym.

Le boxeur est en **garde de droitier : pied gauche devant, pied droit derrière**. Les nouvelles poses montrent le jab gauche, le direct droit avec pivot du pied droit arrière et le crochet gauche. Le gant, l’impact sonore et le balancement du sac correspondent au contact compté. Le boxeur garde sa tuque rouge et sa tenue bleue/blanche; six poses dessinées représentent la garde, les préparations et les trois frappes. Le sac et ses chaînes sont une ressource transparente séparée du nouveau décor. Ces images viennent de la génération intégrée; les sources et prompts du personnage corrigé sont conservés dans `references/characters/bag-orthodox/PROMPTS.md` (décor et sac dans le dossier `bag`). La fluidité pourra encore gagner des poses intermédiaires.

**Le crochet est actif uniquement au sac pour cette étape.** Le sparring conserve jab et direct; y reprendre le combo, puis ajouter éventuellement des frappes au corps, reste une suite à travailler. L’atelier du sac ne consomme pas encore d’énergie quotidienne et n’attribue pas de compétences persistantes.

## Leçons de Rémi et son

Le menu **Votre séance** propose le sparring libre et trois exercices guidés. Chaque exercice demande **trois répétitions réussies**, au rythme tranquille de Rémi, avec une limite de 60 secondes.

| Exercice | Réussite attendue |
| --- | --- |
| Placer son jab | Un jab dans chacune de trois ouvertures différentes. Rémi laisse travailler sans attaquer. |
| Bloquer et souffler | Bloquer un coup, relâcher la garde, puis récupérer 8 points d’endurance. |
| Esquiver et répondre | Esquiver du côté indiqué, puis toucher Rémi dans l’ouverture qui suit. |

Les conseils et la progression apparaissent à gauche pendant l’exercice. Le bilan propose une piste pour progresser, un nouvel essai ou la leçon suivante. **Choisir une séance**, en pause ou au bilan, ramène au menu et remet les compteurs à zéro. Les compétences et l’énergie quotidienne ne sont pas encore enregistrées.

La cloche, les impacts, les blocages, le souffle et les réussites ont des sons distincts, synthétisés localement avec Web Audio. Le son commence après une interaction et s’arrête en pause, en portrait ou lors d’une perte de focus. La touche **M** coupe le son sur ordinateur; le bouton tactile **Son / Muet** est dans la bande latérale. Le volume du sparring se règle au menu et en pause. Ces préférences sont mémorisées dans le navigateur lorsque son stockage est disponible. Le jeu reste utilisable sans audio. Aucune boucle d’ambiance n’est ajoutée à cette étape.

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
- Sur le même Wi-Fi : **http://192.168.50.123:5173/** (adresse vérifiée le 11 septembre 2026; elle peut changer).

Pour retrouver l'adresse Wi-Fi du PC : `ip -4 addr show wlp45s0`. Vite conserve `host: '0.0.0.0'` pour le réseau local. Aucun compte joueur, clé API ni service d'IA n'est nécessaire pendant une partie.

```sh
npm test         # Règles du sparring, du sac, déplacements et autres modèles
npm run build    # Compilation vers dist/
npm run test:browser # Parcours navigateur (Playwright local déjà disponible ici)
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
| Jab | J | Jab |
| Direct | K | Direct |
| Garde | Espace maintenu | Maintenir Garde |
| Esquive gauche | A ou ← | ← |
| Esquive droite | D ou → | → |
| Pause / reprendre | P ou Échap | Bouton Pause / Reprendre |
| Son / sourdine | M | Bouton Son / Muet |

Une pression déclenche une frappe ou une esquive; relâchez puis appuyez de nouveau pour la suivante. Une attaque engagée prend la priorité sur la garde. La garde revient ensuite si elle est encore maintenue. Le changement d'onglet, la perte de focus et le passage en portrait libèrent les commandes et mettent le round en pause.

**Téléphone : utilisez le paysage.** En portrait, une invitation demande de tourner l'appareil. La scène conserve ses proportions et s'adapte à la largeur et à la hauteur disponibles; les boutons restent dans les bandes latérales, hors de l’image, près des pouces. Aucune API de verrouillage d'orientation n'est nécessaire.

## Apprendre avec Rémi

- Rémi commence par laisser une ouverture. Sa garde et ses attaques suivent un calendrier indépendant de vos boutons.
- L'annonce ambrée indique le côté sûr. Attendez **« Esquivez »** après « Préparez » pour déclencher le mouvement. La fenêtre de protection dure 0,36 s, après 0,08 s de mouvement.
- Les marques dorées indiquent une touche, le bouclier bleu un blocage, et les traits verts une esquive. Le bilan distingue touches données/reçues, blocages et esquives réussies.
- Jab : 10 points d'endurance; direct : 17; esquive : 12. La garde coûte 7 points/s et un blocage 8 points supplémentaires. Au repos, récupération de 20 points/s après un court délai. Une garde épuisée ne protège plus : relâchez pour souffler.
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
- `references/characters/sparring-v2/` : sources, prompts et préparation des nouvelles tenues et poses; les premières sources restent dans le dossier parent.
- `tests/*.test.js` : règles, concordance des animations, objectifs des leçons et cycle de vie audio.
- `docs/VERIFICATIONS.md` : vérifications réellement effectuées et limites.

La ville, la maison, l'emploi, la carrière et les compétitions restent des étapes ultérieures. Aucun outil de dessin n'est requis pour jouer. LibreSprite pourra servir aux retouches et Tiled aux futures cartes. Un commit doit marquer chaque étape fonctionnelle vérifiée; son envoi sur GitHub reste distinct de l’enregistrement local.
