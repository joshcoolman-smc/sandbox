// The label plaque for a peak. Exploratorium exhibits have plaques; they just
// don't block the table. This is the only place the color→pitch mapping is
// spelled out — hover a white peak, read C5, hear it on the next pass.
//
// Fully deterministic from the peak's coordinates and band. No Math.random:
// the panel is recomputed while the pointer rests on a peak, and a randomized
// field would visibly churn.

import { ELEV_BANDS, freqForDegree, noteName } from '../lib/pitch';

export type Plaque = {
  title: string;
  note: string;
  rows: { k: string; v: string }[];
  ref: string;
};

// Deterministic 0..1 from an integer seed — cheap hash, no allocation.
function frac(seed: number): number {
  const s = Math.sin(seed) * 43758.5453;
  return s - Math.floor(s);
}

export function makePlaque(
  x: number,
  y: number,
  W: number,
  H: number,
  band: number,
  amp: number,
  degree: number,
): Plaque {
  const u = W > 0 ? x / W : 0;
  const v = H > 0 ? y / H : 0;
  const seed = ((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663)) >>> 0;

  const lat = (32 + (1 - v) * 16 + frac(seed) * 0.4).toFixed(2);
  const lon = (98 + u * 24 + frac(seed + 1) * 0.4).toFixed(2);
  // Signed: a basin reads as depth below datum, a peak as height above.
  const metres = Math.round(Math.abs(amp) * 3.1 + frac(seed + 2) * 40);

  return {
    title: amp < 0 ? 'BASIN' : 'STATION',
    note: noteName(degree),
    rows: [
      {
        k: 'ELEVATION',
        v: `${amp < 0 ? '-' : '+'}${metres.toLocaleString('en-US')} M`,
      },
      { k: 'POSITION', v: `${lat}N ${lon}W` },
      { k: 'BAND', v: `${band + 1} / ${ELEV_BANDS}` },
      { k: 'PITCH', v: `${freqForDegree(degree).toFixed(2)} HZ` },
    ],
    ref: `REF 0x${seed.toString(16).toUpperCase().padStart(8, '0')}`,
  };
}
