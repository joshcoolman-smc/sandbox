// Terrain model and palette.
//
// The big departure from seismic-mesh: there is no node physics. A peak is a
// first-class object, and every node's depth is a pure function of the peaks
// around it. That buys persistence for free (peaks are data, not momentum),
// makes hover-hit-testing and sweep-hit-testing trivial, and stops the neighbor
// coupling from slowly diffusing a sculpted range into a smooth blob.
//
// It also means the plaque and the audio read the same number: a peak's band is
// computed from the terrain at its own centre, so a hovered peak always names
// the note that sounds on the next pass.

import { CELL_SIZE } from '../meshLayout';
import { bandOf, ELEV_BANDS } from './pitch';

// Camera directly above.
export const CAM_Z = 2200;
export const Z_CAP_UP = -(CAM_Z - 100);

// Resting elevation — uniform across the flat mesh, so the surface is one solid
// colour at rest and the topographic spectrum only appears where it's sculpted.
//
// Rest sits deliberately low in the spectrum rather than mid. At 0.5 the flat
// mesh is already green and a first click only nudges the colour — the gesture
// reads as nothing happening. Resting in the blue-teal end means the entire warm
// half of the palette is something the visitor earns, and one click is a visible
// three-band climb out of the cool.
export const BASE_ELEV = 0.3;
export const ELEV_SPAN = 0.9;

// Reference depth for scaling sigma with amplitude. Not a limit on anything — see
// cameraFor() for how a growing range is actually contained.
const SIGMA_REF = 1690;

export const CLICK_ROOT_BAND = 9; // a click's chord root: A3, palette turning warm
export const BASIN_ROOT_BAND = 1; // shift-click: deep blue, below every peak
export const CLICK_BOOST = 300; // one restack, one step along the cycle

// Peaks are broad and tall on purpose. Depth is additive, so wide gaussians
// crowding each other used to sum into one saturated plateau, and two passes were
// spent shrinking them to avoid it — which is why the mesh kept coming out dim,
// with the palette's warm end unreachable. The retreating camera removes the need:
// blowouts get framed rather than prevented, so peaks can be big again.
export const PEAK_SIGMA = CELL_SIZE * 1.3;
// A taller peak is still a broader one — without this, stacking toward the top of
// the range turns a peak into a needle that fans the lattice apart rather than
// growing into a mountain. Gentler now that peaks start narrower.
const SIGMA_GROWTH = 0.5;
export function peakSigma(amp: number): number {
  const ratio = Math.min(1, Math.abs(amp) / SIGMA_REF);
  return PEAK_SIGMA * (1 + ratio * SIGMA_GROWTH);
}
// Beyond ~3.2 sigma a peak's gaussian is negligible; skipping it keeps the
// per-frame cost linear in *nearby* peaks rather than all of them.
const REACH_SIGMAS = 3.2;

export const RISE_MS = 420; // amp eases in — the mountain still rises
export const MERGE_DIST = CELL_SIZE * 0.9; // click this close and it stacks
export const MAX_PEAKS = 48; // density guard; the oldest peak is dropped
export const PEAK_MIN_AMP = 14;

// Terrain does not erode. An earlier pass sank peaks over ~90s so the exhibit
// would clear itself for the next visitor, but retreating to flat throws away
// the thing worth doing here — you are building a range, and watching it drain
// is boring. A page load generates a fresh range instead, so reloading is the
// reset and nothing has to decay to get one.

// Floors, so a nearly-flat mesh doesn't amplify a single small bump into the whole
// spectrum. UP_FLOOR is also the reference ampForBand composes against.
export const UP_FLOOR = CAM_Z * 0.45;
export const DOWN_FLOOR = CAM_Z * 0.24;
export const SCALE_EASE_PER_S = 1.1;

const TOP_ELEV = 0.99;

// Amplitude that lands a peak in the centre of a given band, so the generator can
// be written in musical terms — ask for band 12 and get the depth that plays E4.
// Linear, because depth is no longer clamped.
export function ampForBand(band: number): number {
  const e = (band + 0.5) / ELEV_BANDS;
  return e >= BASE_ELEV
    ? ((e - BASE_ELEV) / (TOP_ELEV - BASE_ELEV)) * UP_FLOOR
    : -((BASE_ELEV - e) / BASE_ELEV) * DOWN_FLOOR;
}

