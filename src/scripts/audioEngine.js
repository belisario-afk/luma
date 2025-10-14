// audioEngine.js - Web Audio API logic
// Adds energy, spectral centroid, and beat pulse detection.
// Exports normalized bands and metrics: bass, mid, treble, energy, centroid(0..1), beatPulse(0..1)

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.freqData = null;
    this.timeData = null;
    this.ready = false;

    this.fftSize = 2048;
    this.smoothingTimeConstant = 0.85;

    this.bandRanges = {
      bass: [20, 140],
      mid: [140, 2000],
      treble: [2000, 11025]
    };

    this.sampleRate = 44100;

    // Cache a single MediaElementSourceNode per HTMLMediaElement
    this._mediaElement = null;
    this._mediaElementSource = null;

    // Beat detection buffers and state
    this._energyHistory = new Float32Array(64); // ~1s at 60fps-ish calls
    this._energyIdx = 0;
    this._energyFilled = false;
    this._beatPulse = 0; // decaying pulse 0..1
    this._lastTs = performance.now();
  }

  async init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.sampleRate = this.ctx.sampleRate;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;

    const bufferLength = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(bufferLength);
    this.timeData = new Uint8Array(this.analyser.fftSize);

    this.ready = true;
  }

  async ensureRunning() {
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
  }

  setSmoothingTimeConstant(value) {
    this.smoothingTimeConstant = Math.min(0.99, Math.max(0, value));
    if (this.analyser) this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
  }

  disconnect() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
  }

  connectNode(node) {
    this.disconnect();
    node.connect(this.analyser);
    this.sourceNode = node;
  }

  async connectToMic() {
    await this.init();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const src = this.ctx.createMediaStreamSource(stream);
    this._mediaElement = null;
    this._mediaElementSource = null;
    this.connectNode(src);
    return true;
  }

  async connectToAudioElement(audioEl) {
    await this.init();

    // Reuse existing source node if same element
    if (this._mediaElementSource && this._mediaElement === audioEl) {
      this.connectNode(this._mediaElementSource);
      return true;
    }

    // Otherwise detach previous and create a new MESN
    if (this._mediaElementSource && this._mediaElement !== audioEl) {
      try { this._mediaElementSource.disconnect(); } catch {}
      this._mediaElementSource = null;
      this._mediaElement = null;
    }

    this._mediaElement = audioEl;
    this._mediaElementSource = this.ctx.createMediaElementSource(audioEl);
    this.connectNode(this._mediaElementSource);
    return true;
  }

  async setSpotifyTrackById(trackId, token, audioEl) {
    if (!token) throw new Error('Missing Spotify token');
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch track');
    const data = await res.json();
    const preview = data.preview_url;
    if (!preview) throw new Error('Track has no preview URL (try another track or use mic)');
    audioEl.src = preview;
    audioEl.crossOrigin = 'anonymous';
    audioEl.load();
    return preview;
  }

  _freqToIndex(freq) {
    const nyquist = this.sampleRate / 2;
    const index = Math.round((freq / nyquist) * this.analyser.frequencyBinCount);
    return Math.min(Math.max(index, 0), this.analyser.frequencyBinCount - 1);
  }

  _computeEnergyAndCentroid() {
    // Energy: normalized average magnitude
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) sum += this.freqData[i];
    const energy = (sum / (255 * this.freqData.length)) || 0;

    // Spectral centroid (Hz normalized 0..1)
    let num = 0;
    let den = 0;
    const nyquist = this.sampleRate / 2;
    for (let i = 0; i < this.freqData.length; i++) {
      const mag = this.freqData[i];
      den += mag;
      const freq = (i / this.freqData.length) * nyquist;
      num += freq * mag;
    }
    const centroidHz = den > 0 ? num / den : 0;
    const centroid = Math.min(1, Math.max(0, centroidHz / nyquist));
    return { energy, centroid };
  }

  _updateBeat(energy) {
    // Update ring buffer
    this._energyHistory[this._energyIdx++] = energy;
    if (this._energyIdx >= this._energyHistory.length) {
      this._energyIdx = 0;
      this._energyFilled = true;
    }

    const len = this._energyFilled ? this._energyHistory.length : this._energyIdx;
    if (len < 8) return this._beatPulse; // not enough data yet

    // Mean and stdev over window
    let mean = 0;
    for (let i = 0; i < len; i++) mean += this._energyHistory[i];
    mean /= len;

    let variance = 0;
    for (let i = 0; i < len; i++) {
      const d = this._energyHistory[i] - mean;
      variance += d * d;
    }
    variance /= len;
    const stdev = Math.sqrt(variance);

    const threshold = mean + 1.5 * stdev; // sensitivity factor
    const isBeat = energy > threshold && energy > 0.1;

    const now = performance.now();
    const dt = Math.max(1, now - this._lastTs) / 1000; // seconds
    this._lastTs = now;

    // Decay pulse
    const decay = 2.5; // per second
    this._beatPulse = Math.max(0, this._beatPulse - decay * dt);

    if (isBeat) {
      this._beatPulse = Math.min(1, this._beatPulse + 0.9);
    }

    return this._beatPulse;
  }

  getBands() {
    if (!this.analyser || !this.freqData) {
      return {
        raw: [],
        bass: { values: [], avg: 0 },
        mid: { values: [], avg: 0 },
        treble: { values: [], avg: 0 },
        energy: 0,
        centroid: 0,
        beatPulse: 0
      };
    }

    this.analyser.getByteFrequencyData(this.freqData);

    const segment = (lowHz, highHz) => {
      const start = this._freqToIndex(lowHz);
      const end = this._freqToIndex(highHz);
      const sub = this.freqData.slice(start, end);
      const norm = Array.from(sub, v => v / 255);
      const avg = norm.length ? norm.reduce((a, b) => a + b, 0) / norm.length : 0;
      return { values: norm, avg };
    };

    const bands = {
      raw: this.freqData,
      bass: segment(...this.bandRanges.bass),
      mid: segment(...this.bandRanges.mid),
      treble: segment(...this.bandRanges.treble)
    };

    const { energy, centroid } = this._computeEnergyAndCentroid();
    const beatPulse = this._updateBeat(energy);

    return {
      ...bands,
      energy,
      centroid,
      beatPulse
    };
  }
}