# Cube Timer (React)

A fast, clean, mobile-friendly (ish, im getting there) Rubik’s Cube timer built with React + Vite. Focused on smooth UX, accurate timing, and simple session management.

## Features
- **Accurate timing** with optional hold-to-start and multi-phase splits.
- **Typing mode** input (press Enter to submit) or live timer with selectable precision (3dp/2dp/1dp/seconds/no-live).
- **Stats at a glance:** best single, Mo3, Ao5/Ao12/Ao25/Ao50/Ao100.
- **Prediction panel** (AO5 helper) with possible ranges and “sub-X” targets.
- **Graphs** for the most recent *X* solves (configurable, half/full width).
- **Session management:** per-session or global settings; persists via Local Storage.
- **Mobile UI:** bottom dock + sidebar resizable by drag, capped within viewport.
- **Keyboard/touch:** Space to start (with hold if enabled), any key to stop, tap/click to stop.

## Quick Start
```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
