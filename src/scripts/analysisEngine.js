// analysisEngine.js - Uses Spotify Audio Analysis to synthesize band data in SDK mode
// Maps per-segment features to bass/mid/treble and interpolates by playback position.

export class AnalysisEngine {
  constructor() {
    this.analysis = null;
    this._segments = [];
    this._minmax = null;

    // smoothing
    this._last = { bass: 0, mid: 0, treble: 0 };
    this._alpha = 0.2;
  }

  async load(trackId, token) {
    const res = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load audio analysis');
    const data = await res.json();
    this.analysis = data;
    this._segments = (data.segments || []).map(s => ({
      start: s.start * 1000,
      duration: s.duration * 1000,
      loudness_max: s.loudness_max,   // dB (negative)
      timbre: s.timbre || Array(12).fill(0)
    }));

    // prepare min/max for normalization
    const l = this._segments.map(s => s.loudness_max);
    const t9 = this._segments.map(s => s.timbre[9] ?? 0);   // brightness-ish
    const t1 = this._segments.map(s => s.timbre[1] ?? 0);   // warmth-ish
    const minmax = arr => ({ min: Math.min(...arr), max: Math.max(...arr) });
    this._minmax = {
      loud: minmax(l),
      bright: minmax(t9),
      warm: minmax(t1)
    };

    // reset smoothing
    this._last = { bass: 0, mid: 0, treble: 0 };
  }

  _norm(val, { min, max }) {
    if (max === min) return 0;
    return Math.min(1, Math.max(0, (val - min) / (max - min)));
  }

  getBandsAt(positionMs) {
    if (!this._segments.length || !this._minmax) {
      return {
        raw: [],
        bass: { values: [], avg: 0 },
        mid: { values: [], avg: 0 },
        treble: { values: [], avg: 0 }
      };
    }

    // find segment
    // simple linear scan with remembered index could be added; O(n) is fine for 10Hz calls
    const seg = this._segments.find(s => positionMs >= s.start && positionMs < s.start + s.duration)
              || this._segments[this._segments.length - 1];

    // map to pseudo bands
    const energy = this._norm(seg.loudness_max, this._minmax.loud); // mid
    const brightness = this._norm(seg.timbre[9] ?? 0, this._minmax.bright); // treble
    const warmth = this._norm(seg.timbre[1] ?? 0, this._minmax.warm); // bass

    // smooth
    const a = this._alpha;
    const bass = this._last.bass = (1 - a) * this._last.bass + a * warmth;
    const mid = this._last.mid = (1 - a) * this._last.mid + a * energy;
    const treble = this._last.treble = (1 - a) * this._last.treble + a * brightness;

    return {
      raw: [],
      bass: { values: [bass], avg: bass },
      mid: { values: [mid], avg: mid },
      treble: { values: [treble], avg: treble }
    };
  }
}