# Bande-son originale — BoxeurDeux-D

Douze compositions originales de 16 mesures en 4/4, écrites pour les lieux du jeu. Chaque boucle comporte une mélodie identifiable, sa reprise variée, une section contrastante et un retour. Les accords, la basse et les percussions sont composés; aucune note n’est tirée au hasard. Aucun échantillon ou morceau existant n’est utilisé.

| ID | Titre | BPM | Boucle | Couleur musicale |
| --- | --- | ---: | ---: | --- |
| home | La lumière du salon | 82 | 46,8 s | Do majeur, piano électrique arpégé, basse ronde et batterie discrète |
| city | La tuque sur le trottoir | 108 | 35,6 s | Ré mineur, motif sautillant et accords en contretemps |
| gym | Des rounds et du cœur | 96 | 40,0 s | Mi mineur, hip-hop souple, charleston swing et basse syncopée |
| shops | Vitrines de quartier | 112 | 34,3 s | Fa majeur, accords jazz légers et petites cloches |
| metro | Prochain arrêt | 120 | 32,0 s | Do mineur, pulsation électronique, arpèges brillants et nappe |
| island | Le pont au soleil | 100 | 38,4 s | Sol majeur, mélodie ouverte, cloches et nappe lumineuse |
| casino | Minuit sur le tapis vert | 106 | 36,2 s | Lounge funk, ré mineur vers do majeur, accords enrichis et basse chromatique |
| hotel | Chambre 201 | 88 | 43,6 s | Mi bémol majeur, mélodie posée et arpèges doux |
| cuba | Les gants sous les palmiers | 116 | 33,1 s | La mineur, clave 3–2, basse syncopée et réponses de cloches |
| mexico | Cordes et soleil | 110 | 34,9 s | Ré mineur, accords égrenés façon cordes pincées et dominante harmonique |
| marathon | Vers le Stade | 128 | 30,0 s | Mi majeur, basse en croches, pulsation régulière et mélodie ascendante |
| bout | Sous les projecteurs | 124 | 31,0 s | Fa dièse mineur, motif de combat, grosse caisse syncopée et petits roulements |

Les douze thèmes partagent une palette adaptée à une synthèse rétro 16 bits : lead doux, cloches, piano électrique, nappe, basse et batterie synthétique. L’identité de chaque lieu vient de sa composition, et non d’un simple changement de tempo ou de timbre. Les morceaux demandent au plus 12 notes simultanées dans la partition.

## Modifier les partitions

La source musicale est [`src/audio/MusicScores.js`](../../src/audio/MusicScores.js). En tête du fichier, chaque ligne de mélodie correspond à une mesure. `C4` désigne le do central MIDI 60, `#` un dièse, `b` un bémol, et `-` un silence. Le nombre après `/` donne la durée en temps : `E4/1 G4/.5 A4/.5 G4/1 D5/1` forme une mesure de quatre temps.

La ligne `chords` contient un accord par mesure. Le code d’accompagnement réalise cette grille selon le rythme propre au lieu. Les mélodies, les progressions, les syncopes et les variations restent explicites. Les notes finales exportées donnent le début, la durée, la hauteur MIDI, la vélocité, l’instrument et le panoramique. Toutes se terminent avant le temps 64; la boucle laisse respirer sa cadence sans note coincée au raccord.

## Fichiers MIDI rééditables

Les fichiers individuels sont dans [`public/assets/music/midi/`](../../public/assets/music/midi/) : `home.mid`, `city.mid`, `gym.mid`, `shops.mid`, `metro.mid`, `island.mid`, `casino.mid`, `hotel.mid`, `cuba.mid`, `mexico.mid`, `marathon.mid` et `bout.mid`.

Ils utilisent le format MIDI standard 1, 480 divisions par noire, avec piste de tempo, métrique 4/4, titres, pistes instrumentales séparées, marqueurs `LOOP_START` / `LOOP_END` et quatre marqueurs de section. Les percussions partagent le canal MIDI 10, conformément à General MIDI; les canaux 1 à 5 accueillent mélodie, clavier, cloches, nappe et basse.

L’instrumentation GM donne une préécoute portable dans un séquenceur. Les timbres rétro du jeu sont synthétisés séparément par le moteur WebAudio; le MIDI conserve la composition et n’embarque pas de son. Les instruments mélodiques conservent leur panoramique; la batterie GM est centrée.

Pour régénérer les douze fichiers après une modification :

```sh
node scripts/export-music-midi.mjs
```

Le script accepte aussi un dossier de sortie en argument. Il n’installe aucune dépendance et n’utilise aucun service externe.

## Vérifications

```sh
node --test tests/music-scores.test.js
```

Les 14 tests vérifient les durées, les hauteurs et vélocités, les frontières de boucle, la polyphonie, les retours de motifs et contrastes de section, puis décodent les douze fichiers MIDI. Ils contrôlent les pistes, tempos, programmes GM, marqueurs et appariements note-on/note-off, ainsi que l’identité des fichiers livrés avec l’export des partitions actuelles.
