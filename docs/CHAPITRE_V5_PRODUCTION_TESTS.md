# Vérification du build V5

Le 13 septembre 2026, `tests/chapter-v5-static-browser.mjs` a contrôlé la compilation sous `/BoxeurDeux-D/`, servie par interception navigateur depuis `dist/`. Aucun serveur supplémentaire, aucune publication et aucun accès à un hook de développement. Résultat : **26 cas réussis, 159 ressources chargées, aucune erreur JavaScript, console ou HTTP**.

Deux affichages ont été vérifiés : ordinateur 1280 × 900 et mobile paysage simulé 568 × 320, avec événements tactiles CDP. Le cadre reste 16:9; les commandes mobiles restent dans les marges et sont absentes sur ordinateur. Ces essais ne sont pas des essais sur téléphone physique.

Des sauvegardes isolées placent initialement le joueur près du laptop, d’Octopus, dans le métro ou devant la porte du restaurant. Les interactions suivantes utilisent le clavier, la souris ou les appuis tactiles :

- Laptop : `liste`, `argent 99` dans une sauvegarde de test, `retour`, puis `test mexique`. La carrière normale est restée identique; le séjour de test débouche sur la posada.
- Gym mexicain : interaction avec Octopus, entrée dans les pads, touche réelle comptée et retour au gym. Coût annoncé : 10 énergie.
- Métro : consultation du plan à cinq stations, retour au quai, montée physique dans le train et affichage du prochain arrêt pendant le trajet.
- Hôtel des Gants dorés : entrée par la porte du restaurant, pain choisi, grillé et garni. Aucun gain d’argent, d’énergie ou de compétence.
- Marathon : inscription de fixture au départ, puis invitation E/A, démarrage et déplacement réels. Chrono en progression, pause de 800 ms stable, chrono masqué derrière le menu et reprise. Les quatre directions du joueur et les 24 sprites de la foule sont chargés. Cette vérification de production reste un début de course; les parcours complets ont été testés séparément en développement.

Le rapport détaillé est `docs/chapter-v5-built-results.json`; les captures portent le préfixe `docs/chapter-v5-built-`. Le test du build a chargé `index-Dy1faqWr.js` et `index-B0HO_F6X.css`. Des reconstructions ultérieures peuvent changer ces empreintes.

Relancer localement après `npm run build` :

```sh
node tests/chapter-v5-static-browser.mjs
```

Contrôler une publication existante sans la modifier :

```sh
CHAPTER_PUBLIC_URL='https://mixmasterkd.github.io/BoxeurDeux-D/' node tests/chapter-v5-static-browser.mjs
```

Ce second mode écrit un rapport et des captures avec le préfixe `chapter-v5-public`. Il utilise ses propres contextes de navigateur et sauvegardes isolées.

## Vérification publique après déploiement

Le même parcours a ensuite été exécuté sur https://mixmasterkd.github.io/BoxeurDeux-D/, après publication du commit `1c1f200`. Résultat final : **26 cas réussis, 159 ressources HTTP chargées, zéro erreur**. Les bundles servis sont `index-Dy1faqWr.js` et `index-B0HO_F6X.css`. Le rapport est `docs/chapter-v5-public-results.json`; les captures portent le préfixe `chapter-v5-public-`.

Un premier passage avait rencontré un HTTP 503 temporaire sur une ancienne tenue (`boxing-burgundy/player-up-1.png`). Le fichier a ensuite répondu 200. La tentative a également révélé un appui automatisé trop précoce après la reprise du métro : le test attend maintenant le mode DOM `walking` avant de marcher. Aucun runtime n’a été changé. Cet essai initial est conservé séparément dans `docs/chapter-v5-public-initial-network-incident.json` et sa capture. La relance complète n’a rencontré aucune erreur; aucune erreur HTTP n’a été masquée ou retirée du rapport d’origine.
