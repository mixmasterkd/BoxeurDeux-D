# Tenues et poses de sparring

Ressources actuelles dans `public/assets/sprites/sparring-v2/` : **20 PNG RGBA** (dix poses par boxeur) et `fighters.json`. Le jeu ne requiert aucun service d’IA. Les versions précédentes restent disponibles dans le dossier parent.

Rémi porte un casque rouge et une tenue pétrole à liserés crème; le joueur, un casque et une tenue bleu marine à liserés or. Gants, peaux, visage de Rémi et identité d’origine sont conservés. Le décor validé n’a pas été modifié.

Les tenues et poses intermédiaires ont été créées avec **imagegen intégré**. Les prompts exacts sont dans `PROMPTS.md`. Sources et corrections de transparence sont conservées ici. `player-transitions-alpha-attempt.png` est un essai RGB écarté; il n’est jamais chargé par le jeu.

## Préparation reproductible

```sh
node scripts/prepare-sparring-v2.mjs
```

Le script utilise `scripts/sprite-png.mjs`, sans dépendance supplémentaire, pour décoder les PNG RGBA, découper les poses, conserver l’échelle anatomique, aligner les pieds et reporter les points des têtes/gants. Il supprime les résidus de détourage à alpha <=16, sans dessiner ni recolorer les personnages. Chaque sortie fait 384 × 640, ancre des pieds (192, 624), garde d’une hauteur de 512 pixels.

Les poses de bord coupées par la génération ne sont pas utilisées. Le jab de Rémi, le direct du joueur et sa demi-extension droite réutilisent une pose complète opposée via `mirror:true`; le rendu transforme aussi leurs points de contact. La tenue symétrique reste cohérente. Ces variantes sont intentionnelles et ne sont pas présentées comme des dessins distincts.

Le rendu affiche garde, préparation, demi-extension, extension au contact et retour. Il ne fait ni morphing ni fondu entre les silhouettes. Ces poses clés améliorent la lecture du mouvement; des dessins intermédiaires supplémentaires pourront encore affiner les appuis et les bras.
