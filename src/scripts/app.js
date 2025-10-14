// app.js - Main orchestrator with SDK immediate track switch and visual tuning

import { login, logout, isAuthenticated, maybeHandleRedirectCallback, fetchUserProfile, getAccessToken } from './auth.js';
import { AudioEngine } from './audioEngine.js';
import { Visualizer } from './visualizer.js';
import { UIManager } from './ui.js';
import { presets } from './presets.js';
import { SpotifyPlayerController } from './spotifyPlayer.js';
import { AnalysisEngine } from './analysisEngine.js';

import { Navbar } from '../components/Navbar.js';
import { SceneSelector } from '../components/SceneSelector.js';
import { PlayerControls } from '../components/PlayerControls.js';

const spotify = {
  token: null,
  profile: null
};

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
let sourceMode = 'preview'; // 'preview' | 'sdk' | 'mic'
let pendingSdkUri = null;    // track to start once Play activates SDK

// SDK + Analysis
const sdk = new SpotifyPlayerController({ getAccessToken });
const analysis = new AnalysisEngine();

// Theme engine: morning/evening/night by local time
function applyThemeByTime() {
  const hour = new Date().getHours();
  const body = document.body;
  body.classList.remove('theme-morning', 'theme-evening', 'theme-night');
  if (hour >= 5 && hour < 12) body.classList.add('theme-morning');
  else if (hour >= 12 && hour < 19) body.classList.add('theme-evening');
  else body.classList.add('theme-night');
}

// Spotify search helper (tracks)
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
  await maybeHandleRedirectCallback(); // may set token

  spotify.token = getAccessToken();
  spotify.profile = null;

  if (spotify.token) {
    spotify.profile = await fetchUserProfile().catch(() => null);
  }

  ui.renderNavbar({
    onLogin: login,
    onLogout: () => {
      logout();
    },
    profile: spotify.profile
  });

  if (spotify.token) {
    try {
      await sdk.init();
    } catch (e) {
      console.warn('SDK init error', e);
    }
  }
}

async function initAudio() {
  await audio.connectToAudioElement(dom.audioEl);
}

async function initVisualizer() {
  viz?.dispose();
  viz = new Visualizer({ container: dom.canvasRoot });
  await viz.init();
  await viz.loadPreset(currentPreset);
  viz.setAudioGetter(() => audio.getBands());
  viz.start();
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
          // In SDK mode visuals come from analysis/feature/time-based synth
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

        if (sourceMode === 'sdk') {
          // Load analysis/features (non-blocking visuals)
          await analysis.load(item.id, spotify.token).catch(() => { /* fallbacks inside engine */ });

          await sdk.init();

          // If SDK already activated (user previously hit Play), switch immediately.
          if (sdk.isReady() && sdk.isActive()) {
            try {
              await sdk.playTrackUri(item.uri, 0);
              pendingSdkUri = null;
              ui.toast(`Playing: ${item.name}`);
            } catch (e) {
              ui.toast(e.message || 'Failed to start SDK playback', 'error');
            }
          } else {
            // Defer until user presses Play (required gesture/transfer)
            pendingSdkUri = item.uri;
            ui.toast('Track queued. Press Play to start.', 'info');
          }
        } else if (sourceMode === 'preview') {
          const url = await audio.setSpotifyTrackById(item.id, spotify.token, dom.audioEl);
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
          await sdk.activate(); // must be in user gesture
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
      } catch (e) {
        ui.toast('Unable to start playback. Click again or select a track.', 'error');
      }
    },
    onPause: async () => {
      if (sourceMode === 'sdk') {
        await sdk.pause();
      } else {
        dom.audioEl.pause();
      }
    },
    onTuningChange: ({ sensitivity, smoothing, clampMax }) => {
      viz.setTuning({
        sensitivity,
        smoothing,
        clampMax
      });
      // Optionally map a bit of smoothing into the analyser to calm FFT too
      audio.setSmoothingTimeConstant(Math.min(0.95, Math.max(0, smoothing)));
    }
  });
}

function setupInactivityUI() {
  ui.initInactivity();
}

function setupAuthChangeListener() {
  window.addEventListener('luma:auth-changed', async () => {
    await initAuth();
  });
}

function setupAudioEvents() {
  dom.audioEl.addEventListener('ended', () => {
    // preview ended
  });
}

async function main() {
  applyThemeByTime();
  setupAuthChangeListener();
  await initAuth();         // login + SDK init
  await initAudio();        // analyser
  await initVisualizer();   // renderer
  setupComponents();        // UI + bindings
  setupInactivityUI();      // auto-hide
  setupAudioEvents();
}

main().catch(err => {
  console.error('Failed to initialize app:', err);
});