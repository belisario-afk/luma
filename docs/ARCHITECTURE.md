# Luma Architecture (Production)

## Overview

Luma is a static web application composed of:
- Authentication (Spotify PKCE) for user search/profile and SDK control
- Audio input:
  - Microphone or 30s previews: real-time FFT via Web Audio
  - Spotify SDK (Premium): full-track playback; visuals driven by Spotify Audio Analysis/Features or musical fallback
- A layered visual engine (Three.js + GLSL multi-pass)
- A choreography-friendly feature set (beats, sections, energy, spectral flux, centroid, vocal band)
- A lightweight UI layer (vanilla JS + production-safe CSS)
- Zero build pipeline; deployable to GitHub Pages

## Modules

- `index.html`: base HTML and styles; loads the SDK and app entry
- `auth.js`: PKCE login, token storage/refresh, profile fetch
- `audioEngine.js`: Web Audio `AnalyserNode`, extended features (sub/bass/low-mid/mid/high-mid/treble, vocal, energy, centroid, spectral flux, zcr, beats)
- `analysisEngine.js`: Spotify Audio Analysis/Features → synthesized bands for SDK mode; graceful fallbacks
- `spotifyPlayer.js`: Web Playback SDK wrapper with activation, transfer, play/pause, position estimation
- `visualizerLayers.js`: multi-pass renderer
  - Background, Bass/Sub, Vocal, Treble layers → Composite
  - Album palette/texture support
  - Live tuning (sensitivity, smoothing, clamp, gamma) with EMA smoothing
- `presets.js`: palette + per-layer weights for the compositor
- `color.js`: album palette extraction
- `app.js`: orchestrates everything and binds UI events
- `components/*`: UI building blocks (navbar, scene selector, controls)
- `styles/*`: project CSS and themes

## Audio paths

- Microphone
  - `MediaStreamSource` → `AnalyserNode`
- Preview (30s)
  - `<audio>` (preview_url) → `MediaElementSource` → `AnalyserNode`
- SDK (full tracks)
  - Playback via DRM; audio not accessible to Web Audio
  - Visuals driven by analysis/features or fallback musical synth, synchronized to SDK position

## Choreography

- Primary triggers: beats/downbeats, energy, sections/phrases (when available)
- Secondary modulation: vocal flux, spectral centroid/slope, treble detail (zcr)
- Layer weights per scene control the composite look
- UI tuning scales sensitivity/smoothing/clamping/gamma globally

## Deploy

Static hosting via GitHub Pages. No server required.