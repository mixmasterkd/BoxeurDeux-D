/** Original, editable 16-bar scores for BoxeurDeux-D. No random composition,
 * samples or borrowed tunes: each melody below is a written A / A' / B / A''
 * phrase. The accompaniment realizes its chord chart with a named groove.
 * Pitch notation uses scientific octaves (C4 = MIDI 60); /n is a beat length.
 * A dash is a rest. Each printed melody line is exactly one 4/4 bar. */
const COMPOSITIONS = [
  {
    id: 'home', title: 'La lumière du salon', bpm: 82, groove: 'home',
    chords: 'Cmaj7 Am7 Fmaj7 G7 Cmaj7 Em7 Dm7 G7 Am7 Em7 Fmaj7 Dm7 Cmaj7 Am7 Dm7 G7',
    melody: [
      'E4/1 G4/.5 A4/.5 G4/1 D5/1', 'C5/1 B4/.5 A4/.5 E4/1 -/1',
      'A4/1 G4/.5 E4/.5 F4/1 A4/1', 'G4/1 D4/.5 E4/.5 F4/1 D4/1',
      'E4/1 G4/.5 A4/.5 G4/1 E5/1', 'D5/.5 B4/.5 G4/1 E4/1 -/1',
      'F4/1 A4/.5 C5/.5 A4/1 F4/1', 'B4/1 A4/.5 G4/.5 D5/1 -/1',
      'C5/.5 E5/.5 D5/1 C5/1 A4/1', 'B4/1 G4/.5 E4/.5 D5/1 B4/1',
      'C5/1 A4/1 G4/.5 A4/.5 F4/1', 'E4/.5 F4/.5 A4/1 E5/1 D5/1',
      'E4/1 G4/.5 A4/.5 G4/1 D5/1', 'C5/1 E5/.5 C5/.5 A4/1 E4/1',
      'F4/1 A4/1 C5/.5 A4/.5 F4/1', 'D5/1 B4/.5 A4/.5 G4/1 -/1',
    ],
  },
  {
    id: 'city', title: 'La tuque sur le trottoir', bpm: 108, groove: 'city',
    chords: 'Dm7 Bbmaj7 Cadd9 A7 Dm7 Fmaj7 Bbmaj7 A7 Gm7 Dm7 Bbmaj7 C7 Dm7 Bbmaj7 Gm7 A7',
    melody: [
      'D5/.5 F5/.5 A4/.5 C5/.5 D5/1 -/.5 A4/.5', 'F5/.5 D5/.5 Bb4/1 A4/.5 Bb4/.5 D5/1',
      'E5/.5 G5/.5 E5/.5 D5/.5 C5/1 G4/1', 'A4/.5 C#5/.5 E5/1 G5/.5 E5/.5 C#5/1',
      'D5/.5 F5/.5 A4/.5 C5/.5 D5/1 F5/1', 'E5/1 C5/.5 A4/.5 G4/.5 A4/.5 C5/1',
      'D5/.5 F5/.5 D5/1 Bb4/.5 A4/.5 F4/1', 'E5/.5 C#5/.5 A4/1 G4/.5 A4/.5 C#5/1',
      'G4/.5 Bb4/.5 D5/.5 F5/.5 D5/1 Bb4/1', 'A4/.5 D5/.5 F5/1 E5/.5 F5/.5 A5/1',
      'F5/1 D5/.5 C5/.5 Bb4/1 D5/1', 'E5/.5 G5/.5 Bb5/.5 G5/.5 E5/1 C5/1',
      'D5/.5 F5/.5 A4/.5 C5/.5 D5/1 -/.5 A4/.5', 'Bb4/.5 D5/.5 F5/1 A5/.5 F5/.5 D5/1',
      'D5/.5 Bb4/.5 G4/1 A4/.5 Bb4/.5 D5/1', 'E5/1 C#5/.5 B4/.5 A4/1 -/1',
    ],
  },
  {
    id: 'gym', title: 'Des rounds et du cœur', bpm: 96, groove: 'gym',
    chords: 'Em9 Am7 Em7 B7 Em9 Cmaj7 Am7 B7 Cmaj7 Dadd9 Em7 B7 Am7 Em9 Cmaj7 B7',
    melody: [
      '-/.5 E4/.5 G4/.75 B4/.25 D5/.5 B4/.5 G4/1', 'A4/.75 C5/.25 E5/.5 C5/.5 G4/1 -/1',
      'E4/.5 G4/.5 B4/1 A4/.5 G4/.5 E4/1', '-/.5 F#4/.5 A4/.75 B4/.25 D#5/1 B4/1',
      '-/.5 E4/.5 G4/.75 B4/.25 D5/.5 E5/.5 B4/1', 'G4/.75 B4/.25 D5/.5 E5/.5 G5/1 E5/1',
      'C5/.5 A4/.5 E4/1 G4/.5 A4/.5 C5/1', 'D#5/.75 B4/.25 A4/1 F#4/.5 A4/.5 B4/1',
      'E5/1 D5/.5 B4/.5 G4/.75 E4/.25 G4/1', 'F#4/.5 A4/.5 D5/.75 E5/.25 F#5/1 E5/1',
      'D5/.5 B4/.5 G4/1 E5/.75 D5/.25 B4/1', 'A4/.5 F#4/.5 D#4/1 B4/1 -/1',
      'A4/.75 C5/.25 E5/.5 C5/.5 B4/.5 A4/.5 G4/1', '-/.5 E4/.5 G4/.75 B4/.25 D5/.5 B4/.5 G4/1',
      'E5/.5 D5/.5 B4/1 G4/.75 E4/.25 D4/1', 'F#4/.5 A4/.5 B4/1 D#5/.5 B4/.5 -/1',
    ],
  },
  {
    id: 'shops', title: 'Vitrines de quartier', bpm: 112, groove: 'shops',
    chords: 'Fmaj7 Gm7 Em7 Am7 Dm7 G7 Cmaj7 C7 Bbmaj7 Am7 Gm7 C7 Fmaj7 Dm7 Gm7 C7',
    melody: [
      'A4/.5 C5/.5 E5/.5 C5/.5 A4/1 G4/.5 A4/.5', 'Bb4/.5 D5/.5 F5/1 D5/.5 Bb4/.5 A4/1',
      'G4/.5 B4/.5 E5/.5 G5/.5 E5/1 B4/1', 'C5/.5 E5/.5 G5/1 E5/.5 C5/.5 A4/1',
      'A4/.5 D5/.5 F5/.5 E5/.5 D5/1 C5/1', 'B4/.5 D5/.5 F5/1 E5/.5 D5/.5 B4/1',
      'E5/1 G5/.5 E5/.5 D5/.5 C5/.5 B4/1', 'Bb4/.5 G4/.5 E4/1 G4/.5 Bb4/.5 C5/1',
      'D5/1 F5/.5 A5/.5 F5/1 D5/1', 'E5/.5 C5/.5 A4/.5 G4/.5 E4/1 A4/1',
      'Bb4/.5 D5/.5 F5/.5 A5/.5 G5/1 F5/1', 'E5/.5 G5/.5 Bb5/.5 G5/.5 E5/1 C5/1',
      'A4/.5 C5/.5 E5/.5 C5/.5 A4/1 G4/.5 A4/.5', 'D5/.5 F5/.5 A5/1 F5/.5 E5/.5 D5/1',
      'Bb4/.5 D5/.5 F5/1 D5/.5 Bb4/.5 A4/1', 'G4/.5 Bb4/.5 E5/1 C5/1 -/1',
    ],
  },
  {
    id: 'metro', title: 'Prochain arrêt', bpm: 120, groove: 'metro',
    chords: 'Cm9 Abmaj7 Ebmaj7 Bb7 Cm9 Abmaj7 Fm7 G7 Fm7 Abmaj7 Ebmaj7 G7 Cm9 Abmaj7 Fm7 G7',
    melody: [
      'G4/.5 C5/.5 D5/1 Eb5/.5 D5/.5 G4/1', 'C5/1 Eb5/.5 G5/.5 Eb5/1 C5/1',
      'Bb4/.5 G4/.5 F4/1 G4/.5 Bb4/.5 D5/1', 'F5/1 D5/.5 C5/.5 Bb4/1 Ab4/1',
      'G4/.5 C5/.5 D5/1 Eb5/.5 G5/.5 D5/1', 'Eb5/.5 C5/.5 Ab4/1 G4/.5 Ab4/.5 C5/1',
      'C5/1 Ab4/.5 G4/.5 F4/1 Ab4/1', 'B4/.5 D5/.5 F5/1 D5/.5 B4/.5 G4/1',
      'Ab4/.5 C5/.5 Eb5/.5 F5/.5 Eb5/1 C5/1', 'Eb5/1 G5/.5 Ab5/.5 G5/1 Eb5/1',
      'D5/.5 Bb4/.5 G4/1 F4/.5 G4/.5 Bb4/1', 'D5/1 F5/.5 D5/.5 B4/1 G4/1',
      'G4/.5 C5/.5 D5/1 Eb5/.5 D5/.5 G4/1', 'C5/1 Eb5/.5 G5/.5 Eb5/.5 C5/.5 Ab4/1',
      'Ab4/.5 C5/.5 F5/1 Eb5/.5 C5/.5 Ab4/1', 'G4/1 B4/.5 D5/.5 F5/.5 D5/.5 B4/1',
    ],
  },
  {
    id: 'island', title: 'Le pont au soleil', bpm: 100, groove: 'island',
    chords: 'Gmaj7 Cmaj7 Am7 D7 Gmaj7 Em7 Cmaj7 D7 Em7 Bm7 Cmaj7 Am7 Gmaj7 Em7 Am7 D7',
    melody: [
      'B4/.5 D5/.5 E5/1 D5/.5 B4/.5 A4/1', 'G4/1 E5/.5 D5/.5 C5/1 B4/1',
      'A4/.5 C5/.5 E5/1 G5/.5 E5/.5 C5/1', 'F#5/1 E5/.5 D5/.5 A4/1 -/1',
      'B4/.5 D5/.5 E5/1 D5/.5 G5/.5 F#5/1', 'E5/1 B4/.5 G4/.5 A4/.5 B4/.5 D5/1',
      'E5/.5 G5/.5 E5/1 D5/.5 C5/.5 B4/1', 'A4/.5 F#4/.5 E4/1 F#4/.5 A4/.5 D5/1',
      'G5/1 F#5/.5 E5/.5 B4/1 G4/1', 'F#4/.5 B4/.5 D5/1 C#5/.5 D5/.5 F#5/1',
      'E5/1 D5/.5 C5/.5 G4/.5 A4/.5 B4/1', 'C5/.5 E5/.5 G5/1 E5/.5 C5/.5 A4/1',
      'B4/.5 D5/.5 E5/1 D5/.5 B4/.5 A4/1', 'G4/.5 B4/.5 E5/1 D5/1 B4/1',
      'C5/1 E5/.5 D5/.5 C5/1 A4/1', 'F#4/.5 A4/.5 C5/1 D5/1 -/1',
    ],
  },
  {
    id: 'casino', title: 'Minuit sur le tapis vert', bpm: 106, groove: 'casino',
    chords: 'Dm9 G13 Cmaj9 A7 Dm9 G13 Cmaj9 A7 Fmaj7 Em7 Eb7 Dm7 Dm9 G13 Cmaj9 A7',
    melody: [
      '-/.5 F4/.5 A4/.75 C5/.25 E5/.5 D5/.5 A4/1', 'B4/.5 E5/.5 F5/1 E5/.5 D5/.5 B4/1',
      'G4/.75 B4/.25 D5/.5 E5/.5 D5/1 B4/1', '-/.5 C#5/.5 E5/.75 G5/.25 E5/.5 C#5/.5 A4/1',
      '-/.5 F4/.5 A4/.75 C5/.25 E5/.5 F5/.5 E5/1', 'D5/.5 B4/.5 A4/1 G4/.75 B4/.25 E5/1',
      'D5/.75 B4/.25 G4/.5 E4/.5 G4/.5 B4/.5 D5/1', 'E5/1 G5/.5 E5/.5 C#5/.5 B4/.5 A4/1',
      'A4/.5 C5/.5 E5/.5 G5/.5 E5/.75 C5/.25 A4/1', 'G4/.5 B4/.5 D5/1 E5/.5 D5/.5 B4/1',
      'G4/.75 Bb4/.25 Db5/.5 Eb5/.5 Db5/1 Bb4/1', 'A4/.5 C5/.5 D5/.75 F5/.25 E5/.5 D5/.5 C5/1',
      '-/.5 F4/.5 A4/.75 C5/.25 E5/.5 D5/.5 A4/1', 'B4/.5 D5/.5 E5/.75 F5/.25 D5/1 B4/1',
      'G4/.5 B4/.5 D5/1 E5/.5 D5/.5 B4/1', 'C#5/.5 E5/.5 G5/1 E5/.5 C#5/.5 -/1',
    ],
  },
  {
    id: 'hotel', title: 'Chambre 201', bpm: 88, groove: 'hotel',
    chords: 'Ebmaj7 Cm7 Abmaj7 Bb7 Ebmaj7 Gm7 Fm7 Bb7 Abmaj7 Ebmaj7 Fm7 Bb7 Ebmaj7 Cm7 Fm7 Bb7',
    melody: [
      'G4/1 Bb4/1 D5/.5 Bb4/.5 F4/1', 'Eb4/1 G4/.5 Bb4/.5 C5/1 -/1',
      'C5/1 Bb4/.5 G4/.5 Ab4/1 Eb5/1', 'D5/1 C5/.5 Bb4/.5 F4/1 D4/1',
      'G4/1 Bb4/1 D5/.5 F5/.5 Eb5/1', 'D5/.5 Bb4/.5 G4/1 A4/.5 Bb4/.5 D5/1',
      'C5/1 Ab4/.5 G4/.5 F4/1 C5/1', 'D5/.5 F5/.5 Ab5/1 F5/1 -/1',
      'Eb5/1 C5/.5 Bb4/.5 Ab4/1 C5/1', 'Bb4/.5 G4/.5 F4/1 G4/.5 Bb4/.5 D5/1',
      'Eb5/1 C5/1 Ab4/.5 G4/.5 F4/1', 'D4/.5 F4/.5 Ab4/1 C5/.5 D5/.5 F5/1',
      'G4/1 Bb4/1 D5/.5 Bb4/.5 F4/1', 'Eb5/1 D5/.5 C5/.5 Bb4/1 G4/1',
      'Ab4/1 C5/1 Eb5/.5 C5/.5 Ab4/1', 'F4/1 D5/.5 C5/.5 Bb4/1 -/1',
    ],
  },
  {
    id: 'cuba', title: 'Les gants sous les palmiers', bpm: 116, groove: 'cuba',
    chords: 'Am7 Dm7 G7 Cmaj7 Fmaj7 Dm7 E7 Am7 Dm7 G7 Cmaj7 E7 Am7 Dm7 E7 E7',
    melody: [
      'E5/.5 -/.5 A5/.5 G5/.5 E5/.75 C5/.25 A4/1', '-/.5 A4/.5 C5/.5 D5/.5 F5/.75 E5/.25 D5/1',
      'B4/.5 D5/.5 F5/.75 G5/.25 F5/.5 D5/.5 B4/1', 'E5/.75 G5/.25 E5/.5 D5/.5 C5/1 -/1',
      'A4/.5 C5/.5 E5/.5 F5/.5 E5/.75 C5/.25 A4/1', '-/.5 D5/.5 F5/.5 A5/.5 F5/1 E5/.5 D5/.5',
      'B4/.5 D5/.5 E5/.75 G#5/.25 E5/.5 D5/.5 B4/1', 'A4/.75 C5/.25 E5/.5 G5/.5 E5/1 -/1',
      'F5/.5 E5/.5 D5/.5 C5/.5 A4/.75 C5/.25 D5/1', 'F5/.75 D5/.25 B4/.5 G4/.5 B4/.5 D5/.5 G5/1',
      'E5/.5 -/.5 G5/.5 B5/.5 G5/.75 E5/.25 D5/1', 'G#4/.5 B4/.5 D5/.75 E5/.25 G#5/1 E5/1',
      'E5/.5 -/.5 A5/.5 G5/.5 E5/.75 C5/.25 A4/1', 'F5/.5 E5/.5 D5/.75 C5/.25 A4/.5 C5/.5 D5/1',
      'G#4/.5 B4/.5 D5/.5 E5/.5 B4/.75 G#4/.25 E4/1', 'B4/.5 D5/.5 E5/.75 G#5/.25 E5/1 -/1',
    ],
  },
  {
    id: 'mexico', title: 'Cordes et soleil', bpm: 110, groove: 'mexico',
    chords: 'Dm Bb F C Dm Gm A7 Dm Bb C Gm A7 Dm Bb A7 A7',
    melody: [
      'A4/.5 D5/.5 F5/.5 E5/.5 D5/.75 A4/.25 F4/1', 'F4/.5 Bb4/.5 D5/1 F5/.5 D5/.5 Bb4/1',
      'A4/.75 C5/.25 F5/.5 E5/.5 C5/1 A4/1', 'G4/.5 C5/.5 E5/.75 D5/.25 C5/1 G4/1',
      'A4/.5 D5/.5 F5/.5 E5/.5 D5/.75 F5/.25 A5/1', 'G5/.5 D5/.5 Bb4/.75 A4/.25 G4/.5 Bb4/.5 D5/1',
      'E5/.5 C#5/.5 A4/.5 G4/.5 E4/.75 G4/.25 A4/1', 'D5/1 F5/.5 E5/.5 D5/1 -/1',
      'D5/.5 F5/.5 Bb5/1 A5/.5 F5/.5 D5/1', 'E5/.75 G5/.25 E5/.5 D5/.5 C5/1 E5/1',
      'D5/.5 Bb4/.5 G4/.5 A4/.5 Bb4/.75 D5/.25 G5/1', 'E5/.5 C#5/.5 B4/.75 A4/.25 G4/1 E4/1',
      'A4/.5 D5/.5 F5/.5 E5/.5 D5/.75 A4/.25 F4/1', 'Bb4/.5 D5/.5 F5/.75 A5/.25 F5/.5 D5/.5 Bb4/1',
      'C#5/.5 E5/.5 G5/.5 E5/.5 C#5/1 B4/.5 A4/.5', 'E5/1 C#5/.5 B4/.5 A4/1 -/1',
    ],
  },
  {
    id: 'marathon', title: 'Vers le Stade', bpm: 128, groove: 'marathon',
    chords: 'Emaj7 C#m7 Amaj7 B7 Emaj7 G#m7 Amaj7 B7 C#m7 G#m7 Amaj7 F#m7 Emaj7 Amaj7 B7 B7',
    melody: [
      'E5/.5 G#5/.5 B5/1 G#5/.5 F#5/.5 E5/1', 'G#4/.5 C#5/.5 E5/.5 G#5/.5 F#5/.5 E5/.5 C#5/1',
      'E5/.5 C#5/.5 B4/.5 A4/.5 C#5/.5 E5/.5 G#5/1', 'F#5/.5 D#5/.5 B4/.5 A4/.5 F#4/1 B4/1',
      'E5/.5 G#5/.5 B5/1 G#5/.5 B5/.5 G#5/1', 'F#5/.5 D#5/.5 B4/1 D#5/.5 F#5/.5 G#5/1',
      'E5/.5 C#5/.5 B4/.5 C#5/.5 E5/.5 G#5/.5 A5/1', 'F#5/.5 D#5/.5 B4/1 A4/.5 B4/.5 D#5/1',
      'G#5/.5 E5/.5 C#5/.5 B4/.5 C#5/.5 E5/.5 G#5/1', 'B5/1 G#5/.5 F#5/.5 D#5/1 B4/1',
      'C#5/.5 E5/.5 G#5/.5 A5/.5 G#5/.5 E5/.5 C#5/1', 'A4/.5 C#5/.5 E5/.5 F#5/.5 E5/1 C#5/1',
      'E5/.5 G#5/.5 B5/1 G#5/.5 F#5/.5 E5/1', 'C#5/.5 E5/.5 A5/1 G#5/.5 E5/.5 C#5/1',
      'B4/.5 D#5/.5 F#5/.5 A5/.5 F#5/.5 D#5/.5 B4/1', 'F#5/.5 D#5/.5 B4/1 D#5/.5 F#5/.5 -/1',
    ],
  },
  {
    id: 'bout', title: 'Sous les projecteurs', bpm: 124, groove: 'bout',
    chords: 'F#m Dmaj7 E C#7 F#m A Dmaj7 C#7 Bm7 F#m Dmaj7 E7 F#m Dmaj7 C#7 C#7',
    melody: [
      'F#4/.5 A4/.5 C#5/.5 E5/.5 F#5/1 C#5/1', 'D5/.5 F#5/.5 A5/.5 F#5/.5 E5/.5 D5/.5 A4/1',
      'B4/.5 E5/.5 G#5/1 F#5/.5 E5/.5 B4/1', 'C#5/.75 E#5/.25 G#5/.5 B5/.5 G#5/1 E#5/1',
      'F#4/.5 A4/.5 C#5/.5 E5/.5 F#5/.5 A5/.5 F#5/1', 'E5/.5 C#5/.5 A4/1 B4/.5 C#5/.5 E5/1',
      'D5/.5 F#5/.5 A5/.5 C#6/.5 A5/.5 F#5/.5 D5/1', 'E#5/.5 G#5/.5 B5/1 G#5/.5 E#5/.5 C#5/1',
      'D5/.5 F#5/.5 A5/.75 F#5/.25 D5/.5 C#5/.5 B4/1', 'A4/.5 C#5/.5 F#5/1 E5/.5 C#5/.5 A4/1',
      'F#5/1 E5/.5 D5/.5 A4/.5 B4/.5 C#5/1', 'D5/.5 E5/.5 G#5/.5 B5/.5 G#5/1 E5/1',
      'F#4/.5 A4/.5 C#5/.5 E5/.5 F#5/1 C#5/1', 'D5/.5 F#5/.5 A5/1 F#5/.5 E5/.5 D5/1',
      'C#5/.5 E#5/.5 G#5/.5 B5/.5 G#5/.5 E#5/.5 C#5/1', 'B4/.5 C#5/.5 E#5/1 G#5/.5 E#5/.5 -/1',
    ],
  },
];

