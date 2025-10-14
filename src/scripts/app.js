// app.js - Add album palette/texture integration + advanced reactivity wiring

import { login, logout, maybeHandleRedirectCallback, fetchUserProfile, getAccessToken } from './auth.js';
import { AudioEngine } from './audioEngine.js';
import { Visualizer } from './visualizer.js';
import { UIManager } from './ui.js';
import { presets } from './presets.js';
import { SpotifyPlayerController } from './spotifyPlayer.js';
import { AnalysisEngine } from './analysisEngine.js';
import { extractPaletteFromImage } from './color.js';

import { Navbar } from '../components/Navbar.js';
import { SceneSelector } from '../components/SceneSelector.js';
import { PlayerControls } from '../components/PlayerControls.js';

const spotify = { token: null, profile: null };

const dom = {
  navbar: document.getElementById('navbar'),
  overlay: document.getElementById('ui-overlay'),
  canvasRoot: document.getElementById('canvas-root'),
  audioEl: document.getElementById('audio-el'),
  sceneSelector: document.getElementById('scene-selector'),
  playerControls: document.getElementById('player-controls')
};

const ui = new UIManager({ navbarEl: dom.navbar, overlayEl: dom.overlay });
const audio = new AudioEngine();
let viz = null;

let currentPreset = presets[0];
let sourceMode = 'preview';
let pendingSdkUri = null;

const sdk = new SpotifyPlayerController({ getAccessToken });
const analysis = new AnalysisEngine();

const albumOptions = { useColors: true, useTexture: true };

function applyThemeByTime() {
  const hour = new Date().getHours();
  const body = document.body;
  body.classList.remove('theme-morning', 'theme-evening', 'theme-night');
  if (hour >= 5 && hour < 12) body.classList.add('theme-morning');
  else if (hour >= 12 && hour < 19) body.classList.add('theme-evening');
  else body.classList.add('theme-night');
}

