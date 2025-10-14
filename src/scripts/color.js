// color.js - lightweight album palette extraction (no deps)
// Returns primary, secondary, and average colors (hex)

export async function extractPaletteFromImage(url, { size = 32 } = {}) {
  const img = await loadImage(url);
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  // Average color
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  // Quantize to 4 bits per channel for histogram
  const hist = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];

    rSum += r; gSum += g; bSum += b; count++;

    const rq = r >> 4, gq = g >> 4, bq = b >> 4;
    const key = (rq << 8) | (gq << 4) | bq;
    hist.set(key, (hist.get(key) || 0) + 1);
  }

  const avg = count ? rgbToHex(rSum / count, gSum / count, bSum / count) : '#888888';

  // Get top bins by count, prefer saturation
  const top = [...hist.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([key, freq]) => {
      const rq = (key >> 8) & 0xF, gq = (key >> 4) & 0xF, bq = key & 0xF;
      const r = (rq << 4) + 8, g = (gq << 4) + 8, b = (bq << 4) + 8;
      const { s, v } = rgbToHsv(r, g, b);
      return { r, g, b, s, v, score: freq * (0.6 + 0.4 * s) * (0.6 + 0.4 * v) };
    })
    .sort((a, b) => b.score - a.score);

  const primary = top[0] ? rgbToHex(top[0].r, top[0].g, top[0].b) : avg;
  const secondary = top[1] ? rgbToHex(top[1].r, top[1].g, top[1].b) : avg;

  return { primary, secondary, avg };
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return { canvas, ctx };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function rgbToHex(r, g, b) {
  const to = v => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [to(r), to(g), to(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60; if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}