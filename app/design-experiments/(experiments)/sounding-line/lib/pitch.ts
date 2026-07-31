// The mapping that the whole experiment turns on.
//
// The mesh quantizes elevation into 16 colour bands, and C major pentatonic spans
// exactly 16 degrees from C2 to C5. So one index does both: the band that picks a
// node's colour is the degree that picks its pitch. Deep blue is a sub, green is
// midrange, white peaks are the high bells.
//
// Consonance is structural — there is no way to build something out of key, because
// there are no out-of-key degrees to build.
//
// Pitch is generated rather than tabulated, because the rotation control transposes
// and a hardcoded 16-entry table runs off its own end the moment it does. A degree
// is an index into the pentatonic scale extended over as many octaves as needed.

export const ELEV_BANDS = 16;

// The sweep is quantized into this many steps per revolution, and a peak sounds on
// the step its sector belongs to rather than at its exact angle.
//
// This is what stops the mud. Peaks land wherever the visitor clicks, so firing
// them at their true angle scatters notes across arbitrary moments — every note
// individually in key, the whole thing rhythmically shapeless. Snapping to a grid
// is the reason step-sequencer's generate button always sounds good, and it means
// it barely matters where you click here either.
export const STEPS = 16;
export const REV_MS = 3840; // 240ms per step — an eighth-note feel around 125bpm
export const STEP_MS = REV_MS / STEPS;
export const STEP_ANGLE = (Math.PI * 2) / STEPS;

// Voice budget per step. Pentatonic keeps any combination consonant, but density
// still turns to porridge — and two sub-bass notes at once is mud by itself.
export const MAX_NOTES_PER_STEP = 4; // room for a planted chord plus a neighbour
export const MAX_BASS_PER_STEP = 1;
export const BASS_TOP_DEGREE = 2;

// Rotation: one notch turns the composition one step and transposes it one scale
// degree. Both from the same number, so the control has a single legible
// consequence rather than two settings wearing one hat.
export const MAX_ROTATION_STEPS = 8;

// Extended pentatonic. Semitone offsets of C D E G A, rooted at C2.
const PENT_SEMIS = [0, 2, 4, 7, 9];
const PENT_NAMES = ['C', 'D', 'E', 'G', 'A'];
const ROOT_HZ = 65.41; // C2
const ROOT_OCTAVE = 2;

// Degrees are clamped to a musical range rather than allowed to run to inaudible
// extremes when elevation and rotation stack in the same direction.
export const MIN_DEGREE = 0;
export const MAX_DEGREE = 30; // C2 up to A6

export function clampDegree(degree: number): number {
  return degree < MIN_DEGREE ? MIN_DEGREE : degree > MAX_DEGREE ? MAX_DEGREE : degree;
}

export function freqForDegree(degree: number): number {
  const d = clampDegree(degree);
  const octave = Math.floor(d / PENT_SEMIS.length);
  const semis = PENT_SEMIS[d % PENT_SEMIS.length] + octave * 12;
  return ROOT_HZ * Math.pow(2, semis / 12);
}

export function noteName(degree: number): string {
  const d = clampDegree(degree);
  const octave = Math.floor(d / PENT_SEMIS.length);
  return `${PENT_NAMES[d % PENT_SEMIS.length]}${ROOT_OCTAVE + octave}`;
}

export type Voice =
  | { kind: 'bass'; tone: 'sub' | 'saw' }
  | { kind: 'lead'; tone: 'soft' | 'sqr' };

// Voice follows the *absolute* degree, not the band, so transposing a peak upward
// takes it off the sub and onto the lead rather than carrying the woof with it.
// Only the bottom three degrees get a bass voice: five stacked sub-oscillators was
// the single biggest contributor to mud, since low frequencies smear long before
// the upper register does.
export function voiceForDegree(degree: number): Voice {
  const d = clampDegree(degree);
  if (d <= BASS_TOP_DEGREE) return { kind: 'bass', tone: 'sub' };
  if (d <= 9) return { kind: 'lead', tone: 'soft' };
  return { kind: 'lead', tone: 'sqr' };
}

// Elevation (0..1) → band index. The single place the quantization happens, so
// the colour renderer, the plaque, and the audio engine can never disagree.
export function bandOf(elev: number): number {
  const b = (elev * ELEV_BANDS) | 0;
  return b < 0 ? 0 : b > ELEV_BANDS - 1 ? ELEV_BANDS - 1 : b;
}
