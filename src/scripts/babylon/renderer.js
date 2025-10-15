// BabylonRenderer — WebGPU-first (auto-fallback to WebGL2). No bundler required.
// Adds direct ?scene= selection and maps presets to new 3D scenes.

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

function getScenePreference() {
  try {
    const url = new URL(window.location.href);
    return (url.searchParams.get('scene') || '').toLowerCase();
  } catch { return ''; }
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

    this.container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);

    this.engine = new B.Engine(this.canvas, true, {
      antialias: true,
      adaptToDeviceRatio: true,
      powerPreference: 'high-performance'
    });

    this.scene = new B.Scene(this.engine);
    this.scene.clearColor = new B.Color4(0, 0, 0, 1);

    this.camera = new B.ArcRotateCamera('cam', Math.PI / 2.3, Math.PI / 2.6, 6, B.Vector3.Zero(), this.scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 20;

    this.light = new B.HemisphericLight('hemi', new B.Vector3(0, 1, 0), this.scene);
    this.light.intensity = 0.7;

    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.exposure = 1.0;

    window.addEventListener('resize', () => this.engine.resize());

    const program = getProgramPreference();
    if (program) this._autoProgram = program;

    this._autoScene = getScenePreference();
  }

  async loadPreset(preset) {
    const id = (preset?.id || '').toLowerCase();
    if (id.includes('firefly')) return this.loadScene('firefly-flock');
    if (id.includes('aurora')) return this.loadScene('aurora-veils');
    if (id.includes('stone')) return this.loadScene('stone-tessellation');
    if (id.includes('infinite')) return this.loadScene('infinite-drop');
    if (id.includes('ring')) return this.loadScene('ring-flight');
  }

  setAudioGetter(fn) { this._audioGetter = fn; }
  setTuning(_t) {}
  setAlbumColors(_palette, _enabled = true) {}
  async setAlbumTexture(_url) {}

  async loadScene(sceneId) {
    const B = window.BABYLON;
    if (this._currentSceneId) {
      this.scene.meshes.slice().forEach(m => m.dispose && m.dispose());
      this.scene.particleSystems.slice().forEach(ps => ps.dispose && ps.dispose());
      this.scene.postProcesses?.slice().forEach(pp => pp.dispose && pp.dispose());
    }

    if (sceneId === 'firefly-flock') {
      const mod = await import('./scenes/fireflyFlock.js');
      this._sceneUpdater = mod.buildFireflyFlock(this.scene);
      this._currentSceneId = sceneId; return;
    }
    if (sceneId === 'aurora-veils') {
      const mod = await import('./scenes/auroraVeils.js');
      this._sceneUpdater = mod.buildAuroraVeils(this.scene);
      this._currentSceneId = sceneId; return;
    }
    if (sceneId === 'stone-tessellation') {
      const mod = await import('./scenes/stoneTessellation.js');
      this._sceneUpdater = mod.buildStoneTessellation(this.scene);
      this._currentSceneId = sceneId; return;
    }
    if (sceneId === 'infinite-drop') {
      const mod = await import('./scenes/infiniteDropSDF.js');
      this._sceneUpdater = mod.buildInfiniteDropSDF(this.scene);
      this._currentSceneId = sceneId; return;
    }
    if (sceneId === 'ring-flight') {
      const mod = await import('./scenes/ringFlight.js');
      this._sceneUpdater = mod.buildRingFlight(this.scene);
      this._currentSceneId = sceneId; return;
    }

    // Default
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

    if (this._autoScene) { this.loadScene(this._autoScene); this._autoScene = ''; }

    if (this._autoProgram) {
      maybeStartProgram(this._autoProgram, { loadScene: (id) => this.loadScene(id) });
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