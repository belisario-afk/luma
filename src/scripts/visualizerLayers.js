// visualizerLayers.js - Multi-layer compositor with per-scene shader sets.
// Each scene can provide its own layerSet: { bg, bass, vocal, treble, comp } (paths to GLSL files).
// We compile those shaders per preset so scenes look and feel different.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

function clamp01(x) { return Math.min(1, Math.max(0, x)); }

export class MultiLayerVisualizer {
  constructor({ container }) {
    this.container = container;

    this.renderer = null;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.sceneBG = new THREE.Scene();
    this.sceneBass = new THREE.Scene();
    this.sceneVocal = new THREE.Scene();
    this.sceneTreble = new THREE.Scene();
    this.sceneComposite = new THREE.Scene();

    this.rtBG = null;
    this.rtBass = null;
    this.rtVocal = null;
    this.rtTreble = null;

    // Shared uniforms across layer shaders
    this.common = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      // Audio metrics
      uSub: { value: 0 }, uBass: { value: 0 }, uLowMid: { value: 0 }, uMid: { value: 0 }, uHighMid: { value: 0 }, uTreble: { value: 0 },
      uVocal: { value: 0 }, uEnergy: { value: 0 }, uCentroid: { value: 0 }, uFlux: { value: 0 }, uZcr: { value: 0 }, uBeat: { value: 0 },
      // Colors / album
      uColor1: { value: new THREE.Color('#ffffff') },
      uColor2: { value: new THREE.Color('#000000') },
      uAlbumAvg: { value: new THREE.Color('#808080') },
      uAlbumTex: { value: null },
      uAlbumOn: { value: 0 }
    };

    // Composite uniforms include render targets + weights
    this.compUniforms = {
      ...this.common,
      tBG: { value: null },
      tBass: { value: null },
      tVocal: { value: null },
      tTreble: { value: null },
      uWBass: { value: 1.0 },
      uWVocal: { value: 1.0 },
      uWTreble: { value: 1.0 }
    };

    this.tuning = {
      sensitivity: 0.85,
      smoothing: 0.65,
      clampMin: 0,
      clampMax: 0.9,
      bias: 0,
      gamma: 0.85
    };
    this._ema = { sub:0,bass:0,lowMid:0,mid:0,highMid:0,treble:0,vocal:0,energy:0,centroid:0,flux:0,zcr:0,beat:0 };

    this._audioGetter = null;
    this._raf = 0;
    this._start = performance.now();

    this._texLoader = new THREE.TextureLoader();

    // Materials (rebuilt per scene layer set)
    this.matBG = null;
    this.matBass = null;
    this.matVocal = null;
    this.matTreble = null;
    this.matComposite = null;

