// presets.js - Presets with color palettes + per-layer weight multipliers
// layerWeights: influence composite blending (bass/vocal/treble multipliers)

export const presets = [
  {
    id: "fractal-temple",
    name: "Fractal Temple",
    description: "Golden fractals breathing with the bass.",
    shader: "fractalTemple.glsl",
    params: {
      color1: "#FFD77F",
      color2: "#FF8C00"
    },
    layerWeights: { bass: 1.0, vocal: 0.8, treble: 0.6 }
  },
  {
    id: "liquid-neon",
    name: "Liquid Neon",
    description: "Holographic wave grids pulsing to treble.",
    shader: "liquidNeon.glsl",
    params: {
      color1: "#33d0ff",
      color2: "#ff33cc"
    },
    layerWeights: { bass: 0.7, vocal: 0.9, treble: 1.2 }
  },
  {
    id: "breathing-bloom",
    name: "Breathing Bloom",
    description: "Expanding floral mandalas.",
    shader: "breathingBloom.glsl",
    params: {
      color1: "#ffd1e8",
      color2: "#7fe3ff"
    },
    layerWeights: { bass: 0.6, vocal: 0.8, treble: 0.7 }
  },
  {
    id: "eclipse-pulse",
    name: "Eclipse Pulse",
    description: "Solar eclipse ring with glowing edges.",
    shader: "eclipsePulse.glsl",
    params: {
      color1: "#ffcc7a",
      color2: "#2b2b46"
    },
    layerWeights: { bass: 1.1, vocal: 0.6, treble: 0.8 }
  },
  {
    id: "lofi-mist",
    name: "Lofi Mist",
    description: "Soft ambient haze + gentle sparkles.",
    shader: "lofiMist.glsl",
    params: {
      color1: "#b0c4de",
      color2: "#e6e6f0"
    },
    layerWeights: { bass: 0.5, vocal: 0.7, treble: 0.6 }
  },
  {
    id: "aurora-flow",
    name: "Aurora Flow",
    description: "Northern light ribbons.",
    shader: "auroraFlow.glsl",
    params: {
      color1: "#7fe3ff",
      color2: "#b987ff"
    },
    layerWeights: { bass: 0.7, vocal: 1.0, treble: 0.9 }
  }
];