// experiment: Sounding Line — a hex mesh you sculpt by clicking. The page loads
// with a composed range already standing, and a line steps round from the centre in
// sixteen sectors; every peak it lands on sounds a note pitched to that peak's
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
import { createEngine } from './lib/audio';
import { composeChord, composeScatter, seedToPeak } from './lib/generate';
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
  CLICK_BOOST,
  applyRotation,
  CLIP_BOTTOM_PAD,
  CLIP_TOP,
  CYCLE_BOTTOM,
  CYCLE_TOP,
  DOWN_FLOOR,
  elevOf,
  makePeak,
  MAX_PEAKS,
  MERGE_DIST,
  PEAK_MIN_AMP,
  projectPoint,
  RISE_MS,
  SCALE_EASE_PER_S,
  terrainZ,
  UP_FLOOR,
  type Peak,
} from './lib/terrain';
import {
  bandOf,
  BASS_TOP_DEGREE,
  clampDegree,
  ELEV_BANDS,
  MAX_BASS_PER_STEP,
  MAX_NOTES_PER_STEP,
  MAX_ROTATION_STEPS,
  noteName,
  STEP_ANGLE,
  STEP_MS,
  STEPS,
} from './lib/pitch';
import { meshGrid } from './meshLayout';
import './styles.css';

// The sweep's tempo and step count live in lib/pitch.ts, next to the scale — they
// are musical settings, not drawing settings. Deliberately not controls.
const SWEEP_SAMPLES = 90; // points along the ray, so the line drapes over terrain
const TRAIL_RAYS = 5; // lit sectors trailing the live ray

