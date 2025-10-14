# Contributing to Luma

Thanks for your interest in contributing!

## Ways to contribute

- Add or improve visual presets
- Create new shaders
- Improve UI/UX or accessibility
- Add integrations (e.g., Philips Hue, Nanoleaf, WebXR)

## Development setup

- No build tools required. Use a static server:
  - `python -m http.server 5173`
  - or `npx serve -p 5173 .`
- Open http://localhost:5173/luma/

Note: Spotify login callback is only configured for the production URL. Locally, you can test microphone input and visual presets.

## Adding a new preset

1) Create your fragment shader in `src/assets/shaders/yourPreset.glsl`
2) Add a preset entry in `src/scripts/presets.js`:
```js
{
  id: "your-id",
  name: "Your Name",
  description: "Short description",
  shader: "yourPreset.glsl",
  params: {
    // optional floats and colors
    yourFloat: 0.5,
    color1: "#ffffff",
    color2: "#000000"
  },
  audioMap: {
    // optionally map bass/mid/treble to a param name
    bass: "yourFloat"
  }
}
```
3) Reference params inside your shader using the existing uniforms:
- `uTime`, `uResolution`
- `uBass`, `uMid`, `uTreble`
- `uColor1`, `uColor2`
- `uParam1..uParam4` for generic floats

4) Test the preset by selecting it from the Scenes picker.

## Coding guidelines

- Vanilla ES modules only; keep dependencies minimal
- Keep functions small and well-commented
- Prefer pure functions and simple data structures
- Document any non-obvious math in shaders

Thanks again for contributing!