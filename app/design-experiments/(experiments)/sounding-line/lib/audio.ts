// Audio engine for Sounding Line. Voices are imported from the step-sequencer
// experiment — playLead/playBass are pure functions over (ctx, dest, t, ...)
// with no React and no sequencer state, so they drop straight in.
//
// Timing note: notes are scheduled against AudioContext.currentTime, never
// against requestAnimationFrame timestamps. rAF jitter is ~16ms and audible as
// flam — a ring of evenly spaced peaks has to pulse evenly, which means the
// sweep's exact crossing moment gets converted into audio-clock time and
// scheduled ahead. See `at()`.

import { playBass, playLead } from '../../step-sequencer/lib/voices';
import { freqForDegree, MAX_DEGREE, noteName, voiceForDegree } from './pitch';

// How far ahead of the audio clock notes are scheduled. Must exceed one frame
// so an interpolated crossing that already happened still lands in the future.
const LOOKAHEAD_S = 0.05;

const BASS_GAIN = 0.12;
const LEAD_GAIN = 0.14;

export type Engine = {
  // Wakes the context. Must be called from a user gesture (autoplay policy).
  start(): void;
  ready(): boolean;
  // Converts a performance.now() timestamp into a schedulable audio time.
  at(perfMs: number): number;
  note(degree: number, when: number, dur: number, pan: number): void;
  close(): void;
};

export function createEngine(): Engine {
  let ctx: AudioContext | null = null;
  let bus: AudioNode | null = null;
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
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    comp.connect(master);
    master.connect(ctx.destination);
    bus = comp;

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

  function note(degree: number, when: number, dur: number, pan: number) {
    if (!ctx || !bus) return;
    const freq = freqForDegree(degree);
    const voice = voiceForDegree(degree);

    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(bus);

    // Brightness rides elevation, continuously.
    //
    // Pitch alone makes height audible in 16 discrete jumps; this makes the whole
    // climb audible as a *shape*. A low peak is dark and round, a high one is open
    // and sharp, and cycling one peak up and down opens and closes its tone the
    // whole way — so clicking the same spot over and over keeps paying out instead
    // of just stepping through notes. It lives here rather than in the shared
    // voices module, which monono also consumes.
    const tilt = ctx.createBiquadFilter();
    tilt.type = 'lowpass';
    // Normalized over the span actually in play rather than the full clamp range,
    // so a mid-height peak still reads open.
    const t = Math.min(1, Math.max(0, degree / 20));
    tilt.frequency.value = Math.min(14000, 420 * Math.pow(2, t * 5.25));
    tilt.Q.value = 0.7 + t * 1.2;
    tilt.connect(panner);

    if (voice.kind === 'bass') {
      playBass(ctx, tilt, when, freq, dur, BASS_GAIN, voice.tone);
    } else {
      playLead(ctx, tilt, when, freq, dur, LEAD_GAIN, voice.tone);
    }

    // Release the nodes once the note has rung out.
    window.setTimeout(() => {
      tilt.disconnect();
      panner.disconnect();
    }, (dur + LOOKAHEAD_S + 0.5) * 1000 + 60);
  }

  function close() {
    if (ctx) void ctx.close();
    ctx = null;
    bus = null;
  }

  return { start, ready, at, note, close };
}