// Clicking the same place again cycles: up the scale to the top band, then back
// down to the bottom, then up again. Shift-click still carves a basin outright, but
// it is no longer something you have to *know* — hold the pointer somewhere and
// keep clicking and the terrain breathes up and down on its own. A gesture nobody
// has to be told about beats a modifier key nobody discovers.
export const CYCLE_TOP = ampForBand(ELEV_BANDS - 1);
export const CYCLE_BOTTOM = ampForBand(0);

// Every peak is built here, so angle/radius can never be derived two
// different ways. `risen` is for seeded terrain, which should already be standing
// when the page paints rather than assembling itself while the visitor watches.
export function makePeak(
  id: number,
  x: number,
  y: number,
  amp: number,
  cx: number,
  cy: number,
  now: number,
  rotation = 0,
  risen = false,
): Peak {
  const raw = Math.atan2(y - cy, x - cx);
  const angle = raw < 0 ? raw + Math.PI * 2 : raw;
  return {
    id,
    x,
    y,
    amp: risen ? amp : 0,
    target: amp,
    bornAt: now,
    band: 0,
    // Stored unrotated, so a peak planted while the composition is turned keeps
    // its position under the pointer and still rotates coherently with the rest.
    baseAngle: angle - rotation,
    angle,
    lastRev: -Infinity,
    radius: Math.hypot(x - cx, y - cy),
    dir: 1,
    struckAt: -1,
  };
}

// Peaks are polar-native: position is derived from bearing plus the current
// rotation, every frame. The lattice itself never turns — landforms rotate through
// a fixed grid, which keeps the frame rectangular instead of sweeping empty corners
// across it, and means rotation costs one pass over the peaks rather than a rebuild.
export function applyRotation(peaks: Peak[], cx: number, cy: number, rotation: number) {
  const twoPi = Math.PI * 2;
  for (const p of peaks) {
    let a = (p.baseAngle + rotation) % twoPi;
    if (a < 0) a += twoPi;
    p.angle = a;
    p.x = cx + Math.cos(a) * p.radius;
    p.y = cy + Math.sin(a) * p.radius;
  }
}

export type Peak = {
  id: number;
  x: number;
  y: number;
  amp: number; // current, easing toward target
  target: number; // where amp is headed
  bornAt: number;
  band: number; // recomputed per frame from the terrain at (x, y)
  baseAngle: number; // unrotated bearing — the peak's identity on the map
  angle: number; // baseAngle + current rotation
  lastRev: number; // revolution index this peak last sounded on, so the
  // continuous sweep fires it exactly once per pass
  radius: number; // from mesh centre — sets note length
  dir: 1 | -1; // which way the next restack moves it along the cycle
  struckAt: number; // last time the sweep hit it, for the flare
};

// Signed depth contribution of every peak at a point. Negative = toward the
// camera = high ground.
export function terrainZ(x: number, y: number, peaks: Peak[]): number {
  let sum = 0;
  for (const p of peaks) {
    const dx = x - p.x;
    const dy = y - p.y;
    const d2 = dx * dx + dy * dy;
    const s = peakSigma(p.amp);
    const reach = s * REACH_SIGMAS;
    if (d2 > reach * reach) continue;
    sum += p.amp * Math.exp(-d2 / (2 * s * s));
  }
  // No ceiling. Terrain grows without limit and the camera retreats to keep it in
  // frame — see cameraFor(). An earlier pass clamped the sum with tanh instead,
  // which contained the blowout and cost more than it bought: it capped the
  // mountain you were building, and it silently broke ampForBand, so composed
  // seeds landed lower and duller than written. Containment belongs in the camera,
  // not in the landscape.
  return -sum;
}

// The palette auto-ranges.
//
// A fixed elevation scale forces an impossible choice: set it high and a modest
// range is dim with the warm end unreachable, set it low and a big one saturates —
// every tag reading C5, the music gone monotone at exactly the moment the terrain
// got interesting. Both failures happened, repeatedly, and no constant fixes both.
//
// So elevation is measured against the terrain's *own* current range, eased. The
// tallest summit is always near white and the plane is always band 4, so the full
// spectrum and the full scale stay in play however big the monstrosity grows. Same
// move as the retreating camera, applied to colour instead of framing.
export type ElevScale = { up: number; down: number };


