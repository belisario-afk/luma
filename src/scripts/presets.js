// presets.js - Real scenes: each preset supplies its own layerSet (unique shaders)
// so scenes look and move differently, not just color/weights.

const L = (file) => `../assets/shaders/layers/${file}`;

export const presets = [
  {
    id: "zen-particles",
    name: "Zen Particles",
    description: "Calming particle-like flow and soft bokeh sparkles.",
    params: { color1: "#AEE6FF", color2: "#CAB9FF" },
    layerWeights: { bass: 0.7, vocal: 0.6, treble: 0.9 },
    layerSet: {
      bg:    L('background_mistGradient.glsl'),
      bass:  L('bass_concentricRipples.glsl'),
      vocal: L('vocal_ribbons.glsl'),
      treble:L('treble_bokeh.glsl'),
      comp:  L('composite_softBloom.glsl')
    }
  },
  {
    id: "aurora-curtains",
    name: "Aurora Curtains",
    description: "Volumetric nebula with flowing curtains; airy and smooth.",
    params: { color1: "#7fe3ff", color2: "#b987ff" },
    layerWeights: { bass: 0.6, vocal: 1.0, treble: 0.6 },
    layerSet: {
      bg:    L('background_softNebula.glsl'),
      bass:  L('bass_shockWaves.glsl'),
      vocal: L('vocal_kaleidoCurtains.glsl'),
      treble:L('treble_starfield.glsl'),
      comp:  L('composite_softBloom.glsl')
    }
  },
  {
    id: "eclipse-rings",
    name: "Eclipse Rings",
    description: "Concentric orbits, downbeat shocks, dark glow composite.",
    params: { color1: "#ffcc7a", color2: "#2b2b46" },
    layerWeights: { bass: 1.2, vocal: 0.5, treble: 0.8 },
    layerSet: {
      bg:    L('background_mistGradient.glsl'),
      bass:  L('bass_shockWaves.glsl'),
      vocal: L('vocal_ribbons.glsl'),
      treble:L('treble_starfield.glsl'),
      comp:  L('composite_darkGlow.glsl')
    }
  },
  {
    id: "liquid-neon",
    name: "Liquid Neon",
    description: "Holographic grid energy; bright and modern.",
    params: { color1: "#33d0ff", color2: "#ff33cc" },
    layerWeights: { bass: 0.8, vocal: 0.8, treble: 1.1 },
    layerSet: {
      bg:    L('background_softNebula.glsl'),
      bass:  L('bass_concentricRipples.glsl'),
      vocal: L('vocal_kaleidoCurtains.glsl'),
      treble:L('treble_bokeh.glsl'),
      comp:  L('composite_softBloom.glsl')
    }
  },
  {
    id: "misty-isles",
    name: "Misty Isles",
    description: "Parallax mist + sparse stars; very gentle motion.",
    params: { color1: "#b0c4de", color2: "#e6e6f0" },
    layerWeights: { bass: 0.5, vocal: 0.6, treble: 0.5 },
    layerSet: {
      bg:    L('background_mistGradient.glsl'),
      bass:  L('bass_concentricRipples.glsl'),
      vocal: L('vocal_ribbons.glsl'),
      treble:L('treble_starfield.glsl'),
      comp:  L('composite_softBloom.glsl')
    }
  }
];