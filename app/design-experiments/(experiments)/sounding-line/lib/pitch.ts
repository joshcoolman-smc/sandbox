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

// The sweep turns continuously and a peak sounds at its exact crossing angle,
// quantized to the grid below.
//
// An earlier pass quantized the *line* too — it stepped between 16 sectors — and a
// later one removed quantizing from both. Neither was right. The line wants to glide
// and the notes want a grid: a dozen peaks firing at a dozen arbitrary moments gives
// the ear no downbeat, and that version was mud however consonant each note was.
//
// The tempo is borrowed rather than invented. step-sequencer at 100bpm, hitting
// generate, is the sound this experiment is trying to reach; there the 16 steps are
// sixteenth notes, so a step is 150ms and its whole pattern comes round every 2.4
// seconds. Matching the step gives the same rhythmic feel; taking 32 of them per
// revolution makes a pass two bars of 4/4 and leaves twice as many slots for terrain
// to land in, which is where the richness comes from.
export const STEP_MS = 150; // sixteenth notes at 100bpm
export const STEPS = 32; // two bars per revolution
export const REV_MS = STEP_MS * STEPS; // 4800ms per pass
export const STEP_ANGLE = (Math.PI * 2) / STEPS;

// Steps group into fours — one beat each, eight to a pass.
//
// The group is the unit that turns notes into a pattern. In a sequencer pattern that
// sounds good, each voice fires once or twice per group at its own offset: kick on
// the 1, hat on the 3, bass as a root-then-fifth pair, lead once or twice. That
// interlocking is the whole trick, and it is what the layers here follow.
//
// Which slot inside a group the terrain uses is left to the terrain — the peaks the
// line reaches first claim them — so the pattern lands unevenly inside the beat
// instead of on the grid's corners, which is the part that gives it life.
export const GROUP_STEPS = 4;
export const GROUPS_PER_REV = STEPS / GROUP_STEPS;
export const GROUP_MS = STEP_MS * GROUP_STEPS;

// Per-group ceilings, ported from what step-sequencer's generator actually writes:
// roughly 8 bass notes and 5-12 lead notes capped at 2 per column, over 16 steps.
export const MID_PER_GROUP = 2;
export const HIGH_PER_GROUP = 1;

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

// Layers are the three registers the arrangement is voiced in.
//
// An earlier pass gated peaks by register — LOW meant "peaks in the bottom three
// bands" — and that toggle was nearly always empty, because a click roots its chord
// at band 9 and only a shift-click basin ever lands beneath band 3. The control
// promised a register and delivered silence.
//
// Now LOW is the bass bed on the harmony's clock, MID is every peak the line
// crosses, and HIGH is the peaks tall enough to have earned the octave above. Which
// pitch any of them sounds is lib/harmony.ts's business, not elevation's.
export const ZONE_MID_TOP = 9; // above this a peak also rings an octave up

export type Layer = 'low' | 'mid' | 'high';
// Ordered low to high, which is both the strike order and the order the toggles
// read in the console.
export const LAYER_KEYS: Layer[] = ['low', 'mid', 'high'];

// A peak's two voices are struck a beat apart rather than together, so it reads as
// rising instead of as one block chord.
export const ZONE_STAGGER_MS = 46;
// Per-peak variation on that stagger, as a fraction. Derived from the peak's bearing
// rather than drawn fresh each pass — a stack that flams differently every revolution
// reads as sloppy timing, while one that always flams the same way reads as that
// peak's character. Stays well under a step, or it undoes the quantizing.
export const ZONE_STAGGER_JITTER = 0.5;

// Elevation (0..1) → band index. The single place the quantization happens, so
// the colour renderer, the plaque, and the audio engine can never disagree.
export function bandOf(elev: number): number {
  const b = (elev * ELEV_BANDS) | 0;
  return b < 0 ? 0 : b > ELEV_BANDS - 1 ? ELEV_BANDS - 1 : b;
}
