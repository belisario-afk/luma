// auth.js - Spotify Authorization Code with PKCE (no client secret)
// - Handles login/logout
// - Stores access_token, refresh_token, expires_at in localStorage
// - Auto-refreshes token before expiry
// - Public API: login(), logout(), isAuthenticated(), getAccessToken(), maybeHandleRedirectCallback(), fetchUserProfile()

const CLIENT_ID = '927fda6918514f96903e828fcd6bb576';
const REDIRECT_URI = 'https://belisario-afk.github.io/luma/';
// Added scopes for Web Playback SDK control
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state'
];

const STORAGE_KEY = 'luma_spotify_auth';
const VERIFIER_KEY = 'luma_spotify_pkce_verifier';

let refreshTimerId = null;

function getStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.access_token || !obj.expires_at) return null;
    return obj;
  } catch {
    return null;
  }
}

function scheduleRefresh(auth) {
  if (!auth) return;
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
  const leadMs = 60_000; // refresh 60s before expiry
  const delay = Math.max(1_000, auth.expires_at - Date.now() - leadMs);
  const rt = auth.refresh_token;
  if (!rt) return;

  refreshTimerId = setTimeout(async () => {
    try {
      await refreshAccessToken(rt);
    } catch (e) {
      console.warn('Token refresh failed:', e);
      // allow expiry; user can re-login
    }
  }, delay);
}

function setStoredAuth(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  scheduleRefresh(data);
  window.dispatchEvent(new CustomEvent('luma:auth-changed'));
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

export function getAccessToken() {
  const auth = getStoredAuth();
  if (!auth) return null;
  if (Date.now() >= auth.expires_at) return null;
  return auth.access_token;
}

export function isAuthenticated() {
  return !!getAccessToken();
}

export function logout() {
  clearStoredAuth();
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

function toBase64Url(uint8Arr) {
  let str = '';
  for (let i = 0; i < uint8Arr.byteLength; i++) {
    str += String.fromCharCode(uint8Arr[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Base64Url(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toBase64Url(new Uint8Array(digest));
}

function generateCodeVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

function buildAuthUrl({ state, codeChallenge }) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function login() {
  const state = Math.random().toString(36).slice(2);
  const verifier = generateCodeVerifier();
  const challenge = await sha256Base64Url(verifier);
  localStorage.setItem(VERIFIER_KEY, verifier);
  window.location.href = buildAuthUrl({ state, codeChallenge: challenge });
}

async function exchangeCodeForTokens(code, verifier) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const expires_at = Date.now() + json.expires_in * 1000 - 10_000;
  return {
    access_token: json.access_token,
    token_type: json.token_type,
    scope: json.scope,
    refresh_token: json.refresh_token || getStoredAuth()?.refresh_token || null,
    expires_at
  };
}

async function refreshAccessToken(refresh_token) {
  if (!refresh_token) throw new Error('No refresh_token available');

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const current = getStoredAuth() || {};
  const newRefresh = json.refresh_token || current.refresh_token || refresh_token;
  const expires_at = Date.now() + json.expires_in * 1000 - 10_000;

  setStoredAuth({
    ...current,
    access_token: json.access_token,
    token_type: json.token_type || current.token_type || 'Bearer',
    scope: json.scope || current.scope,
    refresh_token: newRefresh,
    expires_at
  });
  return getStoredAuth();
}

// Handle redirect back from Spotify. Returns true if it handled something.
export async function maybeHandleRedirectCallback() {
  const url = new URL(window.location.href);

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    console.warn('Spotify auth error:', error);
    return false;
  }

  if (code) {
    try {
      const verifier = localStorage.getItem(VERIFIER_KEY);
      if (!verifier) throw new Error('Missing PKCE verifier');

      const tokenData = await exchangeCodeForTokens(code, verifier);

      // Clean the URL BEFORE emitting auth-changed to avoid repeated exchange
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      history.replaceState(null, '', url.pathname + (url.search ? `?${url.searchParams.toString()}` : ''));

      setStoredAuth(tokenData);
      return true;
    } catch (e) {
      console.warn('Spotify auth exchange error:', e.message || e);
      return false;
    }
  }

  const existing = getStoredAuth();
  if (existing) scheduleRefresh(existing);
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