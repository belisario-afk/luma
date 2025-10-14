// ui.js - UI helpers, inactivity fade, and simple toasts

export class UIManager {
  constructor({ navbarEl, overlayEl }) {
    this.navbarEl = navbarEl;
    this.overlayEl = overlayEl;
    this.inactivityMs = 3500;
    this._timer = 0;
    this._onActivity = this._onActivity.bind(this);
  }

  initInactivity() {
    ['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(evt => {
      window.addEventListener(evt, this._onActivity, { passive: true });
    });
    this._kick();
  }

  _onActivity() {
    this.overlayEl.classList.remove('ui-hidden');
    this._kick();
  }

  _kick() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.overlayEl.classList.add('ui-hidden');
    }, this.inactivityMs);
  }

  renderNavbar({ onLogin, onLogout, profile }) {
    this.navbarEl.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2';

    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';
    left.innerHTML = `
      <img src="./public/logo.png" alt="Luma" class="w-8 h-8 rounded-md ring-1 ring-white/20" />
      <div class="flex flex-col leading-tight">
        <span class="font-semibold">Luma</span>
        <span class="text-xs text-[color:var(--muted)]">Audio-reactive meditation</span>
      </div>
    `;

    const right = document.createElement('div');
    right.className = 'flex items-center gap-2';

    // Profile or login button
    if (profile) {
      const name = document.createElement('div');
      name.className = 'badge';
      name.textContent = profile.display_name || profile.email || 'Spotify User';
      right.appendChild(name);

      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'ghost';
      logoutBtn.textContent = 'Logout';
      logoutBtn.addEventListener('click', onLogout);
      right.appendChild(logoutBtn);
    } else {
      const loginBtn = document.createElement('button');
      loginBtn.className = 'glow';
      loginBtn.textContent = 'Login with Spotify';
      loginBtn.addEventListener('click', onLogin);
      right.appendChild(loginBtn);
    }

    wrapper.appendChild(left);
    wrapper.appendChild(right);
    this.navbarEl.appendChild(wrapper);
  }

  toast(msg, type = 'info', timeout = 2800) {
    const div = document.createElement('div');
    div.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm
      ${type === 'error' ? 'bg-red-500/90 text-white' : 'bg-white/90 text-black'} shadow-lg`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), timeout);
  }
}