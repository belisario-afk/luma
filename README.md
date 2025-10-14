# Luma

Spotify-connected, audio-reactive visualization and meditation web app. Choose a Spotify track (or use microphone input) and enjoy real-time, audio-synchronized visual scenes.

- Live URL (after deploy): https://belisario-afk.github.io/luma/
- Redirect URI (Spotify): https://belisario-afk.github.io/luma/
- Client ID: 927fda6918514f96903e828fcd6bb576

Note: Full Spotify login works on the GitHub Pages URL due to Spotify redirect rules. Locally, you can still use Microphone mode or local audio previews.

## Quick Start

1) Install (no build required)
- This is a static site. You only need a local web server.

2) Run locally
- Option A: Python
  - Python 3: `python -m http.server 5173`
  - Open http://localhost:5173/luma/
- Option B: npx serve
  - `npx serve -p 5173 .`
  - Open http://localhost:5173/luma/

3) Log in with Spotify (on production)
- Visit https://belisario-afk.github.io/luma/
- Click "Login with Spotify"
- Approve permissions (streaming, user-read-email, user-read-private)
- If you don’t have Premium or a track has no preview, use Microphone mode.

4) Use the app
- Pick a preset from the Scene Selector
- Search for a track (uses 30s preview URLs when available) and press Play
- Or enable the Microphone and play music around your mic
- UI fades away after a few seconds of inactivity; move the mouse/tap to show it again

5) Deploy to GitHub Pages
- Create the repo `luma` under your GitHub account
- Push this folder as the root of the repo
- In repo Settings → Pages, set Source: `Deploy from a branch`, Branch: `main` and folder `/ (root)`
- Your app will be at https://belisario-afk.github.io/luma/

## Tech Stack

- HTML5, CSS3 (Tailwind Play CDN + custom themes)
- Vanilla JavaScript (ES modules)
- Three.js + GLSL shaders
- Spotify Web API (+ optional Web Playback SDK if Premium)
- Web Audio API (FFT, mic input)
- GitHub Pages (static hosting)

## Notes on Spotify Playback

- Visualizer uses live audio from:
  - Microphone input, or
  - Track preview URLs (30s clips) for most tracks
- Web Playback SDK full tracks require Spotify Premium and cannot be piped into the Web Audio API for FFT due to DRM. For visualization, we default to preview URLs or mic input.

## Development

- No bundlers required; all ES modules load directly in the browser
- Shaders are loaded dynamically from `/src/assets/shaders`
- See `docs/ARCHITECTURE.md` and `docs/API_REFERENCE.md` for details

## License

MIT (or your choice)