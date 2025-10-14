// PlayerControls.js - Transport, search, source selection, live tuning, album options

export function PlayerControls(
  el,
  { onResumeAudioContext, onSearch, onSelectTrack, onSourceChange, onPlay, onPause, onTuningChange, onAlbumOptions }
) {
  el.innerHTML = '';

  const row1 = document.createElement('div');
  row1.className = 'flex flex-col md:flex-row gap-3 items-stretch';

  // Transport
  const transport = document.createElement('div');
  transport.className = 'flex items-center gap-2';

  const playBtn = document.createElement('button');
  playBtn.className = 'glow';
  playBtn.textContent = 'Play';
  playBtn.addEventListener('click', async () => {
    await onResumeAudioContext?.();
    onPlay?.();
  });

  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'ghost';
  pauseBtn.textContent = 'Pause';
  pauseBtn.addEventListener('click', () => onPause?.());

  // Source selector
  const sourceWrap = document.createElement('div');
  sourceWrap.className = 'flex items-center gap-2 ml-2';
  const label = document.createElement('label');
  label.className = 'text-xs text-[color:var(--muted)]';
  label.textContent = 'Source';
  const select = document.createElement('select');
  select.className = 'search max-w-[220px]';
  select.innerHTML = `
    <option value="preview">Preview (30s)</option>
    <option value="sdk">Spotify (Full)</option>
    <option value="mic">Microphone</option>
  `;
  select.value = localStorage.getItem('luma_source') || 'preview';
  select.addEventListener('change', () => onSourceChange?.(select.value));

  transport.appendChild(playBtn);
  transport.appendChild(pauseBtn);
  sourceWrap.appendChild(label);
  sourceWrap.appendChild(select);
  transport.appendChild(sourceWrap);

  // Tuning controls
  const tuning = document.createElement('div');
  tuning.className = 'flex items-center gap-3 flex-wrap mt-3 md:mt-0';
  tuning.innerHTML = `
    <span class="text-xs text-[color:var(--muted)]">Tuning</span>
    <label class="text-xs">Sensitivity
      <input type="range" min="0.2" max="2.0" step="0.05" value="0.85" class="align-middle ml-1" id="sens">
    </label>
    <label class="text-xs">Smoothing
      <input type="range" min="0" max="0.95" step="0.05" value="0.65" class="align-middle ml-1" id="smooth">
    </label>
    <label class="text-xs">Clamp
      <input type="range" min="0.5" max="1.0" step="0.05" value="0.9" class="align-middle ml-1" id="clamp">
    </label>
    <label class="text-xs">Gamma
      <input type="range" min="0.5" max="1.5" step="0.05" value="0.85" class="align-middle ml-1" id="gamma">
    </label>
    <button class="ghost text-xs" id="reset">Reset</button>
  `;

  tuning.querySelector('#sens').addEventListener('input', emitTuning);
  tuning.querySelector('#smooth').addEventListener('input', emitTuning);
  tuning.querySelector('#clamp').addEventListener('input', emitTuning);
  tuning.querySelector('#gamma').addEventListener('input', emitTuning);
  tuning.querySelector('#reset').addEventListener('click', () => {
    tuning.querySelector('#sens').value = '0.85';
    tuning.querySelector('#smooth').value = '0.65';
    tuning.querySelector('#clamp').value = '0.9';
    tuning.querySelector('#gamma').value = '0.85';
    emitTuning();
  });

  function emitTuning() {
    const sensitivity = parseFloat(tuning.querySelector('#sens').value);
    const smoothing = parseFloat(tuning.querySelector('#smooth').value);
    const clampMax = parseFloat(tuning.querySelector('#clamp').value);
    const gamma = parseFloat(tuning.querySelector('#gamma').value);
    onTuningChange?.({ sensitivity, smoothing, clampMax, gamma });
    localStorage.setItem('luma_tuning', JSON.stringify({ sensitivity, smoothing, clampMax, gamma }));
  }

  // Album options
  const albumOpts = document.createElement('div');
  albumOpts.className = 'flex items-center gap-3 flex-wrap';
  albumOpts.innerHTML = `
    <span class="text-xs text-[color:var(--muted)]">Album</span>
    <label class="text-xs inline-flex items-center gap-1">
      <input type="checkbox" id="useColors" checked>
      Use Colors
    </label>
    <label class="text-xs inline-flex items-center gap-1">
      <input type="checkbox" id="useTexture" checked>
      Use Texture
    </label>
  `;
  const savedAlbum = JSON.parse(localStorage.getItem('luma_album_opts') || '{"useColors":true,"useTexture":true}');
  albumOpts.querySelector('#useColors').checked = !!savedAlbum.useColors;
  albumOpts.querySelector('#useTexture').checked = !!savedAlbum.useTexture;

  albumOpts.querySelector('#useColors').addEventListener('change', emitAlbum);
  albumOpts.querySelector('#useTexture').addEventListener('change', emitAlbum);

  function emitAlbum() {
    const useColors = albumOpts.querySelector('#useColors').checked;
    const useTexture = albumOpts.querySelector('#useTexture').checked;
    onAlbumOptions?.({ useColors, useTexture });
    localStorage.setItem('luma_album_opts', JSON.stringify({ useColors, useTexture }));
  }

  // Search
  const searchWrap = document.createElement('div');
  searchWrap.className = 'flex-1';
  const input = document.createElement('input');
  input.className = 'search';
  input.type = 'search';
  input.placeholder = 'Search Spotify tracks...';
  input.addEventListener('keydown', async (e) => { if (e.key === 'Enter') await runSearch(); });

  const goBtn = document.createElement('button');
  goBtn.className = 'ghost ml-2';
  goBtn.textContent = 'Search';
  goBtn.addEventListener('click', runSearch);

  const results = document.createElement('div');
  results.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2';

  searchWrap.appendChild(input);
  searchWrap.appendChild(goBtn);

  row1.appendChild(transport);
  row1.appendChild(tuning);
  row1.appendChild(albumOpts);
  row1.appendChild(searchWrap);

  el.appendChild(row1);
  el.appendChild(results);

  // Load persisted tuning
  const savedTuning = JSON.parse(localStorage.getItem('luma_tuning') || 'null');
  if (savedTuning) {
    tuning.querySelector('#sens').value = String(savedTuning.sensitivity ?? 0.85);
    tuning.querySelector('#smooth').value = String(savedTuning.smoothing ?? 0.65);
    tuning.querySelector('#clamp').value = String(savedTuning.clampMax ?? 0.9);
    tuning.querySelector('#gamma').value = String(savedTuning.gamma ?? 0.85);
    emitTuning();
  }

  async function runSearch() {
    const q = input.value;
    results.innerHTML = '';
    const o = await onSearch?.(q);
    (o?.items || []).forEach(item => {
      const card = document.createElement('div');
      card.className = 'card flex items-center gap-3';
      card.innerHTML = `
        <img src="${item.albumArt || './public/logo.png'}" class="w-12 h-12 rounded-md object-cover ring-1 ring-white/20" alt="">
        <div class="flex-1">
          <div class="text-sm font-semibold leading-tight">${item.name}</div>
          <div class="text-xs text-[color:var(--muted)] leading-tight">${item.artist}</div>
        </div>
        <div class="text-[10px] text-[color:var(--muted)]">${item.hasPreview ? 'Preview OK' : 'No Preview'}</div>
      `;
      card.style.cursor = 'pointer';
      card.addEventListener('click', async () => { await onSelectTrack?.(item); });
      results.appendChild(card);
    });
  }
}