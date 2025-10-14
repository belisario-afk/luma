// presets.js - Visual presets catalog

export const presets = [
  {
    id: "fractal-temple",
    name: "Fractal Temple",
    description: "Golden fractals breathing with the bass.",
    shader: "fractalTemple.glsl",
    params: {
      bloomIntensity: 0.6,
      color1: "#FFD77F",
      color2: "#FF8C00",
      motionScale: 1.2
    },
    audioMap: {
      bass: "bloomIntensity",
      mid: "motionScale"
    }
  },
  {
    id: "liquid-neon",
    name: "Liquid Neon",
    description: "Holographic wave grids pulsing to treble.",
    shader: "liquidNeon.glsl",
    params: {
      rippleSize: 0.8,
      glow: 0.5,
      color1: "#33d0ff",
      color2: "#ff33cc"
    },
    audioMap: {
      bass: "rippleSize",
      treble: "glow"
    }
  },
  {
    id: "breathing-bloom",
    name: "Breathing Bloom",
    description: "Expanding floral mandalas.",
    shader: "breathingBloom.glsl",
    params: {
      color1: "#ffd1e8",
      color2: "#7fe3ff",
      bloom: 0.5
    },
    audioMap: {
      bass: "bloom"
    }
  },
  {
    id: "eclipse-pulse",
    name: "Eclipse Pulse",
    description: "Solar eclipse ring with glowing edges.",
    shader: "eclipsePulse.glsl",
    params: {
      color1: "#ffcc7a",
      color2: "#2b2b46",
      glow: 0.6
    },
    audioMap: {
      treble: "glow"
    }
  },
  {
    id: "lofi-mist",
    name: "Lofi Mist",
    description: "Soft ambient haze + gentle sparkles.",
    shader: "lofiMist.glsl",
    params: {
      color1: "#b0c4de",
      color2: "#e6e6f0",
      mist: 0.7
    },
    audioMap: {
      mid: "mist"
    }
  },
  {
    id: "aurora-flow",
    name: "Aurora Flow",
    description: "Northern light ribbons.",
    shader: "auroraFlow.glsl",
    params: {
      color1: "#7fe3ff",
      color2: "#b987ff",
      flow: 0.6
    },
    audioMap: {
      bass: "flow"
    }
  }
];