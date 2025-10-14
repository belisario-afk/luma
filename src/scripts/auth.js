// auth.js - Spotify Implicit Grant Flow utilities
// Handles login/logout, token storage, and user profile fetch.
// Note: For local development, Spotify login will not work unless your local URL is registered as a redirect URI.
// This module gracefully allows the app to run without a token (e.g., Microphone mode).

const CLIENT_ID = '927fda6918514f96903e828fcd6bb576';
// Production redirect per requirements
const REDIRECT_URI = 'https://belisario-afk.github.io/luma/';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private'
];

const STORAGE_KEY = 'luma_spotify_auth';

function getStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.access_token || !obj.expires_at) return null;
    // Check expiry
    if (Date.now() > obj.expires_at) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}

function setStoredAuth(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('luma:auth-changed'));
}

export function getAccessToken() {
  const auth = getStoredAuth();
  return auth?.access_token || null;
}

export function isAuthenticated() {
  return !!getAccessToken();
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('luma:auth-changed'));
  // Soft reload to clear any state
  // Keep at the same URL (no hash)
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }
}

export function buildLoginUrl() {
  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'token',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    state
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function login() {
  window.location.href = buildLoginUrl();
}

// Parse token on redirect hash (if present)
export function maybeHandleRedirectCallback() {
  if (!window.location.hash.startsWith('#')) return false;
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const access_token = hash.get('access_token');
  const token_type = hash.get('token_type');
  const expires_in = hash.get('expires_in');
  const state = hash.get('state');
  const error = hash.get('error');

  if (error) {
    console.warn('Spotify auth error:', error);
    return false;
  }

  if (access_token && token_type === 'Bearer' && expires_in) {
    const expires_at = Date.now() + (parseInt(expires_in, 10) * 1000) - 10_000; // safety margin
    setStoredAuth({ access_token, token_type, expires_at, state });

    // Clean the URL hash
    history.replaceState(null, '', window.location.pathname);
    return true;
  }
  return false;
}

export async function fetchUserProfile() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}