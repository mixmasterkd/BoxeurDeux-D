# La petite île du casino — 28 septembre 2026

Le casino occupe désormais un secteur distinct à l’ouest de l’île existante, entouré d’eau et relié par un petit pont. C’est la correction géographique demandée après la première livraison. La façade du casino et ses trois étages sont conservés.

## Trajet

Depuis la sortie du métro de l’Île Sainte-Hélène, suivre le chemin vers la gauche, sous le bâtiment du métro. Au bord de la carte, le passage rejoint le petit pont à l’est de la nouvelle île. Traverser le pont, puis rejoindre l’entrée sur le parvis. La sortie du casino ramène devant sa porte; le pont permet de retourner au métro.

La promenade extérieure est accessible avant les Gants de bronze; la porte du casino garde le déblocage existant. Une course active conserve son parcours et doit être terminée ou quittée avant cette visite. Le déplacement n’ajoute aucun coût, aucune récompense et aucune règle de jeu.

## Décor et sauvegarde

Nouvelle image : [public/assets/casino/island.png](../public/assets/casino/island.png), générée avec l’outil ImageGen intégré. [Prompt exact et notes](../references/casino/ISLAND_PROMPT.md); source conservée dans `references/casino/island-source.png`. La façade existante est ajoutée par la scène. Les limites de déplacement suivent les sols et le tablier réellement dessinés.

Le nouveau lieu est `casino-island`, distinct des trois salles intérieures. Les sauvegardes conservent la position sur la nouvelle carte; les sauvegardes existantes dans le parc ou le casino restent utilisables. Une main engagée se reprend à sa table.

## Vérifications

**507 tests automatisés réussis**, puis compilation Vite réussie. Le parcours du nouveau secteur passe en développement et sur la version compilée : **4 scénarios dans chaque environnement**, couvrant le déblocage Bronze et l’aller-retour complet sur ordinateur 1440 × 1000 et mobile tactile simulé 568 × 320.

Les contrôles vérifient le passage à gauche du métro, le pont et ses deux limites vers l’eau, l’entrée et la sortie du casino, la reprise exacte après rechargement dehors et dedans, le retour au métro et la conservation de toute la carrière. Le parcours existant des trois étages passe aussi ses **6 contrôles** après adaptation du trajet extérieur. Aucun signalement JavaScript, ressource manquante ou avertissement navigateur dans les rapports finaux.

Rapports et captures : `outputs/verification/casino-island/{dev,built}/`; **18 captures** sur le bundle final. La caméra montre le toit et les drapeaux depuis le parvis. Les essais mobiles sont simulés, aucun téléphone physique n’a été utilisé.

Bundle final : `index-BBuh_9JZ.js` et `index-BilBeM5G.css`. L’avertissement Vite de taille du bundle Phaser reste celui du projet.

## Publication

La correction est **publiée et vérifiée le 28 septembre 2026** sur [le jeu public](https://mixmasterkd.github.io/BoxeurDeux-D/). Commit d’implémentation : `1219f34`. Le [workflow GitHub Pages 36430365523](https://github.com/mixmasterkd/BoxeurDeux-D/actions/runs/36430365523) a réussi.

L’index, les deux bundles et les dix-huit visuels du casino — **21 fichiers** — sont identiques à la compilation locale par SHA-256. Les **4 scénarios sur le vrai site public** passent : verrou Bronze et aller-retour complet, ordinateur et tactile simulé. Les rechargements conservent la position et la carrière; le pont bloque l’accès à l’eau. Aucune erreur, aucun avertissement navigateur et aucun incident réseau pendant ce passage.

Les rapports, les empreintes, la preuve du déploiement et les **18 captures publiques** sont dans `outputs/verification/casino-island/public/`. Les commits suivants consignent seulement ces preuves et la documentation. Aucun téléphone physique n’a été testé.
