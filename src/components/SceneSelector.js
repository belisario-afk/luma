// SceneSelector.js - Preset carousel/selector

export function SceneSelector(el, { presets, onSelect }) {
  el.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';
  header.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="font-semibold">Scenes</span>
      <span class="text-xs text-[color:var(--muted)]">Pick a visual preset</span>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3';

  presets.forEach(p => {
    const card = document.createElement('button');
    card.className = 'card text-left';
    card.setAttribute('title', p.description);
    card.innerHTML = `
      <div class="h-16 w-full rounded-md bg-gradient-to-tr from-[color:var(--accent)]/30 to-[color:var(--primary)]/30 ring-1 ring-white/10"></div>
      <div class="mt-2">
        <div class="font-semibold text-sm">${p.name}</div>
        <div class="text-xs text-[color:var(--muted)] line-clamp-2">${p.description}</div>
      </div>
    `;
    card.addEventListener('click', () => onSelect?.(p.id));
    list.appendChild(card);
  });

  el.appendChild(header);
  el.appendChild(list);
}