# Luma (Production)

Spotify-connected, audio-reactive visualization and meditation web app. Full-track playback via Spotify Web Playback SDK (Premium), plus 30s Preview and Microphone modes. Layered, choreographed scenes with album-aware theming.

- Live URL (after deploy): https://belisario-afk.github.io/luma/
- Redirect URI (Spotify): https://belisario-afk.github.io/luma/
- Client ID: 927fda6918514f96903e828fcd6bb576

## Quick Start

- Install: no build needed (pure static site)
- Run locally:
  - Python: `python -m http.server 5173` then open http://localhost:5173/luma/
  - Node: `npx serve -p 5173 .` then open http://localhost:5173/luma/
- Login (production URL): visit https://belisario-afk.github.io/luma/ and click “Login with Spotify”
  - Approve: streaming, user-read-email, user-read-private, user-read-playback-state, user-modify-playback-state
  - Premium required for full-track SDK mode; otherwise use Preview or Microphone modes
- Use:
  - Pick a Scene
  - Choose Source: Preview (30s), Spotify (Full), or Microphone
  - Search and click a track; then press Play (activates SDK when using Spotify mode)
  - Tune Sensitivity / Smoothing / Clamp / Gamma; enable/disable album color/texture
- Deploy to GitHub Pages:
  - Create repo `luma`, push this folder at repo root
  - Settings → Pages → Deploy from branch → main → root

## Notes

- SDK audio cannot be piped into Web Audio; SDK mode visuals use Spotify’s Audio Analysis when available, fall back to audio-features, then to a musical time-based synth. Preview/Mic modes use true real-time FFT.
- All UI/visual tuning persists in localStorage. No Tailwind CDN is used (production-safe CSS).

## License

MIT (or your choice)