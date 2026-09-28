# Musique originale rétro 16 bits

La demande du 28 septembre 2026 porte sur une petite bande-son avec un thème par lieu. Douze compositions instrumentales de 16 mesures accompagnent désormais le jeu : maison, quartier, gym, boutiques, métro/aéroport, îles, casino, hôtel, Cuba, Mexique, marathon et combat. Les pièces d’un même lieu partagent leur thème; les trois étages du casino gardent ainsi la même musique.

Les thèmes sont écrits dans le projet avec mélodie, variations, accords, basse et batterie. Ils sont joués par un synthétiseur local : sons pulse et triangle filtrés, piano et cloches FM, nappes et percussions synthétiques. Les partitions et les timbres n’utilisent aucun service externe pendant le jeu. Suno n’a pas été utilisé.

## Pour jouer

Une première touche ou un toucher permet au navigateur d’activer le son. Dans **P / Échap / ☰ → Pause**, la section **Musique** affiche le titre du thème, un bouton pour l’activer ou la couper et un curseur de volume. Le volume initial est de 25 %. Les flèches gauche/droite ou le joypad règlent aussi le curseur sélectionné.

La musique et les effets sonores ont des réglages séparés, mémorisés pour ce navigateur et cette adresse. Si les effets avaient déjà été coupés avant l’arrivée de la bande-son, la musique commence également coupée; les deux choix deviennent ensuite indépendants. Le menu de carrière, les chargements, une pause, un onglet masqué ou le portrait tactile suspendent la musique. Une conversation la réduit à 55 % du volume choisi. Le retour à la partie reprend la position musicale; un changement de thème démarre la nouvelle composition.

## Partitions et MIDI

Les titres, tempos, styles et sources sont détaillés dans [le dossier des compositions](../references/music/SCORES.md). Les boucles durent de 30 à 47 secondes.

| Lieu | Thème | MIDI |
| --- | --- | --- |
| Maison | La lumière du salon | [home.mid](../public/assets/music/midi/home.mid) |
| Quartier | La tuque sur le trottoir | [city.mid](../public/assets/music/midi/city.mid) |
| Gym | Des rounds et du cœur | [gym.mid](../public/assets/music/midi/gym.mid) |
| Boutiques | Vitrines de quartier | [shops.mid](../public/assets/music/midi/shops.mid) |
| Métro / aéroport | Prochain arrêt | [metro.mid](../public/assets/music/midi/metro.mid) |
| Îles | Le pont au soleil | [island.mid](../public/assets/music/midi/island.mid) |
| Casino | Minuit sur le tapis vert | [casino.mid](../public/assets/music/midi/casino.mid) |
| Hôtel | Chambre 201 | [hotel.mid](../public/assets/music/midi/hotel.mid) |
| Cuba | Les gants sous les palmiers | [cuba.mid](../public/assets/music/midi/cuba.mid) |
| Mexique | Cordes et soleil | [mexico.mid](../public/assets/music/midi/mexico.mid) |
| Marathon | Vers le Stade | [marathon.mid](../public/assets/music/midi/marathon.mid) |
| Ring | Sous les projecteurs | [bout.mid](../public/assets/music/midi/bout.mid) |

Les MIDI sont modifiables dans un séquenceur. Ils contiennent les notes, les instruments General MIDI, les tempos et les marqueurs de boucle. Le son d’un lecteur MIDI dépend de sa banque d’instruments; le jeu emploie ses propres timbres rétro.

## Entretien

- `npm run music:midi` régénère les douze MIDI depuis `src/audio/MusicScores.js`.
- `npm run music:render` produit les WAV et un échantillon des douze thèmes dans `/tmp/boxeur-music-renders` avec le même synthétiseur que le jeu. `MUSIC_RENDER_OUTPUT` permet de changer le dossier. Ce script utilise Playwright et Chromium comme les vérifications navigateur du projet.
- `npm run test:music` vérifie les partitions, les fichiers MIDI, le transport et le choix des thèmes.
- `npm run test:music-browser` vérifie le son réellement produit, ses interruptions et les menus sur ordinateur et mobile simulé.

Les préférences utilisent `boxeurdeux-d:music:v1`, indépendamment de la carrière et de `boxeurdeux-d:audio:v1`. Un seul transport musical survit aux changements de scène. Les sources arrêtées sont libérées; quitter la page ou détruire le jeu ferme son contexte audio. L’ancienne ponctuation sonore isolée du casino est remplacée par son thème complet.

## Validation

Les **535 tests automatisés** du jeu passent, dont 23 consacrés aux partitions, MIDI, choix des thèmes et cycle audio. La compilation réussit : `index-CAudy3uK.js` et `index-Bkvbivgg.css`. L’avertissement Vite sur la taille du bundle Phaser reste inchangé.

Les douze pistes ont été rendues sur deux répétitions avec OfflineAudioContext et le synthétiseur du jeu. Au gain d’export de 0,75, crêtes entre 0,196 et 0,359, niveau RMS entre 0,032 et 0,045; aucun échantillon saturé ni raccord vide. Le volume initial du jeu est plus discret : 0,25. [Mesures des rendus](../outputs/verification/music/render-report.json). L’aperçu WAV local se trouve dans `/tmp/boxeur-music-renders/sampler.wav` et se régénère avec le script fourni.

La version compilée passe **18 parcours**, sur ordinateur et mobile tactile simulé à 568 × 320, sans erreur ni avertissement navigateur. Les douze thèmes produisent un vrai signal WebAudio, avec des hauteurs conformes aux partitions (RMS 0,0115–0,0166 au volume initial). Déblocage après geste, marche maison → quartier avec un seul contexte, pause/muet/volume mémorisé, indépendance des effets, portrait, visibilité simulée et nettoyage pagehide sont vérifiés. [Rapport du bundle](../outputs/verification/music/built/results.json) et 21 captures dans le même dossier.

La vérification a également corrigé une reprise silencieuse après Continuer à l’hôtel ou en voyage : le routeur ne pose désormais que le drapeau de transition réellement utilisé par la scène. Un test de contexte audio interrompu vérifie sa reprise sans nouveau geste, en respectant une éventuelle pause du joueur.

Aucun téléphone physique n’a été testé. Les résultats de publication seront ajoutés après le contrôle du site public.
