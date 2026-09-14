# Laptop : vérification navigateur

Les menus ont été parcourus dans deux contextes Playwright isolés, avec une carrière de départ créée par l’API du profil de test puis chargée comme sauvegarde normale du navigateur de vérification. La sauvegarde du navigateur de l’utilisateur n’a pas été ouverte ni modifiée.

## Parcours réellement vérifié

- Bureau → Navigateur → Marathon : E/flèches sur ordinateur, joypad/A/B tactiles sur mobile. L’inscription prélève **100 $**, ne donne aucune prime et ne lance pas la course. Le bouton « Déjà inscrit » est désactivé ; revenir sur la page et confirmer ne prélève rien de plus.
- Réservations Cuba puis Mexique : **160 $ chacune**, libellé « Billet déjà réservé », bouton désactivé, aucune charge répétée et personnage toujours à la maison. Le trajet jusqu’à l’aéroport reste nécessaire.
- Terminal : saisie réelle, validation par Entrée, commande `liste`, lecture de la liste avec la molette et par glissement tactile. Taper WASD, P, E, J, K et utiliser les flèches dans le champ ne déplace pas le personnage.
- `test maison`, marche jusqu’au laptop, `argent 450`, puis `retour` : le solde normal revient à 80 $ ; la sauvegarde normale **et sa copie de secours restent identiques octet par octet**. Le mode de test n’est plus affiché après le retour.
- Retour au bureau par Échap ou B, y compris après utilisation du champ de saisie.

## Affichage et corrections

Le résultat du Terminal défile dans sa propre zone ; le champ de commande reste visible et ne passe plus sous les limites du menu. Une réponse sans changement de lieu conserve le focus de saisie. Le clavier du téléphone n’est pas ouvert automatiquement lors de l’entrée dans le Terminal.

Les boutons du Terminal ont des libellés courts. À moins de 240 px de hauteur disponible, les boutons A/B de ce menu se compactent dans les marges pour rester accessibles. Le retour depuis Cuba ou Mexique rejoint d’abord la page Voyages.

- Ordinateur : **1440 × 1000**, aucune commande tactile visible.
- Paysage mobile simulé : **568 × 320** et **844 × 390**.
- Espace réduit simulant la présence du clavier : **568 × 200**, champ et commandes A/B/menu accessibles, aucun débordement de page ou horizontal de menu.
- Portrait simulé : **390 × 844**, invitation à tourner le téléphone et monde en pause.
- Aucun test n’a été effectué sur un téléphone physique ni avec son clavier système réel.

## Résultats

```sh
LAPTOP_DEVICE=desktop node tests/laptop-browser.mjs
LAPTOP_DEVICE=mobile node tests/laptop-browser.mjs
```

**19 vérifications terminées**, aucune erreur JavaScript/console ni requête HTTP en erreur. Les rapports détaillés sont `laptop-desktop-browser-results.json` et `laptop-mobile-browser-results.json`. Les captures commencent par `laptop-`, notamment `laptop-terminal-commands-scrolled-desktop.png`, `laptop-terminal-list-mobile568.png` et `laptop-terminal-keyboard-mobile568x200.png`.
