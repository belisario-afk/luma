// visualizer.js — engine switch wrapper (Babylon.js WebGPU-first with fallback, or existing Three.js)
//
// Usage remains the same in app.js:
//   import { Visualizer } from './visualizer.js'
//   viz = new Visualizer({ container })
//   await viz.init(); await viz.loadPreset(...); viz.setAudioGetter(...); viz.start();

import { getEnginePreference } from './engine/flags.js';

export class Visualizer {
  constructor(opts) {
    this.opts = opts;
    this.engineName = getEnginePreference(); // 'babylon' | 'three'
    this.impl = null;
  }

  async init() {
    if (this.engineName === 'babylon') {
      const mod = await import('./babylon/renderer.js');
      this.impl = new mod.BabylonRenderer(this.opts);
    } else {
      const mod = await import('./visualizerLayers.js');
      const Impl = mod.MultiLayerVisualizer || mod.Visualizer;
      this.impl = new Impl(this.opts);
    }
    return this.impl.init?.();
  }

  async loadPreset(preset) {
    // Three.js path: loadPreset(preset) uses shader sets/colors
    // Babylon path: we map preset.id to a scene id if present; otherwise ignore gracefully
    return this.impl.loadPreset?.(preset);
  }

  setAudioGetter(fn) { this.impl.setAudioGetter?.(fn); }
  setTuning(t) { this.impl.setTuning?.(t); }
  setAlbumColors(palette, enabled = true) { this.impl.setAlbumColors?.(palette, enabled); }
  setAlbumTexture(url) { return this.impl.setAlbumTexture?.(url); }
  start() { this.impl.start?.(); }
  dispose() { this.impl.dispose?.(); }
}