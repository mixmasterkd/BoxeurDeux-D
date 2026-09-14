# Menus des activités

Les invitations et les bilans ont deux choix : commencer/rejouer, ou revenir au lieu. Cette convention couvre le sparring, le sac, le shadow, la corde, la speed ball, les pads et la piscine.

- Sur ordinateur : **P ou Échap** ouvre les options avant/après la séance. WASD/flèches choisit, **E** valide. La souris fonctionne aussi.
- Sur mobile : **☰** ouvre les options; le joypad choisit, **A** valide, **B** revient. Le bouton de retour au lieu reste dans la marge.
- Pendant la séance, P/Échap/☰ met en pause. Commandes, Carnet, son et réglages restent accessibles depuis la pause.
- Les leçons de Rémi restent choisissables dans les options avant le sparring, ainsi que depuis le gym. Consulter ces menus ne consomme pas d’énergie.
- Un profil de test affiche discrètement **MODE TEST**. « Quitter le mode test » dans la pause ou les options restaure la carrière normale et rejoint son lieu sauvegardé. Le simple affichage des menus n’active jamais ce mode.

## Vérifications

`node tests/activity-options-browser.mjs` : 16 parcours PC 1280×720 et mobile simulé 568×320, sept activités plus sortie du profil test pour chaque format. Navigation, démarrage, pause, commandes, carnet et relance utilisent réellement les touches ou appuis tactiles. Pour examiner les sept bilans rapidement, les activités chronométrées sont avancées par leur méthode publique de simulation; le shadow est terminé par son bouton de pause. Aucun essai sur téléphone physique n’est revendiqué.

`JOURNAL_VARIANT=small-mobile node tests/career-journal-browser.mjs` : huit parcours supplémentaires, changement de page et véritable balayage tactile du carnet, puis retour à la pause sans reprendre la séance.

Les fenêtres restent dans la caméra 16:9, sans défilement de la page; les commandes tactiles restent dans les marges et sont absentes sur ordinateur. Les colonnes internes défilent si le contenu dépasse. Une fixture de redémarrage de scène vérifie également qu’un ancien volet d’options ne réapparaît pas au retour dans l’activité.

Rapport : `activity-options-browser-results.json`. Captures des bilans : `activity-options-sparring-mobile568.png`, `activity-options-rope-mobile568.png`, `activity-options-pool-mobile568.png` et variantes ordinateur.