export function elevOf(renderZ: number, scale?: ElevScale): number {
  const up = scale ? scale.up : UP_FLOOR;
  const down = scale ? scale.down : DOWN_FLOOR;
  const e =
    renderZ <= 0
      ? BASE_ELEV + (-renderZ / up) * (TOP_ELEV - BASE_ELEV)
      : BASE_ELEV - (renderZ / down) * BASE_ELEV;
  return e < 0 ? 0 : e > 1 ? 1 : e;
}

// The camera retreats.
//
// Elevation and perspective are separate quantities: elevation drives colour and
// pitch and stays anchored to a fixed reference, while the projection answers to a
// camera that moves. Two earlier attempts to contain a growing range both worked by
// crushing the geometry — damping the projection to 0.4, then clamping depth with
// tanh — and both bought framing at the cost of the drama that makes the mesh worth
// looking at.
//
// Instead the camera pulls back as the terrain grows, smoothly, so a range that
// would burst the frame instead becomes something you are standing further away
// from. Nothing is capped: peaks grow forever and the view simply widens. Because
// the retreat is eased over ~1.5s it reads as a camera move rather than a rescale —
// the mesh behaves like one organism you are backing away from.
export const PROJ_DAMP = 1;
// The clip band. Terrain may spill past the left and right edges, but never over
// the experiment header or the footer.
export const CLIP_TOP = 132;
export const CLIP_BOTTOM_PAD = 78;
// The steepest foreshortening allowed on the tallest point. The camera chooses its
// distance to hold this, which is what keeps a summit dramatic but not shredded.
const MAX_PROJ_SCALE = 1.7;
// Seconds-ish time constant for the retreat. Slow enough to read as a move.
export const CAM_EASE_PER_S = 1.6;

// Idle contemplation. When the clicking stops, the range starts breathing and the
// camera gives it a little more room — so a finished monstrosity is something to
// stand back and look at rather than a static diagram. seismic-mesh had this
// ambient ripple written and switched off (RIPPLE_AMP = 0) because it fought the
// backdrop during a quake; here it has somewhere to belong.
export const IDLE_AFTER_MS = 3400;
export const IDLE_MARGIN = 1.07; // extra camera distance once idle
export const BREATH_AMP = 52; // depth units at full breath
export const BREATH_K = 0.0075; // spatial frequency
export const BREATH_SPEED = 0.00035; // radians per ms
export const BREATH_EASE_PER_S = 0.6;

// Camera distance needed to hold the deepest point at MAX_PROJ_SCALE. Never closer
// than CAM_Z, so an empty mesh sits at 1:1 and the retreat only ever widens.
export function cameraFor(maxHeight: number, view: View = DEFAULT_VIEW): number {
  // Under tilt, height only closes part of the distance to the camera, so the
  // retreat needed is scaled by the same cosine the projection uses.
  const closest = maxHeight * HEIGHT_GAIN * view.cos * PROJ_DAMP;
  return Math.max(CAM_Z, closest + CAM_Z / MAX_PROJ_SCALE);
}

// Camera tilt — the holo-table.
//
// Plan view was the original reading and it wastes the whole idea: looking straight
// down, a mountain's height only shows as colour and a little foreshortening, and
// rotating reads as spinning a map rather than moving around terrain. Tilting the
// camera gives height somewhere to go — summits rise up the screen — and turns the
// rotation control into an orbit, because rotating the world under a tilted camera
// is the same thing as orbiting the camera around the world.
//
// 0 would be straight down, PI/2 would be at the horizon.
//
// Live rather than fixed: the right angle was a thing to find by eye, so it is a
// control. The default is where it landed — low, near the horizon, which is what
// lets a tall range recede into the distance instead of climbing out of frame.
export const TILT = (80 * Math.PI) / 180;
// The usable window, found by sweeping it. Below 35° the view flattens toward plan
// and height stops reading as height; past 80° the ground plane collapses toward a
// line and there is no surface left to sculpt.
export const TILT_MIN = (35 * Math.PI) / 180;
export const TILT_MAX = (80 * Math.PI) / 180;

