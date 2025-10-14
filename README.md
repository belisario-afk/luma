# Luma

Spotify-connected, audio-reactive visualization and meditation web app. Choose a Spotify track (full track via Spotify SDK or 30s preview) or use microphone input, and enjoy real-time, audio-synchronized visual scenes.

- Live URL (after deploy): https://belisario-afk.github.io/luma/
- Redirect URI (Spotify): https://belisario-afk.github.io/luma/
- Client ID: 927fda6918514f96903e828fcd6bb576

Note: Full-track playback uses the Spotify Web Playback SDK (Premium required). Visuals in SDK mode are driven by Spotify’s Audio Analysis synchronized to playback position. In Preview/Microphone modes, visuals are driven by live FFT via the Web Audio API.

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

3) Log in with Spotify (production)
- Visit https://belisario-afk.github.io/luma/
- Click "Login with Spotify"
- Approve permissions: streaming, user-read-email, user-read-private, user-read-playback-state, user-modify-playback-state
- Premium is required for SDK full-track playback. If not available, use Preview or Microphone modes.

4) Use the app
- Select a Scene (preset)
- Choose a Source:
  - Preview (30s): plays track previews and uses live FFT for visuals
  - Spotify (Full): plays full tracks via the Spotify SDK; visuals use Audio Analysis synchronized to player position
  - Microphone: uses your mic input and live FFT
- Search for a track and click it to play in the chosen source mode.
- Use Play/Pause controls. UI fades after inactivity; move the mouse/tap to show it.

5) Deploy to GitHub Pages
- Create the repo `luma` under your GitHub account
- Push this folder as the root of the repo
- In repo Settings → Pages, set Source: `Deploy from a branch`, Branch: `main` and folder `/ (root)`
- Your app will be at https://belisario-afk.github.io/luma/

## Tech Stack

- HTML5, CSS3 (Tailwind CDN + custom themes; optional prebuilt CSS)
- Vanilla JavaScript (ES modules)
- Three.js + GLSL shaders
- Spotify Web API + Web Playback SDK (full tracks)
- Web Audio API (FFT for previews and mic)
- GitHub Pages (static hosting)

## Notes

- The Web Playback SDK's audio output cannot be piped into the Web Audio API due to DRM. In SDK mode we synthesize band data from the Spotify Audio Analysis (per-segment loudness/timbre) in sync with the current playback position.
- In Preview or Microphone modes, we perform true real-time FFT analysis.

## Tailwind in production

The Tailwind CDN warning is informational. For a production CSS build, see tailwind-setup.md (optional).