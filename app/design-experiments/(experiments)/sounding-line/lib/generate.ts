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

export function composeScatter(cx: number, cy: number, discRadius: number): Seed[] {
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
  // intervals intact — the pulse stays even wherever it starts.
  const phase = Math.random() * Math.PI * 2;

  PULSE_STEPS.forEach((step, i) => {
    place(phase + step * STEP, 0.42 + Math.random() * 0.2, ampForBand(pick(PULSE_BANDS, i)));
  });

  MELODY_STEPS.forEach((step, i) => {
    // Jitter off the exact division so the melody swings instead of quantizing
    // dead onto the pulse.
    const jitter = (Math.random() - 0.5) * STEP * 0.45;
    place(
      phase + step * STEP + jitter,
      0.26 + Math.random() * 0.62,
      ampForBand(pick(MELODY_BANDS, i)),
    );
  });

  // One basin, for the low end.
  place(phase + 6 * STEP, 0.62, ampForBand(BASIN_ROOT_BAND));

  return seeds;
}

export function seedToPeak(seed: Seed, id: number, cx: number, cy: number, now: number): Peak {
  return makePeak(id, seed.x, seed.y, seed.amp, cx, cy, now, 0, true);
}

// A click plants a chord, not a note.
//
// One click, one peak meant a dozen clicks before anything was worth hearing. A
// spoke of peaks at one angle all share a sector, so the sweep strikes them
// together — the click becomes a stacked multi-tone the way holding a column in a
// step sequencer does, and the terrain gains a ridge running outward rather than a
// lone pimple.
//
// Offsets are pentatonic degrees from the struck band: +2 is a third, +5 an
// octave. Any root gives a consonant stack, so aim barely matters.
const CHORD_OFFSETS = [0, 2, 4];
const BASIN_OFFSETS = [0, -2];
const SPOKE_GAP = MERGE_DIST * 3.4;

export function composeChord(
  x: number,
  y: number,
  isBasin: boolean,
  cx: number,
  cy: number,
  discRadius: number,
): Seed[] {
  const angle = Math.atan2(y - cy, x - cx);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const reach = discRadius * RIM_MARGIN;
  // A click outside the disc still plays — it is pulled to the rim rather than
  // ignored, because a dead zone is a fail state.
  const clicked = Math.min(Math.hypot(x - cx, y - cy), reach);

  const rootBand = isBasin ? BASIN_ROOT_BAND : CLICK_ROOT_BAND;
  const offsets = isBasin ? BASIN_OFFSETS : CHORD_OFFSETS;

  const seeds: Seed[] = [];
  offsets.forEach((offset, i) => {
    // Spread outward from the click along its own spoke, folding back inward if
    // the mesh edge is in the way, so a click near the rim still gets its chord.
    let r = clicked + i * SPOKE_GAP;
    if (r > reach - SPOKE_GAP * 0.5) r = clicked - i * SPOKE_GAP;
    if (r < SPOKE_GAP * 0.5) return;

    const band = Math.max(0, Math.min(ELEV_BANDS - 1, rootBand + offset));
    seeds.push({ x: cx + ca * r, y: cy + sa * r, amp: ampForBand(band) });
  });

  return seeds;
}
