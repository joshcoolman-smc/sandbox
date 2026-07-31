# Sounding Line

A hex mesh you sculpt by clicking. Peaks persist. A line sweeps from center on its
own clock, and every peak it crosses sounds a note pitched to its elevation — so
the topographic color you see is the note you hear.

A sounding line measures depth. This one also plays it.

## The Exploratorium rules

These are the constraints, not decoration. Every decision below traces to one.

- **No instructions.** No hint text, no legend, no "click to begin".
- **No fail state.** Nothing to break, nothing to undo, nothing to get wrong.
- **The exhibit shows what it wants before you touch it.** The page loads with a
  composed range already standing and the line already stepping round it. An empty
  mesh was the original plan and it was a worse invitation — see the generator.
- **Fresh for the next visitor.** A page load composes a new range. One RESET in
  the corner, which recomposes rather than empties.
- **No settings.** No tempo slider, no scale picker, no voice menu. RESET is the
  only control, and it is the one that needs no explaining. If the tempo is wrong,
  hardcode a better tempo.

## Carried over from `seismic-mesh`

Reuse as-is:

- `meshLayout.ts` — hex lattice, `CELL_SIZE`, `meshGrid()`. Copy unchanged.
- `components/SeismicGrid.tsx` — magnetic-line backdrop pinned to node positions.
- `TOPO_STOPS` + `ELEV_BANDS` + the band-bucketed batch renderer. The palette is
  the reason this experiment exists; do not retune it.
- Perspective projection (`CAM_Z`, `scale = CAM_Z / (CAM_Z + renderZ)`).
- `DecodeText` (`app/components/DecodeText.tsx`) and the `readout.ts` generator,
  repurposed — see Layer 4.

Reuse from `step-sequencer`:

- `lib/voices.ts` — `playLead`, `playBass`, `playKick`. Pure functions over
  `(ctx, dest, t, ...)`, no React, no sequencer state. Import directly; do not
  copy.
- **Not** `rows.ts`, `useStepSequencer.ts`, or anything grid-shaped. No 16-step
  grid here; the mesh is the score.

Deliberately dropped:

- `Z_LINEAR_DECAY` pulling every node to zero. This is the change the whole
  experiment turns on.
- The click-triggered freeze cinematic (`RISE_MS` / `FREEZE_MS` state machine).
  Fine once, unbearable on click nine.

## Elevation → pitch

`ELEV_BANDS` is 16. C major pentatonic from C2 spans exactly 16 degrees to C5.
That coincidence is the whole mapping — the array that quantizes color is the
array that quantizes pitch.

| Band | Note | Hz     | Color        | Voice                 |
|------|------|--------|--------------|-----------------------|
| 0    | C2   | 65.41  | deep blue    | `playBass` tone `sub` |
| 1    | D2   | 73.42  | deep blue    | `playBass` `sub`      |
| 2    | E2   | 82.41  | blue-teal    | `playBass` `sub`      |
| 3    | G2   | 98.00  | blue-teal    | `playLead` `soft`     |
| 4    | A2   | 110.00 | teal         | `playLead` `soft`     |
| 5    | C3   | 130.81 | teal-green   | `playLead` `soft`     |
| 6    | D3   | 146.83 | green        | `playLead` `soft`     |
| 7    | E3   | 164.81 | green        | `playLead` `soft`     |
| 8    | G3   | 196.00 | green-yellow | `playLead` `soft`     |
| 9    | A3   | 220.00 | yellow       | `playLead` `soft`     |
| 10   | C4   | 261.63 | yellow       | `playLead` `sqr`      |
| 11   | D4   | 293.66 | amber        | `playLead` `sqr`      |
| 12   | E4   | 329.63 | amber        | `playLead` `sqr`      |
| 13   | G4   | 392.00 | amber-white  | `playLead` `sqr`      |
| 14   | A4   | 440.00 | near white   | `playLead` `sqr`      |
| 15   | C5   | 523.25 | white        | `playLead` `sqr`      |

Only the bottom three bands take a bass voice. Five stacked sub-oscillators was the
single biggest contributor to mud — low frequencies smear long before the upper
register does — so G2 and A2 keep their pitch on the cleaner lead voice.

Consonance is structural: any terrain the visitor builds is in key, because there
are no out-of-key bands to build. Bands are *relative* — the elevation scale
re-ranges against the terrain's own height, so the tallest summit is always near
band 15 and the scale never collapses onto one note.

The resting plane sits at band 4, not band 8. Resting mid-palette made the flat
mesh already green, so a first click only nudged the colour and the gesture read
as nothing happening. Rest lives in the blue-teal end instead, which makes the
warm half of the palette something the visitor earns — a single click is a
visible three-band climb out of the cool, landing around E3.

Peak x-position maps to stereo pan via a `StereoPannerNode` on the master bus —
left peak plays left. Free spatial feedback, no UI.

