// BabylonRenderer — WebGPU-first (auto-fallback to WebGL2). No bundler required.
// Loads Babylon UMD from CDN and renders into a canvas inside the provided container.

import { getProgramPreference } from '../engine/flags.js';
import { maybeStartProgram } from '../director.js';

function ensureBabylonLoaded() {
  return new Promise((resolve, reject) => {
    if (window.BABYLON) return resolve();
    const urls = [
      'https://cdn.babylonjs.com/babylon.js',
      'https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js',
      'https://cdn.babylonjs.com/postProcessesLibrary/babylonjs.postProcess.min.js',
      'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js'
    ];
    let i = 0;
    const next = () => {
      if (i >= urls.length) return resolve();
      const s = document.createElement('script');
      s.src = urls[i++];
      s.onload = next;
      s.onerror = () => reject(new Error('Failed to load Babylon dependencies.'));
      document.head.appendChild(s);
    };
    next();
  });
}

export class BabylonRenderer {
  constructor({ container }) {
    this.container = container;
    this.canvas = null;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.light = null;

    this._audioGetter = null;
    this._raf = 0;
    this._sceneUpdater = () => {};

    this._currentSceneId = '';
  }

  async init() {
    await ensureBabylonLoaded();
    const B = window.BABYLON;

    // Canvas
    this.container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);

    // Engine (WebGPU-first is automatic when supported by Babylon EngineOptions)
    this.engine = new B.Engine(this.canvas, true, {
      antialias: true,
      adaptToDeviceRatio: true,
      powerPreference: 'high-performance'
    });

    // Scene
    this.scene = new B.Scene(this.engine);
    this.scene.clearColor = new B.Color4(0, 0, 0, 1);

    // Camera
    this.camera = new B.ArcRotateCamera('cam', Math.PI / 2.3, Math.PI / 2.6, 6, B.Vector3.Zero(), this.scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 20;
    // no pointer controls; this is ambient

    // Light
    this.light = new B.HemisphericLight('hemi', new B.Vector3(0, 1, 0), this.scene);
    this.light.intensity = 0.7;

    // Post-process baseline: image processing with ACES-ish tonemapping
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.exposure = 1.0;

    window.addEventListener('resize', () => this.engine.resize());

    // Auto-run program if requested
    const program = getProgramPreference();
    if (program) {
      // Defer until start() so audio getter is likely set
      this._autoProgram = program;
    }
  }

  async loadPreset(preset) {
    // Map known presets to Babylon scenes for first pass.
    // You can expand this mapping as you add more Babylon scenes.
    const id = (preset?.id || '').toLowerCase();

    // Dropper pack can be ignored; we’ll keep current scene unless explicitly a Babylon scene:
    // We will accept: 'firefly-flock', 'aurora-veils', 'stone-tessellation'
    if (id.includes('firefly')) return this.loadScene('firefly-flock');
    if (id.includes('aurora')) return this.loadScene('aurora-veils');
    if (id.includes('stone')) return this.loadScene('stone-tessellation');
    // Otherwise, no-op; Babylon scenes are selected via program or explicit calls.
  }

  setAudioGetter(fn) { this._audioGetter = fn; }
  setTuning(_t) { /* optional: tie into post-processing later */ }
  setAlbumColors(_palette, _enabled = true) { /* optional: color grading pipeline */ }
  async setAlbumTexture(_url) { /* optional background */ }

  async loadScene(sceneId) {
    const B = window.BABYLON;
    // Dispose previous meshes/effects but keep camera/light/scene
    if (this._currentSceneId) {
      // Dispose all root meshes except camera target helpers
      this.scene.meshes.slice().forEach(m => m.dispose && m.dispose());
      this.scene.particleSystems.slice().forEach(ps => ps.dispose && ps.dispose());
      this.scene.postProcesses?.slice().forEach(pp => pp.dispose && pp.dispose());
      // Keep camera/light
    }

    if (sceneId === 'firefly-flock') {
      const mod = await import('./scenes/fireflyFlock.js');
      this._sceneUpdater = mod.buildFireflyFlock(this.scene);
      this._currentSceneId = sceneId;
      return;
    }

    if (sceneId === 'aurora-veils') {
      const mod = await import('./scenes/auroraVeils.js');
      this._sceneUpdater = mod.buildAuroraVeils(this.scene);
      this._currentSceneId = sceneId;
      return;
    }

    if (sceneId === 'stone-tessellation') {
      const mod = await import('./scenes/stoneTessellation.js');
      this._sceneUpdater = mod.buildStoneTessellation(this.scene);
      this._currentSceneId = sceneId;
      return;
    }

    // Default: Firefly Flock
    const mod = await import('./scenes/fireflyFlock.js');
    this._sceneUpdater = mod.buildFireflyFlock(this.scene);
    this._currentSceneId = 'firefly-flock';
  }

  start() {
    const loop = () => {
      const bands = this._audioGetter?.() || null;
      try { this._sceneUpdater?.(bands, this.scene); } catch {}
      this.scene.render();
      this._raf = requestAnimationFrame(loop);
    };
    loop();

    // Run a program if requested via URL
    if (this._autoProgram) {
      maybeStartProgram(this._autoProgram, {
        loadScene: (id) => this.loadScene(id)
      });
      this._autoProgram = '';
    }
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    try { this.scene.dispose(); } catch {}
    try { this.engine.dispose(); } catch {}
    this._raf = 0;
  }
}