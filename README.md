# BoxeurDeux-D

Premier prototype jouable de sparring dans le gym validé, en JavaScript avec Phaser **4.2.1** et Vite **8.2.2**. Caméra fixe en 1280 × 720, Rémi le Tank de face et joueur de dos semi-transparent. Le décor original est conservé. Les deux boxeurs portent maintenant leur tenue de sparring : casque, débardeur, short et gants, dans leurs couleurs respectives.

Un round dure **60 secondes**. Essayez les frappes pendant les ouvertures, lisez les annonces de Rémi, défendez-vous et laissez revenir l'endurance. Il s'agit d'un entraînement : pas de KO ni de compétition officielle.

## Phase tenues et fluidité — 10 septembre 2026

Dix poses par boxeur : garde, jab/direct, préparations et demi-extensions, protection, réaction et esquive. Certaines variantes utilisent un miroir pour garder exactement la même identité. Les frappes passent par une préparation, une extension intermédiaire, le contact pendant 100 ms, puis un retour progressif. L’échelle des personnages reste constante; un cadrage fixe légèrement plus large garde les pieds visibles pendant les échanges rapprochés.

Le paysage mobile est conservé. Un ancien doigt resté sur Garde pendant une perte de focus ne peut plus activer accidentellement « Reprendre » au relâchement.

Les ateliers du futur gym et l’énergie quotidienne sont consignés dans `docs/PROCHAINES_ETAPES.md`; ils ne font pas partie du jeu actuel. L’endurance du round reste indépendante de ce futur système.

## Lancer

Node.js 24 conseillé (`nvm use` si disponible). Depuis ce dossier dans VS Code :

```sh
npm run dev
```

Les dépendances sont déjà installées. Si nécessaire, `npm ci` réinstalle les versions verrouillées. **Si le serveur tourne déjà, réutilisez-le.** Vite écoute sur le port strict 5173 : ne lancez pas de serveur concurrent et ne changez pas de port pour contourner le serveur existant.

- Sur cet ordinateur : **http://127.0.0.1:5173/**
- Accès explicite par l’index : **http://127.0.0.1:5173/index.html** (même sparring).
- Sur le même Wi-Fi : **http://192.168.50.123:5173/** (adresse vérifiée le 10 septembre 2026; elle peut changer).

Pour retrouver l'adresse Wi-Fi du PC : `ip -4 addr show wlp45s0`. Vite conserve `host: '0.0.0.0'` pour le réseau local. Aucun hébergement distant, compte, clé API ni service d'IA n'est utilisé pendant une partie.

```sh
npm test         # Vérifications déterministes des règles de sparring
npm run build    # Compilation vers dist/
npm run test:browser # Parcours navigateur (Playwright local déjà disponible ici)
npm run preview  # Prévisualisation locale de dist/ sur le port strict 4173
```

`index.html` à la racine est l’entrée de développement Vite. Pour un hébergement web statique, `npm run build` produit l’index prêt à servir dans `dist/index.html`; il faut transférer tout le contenu de `dist/`, avec ses ressources. Ouvrir le fichier source directement depuis le disque ou afficher son code sur GitHub ne lance pas le jeu.

## Commandes

| Action | Clavier | Tactile |
| --- | --- | --- |
| Jab | J | Jab |
| Direct | K | Direct |
| Garde | Espace maintenu | Maintenir Garde |
| Esquive gauche | A ou ← | ← |
| Esquive droite | D ou → | → |
| Pause / reprendre | P ou Échap | Bouton Pause / Reprendre |

Une pression déclenche une frappe ou une esquive; relâchez puis appuyez de nouveau pour la suivante. Une attaque engagée prend la priorité sur la garde. La garde revient ensuite si elle est encore maintenue. Le changement d'onglet, la perte de focus et le passage en portrait libèrent les commandes et mettent le round en pause.

**Téléphone : utilisez le paysage.** En portrait, une invitation demande de tourner l'appareil. La scène conserve ses proportions et s'adapte à la largeur et à la hauteur disponibles; les boutons restent sur les côtés, près des pouces. Aucune API de verrouillage d'orientation n'est nécessaire.

## Apprendre avec Rémi

- Rémi commence par laisser une ouverture. Sa garde et ses attaques suivent un calendrier indépendant de vos boutons.
- L'annonce ambrée indique le côté sûr. Attendez **« Esquivez »** après « Préparez » pour déclencher le mouvement. La fenêtre de protection dure 0,36 s, après 0,08 s de mouvement.
- Les marques dorées indiquent une touche, le bouclier bleu un blocage, et les traits verts une esquive. Le bilan distingue touches données/reçues, blocages et esquives réussies.
- Jab : 10 points d'endurance; direct : 17; esquive : 12. La garde coûte 7 points/s et un blocage 8 points supplémentaires. Au repos, récupération de 20 points/s après un court délai. Une garde épuisée ne protège plus : relâchez pour souffler.
- Les réglages accessibles avant le round et en pause proposent trois rythmes de Rémi et deux vitesses de récupération. Une annonce déjà commencée conserve sa durée pour rester prévisible.
- Le bilan de fin permet de recommencer un round avec des statistiques remises à zéro.

## Fichiers utiles

- `src/main.js` : démarrage et mise à l'échelle Phaser.
- `src/scenes/SparringScene.js` : scène et synchronisation des effets avec les touches.
- `src/scenes/FighterView.js` et `src/game/FighterMotion.js` : affichage, poses et mouvements synchronisés avec le combat.
- `src/game/SparringSession.js` : chronomètre, états, règles et rythme de Rémi, sans dépendance au rendu.
- `src/ui/SparringUI.js`, `src/style.css`, `index.html` : interface, clavier, tactile et orientation.
- `public/assets/backgrounds/gym.png` : décor validé, inchangé.
- `public/assets/sprites/sparring-v2/` : 20 PNG transparents et leurs coordonnées utilisés localement. Les premières ressources sont conservées dans le dossier parent.
- `references/characters/sparring-v2/` : sources, prompts et préparation des nouvelles tenues et poses; les premières sources restent dans le dossier parent.
- `tests/sparring.test.js` et `tests/fighter-motion.test.js` : 19 tests des règles et de la concordance des animations.
- `docs/VERIFICATIONS.md` : vérifications réellement effectuées et limites.

La ville, la maison, l'emploi, la carrière et les compétitions restent des étapes ultérieures. Aucun outil de dessin n'est requis pour jouer. LibreSprite pourra servir aux retouches et Tiled aux futures cartes. Le dépôt Git reste local.
