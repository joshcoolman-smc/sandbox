# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simple Vite-based static site for visualizing CSS Grid section/block layout patterns. Single HTML file with embedded styles.

## Development Commands

```bash
npm run dev      # Start dev server on port 3000 (auto-opens browser)
npm run build    # Build for production
npm run preview  # Preview production build
```

## Architecture

- **Single-file architecture**: All code in `index.html` (markup, styles, no JavaScript)
- **Vite configuration**: Custom port (3000), auto-open browser on dev
- **No build artifacts**: No src/ directory, no components, no TypeScript
- **Pure CSS Grid**: Examples demonstrate grid-column/grid-row spanning patterns
