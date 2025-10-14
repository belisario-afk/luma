# API Reference

## Spotify Authentication (Authorization Code with PKCE)

Recommended for SPAs and required now that Implicit Grant is no longer supported.

- Authorization endpoint: `https://accounts.spotify.com/authorize`
- Query params:
  - `client_id=927fda6918514f96903e828fcd6bb576`
  - `response_type=code`
  - `redirect_uri=https://belisario-afk.github.io/luma/`
  - `scope=streaming user-read-email user-read-private`
  - `code_challenge_method=S256`
  - `code_challenge=<SHA256(code_verifier) base64url>`
  - `state=<random>`

Exchange code for tokens:
- `POST https://accounts.spotify.com/api/token`
- `Content-Type: application/x-www-form-urlencoded`
- Body:
  - `client_id=927fda6918514f96903e828fcd6bb576`
  - `grant_type=authorization_code`
  - `code=<code>`
  - `redirect_uri=https://belisario-afk.github.io/luma/`
  - `code_verifier=<original verifier>`

Refresh tokens:
- `POST https://accounts.spotify.com/api/token`
- Body:
  - `client_id=927fda6918514f96903e828fcd6bb576`
  - `grant_type=refresh_token`
  - `refresh_token=<refresh_token>`

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
- Bands:
  - Bass: ~20–140 Hz
  - Mid: ~140–2000 Hz
  - Treble: ~2000–11025 Hz
- Normalization: 0..255 → 0..1 floats

## Three.js + Shaders

- Full-screen quad with ShaderMaterial
- Uniforms:
  - `uTime`, `uResolution`
  - `uBass`, `uMid`, `uTreble`
  - `uColor1`, `uColor2`
  - `uParam1..uParam4` for generic floats