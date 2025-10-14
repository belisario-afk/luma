// app.js - Main orchestrator
// Handles auth → audio engine → visualizer → UI and events

import { login, logout, isAuthenticated, maybeHandleRedirectCallback, fetchUserProfile, getAccessToken } from './auth.js';
import { AudioEngine } from './audioEngine.js';
import { Visualizer } from './visualizer.js';
import { UIManager } from './ui.js';
import { presets } from './presets.js';

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
  maybeHandleRedirectCallback();

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
}

async function initAudio() {
  // Connect analyser to the hidden audio element
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
  // Navbar is rendered by UIManager; keep for possible extra actions
  Navbar(dom.navbar);

  // Scene selector with presets
  SceneSelector(dom.sceneSelector, {
    presets,
    onSelect: async (presetId) => {
      const found = presets.find(p => p.id === presetId);
      if (!found) return;
      currentPreset = found;
      await viz.loadPreset(currentPreset);
    }
  });

  // Player controls: search, play/pause, mic toggle
  PlayerControls(dom.playerControls, {
    onResumeAudioContext: () => audio.ensureRunning(),
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
    onSelectTrack: async (trackId) => {
      try {
        if (!spotify.token) {
          ui.toast('Login with Spotify first', 'error');
          return;
        }
        const url = await audio.setSpotifyTrackById(trackId, spotify.token, dom.audioEl);
        await dom.audioEl.play(); // user gesture already happened via click
      } catch (e) {
        console.error(e);
        ui.toast(e.message || 'Unable to play track preview', 'error');
      }
    },
    onToggleMic: async (enabled) => {
      if (enabled) {
        try {
          await audio.connectToMic();
          if (!dom.audioEl.paused) dom.audioEl.pause();
          ui.toast('Microphone enabled');
        } catch (e) {
          console.error(e);
          ui.toast('Mic permission denied', 'error');
        }
      } else {
        // switch back to audio element path; no-op until a track is chosen
        await audio.connectToAudioElement(dom.audioEl);
        ui.toast('Mic disabled');
      }
    },
    onPlay: async () => {
      try {
        await audio.ensureRunning();
        await dom.audioEl.play();
      } catch (e) {
        ui.toast('Unable to start playback. Click again or select a track.', 'error');
      }
    },
    onPause: () => {
      dom.audioEl.pause();
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
  // When audio ends (30s preview), just stop playing; the visualizer still runs
  dom.audioEl.addEventListener('ended', () => {
    // no-op; UI controls maintain state
  });
}

async function main() {
  applyThemeByTime();
  setupAuthChangeListener();
  await initAuth();         // renders navbar with login state
  await initAudio();        // attach analyser to audio element
  await initVisualizer();   // start rendering
  setupComponents();        // selectors and controls
  setupInactivityUI();      // auto-hide UI
  setupAudioEvents();
}

main().catch(err => {
  console.error('Failed to initialize app:', err);
});