// presets.js - Presets with color palettes + per-layer weight multipliers
// layerWeights: influence composite blending (bass/vocal/treble multipliers)

export const presets = [
  {
    id: "zen-particles",
    name: "Zen Particles",
    description: "Calming particle flow with gentle beat emissions.",
    shader: "fractalTemple.glsl",
    params: { color1: "#9EE7FF", color2: "#C7A9FF" },
    layerWeights: { bass: 0.9, vocal: 0.8, treble: 0.7 }
  },
  {
    id: "aurora-curtains",
    name: "Aurora Curtains",
    description: "Volumetric ribbons flowing with energy and centroid.",
    shader: "auroraFlow.glsl",
    params: { color1: "#7fe3ff", color2: "#b987ff" },
    layerWeights: { bass: 0.7, vocal: 1.0, treble: 0.9 }
  },
  {
    id: "lotus-bloom",
    name: "Lotus Bloom",
    description: "Petal-like expansions on phrase starts and vocals.",
    shader: "breathingBloom.glsl",
    params: { color1: "#ffd1e8", color2: "#7fe3ff" },
    layerWeights: { bass: 0.6, vocal: 1.1, treble: 0.6 }
  },
  {
    id: "eclipse-rings",
    name: "Eclipse Rings",
    description: "Concentric rings with downbeat shocks and chorus lift.",
    shader: "eclipsePulse.glsl",
    params: { color1: "#ffcc7a", color2: "#2b2b46" },
    layerWeights: { bass: 1.1, vocal: 0.6, treble: 0.8 }
  },
  {
    id: "misty-isles",
    name: "Misty Isles",
    description: "Parallax isles drifting in fog; serene and slow.",
    shader: "lofiMist.glsl",
    params: { color1: "#b0c4de", color2: "#e6e6f0" },
    layerWeights: { bass: 0.5, vocal: 0.7, treble: 0.6 }
  },
  {
    id: "liquid-neon",
    name: "Liquid Neon",
    description: "Holographic grids, treble sparkles and aura.",
    shader: "liquidNeon.glsl",
    params: { color1: "#33d0ff", color2: "#ff33cc" },
    layerWeights: { bass: 0.7, vocal: 0.9, treble: 1.2 }
  }
];