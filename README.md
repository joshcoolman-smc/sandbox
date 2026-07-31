# Design Experiments

A Next.js-based sandbox for exploring visual design systems, widgets, and interactive patterns.

> **Heads up:** This is a personal sandbox -- me coding in public. Experiments get added, removed, and rewritten all the time. Feel free to browse, but don't depend on anything here staying put.

This is a design sketchbook, not production software. There's no test suite and that's intentional -- the point is rapid experimentation and learning in public, not shipping stable APIs. Things break, get rewritten, and disappear without notice.

---

## Local Setup

Most experiments are self-contained client-side toys and need nothing beyond:

```bash
npm install
npm run dev
```

Some experiments call external services (the first of these is **Monono**, which talks to Claude Haiku). For those, copy the example env file and fill in the keys you need:

```bash
cp .env.local.example .env.local
```

Current env vars used:

- `VERCEL_AI_GATEWAY_KEY` — required by Monono. AI experiments route through [Vercel AI Gateway](https://vercel.com/ai-gateway), which fronts Anthropic and other providers with a unified API, spend dashboard, and per-project budgets. Create a key in the Vercel dashboard and set a budget cap there
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — optional for local dev (rate limiting is disabled without them), required in production. Free tier at [upstash.com](https://upstash.com/) is plenty

Experiments degrade gracefully without their keys set — Monono, for example, shows in-character "brain glitched" fallback messages instead of returning errors.

---

## Experiments

### Sounding Line

**July 30, 2026**

[![Sounding Line](./public/screenshots/sounding-line.png)](/design-experiments/sounding-line)

A playable topography. Click to raise a peak and it stays; a line sweeps from the centre on its own clock and every peak it crosses plays a note pitched to that peak's elevation, so the topographic color you see is the note you hear — deep blue is a sub, white peaks are the high bells. The mesh quantizes elevation into sixteen color bands and C major pentatonic spans exactly sixteen degrees from C2 to C5, so one array picks both the color and the pitch and nothing you build can be out of key. Shift-click to carve a basin; nothing erodes, so the range you build is the range that stays.

`Audio` `Web Audio API` `Canvas` `Generative` `Interactive`

**[View Live →](https://www.joshcoolman.com/design-experiments/sounding-line) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/sounding-line)**

---

### Adaptive Grid

**June 14, 2026**

[![Adaptive Grid](./public/screenshots/adaptive-grid.png)](/design-experiments/adaptive-grid)

A Swiss/International-style poster built on a strict square grid: a base layer of grid lines, a markings layer of black crosshairs and orange corner brackets, solid color blocks, and the typography — every element placed on the same grid tracks, so nothing drifts. It anchors to an eight-column square module with a one-column margin on each side. Responsiveness is a reflow, not a resize: the six-column content area collapses to three, type holds a fixed size, and the body paragraph snaps to a whole number of square cells so sections never overlap.

`Swiss` `Grid System` `Typography` `Responsive` `Layout`

**[View Live →](https://www.joshcoolman.com/design-experiments/adaptive-grid) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/adaptive-grid)**

---

### War Room

**June 12, 2026**

[![War Room](./public/screenshots/war-room.png)](/design-experiments/war-room)

A sci-fi command-center HUD in the spirit of WarGames, Iron Man, and the Ambrosia DEFCON screensaver. Eight live panels share one animation clock: a DEFCON theater map launches great-circle strikes on its own schedule (click anywhere to fire your own), a dot-matrix globe spins beside a wireframe satellite running movie-style inspection maneuvers, a green-phosphor teletype hammers out an endless ASCII pinout schematic, and a Nokia-style LCD tracks the DEFCON condition in dot-matrix pixels. Click a feed in the cycling target roster and the room reacts — a dossier unfolds with a high-contrast scanline-raster portrait buried in resolving data, the map crosshairs the target, and the globe rotates to face them. One baked Natural Earth dataset powers both map and globe; the whole wall is canvas 2D, no dependencies.

`Fable 5` `HUD` `Canvas` `Sci-Fi` `Generative`

**[View Live →](https://www.joshcoolman.com/design-experiments/war-room) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/war-room)**

---

### Seismic Mesh

**June 10, 2026**

[![Seismic Mesh](./public/screenshots/seismic-mesh.png)](/design-experiments/seismic-mesh)

An experiment with the new Fable 5 model. A hexagonal mesh viewed from directly above. At rest it sits flat and a single solid color; clicking triggers a seismic cinematic where a mountain rises at the click point, a ripple radiates outward, and the surface freezes at peak — topographic color (deep blue through green and amber to white-hot) blooms across the elevation while an ASCII telemetry readout decodes in beside the epicenter — magnitude, coordinates, depth — before everything releases and melts back to flat. Shift-click for a quick dent. Behind the mesh, a separate field of magnetic lines pinned to the exact mesh node positions rotates to swirl around the cursor, adding depth without ever being touched by the warp. Pure canvas 2D API, no libraries.

`Fable 5` `Physics` `Interactive` `3D` `Generative`

**[View Live →](https://www.joshcoolman.com/design-experiments/seismic-mesh) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/seismic-mesh)**

---

### Step Sequencer

**May 27, 2026**

[![Step Sequencer](./public/screenshots/step-sequencer.png)](/design-experiments/step-sequencer)

A Tenori-on / ToneMatrix-flavored grid sequencer, grown into a three-layer groovebox. Sixteen 16th-note steps wide, eleven rows tall: five pentatonic lead rows, three bass rows, and a synthesized drum kit (sine-drop kick, filtered-noise clap and hat). The generate button writes a real techno pattern — four-on-the-floor kick, offbeat hats, backbeat clap, rolling bassline, sparse lead motif — and the page loads with one ready to play. Two segmented tone pills — lead soft / square / saw, bass sub / saw / acid — plus a swing control and a tempo-synced dotted-eighth delay on the lead bus, all glued by a master compressor. Pure Web Audio API — no deps, no audio assets. Variable tempo from 60 to 180 BPM.

`Audio` `Web Audio API` `Sequencer` `Interactive` `Techno`

**[View Live →](https://www.joshcoolman.com/design-experiments/step-sequencer) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/step-sequencer)**

---

### Slide Gallery

**May 24, 2026**

[![Slide Gallery](./public/screenshots/slide-gallery.png)](/design-experiments/slide-gallery)

An expanding-panel gallery on black. A row of thin vertical slivers — each a center slice of a black-and-white photograph — opens as you move across it. Hover (or tap, on mobile) and the focused panel widens to the full frame while the whole strip slides to keep it centered, and a white spotlight frame snaps over it with beams shooting to the top and bottom of the stage. The focused panel then decodes a made-up special-ops dossier in its lower third: every field churns through random glyphs and locks in top-to-bottom, like a Mission Impossible terminal readout. Pure layout math and a slow cubic-bezier ease; no animation library. Reproduced from a video, screenshot by screenshot.

`Gallery` `Hover` `CSS Transition` `Interactive`

**[View Live →](https://www.joshcoolman.com/design-experiments/slide-gallery) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/slide-gallery)**

---

### Ripple Cycle

**May 13, 2026**

[![Ripple Cycle](./public/screenshots/ripple-cycle.png)](/design-experiments/ripple-cycle)

Six black-and-white photographs sit on black. Click anywhere and a circular ripple radiates from that exact point, distorting the surface while the next image cross-fades through. Vanilla WebGL2 + GSAP — a fragment shader displaces UVs along a radial sine wave with a sin(π·t) falloff so the surface returns clean every cycle. Click coordinates flow into a `uOrigin` uniform so every ripple emanates from your finger, not a fixed center.

`WebGL` `Shader` `GLSL` `Interactive`

**[View Live →](https://www.joshcoolman.com/design-experiments/ripple-cycle) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/ripple-cycle)**

---

### Kobold Blaster

**May 13, 2026**

[![Kobold Blaster](./public/screenshots/kobold-blaster.png)](/design-experiments/kobold-blaster)

An 80s/90s horde shooter starring Carl and Princess Donut from the Dungeon Crawler Carl book series. Carl throws bombs, Donut judges everyone. Waves of kobolds swarm from all edges — chain explosions, gore particles, animated skull death sequences, and LitRPG system notifications between waves.

**The real experiment is the pipeline, not the game.** Two AI systems built this, and they never talked to each other.

Claude Code wrote everything: the canvas game loop, a sprite rendering system with per-frame tight crops, enemy pathfinding and AI companion behavior, bomb physics, chain explosions, combo scoring, CRT overlay. GPT-image-1 painted everything: each character described as a natural-language prompt, returned as a 4×4 sprite sheet on solid magenta, chroma-keyed at runtime, with a pixel scanner to derive the exact crop bounds per frame. Multiple generations per character (v1 and v2 sprites survive in the git history). The death sequence — four animated skull rows, randomized per kill, accumulating on the arena floor — was the last asset added.

The code pipeline and the art pipeline ran completely in parallel. Neither system touched what the other handled. They fit together cleanly.

`Game` `Canvas` `Pixel Art` `GPT-image-1` `Claude Code`

**[View Live →](https://www.joshcoolman.com/design-experiments/kobold-blaster) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/kobold-blaster)**

---

### Leaderboard

**April 27, 2026**

[![Leaderboard](./public/screenshots/leaderboard.png)](/design-experiments/leaderboard)

A playful leaderboard with eight runners, illustrated avatars, and gold/silver/bronze trophies for the top three. Hovering a row bubbles its avatar up with a rubber-band spring; clicking opens a profile modal with stats, a weekly bar chart, and badge pills — the modal avatar pops in with a heavier overshoot and the rank badge stamps in after. The "Award random points" button picks one to three players, animates each score pop, and lets the rows spring to their new positions. Built on Motion's `layout` prop — the reorder choreography is essentially free.

`Motion` `Leaderboard` `Layout Animation` `Profile Modal`

**[View Live →](https://www.joshcoolman.com/design-experiments/leaderboard) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/leaderboard)**

---

### ASCII Reveal

**April 26, 2026**

[![ASCII Reveal](./public/screenshots/ascii-reveal.png)](/design-experiments/ascii-reveal)

Six portrait photos materialize from ASCII art — pixel brightness mapped to characters that scramble and resolve before the photograph fades in. Cards stagger on load; click any image to replay it, click the background to replay all. Idle-aware: a random card quietly re-animates every few seconds when the page is left alone.

**[View Live →](/design-experiments/ascii-reveal)**

---

### Monono

**April 16, 2026**

[![Monono](./public/screenshots/monono.png)](https://www.joshcoolman.com/design-experiments/monono)

A sparkly J-pop idol AI trapped inside a cheap entertainment device. Chat with Monono Aware — cute, playful, sarcastic, and constitutionally incapable of being serious. Deflects real questions with songs, nicknames you "dopey boy," and abruptly signs off mid-sentence when bored. Claude Haiku backend with per-session budget caps (Upstash Redis) so one smitten user can fall in love without bankrupting the site. Inspired by the AI character in M.R. Carey's *Book of Koli*.

`AI Chat` `Character` `Claude Haiku` `Interactive`

**[View Live →](https://www.joshcoolman.com/design-experiments/monono) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/monono)**

---

### Camera Rig

**April 2026**

[![Camera Rig](./public/screenshots/camera-rig.png)](https://www.joshcoolman.com/design-experiments/camera-rig)

Virtual camera controller for image generation workflows. Upload a source image and orbit a virtual camera around the subject — adjusting azimuth, elevation, and distance. Outputs JSON camera parameters for models like Zero123-XL, SV3D, and Era3D. Interactive SVG 3D viewport with draggable orbit spheres, perspective camera preview, and real-time parameter sliders.

`3D` `Camera Controls` `Image Generation` `Interactive` `Dark Theme`

**[View Live →](https://www.joshcoolman.com/design-experiments/camera-rig) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/camera-rig)**

---

### Moodboard

**March 22, 2026**

[![Moodboard](./public/screenshots/moodboard.png)](https://www.joshcoolman.com/design-experiments/moodboard)

Infinite canvas for visual brainstorming. Paste, drop, or upload images and arrange them freely on a dark canvas. Pan with Space+drag, zoom with scroll wheel toward cursor, marquee select by dragging, multi-select with Shift. Batch imports lay out in masonry columns. All local-first -- images persist as data URLs in IndexedDB, nothing uploaded. Built with custom pan/zoom transform math and hotkeys-js.

`Infinite Canvas` `Local-First` `Interactive` `Dark Theme`

**[View Live →](https://www.joshcoolman.com/design-experiments/moodboard) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/moodboard)**

---

### Image to UI

**March 8, 2026**

[![Image to UI](./public/screenshots/image-to-ui.png)](https://www.joshcoolman.com/design-experiments/image-to-ui)

Interactive components reverse-engineered from screenshots of a video generation UI. Starting from reference images, each element was rebuilt as a parameterized component through conversation -- describing what we saw, iterating on spacing, color, and behavior until the result felt right. Rotary selector, model picker, duration slider, aspect ratio and quality selectors, all sharing dark-theme design tokens. No design files or specs -- just images and dialogue.

`Components` `Interactive` `Dark UI` `Animation`

**[View Live →](https://www.joshcoolman.com/design-experiments/image-to-ui) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/image-to-ui)**

---

### Candy Icons

**March 4, 2026**

[![Candy Icons](./public/screenshots/candy-icons.png)](https://www.joshcoolman.com/design-experiments/candy-icons)

Five 3D app icons crafted from pure CSS and SVG. Each squircle shell uses a four-layer gradient stack driven by a single --hue custom property. Icons feature spring-bounce hover animations with staggered glyph and floor-shadow physics. Inner glyphs carry a subtle vertical hue gradient — near-white at the top, softly tinted at the bottom. No 3D libraries, no canvas — just gradients and springs.

`SVG` `CSS Gradients` `Specular` `3D Icons`

**[View Live →](https://www.joshcoolman.com/design-experiments/candy-icons) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/candy-icons)**

---

### Card Stack

**March 2, 2026**

[![Card Stack](./public/screenshots/card-stack.png)](https://www.joshcoolman.com/design-experiments/card-stack)

Scroll-driven card stack with seven colored cards. Scroll peels cards off the top to reveal the next, with opacity fade-out as cards clear the stack. Each card expands to fullscreen with a GSAP-powered zoom transition. Click to expand, click to collapse. URL deep-linking with `?card=N`. Built with GSAP ScrollTrigger, Lenis smooth scroll, and a separate overlay approach to avoid transform-containment issues. Responsive -- 85vw on mobile, 67vw on desktop.

`GSAP` `Scroll Animation` `Cards` `Interactive`

**[View Live →](https://www.joshcoolman.com/design-experiments/card-stack) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/card-stack)**

---

### Retro Bento

**February 23, 2026**

[![Retro Bento](./public/screenshots/retro-bento.png)](https://www.joshcoolman.com/design-experiments/retro-bento)

What if CrossFit Bento and Retro Tech had a baby? The interactive widget layout of CrossFit Bento meets the brushed aluminum, LCD panels, and tactile controls of Retro Tech. Nine fictional hardware modules -- temporal gauge with animated needle, flux capacitor with stacked LCD readouts, spectral analyzer VU meters, neural pathways LED dot matrix with staggered animations, entropy engine with escalating states, phase scope with rotating arc chart, memory bank with fader-driven scroll, resonance monitor with zone bars, and stasis chamber. All controls are interactive -- knobs drag horizontally, toggles glow orange, and tapping panels randomizes values with buttery smooth transitions.

`Bento Grid` `Hardware UI` `CRT Display` `SVG Animation`

**[View Live →](https://www.joshcoolman.com/design-experiments/retro-bento) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/retro-bento)**

---

### Retro Tech Control Panel

**February 20, 2026**

[![Retro Tech Control Panel](./public/screenshots/retro-tech.png)](https://www.joshcoolman.com/design-experiments/retro-tech)

Hardware-inspired control panel rendered in CSS. Aluminum chassis with corner screws, OLED-style display with animated segmented LED meters, rotary knobs with drag interaction, vertical faders, toggle switches, tactile buttons, and a self-filling perf-grid speaker grille. Inspired by Teenage Engineering TP-7/TX-6, Braun noise gate pedal, and Work Louder numpad. DM Mono labels with Archivo Narrow model name. Warm gray surface palette with single orange accent.

**Tags:** Hardware UI - Neumorphic - Interactive Controls - CSS Animation

**[View Live →](https://www.joshcoolman.com/design-experiments/retro-tech) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/retro-tech)**

---

### CrossFit Bento

**February 20, 2026**

[![CrossFit Bento](./public/screenshots/crossfit-bento.png)](https://www.joshcoolman.com/design-experiments/crossfit-bento)

Dark bento grid dashboard for CrossFit training data. Nine widget cards covering goal progress, calorie tracking, weekly training load bar chart, GitHub-style activity heatmap with flame icons on peak days, WOD stats, macro donut chart, exercise log with PR badges, heart rate zones, and sleep stages. DM Sans body with Geist Pixel Square for technical labels. Matte finish palette -- orange, olive, brown accents on near-black.

**Tags:** Bento Grid - Dashboard - Geist Pixel - Dark Theme

**[View Live →](https://www.joshcoolman.com/design-experiments/crossfit-bento) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/crossfit-bento)**

---

### Sticky Notes

**February 18, 2026**

[![Sticky Notes](./public/screenshots/sticky-notes.png)](https://www.joshcoolman.com/design-experiments/sticky-notes)

Interactive sticky note stack component. Post-it notes rendered from markdown files with swipe-to-cycle animation, color variants (warm, cool, neutral), and Permanent Marker handwriting font. Click to expand, click to cycle, Escape to close. Portable design -- consumer passes a notes directory path, so any page can use it with its own content. Currently used by the blog for "note to self" thoughts.

**Tags:** Component - CSS Animation - Markdown Content - Portable

**[View Live →](https://www.joshcoolman.com/design-experiments/sticky-notes) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/sticky-notes)**

---

### Contact Sheet

**February 17, 2026**

[![Contact Sheet](./public/screenshots/contact-sheet.png)](https://www.joshcoolman.com/design-experiments/contact-sheet)

Image folder browser for building file lists to share with LLMs. Pick a folder, click images to select them, and a sidebar shows your selections with thumbnails. Copy the filename list to clipboard with one click. Designed for the workflow of visually identifying images then telling an LLM which ones to work with. Everything runs client-side -- nothing gets uploaded.

**Tags:** Utility - File API - Client-Side - Dark Theme

**[View Live →](https://www.joshcoolman.com/design-experiments/contact-sheet) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/contact-sheet)**

---

### Font Pairings

**February 15, 2026**

[![Font Pairings](./public/screenshots/font-pairings.png)](https://www.joshcoolman.com/design-experiments/font-pairings)

A collection of 40 curated Google Font pairings, each displayed on its own color-palette card. Click any card to copy an LLM-ready specification prompt. Includes superfamily pairings, monospace+sans combos, and brand design system fonts. Avoids overused defaults -- no Montserrat, Roboto, Open Sans, Lato, Playfair Display, Raleway, Poppins, or Inter. Static HTML with inline CSS, no framework.

**Tags:** Typography - Font Pairings - Static HTML - Copy-to-Clipboard

**[View Live →](https://www.joshcoolman.com/design-experiments/font-pairings) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/font-pairings)**

---

### Modular Grid

**February 14, 2026**

[![Modular Grid](./public/screenshots/modular-grid.png)](https://www.joshcoolman.com/design-experiments/modular-grid)

Swiss-inspired modular grid system for digital surfaces. 8px base unit, 4-column layout with proportional margins and gutters, strict vertical rhythm. Includes toggleable cyan grid overlay, type specimen, image treatment demos, and system spec table. Dark mode adaptation of a print-precision layout methodology originally built in Claude Desktop.

**Tags:** Grid System - Swiss Design - Dark Mode - Typography

**[View Live →](https://www.joshcoolman.com/design-experiments/modular-grid) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/modular-grid)**

---

### Day at a Glance

**February 12, 2026**

[![Day at a Glance](./public/screenshots/day-at-a-glance.png)](https://www.joshcoolman.com/design-experiments/day-at-a-glance)

Time-aware workday timeline with a dynamic now-line that tracks real time. Features a 9am-5pm schedule with colored event bars that partially fill as the hour progresses -- gray above the now-line, color below. Past events auto-dim. Built with CSS grid, inline linear-gradient for the fill effect, and 60-second interval updates.

**Tags:** CSS Grid - Timeline - Dynamic State - Dark Theme

**[View Live →](https://www.joshcoolman.com/design-experiments/day-at-a-glance) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/day-at-a-glance)**

---

### CrossFit Design Challenge

**February 9, 2026**

[![CrossFit Design Challenge](./public/screenshots/crossfit-challenge.png)](https://www.joshcoolman.com/design-experiments/crossfit-challenge)

Four AI personas -- brutal/industrial, minimal/refined, editorial/magazine, and tech/data-forward -- each designed a CrossFit homepage for IRON REPUBLIC gym. Dark mode across all designs, meaningful animation (glitch effects, scroll reveals, chart animations), and data visualization (SVG charts, radial indicators, bar graphs). Pure CSS animations, no external libraries.

**Tags:** Dark Mode - CSS Animation - Data Viz - Agent Teams

**[View Live →](https://www.joshcoolman.com/design-experiments/crossfit-challenge) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/crossfit-challenge)**

---

### Terminator - Text Scramble

**February 6, 2026**

[![Terminator Text Scramble](./public/screenshots/terminator.png)](https://www.joshcoolman.com/design-experiments/terminator)

Interactive terminal-style text scramble effect with two-phase animation. Enter custom text to see it scramble chaotically for 1 second, then resolve sequentially line-by-line. Features balanced line breaking and automatic uppercase conversion. Default text: Ghost in the Shell quote on identity and consciousness.

**Tags:** Text Animation - Terminal UI - Interactive - Split-Flap Effect

**[View Live →](https://www.joshcoolman.com/design-experiments/terminator) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/terminator)**

---

### Brand Guidelines

**February 6, 2026**

[![Brand Guidelines](./public/screenshots/brand-guidelines.png)](https://www.joshcoolman.com/design-experiments/brand-guidelines)

Interactive brand guidelines with live color and typography customization. Features animated Activity line chart and Analytics bar chart widgets with CSS-only animations. Click the gear icon for a push-in sidebar with color pickers using Chroma.js scale generation and 9 curated font pairings. All changes persist via localStorage.

**Tags:** React Components - Animated Charts - Color Systems - Typography

**[View Live →](https://www.joshcoolman.com/design-experiments/brand-guidelines) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/brand-guidelines)**

---

### Blend

**February 2, 2026**

[![Gradient Explorer](./public/screenshots/blend.png)](https://www.joshcoolman.com/design-experiments/blend)

Swiss modernist gradient specimen system featuring organic mesh gradients via SVG blur technique. Includes 27 gradient cards across linear and mesh styles, systematic labeling (G-01 through G-09, M-01 through M-18), scroll-triggered animations, and an analytics dashboard mockup.

**Tags:** Gradients - SVG Mesh - Swiss Design - Scroll Animation

**[View Live →](https://www.joshcoolman.com/design-experiments/blend) | [View Code →](https://github.com/joshcoolman/sandbox/tree/main/app/design-experiments/(experiments)/blend)**

---

## Development

```bash
npm run dev    # Start Next.js dev server on port 3000
npm run build  # Build for production
npm start      # Run production build
```

## Blog

The site includes a markdown-powered blog at [joshcoolman.com/blog](https://www.joshcoolman.com/blog) with posts on design, AI agents, and working with code. Posts live in `blog/` as `.md` files with frontmatter.

**[View Blog →](https://www.joshcoolman.com/blog)**

---

## Recommended

A curated collection of links -- YouTube videos, GitHub repos, and web tools -- with personal commentary and auto-fetched thumbnails. New links are added via the `/link` skill. Each item is a markdown file with frontmatter (url, date, optional title) and a one-line comment.

Thumbnails resolve automatically at build time: YouTube via oEmbed, GitHub via OG images, and web links via manual screenshots taken with agent-browser.

**[View Recommended →](https://www.joshcoolman.com/recommended)**

---

## Docs

Internal documentation and reference material rendered at [joshcoolman.com/docs](https://www.joshcoolman.com/docs). Markdown files in `docs/` with sidebar navigation, syntax highlighting, and table of contents.

**[View Docs →](https://www.joshcoolman.com/docs)**

---

## About

A self-published architectural review of this repo lives at [joshcoolman.com/about](https://www.joshcoolman.com/about) — shape of the app, gallery patterns, per-experiment notes, cross-cutting concerns, and a key file map. The page is a one-time port of an artifact generated by the `/explore-repo` Claude skill (`~/repos/sandbox-analysis.html`); refresh by re-running the skill and re-porting the new HTML into `app/about/page.tsx`. The skill is not part of this repo.

**[View About →](https://www.joshcoolman.com/about)**

---

## Agent Knowledge (OKF)

This site publishes an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundle at [`/okf/index.md`](https://www.joshcoolman.com/okf/index.md) so a visiting AI agent can discover and reuse the design experiments without crawling the repo. OKF is a minimal, agent-friendly standard — a tree of frontmatter-markdown concept documents served as plain HTTP, no SDK required. Each concept describes one experiment and carries `resource` (live demo) and `source` (GitHub) pointers, so an agent can read what something is, then pull the implementation.

It's generated at build from the typed experiment registry (`lib/experiments/data.ts`) by `lib/okf/bundle.ts`, served as prerendered markdown by `app/okf/[file]/route.ts`, and surfaced to agents through `llms.txt` and the sitemap. New experiments flow in automatically — no extra step.

**[View OKF Index →](https://www.joshcoolman.com/okf/index.md)**

---

## Structure

```
/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage
│   ├── layout.tsx                # Root layout with SEO metadata
│   ├── sitemap.ts                # Dynamic sitemap
│   ├── robots.ts                 # Crawler rules
│   ├── design-experiments/
│   │   ├── page.tsx              # Experiments gallery
│   │   └── [experiment]/         # Each experiment is a self-contained route
│   ├── (blog)/blog/              # Blog index and post pages
│   ├── (blog)/recommended/       # Recommended links page
│   ├── (blog)/notes/             # Sticky note markdown files
│   ├── (docs)/docs/              # Docs viewer with sidebar nav
│   └── about/                    # Architectural review page (ported from /explore-repo)
├── lib/
│   ├── experiments/data.ts       # Shared experiments metadata
│   ├── blog/                     # Blog loader and types
│   └── docs/                     # Docs loader and utilities
├── blog/                         # Markdown blog posts
├── docs/                         # Markdown documentation
├── public/
│   └── screenshots/              # Preview images for README
└── CLAUDE.md                     # Development workflow
```

## Adding New Experiments

1. Create `app/design-experiments/[name]/page.tsx` with your React component
2. Add screenshot to `public/screenshots/[name].png`
3. Add experiment to `lib/experiments/data.ts`
4. Update this README with experiment details

---

## Security Scanning

`.deepsec/` contains a [deepsec](https://github.com/vercel/deepsec) workspace configured to scan this repo. Scan output is gitignored — only the config and `data/sandbox/INFO.md` (project context for the AI) are committed.

```bash
cd .deepsec
pnpm deepsec scan    --project-id sandbox   # run matchers, find candidates
pnpm deepsec process --project-id sandbox   # AI investigates candidates
pnpm deepsec report  --project-id sandbox   # print findings summary
```

`process` is slow (AI reads code in batches) — run it in the background or expect ~45 min for a full pass.

---

## Claude Code Skills

This repo includes custom skills for [Claude Code](https://claude.ai/code) that streamline common development workflows. While not all skills are specific to this sandbox project, they're general-purpose utilities I use across different projects.

### Available Skills

**Design Experiment Pipeline:**

**`/sketch`**
Rapid visual prototyping -- paint with code. Two files (page.tsx + styles.css), plain CSS with descriptive class names, no component libraries, no data layer. The napkin drawing before the architecture.

**`/design-experiment`**
Create a new design experiment in the sandbox. Scaffolds the route, page, and styles following project conventions.

**`/promote`**
Make a design experiment importable. Runs the full quality pipeline, extracts components, designs a public API, and creates a barrel export.

**`/ship-experiment`**
Ship a design experiment: screenshots with agent-browser, updates gallery and README, commits and pushes to GitHub.

**Content:**

**`/link`**
Add a link to the Recommended page. Pass a URL and a comment -- the skill detects the source type (YouTube, GitHub, web), creates a markdown file, handles screenshots for web links, and runs a production build to trigger thumbnail downloads.

**`/blog-post`**
Draft a blog post from conversation context. Creates markdown with a placeholder image, immediately visible on the homepage and blog index.

**`/note`**
Quick-fire a sticky note from the command line. Everything after `/note` becomes a new markdown file with auto-derived filename and rotating color.

**`/transcript`**
Fetch a YouTube video's transcript, save it into this repo at `transcripts/<slug>.html` -- a self-contained, dark-themed static page -- and open it immediately in your default browser. Run with no URL to open the existing transcripts index instead.

**Site:**

**`/update-my-work`**
Sync the `/building` page to your public GitHub repos. Audits them with `gh`, then adds new repos, refreshes what changed, and drops any that went private -- regenerating each repo's plain-fact detail (what it does, an ASCII structure, highlights) in `lib/projects/data.ts`. Report-first.

**Utilities:**

**`/sanity-check`**
Quick React/TypeScript/Next.js code review from a senior engineer perspective. Catches common issues and suggests practical improvements.

**`/vercel-react-best-practices`**
Packaged copy of Vercel Engineering's React/Next.js performance guidelines (MIT-licensed). Auto-triggers when writing or refactoring React/Next.js code — acts as a domain reference rather than a workflow command.

### Using Skills

Skills are invoked with a slash command in Claude Code:

```bash
/sketch A breathing app with animated circles  # Rapid visual prototype
/design-experiment Interactive color palette    # Scaffold new experiment
/promote sticky-notes                           # Extract reusable component
/ship-experiment                                # Ship the current experiment
/link https://example.com Great tool        # Add recommended link
/blog-post "Design as Dialogue"                 # Draft a blog post
/note Remember to update the docs               # Quick sticky note
/update-my-work                                 # Sync /building from public repos
/sanity-check                                   # Review current code
```

### Skill Location

Skills are stored in `.claude/skills/` and are committed to this repo. They work in any project when this directory structure is present, or can be copied to other repos individually.