async function searchTracks(query) {
  if (!spotify.token) throw new Error('Not logged in');
  const params = new URLSearchParams({ q: query, type: 'track', limit: '12' });
  const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${spotify.token}` }
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

async function initAuth() {
  await maybeHandleRedirectCallback();
  spotify.token = getAccessToken();
  if (spotify.token) spotify.profile = await fetchUserProfile().catch(() => null);

  ui.renderNavbar({ onLogin: login, onLogout: logout, profile: spotify.profile });

  if (spotify.token) {
    try { await sdk.init(); } catch (e) { console.warn('SDK init error', e); }
  }
}

async function initAudio() { await audio.connectToAudioElement(dom.audioEl); }

async function initVisualizer() {
  viz?.dispose();
  viz = new Visualizer({ container: dom.canvasRoot });
  await viz.init();
  await viz.loadPreset(currentPreset);
  viz.setAudioGetter(() => audio.getBands());
  viz.start();
}

async function applyAlbumTheming(albumArtUrl) {
  if (!albumArtUrl || (!albumOptions.useColors && !albumOptions.useTexture)) {
    viz.setAlbumColors({ primary: null, secondary: null, avg: null }, false);
    await viz.setAlbumTexture(null);
    return;
  }

  try {
    if (albumOptions.useColors) {
      const palette = await extractPaletteFromImage(albumArtUrl);
      viz.setAlbumColors(palette, true);

      // Optionally reflect into CSS theme variables for UI glow
      document.body.style.setProperty('--primary', palette.primary);
      document.body.style.setProperty('--accent', palette.secondary);
    } else {
      viz.setAlbumColors({ primary: null, secondary: null, avg: null }, false);
    }

    if (albumOptions.useTexture) {
      await viz.setAlbumTexture(albumArtUrl);
    } else {
      await viz.setAlbumTexture(null);
    }
  } catch (e) {
    console.warn('Album theming failed', e);
  }
}

function setupComponents() {
  Navbar(dom.navbar);

  SceneSelector(dom.sceneSelector, {
    presets,
    onSelect: async (presetId) => {
      const found = presets.find(p => p.id === presetId);
      if (!found) return;
      currentPreset = found;
      await viz.loadPreset(currentPreset);
    }
  });

  PlayerControls(dom.playerControls, {
    onResumeAudioContext: () => audio.ensureRunning(),
    onSourceChange: async (mode) => {
      sourceMode = mode;
      if (mode === 'mic') {
        try {
          await audio.connectToMic();
          dom.audioEl.pause();
          viz.setAudioGetter(() => audio.getBands());
          ui.toast('Microphone enabled');
        } catch {
          ui.toast('Mic permission denied', 'error');
        }
      } else if (mode === 'preview') {
        await audio.connectToAudioElement(dom.audioEl);
        viz.setAudioGetter(() => audio.getBands());
        ui.toast('Preview mode');
      } else if (mode === 'sdk') {
        if (!spotify.token) {
          ui.toast('Login with Spotify first', 'error');
          return;
        }
        try {
          await sdk.init();
          viz.setAudioGetter(() => analysis.getBandsAt(sdk.getApproxPositionMs()));
          ui.toast('Spotify SDK mode (full track)');
        } catch (e) {
          console.error(e);
          ui.toast('Could not enable Spotify SDK mode', 'error');
        }
      }
    },
    onSearch: async (q) => {
      if (!q || !q.trim()) return { items: [] };
      if (!spotify.token) {
        ui.toast('Login with Spotify to search tracks', 'error');
        return { items: [] };
      }
      try {
        const data = await searchTracks(q.trim());
        const items = (data.tracks?.items || []).map(t => ({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artist: t.artists?.map(a => a.name).join(', ') || 'Unknown',
          album: t.album?.name || '',
          hasPreview: !!t.preview_url,
          albumArt: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || ''
        }));
        return { items };
      } catch (e) {
        console.error(e);
        ui.toast('Search failed', 'error');
        return { items: [] };
      }
    },
    onSelectTrack: async (item) => {
      try {
        if (!spotify.token) {
          ui.toast('Login with Spotify first', 'error');
          return;
        }

        // Apply album theming immediately
        if (item.albumArt) await applyAlbumTheming(item.albumArt);

        if (sourceMode === 'sdk') {
          await analysis.load(item.id, spotify.token).catch(() => { /* fallbacks inside engine */ });
          await sdk.init();
          if (sdk.isReady() && sdk.isActive()) {
            try {
              await sdk.playTrackUri(item.uri, 0);
              pendingSdkUri = null;
              ui.toast(`Playing: ${item.name}`);
            } catch (e) {
              ui.toast(e.message || 'Failed to start SDK playback', 'error');
            }
          } else {
            pendingSdkUri = item.uri;
            ui.toast('Track queued. Press Play to start.', 'info');
          }
        } else if (sourceMode === 'preview') {
          await audio.setSpotifyTrackById(item.id, spotify.token, dom.audioEl);
          await audio.ensureRunning();
          await dom.audioEl.play();
          viz.setAudioGetter(() => audio.getBands());
          ui.toast(`Preview: ${item.name}`);
        } else if (sourceMode === 'mic') {
          ui.toast('Mic mode active. Switch to Preview/Spotify to play tracks.');
        }
      } catch (e) {
        console.error(e);
        ui.toast(e.message || 'Unable to handle track selection', 'error');
      }
    },
    onPlay: async () => {
      try {
        if (sourceMode === 'sdk') {
          await sdk.activate();
          try {
            await sdk.transferPlayback({ play: true });
          } catch (e) {
            ui.toast(e.message, 'error');
            return;
          }
          if (pendingSdkUri) {
            try {
              await sdk.playTrackUri(pendingSdkUri, 0);
              pendingSdkUri = null;
            } catch (e) {
              ui.toast(e.message || 'Failed to start SDK playback', 'error');
            }
          } else {
            await sdk.resume();
          }
        } else {
          await audio.ensureRunning();
          await dom.audioEl.play();
        }
      } catch {
        ui.toast('Unable to start playback. Click again or select a track.', 'error');
      }
    },
    onPause: async () => {
      if (sourceMode === 'sdk') await sdk.pause();
      else dom.audioEl.pause();
    },
    onTuningChange: ({ sensitivity, smoothing, clampMax, gamma }) => {
      viz.setTuning({ sensitivity, smoothing, clampMax, gamma });
      audio.setSmoothingTimeConstant(Math.min(0.95, Math.max(0, smoothing)));
    },
    onAlbumOptions: async ({ useColors, useTexture }) => {
      albumOptions.useColors = !!useColors;
      albumOptions.useTexture = !!useTexture;
      // Re-apply based on last known texture in uniform (no reliable album URL cache here)
      // In practice, this is reapplied on next track selection.
      viz.setAlbumColors({ primary: null, secondary: null, avg: null }, useColors);
      if (!useTexture) await viz.setAlbumTexture(null);
    }
  });
}

function setupInactivityUI() { ui.initInactivity(); }
function setupAuthChangeListener() { window.addEventListener('luma:auth-changed', initAuth); }
function setupAudioEvents() { dom.audioEl.addEventListener('ended', () => {}); }

async function main() {
  applyThemeByTime();
  setupAuthChangeListener();
  await initAuth();
  await initAudio();
  await initVisualizer();
  setupComponents();
  setupInactivityUI();
  setupAudioEvents();
}

main().catch(err => console.error('Failed to initialize app:', err));