const pitchClasses = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
const qualities = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14], '13': [0, 4, 7, 10, 14, 21],
};
const rounded = n => Math.round(n * 1000) / 1000;
function pitch(name) {
  const match = /^([A-G])([#b]?)([0-8])$/.exec(name);
  if (!match) throw new Error(`Invalid written pitch: ${name}`);
  return (Number(match[3]) + 1) * 12 + pitchClasses[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
}
function harmony(symbol) {
  const match = /^([A-G])([#b]?)(.*)$/.exec(symbol), intervals = qualities[match?.[3]];
  if (!match || !intervals) throw new Error(`Invalid written chord: ${symbol}`);
  const pc = (pitchClasses[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) + 12) % 12;
  const root = 36 + pc;
  // Middle-register, close voicings. The bass supplies roots; rich chords keep
  // third / seventh / ninth / thirteenth rather than an unnecessary fifth.
  const chosen = intervals.length > 4 ? [intervals[1], intervals[3], intervals[4], intervals.at(-1)] : intervals;
  const tones = [...new Set(chosen.map(interval => {
    let note = 48 + pc + interval;
    while (note > 72) note -= 12;
    while (note < 50) note += 12;
    return note;
  }))].sort((a, b) => a - b);
  return {root, tones, third: intervals[1]};
}

function compose(definition) {
  const notes = [], chart = definition.chords.split(' ').map(harmony);
  const append = (beat, duration, midi, velocity, instrument, pan = 0) => {
    if (beat < 0 || beat >= 64 || duration <= 0 || beat + duration > 64.00001) throw new Error(`${definition.id}: note outside loop`);
    notes.push({beat: rounded(beat), duration: rounded(duration), midi, velocity: rounded(velocity), instrument, pan});
  };
  for (let bar = 0; bar < 16; bar++) {
    const at = bar * 4, chord = chart[bar], next = chart[(bar + 1) % 16], style = definition.groove;
    const calm = ['home', 'hotel'].includes(style);
    let cursor = 0;
    for (const token of definition.melody[bar].split(' ')) {
      const [name, length] = token.split('/'), duration = Number(length);
      if (name !== '-') append(at + cursor, duration * (style === 'mexico' ? .78 : calm ? .94 : .86), pitch(name),
        (calm ? .34 : style === 'casino' ? .41 : .44) + (cursor === 0 ? .025 : 0), 'lead', -.04);
      cursor += duration;
    }
    if (cursor !== 4) throw new Error(`${definition.id}, bar ${bar + 1}: melody has ${cursor} beats`);
    const addChord = (offset, duration, level, instrument = 'keys') => {
      for (const [index, tone] of chord.tones.entries()) append(at + offset + (style === 'mexico' ? index * .025 : 0), duration, tone, level, instrument, instrument === 'pad' ? .1 : -.2);
    };
    const bass = (offset, duration, interval = 0, level = .46) => append(at + offset, duration, chord.root + interval, calm ? level * .7 : level, 'bass');
    const hit = (offset, instrument, level) => append(at + offset, instrument === 'hat' ? .07 : .13,
      {kick: 36, snare: 38, clap: 39, hat: 42, tom: 45}[instrument], level, instrument, {hat: .18, clap: -.12, tom: -.15}[instrument] ?? 0);
    // Every four bars the orchestration answers the phrase instead of changing
    // notes by chance. Short fills leave room for the following downbeat.
    const turnaround = bar % 4 === 3;
    if (calm) {
      addChord(0, 3.72, .115, 'pad');
      const arpeggio = [0, 2, 1, chord.tones.length - 1, 2, 1];
      for (const [index, offset] of [0, .75, 1.5, 2, 2.75, 3.5].entries()) {
        append(at + offset, .44, chord.tones[arpeggio[index] % chord.tones.length], style === 'home' ? .22 : .20, 'keys', -.2);
      }
      bass(0, 1.65); bass(2, 1.52, turnaround ? 7 : 0, .38);
      hit(0, 'kick', .21); hit(2, 'snare', .12);
      for (const offset of [.5, 1.5, 2.5, 3.5]) hit(offset, 'hat', .10);
    } else if (style === 'metro') {
      addChord(0, 3.7, .13, 'pad');
      for (let index = 0; index < 8; index++) {
        const order = [0, 2, 1, 3, 0, 2, 3, 1];
        append(at + index * .5, .28, chord.tones[order[index] % chord.tones.length] + 12, .17, 'bell', .26);
        bass(index * .5, .33, [0, 0, 7, 0, 12, 7, 0, 7][index], .37);
      }
      for (const offset of [0, 1, 2, 3]) hit(offset, 'kick', .43);
      for (const offset of [1, 3]) hit(offset, 'clap', .27);
      for (const offset of [.5, 1.5, 2.5, 3.5]) hit(offset, 'hat', .21);
    } else if (style === 'gym') {
      for (const offset of [0, 1.75, 2.5]) addChord(offset, .48, .22);
      if (bar % 2 === 0) addChord(0, 3.5, .09, 'pad');
      for (const [index, offset] of [0, .75, 1.5, 2.75, 3.5].entries()) bass(offset, [.55, .28, .62, .40, .24][index], [0, 0, 7, 0, 12][index]);
      for (const offset of [0, .75, 2, 2.75]) hit(offset, 'kick', offset % 1 ? .31 : .45);
      for (const offset of [1, 3]) hit(offset + .04, 'snare', .34);
      for (const offset of [0, .66, 1, 1.66, 2, 2.66, 3, 3.66]) hit(offset, 'hat', offset % 1 ? .12 : .19);
      if (turnaround) hit(3.5, 'snare', .13);
    } else if (style === 'casino') {
      for (const offset of [.04, .79, 1.54, 2.79, 3.54]) addChord(offset, .27, .205);
      for (const [index, offset] of [0, .75, 1.5, 2, 2.75, 3.25].entries()) bass(offset, [.55, .28, .36, .52, .30, .27][index], [0, 7, 12, 0, chord.third, 7][index], .44);
      append(at + 3.75, .20, next.root - 1, .32, 'bass');
      for (const offset of [0, 1.5, 2.75]) hit(offset, 'kick', offset === 0 ? .40 : .30);
      for (const offset of [1.04, 3.04]) hit(offset, 'snare', .26);
      for (const offset of [0, .5, 1, 1.5, 2, 2.5, 3, 3.5]) hit(offset, 'hat', offset % 1 ? .18 : .11);
      if (turnaround) append(at + 3.25, .5, chord.tones.at(-1) + 12, .19, 'bell', .25);
    } else if (style === 'cuba') {
      for (const offset of [0, .75, 1.5, 2.5, 3.25]) addChord(offset, .26, .21);
      bass(.5, .45, 7); bass(1.5, .75); bass(2.75, .38, 7); bass(3.5, .42, 0, .38);
      for (const offset of (bar % 2 ? [1, 2] : [0, 1.5, 3])) hit(offset, 'clap', .22);
      for (const offset of [0, 2.5]) hit(offset, 'kick', .33);
      for (const offset of [.75, 2, 3.5]) hit(offset, 'tom', .23);
      for (const offset of [0, .5, 1, 1.5, 2, 2.5, 3, 3.5]) hit(offset, 'hat', offset % 1 ? .11 : .16);
      append(at + .25, .32, chord.tones[1] + 12, .16, 'bell', .24);
      append(at + 2.25, .32, chord.tones.at(-1) + 12, .15, 'bell', .24);
    } else if (style === 'mexico') {
      for (const offset of [0, 1.5, 2.5, 3.5]) addChord(offset, .25, .22);
      bass(0, .72); bass(1.5, .34, 7, .38); bass(2, .64); bass(3.5, .31, 7, .36);
      for (const offset of [0, 2]) hit(offset, 'kick', .34);
      for (const offset of [1, 3]) hit(offset, 'snare', .23);
      for (const offset of [.5, 1.5, 2.5, 3.5]) hit(offset, 'hat', .16);
      for (const offset of [1.5, 3.5]) hit(offset, 'clap', .14);
      if (turnaround) {hit(3.25, 'tom', .20); hit(3.75, 'tom', .25);}
    } else if (style === 'marathon' || style === 'bout') {
      addChord(0, 3.72, .11, 'pad');
      for (const offset of (style === 'bout' ? [0, .75, 1.5, 2.5, 3.25] : [.5, 1.5, 2.5, 3.5])) addChord(offset, .23, .20);
      for (let index = 0; index < 8; index++) bass(index * .5, .36, [0, 0, 12, 7, 0, 12, 7, 12][index], .41);
      for (const offset of (style === 'bout' ? [0, .75, 2, 2.75] : [0, 1, 2, 3])) hit(offset, 'kick', .43);
      for (const offset of [1, 3]) hit(offset, 'snare', .34);
      for (let index = 0; index < 16; index++) hit(index * .25, 'hat', index % 2 ? .08 : .17);
      if (turnaround) {hit(3.25, 'tom', .22); hit(3.5, 'tom', .27); hit(3.75, 'snare', .19);}
    } else {
      // City, shops and island share an ensemble, but not their melody, bass
      // figure, harmony or orchestration: guitar-like offbeats, bright chimes,
      // and a restrained island pad respectively.
      const soft = style === 'island';
      for (const offset of [.75, 1.5, 2.75, 3.5]) addChord(offset, .25, soft ? .17 : .21);
      if (soft) addChord(0, 3.72, .11, 'pad');
      bass(0, .68, 0, .42); bass(1.5, .33, 7, .36); bass(2, .62, soft ? 0 : 12, .40); bass(3.5, .30, chord.third, .34);
      for (const offset of [0, 2]) hit(offset, 'kick', soft ? .27 : .37);
      for (const offset of [1, 3]) hit(offset, 'snare', soft ? .17 : .27);
      for (const offset of [0, .5, 1, 1.5, 2, 2.5, 3, 3.5]) hit(offset, 'hat', soft ? .105 : offset % 1 ? .14 : .11);
      if (style === 'shops' || soft) {
        for (const [index, offset] of [.25, 1.25, 2.25, 3.25].entries()) append(at + offset, .33,
          chord.tones[index % chord.tones.length] + 12, soft ? .125 : .17, 'bell', .26);
      }
      if (turnaround && !soft) hit(3.5, 'tom', .18);
    }
  }
  notes.sort((a, b) => a.beat - b.beat || a.instrument.localeCompare(b.instrument) || a.midi - b.midi);
  return Object.freeze({id: definition.id, title: definition.title, bpm: definition.bpm,
    bars: 16, beatsPerBar: 4, loopBeats: 64, notes: Object.freeze(notes.map(Object.freeze))});
}

export const MUSIC_TRACKS = Object.freeze(Object.fromEntries(COMPOSITIONS.map(definition => [definition.id, compose(definition)])));
