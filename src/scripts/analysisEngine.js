// analysisEngine.js - Uses Spotify Audio Analysis to synthesize band data in SDK mode
// Fallback: if /audio-analysis is unavailable (403), use /audio-features (tempo/energy/danceability).

export class AnalysisEngine {
  constructor() {
    this.analysis = null;
    this._segments = [];
    this._minmax = null;

    // features fallback
    this._features = null;

    // smoothing
    this._last = { bass: 0, mid: 0, treble: 0 };
    this._alpha = 0.2;
  }

  async load(trackId, token) {
    // Try full analysis
    const ares = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (ares.ok) {
      const data = await ares.json();
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
      this._features = null;
      return;
    }

    // Fallback to audio-features
    const fres = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!fres.ok) {
      throw new Error('Failed to load audio analysis');
    }

    this._features = await fres.json();
    this.analysis = null;
    this._segments = [];
    this._minmax = null;
    this._last = { bass: 0, mid: 0, treble: 0 };
  }

  _norm(val, { min, max }) {
    if (max === min) return 0;
    return Math.min(1, Math.max(0, (val - min) / (max - min)));
  }

  // Features-based synthetic bands
  _bandsFromFeatures(positionMs) {
    const f = this._features;
    if (!f) return { bass: 0, mid: 0, treble: 0 };

    const tempo = f.tempo || 120;
    const energy = f.energy ?? 0.5;
    const dance = f.danceability ?? 0.5;
    const valence = f.valence ?? 0.5;

    // beat-based pulse for bass
    const bps = tempo / 60;
    const t = positionMs / 1000;
    const phase = (t * bps) % 1; // 0..1 over each beat
    const beatPulse = Math.exp(-10 * Math.min(phase, 1 - phase)); // sharp pulse around beat
    const bass = Math.min(1, 0.35 + 0.65 * (0.6 * beatPulse + 0.4 * dance));

    // mid from energy with slight wobble
    const mid = Math.min(1, 0.2 + 0.8 * (energy * (0.8 + 0.2 * Math.sin(t * 0.5))));

    // treble from valence with faster shimmer
    const treble = Math.min(1, 0.2 + 0.8 * (valence * (0.7 + 0.3 * Math.sin(t * 3.0))));

    return { bass, mid, treble };
  }

  getBandsAt(positionMs) {
    // Full analysis path
    if (this._segments.length && this._minmax) {
      const seg = this._segments.find(s => positionMs >= s.start && positionMs < s.start + s.duration)
                || this._segments[this._segments.length - 1];

      const energy = this._norm(seg.loudness_max, this._minmax.loud); // mid
      const brightness = this._norm(seg.timbre[9] ?? 0, this._minmax.bright); // treble
      const warmth = this._norm(seg.timbre[1] ?? 0, this._minmax.warm); // bass

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

    // Features fallback
    if (this._features) {
      const { bass: b, mid: m, treble: t } = this._bandsFromFeatures(positionMs);
      const a = this._alpha;
      const bass = this._last.bass = (1 - a) * this._last.bass + a * b;
      const mid = this._last.mid = (1 - a) * this._last.mid + a * m;
      const treble = this._last.treble = (1 - a) * this._last.treble + a * t;
      return {
        raw: [],
        bass: { values: [bass], avg: bass },
        mid: { values: [mid], avg: mid },
        treble: { values: [treble], avg: treble }
      };
    }

    // Empty
    return {
      raw: [],
      bass: { values: [], avg: 0 },
      mid: { values: [], avg: 0 },
      treble: { values: [], avg: 0 }
    };
  }
}