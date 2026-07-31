// experiment: Sounding Line — a hex mesh you sculpt by clicking. The page loads
// with a composed range already standing, and a line sweeps round from the centre;
// every peak it crosses sounds a note pitched to that peak's
// elevation, so the topographic colour is the note. A click plants a chord along
// its spoke; clicking the same place again cycles it up the scale and back down.
// Hover a peak for its plaque.
//
// Nothing is capped. Terrain grows without limit, the camera retreats to keep it in
// frame, and the palette re-ranges against the terrain's own height so the scale
// never collapses onto one note. See PLAN.md for what that replaced.
'use client';

import { useEffect, useRef, useState } from 'react';
import { DecodeText } from '@/app/components/DecodeText';
import { makePlaque, type Plaque } from './data/plaque';
import { createEngine, type Engine } from './lib/audio';
import { composeScatter, seedToPeak } from './lib/generate';
import { BAND_HEX, EDGE_COLORS, NODE_COLORS, NODE_RADII } from './lib/terrain';
import {
  BREATH_AMP,
  BREATH_EASE_PER_S,
  BREATH_K,
  BREATH_SPEED,
  CAM_EASE_PER_S,
  CAM_Z,
  cameraFor,
  IDLE_AFTER_MS,
  IDLE_MARGIN,
  applyRotation,
  CLIP_BOTTOM_PAD,
  CLIP_TOP,
  DOWN_FLOOR,
  elevOf,
  makePeak,
  MAX_PEAKS,
  PEAK_MIN_AMP,
  projectPoint,
  TILT,
  TILT_MAX,
  TILT_MIN,
  viewFor,
  RISE_MS,
  SCALE_EASE_PER_S,
  terrainZ,
  UP_FLOOR,
  type Peak,
} from './lib/terrain';
import {
  bandOf,
  clampDegree,
  ELEV_BANDS,
  type Layer,
  LAYER_KEYS,
  MAX_ROTATION_STEPS,
  noteName,
  REV_MS,
  STEP_ANGLE,
  GROUP_STEPS,
  GROUPS_PER_REV,
  HIGH_PER_GROUP,
  MID_PER_GROUP,
  STEP_MS,
  STEPS,
  ZONE_MID_TOP,
  ZONE_STAGGER_JITTER,
  ZONE_STAGGER_MS,
} from './lib/pitch';
import { bassFor, bassPartnerFor, chordAt, voiceFor } from './lib/harmony';
import { meshGrid } from './meshLayout';
import './styles.css';

// The sweep's tempo and step count live in lib/pitch.ts, next to the scale — they
// are musical settings, not drawing settings. Deliberately not controls.
const SWEEP_SAMPLES = 90; // points along the ray, so the line drapes over terrain
const TRAIL_RAYS = 7; // ghost rays trailing the live one, forming the smear
const TRAIL_SPREAD = 0.4; // radians the whole trail covers

const MAX_PAN = 0.85;
const FLARE_MS = 340;

// Percussion divisions per revolution. 16 over a 3840ms pass puts a kick every
// 480ms — 125bpm, the tempo the sweep was originally clocked at, with hats on the
// offbeats between them.
const BEAT_PER_REV = 16;



// The tilt control runs backwards: hard left is the lowest, most cinematic angle
// (the default) and pulling right raises the camera toward plan view. So the track
// carries "how far from the default", and the slider's own value is the inverse of
// the angle — which is why the readout is computed rather than bound directly.
const TILT_DEG_MIN = Math.round((TILT_MIN * 180) / Math.PI);
const TILT_DEG_MAX = Math.round((TILT_MAX * 180) / Math.PI);

// Rotation glides instead of jumping. Time constant of an exponential ease, so a
// notch covers most of its travel in about this long and settles without
// overshoot — a spring would wobble the terrain past its landing angle and the
// pitch would flicker across the boundary with it.
const ROT_EASE_MS = 620;
// Below this the glide is finished; snapping the remainder stops an asymptote
// from re-sorting peak positions by fractions of a pixel forever.
const ROT_SETTLE = 0.0004;

// Click splash — render-only, never touches the terrain. The visual receipt
// that something landed.
const WAVE_SPEED = 0.9; // px/ms
const WAVE_AMP = 90; // render-Z units at the crest
const WAVE_SIGMA = 70; // px — gaussian half-width of the moving ring
const WAVE_K = 0.035; // rad/px — oscillation density inside the ring
const WAVE_LIFETIME = 2600;

// Plaque geometry — must track .sl-plaque in styles.css so the canvas leader
// line lands on the panel edge.
const PANEL_W = 252;
const PANEL_H = 186;
const PANEL_GAP = 44;
const HOVER_R = 24;

type Wave = { x: number; y: number; startTime: number; amp: number };

type Hover = {
  peakId: number;
  band: number;
  left: number;
  top: number;
  flipped: boolean;
  plaque: Plaque;
};

