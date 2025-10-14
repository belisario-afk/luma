// PlayerControls.js - Transport, search, and mic toggle

export function PlayerControls(el, { onResumeAudioContext, onSearch, onSelectTrack, onToggleMic, onPlay, onPause }) {
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

  const micToggle = document.createElement('button');
  micToggle.className = 'ghost';
  micToggle.textContent = 'Use Microphone';
  micToggle.dataset.enabled = 'false';
  micToggle.addEventListener('click', async () => {
    const enabled = micToggle.dataset.enabled === 'true';
    await onResumeAudioContext?.();
    await onToggleMic?.(!enabled);
    micToggle.dataset.enabled = (!enabled).toString();
    micToggle.textContent = !enabled ? 'Disable Microphone' : 'Use Microphone';
  });

  transport.appendChild(playBtn);
  transport.appendChild(pauseBtn);
  transport.appendChild(micToggle);

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
        <div class="text-xs ${item.hasPreview ? 'text-green-300' : 'text-red-300'}">${item.hasPreview ? 'Preview' : 'No Preview'}</div>
      `;
      card.style.cursor = item.hasPreview ? 'pointer' : 'not-allowed';
      if (item.hasPreview) {
        card.addEventListener('click', async () => {
          await onSelectTrack?.(item.id);
        });
      }
      results.appendChild(card);
    });
  }
}