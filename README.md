# Cube Timer (React)

A fast, clean, mobile-friendly (ish, im getting there) Rubik’s Cube timer built with React + Vite. Focused on smooth UX, accurate timing, and simple session management.

## Features
- **Accurate timing** with optional hold-to-start and multi-phase splits.  
- **Precision/Timer mode:** live timer (3dp / 2dp / 1dp / seconds / no-live) or **Typing mode** (press Enter to submit; numeric validation).  
- **Stats at a glance:** best single, Mo3, Ao5 / Ao12 / Ao25 / Ao50 / Ao100, plus **CAx custom average** (defaults to 5% drop).  
- **AO5 Prediction panel** showing possible ranges and “sub-X” targets.  
- **Graphs** for recent solves (Single / MO3 / AO5 / AO12 / AO25 / AO50 / AO100); choose last *X* solves; half/full width; click to enlarge.  
- **Session management:** per-session or global settings, draggable panel order, persistence via Local Storage.  
- **Mobile UI:** responsive bottom dock and sidebar, both resizable with sensible limits.  
- **Keyboard/touch:** Space to start/stop (with hold if enabled), any key to stop, **Enter** to submit in Typing mode, tap/click to stop.


## Quick Start
```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
