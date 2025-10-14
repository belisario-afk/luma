# API Reference

## Spotify Authentication (Implicit Grant Flow)

- Authorization endpoint: `https://accounts.spotify.com/authorize`
- Required query params:
  - `client_id=927fda6918514f96903e828fcd6bb576`
  - `response_type=token`
  - `redirect_uri=https://belisario-afk.github.io/luma/`
  - `scope=streaming user-read-email user-read-private`
  - `state=<random>`

On success, you receive `#access_token=...&token_type=Bearer&expires_in=3600` in the hash fragment. The app stores this in `localStorage` with an expiry timestamp.

## Spotify Web API

- Get current user profile:
  - `GET https://api.spotify.com/v1/me`
  - Headers: `Authorization: Bearer <token>`
- Search tracks:
  - `GET https://api.spotify.com/v1/search?q=<query>&type=track&limit=12`
- Get track by ID:
  - `GET https://api.spotify.com/v1/tracks/{id}`
  - Use `preview_url` for 30s audio clips (if available)

## Web Audio API

- `AudioContext` + `AnalyserNode` with `fftSize=2048`
- Band segmentation:
  - Bass: ~20–140 Hz
  - Mid: ~140–2000 Hz
  - Treble: ~2000–11025 Hz
- Normalization: byte frequency data (0..255) → (0..1) floats

## Three.js + Shaders

- Full-screen plane with ShaderMaterial
- Default uniforms:
  - `uniform float uTime;`
  - `uniform vec2 uResolution;`
  - `uniform float uBass, uMid, uTreble;`
  - `uniform vec3 uColor1, uColor2;`
  - `uniform float uParam1..uParam4;` (generic)
- Presets define:
  - `shader` filename (fragment only)
  - `params` object to set colors/params
  - Optional `audioMap` to map `bass/mid/treble` → param name

## Rate limits / Constraints

- Spotify Web API may rate-limit excessive requests. Cache results in the UI where possible.
- `preview_url` may be absent for some tracks; instruct users to try another track or use Mic mode.