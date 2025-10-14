// visualizer.js - Three.js + shaders
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
      // up to 4 generic params (float) that presets can map to
      uParam1: { value: 0 },
      uParam2: { value: 0 },
      uParam3: { value: 0 },
      uParam4: { value: 0 },
      // colors
      uColor1: { value: new THREE.Color('#ffffff') },
      uColor2: { value: new THREE.Color('#000000') }
    };

    this._raf = 0;
    this._start = performance.now();
    this._preset = null;
    this._audioGetter = null; // function returning bands
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

    // Load fragment shader text relative to this module file
    const shaderUrl = new URL(`../assets/shaders/${preset.shader}`, import.meta.url);
    const frag = await fetch(shaderUrl).then(r => r.text());

    // Update uniforms from preset params
    this.uniforms.uColor1.value = new THREE.Color(preset.params?.color1 || '#ffffff');
    this.uniforms.uColor2.value = new THREE.Color(preset.params?.color2 || '#000000');

    // Map generic params to uParam1..4 if present
    const keys = Object.keys(preset.params || {});
    const paramVals = keys.map(k => preset.params[k]).filter(v => typeof v === 'number');
    this.uniforms.uParam1.value = paramVals[0] ?? 0;
    this.uniforms.uParam2.value = paramVals[1] ?? 0;
    this.uniforms.uParam3.value = paramVals[2] ?? 0;
    this.uniforms.uParam4.value = paramVals[3] ?? 0;

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
    // fn should return { bass: {avg}, mid: {avg}, treble: {avg} }
    this._audioGetter = fn;
  }

  _onResize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.uniforms.uResolution.value.set(w, h);
  }

  start() {
    if (this._raf) cancelAnimationFrame(this._raf);
    const tick = () => {
      const now = performance.now();
      const t = (now - this._start) / 1000;
      this.uniforms.uTime.value = t;

      if (this._audioGetter) {
        const bands = this._audioGetter();
        this.uniforms.uBass.value = bands?.bass?.avg ?? 0;
        this.uniforms.uMid.value = bands?.mid?.avg ?? 0;
        this.uniforms.uTreble.value = bands?.treble?.avg ?? 0;

        // If preset maps audio to params, apply here
        const map = this._preset?.audioMap || {};
        const setParam = (paramName, val) => {
          if (paramName === 'bloomIntensity' || paramName === 'glow') {
            // common visual intensities
            this.uniforms.uParam1.value = val;
          } else if (paramName === 'motionScale' || paramName === 'rippleSize') {
            this.uniforms.uParam2.value = val;
          }
        };
        if (map.bass) setParam(map.bass, this.uniforms.uBass.value);
        if (map.mid) setParam(map.mid, this.uniforms.uMid.value);
        if (map.treble) setParam(map.treble, this.uniforms.uTreble.value);
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