// Precomputed sin/cos for one tilt angle. Passed in rather than recomputed per
// point: projectPoint runs once per mesh node per frame, and the trig is the only
// part of it that doesn't depend on the point.
export type View = { cos: number; sin: number };

export function viewFor(tilt: number): View {
  return { cos: Math.cos(tilt), sin: Math.sin(tilt) };
}

const DEFAULT_VIEW = viewFor(TILT);

// How much of a peak's world height becomes screen height.
//
// Without this the first tilted pass read as a side elevation rather than a table:
// depth values run to a couple of thousand while the plane is only ~400 deep, so
// mountains stood several times taller than the table itself. Terrain wants to be a
// fraction of the plane's depth to look like terrain *on* something.
const HEIGHT_GAIN = 0.26;

// Pushes the plane down the screen so summits have empty space to rise into rather
// than climbing straight out of the frame.
const VIEW_DROP = 74;

// Projects a point given as an offset from the table centre plus a height above the
// plane. At TILT === 0 this reduces exactly to the old plan-view projection: sy is
// ey, and depth is -h.
export function projectPoint(
  ex: number,
  ey: number,
  height: number,
  camZ: number,
  view: View = DEFAULT_VIEW,
): { sx: number; sy: number; scale: number } {
  const h = height * HEIGHT_GAIN;
  // Ground recedes with ey; height brings a point closer to an overhead camera.
  const depth = ey * view.sin - h * view.cos * PROJ_DAMP;
  const denom = camZ + depth;
  const scale = CAM_Z / (denom < 240 ? 240 : denom);
  return {
    sx: ex * scale,
    // Height lifts up the screen, and the ground plane compresses into a band —
    // which is what leaves vertical room for the mountains to stand up in.
    sy: (ey * view.cos - h * view.sin) * scale + VIEW_DROP,
    scale,
  };
}

// A peak's own band, including whatever its neighbours add. Merging two peaks
// into a ridge raises the pitch of both — the emergent behaviour that makes
// placing peaks near each other worth doing.
export function bandAtPeak(p: Peak, peaks: Peak[], scale: ElevScale): number {
  return bandOf(elevOf(terrainZ(p.x, p.y, peaks), scale));
}

const TOPO_STOPS: { t: number; rgb: [number, number, number] }[] = [
  { t: 0.0, rgb: [10, 26, 58] }, // deep blue
  { t: 0.28, rgb: [17, 80, 122] }, // blue-teal
  { t: 0.5, rgb: [31, 138, 76] }, // green
  { t: 0.7, rgb: [201, 194, 58] }, // yellow
  { t: 0.86, rgb: [217, 138, 43] }, // amber
  { t: 1.0, rgb: [245, 245, 240] }, // white
];

function topoRgb(t: number): [number, number, number] {
  for (let s = 0; s < TOPO_STOPS.length - 1; s++) {
    const a = TOPO_STOPS[s];
    const b = TOPO_STOPS[s + 1];
    if (t <= b.t) {
      const f = (t - a.t) / (b.t - a.t);
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f),
      ];
    }
  }
  return TOPO_STOPS[TOPO_STOPS.length - 1].rgb;
}

// Precomputed per-band styles — elevation quantizes into these, one stroke per band.
export const EDGE_COLORS: string[] = [];
export const NODE_COLORS: string[] = [];
export const NODE_RADII: number[] = [];
export const BAND_HEX: string[] = [];
for (let b = 0; b < ELEV_BANDS; b++) {
  const e = (b + 0.5) / ELEV_BANDS;
  const [r, g, bl] = topoRgb(e);
  EDGE_COLORS.push(`rgba(${r},${g},${bl},${(0.22 + e * 0.7).toFixed(3)})`);
  NODE_COLORS.push(`rgba(${r},${g},${bl},${(0.3 + e * 0.65).toFixed(3)})`);
  NODE_RADII.push(0.8 + e * 1.8);
  BAND_HEX.push(`rgb(${r},${g},${bl})`);
}
