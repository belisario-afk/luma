// presets.js — add Dropper Pack presets that use dedicated composite shaders.
// Each uses blank layers for BG/Bass/Vocal/Treble and renders entirely in the composite.

const L = (file) => `../assets/shaders/layers/${file}`;
const D = (file) => `../assets/shaders/dropper/${file}`;

export const presets = [
  // Dropper pack
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