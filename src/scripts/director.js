// Simple program director. Call maybeStartProgram('calm10', { loadScene })
// when renderer is ready. It will time-switch scenes using setTimeout.

import { getCalm10Sequence } from './programs/calm10.js';

export function maybeStartProgram(programId, rendererApi) {
  const id = (programId || '').toLowerCase();
  let seq = null;
  if (id === 'calm10') seq = getCalm10Sequence();
  if (!seq || !rendererApi?.loadScene) return;

  let idx = 0;
  const step = async () => {
    const item = seq[idx];
    if (!item) return;
    await rendererApi.loadScene(item.scene);
    setTimeout(() => {
      idx += 1;
      if (idx < seq.length) step();
    }, item.duration * 1000);
  };
  step();
}