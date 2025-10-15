// presets.js — Add Babylon 3D scenes to the selector, plus existing Dropper pack.

const L = (file) => `../assets/shaders/layers/${file}`;
const D = (file) => `../assets/shaders/dropper/${file}`;

export const presets = [
  // Babylon 3D pack (engine=babylon required)
  {
    id: "firefly-flock",
    name: "Firefly Flock (3D)",
    description: "Ambient GPU particles with reactive flicker and emission.",
    params: { color1: "#f7f4e8", color2: "#b1e3ff" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: L('blank.glsl') }
  },
  {
    id: "aurora-veils",
    name: "Aurora Veils (3D)",
    description: "Flowing filmic ribbons; energy and bass shape motion.",
    params: { color1: "#7fe3ff", color2: "#b987ff" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: L('blank.glsl') }
  },
  {
    id: "stone-tessellation",
    name: "Stone Tessellation (3D)",
    description: "Textured kaleido relief; energy lifts exposure.",
    params: { color1: "#d29cff", color2: "#7fe3ff" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: L('blank.glsl') }
  },
  {
    id: "infinite-drop",
    name: "Infinite Drop SDF (3D)",
    description: "Twisted tunnel raymarcher; camera drops infinitely; beat pulses.",
    params: { color1: "#ff8ed1", color2: "#7fe3ff" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: L('blank.glsl') }
  },
  {
    id: "ring-flight",
    name: "Ring Flight (3D)",
    description: "Neon torus tunnel; camera fly-through; reactive scale/rotation.",
    params: { color1: "#7fe3ff", color2: "#ff7fd1" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: L('blank.glsl') }
  },

  // Dropper pack (GLSL composite scenes)
  {
    id: "dropper-spiral-tunnel",
    name: "Spiral Tunnel",
    description: "Rainbow dash spiral with beat pulses and bass-driven spin.",
    params: { color1: "#ff7fd1", color2: "#7fe3ff" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: D('spiralTunnel.glsl') }
  },
  {
    id: "dropper-dot-kaleido",
    name: "Dot Kaleido Dome",
    description: "Dense mirrored dot constellations; vocal/flux animate density.",
    params: { color1: "#ffd06a", color2: "#8ab6ff" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: D('dotKaleido.glsl') }
  },
  {
    id: "dropper-pixel-burst",
    name: "Pixel Burst Tunnel",
    description: "Radial voxel rays with treble-driven pixel grid and beat glitches.",
    params: { color1: "#ff61b6", color2: "#61d0ff" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: D('pixelBurstTunnel.glsl') }
  },
  {
    id: "dropper-kaleido-cave",
    name: "Kaleido Cave",
    description: "Textured kaleidoscopic stone pattern; energy lifts relief.",
    params: { color1: "#d29cff", color2: "#7fe3ff" },
    layerWeights: { bass: 1, vocal: 1, treble: 1 },
    layerSet: { bg: L('blank.glsl'), bass: L('blank.glsl'), vocal: L('blank.glsl'), treble: L('blank.glsl'), comp: D('caveKaleido.glsl') }
  }
];