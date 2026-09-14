# Sauvegarde et règles du chapitre V5

Le fichier normal reste sous `boxeur-deux-d-career-v1`, avec ses clés `-backup` et `-corrupt`. Les versions 1 à 4 sont migrées en conservant leur source en secours. Un ancien séjour à Cuba déjà payé demeure actif, à sa position actuelle. Les capacités et plafonds de progression ne changent pas.

## Voyages

`travelOffer(destination)` propose `cuba` ou `mexico` (160 $), après une participation achevée aux Gants de bronze et le retour à Montréal. `reserveTravel(destination)` débite une seule fois et crée `profile[destination].reserved`, sans déplacement. Les deux réservations peuvent coexister.

À l’aéroport seulement (`profile.location.scene === 'airport'`), `boardTravel(destination)` transforme la réservation en séjour actif et renvoie `location` vers le logement. L’embarquement ne coûte rien. Un seul séjour peut être actif. Tournée, tournoi ou marathon en cours interdisent l’embarquement.

`travelStatus(destination)` renvoie notamment `reserved`, `active`, `history`, `canBoard`, `canLeave`, `canFight` et `opponent`. `leaveTravel(destination)` archive le séjour et renvoie à l’aéroport de Montréal, gratuitement. `sleep()` utilise le logement de la destination active et ne rend que l’énergie quotidienne.

Les alias `cubaOffer`, `startCuba`, `cubaStatus`, `leaveCuba` restent présents, avec leurs équivalents `mexicoOffer`, `startMexico`, `mexicoStatus`, `leaveMexico`. **`startCuba` et `startMexico` réservent désormais, sans téléportation.**

## Marathon de Montréal

`marathonOffer()` annonce l’inscription à 100 $. `registerMarathon()` paie une participation et conserve la position du joueur. L’inscription reste en attente (`registered`) jusqu’à `startMarathon()` sur `marathon-island`.

Une course en état `running` progresse par `recordMarathonProgress({ elapsed, checkpoint })` : temps absolu en secondes, point `{scene,x,y,facing}`. Le paramètre `routePoint` conserve le numéro du point de passage dans le secteur (entier 0 à 50, monotone). Il repart à 0 dans le secteur suivant; une ancienne participation V5 sans ce champ reçoit 0. Les étapes suivent `marathon-island`, `marathon-downtown`, `marathon-oldport`, `marathon-stadium`. Le temps ne recule jamais; on ne saute pas d’étape. La scène peut interroger `marathonStatus()`.

À la rencontre facultative, `encounterMarathon('avoid')` la consomme et continue. `encounterMarathon('fight')` sauvegarde le point et passe en état `encounter`. `resolveMarathonEncounter({won:true|false})` reprend exactement à ce point, sans récompense ni historique de combat officiel. Cette rencontre ne se représente pas après une recharge. Le chronomètre de la course est en pause pendant la bagarre; il faut omettre `elapsed` au retour du combat (s’il est fourni, il s’agit du temps absolu de la course).

`finishMarathon({elapsed})` nécessite le dernier secteur du parcours et archive l’arrivée. Le portefeuille reste inchangé. La première arrivée donne une unique médaille `{event:'montreal',runId,day}`; les suivantes peuvent seulement améliorer `bestTime`. `abandonMarathon()` archive la participation sans remboursement ni récompense. Les lieux demeurent visitables sans inscription.

La course commencée interdit les autres activités, les voyages, le sommeil et les combats officiels. Une simple inscription en attente n’empêche pas de continuer sa journée.

## Gants dorés

`canStartTournament('gold')` et `startTournament('gold')` utilisent le même séjour et les mêmes transactions que les Gants de bronze. L’entrée coûte 240 $, après un retour des Gants de bronze et les victoires sur Dyrex, Le Feu, Louisto et Danielo. Aucun marathon n’est requis.

`tournamentStatus()` ajoute `tier`, `label`, `judges:5`, `opponents` et les participants adaptés. Les trois adversaires sont `gold-rios`, `gold-moreau`, `gold-santos`. L’état actif conserve `tier:'gold'`, comme l’archive et la médaille. Les anciens identifiants de rencontre `id:jour` restent uniques, sans duplication des récompenses. Les appels sans niveau restent compatibles avec le bronze.

## Terminal et profil de test

Le terminal ne lance jamais de commande système. `applyTestCommand('liste')` (ou `aide`) retourne une liste `{command,description}` en lecture seule. Les commandes de mutation activent un profil distinct sous `boxeur-deux-d-career-v1-test` et ses propres clés de secours. Le singleton `careerProfile` garde la même identité pour toutes les scènes.

- `test maison`, `test gym` : accès direct.
- `test cuba`, `test mexique` : séjour payé dans le profil de test.
- `test aeroport` : aéroport avec les deux réservations.
- `test marathon` : inscription et position sur l’île, avant le départ.
- `test bronze` / `test hotel` : jour 1 du bronze.
- `test dore` : jour 1 des Gants dorés, avec les prérequis dans le profil de test.
- `combat beton`, `combat kramer`, `combat dyrex`, `combat feu`, `combat louisto`, `combat danielo` : renvoie aussi `opponent` pour ouvrir la scène de combat.
- `argent 500`, `energie 100` : valeurs limitées aux plafonds du profil de test.
- `retour` : restaure le profil normal en mémoire sans écrire ni son fichier ni sa copie de secours.

Les commandes de déplacement renvoient `location`; l’interface doit ouvrir la scène correspondante. `testStatus().active` permet d’annoncer le mode de test. `enterTestProfile()` et `leaveTestProfile()` sont également publics. Un redémarrage normal charge toujours la carrière normale; le test reste récupérable par le terminal.

## Vérification

`node --test tests/career-profile.test.js tests/career-days.test.js tests/chapter-career.test.js tests/next-chapter-career.test.js tests/travel-marathon-career.test.js` vérifie les migrations, paiements et reçus, la progression des deux tournois, la répétition du marathon, sa rencontre et la séparation stricte des deux sauvegardes, y compris quand le stockage est refusé.
