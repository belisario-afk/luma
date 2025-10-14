// audioEngine.js - Web Audio API logic
// Provides microphone and <audio> element sources with FFT analysis.
// Exports normalized bands: bass, mid, treble (0..1) arrays and aggregate values.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.freqData = null;
    this.ready = false;

    this.fftSize = 2048; // power of two
    this.smoothingTimeConstant = 0.85;

    // Bands indices (fractions of Nyquist)
    this.bandRanges = {
      bass: [20, 140],
      mid: [140, 2000],
      treble: [2000, 11025]
    };

    this.sampleRate = 44100; // will be updated after context init

    // Cache a single MediaElementSourceNode per HTMLMediaElement
    this._mediaElement = null;
    this._mediaElementSource = null;
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

    this.ready = true;
  }

  async ensureRunning() {
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
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
    // analyser not connected to destination to keep silent visual-only by default
    this.sourceNode = node;
  }

  async connectToMic() {
    await this.init();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const src = this.ctx.createMediaStreamSource(stream);
    this._mediaElement = null; // no longer using element source
    this._mediaElementSource = null;
    this.connectNode(src);
    return true;
  }

  async connectToAudioElement(audioEl) {
    await this.init();

    // Reuse an existing MediaElementSource for the same element; only one is allowed.
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

  // Map Spotify track id to preview URL and set <audio> source
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
    const index = Math.round(freq / nyquist * this.analyser.frequencyBinCount);
    return Math.min(Math.max(index, 0), this.analyser.frequencyBinCount - 1);
  }

  getBands() {
    if (!this.analyser || !this.freqData) {
      return {
        raw: [],
        bass: { values: [], avg: 0 },
        mid: { values: [], avg: 0 },
        treble: { values: [], avg: 0 }
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

    return {
      raw: this.freqData,
      bass: segment(...this.bandRanges.bass),
      mid: segment(...this.bandRanges.mid),
      treble: segment(...this.bandRanges.treble)
    };
  }
}