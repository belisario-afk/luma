// audioEngine.js - Extended metrics + robust source handling
// Exports extended bands (sub/bass/lowMid/mid/highMid/treble) + vocal,
// and derived metrics: energy, centroid, spectralFlux, zcr, beatPulse.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.freqData = null;
    this.prevMag = null;
    this.timeData = null;
    this.ready = false;

    this.fftSize = 2048;
    this.smoothingTimeConstant = 0.85;

    this.bandRanges = {
      sub: [20, 60],
      bass: [60, 160],
      lowMid: [160, 400],
      mid: [400, 2000],
      highMid: [2000, 6000],
      treble: [6000, 11025],
      vocal: [1000, 4000]
    };

    this.sampleRate = 44100;

    this._mediaElement = null;
    this._mediaElementSource = null;

    // Beat detection ring buffer
    this._energyHistory = new Float32Array(64);
    this._energyIdx = 0;
    this._energyFilled = false;
    this._beatPulse = 0;
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
    this.prevMag = new Float32Array(bufferLength);
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
      try { this.sourceNode.disconnect(); } catch {}
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

    if (this._mediaElementSource && this._mediaElement === audioEl) {
      this.connectNode(this._mediaElementSource);
      return true;
    }

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

  _segmentAvg(lowHz, highHz) {
    const start = this._freqToIndex(lowHz);
    const end = this._freqToIndex(highHz);
    let sum = 0, n = Math.max(0, end - start);
    for (let i = start; i < end; i++) sum += this.freqData[i];
    return n ? (sum / (255 * n)) : 0;
  }

  _computeEnergyCentroid() {
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) sum += this.freqData[i];
    const energy = (sum / (255 * this.freqData.length)) || 0;

    let num = 0, den = 0;
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

  _computeSpectralFlux() {
    let flux = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      const mag = this.freqData[i] / 255;
      const diff = mag - this.prevMag[i];
      if (diff > 0) flux += diff;
      this.prevMag[i] = mag;
    }
    return Math.min(1, flux / (this.freqData.length * 0.1));
  }

  _computeZCR() {
    this.analyser.getByteTimeDomainData(this.timeData);
    let z = 0;
    let prev = this.timeData[0] - 128;
    for (let i = 1; i < this.timeData.length; i++) {
      const cur = this.timeData[i] - 128;
      if ((prev >= 0 && cur < 0) || (prev < 0 && cur >= 0)) z++;
      prev = cur;
    }
    return Math.min(1, z / this.timeData.length);
  }

  _updateBeat(energy) {
    this._energyHistory[this._energyIdx++] = energy;
    if (this._energyIdx >= this._energyHistory.length) {
      this._energyIdx = 0;
      this._energyFilled = true;
    }

    const len = this._energyFilled ? this._energyHistory.length : this._energyIdx;
    if (len < 8) return this._beatPulse;

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
    const threshold = mean + 1.5 * stdev;
    const isBeat = energy > threshold && energy > 0.1;

    const now = performance.now();
    const dt = Math.max(1, now - this._lastTs) / 1000;
    this._lastTs = now;

    const decay = 2.5;
    this._beatPulse = Math.max(0, this._beatPulse - decay * dt);
    if (isBeat) this._beatPulse = Math.min(1, this._beatPulse + 0.9);
    return this._beatPulse;
  }

  getBands() {
    if (!this.analyser || !this.freqData) {
      return {
        raw: [],
        sub: { avg: 0 }, bass: { avg: 0 }, lowMid: { avg: 0 }, mid: { avg: 0 }, highMid: { avg: 0 }, treble: { avg: 0 },
        vocal: { avg: 0 }, energy: 0, centroid: 0, spectralFlux: 0, zcr: 0, beatPulse: 0
      };
    }

    this.analyser.getByteFrequencyData(this.freqData);

    const sub = { avg: this._segmentAvg(...this.bandRanges.sub) };
    const bass = { avg: this._segmentAvg(...this.bandRanges.bass) };
    const lowMid = { avg: this._segmentAvg(...this.bandRanges.lowMid) };
    const mid = { avg: this._segmentAvg(...this.bandRanges.mid) };
    const highMid = { avg: this._segmentAvg(...this.bandRanges.highMid) };
    const treble = { avg: this._segmentAvg(...this.bandRanges.treble) };
    const vocal = { avg: this._segmentAvg(...this.bandRanges.vocal) };

    const { energy, centroid } = this._computeEnergyCentroid();
    const spectralFlux = this._computeSpectralFlux();
    const zcr = this._computeZCR();
    const beatPulse = this._updateBeat(energy);

    return {
      raw: this.freqData,
      sub, bass, lowMid, mid, highMid, treble,
      vocal,
      energy,
      centroid,
      spectralFlux,
      zcr,
      beatPulse
    };
  }
}