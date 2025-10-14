// visualizer.js - Three.js + shaders with audio smoothing and tuning
// Initializes a full-screen plane and maps audio bands to shader uniforms.
// Shaders are loaded from /src/assets/shaders using fetch.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const DEFAULT_VERTEX = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

function clamp01(x) { return Math.min(1, Math.max(0, x)); }

export class Visualizer {
  constructor({ container }) {
    this.container = container;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.material = null;
    this.mesh = null;

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      // generic params
      uParam1: { value: 0 },
      uParam2: { value: 0 },
      uParam3: { value: 0 },
      uParam4: { value: 0 },
      // colors
      uColor1: { value: new THREE.Color('#ffffff') },
      uColor2: { value: new THREE.Color('#000000') }
    };

    // Visual tuning (live adjustable)
    this.tuning = {
      sensitivity: 0.85,  // global intensity multiplier (0.1..2.0 typical)
      smoothing: 0.65,    // 0..0.95 high = smoother visuals
      clampMin: 0.0,      // clamp lower bound after gain/bias
      clampMax: 0.9,      // clamp upper bound to avoid overdriving shaders
      bias: 0.0           // add/subtract constant offset before clamp
    };

    // Per-band exponential moving averages to smooth visuals
    this._ema = { bass: 0, mid: 0, treble: 0 };

    this._raf = 0;
    this._start = performance.now();
    this._preset = null;
    this._audioGetter = null; // function returning bands
  }

  setTuning(next = {}) {
    Object.assign(this.tuning, next);
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geom = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: DEFAULT_VERTEX,
      fragmentShader: `void main(){gl_FragColor=vec4(0.0,0.0,0.0,1.0);}`
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.scene.add(this.mesh);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  async loadPreset(preset) {
    this._preset = preset;

    const shaderUrl = new URL(`../assets/shaders/${preset.shader}`, import.meta.url);
    const frag = await fetch(shaderUrl).then(r => r.text());

    // Update uniforms from preset params
    this.uniforms.uColor1.value = new THREE.Color(preset.params?.color1 || '#ffffff');
    this.uniforms.uColor2.value = new THREE.Color(preset.params?.color2 || '#000000');

    // Map generic params to uParam1..4 if present
    const numericVals = Object.values(preset.params || {}).filter(v => typeof v === 'number');
    this.uniforms.uParam1.value = numericVals[0] ?? 0;
    this.uniforms.uParam2.value = numericVals[1] ?? 0;
    this.uniforms.uParam3.value = numericVals[2] ?? 0;
    this.uniforms.uParam4.value = numericVals[3] ?? 0;

    // Replace material with new fragment shader
    this.material.dispose();
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: DEFAULT_VERTEX,
      fragmentShader: frag
    });
    this.mesh.material = this.material;
  }

  setAudioGetter(fn) {
    this._audioGetter = fn;
  }

  _onResize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.uniforms.uResolution.value.set(w, h);
  }

  _smooth(val, key) {
    // smoothing is specified 0..0.95 => convert to EMA alpha
    // alpha = 1 - smoothing; higher smoothing -> lower alpha -> slower response
    const smoothing = Math.min(0.95, Math.max(0, this.tuning.smoothing));
    const alpha = 1 - smoothing;
    const prev = this._ema[key];
    const next = prev + alpha * (val - prev);
    this._ema[key] = next;
    return next;
  }

  _processBand(raw) {
    // apply bias and sensitivity, then clamp to safe range
    const g = this.tuning.sensitivity ?? 1.0;
    const b = this.tuning.bias ?? 0.0;
    const minV = this.tuning.clampMin ?? 0.0;
    const maxV = this.tuning.clampMax ?? 0.95;
    return Math.min(maxV, Math.max(minV, (raw + b) * g));
  }

  start() {
    if (this._raf) cancelAnimationFrame(this._raf);
    const tick = () => {
      const now = performance.now();
      const t = (now - this._start) / 1000;
      this.uniforms.uTime.value = t;

      if (this._audioGetter) {
        const bands = this._audioGetter();
        // Safe defaults if band missing
        const bassRaw = clamp01(bands?.bass?.avg ?? 0);
        const midRaw = clamp01(bands?.mid?.avg ?? 0);
        const trebleRaw = clamp01(bands?.treble?.avg ?? 0);

        const bassAdj = this._processBand(bassRaw);
        const midAdj = this._processBand(midRaw);
        const trebleAdj = this._processBand(trebleRaw);

        const bass = this._smooth(bassAdj, 'bass');
        const mid = this._smooth(midAdj, 'mid');
        const treble = this._smooth(trebleAdj, 'treble');

        this.uniforms.uBass.value = bass;
        this.uniforms.uMid.value = mid;
        this.uniforms.uTreble.value = treble;

        // Optional preset param mapping (bounded by tuning already)
        const map = this._preset?.audioMap || {};
        const setParam = (paramName, val) => {
          if (paramName === 'bloomIntensity' || paramName === 'glow') {
            this.uniforms.uParam1.value = val;
          } else if (paramName === 'motionScale' || paramName === 'rippleSize' || paramName === 'bloom') {
            this.uniforms.uParam2.value = val;
          }
        };
        if (map.bass) setParam(map.bass, bass);
        if (map.mid) setParam(map.mid, mid);
        if (map.treble) setParam(map.treble, treble);
      }

      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(tick);
    };
    tick();
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    if (this.mesh) this.scene.remove(this.mesh);
    if (this.material) this.material.dispose();
    if (this.renderer) this.renderer.dispose();
    this._raf = 0;
  }
}