## Interaction layers

Ordered by how someone finds them, not by implementation.

**Layer 1 — click plants a chord.** Gaussian impulse at the cursor (keep
`BLAST_SIGMA`, keep the radiating `SeismicWave` ripple — it's the visual receipt).
The peak settles to a permanent elevation instead of decaying to zero. Topographic
color blooms and stays. On the sweep's next pass it sounds.

**Layer 2 — clicking near an existing peak merges into a ridge.** Falls out of the
existing neighbor coupling; nothing to build. Two peaks close together get struck
close together, so the visitor starts placing peaks *for* rhythm. Peaks equidistant
from center pulse evenly — a discovery, not a feature.

**Layer 3 — shift-click carves a basin.** Already the "quick dent" gesture. Now it
means deep blue, low sub. A bonus found by fiddling.

**Layer 4 — hover a peak for its plaque.** The readout panel returns here, on
hover, beside the peak: coordinates, elevation band, **and the note name**. This
is what teaches the mapping — hover a white peak, read `C5`, hear it on the next
pass. `DecodeText` and the leader line survive intact and land better than they
did interrupting a click.

## Sweep

- Quantized: 16 sectors per revolution, 3840ms round, so ~240ms a step — an
  eighth-note feel around 125bpm. Tempo and step count live in `lib/pitch.ts` next
  to the scale, because they are musical settings, not drawing settings.
- The line **steps** rather than glides, and every peak in the sector it lands on
  strikes together. Quantized audio under a gliding line would desync what you hear
  from where the line is.
- Note length is whole steps — near peaks clip to one, distant peaks ring for two —
  so notes end on the grid instead of smearing into the next hit.
- Voice budget per step: 4 notes, at most 1 of them bass, one note per pitch.
  Pentatonic keeps any combination consonant but density still turns to porridge.
- The trail lights the sectors just left, so it reads as a clock hand ticking round.
- Runs on `AudioContext.currentTime`, scheduled ahead. Never on rAF timestamps;
  rAF jitter is audible as flam.
- Audio unlocks on the first press anywhere (autoplay policy). Until then the range
  stands silent, and one word of chrome says so.

## The table

Camera tilt, and a circular lattice. Both replaced earlier choices that were quietly
throwing the idea away.

**Plan view wasted height.** Looking straight down, a mountain's height showed only
as colour plus a little foreshortening, and rotating read as spinning a map rather
than moving around terrain. The camera now sits at ~46° off vertical, so summits rise
up the screen and the ground compresses into a band — which is what leaves room for
them to stand up in. Rotating the world under a tilted camera is the same thing as
orbiting the camera around the world, so the existing rotation control became an
orbit for free.

Two numbers that had to be found by looking: height needs a gain (~0.26) or terrain
several thousand units deep stands taller than a table only ~600 across, which reads
as a side elevation rather than a landscape; and the view drops ~74px so summits have
empty space above rather than climbing out of frame.

**The lattice is a disc, and that is load-bearing.** Rotation preserves a peak's
radius, so on a rectangle a peak sitting comfortably near the left edge swings clean
off the front when you turn it — its marker left floating over empty space. A circle
is the only shape rotation cannot carry anything out of. It also happens to be what
the thing wants to look like: under tilt a circular world renders as an ellipse,
which is how a round table reads in perspective.

Peak size is proportional to the disc, not absolute — the first disc pass kept the
old wide-mesh sigma and the peaks crowded so badly that most seeds were rejected and
the range came out flat. A click outside the disc is pulled to the rim rather than
ignored, because a dead zone is a fail state.

## Rotation

A slider, not a drag. Drag was considered and dropped: it collides with the click
that everything else hangs off, needing a movement threshold in the one code path
that must stay simple — and a drag cannot be *held*, which is the whole point of a
control you want to sit at and listen to.

One notch turns the composition one step **and** transposes it one scale degree.
Both from the same number, so the control has a single legible consequence instead
of two settings wearing one hat. Because pentatonic has five degrees to an octave,
five notches is exactly an octave; the ±8 range is a little over an octave and a
half each way.

What this costs, stated plainly: colour stops meaning an absolute note and starts
meaning a scale *degree*, with the slider setting the key. The tags and plaques name
the actual sounding note, so the mapping stays discoverable — but "band 12 is E4" is
now only true at rotation 0.

Two consequences that made the implementation simpler rather than harder:

- **Peaks are polar-native.** Position derives from bearing plus current rotation
  every frame, so `baseAngle` is a peak's identity and x/y are a view of it. A peak
  planted while the composition is turned keeps its spot under the pointer.
- **The lattice never turns.** Landforms rotate *through* a fixed grid, so the frame
  stays rectangular instead of sweeping empty corners across the view.
- **Pitch is generated, not tabulated.** Transposing runs straight off the end of a
  16-entry table, so degrees index a pentatonic scale extended over as many octaves
  as needed, and voice selection follows the *absolute* degree — transposing a peak
  upward takes it off the sub rather than carrying the woof up with it.

## No erosion

Peaks stay. An early pass sank them over ~90s so the exhibit would clear itself,
and it was the wrong instinct twice over: retreating to flat throws away the only
thing worth doing here, and watching your range drain is boring. A page load
composes a fresh range, so reloading is the reset — plus an explicit RESET in the
corner, which recomposes rather than emptying, because a blank grid is the one
state this page has no reason to show.

## What the build changed

Kept because each was a real consequence rather than a preference. The first three
came out of the initial build; the rest came out of watching it and listening to it.

**Containment moved out of the terrain and into the camera and the palette.** Three
separate attempts capped the landscape to keep it framed — damping the projection to
0.4, clamping depth with `tanh`, shrinking the peaks — and every one bought framing
by flattening the thing worth looking at. The mesh kept coming out either blown out
or dim, and the tanh pass silently broke `ampForBand` so composed seeds landed lower
than written. What works instead: nothing is capped, the camera retreats smoothly as
terrain grows, and elevation is measured against the terrain's *own* eased range.
Peaks grow forever; the view widens and the palette re-ranges. Same move twice —
adapt the frame, not the subject.

**The sweep is quantized and steps.** Continuous rotation meant peaks fired at
arbitrary moments: every note in key, the whole thing rhythmically shapeless — mud.
Sixteen sectors per revolution fixes it, and it is why step-sequencer's generate
button always sounds good. The line steps rather than glides because quantized audio
under a gliding line desyncs what you hear from where the line is, which is fatal
for an exhibit built on hearing what you see.

**A click plants a chord, not a note.** One peak per click meant a dozen clicks
before anything was worth hearing. A spoke of peaks shares a sector, so they strike
together. Clicking the same place again cycles it up the scale and back down, so
continuous clicking morphs the terrain without anyone needing to discover shift.

**Brightness rides elevation, not just pitch.** A per-note lowpass opens as a peak
climbs, so cycling one peak audibly opens and closes its tone instead of only
stepping through notes — the reward that keeps someone clicking. It lives in this
experiment's audio module, not in the shared `voices.ts` that monono also consumes.

**Idle breathing.** After ~3.4s without a click the range starts breathing and the
camera gives it a little more room, so a finished monstrosity is something to stand
back and contemplate. This is seismic-mesh's `RIPPLE_AMP`, which that experiment
wrote and switched off; here it has somewhere to belong.

**One piece of chrome was unavoidable.** Audio cannot start before a user gesture,
so a freshly loaded page shows a standing range with markers and makes no sound —
which reads as broken, not as a browser rule. Any press anywhere now unlocks it, and
a single word (`SOUND OFF`) admits the state until it does, then never returns.

Three from the first build:

- **Elevation and perspective had to be decoupled.** One amplitude can't both
  reach band 15 and drive the projection — the full range scales nodes ~2x and
  throws the terrain off-frame, under the header and past the right edge. The
  projection now runs on a damped copy (`PROJ_DAMP`). Colour carries the height;
  parallax only hints at it.
- **A taller peak has to be a wider peak.** Fixed sigma turned a stacked peak
  into a needle that fanned the lattice apart. Sigma grows with amplitude so the
  slope stays roughly constant and it reads as a mountain.
- **Clicks are queued, not applied inline.** Handlers stamped `performance.now()`
  while the render loop measured age against the rAF clock; the two drift apart
  by more than a frame under throttling, and a peak born "in the future" made
  every age-driven animation compute backwards (a negative canvas arc radius was
  the visible symptom). Clicks now land at the top of the next frame.

## Non-goals

Each of these was considered and rejected. Reopening one means reopening the
Exploratorium rules.

- Tempo, scale, volume, or voice controls of any kind.
- A reset or clear affordance. Erosion covers it.
- Instructional copy, tooltips, or a legend for the color→pitch mapping. Layer 4
  is the only teaching surface.
- localStorage persistence. The exhibit is empty when you arrive.
- Drums or percussion. `playKick` is available for the deepest basin only, if a
  basin needs a thump; otherwise unused. No beat.
- Retuning `TOPO_STOPS`.
- Importing an audio library. Web Audio only, matching `step-sequencer`.

## Done criteria

1. Page loads: flat mesh, one solid color, sweep line already rotating, silent.
2. First click raises a peak that is still there a minute later, in full topo
   color, and it sounds once per revolution.
3. Twelve clicks produce a legible range and a repeating phrase in key.
4. Hovering a peak decodes in a plaque naming its note; the note matches what
   sounds on the next pass.
5. Shift-click produces a basin that plays below every peak on screen.
6. Left-side peaks pan left.
7. `prefers-reduced-motion`: sweep still advances and audio still fires; the
   afterglow and ripple are suppressed.
8. `npm run typecheck` and `npm run build` both pass.