const MAX_PAN = 0.85;
const FLARE_MS = 340;

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
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    rotationRef.current = rotationSteps;
  }, [rotationSteps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = createEngine();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const peaks: Peak[] = [];
    const waves: Wave[] = [];
    const pending: { x: number; y: number; isBasin: boolean }[] = [];
    let nextId = 1;
    let points: { x: number; y: number }[] = [];
    let edges: [number, number][] = [];
    let cx = 0;
    let cy = 0;
    let maxRadius = 1;
    let discRadius = 1;

    // Sweep angle is tracked unwrapped and monotonic so a crossing can be
    // interpolated to an exact wall-clock moment and handed to the audio clock.
    let lastStep = -1;
    let originMs = 0;
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
      maxRadius = mesh.radius;

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
      const { sx, sy } = projectPoint(x - cx, y - cy, -renderZ, camZ);
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
      // One click plants a whole chord along its spoke.
      for (const seed of composeChord(x, y, isBasin, cx, cy, discRadius)) {
        // Landing on an existing peak stacks onto it — restacking climbs the
        // scale, and a near miss grows a ridge instead.
        let merged: Peak | null = null;
        let bestD = MERGE_DIST;
        for (const p of peaks) {
          const d = Math.hypot(p.x - seed.x, p.y - seed.y);
          if (d <= bestD) {
            bestD = d;
            merged = p;
          }
        }

        if (merged) {
          // Restacking walks the cycle: up to the top band, reverse, down to the
          // bottom, reverse again. Clicking one spot over and over morphs it bigger
          // and smaller forever without anyone needing to find the shift key.
          if (isBasin) merged.dir = -1;
          let next = merged.target + CLICK_BOOST * merged.dir;
          if (next >= CYCLE_TOP) {
            next = CYCLE_TOP;
            merged.dir = -1;
          } else if (next <= CYCLE_BOTTOM) {
            next = CYCLE_BOTTOM;
            merged.dir = 1;
          }
          merged.target = next;
        } else {
          peaks.push(makePeak(nextId++, seed.x, seed.y, seed.amp, cx, cy, timestamp));
          // Density guard — drop the oldest so the map can't silt up.
          if (peaks.length > MAX_PEAKS) peaks.shift();
        }
      }

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
    // The line advances in discrete steps rather than gliding. Quantizing the
    // audio to a grid while the line moved continuously would desync the two — a
    // peak would sound before or after the line reached it, which is fatal for an
    // exhibit whose whole premise is that you hear what you see. Stepping the line
    // instead keeps them exact: the line is *in* the sector when the sector sounds.
    function fireStep(step: number, W: number) {
      const sector = ((step % STEPS) + STEPS) % STEPS;
      const when = originMs + step * STEP_MS;

      // Everything in this sector strikes together — visually always, audibly
      // within the voice budget.
      const firing = peaks.filter(p => p.sector === sector);
      for (const p of firing) p.struckAt = when;
      if (!engine.ready() || firing.length === 0) return;

      // Tallest first: when a sector is over budget, the summits are what the
      // visitor built and what they expect to hear.
      const ordered = [...firing].sort((a, b) => b.band - a.band);
      const audioTime = engine.at(when);
      const transpose = rotationRef.current;
      let voices = 0;
      let bass = 0;
      const played = new Set<number>();

      for (const p of ordered) {
        if (voices >= MAX_NOTES_PER_STEP) break;
        // Rotation transposes: one notch round is one scale degree up.
        const degree = clampDegree(p.band + transpose);
        // One note per pitch — a doubled degree is a louder note, not a new one.
        if (played.has(degree)) continue;
        const isBass = degree <= BASS_TOP_DEGREE;
        if (isBass && bass >= MAX_BASS_PER_STEP) continue;

        // Duration in whole steps, so notes end on the grid instead of smearing
        // across the next hit. Distant peaks ring for two steps, near ones clip
        // short — the radius variation survives quantization.
        const steps = p.radius / maxRadius > 0.55 ? 2 : 1;
        const dur = (steps * STEP_MS * 0.9) / 1000;
        const pan = Math.max(-MAX_PAN, Math.min(MAX_PAN, ((p.x - W / 2) / (W / 2)) * MAX_PAN));
        engine.note(degree, audioTime, dur, pan);

        played.add(degree);
        voices++;
        if (isBass) bass++;
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

        const label = noteName(clampDegree(p.band + rotationRef.current));
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
          peaks.push(seedToPeak(seed, nextId++, cx, cy, timestamp));
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
      // Rotation turns the landforms through the fixed lattice and re-sectors them,
      // so the same gesture shifts the pattern in time. The matching transpose is
      // applied where notes are sounded.
      const transpose = rotationRef.current;
      applyRotation(peaks, cx, cy, transpose * STEP_ANGLE);

      // Bands come from the summed terrain, so a merged ridge lifts the pitch of
      // both peaks.
      for (const p of peaks) {
        p.band = bandOf(elevOf(terrainZ(p.x, p.y, peaks), elevScale));
      }

      // Advance the sweep one step at a time and sound each sector it lands on.
      // Catching up in a loop means a dropped frame delays notes instead of
      // silently skipping them.
      const step = Math.floor((timestamp - originMs) / STEP_MS);
      while (lastStep < step) {
        lastStep++;
        fireStep(lastStep, W);
      }

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
      const camTarget = cameraFor(maxDepth) * (1 + (IDLE_MARGIN - 1) * breath);
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
        const proj = projectPoint(node.x - cx, node.y - cy, -z, camZ);
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

      // Sweep: the sectors just left glow and fade, then the live ray draws over
      // them. Because the line steps, the trail is a row of discrete lit spokes
      // rather than a smear — it reads as a clock hand ticking round.
      const angle = normAngle(lastStep * STEP_ANGLE);
      if (!reduced) {
        for (let i = TRAIL_RAYS; i >= 1; i--) {
          drapedRay(angle - i * STEP_ANGLE, 0.075 * (1 - i / (TRAIL_RAYS + 1)), 1);
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
            plaque: makePlaque(p.x, p.y, W, H, p.band, p.amp, clampDegree(p.band + rotationRef.current)),
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
        {!audioLive && <span className="sl-muted">SOUND OFF</span>}
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
        <button type="button" className="sl-reset" onClick={() => resetRef.current()}>
          RESET
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
