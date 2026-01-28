# Design Experiments Sandbox

A playground for exploring visual design systems, widgets, and layout experiments. Each experiment is a self-contained, one-page design exercise.

## Structure

```
/
├── index.html                         # Homepage/changelog
├── 2026-01-28-design-festival/        # Experiment folders (date-prefixed)
│   ├── index.html                     # The experiment
│   ├── README.md                      # Documentation
│   └── screenshots/                   # Design iterations
├── YYYY-MM-DD-experiment-name/        # Future experiments
└── CLAUDE.md                          # Workflow guidance
```

## Experiments

### [Design Festival](./2026-01-28-design-festival/) (Jan 28, 2026)
Card-based layout system with festival poster aesthetics and digital interface patterns. Features LCD widgets, Swiss typography, and modular grid.

## Workflow

1. **New Experiment**: Each design session creates a new dated folder
2. **Self-Contained**: Each folder has everything needed to run independently
3. **Documented**: README explains the concept, features, and how to run
4. **Logged**: Homepage lists all experiments chronologically

## Running Experiments

**Option 1: Direct**
```bash
open 2026-01-28-design-festival/index.html
```

**Option 2: Dev Server**
```bash
npm run dev
# Then navigate to the experiment folder
```

## Tech Stack

- Pure HTML/CSS (no build required)
- Google Fonts
- Vite dev server (optional)

## Purpose

This sandbox is for rapid design exploration—building visual systems, testing layouts, and creating reusable design patterns. Each experiment is a sketch, not a production app.

---

**View all experiments:** [Homepage](./index.html)
