# Luma Architecture

## Overview

Luma is a static web application composed of:
- Authentication (Spotify Implicit Grant) for user search/profile
- Audio input (microphone or 30s track previews)
- Real-time visualization (Three.js + GLSL fragment shaders)
- A lightweight UI layer (Vanilla JS + Tailwind Play CDN)
- Zero build pipeline; deployable to GitHub Pages

## Module graph

- `index.html`
  - Loads styles and `src/scripts/app.js` (ES module)
- `app.js`
  - Orchestrates auth → audio → visualizer → UI
  - Applies theme
  - Wires up components and events
- `auth.js`
  - Handles login/logout/token storage
  - Fetches `v1/me` profile
- `audioEngine.js`
  - Creates `AudioContext`, `AnalyserNode`
  - Connects to microphone (`getUserMedia`) or `<audio>` element
  - Computes FFT and returns normalized bands: bass/mid/treble
  - Resolves Spotify track ID → preview URL
- `visualizer.js`
  - Initializes Three.js renderer + full-screen quad
  - Loads fragment shaders from `/src/assets/shaders`
  - Exposes uniforms:
    - Time, resolution
    - Audio bands (bass/mid/treble)
    - Colors and generic params (`uParam1..uParam4`)
  - Animation loop updates uniforms and renders
- `presets.js`
  - Catalog of presets with shader filename + default params
  - Optional `audioMap` to map bands → param names
- `components/*`
  - `Navbar.js`: top bar (rendered via UI manager)
  - `SceneSelector.js`: preset picker grid
  - `PlayerControls.js`: transport, search, mic toggle
  - `PresetPreview.js`: placeholder for future shader thumbs
- `ui.js`
  - Inactivity detection to auto-hide UI
  - Toasts, navbar renderer

## Audio paths

- Microphone
  - `MediaStreamSource` → `AnalyserNode`
- Spotify track preview
  - `<audio>` (preview_url) → `MediaElementSource` → `AnalyserNode`

Note: The Spotify Web Playback SDK full tracks cannot be analyzed with Web Audio due to DRM. Luma uses preview URLs for visualization or microphone input. The SDK can still be used to control playback if you extend the app (Premium required).

## Themes

`themes.css` sets CSS variables per time-of-day:
- Morning: soft blues
- Evening: golden ambers
- Night: dark purples

`app.js` applies a body class accordingly.

## Deploy

Static hosting via GitHub Pages. No server required.