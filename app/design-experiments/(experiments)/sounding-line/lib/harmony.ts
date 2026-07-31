// The harmony, owned here instead of derived from the terrain.
//
// The experiment began by deriving pitch from elevation: a peak's colour band *was*
// its note. That mapping is a lovely thing to describe and it does not make music.
// Every note was individually in key — pentatonic guarantees that — but a dozen
// peaks each choosing its own pitch from its own height produces a pile of
// simultaneous unrelated notes with no chord underneath and no movement. It sounded
// like someone leaning on a keyboard.
//
// What actually makes a few random clicks sound composed, in step-sequencer and
// here, is that everything sounding at once belongs to *one chord*, and that the
// chord changes on a clock nobody has to think about. So harmony is now a
// progression with its own timing, and the terrain's job changes from choosing
// pitches to choosing *which voice of the current chord* to sound.
//
// What survives — and it is the part worth keeping — is that a taller peak sounds
// higher, the line touching a peak is why you hear it, and the moment you hear it is
// the moment you see it struck. The mapping is felt. It is no longer arithmetic.

import { ELEV_BANDS } from './pitch';

// Chords as pentatonic degree indices (0 = C2, 5 = C3, 10 = C4 …), so every voice
// is already in the scale and no combination can sour. `bass` is the root the bed
// plays underneath; `tones` are what a peak can voice, lowest first.
//
// The progression is four chords of the "sounds good immediately" kind — a I-vi-IV-V
// shape in C, voiced without the notes pentatonic does not carry. Chosen by ear, not
// derived from anything.
export type Chord = { name: string; bass: number; tones: number[] };

export const PROGRESSION: Chord[] = [
  { name: 'C', bass: 0, tones: [5, 7, 8] }, // C3 E3 G3
  { name: 'Am', bass: 4, tones: [5, 7, 9] }, // C3 E3 A3
  { name: 'G', bass: 3, tones: [6, 8, 9] }, // D3 G3 A3
  { name: 'Em', bass: 2, tones: [7, 9, 10] }, // E3 A3 C4
];

// Revolutions per chord. One revolution is ~3.84s, so two gives a chord about eight
// seconds to sit — long enough to read as a bed rather than as a chord exercise.
export const REVS_PER_CHORD = 2;

export function chordAt(rev: number): Chord {
  const i = Math.floor(rev / REVS_PER_CHORD) % PROGRESSION.length;
  return PROGRESSION[i < 0 ? i + PROGRESSION.length : i];
}

// An octave in pentatonic degrees.
const OCTAVE = 5;

// Which voice of the chord a peak sounds: taller peaks take higher voices. This is
// the whole of the elevation mapping now — height picks a voice, not a frequency, so
// the relationship stays audible while harmony stays in charge.
export function voiceFor(band: number, chord: Chord, octaveUp: boolean): number {
  const span = chord.tones.length;
  const i = Math.min(span - 1, Math.max(0, Math.floor((band / ELEV_BANDS) * span)));
  return chord.tones[i] + (octaveUp ? OCTAVE : 0);
}

// The bass bed's notes for a chord: the root, and a partner a fifth above it.
//
// step-sequencer's generator almost always writes bass as a staggered pair — root on
// the beat, fifth or octave a step behind — and that roll is most of why its low end
// sounds like a part rather than a pedal tone. Single roots on the beat were tried
// here first and they read as punctuation, not as a bass line.
export function bassFor(chord: Chord): number {
  return chord.bass;
}

// A fifth above the root in pentatonic degrees: C→G, A→E, G→D, E→A. Three degrees up
// lands on the fifth for every root in the progression.
export function bassPartnerFor(chord: Chord): number {
  return chord.bass + 3;
}
