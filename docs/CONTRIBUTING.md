# Contributing to Luma

Thanks for your interest in contributing! This project is a static, production-ready visualizer.

## Ways to contribute

- Add or improve layered scenes
- Create new GLSL layer shaders (background/bass/vocal/treble/composite)
- Improve UI/UX or accessibility
- Add integrations (e.g., Philips Hue, Nanoleaf, WebXR)

## Development setup

- No build tools required. Use a static server:
  - `python -m http.server 5173`
  - or `npx serve -p 5173 .`
- Open http://localhost:5173/luma/

Note: Spotify login callback is configured for the production URL. Locally, use Microphone or Preview mode (SDK mode requires Premium and will only fully function on the configured redirect domain).

## Scene authoring guidelines

- Scenes are layered via `src/scripts/visualizerLayers.js` using four layer fragment shaders plus a composite.
- Each scene config lives in `src/scripts/presets.js` as a palette and per-layer weight multipliers.
- Album-aware theming:
  - Colors come from the album cover via `extractPaletteFromImage`.
  - Texture (album cover) is optionally sampled in background/aurora-like layers; keep it subtle.
- Reactivity drivers available in shader uniforms:
  - uSub, uBass, uLowMid, uMid, uHighMid, uTreble
  - uVocal, uEnergy, uCentroid, uFlux (spectral flux), uZcr (zero-cross rate), uBeat
  - uColor1, uColor2 (base palette), uAlbumAvg, uAlbumTex, uAlbumOn
  - uTime, uResolution

## Coding guidelines

- Vanilla ES modules only; keep dependencies minimal
- Keep GLSL numerically stable and avoid overdraw-heavy effects
- Avoid harsh flashing; clamp outputs and use smoothing
- Document the intent of complex maths directly in shader comments

Thanks again for contributing!