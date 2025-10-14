# API Reference

## Spotify Authentication (Authorization Code with PKCE)

- Authorization endpoint: `https://accounts.spotify.com/authorize`
- Query params:
  - `client_id=927fda6918514f96903e828fcd6bb576`
  - `response_type=code`
  - `redirect_uri=https://belisario-afk.github.io/luma/`
  - `scope=streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state`
  - `code_challenge_method=S256`
  - `code_challenge=<SHA256(code_verifier) base64url>`
  - `state=<random>`

Exchange code for tokens:
- `POST https://accounts.spotify.com/api/token`
- Headers: `Content-Type: application/x-www-form-urlencoded`
- Body:
  - `client_id`
  - `grant_type=authorization_code`
  - `code`
  - `redirect_uri`
  - `code_verifier`

Refresh tokens:
- `POST https://accounts.spotify.com/api/token`
- Body:
  - `client_id`
  - `grant_type=refresh_token`
  - `refresh_token`

## Spotify Web API

- Get current user profile:
  - `GET https://api.spotify.com/v1/me`
  - Headers: `Authorization: Bearer <token>`
- Search tracks:
  - `GET https://api.spotify.com/v1/search?q=<query>&type=track&limit=12`
- Get track by ID:
  - `GET https://api.spotify.com/v1/tracks/{id}`
  - Use `preview_url` for 30s audio clips (if available)
- Audio analysis (SDK visuals, when accessible):
  - `GET https://api.spotify.com/v1/audio-analysis/{id}`
- Audio features fallback:
  - `GET https://api.spotify.com/v1/audio-features/{id}`

## Web Audio API

- `AudioContext` + `AnalyserNode` with `fftSize=2048`
- Bands:
  - Sub: 20–60 Hz
  - Bass: 60–160 Hz
  - Low-Mid: 160–400 Hz
  - Mid: 400–2000 Hz
  - High-Mid: 2–6 kHz
  - Treble: 6–11 kHz
  - Vocal proxy: 1–4 kHz
- Derived:
  - Energy (avg magnitude), spectral centroid, spectral flux (onsets), zero-crossing rate, beat pulse

## Three.js + Shaders

- Multi-pass layers (Background, Bass, Vocal, Treble) → Composite
- Common uniforms:
  - `uTime`, `uResolution`
  - `uSub`, `uBass`, `uLowMid`, `uMid`, `uHighMid`, `uTreble`
  - `uVocal`, `uEnergy`, `uCentroid`, `uFlux`, `uZcr`, `uBeat`
  - `uColor1`, `uColor2` (scene palette)
  - `uAlbumAvg`, `uAlbumTex`, `uAlbumOn` (album-aware)
- Composite uniforms:
  - `tBG`, `tBass`, `tVocal`, `tTreble`, `uWBass`, `uWVocal`, `uWTreble`

## Constraints

- SDK full-track playback requires Spotify Premium.
- Analysis/Features endpoints may return 403 for non-testers; visualizer falls back gracefully.