    // Fullscreen quad meshes to reuse while swapping materials
    this.quadBG = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshBasicMaterial({ color: 0x0 }));
    this.quadBass = this.quadBG.clone();
    this.quadVocal = this.quadBG.clone();
    this.quadTreble = this.quadBG.clone();
    this.quadComp = this.quadBG.clone();

    this.sceneBG.add(this.quadBG);
    this.sceneBass.add(this.quadBass);
    this.sceneVocal.add(this.quadVocal);
    this.sceneTreble.add(this.quadTreble);
    this.sceneComposite.add(this.quadComp);
  }

  setTuning(next = {}) { Object.assign(this.tuning, next); }
  setAudioGetter(fn) { this._audioGetter = fn; }

  async init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    const mkRT = () => new THREE.WebGLRenderTarget(this.container.clientWidth, this.container.clientHeight, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false
    });
    this.rtBG = mkRT(); this.rtBass = mkRT(); this.rtVocal = mkRT(); this.rtTreble = mkRT();

    this.compUniforms.tBG.value = this.rtBG.texture;
    this.compUniforms.tBass.value = this.rtBass.texture;
    this.compUniforms.tVocal.value = this.rtVocal.texture;
    this.compUniforms.tTreble.value = this.rtTreble.texture;

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  async loadLayerSet(layerSet) {
    // Dispose previous materials if they exist
    [this.matBG, this.matBass, this.matVocal, this.matTreble, this.matComposite].forEach(m => m?.dispose());

    // Fetch layer shaders for this scene
    const load = (p) => fetch(new URL(p, import.meta.url)).then(r=>r.text());
    const [bgFrag, bassFrag, vocalFrag, trebleFrag, compFrag] = await Promise.all([
      load(layerSet.bg),
      load(layerSet.bass),
      load(layerSet.vocal),
      load(layerSet.treble),
      load(layerSet.comp),
    ]);

    // Build new materials
    this.matBG = new THREE.ShaderMaterial({ uniforms: this.common, vertexShader: VERT, fragmentShader: bgFrag, transparent: true });
    this.matBass = new THREE.ShaderMaterial({ uniforms: this.common, vertexShader: VERT, fragmentShader: bassFrag, transparent: true });
    this.matVocal = new THREE.ShaderMaterial({ uniforms: this.common, vertexShader: VERT, fragmentShader: vocalFrag, transparent: true });
    this.matTreble = new THREE.ShaderMaterial({ uniforms: this.common, vertexShader: VERT, fragmentShader: trebleFrag, transparent: true });
    this.matComposite = new THREE.ShaderMaterial({ uniforms: this.compUniforms, vertexShader: VERT, fragmentShader: compFrag, transparent: false });

    // Attach to quads
    this.quadBG.material = this.matBG;
    this.quadBass.material = this.matBass;
    this.quadVocal.material = this.matVocal;
    this.quadTreble.material = this.matTreble;
    this.quadComp.material = this.matComposite;
  }

  async loadPreset(preset) {
    // Colors
    this.common.uColor1.value = new THREE.Color(preset.params?.color1 || '#ffffff');
    this.common.uColor2.value = new THREE.Color(preset.params?.color2 || '#000000');

    // Weights
    const lw = preset.layerWeights || { bass: 1, vocal: 1, treble: 1 };
    this.compUniforms.uWBass.value = lw.bass ?? 1;
    this.compUniforms.uWVocal.value = lw.vocal ?? 1;
    this.compUniforms.uWTreble.value = lw.treble ?? 1;

    // Layer set (critical: actually changes visuals per scene)
    if (preset.layerSet) {
      await this.loadLayerSet(preset.layerSet);
    }
  }

  async setAlbumTexture(url) {
    if (!url) { this.common.uAlbumTex.value = null; return; }
    return new Promise((resolve, reject) => {
      this._texLoader.setCrossOrigin('anonymous');
      this._texLoader.load(url, tex => {
        tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
        this.common.uAlbumTex.value = tex;
        resolve(tex);
      }, undefined, reject);
    });
  }

  setAlbumColors({ primary, secondary, avg }, enabled = true) {
    try {
      if (enabled && primary && secondary) {
        this.common.uColor1.value = new THREE.Color(primary);
        this.common.uColor2.value = new THREE.Color(secondary);
      }
      if (avg) this.common.uAlbumAvg.value = new THREE.Color(avg);
      this.common.uAlbumOn.value = enabled ? 1 : 0;
    } catch {}
  }

  _smooth(val, key) {
    const s = Math.min(0.95, Math.max(0, this.tuning.smoothing));
    const a = 1 - s;
    const prev = this._ema[key];
    const next = prev + a * (val - prev);
    this._ema[key] = next;
    return next;
  }

  _shape(val) {
    const g = this.tuning.sensitivity, b = this.tuning.bias, minV = this.tuning.clampMin, maxV = this.tuning.clampMax, gamma = this.tuning.gamma;
    const x = Math.min(maxV, Math.max(minV, (val + b) * g));
    return Math.pow(x, gamma);
  }

  _updateAudioUniforms() {
    const bands = this._audioGetter ? this._audioGetter() : null;
    const pick = (v, k) => this._smooth(this._shape(clamp01(v ?? 0)), k);

    const sub = pick(bands?.sub?.avg, 'sub');
    const bass = pick(bands?.bass?.avg, 'bass');
    const lowMid = pick(bands?.lowMid?.avg, 'lowMid');
    const mid = pick(bands?.mid?.avg, 'mid');
    const highMid = pick(bands?.highMid?.avg, 'highMid');
    const treble = pick(bands?.treble?.avg, 'treble');
    const vocal = pick(bands?.vocal?.avg, 'vocal');

    const energy = pick(bands?.energy, 'energy');
    const centroid = pick(bands?.centroid, 'centroid');
    const flux = pick(bands?.spectralFlux, 'flux');
    const zcr = pick(bands?.zcr, 'zcr');
    const beat = this._smooth(clamp01(bands?.beatPulse ?? 0), 'beat');

    this.common.uSub.value = sub;
    this.common.uBass.value = bass;
    this.common.uLowMid.value = lowMid;
    this.common.uMid.value = mid;
    this.common.uHighMid.value = highMid;
    this.common.uTreble.value = treble;
    this.common.uVocal.value = vocal;

    this.common.uEnergy.value = energy;
    this.common.uCentroid.value = centroid;
    this.common.uFlux.value = flux;
    this.common.uZcr.value = zcr;
    this.common.uBeat.value = beat;
  }

  _onResize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.common.uResolution.value.set(w, h);
    [this.rtBG, this.rtBass, this.rtVocal, this.rtTreble].forEach(rt => rt?.setSize(w, h));
  }

  start() {
    if (this._raf) cancelAnimationFrame(this._raf);
    const loop = () => {
      const t = (performance.now() - this._start) / 1000;
      this.common.uTime.value = t;
      this._updateAudioUniforms();

      const r = this.renderer;
      r.setRenderTarget(this.rtBG);    r.render(this.sceneBG, this.cam);
      r.setRenderTarget(this.rtBass);  r.render(this.sceneBass, this.cam);
      r.setRenderTarget(this.rtVocal); r.render(this.sceneVocal, this.cam);
      r.setRenderTarget(this.rtTreble);r.render(this.sceneTreble, this.cam);

      r.setRenderTarget(null);
      r.render(this.sceneComposite, this.cam);

      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.renderer?.dispose();
    [this.rtBG, this.rtBass, this.rtVocal, this.rtTreble].forEach(rt => rt?.dispose());
    [this.matBG, this.matBass, this.matVocal, this.matTreble, this.matComposite].forEach(m => m?.dispose());
  }
}