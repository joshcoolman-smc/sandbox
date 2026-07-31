// The page arrives mid-performance. This is the analog of step-sequencer's
// generate button: an empty grid is a worse invitation than a running groove, and
// an empty mesh asks the visitor to click a dozen times before anything is worth
// listening to.
//
// The scatter is composed, not random. The sweep turns angle into time, so angle
// is rhythm and radius is note length — which means a ring of peaks at even
// angles is a steady pulse, and that is something you can write on purpose.

import { ELEV_BANDS } from './pitch';
import {
  ampForBand,
  BASIN_ROOT_BAND,
  CLICK_ROOT_BAND,
  makePeak,
  MERGE_DIST,
  type Peak,
} from './terrain';

export type Seed = { x: number; y: number; amp: number };

// Angle grid: 16 divisions of the revolution, same resolution as a 16-step bar.
const DIVISIONS = 16;
const STEP = (Math.PI * 2) / DIVISIONS;

// Bands are absolute positions in the palette, and rest already sits at band 4 —
// so anything at or below 5 is a depression, not a peak. Seeds live in the middle
// of the range: high enough to read as a standing range, low enough that the
// visitor still has most of the climb to white left to make.
//
// Four evenly spaced peaks — the sweep hits them at equal intervals, so the
// terrain has a pulse before anyone touches it.
const PULSE_STEPS = [0, 4, 8, 12];
const PULSE_BANDS = [9, 8, 9, 8];

// Off-grid accents, pitched above the pulse. Steps chosen to land between the
// pulse hits rather than on them.
const MELODY_STEPS = [2, 5, 9, 11, 14];
const MELODY_BANDS = [12, 11, 14, 12, 13];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

// The lattice is a disc, so reach is the same at every angle — which is the whole
// reason rotation can never carry a peak off the map.
const RIM_MARGIN = 0.88;

// An anchor makes a generated composition answer to a click: the first pulse peak
// lands on the clicked bearing at the clicked distance, so a summit appears exactly
// where the pointer was while everything else re-scatters around it.
export type Anchor = { angle: number; frac: number; sparse: boolean };

export function composeScatter(
  cx: number,
  cy: number,
  discRadius: number,
  anchor?: Anchor,
): Seed[] {
  const seeds: Seed[] = [];
  // Wide separation, because depth is additive: seeds that crowd stop reading as
  // separate summits and pool into a plateau.
  const minGap = MERGE_DIST * 3.2;

  const place = (angle: number, frac: number, amp: number) => {
    const r = discRadius * RIM_MARGIN * frac;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    // Never seed two peaks close enough to merge — that would collapse a written
    // rhythm into one louder hit.
    for (const s of seeds) {
      if (Math.hypot(s.x - x, s.y - y) < minGap) return;
    }
    seeds.push({ x, y, amp });
  };

  // Rotate the whole composition so no two loads look alike, but keep the
  // intervals intact — the pulse stays even wherever it starts. A click supplies
  // the phase instead of chance, which is what ties the result to the gesture.
  const phase = anchor ? anchor.angle : Math.random() * Math.PI * 2;
  // A shift-click composes the same shapes lower in the range — same arrangement,
  // darker reading.
  const shade = anchor?.sparse ? -4 : 0;

  PULSE_STEPS.forEach((step, i) => {
    // The anchored peak takes the clicked distance so the summit lands under the
    // pointer; the rest keep their generated spread.
    const frac = i === 0 && anchor ? anchor.frac : 0.42 + Math.random() * 0.2;
    place(phase + step * STEP, frac, ampForBand(pick(PULSE_BANDS, i) + shade));
  });

  MELODY_STEPS.forEach((step, i) => {
    // Jitter off the exact division so the melody swings instead of quantizing
    // dead onto the pulse.
    const jitter = (Math.random() - 0.5) * STEP * 0.45;
    place(
      phase + step * STEP + jitter,
      0.26 + Math.random() * 0.62,
      ampForBand(pick(MELODY_BANDS, i) + shade),
    );
  });

  // One basin, for the low end.
  place(phase + 6 * STEP, 0.62, ampForBand(BASIN_ROOT_BAND));

  return seeds;
}

export function seedToPeak(
  seed: Seed,
  id: number,
  cx: number,
  cy: number,
  now: number,
  rotation = 0,
): Peak {
  // Rotation is passed through for the same reason a click passes it: the seeded
  // layout is composed in screen space, so it has to be stored relative to where
  // the composition currently sits or a reset while turned lands askew.
  return makePeak(id, seed.x, seed.y, seed.amp, cx, cy, now, rotation, true);
}
