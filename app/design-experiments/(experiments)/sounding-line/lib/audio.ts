// Audio engine for Sounding Line.
//
// The voice is local to this experiment rather than imported from
// step-sequencer. That module's lead is a square-wave stab — right for a
// sequencer, wrong here: at the top of a 16-band elevation range its odd
// harmonics land in 3-6kHz, the band the ear is most sensitive to, and every
// summit read as shrill. What a topography wants is a pad — slow attack, long
// tail, detuned oscillators drifting against each other — so peaks bloom and
// overlap into a bed instead of ticking past as blips.
//
// Timing note: notes are scheduled against AudioContext.currentTime, never
// against requestAnimationFrame timestamps. rAF jitter is ~16ms and audible as
// flam — a ring of evenly spaced peaks has to pulse evenly, which means the
// sweep's exact crossing moment gets converted into audio-clock time and
// scheduled ahead. See `at()`.

import { playClap, playHat, playKick } from '../../step-sequencer/lib/voices';
import { freqForDegree, type Layer, MAX_DEGREE } from './pitch';

// How far ahead of the audio clock notes are scheduled. Must exceed one frame
// so an interpolated crossing that already happened still lands in the future.
const LOOKAHEAD_S = 0.05;

const BASS_GAIN = 0.15;
const LEAD_GAIN = 0.1;
const KICK_GAIN = 0.3;
const HAT_GAIN = 0.055;
const CLAP_GAIN = 0.09;

// Muting rides a gain ramp rather than suspending the context: notes already
// scheduled keep their timing, so unmuting drops back into the pass in progress
// instead of restarting the piece.
const MUTE_RAMP_S = 0.12;

// The tail rings well past the sweep's step grid — that overlap is the whole
// point of a pad, and pentatonic means the resulting chords can't sour.
const RELEASE_S = 1.4;
// The bass tail has to end before the next root arrives, or the low end is a smear
// you cannot count notes in — the mistake that made a four-per-pass bass line still
// sound like a drone. A group is 960ms; this leaves it audible space.
const BASS_RELEASE_S = 0.55;

// Reverb impulse length. Long enough to read as a space rather than a room.
const IR_SECONDS = 3.2;

export type Engine = {
  // Wakes the context. Must be called from a user gesture (autoplay policy).
  start(): void;
  ready(): boolean;
  // Converts a performance.now() timestamp into a schedulable audio time.
  at(perfMs: number): number;
  // `layer` picks the voice, not the degree. Register and orchestration are
  // separate questions now: the same peak can sound in three layers at once.
  note(layer: Layer, degree: number, when: number, dur: number, pan: number): void;
  // Percussion is its own layer with its own clock — see the drum comment below.
  drum(kind: 'kick' | 'hat' | 'clap', when: number): void;
  setMuted(muted: boolean): void;
  close(): void;
};

// Exponentially decaying stereo noise. A generated impulse costs nothing to
// ship and is indistinguishable from a sampled hall at this wet level.
function buildImpulse(ctx: AudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * IR_SECONDS);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // A short fade-in stops the reverb from having a transient of its own.
      const swell = Math.min(1, t * 40);
      data[i] = (Math.random() * 2 - 1) * swell * Math.pow(1 - t, 2.6);
    }
  }
  return buf;
}

