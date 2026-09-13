# Exploration continue, livraisons et métro

Vérifié localement dans Chromium automatisé avec clavier WASD et véritable injection d’événements tactiles CDP. Les fenêtres mobiles de 844 × 390 et 568 × 320 sont des simulations; aucun téléphone physique n’a été utilisé.

`tests/world-flow-browser.mjs` possède quatre parcours sélectionnables par `WORLD_FLOW_PART` :

- `world` : tournée complète aux trois secteurs (12, rue des Érables; 84, avenue du Gym; 210, promenade du Nord), paiement réel de 18–21 $, énergie débitée une fois de 30, reprise après rechargement avec deux colis livrés, vélo conservé lors des passages de rues, entrée et sortie des deux boutiques, métro aller-retour et exploration Des Rives. Desktop et mobile. Portrait : pause. Rapport `world-flow-world-browser-results.json`.
- `hotel` : chambre → couloir → ascenseur → RC → accueil → gym → RC → piscine → RC → salle → RC → ascenseur → chambre → rechargement. Les déplacements utilisent les portes; l’ascenseur ne propose pas de menu de destinations. Desktop et petit mobile, journée et tournoi conservés. Rapport `world-flow-hotel-browser-results.json`.
- `entrances` : sortie maison, aller-retour gym, entrée salle de boxe, sans aucune confirmation aux portes. Desktop et mobile, énergie inchangée. Rapport `world-flow-entrances-browser-results.json`.
- `metro` : validation ciblée du dernier escalier, quai → train → Des Rives → sortie → rechargement → train retour → quartier. Desktop et petit mobile; zéro coût, image au ratio 16:9, commandes dans les marges. Rapport `world-flow-metro-browser-results.json`.

Les huit cas passent sans erreur de page. Les parcours utilisent les commandes réelles et lisent les états de développement uniquement pour attendre les arrivées et vérifier les résultats; aucune position ni récompense n’est injectée pendant les trajets. L’hôtel utilise une sauvegarde de test qualifiée, séparée de la partie de l’utilisateur.

Les tests de modèles `exploration-world`, `district-world`, `hotel-world`, `chapter-career` et `world-door-travel` vérifient les passages, collisions, arrivées, dépenses, sauvegardes et anciennes tournées. Le nouveau contrôle de seuil refuse de voyager à l’arrivée, au chargement, sans direction volontaire ou pendant une pause, et ne se réarme qu’après avoir quitté le seuil.

Les scripts historiques qui supposaient trois maisons sur la même rue ou un menu d’ascenseur représentent l’ancienne navigation. Le parcours `world-flow-browser.mjs` remplace ces hypothèses pour la présente étape.

## Version compilée et sous-répertoire GitHub Pages

`node tests/harmonization-static-browser.mjs` vérifie `dist/` sous `/BoxeurDeux-D/` par interception réseau Playwright, sans nouveau serveur et sans les interfaces de développement. Les 32 contrôles passent sur ordinateur 1440 × 1000 et fenêtre mobile 568 × 320, avec 179 ressources chargées et aucune erreur de page, de console ou de réseau. Le rapport est `harmonization-static-results.json`.

Le parcours utilise E et WASD sur ordinateur, ainsi que les vrais événements tactiles du joypad et des boutons A/B sur mobile : contact correct et main incorrecte aux pads de Fredo, pause et reprise sans second coût, drill complet d’Octopus, achat du chandail à 45 $, équipement à la maison et rechargement, métro aller-retour, puis portes du RC vers gym, piscine et salle de combat. Les dialogues et le menu Commandes restent dans le cadrage; les boutons mobiles restent dans les marges; le portrait suspend le jeu. La police pixel est chargée depuis le site.

Les silhouettes sont mesurées dans les captures, par comparaison avec le décor : joueur du métro environ 101–105 pixels pour une ouverture de porte d’environ 126 pixels; au gym joueur environ 109 pixels, Fredo 101–104, Octopus 113–114, Rémi 117–118. Les quatre personnages sont visibles en entier. Ces mesures sont exprimées dans le repère logique 1280 × 720 et tolèrent l’arrondi des pixels du viewport mobile.

Les préparations utilisent des sauvegardes isolées; les interactions, touches et achats vérifiés produisent réellement leurs résultats. La navigation directe vers la maison du scénario d’équipement est une préparation d’emplacement explicitement séparée, et conserve l’inventaire et l’argent issus de l’achat précédent.

Le même script a ensuite été exécuté avec `SPARRING_URL=https://mixmasterkd.github.io/BoxeurDeux-D/`, après confirmation du bundle publié `index-P3OQdXPr.js` et du CSS `index-CZezE5qH.css`. Les 32 contrôles passent également sur le site public, avec 179 ressources et aucune erreur. Les rapports et captures restent distincts sous le préfixe `harmonization-static-public-`; le résultat complet est `harmonization-static-public-results.json`.
