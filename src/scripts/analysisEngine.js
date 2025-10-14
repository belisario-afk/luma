// analysisEngine.js - Uses Spotify Audio Analysis to synthesize band data in SDK mode
// Fallbacks:
//  - If /audio-analysis 403 → try /audio-features
//  - If that also fails → deterministic time-based synth (no network needed)

export class AnalysisEngine {
  constructor() {
    this.analysis = null;
    this._segments = [];
    this._minmax = null;

    // features fallback
    this._features = null;

    // ultimate fallback (no network)
    this._fallback = false;

    // smoothing
    this._last = { bass: 0, mid: 0, treble: 0 };
    this._alpha = 0.2;
  }

  async load(trackId, token) {
    this.analysis = null;
    this._segments = [];
    this._minmax = null;
    this._features = null;
    this._fallback = false;
    this._last = { bass: 0, mid: 0, treble: 0 };

    // Try full analysis
    try {
      const ares = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ares.ok) {
        const data = await ares.json();
        this.analysis = data;
        this._segments = (data.segments || []).map(s => ({
          start: s.start * 1000,
          duration: s.duration * 1000,
          loudness_max: s.loudness_max,
          timbre: s.timbre || Array(12).fill(0)
        }));
        const l = this._segments.map(s => s.loudness_max);
        const t9 = this._segments.map(s => s.timbre[9] ?? 0);
        const t1 = this._segments.map(s => s.timbre[1] ?? 0);
        const mm = arr => ({ min: Math.min(...arr), max: Math.max(...arr) });
        this._minmax = { loud: mm(l), bright: mm(t9), warm: mm(t1) };
        return;
      }
    } catch {}

    // Try features fallback
    try {
      const fres = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (fres.ok) {
        this._features = await fres.json();
        return;
      }
    } catch {}

    // Last resort: internal time-based synth (no throw)
    this._fallback = true;
  }

  _norm(val, { min, max }) {
    if (max === min) return 0;
    return Math.min(1, Math.max(0, (val - min) / (max - min)));
  }

  // Features-based synthetic bands
  _bandsFromFeatures(positionMs) {
    const f = this._features;
    const tempo = f?.tempo || 120;
    const energy = f?.energy ?? 0.5;
    const dance = f?.danceability ?? 0.5;
    const valence = f?.valence ?? 0.5;

    const bps = tempo / 60;
    const t = positionMs / 1000;
    const phase = (t * bps) % 1;
    const beatPulse = Math.exp(-10 * Math.min(phase, 1 - phase));
    const bass = Math.min(1, 0.35 + 0.65 * (0.6 * beatPulse + 0.4 * dance));
    const mid = Math.min(1, 0.2 + 0.8 * (energy * (0.8 + 0.2 * Math.sin(t * 0.5))));
    const treble = Math.min(1, 0.2 + 0.8 * (valence * (0.7 + 0.3 * Math.sin(t * 3.0))));
    return { bass, mid, treble };
  }

  // Pure time-based synth when no API data available
  _bandsFromTime(positionMs) {
    const t = positionMs / 1000;
    const bass = 0.5 + 0.5 * Math.sin(t * 2.0);   // 2 Hz
    const mid = 0.5 + 0.5 * Math.sin(t * 0.7 + 1.3);
    const treble = 0.5 + 0.5 * Math.sin(t * 5.0 + 0.7);
    return { bass: Math.abs(bass), mid: Math.abs(mid), treble: Math.abs(treble) };
  }

  getBandsAt(positionMs) {
    // Full analysis path
    if (this._segments.length && this._minmax) {
      const seg = this._segments.find(s => positionMs >= s.start && positionMs < s.start + s.duration)
                || this._segments[this._segments.length - 1];

      const energy = this._norm(seg.loudness_max, this._minmax.loud);
      const brightness = this._norm(seg.timbre[9] ?? 0, this._minmax.bright);
      const warmth = this._norm(seg.timbre[1] ?? 0, this._minmax.warm);

      const a = this._alpha;
      const bass = this._last.bass = (1 - a) * this._last.bass + a * warmth;
      const mid = this._last.mid = (1 - a) * this._last.mid + a * energy;
      const treble = this._last.treble = (1 - a) * this._last.treble + a * brightness;

      return { raw: [], bass: { values: [bass], avg: bass }, mid: { values: [mid], avg: mid }, treble: { values: [treble], avg: treble } };
    }

    // Features fallback
    if (this._features) {
      const { bass: b, mid: m, treble: t } = this._bandsFromFeatures(positionMs);
      const a = this._alpha;
      const bass = this._last.bass = (1 - a) * this._last.bass + a * b;
      const mid = this._last.mid = (1 - a) * this._last.mid + a * m;
      const treble = this._last.treble = (1 - a) * this._last.treble + a * t;
      return { raw: [], bass: { values: [bass], avg: bass }, mid: { values: [mid], avg: mid }, treble: { values: [treble], avg: treble } };
    }

    // Time-based fallback
    if (this._fallback) {
      const { bass: b, mid: m, treble: t } = this._bandsFromTime(positionMs);
      const a = this._alpha;
      const bass = this._last.bass = (1 - a) * this._last.bass + a * b;
      const mid = this._last.mid = (1 - a) * this._last.mid + a * m;
      const treble = this._last.treble = (1 - a) * this._last.treble + a * t;
      return { raw: [], bass: { values: [bass], avg: bass }, mid: { values: [mid], avg: mid }, treble: { values: [treble], avg: treble } };
    }

    // No data yet
    return { raw: [], bass: { values: [], avg: 0 }, mid: { values: [], avg: 0 }, treble: { values: [], avg: 0 } };
  }
}