function panelPos(x: number, y: number, W: number, H: number) {
  let left = x + PANEL_GAP;
  let flipped = false;
  if (left + PANEL_W > W - 16) {
    left = x - PANEL_GAP - PANEL_W;
    flipped = true;
  }
  if (left < 16) left = 16;
  const top = Math.max(100, Math.min(y - PANEL_H / 2, H - PANEL_H - 16));
  return { left, top, flipped };
}

export default function SoundingLine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  // Audio cannot start before a user gesture (autoplay policy), so a freshly
  // loaded page shows a standing range with markers on it and makes no sound —
  // which reads as broken rather than as a browser rule. The state drives a single
  // word of chrome that turns itself off for good the moment audio is live.
  const [audioLive, setAudioLive] = useState(false);
  // Rotation is React state so the slider is controlled, and a ref so the render
  // loop can read it without re-running the effect and rebuilding the mesh.
  const [rotationSteps, setRotationSteps] = useState(0);
  const rotationRef = useRef(0);
  // Tilt is held in degrees for the control and converted to radians for the
  // projection — a slider labelled in radians is a slider nobody can read.
  const [tiltDeg, setTiltDeg] = useState(Math.round((TILT * 180) / Math.PI));
  const tiltRef = useRef(TILT);
  // Sound layers, in the spirit of step-sequencer's channel toggles: the pleasure
  // of that experiment was hearing the same pattern with the beat and without it.
  // The three registers are the piece, so they start on; the beat is an addition, so
  // it starts off and is something you find.
  const [layers, setLayers] = useState({ low: true, mid: true, high: true, beat: false });
  const layersRef = useRef(layers);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const engineRef = useRef<Engine | null>(null);
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    rotationRef.current = rotationSteps;
  }, [rotationSteps]);

  useEffect(() => {
    tiltRef.current = (tiltDeg * Math.PI) / 180;
  }, [tiltDeg]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    mutedRef.current = muted;
    engineRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = createEngine();
    engineRef.current = engine;
    engine.setMuted(mutedRef.current);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const peaks: Peak[] = [];
    const waves: Wave[] = [];
    const pending: { x: number; y: number; isBasin: boolean }[] = [];
    let nextId = 1;
    let points: { x: number; y: number }[] = [];
    let edges: [number, number][] = [];
    let cx = 0;
    let cy = 0;
    let discRadius = 1;

    // Sweep position is tracked in revolutions — unwrapped, fractional and
    // monotonic — so a crossing resolves to an exact wall-clock moment that can be
    // handed to the audio clock.
    let revs = 0;
    let originMs = 0;
    // Last percussion division fired, so a dropped frame catches up rather than
    // silently swallowing a beat.
    let lastPulse = -1;
    // Last four-step group the bass bed was struck on.
    let lastBedGroup = -1;
    // The last four-step group each layer sounded in. One note per layer per group is
    // the rule the whole arrangement rests on — see the group comment in lib/pitch.ts.
    // Everything else in the group is a rest, and the rests are what make the notes
    // that do sound seem chosen.
    // Notes already placed in a given group per layer, so a busy stretch of terrain
    // can't exceed the per-beat polyphony the arrangement is built on.
    const groupUse = new Map<string, number>();

    // The slider's value is a target; this is where the composition actually is.
    // Everything that has to agree with what the eye sees — peak positions, the
    // marker labels, the plaque, the pitch that sounds — reads these two rather
    // than the slider, so a note can never name a position the terrain has not
    // reached yet.
    let rotAngle = 0;
    let liveTranspose = 0;
    // The chord currently sounding. Held here so the marker labels and the plaque
    // can name the note a peak would actually play right now — under the old model
    // they printed a pitch derived from the band, which is no longer what sounds.
    let liveChord = chordAt(0);

    // Tilt eases toward the slider on the same curve as rotation, so changing the
    // angle reads as the camera swinging down rather than as a cut. `view` is the
    // frame's precomputed sin/cos, rebuilt once per frame and handed to every
    // projection so the whole scene is drawn from one camera.
    let tiltAngle = TILT;
    let view = viewFor(TILT);
    // Camera distance, eased toward whatever the current terrain needs. Seeded at
    // CAM_Z so the first frame is 1:1 rather than snapping outward.
    let camZ = CAM_Z;
    let maxDepth = 0;
    let lastClickMs = 0;
    let breath = 0; // 0..1, eases in while idle
    // Eased elevation range, so the palette and the scale track the terrain.
    const elevScale = { up: UP_FLOOR, down: DOWN_FLOOR };
    let frameMaxUp = 0;
    let frameMaxDown = 0;
    let lastFrameMs = 0;
    let seeded = false;
    let liveReported = false;

    const pointer = { x: -1, y: -1 };
    let hoverId = 0;
    let hoverBand = -1;

    // Reused per-frame scratch, sized on build.
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let elev = new Float32Array(0);
    const edgeBuckets: number[][] = Array.from({ length: ELEV_BANDS }, () => []);
    const nodeBuckets: number[][] = Array.from({ length: ELEV_BANDS }, () => []);

    function build() {
      if (!canvas || !ctx) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);

      const mesh = meshGrid(W, H);
      points = mesh.points;
      edges = mesh.edges;
      cx = mesh.cx;
      cy = mesh.cy;
      discRadius = mesh.radius;

      px = new Float32Array(points.length);
      py = new Float32Array(points.length);
      elev = new Float32Array(points.length);
    }
    build();
    window.addEventListener('resize', build);

    // Reset composes a brand new range rather than emptying the mesh. A blank grid
    // is the one state this page has no reason to show — the generator exists
    // precisely so nobody has to click their way out of nothing.
    resetRef.current = () => {
      peaks.length = 0;
      waves.length = 0;
      seeded = false;
      setHover(null);
      hoverId = 0;
      hoverBand = -1;
    };

    // World point at a given depth → screen. renderZ is negative for high ground,
    // so height is its negation.
    function project(x: number, y: number, renderZ: number): [number, number] {
      const { sx, sy } = projectPoint(x - cx, y - cy, -renderZ, camZ, view);
      return [cx + sx, cy + sy];
    }

    function normAngle(a: number): number {
      const t = a % (Math.PI * 2);
      return t < 0 ? t + Math.PI * 2 : t;
    }

    // Clicks are queued and applied at the top of the next frame, stamped with
    // the rAF clock. The two timebases can drift apart by more than a frame when
    // rAF is throttled, and a peak born "in the future" makes every age-driven
    // animation compute backwards.
    function onClick(e: MouseEvent) {
      if (e.target !== canvas) return; // let the header's own links be links
      engine.start();
      pending.push({ x: e.clientX, y: e.clientY, isBasin: e.shiftKey });
    }
    window.addEventListener('click', onClick);

    // Any press anywhere unlocks audio — the header, the footer, the reset button —
    // so the range starts sounding at the first sign of life rather than requiring a
    // click on the mesh specifically.
    function onPointerDown() {
      engine.start();
    }
    window.addEventListener('pointerdown', onPointerDown);

    function applyClick(x: number, y: number, isBasin: boolean, timestamp: number) {
      // A click composes a new range rather than adding to the old one.
      //
      // The additive model — plant a chord, restack what you hit — was the source of
      // three separate complaints and they were all the same complaint. Terrain grew
      // without limit, so the camera kept retreating and summits climbed out of the
      // frame. Clicks near the rim folded their chord inward and grew the middle
      // instead. And density was whatever had accumulated, which meant the
      // arrangement drifted from sparse to porridge with no way back.
      //
      // Generating instead fixes all three at once, and it is closer to what makes
      // step-sequencer fun: you press the button, something new and coherent happens,
      // and it is always in range. The count stays around a dozen, the elevations stay
      // inside the band scale, and every click is a fresh arrangement rather than a
      // deposit on top of the last one.
      //
      // The gesture still matters: the composition is anchored to the click, so a
      // summit lands under the pointer at the distance you clicked, and the phase of
      // the whole pattern turns with it.
      const angle = Math.atan2(y - cy, x - cx);
      const reach = discRadius * 0.88;
      const frac = Math.min(1, Math.max(0.16, Math.hypot(x - cx, y - cy) / reach));

      // The outgoing range sinks rather than vanishing, so a click reads as the
      // landscape changing shape over ~400ms instead of as a cut. Culling happens in
      // the frame loop once a peak's amplitude reaches nothing.
      for (const p of peaks) p.target = 0;

      for (const seed of composeScatter(cx, cy, discRadius, { angle, frac, sparse: isBasin })) {
        // The current rotation has to be passed, not defaulted: makePeak stores the
        // bearing unrotated and applyRotation adds the rotation back next frame.
        // Planting at rotation 0 while the composition is turned threw peaks off the
        // pointer by the whole rotation angle.
        peaks.push(makePeak(nextId++, seed.x, seed.y, seed.amp, cx, cy, timestamp, rotAngle));
      }
      if (peaks.length > MAX_PEAKS) peaks.splice(0, peaks.length - MAX_PEAKS);

      if (!reduced) {
        waves.push({ x, y, startTime: timestamp, amp: WAVE_AMP });
      }
    }

    function onPointerMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }
    window.addEventListener('pointermove', onPointerMove);
    function onPointerLeave() {
      pointer.x = -1;
      pointer.y = -1;
    }
    window.addEventListener('pointerleave', onPointerLeave);

    // --- The sweep ----------------------------------------------------------
    // The line glides; the notes land on a grid, and the pitches come from the
    // current chord rather than from the terrain.
    //
    // Three separate decisions, and it matters that they are separate:
    //
    // The *line* moves continuously, because that is what makes it feel organic.
    //
    // The *notes* snap to sixteen divisions of the revolution. A dozen peaks firing
    // at a dozen arbitrary moments gives the ear no downbeat to organize around; it
    // reads as hammering however consonant each note is. A pass without the grid was
    // tried and it was mud. Quantizing is why step-sequencer always sounds
    // deliberate. Sight and sound still agree because the flare fires on the
    // quantized moment too — half a step of 240ms, under a 45ms attack, is
    // imperceptible, and far cheaper than scattering the music.
    //
    // The *pitch* is a voice of the chord that is currently sounding, chosen by the
    // peak's height. See lib/harmony.ts for why elevation stopped picking
    // frequencies directly.
    function soundCrossings(toRev: number, W: number) {
      const twoPi = Math.PI * 2;
      const transpose = liveTranspose;
      const crossings: { p: Peak; when: number; step: number }[] = [];

      for (const p of peaks) {
        const phase = p.angle / twoPi;
        // Latest revolution index whose crossing has already happened.
        const k = Math.floor(toRev - phase);
        if (k < 0 || k <= p.lastRev) continue;
        p.lastRev = k;
        // Snap to the nearest division of the revolution.
        const step = Math.round((phase + k) * STEPS);
        crossings.push({ p, when: originMs + (step / STEPS) * REV_MS, step });
      }
      if (crossings.length === 0) return;

      // Tallest first: when the budget bites, the summits are what the visitor
      // built and what they expect to hear.
      crossings.sort((a, b) => b.p.band - a.p.band);

      for (const { p, when, step } of crossings) {
        p.struckAt = when;
        if (!engine.ready()) continue;

        const chord = chordAt(step / STEPS);

        // A crossing plays a small figure, not a single note.
        //
        // This is the piece of step-sequencer's generator that makes it sound rich:
        // its lead isn't one cell per hit, it's a 2-3 cell stamp stepping diagonally
        // up the grid — which on a pentatonic row layout is an arpeggio. Without it,
        // density here is capped by peak count rather than by anything musical: a
        // dozen peaks over 32 steps leaves most beats empty however high the
        // ceilings are.
        //
        // Figure length rides elevation, loosely: a summit runs three notes, a mound
        // two, a bump one. That is the whole of the height mapping on this side — it
        // is felt rather than computed, and the top note of a tall figure jumps the
        // octave so summits sparkle.
        const figure = 1 + Math.min(2, Math.floor(p.band / 6));
        const tall = p.band > ZONE_MID_TOP;
        const pan = Math.max(-MAX_PAN, Math.min(MAX_PAN, ((p.x - W / 2) / (W / 2)) * MAX_PAN));
        const dur = (STEP_MS * 1.6) / 1000;
        // Fixed lean per peak, from its bearing — a figure that flams differently
        // every pass reads as sloppy timing, one that always leans the same way reads
        // as that peak's character.
        const swing = ((p.angle / twoPi) % 1) * ZONE_STAGGER_JITTER * ZONE_STAGGER_MS;

        for (let i = 0; i < figure; i++) {
          const top = i === figure - 1;
          const layer: Layer = tall && top ? 'high' : 'mid';
          if (!layersRef.current[layer]) continue;

          // Successive notes step up the chord, one grid step apart — the diagonal.
          const noteStep = step + i;
          const g = Math.floor(noteStep / GROUP_STEPS);
          const key = `${g}:${layer}`;
          const cap = layer === 'high' ? HIGH_PER_GROUP : MID_PER_GROUP;
          const used = groupUse.get(key) ?? 0;
          if (used >= cap) continue;
          groupUse.set(key, used + 1);
          if (groupUse.size > 128) groupUse.clear();

          const degree = voiceFor(p.band, chord, layer === 'high') + i;
          const at = originMs + (noteStep / STEPS) * REV_MS + swing;
          engine.note(layer, clampDegree(degree + transpose), engine.at(at), dur, pan);
        }
      }
    }

    // The bass bed.
    //
    // LOW is no longer "peaks that happen to be low" — that set was almost always
    // empty, since a click roots its chord at band 9 and only a shift-click basin
    // ever lands beneath band 3. The toggle promised a register and delivered
    // silence.
    //
    // Instead LOW *is* the bed: the root of the current chord, struck once per group
    // of four steps — four times a pass, one per bar-ish. One note per revolution was
    // the first attempt and it was a drone, not a bass line: held 3s with a 2.4s tail
    // against a 3.84s spacing, every note began inside the tail of the one before it,
    // and across a chord change two different roots overlapped. Nothing to count.
    //
    // It belongs to the harmony's clock rather than to the terrain, which is why it
    // works — a root arriving on the beat is what tells the ear that everything above
    // it is a chord rather than a pile of notes. It is also the one voice that should
    // not change when you sculpt.
    function soundBed(toRev: number) {
      const group = Math.floor(toRev * GROUPS_PER_REV);
      if (!engine.ready() || !layersRef.current.low) {
        // Keep the counter current while the layer is off, so switching it back on
        // starts at the next downbeat instead of firing a backlog.
        lastBedGroup = group;
        return;
      }
      while (lastBedGroup < group) {
        lastBedGroup++;
        const beat = lastBedGroup / GROUPS_PER_REV;
        const when = originMs + beat * REV_MS;
        const chord = chordAt(beat);
        // Root on the beat, fifth one step behind it — the staggered pair that makes
        // a low end roll instead of pedal. Each stops short of the next, so they stay
        // countable.
        const hold = (STEP_MS * 1.4) / 1000;
        engine.note('low', clampDegree(bassFor(chord) + liveTranspose), engine.at(when), hold, 0);
        engine.note(
          'low',
          clampDegree(bassPartnerFor(chord) + liveTranspose),
          engine.at(when + STEP_MS),
          hold,
          0
        );
      }
    }

    // The beat runs on the revolution rather than on the terrain.
    //
    // Percussion has no pitch to take from a peak, so there is nothing for it to
    // read off the landscape — it divides the sweep's own cycle instead. Locking it
    // to the revolution means the beat and the sweep never drift apart, so a peak
    // near a division reliably lands on the beat and the whole pass has a pulse
    // without the pads being quantized back onto a grid.
    function soundBeat(toRev: number) {
      if (!engine.ready() || !layersRef.current.beat) return;
      const pulse = Math.floor(toRev * BEAT_PER_REV);
      while (lastPulse < pulse) {
        lastPulse++;
        const when = originMs + (lastPulse / BEAT_PER_REV) * REV_MS;
        const slot = ((lastPulse % GROUP_STEPS) + GROUP_STEPS) % GROUP_STEPS;
        const beat = Math.floor(lastPulse / GROUP_STEPS) % GROUPS_PER_REV;
        // Kick on every beat, hat on the offbeat behind it, clap on beats 2 and 6 —
        // the backbeat. Straight out of what step-sequencer's generator writes.
        if (slot === 0) {
          engine.drum('kick', engine.at(when));
          if (beat === 2 || beat === 6) engine.drum('clap', engine.at(when));
        } else if (slot === 2) {
          engine.drum('hat', engine.at(when));
        }
      }
    }

    // Draw one ray from centre to the mesh edge, draped over the terrain so the
    // line visibly reads the mountains it is sounding.
    function drapedRay(angle: number, alpha: number, width: number) {
      if (!ctx) return;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const reach = discRadius;
      ctx.beginPath();
      for (let i = 0; i <= SWEEP_SAMPLES; i++) {
        const r = (i / SWEEP_SAMPLES) * reach;
        const wx = cx + ca * r;
        const wy = cy + sa * r;
        const [sx, sy] = project(wx, wy, terrainZ(wx, wy, peaks));
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = `rgba(190,225,255,${alpha.toFixed(3)})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    function drawFlares(timestamp: number) {
      if (!ctx) return;
      for (const p of peaks) {
        if (p.struckAt < 0) continue;
        const age = timestamp - p.struckAt;
        if (age < 0 || age > FLARE_MS) continue;
        const t = age / FLARE_MS;
        const [sx, sy] = project(p.x, p.y, terrainZ(p.x, p.y, peaks));
        ctx.beginPath();
        ctx.arc(sx, sy, 4 + t * 26, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245,245,240,${(0.5 * (1 - t)).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // Every peak carries a standing marker: a red triangle sitting above the
    // summit and pointing down at it, with the note beside it. The hover plaque is
    // the full label; this is the map pin, so the terrain reads as a map of
    // *stations* and the composition is legible without probing peak by peak.
    //
    // Red on purpose — it is the one hue absent from the topographic palette, so a
    // marker can never be mistaken for elevation. Band-coloured labels were the
    // first attempt and they camouflaged against the very terrain they annotate.
    function drawTags() {
      if (!ctx) return;
      ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'middle';
      for (const p of peaks) {
        const [sx, sy] = project(p.x, p.y, terrainZ(p.x, p.y, peaks));
        const active = p.id === hoverId;
        const tipY = sy - 9;
        const topY = tipY - 9;

        ctx.fillStyle = active ? '#ff5b4a' : 'rgba(232,62,44,0.92)';
        ctx.beginPath();
        ctx.moveTo(sx, tipY);
        ctx.lineTo(sx - 5.5, topY);
        ctx.lineTo(sx + 5.5, topY);
        ctx.closePath();
        ctx.fill();

        const label = noteName(clampDegree(voiceFor(p.band, liveChord, false) + liveTranspose));
        const lx = sx + 9;
        // Dark plate behind the type so it stays readable over bright terrain.
        const w = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(5,5,5,0.66)';
        ctx.fillRect(lx - 2, topY - 1, w + 5, 13);
        ctx.fillStyle = active ? '#fff' : 'rgba(245,245,240,0.9)';
        ctx.fillText(label, lx, topY + 5.5);
      }
    }

    function drawLeader(fromX: number, fromY: number, W: number, H: number) {
      if (!ctx || !hoverId) return;
      const p = peaks.find(q => q.id === hoverId);
      if (!p) return;
      const { left, top, flipped } = panelPos(p.x, p.y, W, H);
      const tx = flipped ? left + PANEL_W : left;
      const ty = top + PANEL_H / 2;
      ctx.beginPath();
      ctx.arc(fromX, fromY, 9, 0, Math.PI * 2);
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = 'rgba(245,245,240,0.34)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function draw(timestamp: number) {
      if (!canvas || !ctx) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (!originMs) {
        originMs = timestamp;
        lastFrameMs = timestamp;
      }
      const dt = Math.min(0.05, (timestamp - lastFrameMs) / 1000);
      lastFrameMs = timestamp;

      // Transparent — the container background and FieldGrid show through.
      ctx.clearRect(0, 0, W, H);

      // Everything the mesh draws is confined to the band between header and
      // footer. This is what lets the projection run near full strength: terrain
      // can tower without ever climbing over the type.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, CLIP_TOP, W, H - CLIP_TOP - CLIP_BOTTOM_PAD);
      ctx.clip();

      // A composed range is already standing when the page paints. Seeded on the
      // first frame rather than in build(), so it survives a resize instead of
      // being regenerated under the visitor.
      if (!seeded) {
        seeded = true;
        for (const seed of composeScatter(cx, cy, discRadius)) {
          peaks.push(seedToPeak(seed, nextId++, cx, cy, timestamp, rotAngle));
        }
      }

      while (pending.length) {
        const c = pending.shift()!;
        applyClick(c.x, c.y, c.isBasin, timestamp);
        lastClickMs = timestamp;
      }

      // Terrain lifecycle: ease toward target, cull anything cancelled out to
      // nothing. Nothing erodes — the range you build is the range that stays.
      const ease = 1 - Math.exp((-dt * 3000) / RISE_MS);
      for (let i = peaks.length - 1; i >= 0; i--) {
        const p = peaks[i];
        p.amp += (p.target - p.amp) * ease;
        if (Math.abs(p.target) < PEAK_MIN_AMP && Math.abs(p.amp) < PEAK_MIN_AMP) {
          peaks.splice(i, 1);
        }
      }
      // Rotation turns the landforms through the fixed lattice, so the same gesture
      // shifts when each one is crossed. The matching transpose is applied where
      // notes are sounded.
      //
      // The slider steps, but the composition glides to it: the terrain arriving
      // as slowly as the sweep travels is what keeps the piece feeling turned
      // rather than switched. Pitch cannot glide with it — there are no degrees
      // between scale degrees — so the transpose flips at the halfway point,
      // which is also the moment the terrain most looks like it has arrived.
      const rotTarget = rotationRef.current * STEP_ANGLE;
      const gap = rotTarget - rotAngle;
      rotAngle =
        Math.abs(gap) < ROT_SETTLE
          ? rotTarget
          : rotAngle + gap * (1 - Math.exp((-dt * 1000) / ROT_EASE_MS));
      liveTranspose = Math.round(rotAngle / STEP_ANGLE);
      applyRotation(peaks, cx, cy, rotAngle);

      // Tilt glides on the same curve, then the camera basis is rebuilt for the
      // frame. Swinging the camera down toward the horizon is what gives a tall
      // range somewhere to stand: distance compresses the far half of the plane,
      // so height costs less vertical screen space the lower the angle gets.
      const tiltTarget = Math.max(TILT_MIN, Math.min(TILT_MAX, tiltRef.current));
      const tiltGap = tiltTarget - tiltAngle;
      tiltAngle =
        Math.abs(tiltGap) < ROT_SETTLE
          ? tiltTarget
          : tiltAngle + tiltGap * (1 - Math.exp((-dt * 1000) / ROT_EASE_MS));
      view = viewFor(tiltAngle);

      // Bands come from the summed terrain, so a merged ridge lifts the pitch of
      // both peaks.
      for (const p of peaks) {
        p.band = bandOf(elevOf(terrainZ(p.x, p.y, peaks), elevScale));
      }

      // Advance the sweep and sound everything the line passed. Crossings are
      // resolved against the peak's own bearing rather than per frame, so a
      // dropped frame still fires its notes at their true moments instead of
      // bunching them onto the recovery frame.
      revs = (timestamp - originMs) / REV_MS;
      liveChord = chordAt(revs);
      soundBed(revs);
      soundCrossings(revs, W);
      soundBeat(revs);

      // Cull dead splash waves once per frame.
      if (waves.length) {
        for (let i = waves.length - 1; i >= 0; i--) {
          if (timestamp - waves[i].startTime >= WAVE_LIFETIME) waves.splice(i, 1);
        }
      }

      // Retreat the camera toward what last frame's terrain needed. Using the
      // previous frame's measured depth costs one frame of lag and saves walking
      // every node twice.
      const idle = !reduced && lastClickMs > 0 && timestamp - lastClickMs > IDLE_AFTER_MS;
      breath += ((idle ? 1 : 0) - breath) * (1 - Math.exp(-dt * BREATH_EASE_PER_S));
      const camTarget = cameraFor(maxDepth, view) * (1 + (IDLE_MARGIN - 1) * breath);
      camZ += (camTarget - camZ) * (1 - Math.exp(-dt * CAM_EASE_PER_S));

      const scaleEase = 1 - Math.exp(-dt * SCALE_EASE_PER_S);
      elevScale.up += (Math.max(UP_FLOOR, frameMaxUp) - elevScale.up) * scaleEase;
      elevScale.down += (Math.max(DOWN_FLOOR, frameMaxDown) - elevScale.down) * scaleEase;
      frameMaxUp = 0;
      frameMaxDown = 0;

      let frameMaxDepth = 0;

      // Project every node. Render depth is terrain plus splash; elevation comes
      // from the same number, so the splash paints moving colour for free.
      const waveSigma2 = 2 * WAVE_SIGMA * WAVE_SIGMA;
      const breathPhase = timestamp * BREATH_SPEED;
      const breathAmp = BREATH_AMP * breath;
      for (let i = 0; i < points.length; i++) {
        const node = points[i];
        let z = terrainZ(node.x, node.y, peaks);
        if (breathAmp > 0.5) {
          z += breathAmp * Math.sin(node.x * BREATH_K + node.y * BREATH_K * 0.7 + breathPhase);
        }
        for (const w of waves) {
          const age = timestamp - w.startTime;
          const front = age * WAVE_SPEED;
          const dx = node.x - w.x;
          const dy = node.y - w.y;
          const phase = Math.hypot(dx, dy) - front;
          const ring = Math.exp(-(phase * phase) / waveSigma2);
          const env = Math.max(0, 1 - age / WAVE_LIFETIME);
          z += w.amp * ring * Math.cos(phase * WAVE_K) * env;
        }
        if (z < -frameMaxDepth) frameMaxDepth = -z;
        if (-z > frameMaxUp) frameMaxUp = -z;
        else if (z > frameMaxDown) frameMaxDown = z;
        const proj = projectPoint(node.x - cx, node.y - cy, -z, camZ, view);
        px[i] = cx + proj.sx;
        py[i] = cy + proj.sy;
        elev[i] = elevOf(z, elevScale);
      }

      maxDepth = frameMaxDepth;

      // Leading edge of each splash.
      for (const w of waves) {
        const age = timestamp - w.startTime;
        const a = 0.1 * Math.max(0, 1 - age / WAVE_LIFETIME);
        if (age > 0 && a > 0.008) {
          // Projected as a ring of points on the ground plane — a flat screen-space
          // circle would sit at the wrong angle now the plane is tilted.
          const r = age * WAVE_SPEED;
          ctx.beginPath();
          for (let k = 0; k <= 40; k++) {
            const th = (k / 40) * Math.PI * 2;
            const [rx, ry] = project(w.x + Math.cos(th) * r, w.y + Math.sin(th) * r, 0);
            if (k === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          ctx.strokeStyle = `rgba(150,190,220,${a.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Edges batched by elevation band — one stroke per band.
      for (let b = 0; b < ELEV_BANDS; b++) edgeBuckets[b].length = 0;
      for (const [a, b] of edges) {
        const e = (elev[a] + elev[b]) / 2;
        edgeBuckets[bandOf(e)].push(a, b);
      }
      ctx.lineWidth = 0.75;
      for (let b = 0; b < ELEV_BANDS; b++) {
        const bucket = edgeBuckets[b];
        if (bucket.length === 0) continue;
        ctx.strokeStyle = EDGE_COLORS[b];
        ctx.beginPath();
        for (let k = 0; k < bucket.length; k += 2) {
          ctx.moveTo(px[bucket[k]], py[bucket[k]]);
          ctx.lineTo(px[bucket[k + 1]], py[bucket[k + 1]]);
        }
        ctx.stroke();
      }

      // Nodes batched by band — radius swells with elevation.
      for (let b = 0; b < ELEV_BANDS; b++) nodeBuckets[b].length = 0;
      for (let i = 0; i < points.length; i++) nodeBuckets[bandOf(elev[i])].push(i);
      for (let b = 0; b < ELEV_BANDS; b++) {
        const bucket = nodeBuckets[b];
        if (bucket.length === 0) continue;
        const r = NODE_RADII[b];
        ctx.fillStyle = NODE_COLORS[b];
        ctx.beginPath();
        for (const i of bucket) {
          ctx.moveTo(px[i] + r, py[i]);
          ctx.arc(px[i], py[i], r, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // Sweep: ghost rays fan out behind the live one and fade, so the glide
      // leaves a smear of light rather than a row of discrete lit spokes.
      const angle = normAngle(revs * Math.PI * 2);
      if (!reduced) {
        const gap = TRAIL_SPREAD / TRAIL_RAYS;
        for (let i = TRAIL_RAYS; i >= 1; i--) {
          drapedRay(angle - i * gap, 0.085 * (1 - i / (TRAIL_RAYS + 1)), 1);
        }
      }
      drapedRay(angle, 0.42, 1.1);
      drawFlares(timestamp);
      drawTags();

      // Hover hit-test against projected peak positions.
      let found = 0;
      let foundX = 0;
      let foundY = 0;
      if (pointer.x >= 0) {
        let bestD = HOVER_R;
        for (const p of peaks) {
          const [sx, sy] = project(p.x, p.y, terrainZ(p.x, p.y, peaks));
          const d = Math.hypot(sx - pointer.x, sy - pointer.y);
          if (d <= bestD) {
            bestD = d;
            found = p.id;
            foundX = sx;
            foundY = sy;
          }
        }
      }
      if (found) {
        const p = peaks.find(q => q.id === found);
        // Re-render the panel only when the peak or its band changes — erosion
        // walks a peak down the scale, and the plaque has to follow it.
        if (p && (found !== hoverId || p.band !== hoverBand)) {
          hoverId = found;
          hoverBand = p.band;
          const pos = panelPos(p.x, p.y, W, H);
          setHover({
            peakId: p.id,
            band: p.band,
            left: pos.left,
            top: pos.top,
            flipped: pos.flipped,
            plaque: makePlaque(
              p.x,
              p.y,
              W,
              H,
              p.band,
              p.amp,
              clampDegree(voiceFor(p.band, liveChord, false) + liveTranspose)
            ),
          });
        }
        drawLeader(foundX, foundY, W, H);
      } else if (hoverId) {
        hoverId = 0;
        hoverBand = -1;
        setHover(null);
      }

      if (!liveReported && engine.ready()) {
        liveReported = true;
        setAudioLive(true);
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    }

    let raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
      window.removeEventListener('click', onClick);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      engine.close();
    };
  }, []);

  return (
    <div className="sounding-line-container">
      <canvas ref={canvasRef} className="sounding-line-canvas" />
      <div className="sl-controls">
        {!audioLive && !muted && <span className="sl-muted">CLICK TO START</span>}
        <div className="sl-layers">
          {([...LAYER_KEYS, 'beat'] as const).map(key => (
            <button
              key={key}
              type="button"
              className={`sl-layer${layers[key] ? ' is-on' : ''}`}
              aria-pressed={layers[key]}
              onClick={() => setLayers(prev => ({ ...prev, [key]: !prev[key] }))}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
        <label className="sl-rotate">
          <span className="sl-rotate-label">ROTATE</span>
          <input
            type="range"
            min={-MAX_ROTATION_STEPS}
            max={MAX_ROTATION_STEPS}
            step={1}
            value={rotationSteps}
            onChange={e => setRotationSteps(Number(e.target.value))}
            aria-label="Rotate and transpose the composition"
          />
          <span className="sl-rotate-value">
            {rotationSteps > 0 ? `+${rotationSteps}` : rotationSteps}
          </span>
        </label>
        <label className="sl-rotate">
          <span className="sl-rotate-label">TILT</span>
          <input
            type="range"
            min={0}
            max={TILT_DEG_MAX - TILT_DEG_MIN}
            step={1}
            value={TILT_DEG_MAX - tiltDeg}
            onChange={e => setTiltDeg(TILT_DEG_MAX - Number(e.target.value))}
            aria-label="Tilt the camera between horizon and overhead"
            aria-valuetext={`${tiltDeg} degrees`}
          />
          <span className="sl-rotate-value">{tiltDeg}&deg;</span>
        </label>
        <button type="button" className="sl-reset" onClick={() => resetRef.current()}>
          RESET
        </button>
        <button
          type="button"
          className={`sl-reset${muted ? ' is-off' : ''}`}
          aria-pressed={muted}
          onClick={() => setMuted(m => !m)}
        >
          {muted ? 'UNMUTE' : 'MUTE'}
        </button>
      </div>
      {hover && (
        <div
          className="sl-plaque is-visible"
          key={`${hover.peakId}-${hover.band}`}
          style={{ left: hover.left, top: hover.top }}
          aria-hidden="true"
        >
          <div className="sl-plaque-title">
            <DecodeText text={hover.plaque.title} delay={60} />
            <span className="sl-cursor" />
          </div>
          <div className="sl-plaque-note" style={{ color: BAND_HEX[hover.band] }}>
            <DecodeText text={hover.plaque.note} delay={140} />
          </div>
          <div className="sl-plaque-rows">
            {hover.plaque.rows.map((r, i) => (
              <div className="sl-plaque-row" key={r.k}>
                <span className="sl-k">
                  <DecodeText text={r.k} delay={220 + i * 70} />
                </span>
                <span className="sl-v">
                  <DecodeText text={r.v} delay={250 + i * 70} />
                </span>
              </div>
            ))}
          </div>
          <div className="sl-plaque-ref">
            <DecodeText text={hover.plaque.ref} delay={220 + hover.plaque.rows.length * 70} />
          </div>
        </div>
      )}
    </div>
  );
}