export function createEngine(): Engine {
  let ctx: AudioContext | null = null;
  let dry: AudioNode | null = null;
  let wet: GainNode | null = null;
  let master: GainNode | null = null;
  // Drums bypass the pad's reverb send and its high shelf — a kick through a
  // 3.2s hall is a smear, and the shelf is there to tame overlapping pads.
  let percussion: AudioNode | null = null;
  let muted = false;
  // Captured once, when the context opens: audio clock minus wall clock. Every
  // scheduled note is placed by offsetting a wall-clock moment through this.
  let skew = 0;

  function start() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();

    // Master glue: one compressor so a dense mesh thickens instead of clipping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 14;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.012;
    comp.release.value = 0.4;

    // Air off the top of the whole mix. Even a filtered pad accumulates hiss
    // once eight of them overlap, and this is the register that fatigues.
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 4200;
    shelf.gain.value = -7;

    const out = ctx.createGain();
    out.gain.value = muted ? 0 : 0.9;

    comp.connect(shelf);
    shelf.connect(out);
    out.connect(ctx.destination);
    master = out;

    // Percussion joins after the shelf, so it keeps its transient.
    const perc = ctx.createGain();
    perc.gain.value = 1;
    perc.connect(out);
    percussion = perc;

    // Reverb runs as a send off the same bus, so wetness is per-note.
    const verb = ctx.createConvolver();
    verb.buffer = buildImpulse(ctx);
    const send = ctx.createGain();
    send.gain.value = 1;
    send.connect(verb);
    verb.connect(comp);

    dry = comp;
    wet = send;

    skew = ctx.currentTime - performance.now() / 1000;
  }

  function ready() {
    return !!ctx && ctx.state === 'running';
  }

  function at(perfMs: number) {
    if (!ctx) return 0;
    const t = perfMs / 1000 + skew + LOOKAHEAD_S;
    // Guard against clock drift between the two timebases over a long session.
    return t < ctx.currentTime ? ctx.currentTime : t;
  }

  function note(layer: Layer, degree: number, when: number, dur: number, pan: number) {
    if (!ctx || !dry || !wet) return;
    const freq = freqForDegree(degree);
    // The layer decides the voice. A low note is a sub whether it came from a
    // shallow bump or from the base of a summit, which is what makes the toggles
    // read as instruments rather than as a band-pass over the terrain.
    const isBass = layer === 'low';
    const release = isBass ? BASS_RELEASE_S : RELEASE_S;

    // Elevation, normalized over the span actually in play.
    const t = Math.min(1, Math.max(0, degree / MAX_DEGREE));

    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(dry);
    // Height reads as distance: summits sit further back in the space than the
    // basses underfoot, which is also what stops them from sounding sharp.
    const sendLevel = ctx.createGain();
    sendLevel.gain.value = 0.14 + t * 0.4;
    panner.connect(sendLevel);
    sendLevel.connect(wet);

    // Brightness still rides elevation, but the ceiling is ~4kHz rather than
    // 14kHz. The climb stays audible as a shape; it just never reaches the
    // register that hurts.
    const tilt = ctx.createBiquadFilter();
    tilt.type = 'lowpass';
    tilt.frequency.value = 340 * Math.pow(2, t * 3.6);
    tilt.Q.value = 0.6 + t * 0.5;
    tilt.connect(panner);

    const env = ctx.createGain();
    env.connect(tilt);

    // Equal-loudness tilt: the ear hears 2-4kHz several dB hotter than the low
    // end, so a flat gain across the register puts every summit in front.
    const base = isBass ? BASS_GAIN : LEAD_GAIN;
    const peak = base * (1 - t * 0.45);

    // Slow attack is what separates a pad from a blip; the sustain is held only
    // as long as the sweep asked for, and the tail runs past it.
    const attack = isBass ? 0.05 : 0.045 + t * 0.03;
    const hold = Math.max(attack + 0.02, dur);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(peak, when + attack);
    env.gain.exponentialRampToValueAtTime(peak * 0.62, when + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, when + hold + release);

    // Detuned pair plus a sub octave. The beating between the pair is the
    // analog character — mathematically identical oscillators sound sterile.
    const spread = isBass ? 5 : 9;
    const stack: Array<{ type: OscillatorType; detune: number; mix: number }> = isBass
      ? [
          { type: 'sine', detune: 0, mix: 1 },
          { type: 'triangle', detune: spread, mix: 0.5 },
        ]
      : [
          { type: 'triangle', detune: -spread, mix: 1 },
          { type: 'triangle', detune: spread, mix: 1 },
          // A sawtooth underneath adds body without the odd-harmonic bite of a
          // square; it fades out as the peak climbs so the top stays pure.
          { type: 'sawtooth', detune: 0, mix: 0.42 * (1 - t) },
        ];

    const oscs: OscillatorNode[] = [];
    for (const part of stack) {
      if (part.mix <= 0.001) continue;
      const osc = ctx.createOscillator();
      osc.type = part.type;
      osc.frequency.value = freq;
      osc.detune.value = part.detune;
      const mix = ctx.createGain();
      mix.gain.value = part.mix;
      osc.connect(mix);
      mix.connect(env);
      oscs.push(osc);
    }

    // Slow drift on detune, pulling the pair in opposite directions. A fixed
    // detune beats at a fixed rate and starts to sound like a chorus preset;
    // drifting it keeps the beating from ever settling into a pattern. One LFO
    // for the note, not one per oscillator — a dense mesh already runs dozens
    // of overlapping voices and every node here is paid for that many times.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.19;
    oscs.forEach((osc, i) => {
      if (!ctx) return;
      const depth = ctx.createGain();
      depth.gain.value = i % 2 === 0 ? 3.5 : -2.6;
      lfo.connect(depth);
      depth.connect(osc.detune);
    });

    const stop = when + hold + release + 0.05;
    for (const osc of oscs) {
      osc.start(when);
      osc.stop(stop);
    }
    lfo.start(when);
    lfo.stop(stop);

    // Release the nodes once the note has fully rung out.
    window.setTimeout(
      () => {
        env.disconnect();
        tilt.disconnect();
        sendLevel.disconnect();
        panner.disconnect();
      },
      (hold + release + LOOKAHEAD_S + 0.5) * 1000 + 120
    );
  }

  // The drum layer.
  //
  // Borrowed wholesale from step-sequencer, because the thing worth having is
  // exactly what that experiment had: a beat you can switch off. Percussion is the
  // one voice here that does *not* answer to the terrain — it has no pitch to take
  // from a peak's elevation, so it runs on the revolution's own clock rather than
  // on crossings, and it is off by default.
  function drum(kind: 'kick' | 'hat' | 'clap', when: number) {
    if (!ctx || !percussion) return;
    if (kind === 'kick') playKick(ctx, percussion, when, KICK_GAIN);
    else if (kind === 'clap') playClap(ctx, percussion, when, CLAP_GAIN);
    else playHat(ctx, percussion, when, HAT_GAIN);
  }

  function setMuted(next: boolean) {
    muted = next;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(next ? 0 : 0.9, t + MUTE_RAMP_S);
  }

  function close() {
    if (ctx) void ctx.close();
    ctx = null;
    dry = null;
    wet = null;
    master = null;
    percussion = null;
  }

  return { start, ready, at, note, drum, setMuted, close };
}
