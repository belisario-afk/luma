// spotifyPlayer.js - Wrapper around Spotify Web Playback SDK + Web API controls

export class SpotifyPlayerController {
  constructor({ getAccessToken }) {
    this.getAccessToken = getAccessToken; // async function returning a fresh token
    this.player = null;
    this.deviceId = null;
    this.ready = false;

    this._lastState = null;
    this._lastStateTimestamp = 0;
    this._stateListeners = new Set();

    this._activated = false;
  }

  async init() {
    if (this.player) return;

    if (!window.Spotify) {
      await new Promise(resolve => {
        const handler = () => {
          window.removeEventListener('spotify-sdk-ready', handler);
          resolve();
        };
        window.addEventListener('spotify-sdk-ready', handler);
      });
    }

    this.player = new window.Spotify.Player({
      name: 'Luma Player',
      volume: 0.8,
      getOAuthToken: async cb => {
        try {
          const token = await this.getAccessToken();
          cb(token || '');
        } catch {
          cb('');
        }
      }
    });

    this.player.addListener('ready', ({ device_id }) => {
      this.deviceId = device_id;
      this.ready = true;
    });

    this.player.addListener('not_ready', ({ device_id }) => {
      if (this.deviceId === device_id) {
        this.ready = false;
      }
    });

    this.player.addListener('player_state_changed', state => {
      this._lastState = state || null;
      this._lastStateTimestamp = performance.now();
      for (const cb of this._stateListeners) cb(state);
    });

    await this.player.connect();
  }

  isReady() { return !!this.ready && !!this.deviceId; }
  isActive() { return !!this._activated; }

  // Must be called in a user-gesture event (e.g., Play click) for audio to start
  async activate() {
    if (!this.player || this._activated) return;
    try {
      await this.player.activateElement();
      this._activated = true;
    } catch {
      // no-op
    }
  }

  onStateChanged(cb) {
    this._stateListeners.add(cb);
    return () => this._stateListeners.delete(cb);
  }

  getApproxPositionMs() {
    const s = this._lastState;
    if (!s) return 0;
    const now = performance.now();
    const delta = now - this._lastStateTimestamp;
    const base = s.position || 0;
    return s.paused ? base : base + delta;
  }

  async transferPlayback({ play = false } = {}) {
    const token = await this.getAccessToken();
    if (!token || !this.deviceId) throw new Error('Player not ready');

    const res = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ device_ids: [this.deviceId], play })
    });

    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => '');
      if (res.status === 403) {
        throw new Error('Spotify Premium is required for SDK playback.');
      }
      throw new Error(`Transfer failed: ${res.status} ${text}`);
    }
  }

  async playTrackUri(uri, position_ms = 0) {
    const token = await this.getAccessToken();
    if (!token || !this.deviceId) throw new Error('Player not ready');

    const url = `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(this.deviceId)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [uri], position_ms })
    });
    if (!res.ok && res.status !== 204) {
      const t = await res.text().catch(() => '');
      if (res.status === 403) throw new Error('Spotify Premium required for full-track playback.');
      throw new Error(`Failed to start playback: ${res.status} ${t}`);
    }
  }

  async pause() {
    try { await this.player?.pause(); } catch {}
  }

  async resume() {
    try { await this.player?.resume(); } catch {}
  }
}