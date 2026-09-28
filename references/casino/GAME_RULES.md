# Jeux du casino — règles et économie

Ces jeux utilisent exclusivement l’argent fictif de la carrière. L’entrée et les jeux ne consomment pas d’énergie. Le casino ouvre après une participation terminée aux Gants de bronze et le retour de l’hôtel; un forfait ne débloque pas l’accès. Le plafond devient 1 000 $, portefeuille et jetons additionnés.

## Comptabilité

Un jeton vaut 1 $. Les soldes acceptent les demi-dollars pour payer exactement le blackjack à 3:2. Les échanges ne créent aucun revenu. `totalBet`/`stake` représentent l’argent engagé; `payout` comprend la restitution de la mise. Le bénéfice vaut `payout - stake`. Seul un bénéfice positif augmente les revenus cumulés de carrière.

Avant chaque engagement, les règles vérifient la réserve nécessaire pour le meilleur gain possible. Un gain remporté n’est jamais tronqué au plafond. Pendant une main, les cartes, la mise, la graine et les actions sont sauvegardées; la reprise reconstruit exactement cette main. La caisse, la sortie et les autres activités attendent sa résolution.

## Blackjack

- Mise initiale entière de 1 à 5 $; un paquet de 52 cartes remélangé pour chaque partie.
- Karl reste sur 17, même avec un as compté comme 11.
- Blackjack naturel : retour de 2,5 fois la mise, soit un bénéfice de 3:2. Victoire ordinaire : retour de 2 fois la mise. Égalité : remboursement.
- Doubler sur les deux premières cartes; une seule carte supplémentaire.
- Une séparation en deux mains est permise pour deux cartes de même valeur, y compris deux figures différentes. Doubler après séparation est permis.
- Les as séparés reçoivent une seule carte. Un 21 après séparation est payé comme une victoire ordinaire.
- Engagement maximal et bénéfice maximal réservés : quatre fois la mise initiale, pour deux mains séparées puis doublées. Aucun crédit ni assurance.

## Roulette européenne

37 cases équiprobables, de 0 à 36. Chaque jeton coûte 1 $; cinq jetons maximum par tour, éventuellement sur plusieurs paris.

| Pari | Retour total si gagnant | Gain net pour 1 jeton |
| --- | ---: | ---: |
| Numéro | 36 | 35 |
| Rouge/noir, pair/impair | 2 | 1 |
| Douzaine, colonne | 3 | 2 |

Le zéro fait perdre les paris extérieurs. Chaque pari individuel a un retour moyen de `36/37`, soit environ 97,297 %. La réserve de gain est calculée en évaluant les 37 résultats possibles, donc tient compte des paris incompatibles. Cinq jetons sur un numéro peuvent produire 175 $ de bénéfice.

## Machines à sous

Chaque tour coûte 1 $. Les tableaux complets de lots et de probabilités sont visibles dans les règles de chaque machine. Un ticket uniforme parmi 10 000 possibilités choisit une combinaison pondérée; les rouleaux illustrent ce résultat. Les lots comprennent le retour de la mise.

| Machine | Lot maximal | Retour moyen | Tour perdant | Mise remboursée | Bénéfice positif |
| --- | ---: | ---: | ---: | ---: | ---: |
| Les Cerises | 25 $ | 91 % | 62 % | 19 % | 19 % |
| Les Cloches | 40 $ | 86 % | 72,5 % | 14 % | 13,5 % |
| Les Diamants | 50 $ | 92,5 % | 78 % | 11 % | 11 % |
| Nuit de Montréal | 30 $ | 88 % | 67 % | 18 % | 15 % |

Le retour moyen est calculé exactement par `somme(lot × poids) / 10000`; ce n’est ni une garantie par session ni une cible ajustée selon les résultats passés. Les tests parcourent les 10 000 tickets de chaque machine et vérifient chaque fréquence et chaque somme de paiement.

## Hold’em

Quatre sièges, caves de 10 ou 20 $, blinds de 1 et 2 $. Les trois adversaires ont leurs habitudes propres; leurs décisions utilisent leurs cartes et les informations publiques. Les pots secondaires et les éventuels jetons indivisibles sont répartis par le moteur. Aucun prélèvement : les 40 ou 80 jetons présents à la table sont conservés. En fin de main, la cave restante du joueur revient dans son solde de jetons. Son bénéfice maximal est de 30 ou 60 $.

## Hasard et vérification

Les flux pseudoaléatoires dépendent uniquement de graines enregistrées. Ni le portefeuille, ni l’historique des gains, ni le plafond ne modifient les cartes ou les résultats. Le plafond décide seulement si une mise peut commencer. La roulette et les machines utilisent un tirage entier avec rejet pour éviter le biais de modulo.

Les suites `tests/casino-games.test.js`, `tests/casino-poker.test.js` et `tests/casino-career.test.js` couvrent les règles, les distributions, les reprises, la conservation des mises, le paiement unique et le rejet des états falsifiés.
