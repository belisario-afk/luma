// PlayerControls.js - Transport, search, and source selection (Preview / Spotify SDK / Microphone)

export function PlayerControls(el, { onResumeAudioContext, onSearch, onSelectTrack, onSourceChange, onPlay, onPause }) {
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
  select.addEventListener('change', () => onSourceChange?.(select.value));

  transport.appendChild(playBtn);
  transport.appendChild(pauseBtn);
  sourceWrap.appendChild(label);
  sourceWrap.appendChild(select);
  transport.appendChild(sourceWrap);

  // Search
  const searchWrap = document.createElement('div');
  searchWrap.className = 'flex-1';
  const input = document.createElement('input');
  input.className = 'search';
  input.type = 'search';
  input.placeholder = 'Search Spotify tracks...';
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      await runSearch();
    }
  });

  const goBtn = document.createElement('button');
  goBtn.className = 'ghost ml-2';
  goBtn.textContent = 'Search';
  goBtn.addEventListener('click', runSearch);

  const results = document.createElement('div');
  results.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2';

  searchWrap.appendChild(input);
  searchWrap.appendChild(goBtn);

  row1.appendChild(transport);
  row1.appendChild(searchWrap);

  el.appendChild(row1);
  el.appendChild(results);

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
      card.addEventListener('click', async () => {
        await onSelectTrack?.(item);
      });
      results.appendChild(card);
    });
  }
}