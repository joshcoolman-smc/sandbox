# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Design experiments sandbox for rapid visual exploration. Each experiment is a self-contained design exercise stored in dated folders.

## Repository Structure

```
/
├── index.html                         # Homepage/changelog
├── screenshots/                       # Homepage preview images
├── YYYY-MM-DD-experiment-name/        # Dated experiment folders
│   ├── index.html                     # The experiment
│   ├── README.md                      # Documentation
│   └── screenshots/                   # Design iterations
└── CLAUDE.md                          # This file
```

## Development Commands

```bash
npm run dev      # Start dev server on port 3000 (auto-opens browser)
npm run build    # Build for production
npm run preview  # Preview production build
```

## Workflow for New Experiments

When the user says "new experiment" or shares an image to explore:

1. **Create dated folder**: `YYYY-MM-DD-descriptive-name/`
2. **Build experiment**: Create `index.html` inside folder
3. **Verify with browser**: Use agent-browser to check the design
4. **Document it**: Create `README.md` with:
   - Overview and key features
   - Design principles
   - How to run
   - Dependencies (fonts, libraries)
   - Screenshots reference
5. **Capture screenshot**:
   - Use agent-browser to take screenshot
   - Save to `/screenshots/experiment-name.png` (for homepage)
   - Also save to experiment's local `screenshots/` folder
6. **Update homepage**: Add entry to root `index.html` with:
   - Date
   - Title (linked to experiment)
   - Preview image: `<img src="./screenshots/experiment-name.png">`
   - One-line description
   - Tags
7. **Ship it**: Commit with descriptive message

## Experiment README Template

```markdown
# Experiment Name

**Date:** Month Day, Year
**Type:** Brief categorization

## Overview
What it is and what it explores

## Key Features
- Bullet list of notable elements

## Design Principles
- Core aesthetic concepts

## How to Run
Steps to view the experiment

## Dependencies
- List external dependencies

## Screenshots
Reference to screenshots folder
```

## Design Philosophy

- **Self-contained**: Each experiment folder can be copied out independently
- **No build required**: Pure HTML/CSS when possible
- **Rapid exploration**: Focus on visual aesthetics over functionality
- **Documented**: Each experiment explains its design thinking
- **Chronological**: Easy to see design progression over time

## Current Experiments

1. **Design Festival** (2026-01-28): Card-based layout with festival aesthetics and LCD widgets
2. **Spec Sheet** (2026-01-28): Typography layout with dark/light mode toggle
3. **Day at a Glance** (2026-01-28): Timeline calendar interface with event blocks
4. **Color Spec** (2026-01-28): Green-focused brand color palette with type specimens
5. **Blend** (2026-01-28): Gradient showcase with bento box/masonry grid layout
